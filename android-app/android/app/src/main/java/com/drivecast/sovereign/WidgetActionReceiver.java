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

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String a = intent.getAction();
        if (a == null) return;
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
        } else if (MOON_NEXT.equals(a)) {
            // the moon widget: Hijri -> Gregorian -> weather, like the site's moon card
            android.content.SharedPreferences p = NativeIslandPlugin.prefs(ctx);
            p.edit().putInt("moonMode", (p.getInt("moonMode", 0) + 1) % 3).apply();
            Widgets.updateAll(ctx);
        } else if (MANU_NEXT.equals(a)) {
            android.content.SharedPreferences p = NativeIslandPlugin.prefs(ctx);
            p.edit().putInt("manuIdx", p.getInt("manuIdx", 0) + 1).apply();
            Widgets.updateAll(ctx);
        } else if (a.startsWith("com.drivecast.QURAN_")) {
            Intent s = new Intent(ctx, IslandService.class);
            s.setAction(a);
            ContextCompat.startForegroundService(ctx, s);
        }
    }
}
