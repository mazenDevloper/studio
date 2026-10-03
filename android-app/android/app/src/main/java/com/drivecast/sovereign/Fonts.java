package com.drivecast.sovereign;

import android.content.Context;
import android.graphics.Typeface;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Thmanyah Sans, the site's font, for the widgets and the island. The font's licence is personal use only and does
 * not allow redistributing the files, so they are not in the APK or the repository: the phone downloads them once
 * from the same CDN the site loads them from (like a browser does) and keeps them in the app's private storage.
 * Until then a bold system font stands in, and everything is redrawn when the download finishes.
 */
final class Fonts {

    private Fonts() {
    }

    private static final String BASE = "https://cdn.jsdelivr.net/gh/engdawood/thmanyah-font-web@4266a9d/fonts/thmanyah-sans/otf/thmanyah-sans-";

    private static final Map<String, Typeface> loaded = new HashMap<>();
    private static final Set<String> downloading = new HashSet<>();
    private static final Map<String, Long> lastTry = new HashMap<>();

    static Typeface medium(Context ctx) { return get(ctx, "Medium", Typeface.create("sans-serif-medium", Typeface.NORMAL)); }

    static Typeface bold(Context ctx) { return get(ctx, "Bold", Typeface.create("sans-serif", Typeface.BOLD)); }

    static Typeface black(Context ctx) { return get(ctx, "Black", Typeface.create("sans-serif-black", Typeface.NORMAL)); }

    /** true once every weight is on the phone (the first renders use the stand-in font). */
    static boolean ready(Context ctx) {
        return file(ctx, "Medium").exists() && file(ctx, "Bold").exists() && file(ctx, "Black").exists();
    }

    private static File file(Context ctx, String weight) {
        return new File(new File(ctx.getFilesDir(), "fonts"), "thmanyah-sans-" + weight + ".otf");
    }

    private static synchronized Typeface get(Context ctx, String weight, Typeface fallback) {
        Typeface t = loaded.get(weight);
        if (t != null) return t;
        File f = file(ctx, weight);
        if (f.exists() && f.length() > 20_000) {
            try {
                t = Typeface.createFromFile(f);
                loaded.put(weight, t);
                return t;
            } catch (Exception e) {
                //noinspection ResultOfMethodCallIgnored
                f.delete(); // damaged: fetch it again
            }
        }
        download(ctx.getApplicationContext(), weight);
        return fallback;
    }

    private static final Map<String, Typeface> custom = new HashMap<>();

    /**
     * A font the user added on the site (manuscripts written in it): downloaded once, blocking - call it off the main
     * thread. null when it can't be used (offline, or a web-only format such as woff2).
     */
    static Typeface fromUrl(Context ctx, String url) {
        if (url == null || url.isEmpty()) return null;
        synchronized (custom) {
            if (custom.containsKey(url)) return custom.get(url);
        }
        Typeface t = null;
        boolean downloaded = false;
        File f = new File(new File(ctx.getFilesDir(), "fonts"), Images.sha1(url) + ".ttf");
        try {
            if (!f.exists()) {
                //noinspection ResultOfMethodCallIgnored
                f.getParentFile().mkdirs();
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(12_000);
                c.setReadTimeout(30_000);
                File tmp = new File(f.getPath() + ".part");
                try (InputStream in = c.getInputStream(); OutputStream o = new FileOutputStream(tmp)) {
                    byte[] buf = new byte[16_384];
                    int n;
                    while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
                }
                //noinspection ResultOfMethodCallIgnored
                tmp.renameTo(f);
            }
            downloaded = true;
            t = Typeface.createFromFile(f);
        } catch (Exception e) {
            //noinspection ResultOfMethodCallIgnored
            f.delete();
        }
        // a file Android can't read is remembered as unusable; a network failure is tried again next time
        if (t != null || downloaded) synchronized (custom) {
            custom.put(url, t);
        }
        return t;
    }

    private static void download(final Context ctx, final String weight) {
        synchronized (downloading) {
            // offline: try again at most every 5 minutes
            Long last = lastTry.get(weight);
            if (last != null && System.currentTimeMillis() - last < 5 * 60_000L) return;
            if (!downloading.add(weight)) return;
            lastTry.put(weight, System.currentTimeMillis());
        }
        new Thread(() -> {
            File out = file(ctx, weight);
            File tmp = new File(out.getPath() + ".part");
            boolean ok = false;
            try {
                //noinspection ResultOfMethodCallIgnored
                out.getParentFile().mkdirs();
                HttpURLConnection c = (HttpURLConnection) new URL(BASE + weight + ".otf").openConnection();
                c.setConnectTimeout(15_000);
                c.setReadTimeout(30_000);
                try (InputStream in = c.getInputStream(); OutputStream o = new FileOutputStream(tmp)) {
                    byte[] buf = new byte[16_384];
                    int n;
                    while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
                }
                ok = tmp.length() > 20_000 && tmp.renameTo(out);
            } catch (Exception ignored) {
            } finally {
                //noinspection ResultOfMethodCallIgnored
                tmp.delete();
                synchronized (downloading) {
                    downloading.remove(weight);
                }
            }
            if (ok) {
                // redraw with the real font
                Widgets.updateAll(ctx);
                IslandService.redraw();
            }
        }, "font-" + weight).start();
    }
}
