package com.drivecast.sovereign;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * The app's cloud bins (JSONBin, the same ones the site syncs with), read directly by the phone: manuscripts and the
 * board's ink / background, fonts, folders, subscribed channels, favourite teams (all of them) and pinned matches,
 * dhikr and reminders, prayer settings and times. The widgets and the islands work from these even when the app has
 * not been opened. Large data (manuscript pictures) is saved as files; only a slim copy is kept in the settings.
 */
final class Cloud {

    private Cloud() {
    }

    private static final String KEY = "$2a$10$SYrYv.ct8hiMU9YeUxEQ.ecRkOrTqs.TDchJRV3wW.aKJnDXy2oVy";
    private static final String MASTER = "69c782cbb7ec241ddcb0b99a";
    private static final String MANUSCRIPTS = "69b63c5cc3097a1dd5278b25";
    private static final String FONTS = "6a573cdbf5f4af5e29915034";
    private static final String CHANNELS = "68ef1b3dd0ea881f40a38bd1";
    private static final String PRAYERS = "69a00f6eae596e708f4b7291";
    private static final String RECITERS = "6909c1cd43b1c97be997b522";
    private static final String IPTV = "69a87b8bd0ea881f40eeec0c";
    private static long lastTop = 0;
    /** the board's background when the cloud settings don't name one (the site's default) */
    static final String DEFAULT_BG = "https://www.image2url.com/r2/default/images/1782382707952-d99447c6-bc60-475d-9406-5fd2ef320bd5.png";

    private static final long EVERY_MS = 10 * 60_000L;
    private static long lastRefresh = 0;

    static boolean due() {
        return System.currentTimeMillis() - lastRefresh >= EVERY_MS;
    }

