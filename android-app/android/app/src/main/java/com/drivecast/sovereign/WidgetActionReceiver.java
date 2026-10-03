package com.drivecast.sovereign;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

/** Widget buttons: media commands go to the app's player (the page); Quran commands to the native Quran player. */
public class WidgetActionReceiver extends BroadcastReceiver {

    static final String MEDIA_TOGGLE = "com.drivecast.MEDIA_TOGGLE";
    static final String MEDIA_NEXT = "com.drivecast.MEDIA_NEXT";
    static final String MEDIA_PREV = "com.drivecast.MEDIA_PREV";
    static final String QURAN_TOGGLE = "com.drivecast.QURAN_TOGGLE";
    static final String QURAN_NEXT = "com.drivecast.QURAN_NEXT";
    static final String QURAN_PREV = "com.drivecast.QURAN_PREV";
    static final String QURAN_RECITER = "com.drivecast.QURAN_RECITER";

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
        } else if (a.startsWith("com.drivecast.QURAN_")) {
            Intent s = new Intent(ctx, IslandService.class);
            s.setAction(a);
            ContextCompat.startForegroundService(ctx, s);
        }
    }
}
