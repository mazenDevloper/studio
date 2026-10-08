package com.drivecast.sovereign;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Home-screen widgets (standard Android AppWidgets: Samsung One UI, Nova and any launcher). Each one is drawn as a
 * picture by WidgetArt in the site's style, at the widget's real size, with touch areas laid over it:
 * prayer (next prayer, live countdown, the day's times), matches (favourite teams with logos), media (now playing +
 * controls), Quran (surah / reciter, played natively), screens, moon (phase + Hijri / Gregorian date + weather),
 * manuscript (the board's manuscripts in its ink) and folders (folders + most viewed videos).
 */
public final class Widgets {

    private Widgets() {
    }

    // ---- providers (declared in the manifest) ----

    public static class Base extends AppWidgetProvider {
        @Override
        public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) { updateAll(ctx); }

        @Override
        public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager m, int id, Bundle o) { updateAll(ctx); }
    }

    public static class PrayerWidget extends Base { }

    public static class MatchesWidget extends Base { }

    public static class MediaWidget extends Base { }

    public static class QuranWidget extends Base { }

    public static class ScreensWidget extends Base { }

    public static class MoonWidget extends Base { }

    public static class ManuscriptWidget extends Base { }

    public static class FoldersWidget extends Base { }

    public static class ChannelsWidget extends Base { }

    public static class RecitersWidget extends Base { }

    public static class SearchWidget extends Base { }

    public static class SavedWidget extends Base { }

    public static class MediaHomeWidget extends Base { }

    public static class AzkarWidget extends Base { }

    public static class IptvWidget extends Base { }

    public static class PrayerBarWidget extends Base { }

    public static class ClockWidget extends Base { }

    public static class MapWidget extends Base { }

    public static class DayWidget extends Base { }

    // ---- shared ----

    static JSONObject json(Context ctx, String key) {
        try {
            return new JSONObject(NativeIslandPlugin.prefs(ctx).getString(key, "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static JSONArray array(Context ctx, String key) {
        try {
            return new JSONArray(NativeIslandPlugin.prefs(ctx).getString(key, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    /** Open the app on a screen ("/matches"), optionally with a command for the page. */
    static PendingIntent openApp(Context ctx, String route, int requestCode) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (route != null) i.putExtra("route", route);
        return PendingIntent.getActivity(ctx, requestCode, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** A widget button: handled by WidgetActionReceiver (media commands for the page, the Quran player, ...). */
    static PendingIntent action(Context ctx, String action, int requestCode) {
        Intent i = new Intent(ctx, WidgetActionReceiver.class);
        i.setAction(action);
        return PendingIntent.getBroadcast(ctx, requestCode, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    // ---- rendering (one worker thread; requests that arrive while one is queued are merged) ----

    private static final ExecutorService worker = Executors.newSingleThreadExecutor();
    private static final AtomicBoolean queued = new AtomicBoolean(false);

    /** Redraw every placed widget (called on data changes, every minute by the service, on resize). */
    static void updateAll(Context ctx) {
        final Context app = ctx.getApplicationContext();
        if (!queued.compareAndSet(false, true)) return;
        worker.execute(() -> {
            try {
                Thread.sleep(250);
            } catch (InterruptedException ignored) {
            }
            queued.set(false);
            renderAll(app);
        });
    }

    private static long lastEmptyFetch = 0;

    /**
     * Today's and tomorrow's adhan / iqamah times: what the page sent, or - the app never opened, or not today -
     * worked out here from the cloud prayer times and settings, like the page does.
     */
    static JSONArray countdowns(Context ctx) {
        JSONArray sent = json(ctx, "config").optJSONArray("countdowns");
        long now = System.currentTimeMillis();
        boolean fresh = false;
        for (int i = 0; sent != null && i < sent.length(); i++) if (sent.optJSONObject(i) != null && sent.optJSONObject(i).optLong("at") > now) fresh = true;
        if (fresh) return sent;
        return computedCountdowns(ctx);
    }

    /**
     * The whole of today (passed prayers included) and tomorrow, from the cloud times: for what lists the day
     * (the prayer bar, the occasions) - the page may send only the coming ones. Falls back to what the page sent.
     */
    static JSONArray dayCountdowns(Context ctx) {
        JSONArray c = computedCountdowns(ctx);
        if (c.length() > 0) return c;
        JSONArray sent = json(ctx, "config").optJSONArray("countdowns");
        return sent != null ? sent : new JSONArray();
    }

    static JSONArray computedCountdowns(Context ctx) {
        JSONArray out = new JSONArray();
        JSONArray days = Cloud.array(ctx, "cloud_prayers");
        JSONArray settings = Cloud.master(ctx).optJSONArray("prayerSettings");
        if (settings == null || settings.length() == 0) {
            settings = new JSONArray();
            String[][] d = {{"fajr", "الفجر", "25"}, {"sunrise", "الشروق", "0"}, {"dhuhr", "الظهر", "20"}, {"asr", "العصر", "20"}, {"maghrib", "المغرب", "10"}, {"isha", "العشاء", "20"}};
            try {
                for (String[] x : d) settings.put(new JSONObject().put("id", x[0]).put("name", x[1]).put("iqamahDuration", Integer.parseInt(x[2])));
            } catch (Exception ignored) {
            }
        }
        for (int off = 0; off <= 1; off++) {
            Calendar c = Calendar.getInstance();
            c.add(Calendar.DAY_OF_MONTH, off);
            c.set(Calendar.HOUR_OF_DAY, 0);
            c.set(Calendar.MINUTE, 0);
            c.set(Calendar.SECOND, 0);
            c.set(Calendar.MILLISECOND, 0);
            String date = Cloud.day(c.getTimeInMillis());
            JSONObject row = null;
            for (int i = 0; i < days.length(); i++) if (date.equals(days.optJSONObject(i).optString("date"))) row = days.optJSONObject(i);
            if (row == null) continue;
            for (int i = 0; i < settings.length(); i++) {
                JSONObject s = settings.optJSONObject(i);
                if (s == null) continue;
                String id = s.optString("id");
                String ref = row.optString("duha".equals(id) ? "sunrise" : id, "");
                if (ref.isEmpty() || !ref.contains(":")) continue;
                String[] hm = ref.split(":");
                long at = c.getTimeInMillis() + ((Integer.parseInt(hm[0].trim()) * 60L + Integer.parseInt(hm[1].trim().substring(0, 2)) + ("duha".equals(id) ? 15 : 0) + s.optInt("offsetMinutes")) * 60_000L);
                try {
                    if (s.optBoolean("showCountdown", true)) out.put(new JSONObject().put("title", s.optString("name")).put("at", at).put("kind", "azan"));
                    if (s.optInt("iqamahDuration") > 0) out.put(new JSONObject().put("title", "إقامة " + s.optString("name")).put("at", at + s.optInt("iqamahDuration") * 60_000L).put("kind", "iqamah"));
                } catch (Exception ignored) {
                }
            }
        }
        return out;
    }

    /** The widget being drawn (for widgets with a per-widget choice, like a pinned manuscript). */
    static int currentId = 0;

    private interface Builder {
        RemoteViews build(Context ctx, int w, int h, int realH);
    }

    private static void renderAll(Context ctx) {
        AppWidgetManager m = AppWidgetManager.getInstance(ctx);
        // a widget with nothing to show fetches its data at once (no need to open the app), at most once a minute
        boolean empty = Cloud.array(ctx, "cloud_channels").length() == 0 || Cloud.master(ctx).length() == 0
                || Cloud.array(ctx, "cloud_prayers").length() == 0 || Cloud.array(ctx, "cloud_reciters").length() == 0;
        final boolean force = empty && System.currentTimeMillis() - lastEmptyFetch > 60_000 && (lastEmptyFetch = System.currentTimeMillis()) > 0;
        // the cloud is read on its own thread (the channel feeds take a while): the widgets draw now with what is
        // saved, and again as soon as the new data is in
        if (force || Cloud.due()) {
            final Context app = ctx.getApplicationContext();
            new Thread(() -> { Cloud.refresh(app, force); updateAll(app); }).start();
        }
        Cloud.matchesIfStale(ctx);
        render(ctx, m, PrayerWidget.class, 250, 110, Widgets::prayer);
        render(ctx, m, MatchesWidget.class, 250, 110, Widgets::matches);
        render(ctx, m, MediaWidget.class, 250, 80, Widgets::media);
        render(ctx, m, QuranWidget.class, 250, 80, Widgets::quran);
        render(ctx, m, ScreensWidget.class, 250, 110, Widgets::screens);
        render(ctx, m, MoonWidget.class, 140, 140, Widgets::moon);
        render(ctx, m, ManuscriptWidget.class, 250, 140, Widgets::manuscript);
        renderBrowse(ctx, m, FoldersWidget.class);
        renderBrowse(ctx, m, SavedWidget.class);
        renderBrowse(ctx, m, MediaHomeWidget.class);
        renderBrowse(ctx, m, AzkarWidget.class);
        renderBrowse(ctx, m, IptvWidget.class);
        render(ctx, m, PrayerBarWidget.class, 400, 100, Widgets::prayerBar);
        render(ctx, m, ClockWidget.class, 250, 110, Widgets::clock);
        renderBrowse(ctx, m, ChannelsWidget.class);
        renderBrowse(ctx, m, RecitersWidget.class);
        renderBrowse(ctx, m, SearchWidget.class);
        render(ctx, m, MapWidget.class, 250, 180, Widgets::map);
        render(ctx, m, DayWidget.class, 300, 170, Widgets::day);
    }

    private static void render(Context ctx, AppWidgetManager m, Class<?> provider, int defW, int defH, Builder b) {
        int[] ids;
        try {
            ids = m.getAppWidgetIds(new ComponentName(ctx, provider));
        } catch (Exception e) {
            return;
        }
        if (ids == null) return;
        for (int id : ids) {
            try {
                int[] s = sizePx(ctx, m, id, defW, defH);
                currentId = id;
                m.updateAppWidget(id, b.build(ctx, s[0], s[1], s[2]));
                if (provider == FoldersWidget.class || provider == ChannelsWidget.class) m.notifyAppWidgetViewDataChanged(id, R.id.folders_grid);
            } catch (Throwable ignored) {
                // never let one widget (or a big picture) stop the others
            }
        }
    }

    /** The browsing widgets (subscriptions, reciters, search): each keeps its own screen. */
    private static void renderBrowse(Context ctx, AppWidgetManager m, Class<?> provider) {
        int[] ids;
        try {
            ids = m.getAppWidgetIds(new ComponentName(ctx, provider));
        } catch (Exception e) {
            return;
        }
        if (ids == null) return;
        for (int id : ids) {
            try {
                int[] s = sizePx(ctx, m, id, 250, 180);
                m.updateAppWidget(id, MediaBrowser.build(ctx, id, s[0], s[1], s[2]));
                m.notifyAppWidgetViewDataChanged(id, R.id.folders_grid);
            } catch (Throwable ignored) {
            }
        }
    }

    /**
     * The widget's size in pixels for the picture {w, h} and its real height {realH} (the picture is capped at about
     * a megapixel; the countdown's text size uses the real height).
     */
    private static int[] sizePx(Context ctx, AppWidgetManager m, int id, int defW, int defH) {
        Bundle o = m.getAppWidgetOptions(id);
        boolean land = ctx.getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;
        int wDp = o == null ? 0 : o.getInt(land ? AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH : AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH);
        int hDp = o == null ? 0 : o.getInt(land ? AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT : AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT);
        if (wDp <= 0) wDp = defW;
        if (hDp <= 0) hDp = defH;
        DisplayMetrics dm = ctx.getResources().getDisplayMetrics();
        float w = wDp * dm.density, h = hDp * dm.density;
        int realH = Math.round(h);
        float k = (float) Math.min(1.0, Math.sqrt(900_000.0 / Math.max(1f, w * h)));
        return new int[]{Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), realH};
    }

    private static RemoteViews canvas(Context ctx, Bitmap b) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_canvas);
        v.setImageViewBitmap(R.id.widget_canvas, b);
        return v;
    }

    // ---- prayer ----

    private static RemoteViews prayer(Context ctx, int w, int h, int realH) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_prayer);
        v.setOnClickPendingIntent(R.id.widget_root, openApp(ctx, "/dashboard", 101));
        JSONArray list = countdowns(ctx);
        long now = System.currentTimeMillis();
        SimpleDateFormat day = new SimpleDateFormat("yyyyMMdd", Locale.ROOT);
        SimpleDateFormat hm = new SimpleDateFormat("H:mm", Locale.ROOT);
        String today = day.format(new Date(now));
        List<JSONObject> azan = new ArrayList<>();
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject c = list.optJSONObject(i);
            if (c != null && "azan".equals(c.optString("kind"))) azan.add(c);
        }
        Collections.sort(azan, (a, b) -> Long.compare(a.optLong("at"), b.optLong("at")));
        WidgetArt.Prayer next = null;
        long nextAt = 0;
        List<WidgetArt.Prayer> day1 = new ArrayList<>();
        for (JSONObject c : azan) {
            long at = c.optLong("at");
            boolean isNext = next == null && at > now;
            WidgetArt.Prayer p = new WidgetArt.Prayer();
            p.name = c.optString("title");
            p.time = Art.to12h(hm.format(new Date(at)));
            p.passed = at <= now;
            p.next = isNext;
            if (isNext) { next = p; nextAt = at; }
            if (today.equals(day.format(new Date(at)))) day1.add(p);
        }
        Bitmap b = WidgetArt.prayer(ctx, w, h, next, next != null ? next.time : "", day1);
        v.setImageViewBitmap(R.id.widget_canvas, b);
        if (next == null) {
            v.setViewVisibility(R.id.prayer_countdown, View.GONE);
        } else {
            v.setViewVisibility(R.id.prayer_countdown, View.VISIBLE);
            // a live countdown drawn by the launcher itself (no per-second updates needed)
            v.setChronometer(R.id.prayer_countdown, SystemClock.elapsedRealtime() + (nextAt - now), null, true);
            if (Build.VERSION.SDK_INT >= 24) v.setChronometerCountDown(R.id.prayer_countdown, true);
            v.setTextViewTextSize(R.id.prayer_countdown, TypedValue.COMPLEX_UNIT_PX, realH * WidgetArt.PRAYER_COUNT * 0.72f);
        }
        return v;
    }

    // ---- matches ----

    private static RemoteViews matches(Context ctx, int w, int h, int realH) {
        JSONArray data = array(ctx, "matchesData");
        // live favourites, live, upcoming by kick-off, finished
        List<JSONObject> list = new ArrayList<>();
        for (int i = 0; i < data.length(); i++) if (data.optJSONObject(i) != null) list.add(data.optJSONObject(i));
        Collections.sort(list, (a, b) -> {
            int ra = rank(a), rb = rank(b);
            if (ra != rb) return ra - rb;
            return Long.compare(a.optLong("timestamp"), b.optLong("timestamp"));
        });
        JSONArray sorted = new JSONArray();
        for (JSONObject o : list) sorted.put(o);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_matches_canvas);
        v.setImageViewBitmap(R.id.widget_canvas, WidgetArt.matches(ctx, w, h, sorted));
        v.setOnClickPendingIntent(R.id.widget_root, openApp(ctx, "/matches", 102));
        // ⟳ : fetch the scores now ("…" while it works)
        boolean busy = System.currentTimeMillis() - NativeIslandPlugin.prefs(ctx).getLong("matchesRefreshAt", 0) < 30_000L;
        v.setTextViewText(R.id.matches_refresh, busy ? "…" : "⟳");
        v.setOnClickPendingIntent(R.id.matches_refresh, action(ctx, WidgetActionReceiver.MATCHES_REFRESH, 103));
        return v;
    }

    private static int rank(JSONObject m) {
        String s = m.optString("status");
        if ("live".equals(s)) return m.optBoolean("favorite") ? 0 : 1;
        return "upcoming".equals(s) ? 2 : 3;
    }

    // ---- media (the app's player) ----

    private static RemoteViews media(Context ctx, int w, int h, int realH) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_media);
        JSONObject np = json(ctx, "widgets").optJSONObject("nowPlaying");
        String title = np != null ? np.optString("title", "") : "";
        boolean playing = np != null && np.optBoolean("playing");
        Bitmap thumb = np != null ? Images.get(ctx, np.optString("thumb", null), 640) : null;
        v.setImageViewBitmap(R.id.widget_canvas, WidgetArt.media(ctx, w, h, title, np != null ? np.optString("subtitle", "") : "",
                np != null ? np.optString("kind", null) : null, playing, thumb));
        v.setOnClickPendingIntent(R.id.media_toggle, action(ctx, WidgetActionReceiver.MEDIA_TOGGLE, 201));
        v.setOnClickPendingIntent(R.id.media_next, action(ctx, WidgetActionReceiver.MEDIA_NEXT, 202));
        v.setOnClickPendingIntent(R.id.media_prev, action(ctx, WidgetActionReceiver.MEDIA_PREV, 203));
        v.setOnClickPendingIntent(R.id.media_info, openApp(ctx, "/media", 204));
        return v;
    }

    // ---- Quran ----

    private static RemoteViews quran(Context ctx, int w, int h, int realH) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_quran);
        QuranState q = QuranState.load(ctx);
        v.setImageViewBitmap(R.id.widget_canvas, WidgetArt.quran(ctx, w, h, "سورة " + q.surahName(ctx), q.reciterName(ctx), q.playing));
        v.setOnClickPendingIntent(R.id.quran_toggle, action(ctx, WidgetActionReceiver.QURAN_TOGGLE, 301));
        v.setOnClickPendingIntent(R.id.quran_next, action(ctx, WidgetActionReceiver.QURAN_NEXT, 302));
        v.setOnClickPendingIntent(R.id.quran_prev, action(ctx, WidgetActionReceiver.QURAN_PREV, 303));
        v.setOnClickPendingIntent(R.id.quran_reciter, action(ctx, WidgetActionReceiver.QURAN_RECITER, 304));
        v.setOnClickPendingIntent(R.id.quran_surah, openApp(ctx, "/quran", 305));
        return v;
    }

    // ---- screens ----

    private static RemoteViews screens(Context ctx, int w, int h, int realH) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_screens);
        v.setImageViewBitmap(R.id.widget_canvas, WidgetArt.screens(ctx, w, h));
        v.setOnClickPendingIntent(R.id.screen_dashboard, openApp(ctx, "/dashboard", 401));
        v.setOnClickPendingIntent(R.id.screen_matches, openApp(ctx, "/matches", 402));
        v.setOnClickPendingIntent(R.id.screen_iptv, openApp(ctx, "/iptv", 403));
        v.setOnClickPendingIntent(R.id.screen_media, openApp(ctx, "/media", 404));
        v.setOnClickPendingIntent(R.id.screen_quran, openApp(ctx, "/quran", 405));
        v.setOnClickPendingIntent(R.id.screen_azkar, openApp(ctx, "/football", 406));
        v.setOnClickPendingIntent(R.id.screen_settings, openApp(ctx, "/settings", 407));
        return v;
    }

    // ---- moon ----

    static final String[] HIJRI_MONTHS = {"محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"};
    private static final String[] GREG_MONTHS = {"يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"};

    /** Today's Hijri date {day, month 0-11}: Umm al-Qura like the site (tabular before Android 7). */
    static int[] hijri() {
        return hijri(System.currentTimeMillis());
    }

    /** {day, month (0 = Muharram), year} of a moment (Umm al-Qura). */
    static int[] hijri(long when) {
        if (Build.VERSION.SDK_INT >= 24) {
            try {
                android.icu.util.IslamicCalendar ic = new android.icu.util.IslamicCalendar();
                ic.setTimeInMillis(when);
                ic.setCalculationType(android.icu.util.IslamicCalendar.CalculationType.ISLAMIC_UMALQURA);
                return new int[]{ic.get(android.icu.util.Calendar.DAY_OF_MONTH), ic.get(android.icu.util.Calendar.MONTH), ic.get(android.icu.util.Calendar.YEAR)};
            } catch (Throwable ignored) {
            }
        }
        // tabular Islamic calendar (Kuwaiti algorithm)
        Calendar g = Calendar.getInstance();
        g.setTimeInMillis(when);
        int d = g.get(Calendar.DAY_OF_MONTH), mo = g.get(Calendar.MONTH) + 1, y = g.get(Calendar.YEAR);
        int jd = (1461 * (y + 4800 + (mo - 14) / 12)) / 4 + (367 * (mo - 2 - 12 * ((mo - 14) / 12))) / 12
                - (3 * ((y + 4900 + (mo - 14) / 12) / 100)) / 4 + d - 32075;
        int l = jd - 1948440 + 10632, n = (l - 1) / 10631;
        l = l - 10631 * n + 354;
        int j = ((10985 - l) / 5316) * ((50 * l) / 17719) + (l / 5670) * ((43 * l) / 15238);
        l = l - ((30 - j) / 15) * ((17719 * j) / 50) - (j / 16) * ((15238 * j) / 43) + 29;
        int m = (24 * l) / 709;
        return new int[]{l - (709 * m) / 24, m - 1, 30 * n + j - 30};
    }

    private static RemoteViews moon(Context ctx, int w, int h, int realH) {
        int mode = NativeIslandPlugin.prefs(ctx).getInt("moonMode", 0) % 3;
        int[] hj = hijri();
        int phaseDay = Math.max(1, Math.min(30, hj[0]));
        Bitmap photo = Images.get(ctx, "https://phasesmoon.com/moonpng/220/moon-phase-" + phaseDay + ".webp", 440);
        String value, sub, label;
        Calendar g = Calendar.getInstance();
        if (mode == 0) {
            value = Art.arabicDigits(String.valueOf(hj[0]));
            sub = HIJRI_MONTHS[Math.max(0, Math.min(11, hj[1]))];
            label = "الهجري";
        } else if (mode == 1) {
            value = String.valueOf(g.get(Calendar.DAY_OF_MONTH));
            sub = GREG_MONTHS[g.get(Calendar.MONTH)];
            label = "الميلادي";
        } else {
            JSONObject wx = weather(ctx);
            value = wx.has("t") ? Math.round(wx.optDouble("t")) + "°" : "--";
            sub = weatherText(wx.optInt("code", -1));
            label = "الرصد الجوي";
        }
        RemoteViews v = canvas(ctx, WidgetArt.moon(ctx, w, h, photo, value, sub, label, mode));
        v.setOnClickPendingIntent(R.id.widget_root, action(ctx, WidgetActionReceiver.MOON_NEXT, 501));
        return v;
    }

    /** Salalah's current weather (open-meteo, like the site), refreshed every 30 minutes. */
    private static JSONObject weather(Context ctx) {
        JSONObject cached = json(ctx, "weather");
        if (System.currentTimeMillis() - cached.optLong("at") < 30 * 60_000L) return cached;
        try {
            HttpURLConnection c = (HttpURLConnection) new URL("https://api.open-meteo.com/v1/forecast?latitude=17.0151&longitude=54.0924&current=temperature_2m,weather_code&timezone=Asia%2FMuscat").openConnection();
            c.setConnectTimeout(10_000);
            c.setReadTimeout(15_000);
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
            }
            JSONObject cur = new JSONObject(sb.toString()).getJSONObject("current");
            JSONObject o = new JSONObject().put("t", cur.optDouble("temperature_2m")).put("code", cur.optInt("weather_code")).put("at", System.currentTimeMillis());
            NativeIslandPlugin.prefs(ctx).edit().putString("weather", o.toString()).apply();
            return o;
        } catch (Exception e) {
            return cached;
        }
    }

    private static String weatherText(int code) {
        if (code < 0) return "جاري الرصد...";
        if (code == 0) return "سماء صافية";
        if (code <= 3) return "غائم جزئياً";
        if (code <= 48) return "ضباب كثيف";
        if (code <= 55) return "رذاذ خفيف";
        if (code <= 65) return "أجواء ممطرة";
        if (code <= 75) return "ثلوج خفيفة";
        if (code <= 82) return "زخات مطر";
        if (code <= 99) return "عواصف رعدية";
        return "طقس مستقر";
    }

    // ---- manuscript ----

    private static RemoteViews manuscript(Context ctx, int w, int h, int realH) {
        JSONObject wd = json(ctx, "widgets");
        JSONObject master = Cloud.master(ctx);
        JSONObject ms = master.optJSONObject("mapSettings");
        JSONObject scales = master.optJSONObject("manuscriptScales");
        JSONArray cloudItems = Cloud.array(ctx, "cloud_manuscripts");
        JSONArray items = cloudItems.length() > 0 ? cloudItems : wd.optJSONArray("manuscripts");
        final int wid = currentId;
        android.content.SharedPreferences pr = NativeIslandPlugin.prefs(ctx);
        // this widget's own pin (chosen with its pin button) wins over the site's pinned manuscript
        String ownPin = pr.getString("manuPin_" + wid, "");
        String pinnedId = !ownPin.isEmpty() ? ownPin : ms != null ? ms.optString("pinnedManuscriptId", "") : wd.optString("pinnedManuscriptId", "");
        if ("null".equals(pinnedId)) pinnedId = "";
        List<JSONObject> ordered = new ArrayList<>();
        for (int i = 0; items != null && i < items.length(); i++) {
            JSONObject o = items.optJSONObject(i);
            if (o == null) continue;
            if (!pinnedId.isEmpty() && pinnedId.equals(o.optString("id"))) ordered.add(0, o); else ordered.add(o);
        }
        boolean pinned = !ordered.isEmpty() && !pinnedId.isEmpty() && pinnedId.equals(ordered.get(0).optString("id"));
        int tap = pr.getInt("manuIdx_" + wid, 0);
        // like the site: the pinned one stays, otherwise they take turns (every 5 minutes here)
        int idx = ordered.isEmpty() || (pinned && !ownPin.isEmpty()) ? 0 : (tap + (pinned ? 0 : (int) (System.currentTimeMillis() / 300_000L))) % ordered.size();
        JSONObject item = ordered.isEmpty() ? null : ordered.get(idx);

        Art.Ink ink = new Art.Ink();
        JSONObject inkJ = wd.optJSONObject("ink");
        if (ms != null) {
            try {
                inkJ = new JSONObject().put("mode", ms.optString("manuscriptInk", "white")).put("color", ms.optString("manuscriptInkColor", ""))
                        .put("texture", ms.optString("manuscriptTexture", ""));
            } catch (Exception ignored) {
            }
        }
        if (inkJ != null) {
            ink.mode = inkJ.optString("mode", "white");
            try {
                if (!inkJ.optString("color").isEmpty()) ink.color = Color.parseColor(inkJ.optString("color"));
            } catch (Exception ignored) {
            }
            if ("texture".equals(ink.mode)) ink.texture = Images.get(ctx, inkJ.optString("texture", null), 1024);
        }
        JSONObject bg = wd.optJSONObject("board");
        if (ms != null || bg == null) {
            try {
                String url = ms != null ? ms.optString("manuscriptBgUrl", "") : "";
                bg = new JSONObject().put("bg", url.isEmpty() ? Cloud.DEFAULT_BG : url).put("show", ms == null || ms.optBoolean("showManuscriptBg", true));
            } catch (Exception ignored) {
            }
        }
        Bitmap bgImage = bg != null && bg.optBoolean("show", true) ? Images.get(ctx, bg.optString("bg", null), 1024) : null;
        Bitmap art = item != null ? Images.get(ctx, item.optString("src", null), 1400) : null;
        String fontUrl = item != null ? item.optString("fontUrl", "") : "";
        if (item != null && fontUrl.isEmpty()) fontUrl = fontUrlFor(ctx, item.optString("fontFamily", ""));
        Typeface font = item != null && art == null ? Fonts.fromUrl(ctx, fontUrl) : null;
        float scale = item != null ? (float) (item.optDouble("scale", 1.0) * (scales != null ? scales.optDouble(item.optString("id"), 1.0) : 1.0)) : 1f;
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_manuscript);
        v.setImageViewBitmap(R.id.widget_canvas, WidgetArt.manuscript(ctx, w, h, bgImage, art, item != null ? item.optString("content", "") : null,
                font, scale, ink, pinned && idx == 0));
        v.setTextViewText(R.id.manu_pin, ownPin.isEmpty() ? "📌" : "📍");
        v.setInt(R.id.manu_pin, "setBackgroundResource", ownPin.isEmpty() ? R.drawable.widget_btn : R.drawable.widget_btn_accent);
        Intent next = new Intent(ctx, WidgetActionReceiver.class).setAction(WidgetActionReceiver.MANU_NEXT).putExtra("wid", wid);
        // a tap shows the next one (a widget with its own pin keeps it)
        v.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getBroadcast(ctx, 6000 + wid, next, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        Intent pick = new Intent(ctx, ManuscriptPickActivity.class).putExtra("wid", wid).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        v.setOnClickPendingIntent(R.id.manu_pin, PendingIntent.getActivity(ctx, 7000 + wid, pick, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        return v;
    }

    private static String fontUrlFor(Context ctx, String family) {
        if (family == null || family.isEmpty()) return null;
        JSONArray fonts = Cloud.array(ctx, "cloud_fonts");
        for (int i = 0; i < fonts.length(); i++) {
            JSONObject f = fonts.optJSONObject(i);
            if (f != null && family.equals(f.optString("name"))) return f.optString("url", null);
        }
        return null;
    }

    /** Folders: from the cloud (the master bin), or what the page sent. */
    static JSONArray playlists(Context ctx) {
        JSONArray cloud = Cloud.master(ctx).optJSONArray("playlists");
        if (cloud != null && cloud.length() > 0) return cloud;
        JSONArray web = json(ctx, "widgets").optJSONArray("playlists");
        return web != null ? web : new JSONArray();
    }

    // ---- subscriptions (channels) + search ----

    private static RemoteViews channels(Context ctx, int w, int h, int realH) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_channels);
        float d = ctx.getResources().getDisplayMetrics().density;
        float k = h / (float) Math.max(1, realH);
        JSONArray ch = Cloud.array(ctx, "cloud_channels");
        int hh = Math.max(1, Math.round(40 * d * k));
        int sw = Math.max(1, Math.round(110 * d * k)), hw = Math.max(1, Math.round(w - 20 * d * k - 116 * d * k));
        v.setImageViewBitmap(R.id.channels_header, WidgetArt.channelsHeader(ctx, hw, hh, ch.length()));
        v.setImageViewBitmap(R.id.channels_search, WidgetArt.searchButton(ctx, sw, hh));
        v.setOnClickPendingIntent(R.id.channels_header, openApp(ctx, "/media", 801));
        v.setOnClickPendingIntent(R.id.channels_search, openCommand(ctx, "/media", "search", "", 802));
        Intent svc = new Intent(ctx, FoldersWidgetService.class);
        svc.setData(Uri.parse("drivecast://channels/" + ch.length() + "/" + ch.toString().hashCode()));
        v.setRemoteAdapter(R.id.folders_grid, svc);
        v.setEmptyView(R.id.folders_grid, R.id.folders_empty);
        Intent tpl = new Intent(ctx, MainActivity.class);
        tpl.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
        v.setPendingIntentTemplate(R.id.folders_grid, PendingIntent.getActivity(ctx, 803, tpl, flags));
        return v;
    }

    /** Open the app on a screen and hand the page a command once that screen has loaded. */
    static PendingIntent openCommand(Context ctx, String route, String cmd, String arg, int requestCode) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (route != null) i.putExtra("route", route);
        i.putExtra("command", cmd);
        i.putExtra("arg", arg);
        return PendingIntent.getActivity(ctx, requestCode, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    // ---- the car dashboard's radar map (opens as a floating window over other apps) ----

    private static RemoteViews map(Context ctx, int w, int h, int realH) {
        java.io.File snap = new java.io.File(ctx.getFilesDir(), "map-snapshot.png");
        Bitmap shot = null;
        if (snap.exists()) {
            android.graphics.BitmapFactory.Options o = new android.graphics.BitmapFactory.Options();
            o.inSampleSize = 2;
            shot = android.graphics.BitmapFactory.decodeFile(snap.getAbsolutePath(), o);
        }
        RemoteViews v = canvas(ctx, WidgetArt.map(ctx, w, h, shot, IslandService.mapOpen()));
        v.setOnClickPendingIntent(R.id.widget_root, action(ctx, WidgetActionReceiver.MAP_TOGGLE, 901));
        return v;
    }

    // ---- the day (the dashboard's day card): Hijri date, the day name stretched with kashida, now + next prayer ----

    private static final String[] DAYS = {"الاحــــد", "الاثنيـــــن", "الثلاثــــاء", "الاربعــــاء", "الخميــــس", "الجمعــــة", "السبــــت"};

    private static RemoteViews day(Context ctx, int w, int h, int realH) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_day);
        Calendar g = Calendar.getInstance();
        int[] hj = hijri();
        String hijriText = hj[0] + " " + HIJRI_MONTHS[Math.max(0, Math.min(11, hj[1]))] + "، " + hj[2] + " هـ";
        int h12 = g.get(Calendar.HOUR) == 0 ? 12 : g.get(Calendar.HOUR);
        String now = h12 + ":" + String.format(Locale.ROOT, "%02d", g.get(Calendar.MINUTE));
        // the next adhan
        JSONArray list = countdowns(ctx);
        long t = System.currentTimeMillis(), nextAt = 0;
        String next = null;
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject c = list.optJSONObject(i);
            if (c == null || !"azan".equals(c.optString("kind"))) continue;
            long at = c.optLong("at");
            if (at > t && (next == null || at < nextAt)) { next = c.optString("title"); nextAt = at; }
        }
        String occasion = Occasions.label(ctx);
        if (occasion != null) hijriText = hijriText + "  •  " + occasion;
        v.setImageViewBitmap(R.id.widget_canvas, WidgetArt.day(ctx, w, h, hijriText, DAYS[g.get(Calendar.DAY_OF_WEEK) - 1], now));
        v.setOnClickPendingIntent(R.id.widget_root, openApp(ctx, "/dashboard", 1001));
        if (next == null) {
            v.setViewVisibility(R.id.day_next, View.GONE);
        } else {
            v.setViewVisibility(R.id.day_next, View.VISIBLE);
            int nh = Math.max(1, Math.round(realH * 0.13f)); // real pixels: shown at its own size beside the countdown
            v.setImageViewBitmap(R.id.day_next_name, WidgetArt.dayPrayerName(ctx, next, nh));
            v.setChronometer(R.id.day_countdown, SystemClock.elapsedRealtime() + (nextAt - t), null, true);
            if (Build.VERSION.SDK_INT >= 24) v.setChronometerCountDown(R.id.day_countdown, true);
            v.setTextViewTextSize(R.id.day_countdown, TypedValue.COMPLEX_UNIT_PX, realH * 0.12f);
        }
        return v;
    }

    // ---- the dashboard's prayer bar (all of today's prayers side by side) ----

    private static RemoteViews prayerBar(Context ctx, int w, int h, int realH) {
        JSONArray list = dayCountdowns(ctx);
        long now = System.currentTimeMillis();
        String today = Cloud.day(now);
        SimpleDateFormat hm = new SimpleDateFormat("H:mm", Locale.ROOT);
        List<String[]> rows = new ArrayList<>(); // name, adhan, iqamah, state
        List<long[]> times = new ArrayList<>();
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject c = list.optJSONObject(i);
            if (c == null || !"azan".equals(c.optString("kind")) || !today.equals(Cloud.day(c.optLong("at")))) continue;
            long iq = 0;
            for (int k = 0; k < list.length(); k++) {
                JSONObject q = list.optJSONObject(k);
                if (q != null && "iqamah".equals(q.optString("kind")) && q.optString("title").equals("إقامة " + c.optString("title"))
                        && today.equals(Cloud.day(q.optLong("at")))) iq = q.optLong("at");
            }
            rows.add(new String[]{c.optString("title"), Art.to12h(hm.format(new Date(c.optLong("at")))), iq > 0 ? Art.to12h(hm.format(new Date(iq))) : ""});
            times.add(new long[]{c.optLong("at"), iq});
        }
        // the active card: a prayer whose iqamah is running, otherwise the next one
        int active = -1;
        boolean inIqamah = false;
        for (int i = 0; i < times.size(); i++) if (times.get(i)[0] <= now && times.get(i)[1] > now) { active = i; inIqamah = true; }
        if (active < 0) for (int i = 0; i < times.size(); i++) if (times.get(i)[0] > now) { active = i; break; }
        RemoteViews v = canvas(ctx, WidgetArt.prayerBar(ctx, w, h, rows, active, inIqamah));
        v.setOnClickPendingIntent(R.id.widget_root, openApp(ctx, "/dashboard", 1501));
        return v;
    }

    // ---- the dashboard's clock ----

    private static RemoteViews clock(Context ctx, int w, int h, int realH) {
        Calendar g = Calendar.getInstance();
        int h12 = g.get(Calendar.HOUR) == 0 ? 12 : g.get(Calendar.HOUR);
        RemoteViews v = canvas(ctx, WidgetArt.clock(ctx, w, h, h12 + ":" + String.format(Locale.ROOT, "%02d", g.get(Calendar.MINUTE))));
        v.setOnClickPendingIntent(R.id.widget_root, openApp(ctx, "/dashboard", 1502));
        return v;
    }

    // ---- folders + most viewed ----

    private static RemoteViews folders(Context ctx, int w, int h, int realH) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_folders);
        float d = ctx.getResources().getDisplayMetrics().density;
        JSONObject wd = json(ctx, "widgets");
        JSONArray pl = playlists(ctx), tv = wd.optJSONArray("topVideos");
        int count = (pl != null ? pl.length() : 0) + (tv != null ? tv.length() : 0);
        // the header strip: the widget's width minus its 10dp padding each side, 34dp high (at the picture's scale)
        float k = h / (float) Math.max(1, realH);
        int hw = Math.max(1, Math.round(w - 20 * d * k)), hh = Math.max(1, Math.round(34 * d * k));
        v.setImageViewBitmap(R.id.folders_header, WidgetArt.foldersHeader(ctx, hw, hh, count));
        Intent svc = new Intent(ctx, FoldersWidgetService.class);
        svc.setData(Uri.parse("drivecast://folders/" + count + "/" + wd.optLong("foldersAt")));
        v.setRemoteAdapter(R.id.folders_grid, svc);
        v.setEmptyView(R.id.folders_grid, R.id.folders_empty);
        Intent tpl = new Intent(ctx, MainActivity.class);
        tpl.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
        v.setPendingIntentTemplate(R.id.folders_grid, PendingIntent.getActivity(ctx, 701, tpl, flags));
        return v;
    }
}