    /** Fetch the bins again if the last read is older than 10 minutes (or forced). Blocking: call off the main thread. */
    static synchronized void refresh(Context ctx, boolean force) {
        long now = System.currentTimeMillis();
        if (!force && now - lastRefresh < EVERY_MS) return;
        lastRefresh = now;
        SharedPreferences.Editor e = NativeIslandPlugin.prefs(ctx).edit();
        try {
            Object m = fetch(MASTER);
            if (m instanceof JSONObject) e.putString("cloud_master", slimMaster((JSONObject) m).toString());
        } catch (Exception ignored) {
        }
        // the prayer times first (the prayer widgets wait for them), saved at once
        try {
            JSONArray p = list(fetch(PRAYERS), "prayers");
            if (p != null) {
                // a week around today is all that's needed
                String from = day(now - 2 * 86_400_000L), to = day(now + 5 * 86_400_000L);
                JSONArray out = new JSONArray();
                for (int i = 0; i < p.length(); i++) {
                    JSONObject r = p.optJSONObject(i);
                    String d = r != null ? r.optString("date") : "";
                    if (d.compareTo(from) >= 0 && d.compareTo(to) <= 0) out.put(r);
                }
                if (out.length() > 0) e.putString("cloud_prayers", out.toString());
            }
        } catch (Exception ignored) {
        }
        e.apply();
        e = NativeIslandPlugin.prefs(ctx).edit();
        try {
            JSONArray ms = list(fetch(MANUSCRIPTS), "manuscripts");
            if (ms != null) e.putString("cloud_manuscripts", slimManuscripts(ctx, ms).toString());
        } catch (Exception ignored) {
        }
        try {
            JSONArray f = list(fetch(FONTS), "fonts");
            if (f != null) e.putString("cloud_fonts", f.toString());
        } catch (Exception ignored) {
        }
        try {
            JSONArray ch = list(fetch(CHANNELS), "channels");
            if (ch != null) {
                JSONArray out = new JSONArray();
                for (int i = 0; i < ch.length(); i++) {
                    JSONObject c = ch.optJSONObject(i);
                    if (c == null || c.optString("channelid").isEmpty()) continue;
                    out.put(new JSONObject().put("id", c.optString("channelid")).put("name", c.optString("name", c.optString("channeltitle")))
                            .put("image", c.optString("image")).put("starred", c.optBoolean("starred")));
                }
                e.putString("cloud_channels", out.toString());
            }
        } catch (Exception ignored) {
        }
        try {
            Object o = fetch(IPTV);
            JSONArray l = list(o, "iptv");
            if (l == null && o instanceof JSONObject) l = ((JSONObject) o).optJSONArray("channels");
            if (l != null) {
                JSONArray out = new JSONArray();
                for (int i = 0; i < l.length(); i++) {
                    JSONObject c = l.optJSONObject(i);
                    if (c == null) continue;
                    String url = c.optString("url", "");
                    // the app's own address for a channel saved by number (iptv-view.tsx)
                    if (url.isEmpty() && !c.optString("stream_id").isEmpty() && !c.optString("stream_id").startsWith("m3u:"))
                        url = "http://playstop.watch:2095/live/W87d737/Pd37qj34/" + c.optString("stream_id") + ".m3u8";
                    if (url.isEmpty() && c.optString("stream_id").startsWith("m3u:")) url = c.optString("stream_id").substring(4);
                    if (url.isEmpty()) continue;
                    out.put(new JSONObject().put("id", url).put("name", c.optString("name")).put("image", c.optString("stream_icon")));
                }
                e.putString("cloud_iptv", out.toString());
            }
        } catch (Exception ignored) {
        }
        e.apply();
        e = NativeIslandPlugin.prefs(ctx).edit();
        // most viewed video of each starred channel (their public feeds carry view counts), every 6 hours
        if (force || now - lastTop > 6 * 3_600_000L) {
            lastTop = now;
            try {
                JSONArray ch = Widgets.array(ctx, "cloud_channels");
                JSONArray tops = new JSONArray();
                java.util.List<JSONObject> latest = new java.util.ArrayList<>();
                for (int i = 0; i < ch.length() && tops.length() < 12; i++) {
                    JSONObject c = ch.optJSONObject(i);
                    if (c == null || !c.optBoolean("starred")) continue;
                    JSONArray v = MediaBrowser.channelVideos(c.optString("id"));
                    for (int k = 0; k < Math.min(4, v.length()); k++) latest.add(new JSONObject(v.getJSONObject(k).toString()));
                    JSONObject best = null;
                    for (int k = 0; k < v.length(); k++) if (best == null || v.getJSONObject(k).optLong("views") > best.optLong("views")) best = v.getJSONObject(k);
                    if (best != null) tops.put(best.put("badge", true).put("avatar", c.optString("image")));
                }
                if (tops.length() > 0) e.putString("cloud_top", tops.toString());
                // the media screen's "latest recitations": newest first across the starred channels
                java.util.Collections.sort(latest, (a, b) -> b.optString("published").compareTo(a.optString("published")));
                JSONArray lt = new JSONArray();
                for (int k = 0; k < Math.min(16, latest.size()); k++) lt.put(latest.get(k));
                if (lt.length() > 0) e.putString("cloud_latest", lt.toString());
            } catch (Exception ignored) {
            }
        }
        try {
            JSONArray r = list(fetch(RECITERS), "reciters");
            if (r != null) {
                // most played first, like the site
                java.util.List<JSONObject> l = new java.util.ArrayList<>();
                for (int i = 0; i < r.length(); i++) if (r.optJSONObject(i) != null) l.add(r.optJSONObject(i));
                java.util.Collections.sort(l, (a, b) -> b.optInt("clickschannel") - a.optInt("clickschannel"));
                JSONArray out = new JSONArray();
                for (JSONObject c : l) out.put(new JSONObject().put("id", c.optString("channelid")).put("name", c.optString("name", c.optString("channeltitle"))).put("image", c.optString("image")));
                e.putString("cloud_reciters", out.toString());
            }
        } catch (Exception ignored) {
        }
        e.apply();
    }

