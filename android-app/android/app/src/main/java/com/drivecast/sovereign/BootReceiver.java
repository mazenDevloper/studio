package com.drivecast.sovereign;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** After a restart (or an app update): the island service comes back by itself. */
public class BootReceiver extends BroadcastReceiver {
    /** IslandService.restartSoon(): the app was swiped away and the phone stopped the islands with it */
    static final String RESTART = "com.drivecast.sovereign.RESTART_ISLANDS";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String a = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a) || "android.intent.action.QUICKBOOT_POWERON".equals(a) || RESTART.equals(a)) {
            IslandService.start(ctx);
        }
    }
}
