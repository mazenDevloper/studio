package com.drivecast.sovereign;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

/**
 * Widget buttons: media commands go to the app's player (the page); Quran commands to the native Quran player; the moon
 * and manuscript widgets switch what they show.
 */
public class WidgetActionReceiver extends BroadcastReceiver {

    static final String MEDIA_TOGGLE = "com.drivecast.MEDIA_TOGGLE";
    static final String MEDIA_NEXT = "com.drivecast.MEDIA_NEXT";
    static final String MEDIA_PREV = "com.drivecast.MEDIA_PREV";
    static final String QURAN_TOGGLE = "com.drivecast.QURAN_TOGGLE";
    static final String QURAN_NEXT = "com.drivecast.QURAN_NEXT";
    static final String QURAN_PREV = "com.drivecast.QURAN_PREV";
    static final String QURAN_RECITER = "com.drivecast.QURAN_RECITER";
    static final String MOON_NEXT = "com.drivecast.MOON_NEXT";
    static final String MANU_NEXT = "com.drivecast.MANU_NEXT";
    static final String MAP_TOGGLE = "com.drivecast.MAP_TOGGLE";
    static final String MATCHES_REFRESH = "com.drivecast.MATCHES_REFRESH";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String a = intent.getAction();
        if (a == null) return;
        if (MediaBrowser.BROWSE.equals(a) || MediaBrowser.BACK.equals(a)) {
            // inside a browsing widget: open a channel / reciter / surah, go back, or play a video
            MediaBrowser.onTap(ctx, intent, goAsync());
            return;
        }
        if (a.startsWith("com.drivecast.MEDIA_")) {
            String cmd = MEDIA_TOGGLE.equals(a) ? "toggle" : MEDIA_NEXT.equals(a) ? "next" : "prev";
            if (NativeIslandPlugin.isPageAlive()) {
                NativeIslandPlugin.emitCommand("media", cmd);
            } else {
                // the app isn't running: open it, the page gets the command once loaded
                Intent open = new Intent(ctx, MainActivity.class);
                open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                open.putExtra("command", "media");
                open.putExtra("arg", cmd);
                ctx.startActivity(open);
            }
        } else if (MATCHES_REFRESH.equals(a)) {
            // the matches widget's ⟳: the scores now, whatever the schedule says
            final Context app = ctx.getApplicationContext();
            NativeIslandPlugin.prefs(app).edit().putLong("matchesRefreshAt", System.currentTimeMillis()).apply();
            Widgets.updateAll(app);
            final PendingResult pr = goAsync();
            new Thread(() -> {
                Cloud.fetchMatches(app);
                NativeIslandPlugin.prefs(app).edit().putLong("matchesRefreshAt", 0).apply();
                Widgets.updateAll(app);
                IslandService.redraw();
                pr.finish();
            }).start();
        } else if (MOON_NEXT.equals(a)) {
            // the moon widget: Hijri -> Gregorian -> weather, like the site's moon card
            android.content.SharedPreferences p = NativeIslandPlugin.prefs(ctx);
            p.edit().putInt("moonMode", (p.getInt("moonMode", 0) + 1) % 3).apply();
            Widgets.updateAll(ctx);
        } else if (MAP_TOGGLE.equals(a)) {
            // the radar map: a floating window drawn by the service
            Intent s = new Intent(ctx, IslandService.class);
            s.setAction(a);
            ContextCompat.startForegroundService(ctx, s);
        } else if (MANU_NEXT.equals(a)) {
            android.content.SharedPreferences p = NativeIslandPlugin.prefs(ctx);
            String k = "manuIdx_" + intent.getIntExtra("wid", 0);
            p.edit().putInt(k, p.getInt(k, 0) + 1).apply();
            Widgets.updateAll(ctx);
        } else if (a.startsWith("com.drivecast.QURAN_")) {
            Intent s = new Intent(ctx, IslandService.class);
            s.setAction(a);
            ContextCompat.startForegroundService(ctx, s);
        }
    }
}
