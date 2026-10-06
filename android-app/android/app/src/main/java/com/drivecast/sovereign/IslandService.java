package com.drivecast.sovereign;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Keeps the app alive in the background (foreground service: audio and live data keep running) and draws the
 * floating island above other apps while the app isn't on screen: favourite teams' / pinned live matches
 * (fetched here every 30 s, the page may be throttled in the background) and the prayer countdowns near their
 * end (iqamah under 10 minutes, the others under 5), counted down here every second.
 */
public class IslandService extends Service {

    private static final String CHANNEL = "drivecast_island";
    private static final int NOTIFICATION_ID = 4101;
    private static final long POLL_MS = 30_000;

    private static IslandService instance;
    private static volatile boolean appVisible = true;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WindowManager windowManager;
    private LinearLayout island;
    private WindowManager.LayoutParams params;

    private JSONObject config = new JSONObject();
    private final List<String> matchLines = new ArrayList<>();
    private long lastPoll = 0;
    private long lastWidgets = 0;
    private String lastNotificationText = "";

    // ---- static entry points (from MainActivity / the plugin) ----

    static void start(Context ctx) {
        Intent intent = new Intent(ctx, IslandService.class);
        try {
            ContextCompat.startForegroundService(ctx, intent);
        } catch (Exception ignored) {
            // not allowed right now (e.g. started from the background): the next app start retries
        }
    }

    static void setAppVisible(boolean visible) {
        appVisible = visible;
        IslandService s = instance;
        if (s != null) s.handler.post(() -> {
            if (!visible) s.lastPoll = 0; // fresh scores as soon as the app goes behind
            s.tick();
        });
    }

    /** The accessibility service connected / disconnected: redraw the island in the right window host. */
    static void hostChanged() {
        IslandService s = instance;
        if (s != null) s.handler.post(() -> { s.removeIsland(); s.tick(); });
    }

    static void reloadConfig() {
        IslandService s = instance;
        if (s != null) s.handler.post(() -> {
            s.loadConfig();
            s.lastPoll = 0;
            s.tick();
        });
    }

