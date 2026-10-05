package com.drivecast.sovereign;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The browsing widgets - subscriptions, reciters and media search - work inside the widget itself, like the media
 * screen: tap a channel to see its videos, a reciter then a surah to see the recitations, or search; tap a video to
 * play it in the app. Each widget keeps its own navigation (a stack of screens, back goes up one).
 */
final class MediaBrowser {

    private MediaBrowser() {
    }

    static final String BROWSE = "com.drivecast.BROWSE";
    static final String BACK = "com.drivecast.BROWSE_BACK";
    static final String PLAY = "com.drivecast.PLAY_VIDEO";
    static final String STREAM = "com.drivecast.PLAY_STREAM";

    // ---- YouTube (the site's key pool, rotated when one runs out) ----

    private static final String[] KEYS = {
            "AIzaSyCANadeSR-riPkSf7wEJGSfJQREIn7dTi4",
            "AIzaSyBQj0_RN0bVEYcPcmII709P3-BUGKCcClM",
            "AIzaSyBiR5Aw4N5sawPfiBjx1YvnxCD4MQOTDUk",
            "AIzaSyD3gFYKChgOrYCrJeYP_zu6AolEh2ZEpvU",
            "AIzaSyBBr2Wszx3vI1CZ09FcKl40tp4e3RSTd84",
            "AIzaSyDaf2CQ2eAMzDYPjyPWwBGr2oP1jLdIK3Q",
            "AIzaSyChsEKkZ8H7_tEvaiylD0BIa5BsxxOjK24",
            "AIzaSyCxfbZmguW3qxgKfxjs4o9OsXTbnCuRMoc",
            "AIzaSyCDXmW0Jzhv93uYjk9xfgxCS2061jqWaaY",
            "AIzaSyAuyQADaB5SzwebqRMaG_AfkKRyB-uBL3c",
            "AIzaSyB7QdfI0br5BfP71hOr36hz2dRWG_l0G8k",
            "AIzaSyBbhRcFh-u3bWcG8sPLNnOl5r_lMG8q7Zs",
            "AIzaSyBeTHs25EsKeDFtIS5kq8iDATz-2c8hBrI",
            "AIzaSyDj4w1H3Is_rmTLhl40zER7AgYhT_tKASo",
            "AIzaSyCaqMPtn-egmEQk7XmTel--xsXV1Xbdp7o",
            "AIzaSyBLrMA6plsSZtqg2iY9Z1N1fJAHNmgGxos",
            "AIzaSyBdhcRo-EsvIduedQd-jFHfrEj9NeiP7pU",
            "AIzaSyBYThRM6tVnzgFgdHOUAN6DN8jQd54OKeg",
            "AIzaSyDULoFJLWNIO9hn0u8siLz-BzTi7eM-CX4",
            "AIzaSyAjdVZ2Rodp6ZVEF1pZT195kAtGELolxSI",
            "AIzaSyCcB-bW1b1bSu3hzROVhSbRT-D894zHYeg",
            "AIzaSyCDk0lSml9gAvvsgBoWKvVToiFaxWlTZEw",
            "AIzaSyATzZbuYsLdQq-S8zFih3hkgtZVpS0bcN8",
            "AIzaSyBWsvSFb6VNx89VOzjP0-zq7sWgPhfiWjE",
            "AIzaSyDb4_3-IBy5ZPsIwlkv81z3EDS9Tue98n4",
            "AIzaSyABJ0ChF7XVsXeppoLS9VBIxNJglc-0rB0",
            "AIzaSyB3Rk_x-Xponn6i-PXuTgPr2wisD28GvuM",
            "AIzaSyBI6enu3YIXcsgWCBK-ZyqiQsIzX4iPQiI"
    };
    private static int keyIndex = 0;

