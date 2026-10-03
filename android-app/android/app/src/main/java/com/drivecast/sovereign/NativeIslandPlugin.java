package com.drivecast.sovereign;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * window.Capacitor.Plugins.NativeIsland: the site tells the native floating island what to show (the matches
 * API address with the favourite teams, pinned matches, upcoming adhan / iqamah times) and asks for the
 * permissions: display over other apps, run unrestricted in the background, notifications.
 */
@CapacitorPlugin(name = "NativeIsland")
public class NativeIslandPlugin extends Plugin {

    static final String PREFS = "native_island";

    @PluginMethod
    public void configure(PluginCall call) {
        String json = call.getString("config", "{}");
        prefs(getContext()).edit().putString("config", json).apply();
        IslandService.reloadConfig();
        call.resolve();
    }

    @PluginMethod
    public void setOverlayEnabled(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", true));
        prefs(getContext()).edit().putBoolean("overlayEnabled", enabled).apply();
        IslandService.reloadConfig();
        call.resolve();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        Context ctx = getContext();
        JSObject ret = new JSObject();
        ret.put("overlay", Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(ctx));
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        ret.put("background", Build.VERSION.SDK_INT < 23 || (pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName())));
        ret.put("notifications", NotificationManagerCompat.from(ctx).areNotificationsEnabled());
        ret.put("overlayEnabled", prefs(ctx).getBoolean("overlayEnabled", true));
        ret.put("version", BuildConfig.VERSION_NAME);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlay(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(getContext())) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void requestBackground(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 23) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(intent);
            } catch (Exception e) {
                Intent list = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                list.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(list);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getActivity() != null
                && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7001);
        } else if (!NotificationManagerCompat.from(getContext()).areNotificationsEnabled()) {
            Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
