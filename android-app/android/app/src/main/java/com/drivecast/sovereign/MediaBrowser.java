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
                    out.put(video(id, unescape(first(e, "<title>(.*?)</title>")), unescape(author), "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"));
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
        if ("video".equals(kind)) {
            // play it in the app (the page's player)
            Intent open = new Intent(ctx, MainActivity.class);
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (NativeIslandPlugin.isPageAlive()) NativeIslandPlugin.emitCommand("play", "v:" + id);
            else NativeIslandPlugin.queueCommand("play", "v:" + id);
            try { ctx.startActivity(open); } catch (Exception ignored) { }
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
        boolean videos = "videos".equals(t.optString("view"));
        boolean surahs = "surahs".equals(t.optString("view"));
        int layout = videos ? R.layout.widget_browse_wide : surahs ? R.layout.widget_browse_mid : R.layout.widget_browse;
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
        v.setOnClickPendingIntent(R.id.browse_header, Widgets.openApp(ctx, "/media", 1300 + wid));
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