    private static JSONObject api(String endpoint, String query) {
        for (int i = 0; i < KEYS.length; i++) {
            int k = (keyIndex + i) % KEYS.length;
            try {
                HttpURLConnection c = (HttpURLConnection) new URL("https://www.googleapis.com/youtube/v3/" + endpoint + "?" + query + "&key=" + KEYS[k]).openConnection();
                c.setConnectTimeout(8_000);
                c.setReadTimeout(12_000);
                int code = c.getResponseCode();
                if (code == 403 || code == 429) continue; // this key is used up: the next one
                if (code != 200) return null;
                keyIndex = k;
                return new JSONObject(read(c));
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private static String read(HttpURLConnection c) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
            String line;
            while ((line = r.readLine()) != null) sb.append(line).append('\n');
        }
        return sb.toString();
    }

    private static String enc(String s) {
        try {
            return URLEncoder.encode(s, "UTF-8");
        } catch (Exception e) {
            return "";
        }
    }

    /** Videos for a search (like the media screen's search), optionally inside one channel. */
    static JSONArray search(String q, String channelId) {
        JSONArray out = new JSONArray();
        String params = "part=snippet&type=video&maxResults=30&order=" + (q.isEmpty() ? "date" : "relevance")
                + (q.isEmpty() ? "" : "&q=" + enc(q)) + (channelId != null ? "&channelId=" + enc(channelId) : "");
        JSONObject d = api("search", params);
        JSONArray items = d != null ? d.optJSONArray("items") : null;
        for (int i = 0; items != null && i < items.length(); i++) {
            JSONObject it = items.optJSONObject(i);
            JSONObject id = it != null ? it.optJSONObject("id") : null;
            JSONObject sn = it != null ? it.optJSONObject("snippet") : null;
            if (id == null || sn == null || id.optString("videoId").isEmpty()) continue;
            JSONObject th = sn.optJSONObject("thumbnails");
            String thumb = th != null && th.optJSONObject("high") != null ? th.optJSONObject("high").optString("url")
                    : "https://i.ytimg.com/vi/" + id.optString("videoId") + "/hqdefault.jpg";
            try {
                out.put(video(id.optString("videoId"), unescape(sn.optString("title")), unescape(sn.optString("channelTitle")), thumb));
            } catch (Exception ignored) {
            }
        }
        return out;
    }

    /** A channel's latest videos: its public feed (no quota), the API when the feed fails. */
    static JSONArray channelVideos(String channelId) {
        JSONArray out = new JSONArray();
        try {
            HttpURLConnection c = (HttpURLConnection) new URL("https://www.youtube.com/feeds/videos.xml?channel_id=" + enc(channelId)).openConnection();
            c.setConnectTimeout(8_000);
            c.setReadTimeout(12_000);
            if (c.getResponseCode() == 200) {
                String xml = read(c);
                String author = first(xml, "<author>\\s*<name>(.*?)</name>");
                Matcher m = Pattern.compile("<entry>(.*?)</entry>", Pattern.DOTALL).matcher(xml);
                while (m.find()) {
                    String e = m.group(1);
                    String id = first(e, "<yt:videoId>(.*?)</yt:videoId>");
                    if (id.isEmpty()) continue;
                    JSONObject v = video(id, unescape(first(e, "<title>(.*?)</title>")), unescape(author), "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg");
                    v.put("published", first(e, "<published>(.*?)</published>"));
                    String views = first(e, "views=\"(\\d+)\"");
                    if (!views.isEmpty()) v.put("views", Long.parseLong(views));
                    out.put(v);
                }
            }
        } catch (Exception ignored) {
        }
        return out.length() > 0 ? out : search("", channelId);
    }

    private static String first(String s, String re) {
        Matcher m = Pattern.compile(re, Pattern.DOTALL).matcher(s);
        return m.find() ? m.group(1).trim() : "";
    }

    private static String unescape(String s) {
        return s.replace("&amp;", "&").replace("&quot;", "\"").replace("&#39;", "'").replace("&lt;", "<").replace("&gt;", ">");
    }

    private static JSONObject video(String id, String title, String channel, String thumb) throws Exception {
        return new JSONObject().put("kind", "video").put("id", id).put("name", title).put("channel", channel).put("thumb", thumb);
    }

    // ---- the 114 surahs ----

    static final String[] SURAHS = {"الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر", "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق", "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج", "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس", "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد", "الإخلاص", "الفلق", "الناس"};

    // ---- navigation state, per widget ----

    /** "channels" | "reciters" | "search": what the widget opens on. */
    static String rootKind(Context ctx, int wid) {
        AppWidgetProviderInfo info = AppWidgetManager.getInstance(ctx).getAppWidgetInfo(wid);
        String cls = info != null && info.provider != null ? info.provider.getClassName() : "";
        if (cls.endsWith("RecitersWidget")) return "reciters";
        if (cls.endsWith("SearchWidget")) return "search";
        if (cls.endsWith("FoldersWidget")) return "folders";
        if (cls.endsWith("SavedWidget")) return "saved";
        if (cls.endsWith("IptvWidget")) return "iptv";
        if (cls.endsWith("MediaHomeWidget")) return "media";
        if (cls.endsWith("AzkarWidget")) return "azkar";
        return "channels";
    }

    static JSONArray stack(Context ctx, int wid) {
        return Widgets.array(ctx, "browse_" + wid);
    }

    private static void save(Context ctx, int wid, JSONArray st) {
        NativeIslandPlugin.prefs(ctx).edit().putString("browse_" + wid, st.toString()).apply();
    }

    /** The screen on top (the root screen when nothing was opened). */
    static JSONObject top(Context ctx, int wid) {
        JSONArray st = stack(ctx, wid);
        if (st.length() > 0) return st.optJSONObject(st.length() - 1);
        return root(ctx, rootKind(ctx, wid));
    }

    private static JSONObject root(Context ctx, String kind) {
        JSONObject o = new JSONObject();
        try {
            JSONArray items = new JSONArray();
            if ("reciters".equals(kind)) {
                o.put("title", "القرّاء");
                JSONArray r = Widgets.array(ctx, "cloud_reciters");
                for (int i = 0; i < r.length(); i++) {
                    JSONObject x = r.optJSONObject(i);
                    items.put(new JSONObject().put("kind", "reciter").put("id", x.optString("id")).put("name", x.optString("name")).put("thumb", x.optString("image")));
                }
                o.put("empty", "جاري تحميل القرّاء...");
            } else if ("folders".equals(kind)) {
                o.put("title", "المجلدات والترددات المجرسة");
                JSONArray pl = Widgets.playlists(ctx);
                for (int i = 0; i < pl.length(); i++) {
                    JSONObject p = pl.optJSONObject(i);
                    items.put(new JSONObject(p.toString()).put("kind", "playlist"));
                }
                JSONArray top = Widgets.array(ctx, "cloud_top");
                for (int i = 0; i < top.length(); i++) items.put(top.get(i));
                o.put("empty", "جاري تحميل المجلدات...");
            } else if ("saved".equals(kind)) {
                o.put("title", "المحتويات المحفوظة فردياً");
                JSONArray sv = Cloud.master(ctx).optJSONArray("savedVideos");
                if (sv != null) items = sv;
                o.put("empty", "لا توجد فيديوهات محفوظة فردياً");
            } else if ("iptv".equals(kind)) {
                o.put("title", "القنوات المفضلة");
                JSONArray tv = Widgets.array(ctx, "cloud_iptv");
                for (int i = 0; i < tv.length(); i++) items.put(new JSONObject(tv.getJSONObject(i).toString()).put("kind", "iptv"));
                o.put("empty", "جاري تحميل القنوات المفضلة...");
            } else if ("azkar".equals(kind)) {
                // the azkar of now: morning from Fajr until Asr, evening from Asr until the next Fajr (like the site)
                String period = azkarPeriod(ctx);
                JSONObject counts = azkarCounts(ctx);
                int done = 0, total = 0;
                for (String[] z : AzkarData.ITEMS) {
                    if (!period.equals(z[3])) continue;
                    int need = Integer.parseInt(z[2]), have = Math.min(need, counts.optInt(z[0]));
                    total++;
                    if (have >= need) done++;
                    items.put(new JSONObject().put("kind", "zikr").put("id", z[0]).put("name", z[1]).put("text", z[4])
                            .put("count", need).put("done", have));
                }
                o.put("title", ("morning".equals(period) ? "أذكار الصباح" : "أذكار المساء") + "  " + done + "/" + total);
                o.put("rows", true);
                o.put("empty", "");
            } else if ("media".equals(kind)) {
                // the media screen: its sections one under the other (rows built by the list factory)
                o.put("title", "الوسائط");
                JSONObject master = Cloud.master(ctx);
                section(items, "استكمال المشاهدة", "card", master.optJSONArray("continueWatching"), "video", 4);
                JSONArray pls = new JSONArray();
                JSONArray pl = Widgets.playlists(ctx);
                for (int i = 0; i < pl.length(); i++) pls.put(new JSONObject(pl.getJSONObject(i).toString()).put("kind", "playlist"));
                section(items, "المفضلات العامة", "card", pls, null, 6);
                JSONArray rec = new JSONArray();
                JSONArray r = Widgets.array(ctx, "cloud_reciters");
                for (int i = 0; i < r.length(); i++) rec.put(new JSONObject().put("kind", "reciter").put("id", r.getJSONObject(i).optString("id")).put("name", r.getJSONObject(i).optString("name")).put("thumb", r.getJSONObject(i).optString("image")));
                section(items, "نخبة القرّاء المختارين", "circle", rec, null, 12);
                JSONArray chs = new JSONArray();
                JSONArray ch = Widgets.array(ctx, "cloud_channels");
                for (int i = 0; i < ch.length(); i++) chs.put(new JSONObject().put("kind", "channel").put("id", ch.getJSONObject(i).optString("id")).put("name", ch.getJSONObject(i).optString("name")).put("thumb", ch.getJSONObject(i).optString("image")).put("starred", ch.getJSONObject(i).optBoolean("starred")));
                section(items, "الاشتراكات", "circle", chs, null, 16);
                section(items, "أحدث التلاوات", "card", Widgets.array(ctx, "cloud_latest"), "video", 8);
                o.put("rows", true);
                o.put("empty", "جاري تحميل الوسائط...");
            } else if ("search".equals(kind)) {
                o.put("title", "البحث في الوسائط");
                JSONArray last = Widgets.array(ctx, "search_last");
                items = last;
                o.put("empty", "اضغط \"بحث\" واكتب أو تحدّث");
            } else {
                o.put("title", "الاشتراكات");
                JSONArray ch = Widgets.array(ctx, "cloud_channels");
                JSONArray rest = new JSONArray();
                for (int i = 0; i < ch.length(); i++) {
                    JSONObject x = ch.optJSONObject(i);
                    JSONObject it = new JSONObject().put("kind", "channel").put("id", x.optString("id")).put("name", x.optString("name"))
                            .put("thumb", x.optString("image")).put("starred", x.optBoolean("starred"));
                    if (x.optBoolean("starred")) items.put(it); else rest.put(it);
                }
                for (int i = 0; i < rest.length(); i++) items.put(rest.get(i));
                o.put("empty", "جاري تحميل القنوات...");
            }
            o.put("view", "root").put("items", items);
        } catch (Exception ignored) {
        }
        return o;
    }

    /** "morning" from Fajr until Asr (today's cloud prayer times), "evening" otherwise. */
    static String azkarPeriod(Context ctx) {
        java.util.Calendar c = java.util.Calendar.getInstance();
        int now = c.get(java.util.Calendar.HOUR_OF_DAY) * 60 + c.get(java.util.Calendar.MINUTE);
        String today = Cloud.day(System.currentTimeMillis());
        JSONArray days = Widgets.array(ctx, "cloud_prayers");
        for (int i = 0; i < days.length(); i++) {
            JSONObject r = days.optJSONObject(i);
            if (r == null || !today.equals(r.optString("date"))) continue;
            int f = hm(r.optString("fajr")), a = hm(r.optString("asr"));
            if (f >= 0 && a >= 0) return now >= f && now < a ? "morning" : "evening";
        }
        int h = c.get(java.util.Calendar.HOUR_OF_DAY);
        return h >= 4 && h < 15 ? "morning" : "evening";
    }

    private static int hm(String t) {
        try {
            String[] p = t.split(":");
            return Integer.parseInt(p[0].trim()) * 60 + Integer.parseInt(p[1].trim().substring(0, 2));
        } catch (Exception e) {
            return -1;
        }
    }

    /** today's counts (a new day starts from zero) */
    static JSONObject azkarCounts(Context ctx) {
        JSONObject o = Widgets.json(ctx, "azkarCounts");
        return Cloud.day(System.currentTimeMillis()).equals(o.optString("day")) ? o : new JSONObject();
    }

    /** The videos of a screen (flat, or inside the media screen's rows), for previous / next. */
    private static void collectVideos(JSONArray its, JSONArray out) {
        for (int k = 0; its != null && k < its.length() && out.length() < 60; k++) {
            JSONObject x = its.optJSONObject(k);
            if (x == null) continue;
            if ("video".equals(x.optString("kind"))) {
                try {
                    out.put(new JSONObject().put("id", x.optString("id")).put("name", x.optString("name")));
                } catch (Exception ignored) {
                }
            }
            else if (x.has("items")) collectVideos(x.optJSONArray("items"), out);
        }
    }

    /** A section of the media screen: a header row, then rows of 4 circles or 2 cards. */
    private static void section(JSONArray rows, String title, String style, JSONArray list, String kind, int max) throws Exception {
        if (list == null || list.length() == 0) return;
        rows.put(new JSONObject().put("row", "header").put("title", title));
        int per = "circle".equals(style) ? 4 : 2;
        JSONArray cur = null;
        for (int i = 0; i < Math.min(max, list.length()); i++) {
            if (i % per == 0) {
                cur = new JSONArray();
                rows.put(new JSONObject().put("row", "tiles").put("style", style).put("items", cur));
            }
            JSONObject it = new JSONObject(list.getJSONObject(i).toString());
            if (kind != null && !it.has("kind")) it.put("kind", kind);
            cur.put(it);
        }
    }

    /** Play a video (YouTube id) or a stream (an address) full screen. */
    static void play(Context ctx, String type, String id, String title, JSONArray queue) {
        Intent p = new Intent(ctx, PlayerActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra("type", type).putExtra("id", id).putExtra("title", title).putExtra("queue", queue.toString());
        try { ctx.startActivity(p); } catch (Exception ignored) { }
    }

    /** A tap in a browsing widget (from WidgetActionReceiver). */
    static void onTap(final Context ctx, Intent i, final android.content.BroadcastReceiver.PendingResult done) {
        final int wid = i.getIntExtra("wid", 0);
        String a = i.getAction();
        if (BACK.equals(a)) {
            JSONArray st = stack(ctx, wid);
            JSONArray out = new JSONArray();
            for (int k = 0; k < st.length() - 1; k++) out.put(st.opt(k));
            save(ctx, wid, out);
            Widgets.updateAll(ctx);
            done.finish();
            return;
        }
        final String kind = i.getStringExtra("kind"), id = i.getStringExtra("id"), name = i.getStringExtra("name");
        if ("zikr".equals(kind)) {
            // one more: the counter goes down, the card turns green when done
            JSONObject counts = azkarCounts(ctx);
            int need = 1;
            for (String[] z : AzkarData.ITEMS) if (z[0].equals(id)) need = Integer.parseInt(z[2]);
            try {
                counts.put("day", Cloud.day(System.currentTimeMillis()));
                counts.put(id, Math.min(need, counts.optInt(id) + 1));
            } catch (Exception ignored) {
            }
            NativeIslandPlugin.prefs(ctx).edit().putString("azkarCounts", counts.toString()).apply();
            // the page's azkar screen and the islands follow the widget's counter
            Hub.set(ctx, "azkarCounts", counts);
            done.finish();
            return;
        }
        if ("iptv".equals(kind)) {
            JSONArray q = new JSONArray();
            JSONArray its = top(ctx, wid).optJSONArray("items");
            for (int k = 0; its != null && k < its.length(); k++) {
                JSONObject x = its.optJSONObject(k);
                if (x != null && "iptv".equals(x.optString("kind"))) q.put(x);
            }
            play(ctx, "stream", id, name, q);
            done.finish();
            return;
        }
        if ("playlist".equals(kind)) {
            // the folder's videos (kept from the cloud)
            JSONArray pl = Widgets.playlists(ctx);
            for (int k = 0; k < pl.length(); k++) {
                JSONObject p = pl.optJSONObject(k);
                if (p != null && id.equals(p.optString("id"))) {
                    try {
                        JSONArray v = p.optJSONArray("videos");
                        push(ctx, wid, new JSONObject().put("view", "videos").put("title", name).put("items", v != null ? v : new JSONArray()).put("empty", "المجلد فارغ"));
                    } catch (Exception ignored) {
                    }
                }
            }
            Widgets.updateAll(ctx);
            done.finish();
            return;
        }
        if ("video".equals(kind)) {
            // full screen player, with the screen's other videos as previous / next
            JSONArray q = new JSONArray();
            JSONArray its = top(ctx, wid).optJSONArray("items");
            collectVideos(its, q);
            play(ctx, "youtube", id, name, q);
            done.finish();
            return;
        }
        try {
            if ("reciter".equals(kind)) {
                JSONArray items = new JSONArray();
                for (int k = 0; k < SURAHS.length; k++) items.put(new JSONObject().put("kind", "surah").put("id", String.valueOf(k + 1)).put("name", SURAHS[k]).put("reciter", name));
                push(ctx, wid, new JSONObject().put("view", "surahs").put("title", name).put("items", items));
                Widgets.updateAll(ctx);
                done.finish();
                return;
            }
        } catch (Exception ignored) {
        }
        final String title, query, channel;
        if ("channel".equals(kind)) { title = name; query = null; channel = id; }
        else if ("surah".equals(kind)) { String r = i.getStringExtra("reciter"); title = (r == null ? "" : r + " · ") + "سورة " + name; query = (r == null ? "" : r + " ") + "سورة " + name; channel = null; }
        else { title = "بحث: " + name; query = name; channel = null; }
        load(ctx, wid, title, query, channel, done);
    }

    /** Open a screen of videos: shown at once as loading, filled when they arrive. */
    static void load(final Context ctx, final int wid, final String title, final String query, final String channel, final android.content.BroadcastReceiver.PendingResult done) {
        try {
            push(ctx, wid, new JSONObject().put("view", "videos").put("title", title).put("items", new JSONArray()).put("empty", "جاري التحميل..."));
        } catch (Exception ignored) {
        }
        Widgets.updateAll(ctx);
        new Thread(() -> {
            JSONArray vids = channel != null ? channelVideos(channel) : search(query, null);
            JSONArray st = stack(ctx, wid);
            JSONObject t = st.optJSONObject(st.length() - 1);
            try {
                if (t != null && title.equals(t.optString("title"))) {
                    t.put("items", vids).put("empty", vids.length() == 0 ? "لا نتائج" : "");
                    save(ctx, wid, st);
                }
                if (query != null && channel == null && "search".equals(rootKind(ctx, wid))) {
                    NativeIslandPlugin.prefs(ctx).edit().putString("search_last", vids.toString()).apply();
                }
            } catch (Exception ignored) {
            }
            Widgets.updateAll(ctx);
            if (done != null) done.finish();
        }).start();
    }

    private static void push(Context ctx, int wid, JSONObject screen) {
        JSONArray st = stack(ctx, wid);
        // a new search from the top replaces the old results instead of piling up
        if (st.length() > 6) {
            JSONArray cut = new JSONArray();
            for (int k = st.length() - 6; k < st.length(); k++) cut.put(st.opt(k));
            st = cut;
        }
        st.put(screen);
        save(ctx, wid, st);
    }

    // ---- the widget ----

    static RemoteViews build(Context ctx, int wid, int w, int h, int realH) {
        JSONObject t = top(ctx, wid);
        JSONArray items = t.optJSONArray("items");
        if (items == null) items = new JSONArray();
        String firstKind = items.length() > 0 && items.optJSONObject(0) != null ? items.optJSONObject(0).optString("kind") : "";
        boolean videos = "videos".equals(t.optString("view")) || "video".equals(firstKind) || "playlist".equals(firstKind);
        boolean surahs = "surahs".equals(t.optString("view")) || "iptv".equals(firstKind);
        int layout = t.optBoolean("rows") ? R.layout.widget_browse_list : videos ? R.layout.widget_browse_wide : surahs ? R.layout.widget_browse_mid : R.layout.widget_browse;
        RemoteViews v = new RemoteViews(ctx.getPackageName(), layout);
        float d = ctx.getResources().getDisplayMetrics().density;
        float k = h / (float) Math.max(1, realH);
        int hh = Math.max(1, Math.round(40 * d * k));
        boolean deep = stack(ctx, wid).length() > 0;
        int hw = Math.max(1, Math.round(w - 20 * d * k - 116 * d * k - (deep ? 46 * d * k : 0)));
        v.setImageViewBitmap(R.id.browse_header, WidgetArt.browseHeader(ctx, hw, hh, t.optString("title"), items.length(), rootKind(ctx, wid)));
        v.setImageViewBitmap(R.id.browse_search, WidgetArt.searchButton(ctx, Math.round(110 * d * k), hh));
        v.setViewVisibility(R.id.browse_back, deep ? View.VISIBLE : View.GONE);
        if (deep) {
            v.setImageViewBitmap(R.id.browse_back, WidgetArt.backButton(ctx, Math.round(40 * d * k), hh));
            Intent b = new Intent(ctx, WidgetActionReceiver.class).setAction(BACK).putExtra("wid", wid);
            b.setData(Uri.parse("drivecast://back/" + wid));
            v.setOnClickPendingIntent(R.id.browse_back, PendingIntent.getBroadcast(ctx, 1100 + wid, b, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        }
        Intent s = new Intent(ctx, SearchActivity.class).putExtra("wid", wid).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        s.setData(Uri.parse("drivecast://search/" + wid));
        v.setOnClickPendingIntent(R.id.browse_search, PendingIntent.getActivity(ctx, 1200 + wid, s, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        boolean azkar = "azkar".equals(rootKind(ctx, wid));
        v.setOnClickPendingIntent(R.id.browse_header, Widgets.openApp(ctx, azkar ? "/football" : "/media", 1300 + wid));
        if (azkar) v.setViewVisibility(R.id.browse_search, View.GONE);
        Intent svc = new Intent(ctx, FoldersWidgetService.class);
        svc.setData(Uri.parse("drivecast://browse/" + wid + "/" + items.toString().hashCode() + "/" + layout));
        v.setRemoteAdapter(R.id.folders_grid, svc);
        v.setEmptyView(R.id.folders_grid, R.id.folders_empty);
        v.setTextViewText(R.id.folders_empty, t.optString("empty", ""));
        Intent tpl = new Intent(ctx, WidgetActionReceiver.class).setAction(BROWSE).putExtra("wid", wid);
        tpl.setData(Uri.parse("drivecast://tap/" + wid));
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
        v.setPendingIntentTemplate(R.id.folders_grid, PendingIntent.getBroadcast(ctx, 1400 + wid, tpl, flags));
        return v;
    }
}