    // ---- service ----

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createChannel();
        Notification n = buildNotification("يعمل في الخلفية");
        if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK | ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(NOTIFICATION_ID, n);
        loadConfig();
        handler.post(loop);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String a = intent != null ? intent.getAction() : null;
        if (a != null && a.startsWith("com.drivecast.QURAN_")) quranAction(a);
        return START_STICKY;
    }

    // ---- the Quran widget's player (plays here, app open or not) ----

    private android.media.MediaPlayer quranPlayer;
    /** "reciterId:surah" loaded in quranPlayer */
    private String quranLoaded = "";

    private void quranAction(String a) {
        QuranState q = QuranState.load(this);
        switch (a) {
            case WidgetActionReceiver.QURAN_TOGGLE:
                if (q.playing) pauseQuran(q); else playQuran(q);
                break;
            case WidgetActionReceiver.QURAN_NEXT:
                q.surah = q.surah >= 114 ? 1 : q.surah + 1;
                if (q.playing) playQuran(q); else { q.save(this); Widgets.updateAll(this); }
                break;
            case WidgetActionReceiver.QURAN_PREV:
                q.surah = q.surah <= 1 ? 114 : q.surah - 1;
                if (q.playing) playQuran(q); else { q.save(this); Widgets.updateAll(this); }
                break;
            case WidgetActionReceiver.QURAN_RECITER:
                q.reciterIndex = (q.reciterIndex + 1) % Math.max(1, QuranState.reciters(this).length());
                if (q.playing) playQuran(q); else { q.save(this); Widgets.updateAll(this); }
                break;
        }
    }

    private void pauseQuran(QuranState q) {
        if (quranPlayer != null && quranPlayer.isPlaying()) quranPlayer.pause();
        q.playing = false;
        q.save(this);
        Widgets.updateAll(this);
        lastNotificationText = "";
    }

    private void playQuran(QuranState q) {
        q.playing = true;
        q.save(this);
        Widgets.updateAll(this);
        lastNotificationText = "";
        final String key = q.reciterId(this) + ":" + q.surah;
        if (key.equals(quranLoaded) && quranPlayer != null) {
            quranPlayer.start();
            return;
        }
        final String origin = siteOrigin();
        final int reciter = q.reciterId(this), surah = q.surah;
        new Thread(() -> {
            String url = null;
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(origin + "/api/quran?path=chapter_recitations/" + reciter + "/" + surah).openConnection();
                c.setConnectTimeout(15_000);
                c.setReadTimeout(30_000);
                StringBuilder sb = new StringBuilder();
                try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
                    String line;
                    while ((line = r.readLine()) != null) sb.append(line);
                }
                JSONObject f = new JSONObject(sb.toString()).optJSONObject("audio_file");
                url = f != null ? f.optString("audio_url", null) : null;
            } catch (Exception ignored) {
            }
            final String audio = url;
            handler.post(() -> {
                if (audio == null) { pauseQuran(QuranState.load(this)); return; }
                try {
                    if (quranPlayer != null) quranPlayer.release();
                    quranPlayer = new android.media.MediaPlayer();
                    quranPlayer.setAudioAttributes(new android.media.AudioAttributes.Builder()
                            .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
                            .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH).build());
                    quranPlayer.setDataSource(audio);
                    quranPlayer.setOnPreparedListener(android.media.MediaPlayer::start);
                    // the surah ended: on to the next one
                    quranPlayer.setOnCompletionListener(mp -> {
                        QuranState n = QuranState.load(this);
                        n.surah = n.surah >= 114 ? 1 : n.surah + 1;
                        playQuran(n);
                    });
                    quranPlayer.prepareAsync();
                    quranLoaded = key;
                } catch (Exception e) {
                    pauseQuran(QuranState.load(this));
                }
            });
        }).start();
    }

    /** The site's address (for its API), from what the page sent. */
    private String siteOrigin() {
        String o = Widgets.json(this, "widgets").optString("origin", "");
        if (!o.isEmpty()) return o;
        try {
            URL u = new URL(config.optString("apiUrl", ""));
            return u.getProtocol() + "://" + u.getAuthority();
        } catch (Exception e) {
            return "https://cplay2.vercel.app";
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (quranPlayer != null) {
            quranPlayer.release();
            quranPlayer = null;
        }
        removeIsland();
        if (instance == this) instance = null;
        super.onDestroy();
    }

    private final Runnable loop = new Runnable() {
        @Override
        public void run() {
            tick();
            handler.postDelayed(this, 1000);
        }
    };

    private void loadConfig() {
        try {
            config = new JSONObject(NativeIslandPlugin.prefs(this).getString("config", "{}"));
        } catch (Exception e) {
            config = new JSONObject();
        }
    }

    /** Every second: refresh the scores when due, then show / update / hide the island. */
    private void tick() {
        long now = System.currentTimeMillis();
        // scores: every 30 s behind other apps (island), every 2 min while the app is open (widgets only)
        if (now - lastPoll > (appVisible ? 4 * POLL_MS : POLL_MS)) {
            lastPoll = now;
            pollMatches();
        }
        if (now - lastWidgets > 60_000) {
            lastWidgets = now;
            Widgets.updateAll(this);
        }
        List<String> lines = new ArrayList<>(matchLines);
        lines.addAll(countdownLines(now));
        updateNotification(lines);
        boolean show = !appVisible && !lines.isEmpty() && canDraw()
                && NativeIslandPlugin.prefs(this).getBoolean("overlayEnabled", true);
        if (show) showIsland(lines);
        else removeIsland();
    }

    private boolean canDraw() {
        return IslandAccessibilityService.instance != null || Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(this);
    }

    // ---- data ----

    private void pollMatches() {
        final String apiUrl = config.optString("apiUrl", "");
        if (apiUrl.isEmpty()) return;
        final JSONArray pins = config.optJSONArray("pins");
        new Thread(() -> {
            List<String> lines = new ArrayList<>();
            JSONArray widgetLines = new JSONArray();
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(apiUrl).openConnection();
                c.setConnectTimeout(15_000);
                c.setReadTimeout(30_000);
                c.setRequestProperty("Accept", "application/json");
                StringBuilder sb = new StringBuilder();
                try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
                    String line;
                    while ((line = r.readLine()) != null) sb.append(line);
                }
                JSONArray matches = new JSONObject(sb.toString()).optJSONArray("matches");
                for (int i = 0; matches != null && i < matches.length(); i++) {
                    JSONObject m = matches.getJSONObject(i);
                    String st = m.optString("status");
                    String home = m.getJSONObject("home").optString("name");
                    String away = m.getJSONObject("away").optString("name");
                    // the matches widget: favourite / pinned teams' matches of the day, any state
                    if ((m.optBoolean("favorite") || isPinned(pins, home, away)) && widgetLines.length() < 4) {
                        JSONObject sc = m.optJSONObject("score");
                        String score = sc != null && !sc.isNull("home") ? sc.optInt("home") + " - " + sc.optInt("away") : "×";
                        String when = "live".equals(st) ? (m.isNull("elapsed") ? "مباشر" : "د" + m.optInt("elapsed"))
                                : "finished".equals(st) ? "انتهت" : m.optString("omanTime", "");
                        widgetLines.put(when + "   " + home + "  " + score + "  " + away);
                    }
                    if (!"live".equals(st)) continue;
                    if (!m.optBoolean("favorite") && !isPinned(pins, home, away)) continue;
                    JSONObject score = m.optJSONObject("score");
                    String sh = score != null && !score.isNull("home") ? String.valueOf(score.optInt("home")) : "0";
                    String sa = score != null && !score.isNull("away") ? String.valueOf(score.optInt("away")) : "0";
                    String minute = m.isNull("elapsed") ? "مباشر" : "د" + m.optInt("elapsed");
                    lines.add(minute + "   " + home + "  " + sh + " - " + sa + "  " + away);
                }
            } catch (Exception ignored) {
                return; // keep the last scores on a network error
            }
            NativeIslandPlugin.prefs(this).edit().putString("matchLines", widgetLines.toString()).apply();
            handler.post(() -> {
                matchLines.clear();
                matchLines.addAll(lines);
                Widgets.updateAll(this);
                tick();
            });
        }).start();
    }

    private static boolean isPinned(JSONArray pins, String home, String away) {
        if (pins == null) return false;
        for (int i = 0; i < pins.length(); i++) {
            JSONObject p = pins.optJSONObject(i);
            if (p == null) continue;
            if (same(p.optString("home"), home) && same(p.optString("away"), away)) return true;
        }
        return false;
    }

    private static boolean same(String a, String b) {
        String x = a.toLowerCase(Locale.ROOT).trim(), y = b.toLowerCase(Locale.ROOT).trim();
        return !x.isEmpty() && !y.isEmpty() && (x.contains(y) || y.contains(x));
    }

    /** Countdowns about to end: iqamah under 10 minutes, adhan and the others under 5. */
    private List<String> countdownLines(long now) {
        List<String> out = new ArrayList<>();
        JSONArray list = config.optJSONArray("countdowns");
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject c = list.optJSONObject(i);
            if (c == null) continue;
            long left = c.optLong("at") - now;
            long window = "iqamah".equals(c.optString("kind")) ? 10 * 60_000L : 5 * 60_000L;
            if (left <= 0 || left > window) continue;
            long secs = left / 1000;
            out.add(String.format(Locale.ROOT, "%s   %02d:%02d", c.optString("title"), secs / 60, secs % 60));
        }
        return out;
    }

    // ---- the floating island ----

    /** true = all lines shown (tap the pill); false = the compact pill with the first line */
    private boolean expanded = false;
    /** which window host the island is in: accessibility service (over the status bar / lock screen) or app overlay */
    private boolean islandOnAccessibility = false;

    /**
     * Dynamic-island style: a black pill at the top centre, over the status bar (around the camera). Compact = the
     * most important line; tap = expand to every line; long press = open the app; drag = move it (remembered).
     * Drawn by the accessibility service when it is on (works over the status bar and the lock screen), otherwise
     * as an app overlay ("display over other apps").
     */
    @SuppressLint("ClickableViewAccessibility")
    private void showIsland(List<String> lines) {
        IslandAccessibilityService acc = IslandAccessibilityService.instance;
        boolean useAcc = acc != null;
        if (island != null && useAcc != islandOnAccessibility) removeIsland();
        if (island == null) {
            WindowManager wm = useAcc ? acc.windowManager() : windowManager;
            island = new LinearLayout(this);
            island.setOrientation(LinearLayout.VERTICAL);
            island.setGravity(Gravity.CENTER);
            island.setPadding(dp(22), dp(9), dp(22), dp(9));
            GradientDrawable bg = new GradientDrawable();
            bg.setColor(Color.BLACK);
            bg.setCornerRadius(dp(26));
            island.setBackground(bg);
            island.setElevation(dp(10));
            island.setMinimumHeight(dp(36));

            int type = useAcc ? WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                    : Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
            params = new WindowManager.LayoutParams(WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, type,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                            | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED,
                    PixelFormat.TRANSLUCENT);
            if (Build.VERSION.SDK_INT >= 28) params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
            // default: on the status bar, around the front camera
            params.y = NativeIslandPlugin.prefs(this).getInt("islandY2", dp(6));
            params.x = NativeIslandPlugin.prefs(this).getInt("islandX2", 0);

            final WindowManager host = wm;
            island.setOnTouchListener(new View.OnTouchListener() {
                float downX, downY;
                int startX, startY;
                boolean moved, longPressed;
                final Runnable longPress = () -> { longPressed = true; openApp(); };

                @Override
                public boolean onTouch(View v, MotionEvent e) {
                    switch (e.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            downX = e.getRawX();
                            downY = e.getRawY();
                            startX = params.x;
                            startY = params.y;
                            moved = false;
                            longPressed = false;
                            handler.postDelayed(longPress, 550);
                            return true;
                        case MotionEvent.ACTION_MOVE:
                            float dx = e.getRawX() - downX, dy = e.getRawY() - downY;
                            if (Math.abs(dx) > dp(8) || Math.abs(dy) > dp(8)) { moved = true; handler.removeCallbacks(longPress); }
                            if (moved) {
                                params.x = startX + (int) dx;
                                params.y = Math.max(0, startY + (int) dy);
                                if (island != null) try { host.updateViewLayout(island, params); } catch (Exception ignored) { }
                            }
                            return true;
                        case MotionEvent.ACTION_UP:
                        case MotionEvent.ACTION_CANCEL:
                            handler.removeCallbacks(longPress);
                            if (moved) {
                                NativeIslandPlugin.prefs(IslandService.this).edit().putInt("islandX2", params.x).putInt("islandY2", params.y).apply();
                            } else if (!longPressed && e.getAction() == MotionEvent.ACTION_UP) {
                                expanded = !expanded; // tap: expand / collapse like a dynamic island
                                tick();
                            }
                            return true;
                    }
                    return false;
                }
            });
            try {
                wm.addView(island, params);
                islandOnAccessibility = useAcc;
            } catch (Exception e) {
                island = null;
                return;
            }
        }
        // compact: the first line only; expanded: every line, the first bigger
        List<String> shown = expanded ? lines : lines.subList(0, Math.min(1, lines.size()));
        while (island.getChildCount() > shown.size()) island.removeViewAt(island.getChildCount() - 1);
        for (int i = 0; i < shown.size(); i++) {
            TextView t;
            if (i < island.getChildCount()) {
                t = (TextView) island.getChildAt(i);
            } else {
                t = new TextView(this);
                t.setTextColor(Color.WHITE);
                t.setTypeface(Typeface.DEFAULT_BOLD);
                t.setGravity(Gravity.CENTER);
                t.setSingleLine(true);
                island.addView(t);
            }
            t.setTextSize(TypedValue.COMPLEX_UNIT_SP, i == 0 ? (expanded ? 16 : 14) : 13);
            t.setTextColor(i == 0 ? Color.WHITE : Color.argb(210, 255, 255, 255));
            // more than one item while compact: a small "+n" hint
            String text = shown.get(i);
            if (!expanded && i == 0 && lines.size() > 1) text = text + "   +" + (lines.size() - 1);
            t.setText(text);
        }
    }

    private void removeIsland() {
        if (island != null) {
            try {
                IslandAccessibilityService acc = IslandAccessibilityService.instance;
                (islandOnAccessibility && acc != null ? acc.windowManager() : windowManager).removeView(island);
            } catch (Exception ignored) {
            }
            island = null;
        }
    }

    private void openApp() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        startActivity(intent);
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    // ---- notification (also shows the live score / countdown in the shade and on the lock screen) ----

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "الجزيرة العائمة", NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification(String text) {
        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(R.mipmap.ic_launcher_foreground)
                .setContentTitle("DriveCast")
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
                .setContentIntent(pi)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void updateNotification(List<String> lines) {
        // countdown seconds would update it every second: the shade shows minutes only
        StringBuilder sb = new StringBuilder();
        for (String l : lines) sb.append(sb.length() > 0 ? "\n" : "").append(l.replaceAll(":\\d\\d$", " د"));
        QuranState q = QuranState.load(this);
        if (q.playing) sb.insert(0, "📖 سورة " + q.surahName(this) + " · " + q.reciterName(this) + (sb.length() > 0 ? "\n" : ""));
        String text = sb.length() > 0 ? sb.toString() : "يعمل في الخلفية";
        if (text.equals(lastNotificationText)) return;
        lastNotificationText = text;
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification(text));
    }
}
