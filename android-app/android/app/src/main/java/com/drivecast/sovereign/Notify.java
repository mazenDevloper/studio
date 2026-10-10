package com.drivecast.sovereign;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.RemoteInput;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The link with the phone's other apps, through their notifications (the user grants "notification access" once):
 * - Google Maps navigating: its time to arrival (with the traffic) feeds the trip island, its next turn is shown on it.
 * - WhatsApp / Telegram / SMS: a new message becomes an island - read aloud, answered by voice (the notification's own
 *   reply action, so nothing is sent from outside the app), or opened.
 */
public class Notify extends NotificationListenerService {

    static final String MAPS = "com.google.android.apps.maps";
    static final String[] CHAT = {"com.whatsapp", "com.whatsapp.w4b", "org.telegram.messenger", "org.thunderdog.challegram",
            "com.google.android.apps.messaging", "com.samsung.android.messaging", "com.android.mms", "com.facebook.orca", "com.instagram.android"};

    /** one received message */
    static final class Msg {
        String key, pkg, app, from, text;
        long at;
        PendingIntent open;
        Notification.Action reply;
    }

    private static final List<Msg> messages = new ArrayList<>();
    private static volatile boolean connected = false;

    // ---- permission ----

    static boolean allowed(Context ctx) {
        String flat = Settings.Secure.getString(ctx.getContentResolver(), "enabled_notification_listeners");
        return flat != null && flat.contains(new ComponentName(ctx, Notify.class).flattenToString());
    }

    static void askAccess(Context ctx) {
        Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { ctx.startActivity(i); } catch (Exception ignored) { }
    }

