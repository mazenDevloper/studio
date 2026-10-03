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
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.PixelFormat;
import android.graphics.RectF;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * Keeps the app alive in the background (foreground service: audio and live data keep running) and draws the
 * floating islands above other apps while the app isn't on screen, like the site: favourite teams' / pinned matches
 * with their logos (fetched here every 30 s, the page may be throttled in the background), the countdown to a
 * kick-off within the hour, the prayer countdowns near their end (iqamah under 10 minutes, the others under 5),
 * counted down here every second - and a goal card plus a notification when one of those teams scores.
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
    private long lastPoll = 0;
    private long lastWidgetsMinute = 0;
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

    /** The real font arrived (or pictures): draw the islands again. */
    static void redraw() {
        IslandService s = instance;
        if (s != null) s.handler.post(() -> { s.islandSignature = ""; s.tick(); });
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

    /** Every second: refresh the scores when due, then show / update / hide the islands. */
    private void tick() {
        long now = System.currentTimeMillis();
        // scores: every 30 s behind other apps (islands, goals), every 2 min while the app is open (widgets only)
        if (now - lastPoll > (appVisible ? 4 * POLL_MS : POLL_MS)) {
            lastPoll = now;
            pollMatches();
        }
        // widgets: on each new minute (their pictures show minutes; the countdown ticks by itself)
        long minute = now / 60_000L;
        if (minute != lastWidgetsMinute) {
            lastWidgetsMinute = minute;
            Widgets.updateAll(this);
        }
        List<IslandArt.Item> items = islandItems(now);
        updateNotification(items, now);
        boolean show = !appVisible && (!items.isEmpty() || celebration != null) && canDraw()
                && NativeIslandPlugin.prefs(this).getBoolean("overlayEnabled", true);
        if (show) showIsland(items, now);
        else removeIsland();
    }

    private boolean canDraw() {
        return IslandAccessibilityService.instance != null || Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(this);
    }

    // ---- data ----

    /** today's favourite / pinned matches (any state), as the API sent them */
    private final List<JSONObject> matches = new ArrayList<>();

    private void pollMatches() {
        final String apiUrl = config.optString("apiUrl", "");
        if (apiUrl.isEmpty()) return;
        final JSONArray pins = config.optJSONArray("pins");
        final String origin = siteOrigin();
        final boolean alert = !appVisible; // inside the app the page plays its own goal animation
        new Thread(() -> {
            List<JSONObject> mine = new ArrayList<>();
            JSONArray widgetData = new JSONArray();
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
                JSONArray list = new JSONObject(sb.toString()).optJSONArray("matches");
                for (int i = 0; list != null && i < list.length(); i++) {
                    JSONObject m = list.getJSONObject(i);
                    JSONObject h = m.optJSONObject("home"), a = m.optJSONObject("away");
                    if (h == null || a == null) continue;
                    boolean pinned = isPinned(pins, h.optString("name"), a.optString("name"));
                    if (!m.optBoolean("favorite") && !pinned) continue;
                    m.put("pinned", pinned);
                    mine.add(m);
                    widgetData.put(m);
                }
            } catch (Exception ignored) {
                return; // keep the last scores on a network error
            }
            List<IslandArt.Item> goals = detectGoals(mine);
            for (IslandArt.Item g : goals) findScorer(origin, g);
            NativeIslandPlugin.prefs(this).edit().putString("matchesData", widgetData.toString()).apply();
            // the logos, so the islands draw them right away
            List<String> logos = new ArrayList<>();
            for (JSONObject m : mine) {
                logos.add(m.optJSONObject("home").optString("logo"));
                logos.add(m.optJSONObject("away").optString("logo"));
            }
            for (IslandArt.Item g : goals) if (g.photo != null) logos.add(g.photo);
            Images.prefetch(this, logos, this::tick);
            handler.post(() -> {
                matches.clear();
                matches.addAll(mine);
                Widgets.updateAll(this);
                if (alert) for (IslandArt.Item g : goals) celebrate(g);
                tick();
            });
            if (alert) for (IslandArt.Item g : goals) notifyGoal(g);
        }).start();
    }

    /**
     * Compares the scores with the last ones seen (kept on the phone, so a restart doesn't replay old goals and a goal
     * scored while the service was asleep still counts): one event per side whose score went up.
     */
    private List<IslandArt.Item> detectGoals(List<JSONObject> mine) {
        List<IslandArt.Item> out = new ArrayList<>();
        JSONObject seen;
        try {
            seen = new JSONObject(NativeIslandPlugin.prefs(this).getString("goalScores", "{}"));
        } catch (Exception e) {
            seen = new JSONObject();
        }
        JSONObject next = new JSONObject();
        for (JSONObject m : mine) {
            JSONObject sc = m.optJSONObject("score");
            if (sc == null || sc.isNull("home") || sc.isNull("away")) continue;
            int h = sc.optInt("home"), a = sc.optInt("away");
            String id = m.optString("id");
            try {
                next.put(id, h + ":" + a);
            } catch (Exception ignored) {
            }
            String old = seen.optString(id, "");
            if (old.isEmpty() || !old.contains(":")) continue;
            int oh = Integer.parseInt(old.split(":")[0]), oa = Integer.parseInt(old.split(":")[1]);
            if (h > oh) out.add(goalItem(m, "home", h, a));
            if (a > oa) out.add(goalItem(m, "away", h, a));
        }
        NativeIslandPlugin.prefs(this).edit().putString("goalScores", next.toString()).apply();
        return out;
    }

    private static IslandArt.Item goalItem(JSONObject m, String side, int h, int a) {
        IslandArt.Item it = matchItem(m, System.currentTimeMillis());
        it.kind = "goal";
        it.id = "goal-" + m.optString("id") + "-" + side + (side.equals("home") ? h : a);
        it.side = side;
        it.sh = h;
        it.sa = a;
        it.minute = m.isNull("elapsed") ? "" : m.optInt("elapsed") + "'";
        try {
            it.leagueId = m.optJSONObject("league") != null ? m.getJSONObject("league").optString("id") : "";
            it.homeId = m.getJSONObject("home").optString("id");
        } catch (Exception ignored) {
        }
        return it;
    }

    /** Who scored (name, photo, minute) from the match details, like the site; gives up after 3 seconds. */
    private void findScorer(String origin, IslandArt.Item g) {
        try {
            String q = "id=" + enc(g.matchId) + "&league=" + enc(g.leagueId) + "&homeId=" + enc(g.homeId)
                    + "&home=" + enc(g.home) + "&away=" + enc(g.away) + "&fresh=1";
            HttpURLConnection c = (HttpURLConnection) new URL(origin + "/api/matches/details?" + q).openConnection();
            c.setConnectTimeout(3_000);
            c.setReadTimeout(3_000);
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
            }
            JSONArray scorers = new JSONObject(sb.toString()).optJSONArray("scorers");
            JSONObject best = null;
            double bestMin = -1;
            for (int i = 0; scorers != null && i < scorers.length(); i++) {
                JSONObject s = scorers.optJSONObject(i);
                if (s == null || !g.side.equals(s.optString("side")) || s.optString("player").isEmpty()) continue;
                double mv = minuteValue(s.optString("minute"));
                if (mv >= bestMin) { bestMin = mv; best = s; }
            }
            if (best != null) {
                g.scorer = best.optString("player");
                if (!best.optString("minute").isEmpty()) g.minute = best.optString("minute");
                String photo = best.optString("photo", "");
                g.photo = photo.isEmpty() ? null : photo;
            }
        } catch (Exception ignored) {
        }
    }

    private static double minuteValue(String m) {
        try {
            String[] p = m.replace("'", "").split("\\+");
            return Double.parseDouble(p[0].trim()) + (p.length > 1 ? Double.parseDouble(p[1].trim()) / 100 : 0);
        } catch (Exception e) {
            return 0;
        }
    }

    private static String enc(String s) {
        try {
            return java.net.URLEncoder.encode(s == null ? "" : s, "UTF-8");
        } catch (Exception e) {
            return "";
        }
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

    private static IslandArt.Item matchItem(JSONObject m, long now) {
        IslandArt.Item it = new IslandArt.Item();
        it.kind = "match";
        it.id = "live-" + m.optString("id");
        it.matchId = m.optString("id");
        JSONObject h = m.optJSONObject("home"), a = m.optJSONObject("away");
        it.home = h != null ? h.optString("name") : "";
        it.away = a != null ? a.optString("name") : "";
        it.homeLogo = h != null ? h.optString("logo", null) : null;
        it.awayLogo = a != null ? a.optString("logo", null) : null;
        it.status = m.optString("status");
        JSONObject sc = m.optJSONObject("score");
        it.sh = sc != null && !sc.isNull("home") ? sc.optInt("home") : 0;
        it.sa = sc != null && !sc.isNull("away") ? sc.optInt("away") : 0;
        it.elapsed = m.isNull("elapsed") ? -1 : m.optInt("elapsed", -1);
        it.kickoff = m.optLong("timestamp") * 1000L;
        it.kickoffText = Art.to12h(m.optString("omanTime"));
        it.fav = m.optBoolean("favorite");
        return it;
    }

    /**
     * The islands, like the site: favourite / pinned matches (live ones, those starting within the hour with a
     * countdown to kick-off, and just-finished ones for 30 minutes), the prayer countdowns near their end (iqamah
     * under 10 minutes, the others under 5) and - when expanded - the day's dhikr reminders. A favourite team's live
     * match comes first, then the nearest in time.
     */
    private List<IslandArt.Item> islandItems(long now) {
        List<IslandArt.Item> out = new ArrayList<>();
        for (JSONObject m : matches) {
            IslandArt.Item it = matchItem(m, now);
            if (it.finished()) {
                // the API has no end time: about 2 hours after kick-off, shown for half an hour
                if (now - it.kickoff > 150 * 60_000L) continue;
            } else if (!it.live()) {
                long left = it.kickoff - now;
                if (left > 60 * 60_000L || left < -15 * 60_000L) continue;
            }
            out.add(it);
        }
        JSONArray list = config.optJSONArray("countdowns");
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject c = list.optJSONObject(i);
            if (c == null) continue;
            long left = c.optLong("at") - now;
            long window = "iqamah".equals(c.optString("kind")) ? 10 * 60_000L : 5 * 60_000L;
            if (left <= 0 || left > window) continue;
            IslandArt.Item it = new IslandArt.Item();
            it.kind = "countdown";
            it.id = "cd-" + c.optString("title") + c.optLong("at");
            it.title = c.optString("title");
            it.at = c.optLong("at");
            it.ckind = c.optString("kind");
            out.add(it);
        }
        if (expanded) {
            JSONArray az = config.optJSONArray("azkar");
            for (int i = 0; az != null && i < az.length(); i++) {
                JSONObject a = az.optJSONObject(i);
                if (a == null || a.optBoolean("done")) continue;
                IslandArt.Item it = new IslandArt.Item();
                it.kind = "azkar";
                it.id = "az-" + a.optString("id");
                it.title = a.optString("label");
                out.add(it);
            }
        }
        Collections.sort(out, (x, y) -> {
            boolean fx = x.fav && x.live(), fy = y.fav && y.live();
            if (fx != fy) return fx ? -1 : 1;
            return Long.compare(Math.abs(distance(x, now)), Math.abs(distance(y, now)));
        });
        return out;
    }

    private static long distance(IslandArt.Item it, long now) {
        if ("match".equals(it.kind)) return it.live() ? 0 : it.kickoff - now;
        if ("azkar".equals(it.kind)) return Long.MAX_VALUE / 4;
        return it.at - now;
    }

    // ---- the floating islands ----

    /** true = every island, bigger, with team names (tap); false = compact pills, at most three plus "+n" */
    private boolean expanded = false;
    /** which window host the island is in: accessibility service (over the status bar / lock screen) or app overlay */
    private boolean islandOnAccessibility = false;
    /** the goal being celebrated (the other islands step aside meanwhile, like the site) */
    private IslandArt.Item celebration;
    private long celebrationUntil;
    private String islandSignature = "";
    private final List<PillView> pills = new ArrayList<>();

    /** A goal: the big goal card for 7 seconds in place of the islands. */
    private void celebrate(IslandArt.Item g) {
        celebration = g;
        celebrationUntil = System.currentTimeMillis() + 7_000;
        islandSignature = ""; // rebuild
        handler.postDelayed(() -> {
            if (System.currentTimeMillis() >= celebrationUntil) {
                celebration = null;
                islandSignature = "";
                tick();
            }
        }, 7_100);
    }

    /** One island, drawn by IslandArt. */
    private final class PillView extends View {
        IslandArt.Item item;
        boolean big;
        long now;

        PillView(Context c) {
            super(c);
            setLayerType(View.LAYER_TYPE_SOFTWARE, null); // blur glows need the software pipeline
        }

        float heightPx() {
            if ("goal".equals(item.kind)) return dp(item.scorer.isEmpty() ? 72 : 96);
            return dp(big ? 60 : 44);
        }

        @Override
        protected void onMeasure(int wSpec, int hSpec) {
            float h = heightPx();
            float w = "goal".equals(item.kind) ? Math.min(dp(380), getResources().getDisplayMetrics().widthPixels - dp(24))
                    : IslandArt.measure(getContext(), item, h, big, now);
            // room for the glow around the pill
            int g = Math.round(dp(8));
            setMeasuredDimension(Math.round(w) + g * 2, Math.round(h) + g * 2);
        }

        @Override
        protected void onDraw(Canvas c) {
            float g = dp(8);
            RectF r = new RectF(g, g, getWidth() - g, getHeight() - g);
            IslandArt.draw(getContext(), c, r, item, big, now);
        }
    }

    /**
     * Dynamic-island style at the top centre, over the status bar (around the camera): the islands side by side like
     * the site. Tap = expand / collapse; long press = open the app; drag = move (remembered). Drawn by the
     * accessibility service when it is on (works over the status bar and the lock screen), otherwise as an app
     * overlay ("display over other apps").
     */
    @SuppressLint("ClickableViewAccessibility")
    private void showIsland(List<IslandArt.Item> items, long now) {
        IslandAccessibilityService acc = IslandAccessibilityService.instance;
        boolean useAcc = acc != null;
        if (island != null && useAcc != islandOnAccessibility) removeIsland();
        if (island == null) {
            WindowManager wm = useAcc ? acc.windowManager() : windowManager;
            island = new LinearLayout(this);
            island.setOrientation(LinearLayout.VERTICAL);
            island.setGravity(Gravity.CENTER_HORIZONTAL);
            islandSignature = "";

            int type = useAcc ? WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                    : Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
            params = new WindowManager.LayoutParams(WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, type,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                            | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED,
                    PixelFormat.TRANSLUCENT);
            if (Build.VERSION.SDK_INT >= 28) params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
            // default: on the status bar, around the front camera
            params.y = NativeIslandPlugin.prefs(this).getInt("islandY2", dp(0));
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
                                if (celebration != null) {
                                    celebration = null; // tap the goal card: back to the islands
                                } else {
                                    expanded = !expanded; // tap: expand / collapse like a dynamic island
                                }
                                islandSignature = "";
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

        // what to show: the goal card alone, or the islands (compact: three + "+n")
        List<IslandArt.Item> shown = new ArrayList<>();
        if (celebration != null) {
            shown.add(celebration);
        } else if (expanded) {
            shown.addAll(items.subList(0, Math.min(items.size(), 8)));
        } else {
            shown.addAll(items.subList(0, Math.min(items.size(), 3)));
            if (items.size() > 3) {
                IslandArt.Item more = new IslandArt.Item();
                more.kind = "more";
                more.id = "more";
                more.more = items.size() - 3;
                shown.add(more);
            }
        }
        StringBuilder sig = new StringBuilder(expanded ? "E" : "C");
        for (IslandArt.Item it : shown) sig.append('|').append(it.id).append(it.kind).append(it.more);
        if (!sig.toString().equals(islandSignature)) {
            islandSignature = sig.toString();
            rebuildPills(shown);
        }
        for (int i = 0; i < pills.size() && i < shown.size(); i++) {
            PillView p = pills.get(i);
            p.item = shown.get(i);
            p.now = now;
            p.requestLayout();
            p.invalidate();
        }
    }

    /** Lay the pills out in rows that fit the screen width (one row normally; a second when expanded and wide). */
    private void rebuildPills(List<IslandArt.Item> shown) {
        island.removeAllViews();
        pills.clear();
        int maxW = getResources().getDisplayMetrics().widthPixels - dp(16);
        LinearLayout row = null;
        int rowW = 0;
        long now = System.currentTimeMillis();
        boolean first = true;
        for (IslandArt.Item it : shown) {
            PillView p = new PillView(this);
            p.item = it;
            p.big = expanded;
            p.now = now;
            p.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED);
            int w = p.getMeasuredWidth();
            if (row == null || rowW + w > maxW) {
                row = new LinearLayout(this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                row.setGravity(Gravity.CENTER);
                row.setLayoutDirection(View.LAYOUT_DIRECTION_RTL); // first island on the right, like the app
                island.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT));
                rowW = 0;
            }
            row.addView(p, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT));
            rowW += w;
            pills.add(p);
            if (first && "goal".equals(it.kind)) {
                // the goal card pops in
                p.setScaleX(0.6f);
                p.setScaleY(0.6f);
                p.setAlpha(0f);
                p.animate().scaleX(1f).scaleY(1f).alpha(1f).setDuration(420).setInterpolator(new android.view.animation.OvershootInterpolator(1.6f)).start();
            }
            first = false;
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
            pills.clear();
            islandSignature = "";
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

    // ---- goal notification ----

    private static final String GOAL_CHANNEL = "drivecast_goals";

    /** A heads-up notification with the goal card picture (logos, new score, scorer), also on the lock screen. */
    private void notifyGoal(IslandArt.Item g) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm == null) return;
            float d = getResources().getDisplayMetrics().density;
            Bitmap hl = Images.get(this, g.homeLogo, Math.round(120 * d)), al = Images.get(this, g.awayLogo, Math.round(120 * d));
            if (g.photo != null) Images.get(this, g.photo, Math.round(60 * d));
            int w = Math.round(360 * d);
            Bitmap small = Bitmap.createBitmap(w, Math.round(64 * d), Bitmap.Config.ARGB_8888);
            IslandArt.Item compact = copyWithoutScorer(g);
            IslandArt.drawGoal(this, new Canvas(small), new RectF(d * 2, d * 2, small.getWidth() - d * 2, small.getHeight() - d * 2), compact, hl, al);
            Bitmap big = Bitmap.createBitmap(w, Math.round(150 * d), Bitmap.Config.ARGB_8888);
            IslandArt.drawGoal(this, new Canvas(big), new RectF(d * 6, d * 6, big.getWidth() - d * 6, big.getHeight() - d * 6), g, hl, al);
            android.widget.RemoteViews sv = new android.widget.RemoteViews(getPackageName(), R.layout.notification_goal);
            sv.setImageViewBitmap(R.id.goal_picture, small);
            android.widget.RemoteViews bv = new android.widget.RemoteViews(getPackageName(), R.layout.notification_goal_big);
            bv.setImageViewBitmap(R.id.goal_picture, big);

            String team = "home".equals(g.side) ? g.home : g.away;
            String text = g.home + " " + g.sh + " - " + g.sa + " " + g.away + (g.scorer.isEmpty() ? "" : " · " + g.scorer + " " + g.minute);
            Intent open = new Intent(this, MainActivity.class);
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            open.putExtra("route", "/matches");
            PendingIntent pi = PendingIntent.getActivity(this, 4200, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            Bitmap large = "home".equals(g.side) ? hl : al;
            NotificationCompat.Builder b = new NotificationCompat.Builder(this, GOAL_CHANNEL)
                    .setSmallIcon(R.mipmap.ic_launcher_foreground)
                    .setContentTitle("⚽ هدف! " + team)
                    .setContentText(text)
                    .setCustomContentView(sv)
                    .setCustomBigContentView(bv)
                    .setCustomHeadsUpContentView(sv)
                    .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
                    .setContentIntent(pi)
                    .setAutoCancel(true)
                    .setCategory(NotificationCompat.CATEGORY_EVENT)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setDefaults(NotificationCompat.DEFAULT_ALL);
            if (large != null) b.setLargeIcon(large);
            nm.notify(g.id.hashCode(), b.build());
        } catch (Exception ignored) {
        }
    }

    private static IslandArt.Item copyWithoutScorer(IslandArt.Item g) {
        IslandArt.Item c = new IslandArt.Item();
        c.kind = g.kind;
        c.id = g.id;
        c.home = g.home;
        c.away = g.away;
        c.homeLogo = g.homeLogo;
        c.awayLogo = g.awayLogo;
        c.sh = g.sh;
        c.sa = g.sa;
        c.side = g.side;
        return c;
    }

    // ---- notification (also shows the live score / countdown in the shade and on the lock screen) ----

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm == null) return;
            NotificationChannel ch = new NotificationChannel(CHANNEL, "الجزيرة العائمة", NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
            NotificationChannel goals = new NotificationChannel(GOAL_CHANNEL, getString(R.string.goal_channel), NotificationManager.IMPORTANCE_HIGH);
            goals.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            goals.enableVibration(true);
            nm.createNotificationChannel(goals);
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

    private void updateNotification(List<IslandArt.Item> items, long now) {
        // countdown seconds would update it every second: the shade shows minutes only
        StringBuilder sb = new StringBuilder();
        for (IslandArt.Item it : items) {
            String line;
            if ("match".equals(it.kind)) {
                String state = it.live() ? IslandArt.minuteText(it) : it.finished() ? "انتهت" : it.kickoffText;
                String mid = it.live() || it.finished() ? it.sh + " - " + it.sa : "×";
                line = state + "   " + it.home + "  " + mid + "  " + it.away;
            } else if ("countdown".equals(it.kind)) {
                line = it.title + "   " + Math.max(1, (it.at - now + 59_999) / 60_000) + " د";
            } else {
                continue;
            }
            sb.append(sb.length() > 0 ? "\n" : "").append(line);
        }
        QuranState q = QuranState.load(this);
        if (q.playing) sb.insert(0, "📖 سورة " + q.surahName(this) + " · " + q.reciterName(this) + (sb.length() > 0 ? "\n" : ""));
        String text = sb.length() > 0 ? sb.toString() : "يعمل في الخلفية";
        if (text.equals(lastNotificationText)) return;
        lastNotificationText = text;
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification(text));
    }
}