    private static long lastMatches = 0;

    /**
     * The matches widget without the app: when the scores the service keeps are missing or old (the service isn't
     * running), fetch every favourite team's matches here - every 2 minutes while one is live, 15 otherwise.
     */
    static void matchesIfStale(Context ctx) {
        long now = System.currentTimeMillis();
        JSONArray cur = Widgets.array(ctx, "matchesData");
        boolean live = false;
        for (int i = 0; i < cur.length(); i++) if ("live".equals(cur.optJSONObject(i).optString("status"))) live = true;
        long age = now - NativeIslandPlugin.prefs(ctx).getLong("matchesAt", 0);
        if (cur.length() > 0 && age < (live ? 2 * 60_000L : 15 * 60_000L)) return;
        if (now - lastMatches < 60_000L) return;
        lastMatches = now;
        JSONArray teams = master(ctx).optJSONArray("favoriteTeams");
        if (teams == null || teams.length() == 0) return;
        StringBuilder t = new StringBuilder();
        for (int i = 0; i < teams.length(); i++) {
            JSONObject f = teams.optJSONObject(i);
            if (f != null && !f.optString("name").isEmpty()) t.append(t.length() > 0 ? "|" : "").append(favSpec(f));
        }
        String origin = Widgets.json(ctx, "widgets").optString("origin", "https://cplay2.vercel.app");
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(origin + "/api/matches?limit=12&teams=" + java.net.URLEncoder.encode(t.toString(), "UTF-8")).openConnection();
            c.setConnectTimeout(15_000);
            c.setReadTimeout(40_000);
            if (c.getResponseCode() != 200) return;
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
            }
            JSONArray list = new JSONObject(sb.toString()).optJSONArray("matches");
            JSONArray mine = new JSONArray();
            for (int i = 0; list != null && i < list.length(); i++) if (list.getJSONObject(i).optBoolean("favorite")) mine.put(list.getJSONObject(i));
            NativeIslandPlugin.prefs(ctx).edit().putString("matchesData", mine.toString()).putLong("matchesAt", now).apply();
        } catch (Exception ignored) {
        }
    }

    static String day(long ms) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(new Date(ms));
    }

    private static Object fetch(String bin) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL("https://api.jsonbin.io/v3/b/" + bin + "/latest?v=" + System.currentTimeMillis()).openConnection();
        c.setConnectTimeout(12_000);
        c.setReadTimeout(30_000);
        c.setRequestProperty("X-Master-Key", KEY);
        c.setRequestProperty("X-Bin-Meta", "false");
        if (c.getResponseCode() != 200) return null;
        StringBuilder sb = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
        }
        String s = sb.toString().trim();
        return s.startsWith("[") ? new JSONArray(s) : new JSONObject(s);
    }

    /** {key: [...]} or a bare array, like the site's arr(data?.key, data). */
    private static JSONArray list(Object o, String key) {
        if (o instanceof JSONArray) return (JSONArray) o;
        if (o instanceof JSONObject) return ((JSONObject) o).optJSONArray(key);
        return null;
    }

    private static JSONObject slimMaster(JSONObject m) throws Exception {
        JSONObject o = new JSONObject();
        JSONArray cw = m.optJSONArray("continueWatching");
        if (cw != null) {
            JSONArray vids = new JSONArray();
            for (int i = 0; i < cw.length(); i++) if (cw.optJSONObject(i) != null && cw.getJSONObject(i).optJSONObject("video") != null) vids.put(cw.getJSONObject(i).getJSONObject("video"));
            o.put("continueWatching", slimVideos(vids, 12));
        }
        JSONArray sv = m.optJSONArray("savedVideos");
        if (sv != null) o.put("savedVideos", slimVideos(sv, 80));
        for (String k : new String[]{"favoriteTeams", "pinnedMatches", "generalAzkar", "reminders", "prayerSettings"}) {
            if (m.optJSONArray(k) != null) o.put(k, m.getJSONArray(k));
        }
        if (m.optJSONObject("manuscriptScales") != null) o.put("manuscriptScales", m.getJSONObject("manuscriptScales"));
        // the trips' places and weekly trips (set in the site's settings)
        if (m.optJSONObject("places") != null) o.put("places", m.getJSONObject("places"));
        if (m.optJSONArray("weeklyTrips") != null) o.put("weeklyTrips", m.getJSONArray("weeklyTrips"));
        JSONObject ms = m.optJSONObject("mapSettings");
        if (ms != null) {
            JSONObject s = new JSONObject();
            for (String k : new String[]{"manuscriptInk", "manuscriptInkColor", "manuscriptTexture", "manuscriptBgUrl", "showManuscriptBg", "pinnedManuscriptId", "googleKey"}) {
                if (ms.has(k)) s.put(k, ms.get(k));
            }
            o.put("mapSettings", s);
        }
        JSONArray pl = m.optJSONArray("playlists");
        if (pl != null) {
            JSONArray out = new JSONArray();
            for (int i = 0; i < pl.length(); i++) {
                JSONObject p = pl.optJSONObject(i);
                if (p == null) continue;
                JSONArray v = p.optJSONArray("videos");
                JSONObject first = v != null && v.length() > 0 ? v.optJSONObject(0) : null;
                out.put(new JSONObject().put("id", p.optString("id")).put("name", p.optString("name"))
                        .put("count", v != null ? v.length() : 0).put("thumb", first != null ? first.optString("thumbnail") : "")
                        .put("videos", v != null ? slimVideos(v, 80) : new JSONArray()));
            }
            o.put("playlists", out);
        }
        return o;
    }

    private static JSONArray slimVideos(JSONArray v, int max) throws Exception {
        JSONArray out = new JSONArray();
        for (int i = 0; i < v.length() && out.length() < max; i++) {
            JSONObject x = v.optJSONObject(i);
            if (x == null || x.optString("id").isEmpty()) continue;
            out.put(new JSONObject().put("kind", "video").put("id", x.optString("id")).put("name", x.optString("title"))
                    .put("channel", x.optString("channelTitle")).put("thumb", x.optString("thumbnail")));
        }
        return out;
    }

    /** Manuscript pictures (data: URLs, often large) become files; the list keeps their file address. */
    private static JSONArray slimManuscripts(Context ctx, JSONArray ms) throws Exception {
        File dir = new File(ctx.getFilesDir(), "manuscripts");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        JSONArray out = new JSONArray();
        for (int i = 0; i < ms.length(); i++) {
            JSONObject m = ms.optJSONObject(i);
            if (m == null) continue;
            String src = m.optString("pngDataUrl", "");
            if (src.startsWith("data:")) {
                File f = new File(dir, Images.sha1(src) + ".png");
                if (!f.exists()) {
                    byte[] bytes = android.util.Base64.decode(src.substring(src.indexOf(',') + 1), android.util.Base64.DEFAULT);
                    try (FileOutputStream o = new FileOutputStream(f)) {
                        o.write(bytes);
                    }
                }
                src = "file://" + f.getAbsolutePath();
            }
            out.put(new JSONObject().put("id", m.optString("id")).put("src", src)
                    .put("content", src.isEmpty() ? m.optString("content") : "")
                    .put("fontFamily", m.optString("fontFamily")).put("scale", m.optDouble("scale", 1.0)));
        }
        return out;
    }

    static JSONObject master(Context ctx) {
        return Widgets.json(ctx, "cloud_master");
    }

    static JSONArray array(Context ctx, String key) {
        return Widgets.array(ctx, key);
    }

    /** "name~country" like the site's favSpecString */
    static String favSpec(JSONObject t) {
        String c = t.optString("country", "");
        return c.isEmpty() ? t.optString("name") : t.optString("name") + "~" + c;
    }
}