    @Override
    public void onListenerConnected() {
        connected = true;
        try {
            for (StatusBarNotification s : getActiveNotifications()) if (MAPS.equals(s.getPackageName())) MapsNav.from(s.getNotification());
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onListenerDisconnected() {
        connected = false;
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            String pkg = sbn.getPackageName();
            Notification n = sbn.getNotification();
            if (MAPS.equals(pkg)) {
                if (MapsNav.from(n)) IslandService.redraw();
                return;
            }
            if (!isChat(pkg) || (n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
            if (!Hub.bool(this, "msgIslands", true)) return;
            Bundle e = n.extras;
            CharSequence title = e.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence text = e.getCharSequence(Notification.EXTRA_TEXT);
            CharSequence[] lines = e.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
            if (lines != null && lines.length > 0) text = lines[lines.length - 1];
            if (title == null || text == null) return;
            String t = text.toString();
            // "x new messages", "checking for messages", ...: not a message
            if (t.matches(".*\\d+\\s+(new messages|رسائل جديدة|رسالة جديدة).*") || n.category != null && !Notification.CATEGORY_MESSAGE.equals(n.category) && !pkg.contains("messaging") && !pkg.contains("mms")) return;
            Msg m = new Msg();
            m.key = sbn.getKey();
            m.pkg = pkg;
            m.app = appName(pkg);
            m.from = title.toString().replaceAll("\\s*\\(\\d+ (messages|رسائل)\\)$", "");
            m.text = t;
            m.at = System.currentTimeMillis();
            m.open = n.contentIntent;
            if (n.actions != null) for (Notification.Action a : n.actions) {
                if (a.getRemoteInputs() != null && a.getRemoteInputs().length > 0) { m.reply = a; break; }
            }
            synchronized (messages) {
                for (int i = messages.size() - 1; i >= 0; i--) if (messages.get(i).from.equals(m.from) && messages.get(i).pkg.equals(pkg)) messages.remove(i);
                messages.add(0, m);
                while (messages.size() > 6) messages.remove(messages.size() - 1);
            }
            if (Hub.bool(this, "msgRead", false) || (Hub.bool(this, "msgReadDriving", true) && Trip.current(this) != null)) {
                IslandService.speak("رسالة من " + m.from + ": " + m.text);
            }
            IslandService.redraw();
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        if (MAPS.equals(sbn.getPackageName())) { MapsNav.clear(); IslandService.redraw(); return; }
        synchronized (messages) {
            for (int i = messages.size() - 1; i >= 0; i--) if (messages.get(i).key.equals(sbn.getKey())) messages.remove(i);
        }
        IslandService.redraw();
    }

    static boolean isChat(String pkg) {
        for (String c : CHAT) if (c.equals(pkg)) return true;
        return false;
    }

    static String appName(String pkg) {
        if (pkg.startsWith("com.whatsapp")) return "واتساب";
        if (pkg.contains("telegram") || pkg.contains("challegram")) return "تيليجرام";
        if (pkg.contains("orca")) return "ماسنجر";
        if (pkg.contains("instagram")) return "إنستغرام";
        return "رسالة";
    }

    /** the messages of the last 20 minutes, newest first */
    static List<Msg> recent() {
        long now = System.currentTimeMillis();
        List<Msg> out = new ArrayList<>();
        synchronized (messages) {
            for (Msg m : messages) if (now - m.at < 20 * 60_000L) out.add(m);
        }
        return out;
    }

    static Msg find(String key) {
        synchronized (messages) {
            for (Msg m : messages) if (m.key.equals(key)) return m;
        }
        return null;
    }

    static Msg latest() {
        List<Msg> r = recent();
        return r.isEmpty() ? null : r.get(0);
    }

    static void dismiss(String key) {
        synchronized (messages) {
            for (int i = messages.size() - 1; i >= 0; i--) if (messages.get(i).key.equals(key)) messages.remove(i);
        }
        IslandService.redraw();
    }

    /** answer through the notification's own reply action (WhatsApp, Telegram, Messages...) */
    static boolean reply(Context ctx, Msg m, String text) {
        if (m == null || m.reply == null) return false;
        try {
            Intent in = new Intent();
            Bundle b = new Bundle();
            for (RemoteInput ri : m.reply.getRemoteInputs()) b.putCharSequence(ri.getResultKey(), text);
            RemoteInput.addResultsToIntent(m.reply.getRemoteInputs(), in, b);
            m.reply.actionIntent.send(ctx, 0, in);
            dismiss(m.key);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    static void open(Context ctx, Msg m) {
        try {
            if (m.open != null) { m.open.send(); return; }
        } catch (Exception ignored) {
        }
        Intent i = ctx.getPackageManager().getLaunchIntentForPackage(m.pkg);
        if (i != null) { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); ctx.startActivity(i); }
    }

    // ---- sharing / launching other apps ----

    /** "سأصل الساعة 5:40 إن شاء الله" by WhatsApp (or any app the user picks) */
    static void shareEta(Context ctx) {
        org.json.JSONObject t = Trip.current(ctx);
        String text;
        if (t == null) text = "موقعي الآن";
        else {
            org.json.JSONObject pr = Trip.progress(t, IslandService.location());
            long eta = pr.optLong("etaSec", t.optLong("seconds"));
            text = "في الطريق إلى " + Trip.placeName(t.optString("name")) + "، أصل تقريباً الساعة " + Trip.clock(System.currentTimeMillis() + eta * 1000L)
                    + " (بعد " + Trip.duration(eta) + ") إن شاء الله";
        }
        android.location.Location l = IslandService.location();
        if (l != null) text += "\nhttps://maps.google.com/?q=" + l.getLatitude() + "," + l.getLongitude();
        Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text);
        Intent wa = new Intent(send).setPackage("com.whatsapp").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            ctx.startActivity(wa);
        } catch (Exception e) {
            Intent ch = Intent.createChooser(send, "شارك وقت الوصول").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { ctx.startActivity(ch); } catch (Exception ignored) { }
        }
    }

    /** Google Maps' turn-by-turn to the trip's destination (or a point) */
    static void navigate(Context ctx, double la, double lo) {
        Intent nav = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("google.navigation:q=" + la + "," + lo)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        nav.setPackage(MAPS);
        try {
            ctx.startActivity(nav);
        } catch (Exception e) {
            Intent geo = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("geo:" + la + "," + lo + "?q=" + la + "," + lo)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { ctx.startActivity(geo); } catch (Exception ignored) { }
        }
    }

    static boolean navigateTrip(Context ctx) {
        org.json.JSONObject t = Trip.current(ctx);
        if (t == null || !t.has("toLat")) return false;
        navigate(ctx, t.optDouble("toLat"), t.optDouble("toLon"));
        return true;
    }

    /** a WhatsApp chat with a number ("+968...") */
    static void whatsapp(Context ctx, String phone, String text) {
        String p = phone.replaceAll("[^0-9]", "");
        Intent i = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://wa.me/" + p + (text == null ? "" : "?text=" + android.net.Uri.encode(text)))).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { ctx.startActivity(i); } catch (Exception ignored) { }
    }

    // ---- digits ----

    static String western(String s) {
        StringBuilder b = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            if (c >= '٠' && c <= '٩') b.append((char) ('0' + (c - '٠')));
            else if (c >= '۰' && c <= '۹') b.append((char) ('0' + (c - '۰')));
            else b.append(c);
        }
        return b.toString();
    }

    static final Pattern HOURS = Pattern.compile("(\\d+)\\s*(hr|h|hours?|ساعة|ساعات|س)(?!\\p{L})", Pattern.CASE_INSENSITIVE);
    static final Pattern MINS = Pattern.compile("(\\d+)\\s*(min|mins|minutes?|دقيقة|دقائق|د)(?!\\p{L})", Pattern.CASE_INSENSITIVE);

    /** seconds in "1 hr 20 min" / "١ س ٢٠ د" (-1: none) */
    static long seconds(String s) {
        if (s == null) return -1;
        s = western(s);
        Matcher h = HOURS.matcher(s), m = MINS.matcher(s);
        long sec = -1;
        if (h.find()) sec = Long.parseLong(h.group(1)) * 3600;
        if (m.find()) sec = Math.max(0, sec) + Long.parseLong(m.group(1)) * 60;
        return sec;
    }
}
