package com.drivecast.sovereign;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * One shared state for the widgets, the islands, the native player and the page (the site inside the app): whoever
 * changes something (a dhikr counted on a widget, the islands hidden from the bubble, a video saved in the player)
 * writes it here, and everyone else is told — the widgets redraw, the islands update, the page gets a "hub" command
 * (and the page writes back through the plugin's hubSet). Values the site keeps in the cloud also reach it this way, so
 * the site syncs them to the other devices.
 */
final class Hub {

    private Hub() {
    }

    private static final Object lock = new Object();

    static JSONObject state(Context ctx) {
        return Widgets.json(ctx, "hub");
    }

    static Object get(Context ctx, String key) {
        return state(ctx).opt(key);
    }

    static boolean bool(Context ctx, String key, boolean def) {
        Object v = get(ctx, key);
        return v instanceof Boolean ? (Boolean) v : def;
    }

    /** Change a value and tell everyone (the page too unless it made the change). */
    static void set(Context ctx, String key, Object value) {
        set(ctx, key, value, true);
    }

    static void set(Context ctx, String key, Object value, boolean tellPage) {
        set(ctx, key, value, tellPage, true);
    }

    /** redrawWidgets false: the caller refreshes its own widget (a list that must keep its scroll position) */
    static void set(Context ctx, String key, Object value, boolean tellPage, boolean redrawWidgets) {
        synchronized (lock) {
            JSONObject s = state(ctx);
            try {
                if (value == null) s.remove(key); else s.put(key, value);
            } catch (Exception ignored) {
            }
            NativeIslandPlugin.prefs(ctx).edit().putString("hub", s.toString()).apply();
        }
        if (tellPage && NativeIslandPlugin.isPageAlive()) {
            try {
                NativeIslandPlugin.emitCommand("hub", new JSONObject().put("key", key).put("value", value == null ? JSONObject.NULL : value).toString());
            } catch (Exception ignored) {
            }
        }
        IslandService.redraw();
        if (redrawWidgets) Widgets.updateAll(ctx);
    }

    /** Ids kept as a set (favourite channels, ...). */
    static boolean has(Context ctx, String key, String id) {
        JSONArray a = state(ctx).optJSONArray(key);
        for (int i = 0; a != null && i < a.length(); i++) if (id.equals(a.optString(i))) return true;
        return false;
    }

    static void toggle(Context ctx, String key, String id) {
        JSONArray a = state(ctx).optJSONArray(key), out = new JSONArray();
        boolean was = false;
        for (int i = 0; a != null && i < a.length(); i++) {
            if (id.equals(a.optString(i))) was = true; else out.put(a.optString(i));
        }
        if (!was) out.put(id);
        set(ctx, key, out);
    }

    /** An action for the page (save a video, a reminder done...): now, or when the app next opens. */
    static void send(Context ctx, String cmd, String arg) {
        if (NativeIslandPlugin.isPageAlive()) NativeIslandPlugin.emitCommand(cmd, arg);
        else NativeIslandPlugin.queueCommand(cmd, arg);
    }
}
