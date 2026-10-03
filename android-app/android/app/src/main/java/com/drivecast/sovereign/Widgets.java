package com.drivecast.sovereign;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Home-screen widgets (standard Android AppWidgets: Samsung One UI, Nova and any launcher):
 * prayer (next prayer, live countdown, the day's times), matches (favourite teams), media (now playing +
 * controls for the app's player), Quran (surah / reciter, played by the app in the background), screens (a
 * button per screen of the app).
 */
public final class Widgets {

    private Widgets() {
    }

    // ---- providers (declared in the manifest) ----

    public static class PrayerWidget extends AppWidgetProvider {
        @Override
        public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) { updateAll(ctx); }
    }

    public static class MatchesWidget extends AppWidgetProvider {
        @Override
        public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) { updateAll(ctx); }
    }

    public static class MediaWidget extends AppWidgetProvider {
        @Override
        public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) { updateAll(ctx); }
    }

    public static class QuranWidget extends AppWidgetProvider {
        @Override
        public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) { updateAll(ctx); }
    }

    public static class ScreensWidget extends AppWidgetProvider {
        @Override
        public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) { updateAll(ctx); }
    }

    // ---- shared ----

    static JSONObject json(Context ctx, String key) {
        try {
            return new JSONObject(NativeIslandPlugin.prefs(ctx).getString(key, "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    /** Open the app on a screen ("/matches"), optionally with a command for the page. */
    static PendingIntent openApp(Context ctx, String route, int requestCode) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (route != null) i.putExtra("route", route);
        return PendingIntent.getActivity(ctx, requestCode, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** A widget button: handled by WidgetActionReceiver (media commands for the page, the Quran player). */
    static PendingIntent action(Context ctx, String action, int requestCode) {
        Intent i = new Intent(ctx, WidgetActionReceiver.class);
        i.setAction(action);
        return PendingIntent.getBroadcast(ctx, requestCode, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Redraw every placed widget (cheap: called on data changes and every minute by the service). */
    static void updateAll(Context ctx) {
        AppWidgetManager m = AppWidgetManager.getInstance(ctx);
        update(ctx, m, PrayerWidget.class, prayer(ctx));
        update(ctx, m, MatchesWidget.class, matches(ctx));
        update(ctx, m, MediaWidget.class, media(ctx));
        update(ctx, m, QuranWidget.class, quran(ctx));
        update(ctx, m, ScreensWidget.class, screens(ctx));
    }

    private static void update(Context ctx, AppWidgetManager m, Class<?> provider, RemoteViews views) {
        try {
            int[] ids = m.getAppWidgetIds(new ComponentName(ctx, provider));
            if (ids != null && ids.length > 0) m.updateAppWidget(ids, views);
        } catch (Exception ignored) {
        }
    }

    // ---- prayer ----

    private static RemoteViews prayer(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_prayer);
        v.setOnClickPendingIntent(R.id.widget_root, openApp(ctx, "/dashboard", 101));
        JSONArray list = json(ctx, "config").optJSONArray("countdowns");
        long now = System.currentTimeMillis();
        String nextName = null;
        long nextAt = 0;
        StringBuilder times = new StringBuilder();
        SimpleDateFormat hm = new SimpleDateFormat("h:mm", new Locale("ar"));
        String today = new SimpleDateFormat("yyyyMMdd", Locale.ROOT).format(new Date(now));
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject c = list.optJSONObject(i);
            if (c == null || !"azan".equals(c.optString("kind"))) continue;
            long at = c.optLong("at");
            if (at > now && nextName == null) {
                nextName = c.optString("title");
                nextAt = at;
            }
            if (today.equals(new SimpleDateFormat("yyyyMMdd", Locale.ROOT).format(new Date(at)))) {
                if (times.length() > 0) times.append("   ");
                times.append(c.optString("title")).append(" ").append(hm.format(new Date(at)));
            }
        }
        if (nextName == null) {
            v.setTextViewText(R.id.prayer_name, "افتح التطبيق مرة لتحميل المواقيت");
            v.setViewVisibility(R.id.prayer_countdown, View.GONE);
        } else {
            v.setTextViewText(R.id.prayer_name, nextName + " · " + hm.format(new Date(nextAt)));
            v.setViewVisibility(R.id.prayer_countdown, View.VISIBLE);
            // a live countdown drawn by the launcher itself (no per-second updates needed)
            v.setChronometer(R.id.prayer_countdown, SystemClock.elapsedRealtime() + (nextAt - now), null, true);
            if (Build.VERSION.SDK_INT >= 24) v.setChronometerCountDown(R.id.prayer_countdown, true);
        }
        v.setTextViewText(R.id.prayer_times, times.toString());
        return v;
    }

    // ---- matches ----

    private static RemoteViews matches(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_matches);
        v.setOnClickPendingIntent(R.id.widget_root, openApp(ctx, "/matches", 102));
        JSONArray lines;
        try {
            lines = new JSONArray(NativeIslandPlugin.prefs(ctx).getString("matchLines", "[]"));
        } catch (Exception e) {
            lines = new JSONArray();
        }
        int[] rows = {R.id.match_1, R.id.match_2, R.id.match_3, R.id.match_4};
        for (int i = 0; i < rows.length; i++) {
            String line = lines.optString(i, "");
            v.setTextViewText(rows[i], line);
            v.setViewVisibility(rows[i], line.isEmpty() ? View.GONE : View.VISIBLE);
        }
        v.setViewVisibility(R.id.match_empty, lines.length() == 0 ? View.VISIBLE : View.GONE);
        return v;
    }

    // ---- media (the app's player) ----

    private static RemoteViews media(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_media);
        JSONObject np = json(ctx, "widgets").optJSONObject("nowPlaying");
        String title = np != null ? np.optString("title", "") : "";
        v.setTextViewText(R.id.media_title, title.isEmpty() ? "لا شيء يعمل الآن" : title);
        v.setTextViewText(R.id.media_subtitle, np != null ? np.optString("subtitle", "") : "");
        boolean playing = np != null && np.optBoolean("playing");
        v.setTextViewText(R.id.media_toggle, playing ? "⏸" : "▶");
        v.setOnClickPendingIntent(R.id.media_toggle, action(ctx, WidgetActionReceiver.MEDIA_TOGGLE, 201));
        v.setOnClickPendingIntent(R.id.media_next, action(ctx, WidgetActionReceiver.MEDIA_NEXT, 202));
        v.setOnClickPendingIntent(R.id.media_prev, action(ctx, WidgetActionReceiver.MEDIA_PREV, 203));
        v.setOnClickPendingIntent(R.id.media_info, openApp(ctx, "/media", 204));
        return v;
    }

    // ---- Quran ----

    private static RemoteViews quran(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_quran);
        QuranState q = QuranState.load(ctx);
        v.setTextViewText(R.id.quran_surah, "سورة " + q.surahName(ctx));
        v.setTextViewText(R.id.quran_reciter, q.reciterName(ctx));
        v.setTextViewText(R.id.quran_toggle, q.playing ? "⏸" : "▶");
        v.setOnClickPendingIntent(R.id.quran_toggle, action(ctx, WidgetActionReceiver.QURAN_TOGGLE, 301));
        v.setOnClickPendingIntent(R.id.quran_next, action(ctx, WidgetActionReceiver.QURAN_NEXT, 302));
        v.setOnClickPendingIntent(R.id.quran_prev, action(ctx, WidgetActionReceiver.QURAN_PREV, 303));
        v.setOnClickPendingIntent(R.id.quran_reciter, action(ctx, WidgetActionReceiver.QURAN_RECITER, 304));
        v.setOnClickPendingIntent(R.id.quran_surah, openApp(ctx, "/quran", 305));
        return v;
    }

    // ---- screens ----

    private static RemoteViews screens(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_screens);
        v.setOnClickPendingIntent(R.id.screen_dashboard, openApp(ctx, "/dashboard", 401));
        v.setOnClickPendingIntent(R.id.screen_matches, openApp(ctx, "/matches", 402));
        v.setOnClickPendingIntent(R.id.screen_iptv, openApp(ctx, "/iptv", 403));
        v.setOnClickPendingIntent(R.id.screen_media, openApp(ctx, "/media", 404));
        v.setOnClickPendingIntent(R.id.screen_quran, openApp(ctx, "/quran", 405));
        v.setOnClickPendingIntent(R.id.screen_azkar, openApp(ctx, "/football", 406));
        v.setOnClickPendingIntent(R.id.screen_settings, openApp(ctx, "/settings", 407));
        return v;
    }
}
