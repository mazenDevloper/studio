package com.drivecast.sovereign;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.LruCache;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Pictures for the widgets and the island (team logos, moon phases, video thumbnails, manuscripts): kept in memory
 * and in the app's cache folder, so a logo is downloaded once and every later render is instant and works offline.
 */
final class Images {

    private Images() {
    }

    private static final LruCache<String, Bitmap> memory = new LruCache<String, Bitmap>(24 * 1024 * 1024) {
        @Override
        protected int sizeOf(String key, Bitmap value) {
            return value.getByteCount();
        }
    };
    private static final ExecutorService pool = Executors.newFixedThreadPool(3);
    private static final Set<String> inFlight = new HashSet<>();
    private static final Handler main = new Handler(Looper.getMainLooper());
    /** addresses that failed (offline, not an image): not asked again for half an hour */
    private static final java.util.Map<String, Long> failed = new java.util.HashMap<>();

    private static boolean recentlyFailed(String url) {
        synchronized (failed) {
            Long t = failed.get(url);
            return t != null && System.currentTimeMillis() - t < 30 * 60_000L;
        }
    }

    private static boolean fetchTracked(Context ctx, String url, File out) {
        if (recentlyFailed(url)) return false;
        boolean ok = fetch(ctx, url, out);
        synchronized (failed) {
            if (ok) failed.remove(url); else failed.put(url, System.currentTimeMillis());
        }
        return ok;
    }

    /**
     * The picture, downloading it if needed. Blocks: call it off the main thread (widget renders run on a worker).
     * null when there is no picture (bad address, offline, an SVG...).
     */
    static Bitmap get(Context ctx, String url, int maxPx) {
        if (url == null || url.isEmpty()) return null;
        String key = key(url, maxPx);
        Bitmap b = memory.get(key);
        if (b != null) return b;
        File f = file(ctx, url);
        if (!f.exists() && !fetchTracked(ctx, url, f)) return null;
        b = decode(f, maxPx);
        if (b != null) memory.put(key, b);
        return b;
    }

    /** Only what is already on the phone (for the island, drawn on the main thread). */
    static Bitmap cached(Context ctx, String url, int maxPx) {
        if (url == null || url.isEmpty()) return null;
        String key = key(url, maxPx);
        Bitmap b = memory.get(key);
        if (b != null) return b;
        File f = file(ctx, url);
        if (!f.exists()) return null;
        b = decode(f, maxPx);
        if (b != null) memory.put(key, b);
        return b;
    }

    /** Download the missing pictures in the background, then run done (on the main thread) if any arrived. */
    static void prefetch(Context ctx, List<String> urls, Runnable done) {
        final Context app = ctx.getApplicationContext();
        for (final String url : urls) {
            if (url == null || url.isEmpty() || recentlyFailed(url) || file(app, url).exists()) continue;
            synchronized (inFlight) {
                if (!inFlight.add(url)) continue;
            }
            pool.execute(() -> {
                boolean ok = fetchTracked(app, url, file(app, url));
                synchronized (inFlight) {
                    inFlight.remove(url);
                }
                if (ok && done != null) main.post(done);
            });
        }
    }

    private static String key(String url, int maxPx) {
        return maxPx + "|" + url;
    }

    static File file(Context ctx, String url) {
        if (url.startsWith("file://")) return new File(url.substring(7));
        File dir = new File(ctx.getCacheDir(), "img");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        return new File(dir, sha1(url));
    }

    private static boolean fetch(Context ctx, String url, File out) {
        if (url.startsWith("file://")) return out.exists();
        File tmp = new File(out.getPath() + ".part");
        try {
            if (url.startsWith("data:")) {
                int comma = url.indexOf(',');
                if (comma < 0) return false;
                byte[] bytes = Base64.decode(url.substring(comma + 1), Base64.DEFAULT);
                try (OutputStream o = new FileOutputStream(tmp)) {
                    o.write(bytes);
                }
            } else {
                String u = url.startsWith("//") ? "https:" + url : url;
                HttpURLConnection c = null;
                for (int redirects = 0; redirects < 4; redirects++) {
                    c = (HttpURLConnection) new URL(u).openConnection();
                    c.setConnectTimeout(12_000);
                    c.setReadTimeout(20_000);
                    c.setInstanceFollowRedirects(true);
                    c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) DriveCast");
                    int code = c.getResponseCode();
                    // http -> https redirects are not followed automatically
                    if (code >= 300 && code < 400 && c.getHeaderField("Location") != null) {
                        u = new URL(new URL(u), c.getHeaderField("Location")).toString();
                        c.disconnect();
                        continue;
                    }
                    if (code != 200) return false;
                    break;
                }
                if (c == null) return false;
                try (InputStream in = c.getInputStream(); OutputStream o = new FileOutputStream(tmp)) {
                    byte[] buf = new byte[16_384];
                    int n;
                    while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
                }
            }
            // keep only what Android can draw (an SVG logo would fail every time otherwise)
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(tmp.getPath(), o);
            if (o.outWidth <= 0) return false;
            return tmp.renameTo(out);
        } catch (Exception e) {
            return false;
        } finally {
            //noinspection ResultOfMethodCallIgnored
            tmp.delete();
        }
    }

    private static Bitmap decode(File f, int maxPx) {
        try {
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(f.getPath(), o);
            if (o.outWidth <= 0) return null;
            int sample = 1;
            while (Math.max(o.outWidth, o.outHeight) / (sample * 2) >= maxPx) sample *= 2;
            BitmapFactory.Options d = new BitmapFactory.Options();
            d.inSampleSize = sample;
            return BitmapFactory.decodeFile(f.getPath(), d);
        } catch (Throwable t) {
            return null;
        }
    }

    static String sha1(String s) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-1").digest(s.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder();
            for (byte x : h) sb.append(String.format("%02x", x));
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(s.hashCode());
        }
    }
}
