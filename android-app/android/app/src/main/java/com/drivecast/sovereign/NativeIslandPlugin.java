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

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * window.Capacitor.Plugins.NativeIsland: the site tells the native floating island what to show (the matches
 * API address with the favourite teams, pinned matches, upcoming adhan / iqamah times) and asks for the
 * permissions: display over other apps, run unrestricted in the background, notifications.
 */
@CapacitorPlugin(name = "NativeIsland")
public class NativeIslandPlugin extends Plugin {

    static final String PREFS = "native_island";
    private static NativeIslandPlugin instance;
    /** commands that arrived before the page listened (a widget started the app) */
    private static final java.util.List<JSObject> pending = new java.util.ArrayList<>();

    @Override
    public void load() {
        instance = this;
    }

    /**
     * Widget / notification / picture-in-picture event for the page: "media" (toggle, next, prev), "pip" (1 / 0).
     * Kept until the page's listener takes it.
     */
    static void emitCommand(String cmd, String arg) {
        JSObject data = new JSObject();
        data.put("cmd", cmd);
        data.put("arg", arg == null ? "" : arg);
        NativeIslandPlugin p = instance;
        if (p != null && p.hasListeners("command")) p.notifyListeners("command", data);
        else synchronized (pending) { pending.add(data); }
    }

    /** Keep a command for the next page that loads (a widget opened a screen: the current page is about to go). */
    static void queueCommand(String cmd, String arg) {
        JSObject data = new JSObject();
        data.put("cmd", cmd);
        data.put("arg", arg == null ? "" : arg);
        synchronized (pending) { pending.add(data); }
    }

    /** The page is running and listening (a media command can be delivered right away). */
    static boolean isPageAlive() {
        NativeIslandPlugin p = instance;
        return p != null && p.hasListeners("command");
    }

    /** The page's listener is ready: hand over what came before. */
    @PluginMethod
    public void takePendingCommands(PluginCall call) {
        com.getcapacitor.JSArray list = new com.getcapacitor.JSArray();
        synchronized (pending) {
            for (JSObject o : pending) list.put(o);
            pending.clear();
        }
        JSObject ret = new JSObject();
        ret.put("commands", list);
        call.resolve(ret);
    }

    /**
     * What the home-screen widgets show (now playing, Quran surahs / reciters, the site's address, manuscripts and the
     * board's ink, folders, most viewed videos). Each call sends some of these keys: they are merged into what the
     * page sent before. Manuscript pictures arriving as data: URLs are saved as files here, so the stored settings
     * stay small and the widget reads the picture from disk.
     */
    @PluginMethod
    public void updateWidgets(PluginCall call) {
        Context ctx = getContext();
        JSONObject merged;
        try {
            merged = new JSONObject(prefs(ctx).getString("widgets", "{}"));
        } catch (Exception e) {
            merged = new JSONObject();
        }
        try {
            JSONObject in = new JSONObject(call.getString("data", "{}"));
            JSONArray ms = in.optJSONArray("manuscripts");
            if (ms != null) {
                java.io.File dir = new java.io.File(ctx.getFilesDir(), "manuscripts");
                //noinspection ResultOfMethodCallIgnored
                dir.mkdirs();
                for (int i = 0; i < ms.length(); i++) {
                    JSONObject m = ms.optJSONObject(i);
                    String src = m != null ? m.optString("src", "") : "";
                    if (!src.startsWith("data:")) continue;
                    java.io.File f = new java.io.File(dir, Images.sha1(src) + ".png");
                    if (!f.exists()) {
                        int comma = src.indexOf(',');
                        byte[] bytes = android.util.Base64.decode(src.substring(comma + 1), android.util.Base64.DEFAULT);
                        try (java.io.FileOutputStream o = new java.io.FileOutputStream(f)) {
                            o.write(bytes);
                        }
                    }
                    m.put("src", "file://" + f.getAbsolutePath());
                }
            }
            java.util.Iterator<String> keys = in.keys();
            while (keys.hasNext()) {
                String k = keys.next();
                merged.put(k, in.get(k));
            }
            if (in.has("playlists") || in.has("topVideos")) merged.put("foldersAt", System.currentTimeMillis());
        } catch (Exception ignored) {
        }
        prefs(ctx).edit().putString("widgets", merged.toString()).apply();
        Widgets.updateAll(ctx);
        call.resolve();
    }

    /** A video is playing (leaving the app then goes picture-in-picture). */
    @PluginMethod
    public void setVideoPlaying(PluginCall call) {
        MainActivity.videoPlaying = Boolean.TRUE.equals(call.getBoolean("playing", false));
        call.resolve();
    }

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

    /** The app's font size, in percent of normal (WebView text zoom); kept on this phone. */
    @PluginMethod
    public void setTextZoom(PluginCall call) {
        Integer p = call.getInt("percent", 100);
        int percent = Math.max(70, Math.min(200, p == null ? 100 : p));
        prefs(getContext()).edit().putInt("textZoom", percent).apply();
        getActivity().runOnUiThread(() -> getBridge().getWebView().getSettings().setTextZoom(percent));
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
        ret.put("textZoom", prefs(ctx).getInt("textZoom", 100));
        ret.put("accessibility", IslandAccessibilityService.instance != null);
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

    /** The island over the status bar / lock screen: turn on "DriveCast" in the accessibility settings. */
    @PluginMethod
    public void requestAccessibility(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
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
