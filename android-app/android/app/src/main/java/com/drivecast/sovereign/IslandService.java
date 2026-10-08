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
import android.widget.FrameLayout;
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

    static final String POPUP = "com.drivecast.PLAY_POPUP";
    static final String AUDIO = "com.drivecast.PLAY_AUDIO";
    static final String QURAN_PLAY = "com.drivecast.QURAN_PLAY";
    static final String STOP_ALL = "com.drivecast.STOP_ALL";
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

    /** Location was just allowed: run again with the location type (Android 14+) so the road prayer works behind apps. */
    static void locationGranted() {
        IslandService s = instance;
        if (s == null) return;
        s.handler.post(() -> {
            if (Build.VERSION.SDK_INT >= 34) {
                try {
                    s.startForeground(NOTIFICATION_ID, s.buildNotification("يعمل في الخلفية"), ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                            | ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE | ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
                } catch (Exception ignored) {
                }
            }
            if (s.road != null) s.road.setActive(false);
            s.lastNotificationText = "";
            s.tick();
        });
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
        if (Build.VERSION.SDK_INT >= 34) {
            // with the location type when allowed (prayer on the road keeps working behind other apps)
            try {
                if (!RoadPrayer.permitted(this)) throw new SecurityException();
                startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK | ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE | ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } catch (Exception e) {
                startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK | ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            }
        }
        else if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(NOTIFICATION_ID, n);
        loadConfig();
        handler.post(loop);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String a = intent != null ? intent.getAction() : null;
        if (a != null && a.startsWith("com.drivecast.QURAN_")) quranAction(a);
        if (WidgetActionReceiver.MAP_TOGGLE.equals(a)) handler.post(this::toggleMap);
        if (STOP_ALL.equals(a)) handler.post(this::stopAll);
        if (QURAN_PLAY.equals(a)) {
            final int surah = intent.getIntExtra("surah", 1), reciter = intent.getIntExtra("reciter", -1);
            handler.post(() -> {
                QuranState q = QuranState.load(this);
                q.surah = Math.max(1, Math.min(114, surah));
                if (reciter >= 0) q.reciterIndex = reciter;
                quranLoaded = "";
                playQuran(q);
            });
        }
        if ((POPUP.equals(a) || AUDIO.equals(a)) && intent.getStringExtra("id") != null) {
            final String t = intent.getStringExtra("type"), id = intent.getStringExtra("id"), title = intent.getStringExtra("title");
            final boolean audio = AUDIO.equals(a);
            try {
                audioQueue = new JSONArray(intent.getStringExtra("queue") == null ? "[]" : intent.getStringExtra("queue"));
            } catch (Exception e) {
                audioQueue = new JSONArray();
            }
            audioIndex = intent.getIntExtra("index", 0);
            handler.post(() -> {
                if (audio) playAudio(t, id, title);
                else {
                    stopAudio();
                    if ("stream".equals(t)) playStream(id, title); else playVideo(id, title);
                }
            });
        }
        if (MediaBrowser.STREAM.equals(a) && intent.getStringExtra("url") != null) {
            final String url = intent.getStringExtra("url"), title = intent.getStringExtra("title");
            handler.post(() -> playStream(url, title));
        }
        if (MediaBrowser.PLAY.equals(a) && intent.getStringExtra("id") != null) {
            final String vid = intent.getStringExtra("id"), title = intent.getStringExtra("title");
            handler.post(() -> playVideo(vid, title));
        }
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
        updateBubble(false, false);
        hideMap();
        stopAudio();
        if (tts != null) tts.shutdown();
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
        boolean critical = false;
        for (JSONObject m : matches) if (matchItem(m, now).critical) critical = true;
        // the deciding minutes: every 15 s
        long every = appVisible ? 4 * POLL_MS : critical ? POLL_MS / 2 : POLL_MS;
        if (now - lastPoll > every && pollDue(now)) {
            lastPoll = now;
            pollMatches();
        }
        // widgets: on each new minute (their pictures show minutes; the countdown ticks by itself)
        long minute = now / 60_000L;
        if (minute != lastWidgetsMinute) {
            lastWidgetsMinute = minute;
            // a weekly trip near its time: plan it (route + mosques) and read it out
            new Thread(() -> {
                String said = Trip.autoWeekly(this);
                if (said != null) handler.post(() -> { say(said); islandSignature = ""; tick(); });
            }).start();
            Widgets.updateAll(this);
        }
        List<IslandArt.Item> items = islandItems(now);
        updateNotification(items, now);
        boolean testing = testUntil > now;
        if (!testing && !testItems.isEmpty()) { testItems.clear(); islandSignature = ""; }
        if (testing && !testItems.isEmpty()) { items = new ArrayList<>(items); items.addAll(0, testItems); }
        boolean allowed = (!appVisible || audioView != null || testing) && canDraw() && NativeIslandPlugin.prefs(this).getBoolean("overlayEnabled", true);
        // hidden from the bubble: only a goal, a prayer that is due within the minute and the sound island still show
        boolean hidden = Hub.bool(this, "islandsHidden", false);
        List<IslandArt.Item> visible = items;
        if (hidden) {
            visible = new ArrayList<>();
            boolean urgentPrayers = Hub.bool(this, "hiddenShowsUrgent", true);
            for (IslandArt.Item it : items) {
                if ("audio".equals(it.kind)) visible.add(it);
                else if (urgentPrayers && "countdown".equals(it.kind) && !"reminder".equals(it.ckind) && it.at - now < 60_000L) visible.add(it);
            }
        }
        bubbleAlert = hidden && (critical || !visible.isEmpty() || hasUrgent(items, now));
        boolean controls = Hub.bool(this, "islandBubble", true);
        // hidden: the islands' row keeps just its controls (eye / microphone) so they can come back
        if (allowed && (!visible.isEmpty() || celebration != null || controls)) showIsland(visible, now); // the eye / microphone stay even with no island
        else removeIsland();
        updateBubble(false, hidden); // the controls now sit beside the islands
        updateControls(hidden);
    }

    private boolean canDraw() {
        return IslandAccessibilityService.instance != null || Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(this);
    }

    // ---- data ----

    /** today's favourite / pinned matches (any state), as the API sent them */
    private final List<JSONObject> matches = new ArrayList<>();

    /** set when a request fails: try again on the normal rhythm */
    private boolean pollFailed = false;

    /**
     * Ask for scores only when they can change: every 30 s while a match is live or about to start; otherwise not
     * until 5 minutes before the next kick-off (and at least every 30 minutes).
     */
    private boolean pollDue(long now) {
        if (pollFailed || lastPollOk == 0) return true;
        long next = Long.MAX_VALUE;
        for (JSONObject m : matches) {
            String st = m.optString("status");
            if ("live".equals(st)) return true;
            long k = m.optLong("timestamp") * 1000L;
            if ("upcoming".equals(st) && k > now - 15 * 60_000L) next = Math.min(next, k);
        }
        if (next != Long.MAX_VALUE && next - now < 5 * 60_000L) return true;
        long wake = Math.min(lastPollOk + 30 * 60_000L, next == Long.MAX_VALUE ? Long.MAX_VALUE : next - 5 * 60_000L);
        return now >= wake;
    }

    private long lastPollOk = 0;

    private void pollMatches() {
        final String configUrl = config.optString("apiUrl", "");
        final JSONArray configPins = config.optJSONArray("pins");
        final String origin = siteOrigin();
        final boolean alert = !appVisible; // inside the app the page plays its own goal animation
        new Thread(() -> {
            // every favourite team (the widget shows them all); the island only those whose island switch is on
            Cloud.refresh(this, false);
            JSONObject master = Cloud.master(this);
            JSONArray teams = master.optJSONArray("favoriteTeams");
            JSONArray pins = Cloud.pinsWithBells(this, master.optJSONArray("pinnedMatches") != null ? master.optJSONArray("pinnedMatches") : configPins);
            List<String> islandTeams = new ArrayList<>();
            String apiUrl = configUrl;
            if (teams != null && teams.length() > 0) {
                StringBuilder t = new StringBuilder(), p = new StringBuilder();
                for (int i = 0; i < teams.length(); i++) {
                    JSONObject f = teams.optJSONObject(i);
                    if (f == null || f.optString("name").isEmpty()) continue;
                    t.append(t.length() > 0 ? "|" : "").append(Cloud.favSpec(f));
                    if (f.optBoolean("island", true)) islandTeams.add(f.optString("name"));
                }
                for (int i = 0; pins != null && i < pins.length(); i++) {
                    JSONObject pn = pins.optJSONObject(i);
                    if (pn != null) p.append(p.length() > 0 ? "|" : "").append(pn.optString("home")).append("|").append(pn.optString("away"));
                }
                apiUrl = origin + "/api/matches?limit=12&teams=" + enc(t.toString()) + (p.length() > 0 ? "&pins=" + enc(p.toString()) : "");
            }
            if (apiUrl.isEmpty()) return;
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
                    boolean onIsland = pinned || (m.optBoolean("favorite") && (islandTeams.isEmpty() && teams == null
                            || involves(islandTeams, h.optString("name"), a.optString("name"))));
                    m.put("island", onIsland);
                    mine.add(m);
                    widgetData.put(m);
                }
            } catch (Exception ignored) {
                pollFailed = true;
                return; // keep the last scores on a network error
            }
            pollFailed = false;
            lastPollOk = System.currentTimeMillis();
            List<IslandArt.Item> goals = detectGoals(mine);
            for (IslandArt.Item g : goals) findScorer(origin, g);
            NativeIslandPlugin.prefs(this).edit().putString("matchesData", widgetData.toString()).putLong("matchesAt", System.currentTimeMillis())
                    .putString("matchesDay", Cloud.day(System.currentTimeMillis())).putBoolean("matchesFailed", false).apply();
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

    private static boolean involves(List<String> names, String home, String away) {
        for (String n : names) if (same(n, home) || same(n, away)) return true;
        return false;
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
        JSONObject lg = m.optJSONObject("league");
        it.league = lg != null ? lg.optString("name") : "";
        it.leagueId = lg != null ? lg.optString("id") : "";
        it.homeId = h != null ? h.optString("id") : "";
        // the deciding minutes of a favourite's match: from the 80th minute with one goal or less between them
        it.critical = it.live() && (it.fav || m.optBoolean("pinned")) && it.elapsed >= 80 && Math.abs(it.sh - it.sa) <= 1;
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
        if (audioView != null) {
            IslandArt.Item it = new IslandArt.Item();
            it.kind = "audio";
            it.id = "audio";
            it.title = audioTitle;
            it.fav = audioPlaying;
            out.add(it);
        }
        QuranState qs = QuranState.load(this);
        if (qs.playing) {
            // the Quran player (voice "شغّل سورة" / the Quran widget): tap = pause / resume, ✕ (opened) = stop
            IslandArt.Item it = new IslandArt.Item();
            it.kind = "audio";
            it.id = "quran";
            it.title = "سورة " + qs.surahName(this) + (qs.reciterName(this).isEmpty() ? "" : " · " + qs.reciterName(this));
            it.fav = quranPlayer != null && quranPlayer.isPlaying();
            out.add(it);
        }
        Object av = Hub.get(this, "azkarVoice");
        if (av instanceof JSONObject && azkarIdx >= 0) {
            IslandArt.Item it = new IslandArt.Item();
            it.kind = "azkar";
            it.id = "az-voice";
            it.title = "🔊 " + ((JSONObject) av).optString("title") + "  " + ((JSONObject) av).optInt("i") + "/" + ((JSONObject) av).optInt("n");
            out.add(it);
        }
        for (JSONObject m : matches) {
            if (!m.optBoolean("island", true)) continue; // a favourite whose island switch is off: widget only
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
        JSONArray list = Widgets.countdowns(this);
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject c = list.optJSONObject(i);
            if (c == null) continue;
            long left = c.optLong("at") - now;
            // the adhan from 10 minutes before, the iqamah from 15
            long window = "iqamah".equals(c.optString("kind")) ? 15 * 60_000L : 10 * 60_000L;
            if (left <= 0 || left > window) continue;
            IslandArt.Item it = new IslandArt.Item();
            it.kind = "countdown";
            it.id = "cd-" + c.optString("title") + c.optLong("at");
            it.title = c.optString("title");
            it.at = c.optLong("at");
            it.ckind = c.optString("kind");
            out.add(it);
        }
        reminderItems(out, now);
        Occasions.items(this, out, now);
        voiceReminderItems(out, now);
        roadItem(out, now);
        tripItem(out, now);
        {
            // the day's dhikr: always shown, like the site (hidden once marked done today)
            JSONArray az = Cloud.master(this).optJSONArray("generalAzkar");
            if (az == null) az = config.optJSONArray("azkar");
            String today = Cloud.day(now);
            for (int i = 0; az != null && i < az.length(); i++) {
                JSONObject a = az.optJSONObject(i);
                if (a == null || a.optBoolean("done") || today.equals(a.optString("completedOn"))) continue;
                if (Hub.has(this, "doneToday:" + today, "az-" + a.optString("id"))) continue;
                IslandArt.Item it = new IslandArt.Item();
                it.kind = "azkar";
                it.id = "az-" + a.optString("id");
                it.title = a.optString("label");
                out.add(it);
            }
        }
        Collections.sort(out, (x, y) -> {
            if ("audio".equals(x.kind) != "audio".equals(y.kind)) return "audio".equals(x.kind) ? -1 : 1;
            boolean fx = x.fav && x.live(), fy = y.fav && y.live();
            if (fx != fy) return fx ? -1 : 1;
            return Long.compare(Math.abs(distance(x, now)), Math.abs(distance(y, now)));
        });
        return out;
    }

    /**
     * The site's reminders (start at a set time or around a prayer, end at a time / after a duration / at a prayer):
     * shown from their countdown window until they end (an hour after the start when no end), hidden once done today.
     * Match reminders show as a match island.
     */
    private void reminderItems(List<IslandArt.Item> out, long now) {
        JSONObject master = Cloud.master(this);
        JSONArray rems = master.optJSONArray("reminders");
        if (rems == null || rems.length() == 0) return;
        String today = Cloud.day(now);
        JSONObject row = null;
        JSONArray days = Cloud.array(this, "cloud_prayers");
        for (int i = 0; i < days.length(); i++) if (today.equals(days.optJSONObject(i).optString("date"))) row = days.optJSONObject(i);
        JSONArray settings = master.optJSONArray("prayerSettings");
        java.util.Calendar mid = java.util.Calendar.getInstance();
        mid.set(java.util.Calendar.HOUR_OF_DAY, 0);
        mid.set(java.util.Calendar.MINUTE, 0);
        mid.set(java.util.Calendar.SECOND, 0);
        mid.set(java.util.Calendar.MILLISECOND, 0);
        long day0 = mid.getTimeInMillis();
        for (int i = 0; i < rems.length(); i++) {
            JSONObject r = rems.optJSONObject(i);
            if (r == null || today.equals(r.optString("completedOn"))) continue;
            if (Widgets.json(this, "snoozed").optLong(r.optString("id")) > now || Hub.has(this, "doneToday:" + today, "rem-" + r.optString("id"))) continue;
            boolean isMatch = "match".equals(r.optString("iconType"));
            if (isMatch && !r.optString("matchDate").isEmpty() && !today.equals(r.optString("matchDate"))) continue;
            long start = -1;
            if ("manual".equals(r.optString("startType")) && !r.optString("manualStartTime").isEmpty()) {
                start = day0 + minutes(r.optString("manualStartTime")) * 60_000L;
            } else if (row != null && !r.optString("startReference").isEmpty() && !row.optString(r.optString("startReference")).isEmpty()) {
                int base = minutes(row.optString(r.optString("startReference")));
                if ("iqamah".equals(r.optString("startType"))) base += iqamah(settings, r.optString("startReference"));
                start = day0 + (base + r.optInt("startOffset")) * 60_000L;
            }
            if (start < 0) continue;
            long end = start + 60 * 60_000L;
            String et = r.optString("endType");
            if ("manual".equals(et) && !r.optString("manualEndTime").isEmpty()) end = day0 + minutes(r.optString("manualEndTime")) * 60_000L;
            else if ("duration".equals(et)) end = start + Math.max(1, r.optInt("durationMinutes", 30)) * 60_000L;
            else if (row != null && ("azan".equals(et) || "iqamah".equals(et) || "prayer".equals(et)) && !row.optString(r.optString("endReference")).isEmpty()) {
                int base = minutes(row.optString(r.optString("endReference")));
                if ("iqamah".equals(et)) base += iqamah(settings, r.optString("endReference"));
                end = day0 + (base + r.optInt("endOffset")) * 60_000L;
            }
            long window = Math.max(1, r.optInt("countdownWindow", 15)) * 60_000L;
            boolean visible = isMatch || (now >= start - window && now < Math.max(end, start + 60 * 60_000L));
            if (!visible) continue;
            IslandArt.Item it = new IslandArt.Item();
            it.id = "rem-" + r.optString("id");
            if (isMatch && !r.optString("homeName").isEmpty()) {
                boolean dup = false;
                for (IslandArt.Item o : out) if ("match".equals(o.kind) && same(o.home, r.optString("homeName")) && same(o.away, r.optString("awayName"))) dup = true;
                if (dup) continue;
                it.kind = "match";
                it.status = "upcoming";
                it.home = r.optString("homeName");
                it.away = r.optString("awayName");
                it.homeLogo = r.optString("homeLogo", null);
                it.awayLogo = r.optString("awayLogo", null);
                it.kickoff = start;
                it.kickoffText = Art.to12h(r.optString("manualStartTime"));
            } else {
                it.kind = "countdown";
                it.title = r.optString("label");
                it.at = start;
                it.ckind = "reminder";
            }
            out.add(it);
        }
    }

    private static int minutes(String hhmm) {
        try {
            String[] p = hhmm.split(":");
            return Integer.parseInt(p[0].trim()) * 60 + Integer.parseInt(p[1].trim().substring(0, 2));
        } catch (Exception e) {
            return 0;
        }
    }

    private static int iqamah(JSONArray settings, String id) {
        for (int i = 0; settings != null && i < settings.length(); i++) {
            JSONObject s = settings.optJSONObject(i);
            if (s != null && id.equals(s.optString("id"))) return s.optInt("iqamahDuration");
        }
        return 0;
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
        if (Hub.bool(this, "voiceFollow", false)) {
            String team = "home".equals(g.side) ? g.home : g.away;
            say("هدف ل" + team + (g.scorer.isEmpty() ? "" : "، " + g.scorer) + (g.minute.isEmpty() ? "" : "، الدقيقة " + g.minute.replace("'", ""))
                    + ". النتيجة " + g.sh + " " + g.sa);
        }
        if (celebration != null) { goalQueue.add(g); return; } // one after the other, never on top
        startCelebration(g);
    }

    private final List<IslandArt.Item> goalQueue = new ArrayList<>();

    private void startCelebration(IslandArt.Item g) {
        g.shownAt = System.currentTimeMillis();
        long d = IslandArt.goalDuration(g);
        celebration = g;
        celebrationUntil = g.shownAt + d;
        islandSignature = ""; // rebuild
        handler.postDelayed(() -> {
            if (celebration == g) {
                celebration = null;
                islandSignature = "";
                if (!goalQueue.isEmpty()) startCelebration(goalQueue.remove(0));
                tick();
            }
        }, d + 100);
        tick();
    }

    // ---- test mode (settings): fake islands for a minute, goals every 3 seconds ----

    private long testUntil = 0;
    private final List<IslandArt.Item> testItems = new ArrayList<>();

    /** "الفيديو التالي / السابق" by voice: the sound island's list; true when it took it */
    static boolean mediaStep(int d) {
        IslandService s = instance;
        if (s == null || s.audioView == null || s.audioQueue.length() <= 1) return false;
        s.handler.post(() -> s.audioStep(d));
        return true;
    }

    static void test(String kind) {
        IslandService s = instance;
        if (s != null) s.handler.post(() -> s.runTest(kind));
    }

    private void runTest(String kind) {
        long now = System.currentTimeMillis();
        testUntil = Math.max(testUntil, now + ("goal".equals(kind) ? 35_000L : 60_000L));
        // a real favourite match for the logos when there is one
        JSONObject real = null;
        JSONArray data = Widgets.array(this, "matchesData");
        for (int i = 0; i < data.length(); i++) if (data.optJSONObject(i) != null && data.optJSONObject(i).optJSONObject("home") != null) { real = data.optJSONObject(i); break; }
        IslandArt.Item base = real != null ? matchItem(real, now) : new IslandArt.Item();
        if (real == null) {
            base.kind = "match"; base.home = "الهلال"; base.away = "النصر"; base.league = "دوري روشن"; base.matchId = "";
        }
        base.id = "test-match";
        base.status = "live";
        base.fav = true;
        base.elapsed = 84;
        base.sh = 1; base.sa = 1;
        base.critical = true;
        if ("goal".equals(kind)) {
            String[][] scorers = {{"home", "سالم الدوسري", "78'"}, {"away", "كريستيانو رونالدو", "81'"}, {"home", "ميتروفيتش", "84'"}, {"away", "ساديو ماني", "90+2'"}};
            int h = base.sh, a = base.sa;
            for (int i = 0; i < scorers.length; i++) {
                final String[] sc = scorers[i];
                if ("home".equals(sc[0])) h++; else a++;
                final int fh = h, fa = a;
                handler.postDelayed(() -> {
                    IslandArt.Item g = copy(base);
                    g.kind = "goal";
                    g.id = "test-goal-" + System.nanoTime();
                    g.side = sc[0];
                    g.sh = fh;
                    g.sa = fa;
                    g.scorer = sc[1];
                    g.minute = sc[2];
                    g.photo = null;
                    if (Hub.bool(this, "voiceFollow", false)) say("هدف ل" + ("home".equals(g.side) ? g.home : g.away) + "، " + g.scorer);
                    celebrate(g);
                    if (fh + fa == base.sh + base.sa + 1) new Thread(() -> notifyGoal(g)).start(); // the notification too, once
                }, i * 3000L);
            }
        } else {
            testItems.clear();
            testItems.add(base);
            IslandArt.Item cd = new IslandArt.Item();
            cd.kind = "countdown"; cd.id = "test-cd"; cd.title = "المغرب"; cd.ckind = "azan"; cd.at = now + 3 * 60_000L;
            testItems.add(cd);
            IslandArt.Item iq = new IslandArt.Item();
            iq.kind = "countdown"; iq.id = "test-iq"; iq.title = "إقامة العشاء"; iq.ckind = "iqamah"; iq.at = now + 7 * 60_000L;
            testItems.add(iq);
            IslandArt.Item rem = new IslandArt.Item();
            rem.kind = "countdown"; rem.id = "test-rem"; rem.title = "اتصل بأبوي"; rem.ckind = "reminder"; rem.at = now + 9 * 60_000L;
            testItems.add(rem);
            IslandArt.Item az = new IslandArt.Item();
            az.kind = "azkar"; az.id = "test-az"; az.title = "أذكار المساء";
            testItems.add(az);
            IslandArt.Item up = copy(base);
            up.id = "test-up"; up.status = "upcoming"; up.critical = false; up.fav = false; up.kickoff = now + 25 * 60_000L; up.kickoffText = "9:30";
            testItems.add(up);
        }
        islandSignature = "";
        tick();
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
            if ("goal".equals(item.kind)) return dp(item.scorer.isEmpty() ? 170 : 210);
            if (item.mini) return dp(40);
            return dp(big ? 60 : 44);
        }

        @Override
        protected void onMeasure(int wSpec, int hSpec) {
            float h = heightPx();
            float w = "goal".equals(item.kind) ? Math.min(dp(520), getResources().getDisplayMetrics().widthPixels - dp(24))
                    : IslandArt.measure(getContext(), item, h, big, now);
            // room for the glow around the pill
            int g = Math.round(dp(8));
            setMeasuredDimension(Math.round(w) + g * 2, Math.round(h) + g * 2);
        }

        @Override
        protected void onDraw(Canvas c) {
            float g = dp(8);
            RectF r = new RectF(g, g, getWidth() - g, getHeight() - g);
            if ("goal".equals(item.kind)) {
                // the site's two-act animation, drawn frame by frame
                long t = System.currentTimeMillis() - item.shownAt;
                IslandArt.drawGoalAnimated(getContext(), c, r, item, t);
                if (t < IslandArt.goalDuration(item)) postInvalidateOnAnimation();
                return;
            }
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
                // long press: expand / collapse like a dynamic island
                final Runnable longPress = () -> {
                    longPressed = true;
                    PillView hit = pillAt(downX, downY);
                    if (hit != null && "audio".equals(hit.item.kind) && !"quran".equals(hit.item.id) && celebration == null) {
                        toggleAudio(); // long press on the sound island: pause / resume
                        islandSignature = "";
                        tick();
                        return;
                    }
                    if (hit != null && !"more".equals(hit.item.kind) && !"audio".equals(hit.item.kind) && celebration == null) {
                        openRoute(routeFor(hit.item));
                    } else {
                        expanded = !expanded;
                    }
                    islandSignature = "";
                    tick();
                };

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
                                PillView hit = pillAt(e.getRawX(), e.getRawY());
                                if (hit != null && "audio".equals(hit.item.kind) && celebration == null) {
                                    boolean x = expanded && e.getRawX() < hitLeft(hit) + hit.getHeight() * 0.9f;
                                    if ("quran".equals(hit.item.id)) {
                                        // the Quran: tap = pause / resume, ✕ = stop
                                        QuranState q = QuranState.load(IslandService.this);
                                        if (x) pauseQuran(q);
                                        else if (quranPlayer != null && quranPlayer.isPlaying()) { quranPlayer.pause(); lastNotificationText = ""; }
                                        else if (quranPlayer != null) quranPlayer.start();
                                        else playQuran(q);
                                    } else if (x) stopAudio();
                                    else backToFullPlayer(); // the sound island: back to the full-screen player
                                    islandSignature = "";
                                    tick();
                                    return true;
                                }
                                if (celebration != null) {
                                    // tap the goal card: the matches screen
                                    celebration = null;
                                    openRoute("/matches");
                                } else if (hit != null && !"more".equals(hit.item.kind)) {
                                    // tap an island: it opens wide (the others shrink to round icons) with its panel
                                    // (a match: events / stats / info); tap it again to close. Long press = its screen.
                                    String hid = baseId(hit.item.id);
                                    if (hid.equals(focusedId)) closeFocus();
                                    else openFocus(hid);
                                    return true;
                                } else {
                                    expanded = !expanded; // "+n": show them all
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
        IslandArt.Item focused = null;
        if (celebration == null && focusedId == null && autoFocusCritical) {
            // a favourite's deciding minutes: that island opens by itself (once per match)
            for (IslandArt.Item it : items) if (it.critical && !autoFocused.contains(it.id)) { autoFocused.add(it.id); focusedId = it.id; focusAt = System.currentTimeMillis(); }
        }
        if (focusedId != null) for (IslandArt.Item it : items) if (focusedId.equals(it.id)) focused = it;
        if (focusedId != null && focused == null) closeFocusQuiet();
        if (celebration != null) {
            shown.add(celebration);
        } else if (focused != null) {
            // the opened island wide in the middle of the round icons of the others
            int minis = 0;
            for (IslandArt.Item it : items) {
                if (it == focused) { shown.add(it); continue; }
                if (minis >= 6) continue;
                IslandArt.Item m = copy(it);
                m.mini = true;
                shown.add(m);
                minis++;
            }
        } else if (expanded) {
            shown.addAll(items.subList(0, Math.min(items.size(), 8)));
        } else {
            int max = 5;
            shown.addAll(items.subList(0, Math.min(items.size(), max)));
            if (items.size() > max) {
                IslandArt.Item more = new IslandArt.Item();
                more.kind = "more";
                more.id = "more";
                more.more = items.size() - max;
                shown.add(more);
            }
        }
        StringBuilder sig = new StringBuilder(expanded ? "E" : "C").append(Hub.bool(this, "islandsHidden", false)).append(Hub.bool(this, "islandBubble", true)).append(focusedId).append(panelTab).append(panelVersion).append(occBrowse);
        for (IslandArt.Item it : shown) sig.append('|').append(it.id).append(it.kind).append(it.more).append(it.mini);
        if (!sig.toString().equals(islandSignature)) {
            islandSignature = sig.toString();
            rebuildPills(shown, focused);
            if (focused != null && celebration == null) {
                View panel = buildPanel(focused);
                if (panel != null) {
                    LinearLayout.LayoutParams pl = new LinearLayout.LayoutParams(Math.min(getResources().getDisplayMetrics().widthPixels - dp(16), dp("match".equals(focused.kind) ? 480 : 400)), LinearLayout.LayoutParams.WRAP_CONTENT);
                    pl.topMargin = dp(2);
                    island.addView(panel, pl);
                    panel.setAlpha(0f);
                    panel.setTranslationY(-dp(10));
                    panel.animate().alpha(1f).translationY(0).setDuration(220).start();
                }
            }
        }
        if (focused != null && "match".equals(focused.kind) && focused.live() && !focused.matchId.isEmpty()) {
            Long at = detailsAt.get(focused.matchId);
            if (at == null || System.currentTimeMillis() - at > 60_000L) loadDetails(focused);
        }
        if (focused != null && System.currentTimeMillis() - focusAt > ("match".equals(focused.kind) ? 45_000L : 15_000L)) closeFocus();
        for (int i = 0; i < pills.size() && i < shown.size(); i++) {
            PillView p = pills.get(i);
            p.item = shown.get(i);
            p.now = now;
            p.requestLayout();
            p.invalidate();
        }
    }

    /** Lay the pills out in rows that fit the screen width (one row normally; a second when expanded and wide). */
    private void rebuildPills(List<IslandArt.Item> shown, IslandArt.Item focused) {
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
            p.big = expanded || it == focused;
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
            if (it == focused) {
                // opening wide
                p.setScaleX(0.8f);
                p.animate().scaleX(1f).setDuration(260).setInterpolator(new android.view.animation.OvershootInterpolator(1.2f)).start();
            }
            first = false;
        }
        // the controls at the end of the islands: hide / show (eye) and voice commands (microphone)
        if (Hub.bool(this, "islandBubble", true) && celebration == null) {
            if (row == null) {
                row = new LinearLayout(this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                row.setGravity(Gravity.CENTER);
                row.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
                island.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT));
            }
            row.addView(controlsView(), new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        }
    }

    private android.widget.ImageView eyeView;
    private View eyeDot;
    private Boolean eyeShownHidden;

    private View controlsView() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.HORIZONTAL);
        box.setGravity(Gravity.CENTER_VERTICAL);
        box.setPadding(dp(6), dp(8), dp(6), dp(8));
        FrameLayout eye = new FrameLayout(this);
        eyeView = roundIcon();
        eye.addView(eyeView, new FrameLayout.LayoutParams(dp(34), dp(34), Gravity.CENTER));
        eyeDot = new View(this);
        android.graphics.drawable.GradientDrawable dg = new android.graphics.drawable.GradientDrawable();
        dg.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        dg.setColor(0xFFEF4444);
        eyeDot.setBackground(dg);
        eyeDot.setVisibility(View.GONE);
        eye.addView(eyeDot, new FrameLayout.LayoutParams(dp(10), dp(10), Gravity.TOP | Gravity.END));
        eye.setOnClickListener(v -> {
            v.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP);
            focusedId = null;
            Hub.set(this, "islandsHidden", !Hub.bool(this, "islandsHidden", false));
        });
        eyeShownHidden = null;
        box.addView(eye, new LinearLayout.LayoutParams(dp(38), dp(38)));
        android.widget.ImageView mic = roundIcon();
        mic.setImageBitmap(PlayerActivity.icon(I_MIC, dp(18), 0xFF34D399, false));
        mic.setOnClickListener(v -> {
            v.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP);
            Intent vi = new Intent(this, VoiceActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { startActivity(vi); } catch (Exception ignored) { }
        });
        // long press: the trip options (go to a saved place, the current trip's plan / end)
        mic.setOnLongClickListener(v -> {
            v.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS);
            Intent tm = new Intent(this, TripMenuActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { startActivity(tm); } catch (Exception ignored) { }
            return true;
        });
        LinearLayout.LayoutParams ml = new LinearLayout.LayoutParams(dp(34), dp(34));
        ml.setMarginStart(dp(4));
        box.addView(mic, ml);
        updateControls(Hub.bool(this, "islandsHidden", false));
        return box;
    }

    private android.widget.ImageView roundIcon() {
        android.widget.ImageView iv = new android.widget.ImageView(this);
        iv.setScaleType(android.widget.ImageView.ScaleType.CENTER);
        android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
        g.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        g.setColor(0xE6000000);
        g.setStroke(dp(1), 0x33FFFFFF);
        iv.setBackground(g);
        return iv;
    }

    private static final String I_MIC = "M12 2A3 3 0 0 1 15 5V12A3 3 0 0 1 9 12V5A3 3 0 0 1 12 2ZM19 10V12A7 7 0 0 1 5 12V10M12 19V22";

    /** The eye's picture (open / crossed out) and the red dot that pulses while hidden when something happens. */
    private void updateControls(boolean hidden) {
        if (eyeView == null) return;
        if (eyeShownHidden == null || eyeShownHidden != hidden) {
            eyeShownHidden = hidden;
            eyeView.setImageBitmap(PlayerActivity.icon(hidden ? I_EYE_OFF : I_EYE, dp(18), hidden ? 0xB3FFFFFF : 0xFF34D399, false));
        }
        if (hidden && bubbleAlert) {
            eyeDot.setVisibility(View.VISIBLE);
            eyeDot.setAlpha(0.4f + 0.6f * (float) Math.abs(Math.sin(System.currentTimeMillis() / 500.0)));
        } else {
            eyeDot.setVisibility(View.GONE);
        }
    }

    // ---- an island opened wide, with its panel ----

    /** the island opened wide (its id), when it was opened, the panel's tab, bumped when its data arrives */
    private String focusedId;
    private long focusAt;
    private int panelTab = 0;
    private int panelVersion = 0;
    private final boolean autoFocusCritical = true;
    private final java.util.Set<String> autoFocused = new java.util.HashSet<>();
    private final java.util.Map<String, JSONObject> details = new java.util.HashMap<>();
    private final java.util.Map<String, Long> detailsAt = new java.util.HashMap<>();
    private final java.util.Set<String> detailsLoading = new java.util.HashSet<>();

    private static String baseId(String id) {
        return id == null ? "" : id;
    }

    private void openFocus(String id) {
        focusedId = id;
        focusAt = System.currentTimeMillis();
        panelTab = 0;
        expanded = false;
        islandSignature = "";
        tick();
    }

    private void closeFocus() {
        closeFocusQuiet();
        tick();
    }

    private void closeFocusQuiet() {
        focusedId = null;
        occBrowse = -1;
        islandSignature = "";
    }

    /** a touch inside the panel keeps it open longer */
    private void touchFocus() {
        focusAt = System.currentTimeMillis();
    }

    private static IslandArt.Item copy(IslandArt.Item o) {
        IslandArt.Item it = new IslandArt.Item();
        it.kind = o.kind; it.id = o.id; it.matchId = o.matchId; it.leagueId = o.leagueId; it.homeId = o.homeId;
        it.home = o.home; it.away = o.away; it.homeLogo = o.homeLogo; it.awayLogo = o.awayLogo; it.status = o.status;
        it.sh = o.sh; it.sa = o.sa; it.elapsed = o.elapsed; it.kickoff = o.kickoff; it.kickoffText = o.kickoffText; it.fav = o.fav;
        it.title = o.title; it.at = o.at; it.ckind = o.ckind; it.league = o.league; it.more = o.more; it.critical = o.critical;
        return it;
    }

    private android.widget.TextView label(String text, float sp, int color, boolean heavy) {
        android.widget.TextView t = new android.widget.TextView(this);
        t.setText(text);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setTypeface(heavy ? Fonts.black(this) : Fonts.bold(this));
        t.setIncludeFontPadding(false);
        return t;
    }

    private android.widget.TextView chip(String text, boolean on, int onColor, Runnable tap) {
        android.widget.TextView t = label(text, 13, on ? 0xFF000000 : 0xE6FFFFFF, true);
        t.setGravity(Gravity.CENTER);
        t.setPadding(dp(12), dp(8), dp(12), dp(8));
        android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
        g.setCornerRadius(dp(40));
        g.setColor(on ? onColor : 0x1FFFFFFF);
        t.setBackground(g);
        t.setOnClickListener(v -> { touchFocus(); tap.run(); });
        return t;
    }

    private LinearLayout panelCard() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        card.setPadding(dp(14), dp(12), dp(14), dp(12));
        android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
        g.setCornerRadius(dp(26));
        g.setColor(0xF2050507);
        g.setStroke(dp(1), 0x26FFFFFF);
        card.setBackground(g);
        card.setOnClickListener(v -> touchFocus()); // eats the touch (no drag / tap-through)
        return card;
    }

    private LinearLayout hrow() {
        LinearLayout r = new LinearLayout(this);
        r.setOrientation(LinearLayout.HORIZONTAL);
        r.setGravity(Gravity.CENTER_VERTICAL);
        return r;
    }

    private void addChipRow(LinearLayout card, android.widget.TextView... chips) {
        LinearLayout r = hrow();
        r.setGravity(Gravity.CENTER);
        for (android.widget.TextView c : chips) {
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
            lp.setMargins(dp(3), 0, dp(3), 0);
            r.addView(c, lp);
        }
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(10);
        card.addView(r, lp);
    }

    /** The panel under the opened island (null: none). */
    private View buildPanel(IslandArt.Item it) {
        if ("match".equals(it.kind) && !it.matchId.isEmpty()) return matchPanel(it);
        if (it.id.startsWith("occ-")) return occasionPanel(it);
        if ("az-voice".equals(it.id)) {
            LinearLayout card = panelCard();
            card.addView(label(it.title, 15, 0xFFFFFFFF, true));
            addChipRow(card,
                    chip("التالي ✓", true, 0xFF34D399, () -> azkarCommand("next", null)),
                    chip("كرّر", false, 0, () -> azkarCommand("repeat", null)),
                    chip("إنهاء", false, 0, () -> { azkarCommand("stop", null); closeFocus(); }));
            return card;
        }
        if ("trip".equals(it.id)) return tripPanel();
        if ("mosque".equals(it.id)) {
            if (!roadMosques.isEmpty()) return roadPanel();
            LinearLayout card = panelCard();
            card.addView(label(it.minute, 14, 0xFFFFFFFF, true));
            if (road != null && !road.status.isEmpty()) card.addView(label(road.status, 11, 0x99FFFFFF, false));
            addChipRow(card, chip("أقرب مسجد على الخريطة", true, 0xFF34D399, () -> {
                Intent m = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("geo:0,0?q=" + android.net.Uri.encode("مسجد")));
                m.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try { startActivity(m); } catch (Exception ignored) { }
                closeFocus();
            }));
            return card;
        }
        if ("mosque-perm".equals(it.id)) {
            LinearLayout card = panelCard();
            card.addView(label("أقرب مسجد على طريقك يحتاج إذن الموقع", 14, 0xFFFFFFFF, true));
            addChipRow(card, chip("تفعيل الموقع", true, 0xFF34D399, () -> {
                Intent i = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("askLocation", true);
                try { startActivity(i); } catch (Exception ignored) { }
                closeFocus();
            }));
            return card;
        }
        if ("countdown".equals(it.kind) && "reminder".equals(it.ckind)) {
            LinearLayout card = panelCard();
            card.addView(label(it.title, 16, 0xFFFFFFFF, true));
            card.addView(label("التذكير · " + new java.text.SimpleDateFormat("h:mm a", new Locale("ar")).format(new java.util.Date(it.at)), 12, 0x80FFFFFF, false));
            final String rid = it.id.startsWith("rem-") ? it.id.substring(4) : it.id;
            addChipRow(card,
                    chip("تم ✓", true, 0xFF34D399, () -> markDone(it.id, rid)),
                    chip("بعد 10 د", false, 0, () -> snooze(rid, 10)),
                    chip("فتح", false, 0, () -> openRoute("/dashboard")));
            return card;
        }
        if ("countdown".equals(it.kind)) {
            // a prayer: the coming times of the day
            LinearLayout card = panelCard();
            LinearLayout r = hrow();
            JSONArray list = Widgets.countdowns(this);
            long now = System.currentTimeMillis();
            int n = 0;
            for (int i = 0; list != null && i < list.length() && n < 4; i++) {
                JSONObject c = list.optJSONObject(i);
                if (c == null || c.optLong("at") < now) continue;
                LinearLayout col = new LinearLayout(this);
                col.setOrientation(LinearLayout.VERTICAL);
                col.setGravity(Gravity.CENTER);
                boolean iq = "iqamah".equals(c.optString("kind"));
                col.addView(label((iq ? "إقامة " : "") + c.optString("title"), 11, iq ? 0xFF34D399 : 0xCCFFFFFF, false));
                col.addView(label(new java.text.SimpleDateFormat("h:mm", Locale.US).format(new java.util.Date(c.optLong("at"))), 17, 0xFFFFFFFF, true));
                r.addView(col, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
                n++;
            }
            card.addView(r);
            addChipRow(card, chip("الأذان الآن ▶", false, 0, () -> openRoute("/dashboard")), chip("المواقيت", false, 0, () -> openRoute("/dashboard")));
            return card;
        }
        if ("azkar".equals(it.kind)) {
            LinearLayout card = panelCard();
            card.addView(label(it.title, 16, 0xFFFFFFFF, true));
            final String aid = it.id.startsWith("az-") ? it.id.substring(3) : it.id;
            addChipRow(card, chip("تم ✓", true, 0xFF34D399, () -> markDone(it.id, aid)), chip("فتح الأذكار", false, 0, () -> openRoute("/football")));
            return card;
        }
        return null;
    }

    // ---- reminders said by voice ("ذكرني بعد ربع ساعة ...") ----

    private final java.util.Set<String> spokenReminders = new java.util.HashSet<>();

    private void voiceReminderItems(List<IslandArt.Item> out, long now) {
        Object v = Hub.get(this, "voiceReminders");
        if (!(v instanceof JSONArray)) return;
        JSONArray list = (JSONArray) v;
        String today = Cloud.day(now);
        for (int i = 0; i < list.length(); i++) {
            JSONObject r = list.optJSONObject(i);
            if (r == null) continue;
            long at = r.optLong("at");
            String id = "rem-" + r.optString("id");
            if (now < at - 15 * 60_000L || now > at + 30 * 60_000L || Hub.has(this, "doneToday:" + today, id)) continue;
            if (Widgets.json(this, "snoozed").optLong(r.optString("id")) > now) continue;
            if (now >= at && spokenReminders.add(id)) {
                say("تذكير: " + r.optString("label"));
                android.os.Vibrator vib = (android.os.Vibrator) getSystemService(VIBRATOR_SERVICE);
                try { if (vib != null) vib.vibrate(400); } catch (Exception ignored) { }
            }
            IslandArt.Item it = new IslandArt.Item();
            it.kind = "countdown";
            it.ckind = "reminder";
            it.id = id;
            it.title = r.optString("label");
            it.at = at;
            out.add(it);
        }
    }

    // ---- a planned trip: the next prayer on the way and its mosque ----

    private void tripItem(List<IslandArt.Item> out, long now) {
        JSONObject t = Trip.current(this);
        if (t == null) return;
        JSONArray plan = t.optJSONArray("plan");
        JSONObject next = null;
        for (int i = 0; plan != null && i < plan.length(); i++) {
            JSONObject r = plan.optJSONObject(i);
            if (r != null && r.optLong("at") > now - 20 * 60_000L) { next = r; break; }
        }
        IslandArt.Item it = new IslandArt.Item();
        it.kind = "countdown";
        it.ckind = "mosque";
        it.id = "trip";
        if (next == null) {
            it.title = "🧭 إلى " + Trip.placeName(t.optString("name"));
            long left = t.optLong("startAt") + t.optLong("seconds") * 1000L - now;
            it.minute = left > 0 ? "الوصول بعد " + Trip.duration(left / 1000) : "وصلت";
            it.more = 0;
            it.at = now + Math.max(0, left);
        } else {
            JSONObject m = next.optJSONObject("mosque");
            it.title = "🧭 " + next.optString("prayer") + " " + Trip.clock(next.optLong("at")) + (m != null ? " · " + m.optString("name") : "");
            it.minute = next.optBoolean("after") ? "بعد الوصول" : "عند الكيلو " + next.optLong("km");
            it.more = 0;
            it.at = next.optLong("at");
        }
        out.add(it);
    }

    private View tripPanel() {
        JSONObject t = Trip.current(this);
        if (t == null) return null;
        LinearLayout card = panelCard();
        card.addView(label("🧭 " + Trip.placeName(t.optString("name")) + " · " + Trip.duration(t.optLong("seconds")) + " · " + Math.round(t.optLong("meters") / 1000.0) + " كم", 15, 0xFFFFFFFF, true));
        JSONArray plan = t.optJSONArray("plan");
        if (plan == null || plan.length() == 0) card.addView(label("لا صلاة أثناء الطريق", 12, 0x99FFFFFF, false));
        for (int i = 0; plan != null && i < plan.length(); i++) {
            JSONObject r = plan.optJSONObject(i);
            JSONObject m = r.optJSONObject("mosque");
            LinearLayout row = hrow();
            row.setPadding(0, dp(8), 0, 0);
            LinearLayout col = new LinearLayout(this);
            col.setOrientation(LinearLayout.VERTICAL);
            col.addView(label(r.optString("prayer") + "  " + Trip.clock(r.optLong("at")), 14, 0xFFFFFFFF, true));
            String sub = r.optBoolean("after") ? "بعد وصولك" : "عند الكيلو " + r.optLong("km") + (m != null ? " · " + m.optString("name") + (r.optLong("off") > 0 ? " (" + RoadPrayer.distanceText(r.optLong("off")) + " عن الطريق)" : "") : " · لا مسجد معروف قريب");
            android.widget.TextView st = label(sub, 11, 0x99FFFFFF, false);
            st.setMaxLines(2);
            col.addView(st);
            row.addView(col, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
            if (m != null) {
                final double la = m.optDouble("lat"), lo = m.optDouble("lon");
                row.addView(chip("🧭", false, 0, () -> navigate(la, lo)));
            }
            card.addView(row);
        }
        addChipRow(card,
                chip("🔊 اقرأ الخطة", false, 0, () -> say(Trip.summary(t))),
                chip("إنهاء الرحلة", false, 0, () -> { Trip.stop(this); closeFocus(); }));
        if (!t.optBoolean("google")) card.addView(label("المسار تقريبي (" + GMaps.lastError + ")", 10, 0x66FFFFFF, false));
        else if (!t.optString("via").isEmpty()) card.addView(label("المسار: " + t.optString("via"), 10, 0x66FFFFFF, false));
        return card;
    }

    private void navigate(double la, double lo) {
        Intent nav = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("google.navigation:q=" + la + "," + lo));
        nav.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { startActivity(nav); } catch (Exception e) {
            Intent geo = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("geo:" + la + "," + lo + "?q=" + la + "," + lo));
            geo.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { startActivity(geo); } catch (Exception ignored) { }
        }
        closeFocus();
    }

    // ---- prayer on the road ----

    private RoadPrayer road;
    private List<RoadPrayer.Mosque> roadMosques = new ArrayList<>();
    private String roadPrayer = "";
    private long roadIqamah = 0;

    /** From 15 minutes before an adhan until its iqamah, while driving: the nearest mosque ahead. */
    private void roadItem(List<IslandArt.Item> out, long now) {
        if (road == null) road = new RoadPrayer(this, () -> handler.post(() -> { if (focusedId != null && focusedId.equals("mosque")) { panelVersion++; } }));
        JSONArray list = Widgets.dayCountdowns(this);
        String name = null, nextName = null;
        long iq = 0, nextIq = 0;
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject c = list.optJSONObject(i);
            if (c == null || !"azan".equals(c.optString("kind"))) continue;
            String t = c.optString("title");
            if (t.contains("الشروق") || t.contains("الضحى")) continue;
            long at = c.optLong("at");
            long iqAt = at;
            for (int k = 0; k < list.length(); k++) {
                JSONObject q = list.optJSONObject(k);
                if (q != null && "iqamah".equals(q.optString("kind")) && q.optString("title").contains(t) && q.optLong("at") >= at && q.optLong("at") - at < 3 * 3600_000L) { iqAt = q.optLong("at"); break; }
            }
            if (iqAt == at) iqAt = at + 15 * 60_000L;
            // until 5 minutes after the iqamah (still time to join the congregation)
            if (now >= at - 15 * 60_000L && now < iqAt + 5 * 60_000L) { name = t; iq = iqAt; break; }
            // "always show": the next prayer's mosque at any time
            if (Hub.bool(this, "roadPrayerAlways", false) && at > now && (nextIq == 0 || iqAt < nextIq)) { nextName = t; nextIq = iqAt; }
        }
        if (name == null && nextName != null) { name = nextName; iq = nextIq; }
        road.setActive(name != null);
        if (name == null) { roadMosques = new ArrayList<>(); return; }
        roadPrayer = name;
        roadIqamah = iq;
        boolean afterIqamah = now >= iq;
        IslandArt.Item it = new IslandArt.Item();
        it.kind = "countdown";
        it.ckind = "mosque";
        it.id = "mosque";
        it.at = iq;
        // not ready yet: say why (so the island is never silently missing)
        String wait = !RoadPrayer.permitted(this) ? "فعّل الموقع لأقرب مسجد" : !Hub.bool(this, "roadPrayer", true) ? null
                : !road.hasFix() ? (road.status.isEmpty() ? "جاري تحديد موقعك..." : road.status) : null;
        if (wait == null && Hub.bool(this, "roadPrayer", true)) {
            // after the iqamah: can you still reach the congregation within its last 5 minutes?
            roadMosques = road.ahead(afterIqamah ? iq + 5 * 60_000L : iq);
            if (roadMosques.isEmpty()) wait = road.searching() ? "أبحث عن المساجد القريبة..." : road.failed() ? "تعذّر جلب المساجد · سأعيد المحاولة" : "لا مساجد قريبة في اتجاهك";
        }
        if (!Hub.bool(this, "roadPrayer", true)) return;
        if (wait != null) {
            it.id = RoadPrayer.permitted(this) ? "mosque" : "mosque-perm";
            it.title = "🕌 " + roadPrayer;
            it.minute = wait;
            it.more = 1;
            out.add(it);
            return;
        }
        RoadPrayer.Mosque m = roadMosques.get(0);
        it.title = afterIqamah ? "🕌 فاتتك الإقامة · تلحق الجماعة؟" : "🕌 " + m.name;
        it.minute = RoadPrayer.distanceText(m.meters) + " · " + Math.max(1, Math.round(m.eta / 60_000f)) + " د";
        it.more = m.state;
        it.at = now + m.eta;
        out.add(it);
    }

    private View roadPanel() {
        LinearLayout card = panelCard();
        long nowMs = System.currentTimeMillis();
        long left = Math.max(0, (roadIqamah - nowMs) / 60_000L);
        card.addView(label(nowMs >= roadIqamah
                ? "صلاة " + roadPrayer + " · أقيمت الصلاة منذ " + Math.max(0, (nowMs - roadIqamah) / 60_000L) + " د · تلحق الجماعة؟"
                : "صلاة " + roadPrayer + " على الطريق · الإقامة بعد " + left + " د", 14, 0xFFFFFFFF, true));
        String[] states = {"🟢 تصل قبل الإقامة", "🟡 تتأخر دقائق", "🔴 لن تلحق"};
        if (road != null && !road.source.isEmpty()) card.addView(label("المصدر: " + road.source, 10, 0x66FFFFFF, false));
        for (int i = 0; i < roadMosques.size() && i < 3; i++) {
            RoadPrayer.Mosque m = roadMosques.get(i);
            LinearLayout r = hrow();
            r.setPadding(0, dp(8), 0, 0);
            LinearLayout col = new LinearLayout(this);
            col.setOrientation(LinearLayout.VERTICAL);
            android.widget.TextView n = label(m.name, 14, 0xFFFFFFFF, true);
            n.setSingleLine(true);
            n.setEllipsize(android.text.TextUtils.TruncateAt.END);
            col.addView(n);
            col.addView(label(RoadPrayer.distanceText(m.meters) + " · " + Math.max(1, Math.round(m.eta / 60_000f)) + " د · " + states[m.state], 11, 0x99FFFFFF, false));
            r.addView(col, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
            final double la = m.lat, lo = m.lon;
            r.addView(chip("🧭 اذهب", i == 0, 0xFF34D399, () -> {
                Intent nav = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("google.navigation:q=" + la + "," + lo));
                nav.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try { startActivity(nav); } catch (Exception e) {
                    Intent geo = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("geo:" + la + "," + lo + "?q=" + la + "," + lo));
                    geo.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    try { startActivity(geo); } catch (Exception ignored) { }
                }
                closeFocus();
            }));
            card.addView(r);
        }
        return card;
    }

    /** Friday, fasting and the seasons. */
    /** browsing the occasions with ‹ › (index in Occasions.aroundDays, -1 = the island's own) */
    private int occBrowse = -1;
    private java.util.List<long[]> occDays;

    private View occasionPanel(IslandArt.Item it) {
        LinearLayout card = panelCard();
        card.addView(label(it.title, 16, 0xFFFFFFFF, true));
        // ‹ the previous / the next occasion ›
        if (occDays == null || occBrowse < 0) {
            occDays = Occasions.aroundDays();
            long noon = System.currentTimeMillis();
            occBrowse = 0;
            while (occBrowse < occDays.size() - 1 && occDays.get(occBrowse)[0] < noon - 12 * 3600_000L) occBrowse++;
        }
        if (!occDays.isEmpty()) {
            final int i = Math.max(0, Math.min(occDays.size() - 1, occBrowse));
            LinearLayout nav = hrow();
            nav.setPadding(0, dp(10), 0, 0);
            nav.addView(chip("‹ السابقة", false, 0, () -> { occBrowse = Math.max(0, i - 1); islandSignature = ""; tick(); }));
            android.widget.TextView d = label(Occasions.describe(occDays.get(i)[0]), 12, 0xE6FFFFFF, true);
            d.setGravity(Gravity.CENTER);
            nav.addView(d, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
            nav.addView(chip("التالية ›", false, 0, () -> { occBrowse = Math.min(occDays.size() - 1, i + 1); islandSignature = ""; tick(); }));
            card.addView(nav);
        }
        final long now = System.currentTimeMillis();
        Runnable doneToday = () -> { Hub.toggle(this, "doneToday:" + Cloud.day(now), it.id); closeFocus(); };
        switch (it.id) {
            case "occ-kahf":
                card.addView(label("«من قرأ سورة الكهف يوم الجمعة أضاء له من النور ما بين الجمعتين»", 12, 0x99FFFFFF, false));
                addChipRow(card, chip("▶ تشغيل الكهف", true, 0xFF34D399, () -> {
                    QuranState q = QuranState.load(this);
                    q.surah = 18;
                    playQuran(q);
                    closeFocus();
                }), chip("قرأتها ✓", false, 0, doneToday));
                break;
            case "occ-fast":
                addChipRow(card, chip("سأصوم ✓", true, 0xFF34D399, () -> {
                    Hub.set(this, "fastDate", Cloud.day(now + 24 * 3600_000L));
                    closeFocus();
                }), chip("ليس هذه المرة", false, 0, doneToday));
                break;
            case "occ-iftar":
                card.addView(label("«ذهب الظمأ وابتلت العروق وثبت الأجر إن شاء الله»", 12, 0x99FFFFFF, false));
                addChipRow(card, chip("الصفحة الرئيسية", false, 0, () -> openRoute("/dashboard")));
                break;
            default:
                addChipRow(card, chip("تم ✓", true, 0xFF34D399, doneToday));
        }
        return card;
    }

    /** A reminder / dhikr done today: hidden here at once, the site marks it (and syncs it). */
    private void markDone(String itemId, String id) {
        Hub.toggle(this, "doneToday:" + Cloud.day(System.currentTimeMillis()), itemId);
        Hub.send(this, "reminderDone", id);
        closeFocus();
    }

    private void snooze(String id, int minutes) {
        JSONObject o = Widgets.json(this, "snoozed");
        try {
            o.put(id, System.currentTimeMillis() + minutes * 60_000L);
        } catch (Exception ignored) {
        }
        NativeIslandPlugin.prefs(this).edit().putString("snoozed", o.toString()).apply();
        closeFocus();
    }

    // ---- the match panel: events, stats, info (the site's match details) ----

    private View matchPanel(IslandArt.Item it) {
        JSONObject d = details.get(it.matchId);
        Long at = detailsAt.get(it.matchId);
        long maxAge = it.live() ? 60_000L : 10 * 60_000L;
        if (d == null || at == null || System.currentTimeMillis() - at > maxAge) loadDetails(it);
        LinearLayout card = panelCard();
        // header: league · minute / status
        String head = it.league + (it.live() ? " · " + IslandArt.minuteText(it) : it.finished() ? " · انتهت" : " · " + it.kickoffText);
        android.widget.TextView h = label(head, 12, 0x99FFFFFF, false);
        h.setGravity(Gravity.CENTER);
        card.addView(h, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        // tabs
        LinearLayout tabs = hrow();
        String[] names = {"الأحداث", "الإحصائيات", "التشكيلة", "الترتيب", "معلومات"};
        for (int i = 0; i < names.length; i++) {
            final int t = i;
            android.widget.TextView c = chip(names[i], panelTab == i, 0xFF34D399, () -> { panelTab = t; islandSignature = ""; tick(); });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
            lp.setMargins(dp(2), dp(8), dp(2), dp(8));
            c.setPadding(dp(4), dp(8), dp(4), dp(8));
            c.setTextSize(12);
            tabs.addView(c, lp);
        }
        card.addView(tabs);
        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        // long tabs (line-ups, table) scroll inside the panel
        android.widget.ScrollView sv = new android.widget.ScrollView(this) {
            @Override
            protected void onMeasure(int w, int h) {
                super.onMeasure(w, View.MeasureSpec.makeMeasureSpec(Math.round(getResources().getDisplayMetrics().heightPixels * 0.5f), View.MeasureSpec.AT_MOST));
            }
        };
        sv.setVerticalScrollBarEnabled(false);
        sv.addView(body);
        sv.setOnTouchListener((v, e) -> { touchFocus(); return false; });
        card.addView(sv, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        if (d == null) {
            android.widget.TextView w = label(detailsLoading.contains(it.matchId) ? "جاري تحميل التفاصيل..." : "لا توجد تفاصيل بعد", 13, 0x80FFFFFF, false);
            w.setGravity(Gravity.CENTER);
            w.setPadding(0, dp(10), 0, dp(10));
            body.addView(w, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        } else if (panelTab == 0) {
            eventsTab(body, d, it);
        } else if (panelTab == 1) {
            statsTab(body, d, it);
        } else if (panelTab == 2) {
            lineupTab(body, d, it);
        } else if (panelTab == 3) {
            tableTab(body, d);
        } else {
            infoTab(body, d);
        }
        boolean voice = Hub.bool(this, "voiceFollow", false);
        addChipRow(card,
                chip(voice ? "🔊 المتابعة الصوتية" : "🔈 تابع صوتياً", voice, 0xFF34D399, () -> {
                    Hub.set(this, "voiceFollow", !voice);
                    if (!voice) say("المتابعة الصوتية مفعّلة. " + it.home + " " + it.sh + "، " + it.away + " " + it.sa);
                    islandSignature = "";
                }),
                chip("المباريات", false, 0, () -> openRoute("/matches")));
        return card;
    }

    /** One line per goal / red card, on its team's side, the minute in the middle (like a timeline). */
    private void eventsTab(LinearLayout body, JSONObject d, IslandArt.Item it) {
        List<JSONObject> ev = new ArrayList<>();
        JSONArray sc = d.optJSONArray("scorers"), rc = d.optJSONArray("redCards");
        try {
            for (int i = 0; sc != null && i < sc.length(); i++) ev.add(new JSONObject(sc.getJSONObject(i).toString()).put("icon", "⚽"));
            for (int i = 0; rc != null && i < rc.length(); i++) ev.add(new JSONObject(rc.getJSONObject(i).toString()).put("icon", "🟥"));
        } catch (Exception ignored) {
        }
        Collections.sort(ev, (a, b) -> Double.compare(minuteValue(a.optString("minute")), minuteValue(b.optString("minute"))));
        // team names row
        LinearLayout names = hrow();
        names.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        android.widget.TextView hn = label(it.home, 12, 0xCCFFFFFF, true), an = label(it.away, 12, 0xCCFFFFFF, true);
        an.setGravity(Gravity.END);
        names.addView(hn, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        android.widget.TextView score = label(it.sh + " - " + it.sa, 16, it.live() ? 0xFF34D399 : 0xFFFFFFFF, true);
        names.addView(score);
        names.addView(an, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        body.addView(names);
        if (ev.isEmpty()) {
            android.widget.TextView w = label("لا أهداف ولا بطاقات حمراء بعد", 13, 0x80FFFFFF, false);
            w.setGravity(Gravity.CENTER);
            w.setPadding(0, dp(10), 0, dp(4));
            body.addView(w, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
            return;
        }
        for (int i = Math.max(0, ev.size() - 7); i < ev.size(); i++) {
            JSONObject e = ev.get(i);
            boolean home = "home".equals(e.optString("side"));
            LinearLayout r = hrow();
            r.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
            r.setPadding(0, dp(5), 0, dp(5));
            String who = e.optString("icon") + " " + e.optString("player") + (e.optString("note").isEmpty() ? "" : " (" + e.optString("note") + ")");
            android.widget.TextView left = label(home ? who : "", 13, 0xFFFFFFFF, false);
            android.widget.TextView right = label(home ? "" : who, 13, 0xFFFFFFFF, false);
            right.setGravity(Gravity.END);
            left.setSingleLine(true);
            right.setSingleLine(true);
            left.setEllipsize(android.text.TextUtils.TruncateAt.END);
            right.setEllipsize(android.text.TextUtils.TruncateAt.END);
            android.widget.TextView min = label(e.optString("minute"), 12, 0xFF34D399, true);
            min.setGravity(Gravity.CENTER);
            r.addView(left, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
            r.addView(min, new LinearLayout.LayoutParams(dp(46), LinearLayout.LayoutParams.WRAP_CONTENT));
            r.addView(right, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
            body.addView(r);
        }
    }

    /** The stats as two-colour bars (home blue / away red, like comparing teams on the site). */
    private void statsTab(LinearLayout body, JSONObject d, IslandArt.Item it) {
        JSONArray st = d.optJSONArray("stats");
        if (st == null || st.length() == 0) {
            android.widget.TextView w = label("لا إحصائيات متاحة لهذه المباراة", 13, 0x80FFFFFF, false);
            w.setGravity(Gravity.CENTER);
            w.setPadding(0, dp(10), 0, dp(10));
            body.addView(w, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
            return;
        }
        for (int i = 0; i < st.length() && i < 6; i++) {
            JSONObject r = st.optJSONObject(i);
            if (r == null) continue;
            String hv = r.optString("home"), av = r.optString("away");
            double hn = num(hv), an = num(av);
            LinearLayout line = hrow();
            line.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
            android.widget.TextView a = label(hv, 13, 0xFFFFFFFF, true), b = label(av, 13, 0xFFFFFFFF, true);
            android.widget.TextView n = label(r.optString("name"), 11, 0x99FFFFFF, false);
            n.setGravity(Gravity.CENTER);
            b.setGravity(Gravity.END);
            line.addView(a, new LinearLayout.LayoutParams(dp(48), LinearLayout.LayoutParams.WRAP_CONTENT));
            line.addView(n, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
            line.addView(b, new LinearLayout.LayoutParams(dp(48), LinearLayout.LayoutParams.WRAP_CONTENT));
            LinearLayout.LayoutParams ll = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            ll.topMargin = dp(6);
            body.addView(line, ll);
            LinearLayout bar = hrow();
            bar.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
            double sum = hn + an;
            float hw = sum <= 0 ? 0.5f : (float) (hn / sum);
            View hb = new View(this), ab = new View(this);
            hb.setBackground(roundRect(0xFF3B82F6));
            ab.setBackground(roundRect(0xFFEF4444));
            LinearLayout.LayoutParams hl = new LinearLayout.LayoutParams(0, dp(5), Math.max(0.02f, hw));
            hl.setMarginEnd(dp(3));
            bar.addView(hb, hl);
            bar.addView(ab, new LinearLayout.LayoutParams(0, dp(5), Math.max(0.02f, 1 - hw)));
            LinearLayout.LayoutParams bl = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            bl.topMargin = dp(3);
            body.addView(bar, bl);
        }
    }

    private android.graphics.drawable.GradientDrawable roundRect(int color) {
        android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp(4));
        return g;
    }

    private static double num(String v) {
        try {
            return Double.parseDouble(v.replace("%", "").trim());
        } catch (Exception e) {
            return 0;
        }
    }

    /** The two line-ups side by side (home on the right in RTL): number, name, position; substitutes below. */
    private void lineupTab(LinearLayout body, JSONObject d, IslandArt.Item it) {
        JSONObject lu = d.optJSONObject("lineups");
        JSONObject h = lu != null ? lu.optJSONObject("home") : null, a = lu != null ? lu.optJSONObject("away") : null;
        if (h == null && a == null) {
            JSONObject f = d.optJSONObject("formations");
            String txt = f != null ? "الخطة: " + f.optString("home", "?") + "  ×  " + f.optString("away", "?") + "\nالتشكيلة لم تُعلن بعد" : "التشكيلة لم تُعلن بعد (تُعلن عادة قبل المباراة بساعة)";
            android.widget.TextView w = label(txt, 13, 0x99FFFFFF, false);
            w.setGravity(Gravity.CENTER);
            w.setPadding(0, dp(10), 0, dp(10));
            body.addView(w, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
            return;
        }
        LinearLayout cols = hrow();
        cols.setGravity(Gravity.TOP);
        cols.addView(lineupColumn(it.home, h), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        View div = new View(this);
        div.setBackgroundColor(0x1AFFFFFF);
        LinearLayout.LayoutParams dl = new LinearLayout.LayoutParams(dp(1), LinearLayout.LayoutParams.MATCH_PARENT);
        dl.setMargins(dp(6), 0, dp(6), 0);
        cols.addView(div, dl);
        cols.addView(lineupColumn(it.away, a), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        body.addView(cols);
    }

    private View lineupColumn(String team, JSONObject l) {
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        String head = team + (l != null && !l.optString("formation").isEmpty() ? "  ·  " + l.optString("formation") : "");
        android.widget.TextView t = label(head, 12, 0xFF34D399, true);
        t.setSingleLine(true);
        t.setEllipsize(android.text.TextUtils.TruncateAt.END);
        t.setPadding(0, 0, 0, dp(4));
        col.addView(t);
        if (l == null) { col.addView(label("—", 12, 0x66FFFFFF, false)); return col; }
        for (String key : new String[]{"starters", "subs"}) {
            JSONArray ps = l.optJSONArray(key);
            if (ps == null || ps.length() == 0) continue;
            if ("subs".equals(key)) {
                android.widget.TextView sh = label("الاحتياط", 11, 0x80FFFFFF, true);
                sh.setPadding(0, dp(8), 0, dp(2));
                col.addView(sh);
            }
            for (int i = 0; i < ps.length() && i < ("subs".equals(key) ? 12 : 11); i++) {
                JSONObject p = ps.optJSONObject(i);
                if (p == null) continue;
                String num = p.optString("number", "");
                String pos = p.optString("pos", "");
                android.widget.TextView row = label((num.isEmpty() ? "" : num + "  ") + p.optString("name") + (pos.isEmpty() ? "" : "  ·" + pos), 12,
                        "subs".equals(key) ? 0x99FFFFFF : 0xF2FFFFFF, false);
                row.setSingleLine(true);
                row.setEllipsize(android.text.TextUtils.TruncateAt.END);
                row.setPadding(0, dp(2), 0, dp(2));
                col.addView(row);
            }
        }
        return col;
    }

    /** The league table / the group of the two teams; their rows highlighted. */
    private void tableTab(LinearLayout body, JSONObject d) {
        JSONObject t = d.optJSONObject("table");
        JSONArray rows = t != null ? t.optJSONArray("rows") : null;
        if (rows == null || rows.length() == 0) {
            android.widget.TextView w = label("لا يوجد ترتيب لهذه البطولة", 13, 0x80FFFFFF, false);
            w.setGravity(Gravity.CENTER);
            w.setPadding(0, dp(10), 0, dp(10));
            body.addView(w, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
            return;
        }
        if (!t.optString("name").isEmpty()) body.addView(label(t.optString("name"), 12, 0xFF34D399, true));
        body.addView(tableLine("#", "الفريق", "لعب", "+/-", "نقاط", 0x80FFFFFF, 0));
        for (int i = 0; i < rows.length(); i++) {
            JSONObject r = rows.optJSONObject(i);
            if (r == null) continue;
            boolean mine = !r.optString("side").isEmpty();
            body.addView(tableLine(String.valueOf(r.optInt("pos")), r.optString("team"), String.valueOf(r.optInt("played")),
                    r.optString("gd", ""), String.valueOf(r.optInt("points")), mine ? 0xFF000000 : 0xE6FFFFFF, mine ? 0xFF34D399 : 0));
        }
    }

    private View tableLine(String pos, String team, String played, String gd, String pts, int color, int bg) {
        LinearLayout r = hrow();
        r.setPadding(dp(6), dp(3), dp(6), dp(3));
        if (bg != 0) r.setBackground(roundRect(bg));
        android.widget.TextView a = label(pos, 12, color, true);
        r.addView(a, new LinearLayout.LayoutParams(dp(26), LinearLayout.LayoutParams.WRAP_CONTENT));
        android.widget.TextView b = label(team, 12, color, bg != 0);
        b.setSingleLine(true);
        b.setEllipsize(android.text.TextUtils.TruncateAt.END);
        r.addView(b, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        for (String v : new String[]{played, gd, pts}) {
            android.widget.TextView c = label(v, 12, color, true);
            c.setGravity(Gravity.CENTER);
            r.addView(c, new LinearLayout.LayoutParams(dp(38), LinearLayout.LayoutParams.WRAP_CONTENT));
        }
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(2);
        r.setLayoutParams(lp);
        return r;
    }

    private void infoTab(LinearLayout body, JSONObject d) {
        List<String> lines = new ArrayList<>();
        if (!d.optString("round").isEmpty()) lines.add("🏆  " + d.optString("round"));
        if (!d.optString("venue").isEmpty()) lines.add("🏟  " + d.optString("venue") + (d.optInt("attendance") > 0 ? " · " + d.optInt("attendance") + " متفرج" : ""));
        if (!d.optString("referee").isEmpty()) lines.add("🧑‍⚖️  " + d.optString("referee"));
        JSONObject f = d.optJSONObject("formations");
        if (f != null && (!f.optString("home").isEmpty() || !f.optString("away").isEmpty())) lines.add("📋  " + f.optString("home", "?") + "  ×  " + f.optString("away", "?"));
        JSONArray ch = d.optJSONArray("channels");
        if (ch != null && ch.length() > 0) {
            StringBuilder sb = new StringBuilder("📺  ");
            for (int i = 0; i < ch.length() && i < 4; i++) sb.append(i > 0 ? " · " : "").append(ch.optString(i));
            lines.add(sb.toString());
        }
        JSONArray cm = d.optJSONArray("commentators");
        if (cm != null && cm.length() > 0) lines.add("🎙  " + cm.optString(0));
        if (lines.isEmpty()) lines.add("لا معلومات إضافية");
        for (String l : lines) {
            android.widget.TextView t = label(l, 13, 0xE6FFFFFF, false);
            t.setPadding(0, dp(4), 0, dp(4));
            if (l.startsWith("📋")) {
                // the formation: tap for the line-ups
                t.setText(l + "  ‹ التشكيلة");
                t.setTextColor(0xFF34D399);
                t.setOnClickListener(v -> { touchFocus(); panelTab = 2; islandSignature = ""; tick(); });
            }
            body.addView(t);
        }
    }

    private void loadDetails(IslandArt.Item it) {
        final String mid = it.matchId;
        if (detailsLoading.contains(mid)) return;
        detailsLoading.add(mid);
        final String q = "id=" + enc(it.matchId) + "&league=" + enc(it.leagueId) + "&homeId=" + enc(it.homeId)
                + "&home=" + enc(it.home) + "&away=" + enc(it.away) + "&table=1";
        final String origin = siteOrigin();
        new Thread(() -> {
            JSONObject d = null;
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(origin + "/api/matches/details?" + q).openConnection();
                c.setConnectTimeout(10_000);
                c.setReadTimeout(20_000);
                StringBuilder sb = new StringBuilder();
                try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
                    String line;
                    while ((line = r.readLine()) != null) sb.append(line);
                }
                d = new JSONObject(sb.toString());
                if (d.has("error")) d = null;
            } catch (Exception ignored) {
            }
            final JSONObject got = d;
            handler.post(() -> {
                detailsLoading.remove(mid);
                if (got != null) details.put(mid, got);
                detailsAt.put(mid, System.currentTimeMillis());
                panelVersion++;
                tick();
            });
        }).start();
    }

    // ---- the hide / show bubble ----

    private FrameLayout bubble;
    private android.widget.ImageView bubbleIcon;
    private View bubbleDot;
    private WindowManager.LayoutParams bubbleParams;
    private boolean bubbleAlert;
    private Boolean bubbleShownHidden;

    private static final String I_EYE = "M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12ZM12 9A3 3 0 1 0 12 15A3 3 0 1 0 12 9Z";
    private static final String I_EYE_OFF = "M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12ZM3 3L21 21";

    private boolean hasUrgent(List<IslandArt.Item> items, long now) {
        for (IslandArt.Item it : items) {
            if (it.critical) return true;
            if ("countdown".equals(it.kind) && it.at - now < 2 * 60_000L) return true;
        }
        return false;
    }

    /**
     * A small round button at the screen's edge: tap = hide / show all the islands (the choice is shared with the
     * app's settings), drag = move it up / down. While hidden, a dot on it pulses when something is happening.
     */
    @SuppressLint("ClickableViewAccessibility")
    private void updateBubble(boolean want, boolean hidden) {
        if (!want) {
            if (bubble != null) {
                try { windowManager.removeView(bubble); } catch (Exception ignored) { }
                bubble = null;
                bubbleShownHidden = null;
            }
            return;
        }
        if (bubble == null) {
            bubble = new FrameLayout(this);
            bubbleIcon = new android.widget.ImageView(this);
            bubbleIcon.setScaleType(android.widget.ImageView.ScaleType.CENTER);
            android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
            g.setShape(android.graphics.drawable.GradientDrawable.OVAL);
            g.setColor(0xB3000000);
            g.setStroke(dp(1), 0x40FFFFFF);
            bubbleIcon.setBackground(g);
            bubble.addView(bubbleIcon, new FrameLayout.LayoutParams(dp(40), dp(40), Gravity.CENTER));
            bubbleDot = new View(this);
            android.graphics.drawable.GradientDrawable dg = new android.graphics.drawable.GradientDrawable();
            dg.setShape(android.graphics.drawable.GradientDrawable.OVAL);
            dg.setColor(0xFFEF4444);
            bubbleDot.setBackground(dg);
            FrameLayout.LayoutParams dl = new FrameLayout.LayoutParams(dp(12), dp(12), Gravity.TOP | Gravity.END);
            bubble.addView(bubbleDot, dl);
            bubble.setAlpha(0.75f);
            int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
            bubbleParams = new WindowManager.LayoutParams(dp(46), dp(46), type,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, PixelFormat.TRANSLUCENT);
            bubbleParams.gravity = Gravity.TOP | Gravity.END;
            bubbleParams.x = 0;
            bubbleParams.y = NativeIslandPlugin.prefs(this).getInt("bubbleY", dp(160));
            bubble.setOnTouchListener(new View.OnTouchListener() {
                float downY;
                int startY;
                boolean moved, voiced;
                // long press: a voice command
                final Runnable voice = () -> {
                    voiced = true;
                    bubble.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS);
                    Intent vi = new Intent(IslandService.this, VoiceActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    try { startActivity(vi); } catch (Exception ignored) { }
                };

                @Override
                public boolean onTouch(View v, MotionEvent e) {
                    switch (e.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            downY = e.getRawY();
                            startY = bubbleParams.y;
                            moved = false;
                            voiced = false;
                            bubble.setAlpha(1f);
                            handler.postDelayed(voice, 600);
                            return true;
                        case MotionEvent.ACTION_MOVE:
                            float dy = e.getRawY() - downY;
                            if (Math.abs(dy) > dp(6)) { moved = true; handler.removeCallbacks(voice); }
                            if (moved) {
                                bubbleParams.y = Math.max(0, startY + (int) dy);
                                try { windowManager.updateViewLayout(bubble, bubbleParams); } catch (Exception ignored) { }
                            }
                            return true;
                        case MotionEvent.ACTION_UP:
                        case MotionEvent.ACTION_CANCEL:
                            bubble.setAlpha(0.75f);
                            handler.removeCallbacks(voice);
                            if (voiced) return true;
                            if (moved) NativeIslandPlugin.prefs(IslandService.this).edit().putInt("bubbleY", bubbleParams.y).apply();
                            else if (e.getAction() == MotionEvent.ACTION_UP) {
                                boolean h = !Hub.bool(IslandService.this, "islandsHidden", false);
                                focusedId = null;
                                Hub.set(IslandService.this, "islandsHidden", h);
                                v.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP);
                            }
                            return true;
                    }
                    return false;
                }
            });
            try {
                windowManager.addView(bubble, bubbleParams);
            } catch (Exception e) {
                bubble = null;
                return;
            }
        }
        if (bubbleShownHidden == null || bubbleShownHidden != hidden) {
            bubbleShownHidden = hidden;
            bubbleIcon.setImageBitmap(PlayerActivity.icon(hidden ? I_EYE_OFF : I_EYE, dp(20), hidden ? 0xB3FFFFFF : 0xFF34D399, false));
        }
        if (bubbleAlert) {
            bubbleDot.setVisibility(View.VISIBLE);
            bubbleDot.setAlpha(0.4f + 0.6f * (float) Math.abs(Math.sin(System.currentTimeMillis() / 500.0)));
        } else {
            bubbleDot.setVisibility(View.GONE);
        }
    }

    // ---- spoken updates (follow a match by voice while driving) ----

    private android.speech.tts.TextToSpeech tts;
    private boolean ttsReady;
    private String ttsPending;

    /** read text, then open the microphone (the azkar session: "التالي" after each one) */
    void sayThenListen(String text) {
        listenAfter = true;
        say(text);
    }

    private boolean listenAfter = false;

    private void onSpoken() {
        if (!listenAfter) return;
        listenAfter = false;
        handler.post(() -> {
            Intent vi = new Intent(this, VoiceActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK).putExtra("auto", true);
            try { startActivity(vi); } catch (Exception ignored) { }
        });
    }

    void say(String text) {
        if (tts == null) {
            ttsPending = text;
            tts = new android.speech.tts.TextToSpeech(this, st -> {
                ttsReady = st == android.speech.tts.TextToSpeech.SUCCESS;
                if (ttsReady) {
                    tts.setLanguage(new Locale("ar"));
                    tts.setOnUtteranceProgressListener(new android.speech.tts.UtteranceProgressListener() {
                        @Override public void onStart(String id) { }
                        @Override public void onDone(String id) { if ("dc-last".equals(id)) onSpoken(); }
                        @Override public void onError(String id) { }
                    });
                    if (ttsPending != null) tts.speak(ttsPending, android.speech.tts.TextToSpeech.QUEUE_FLUSH, null, "dc-last");
                    ttsPending = null;
                }
            });
            return;
        }
        if (ttsReady) tts.speak(text, android.speech.tts.TextToSpeech.QUEUE_FLUSH, null, "dc-last");
        else ttsPending = text;
    }

    // ---- stop everything (voice "أوقف") ----

    private void stopAll() {
        stopAudio();
        QuranState q = QuranState.load(this);
        if (q.playing || (quranPlayer != null && quranPlayer.isPlaying())) pauseQuran(q);
        azkarIdx = -1;
        Hub.set(this, "azkarVoice", null);
        if (tts != null) tts.stop();
        listenAfter = false;
        islandSignature = "";
        tick();
    }

    // ---- the azkar read aloud: "التالي" marks the current one done and reads the next ----

    private String azkarPeriod = "morning";
    private int azkarIdx = -1;
    private long azkarAt = 0;

    static boolean azkarActive() {
        IslandService s = instance;
        return s != null && s.azkarIdx >= 0 && System.currentTimeMillis() - s.azkarAt < 30 * 60_000L;
    }

    /** "آية الكرسي · 2/7 · الذكر 3 من 22" for the listening window */
    static String azkarStatus() {
        IslandService s = instance;
        if (s == null || s.azkarIdx < 0) return "";
        List<String[]> l = s.azkarList();
        if (s.azkarIdx >= l.size()) return "";
        String[] z = l.get(s.azkarIdx);
        int have = MediaBrowser.azkarCounts(s).optInt(z[0]);
        return "📿 " + z[1] + "  ·  " + have + "/" + z[2] + "\n" + z[4];
    }

    /**
     * One recitation heard (several in one breath count as several, by length): 0 nothing, 1 counted, 2 the dhikr
     * is complete and the next one is being read.
     */
    static int azkarCount(String heard) {
        IslandService s = instance;
        if (s == null || s.azkarIdx < 0) return 0;
        List<String[]> l = s.azkarList();
        if (s.azkarIdx >= l.size()) return 0;
        String[] z = l.get(s.azkarIdx);
        int need = Integer.parseInt(z[2]);
        int words = Math.max(1, VoiceActivity.norm(z[4]).split("\\s+").length);
        int said = VoiceActivity.norm(heard).split("\\s+").length;
        int times = Math.max(1, Math.round(said / (float) words));
        JSONObject counts = MediaBrowser.azkarCounts(s);
        int now = Math.min(need, counts.optInt(z[0]) + times);
        try {
            counts.put("day", Cloud.day(System.currentTimeMillis()));
            counts.put(z[0], now);
        } catch (Exception ignored) {
        }
        NativeIslandPlugin.prefs(s).edit().putString("azkarCounts", counts.toString()).apply();
        Hub.set(s, "azkarCounts", counts);
        s.azkarAt = System.currentTimeMillis();
        if (now >= need) {
            s.handler.post(() -> s.azkarCommand("next", null));
            return 2;
        }
        s.islandSignature = "";
        return 1;
    }

    static void azkar(String cmd, String period) {
        IslandService s = instance;
        if (s != null) s.handler.post(() -> s.azkarCommand(cmd, period));
    }

    private List<String[]> azkarList() {
        List<String[]> l = new ArrayList<>();
        for (String[] z : AzkarData.ITEMS) if (azkarPeriod.equals(z[3])) l.add(z);
        return l;
    }

    private void azkarCommand(String cmd, String period) {
        azkarAt = System.currentTimeMillis();
        List<String[]> l;
        JSONObject counts = MediaBrowser.azkarCounts(this);
        switch (cmd) {
            case "start":
                azkarPeriod = period != null ? period : MediaBrowser.azkarPeriod(this);
                l = azkarList();
                azkarIdx = 0;
                // from the first one not done yet today
                while (azkarIdx < l.size() && counts.optInt(l.get(azkarIdx)[0]) >= Integer.parseInt(l.get(azkarIdx)[2])) azkarIdx++;
                if (azkarIdx >= l.size()) { azkarIdx = -1; say("أتممت " + ("morning".equals(azkarPeriod) ? "أذكار الصباح" : "أذكار المساء") + " اليوم، تقبّل الله"); return; }
                readZikr(l, true);
                break;
            case "next":
                l = azkarList();
                if (azkarIdx < 0 || azkarIdx >= l.size()) return;
                // the current one is done: its counter goes full (the widget and the site follow)
                String[] cur = l.get(azkarIdx);
                try {
                    counts.put("day", Cloud.day(System.currentTimeMillis()));
                    counts.put(cur[0], Integer.parseInt(cur[2]));
                } catch (Exception ignored) {
                }
                NativeIslandPlugin.prefs(this).edit().putString("azkarCounts", counts.toString()).apply();
                Hub.set(this, "azkarCounts", counts);
                azkarIdx++;
                while (azkarIdx < l.size() && counts.optInt(l.get(azkarIdx)[0]) >= Integer.parseInt(l.get(azkarIdx)[2])) azkarIdx++;
                if (azkarIdx >= l.size()) {
                    azkarIdx = -1;
                    Hub.set(this, "azkarVoice", null);
                    say("تمّت " + ("morning".equals(azkarPeriod) ? "أذكار الصباح" : "أذكار المساء") + "، تقبّل الله منك");
                    return;
                }
                readZikr(l, false);
                break;
            case "repeat":
                l = azkarList();
                if (azkarIdx >= 0 && azkarIdx < l.size()) readZikr(l, false);
                break;
            default: // stop
                azkarIdx = -1;
                Hub.set(this, "azkarVoice", null);
                if (tts != null) tts.stop();
                listenAfter = false;
        }
        islandSignature = "";
        tick();
    }

    private void readZikr(List<String[]> l, boolean first) {
        String[] z = l.get(azkarIdx);
        int n = Integer.parseInt(z[2]);
        String times = n == 1 ? "" : n == 2 ? "، مرّتين" : n <= 10 ? "، " + n + " مرّات" : "، " + n + " مرّة";
        String intro = first ? ("morning".equals(azkarPeriod) ? "أذكار الصباح. " : "أذكار المساء. ") : "";
        try {
            Hub.set(this, "azkarVoice", new JSONObject().put("title", z[1]).put("i", azkarIdx + 1).put("n", l.size()));
        } catch (Exception ignored) {
        }
        // read it, then listen for "التالي" / "كرر" / "أوقف"
        sayThenListen(intro + z[1] + ". " + z[4] + times);
    }

    static void speak(String text) {
        IslandService s = instance;
        if (s != null) s.handler.post(() -> s.say(text));
    }

    private PillView pillAt(float x, float y) {
        int[] loc = new int[2];
        for (PillView p : pills) {
            p.getLocationOnScreen(loc);
            if (x >= loc[0] && x <= loc[0] + p.getWidth() && y >= loc[1] && y <= loc[1] + p.getHeight()) return p;
        }
        return null;
    }

    private int hitLeft(View v) {
        int[] loc = new int[2];
        v.getLocationOnScreen(loc);
        return loc[0];
    }

    // ---- sound only, in the island ----

    private FrameLayout audioWindow;
    private android.webkit.WebView audioView;
    private String audioTitle = "";
    private boolean audioPlaying = false;
    /** the list the sound came from: the next one starts by itself 3 s after the end (like the site's player) */
    private JSONArray audioQueue = new JSONArray();
    private int audioIndex = 0;
    private String audioType = "youtube";
    private String audioId = "";

    /** The sound island tapped: the same video back in the full-screen player (with its list). */
    private void backToFullPlayer() {
        if (audioView == null || audioId.isEmpty()) return;
        Intent p = new Intent(this, PlayerActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra("type", audioType).putExtra("id", audioId).putExtra("title", audioTitle).putExtra("queue", audioQueue.toString());
        stopAudio();
        try { startActivity(p); } catch (Exception ignored) { }
    }

    private final class AudioJs {
        @android.webkit.JavascriptInterface
        public void ended() {
            handler.postDelayed(() -> audioStep(1), 3000);
        }

        @android.webkit.JavascriptInterface
        public void resumed() { }
    }

    private void audioStep(int d) {
        if (audioView == null || audioQueue.length() <= 1) return;
        audioIndex = (audioIndex + d + audioQueue.length()) % audioQueue.length();
        JSONObject o = audioQueue.optJSONObject(audioIndex);
        if (o == null) return;
        JSONArray q = audioQueue;
        int idx = audioIndex;
        playAudio(audioType, o.optString("id"), o.optString("name", o.optString("title")));
        audioQueue = q;
        audioIndex = idx;
    }

    /** Plays the video / stream with no picture: a tiny invisible window keeps the player alive, the island shows it. */
    @SuppressLint("SetJavaScriptEnabled")
    private void playAudio(String type, String id, String title) {
        hideMap();
        stopAudio();
        audioTitle = title == null || title.isEmpty() ? "يعمل الآن" : title;
        audioWindow = new FrameLayout(this);
        audioView = new android.webkit.WebView(this);
        android.webkit.WebSettings ws = audioView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        audioView.setWebViewClient(new android.webkit.WebViewClient());
        audioView.addJavascriptInterface(new AudioJs(), "DCP");
        audioType = type;
        audioId = id;
        audioWindow.addView(audioView, new FrameLayout.LayoutParams(dp(160), dp(90)));
        int type2 = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(1, 1, type2,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE, PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.alpha = 0f;
        try {
            windowManager.addView(audioWindow, lp);
        } catch (Exception e) {
            audioWindow = null;
        }
        audioView.loadDataWithBaseURL(PlayerActivity.base(this, type), PlayerActivity.html(type, id), "text/html", "UTF-8", null);
        audioView.onResume();
        audioView.resumeTimers();
        audioPlaying = true;
        expanded = false;
        islandSignature = "";
        lastNotificationText = "";
        tick();
    }

    private void toggleAudio() {
        if (audioView == null) return;
        audioView.evaluateJavascript("window.dcToggle&&dcToggle()", v -> {
            audioPlaying = !"false".equals(v);
            islandSignature = "";
            tick();
        });
    }

    private void stopAudio() {
        if (audioWindow != null) {
            try { windowManager.removeView(audioWindow); } catch (Exception ignored) { }
        }
        if (audioView != null) {
            audioView.loadUrl("about:blank");
            audioView.destroy();
        }
        audioWindow = null;
        audioView = null;
        audioPlaying = false;
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

    private static String routeFor(IslandArt.Item it) {
        if ("match".equals(it.kind)) return "/matches";
        if ("azkar".equals(it.kind)) return "/football";
        String t = it.title == null ? "" : it.title;
        if (t.contains("ذكار") || t.contains("ذكر")) return "/football";
        return "/dashboard";
    }

    /** Open the app on a screen (the page navigates there). */
    private void openRoute(String route) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("route", route);
        try { startActivity(intent); } catch (Exception ignored) { }
    }

    private void openApp() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        startActivity(intent);
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    // ---- the radar map: the car dashboard's iframe as a floating window over other apps ----

    private static final String MAP_URL = "https://dmusera.netlify.app/amap";
    private FrameLayout mapWindow;
    private android.webkit.WebView mapView;
    private WindowManager.LayoutParams mapParams;
    private boolean mapBig = false;

    static boolean mapOpen() {
        IslandService s = instance;
        return s != null && s.mapWindow != null;
    }

    private void toggleMap() {
        if (mapWindow != null && windowIsMap) { hideMap(); return; }
        if (mapWindow != null) { // a video is playing there: switch it to the map
            windowIsMap = true;
            windowTitle = "رادار السيارة";
            if (windowTitleView != null) windowTitleView.setText(windowTitle);
            mapView.loadUrl(MAP_URL);
            handler.removeCallbacks(mapSnapshot);
            handler.postDelayed(mapSnapshot, 8_000);
            return;
        }
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(this)) {
            // no "display over other apps" yet: open its settings page
            Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, android.net.Uri.parse("package:" + getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { startActivity(i); } catch (Exception ignored) { }
            return;
        }
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            // the map shows the car's position: ask once (through the app, a service can't ask)
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            i.putExtra("askLocation", true);
            try { startActivity(i); } catch (Exception ignored) { }
        }
        windowTitle = "رادار السيارة";
        windowIsMap = true;
        showMap();
        if (mapView != null) mapView.loadUrl(MAP_URL);
    }

    private String windowTitle = "رادار السيارة";
    private boolean windowIsMap = true;

    /** A video tapped in a browsing widget: plays in the same floating window (YouTube's player). */
    private void playVideo(String id, String title) {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(this)) {
            Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, android.net.Uri.parse("package:" + getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { startActivity(i); } catch (Exception ignored) { }
            return;
        }
        windowTitle = title == null || title.isEmpty() ? "فيديو" : title;
        windowIsMap = false;
        if (mapWindow == null) showMap();
        else if (windowTitleView != null) windowTitleView.setText(windowTitle);
        if (mapView == null) return;
        String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head><body>"
                + "<iframe src='https://www.youtube.com/embed/" + id + "?autoplay=1&playsinline=1&rel=0' allow='autoplay; encrypted-media; picture-in-picture; fullscreen' allowfullscreen></iframe>"
                + "</body></html>";
        // the site's address as the page origin: YouTube's player refuses pages without one
        mapView.loadDataWithBaseURL(siteOrigin() + "/", html, "text/html", "UTF-8", null);
    }

    private android.widget.TextView windowTitleView;

    /** An IPTV channel from the IPTV widget: the stream plays in the floating window (hls.js like the site). */
    private void playStream(String url, String title) {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(this)) return;
        windowTitle = title == null || title.isEmpty() ? "IPTV" : title;
        windowIsMap = false;
        if (mapWindow == null) showMap();
        else if (windowTitleView != null) windowTitleView.setText(windowTitle);
        if (mapView == null) return;
        mapView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        String u = url.replace("'", "%27");
        String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<style>html,body{margin:0;height:100%;background:#000}video{width:100%;height:100%;background:#000}</style>"
                + "<script src='https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js'></script></head><body>"
                + "<video id='v' autoplay playsinline controls></video><script>"
                + "var v=document.getElementById('v'),s='" + u + "';"
                + "if(s.indexOf('.m3u8')<0||v.canPlayType('application/vnd.apple.mpegurl')){v.src=s;}"
                + "else if(window.Hls&&Hls.isSupported()){var h=new Hls();h.loadSource(s);h.attachMedia(v);}else{v.src=s;}"
                + "v.play().catch(function(){});</script></body></html>";
        mapView.loadDataWithBaseURL("http://localhost/", html, "text/html", "UTF-8", null);
    }

    @SuppressLint({"SetJavaScriptEnabled", "ClickableViewAccessibility"})
    private void showMap() {
        android.util.DisplayMetrics dm = getResources().getDisplayMetrics();
        mapWindow = new FrameLayout(this);
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setColor(0xFF000000);
        bg.setCornerRadius(dp(22));
        bg.setStroke(dp(1), 0x33FFFFFF);
        mapWindow.setBackground(bg);
        mapWindow.setClipToOutline(true);
        mapWindow.setElevation(dp(12));

        mapView = new android.webkit.WebView(this);
        android.webkit.WebSettings ws = mapView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setGeolocationEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        mapView.setWebViewClient(new android.webkit.WebViewClient());
        mapView.setWebChromeClient(new android.webkit.WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });
        FrameLayout.LayoutParams wl = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT);
        wl.topMargin = dp(30);
        mapWindow.addView(mapView, wl);

        // top bar: drag to move · ⤢ bigger / smaller · ✕ close
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setBackgroundColor(0xF20A0A0F);
        android.widget.TextView close = barButton("✕");
        android.widget.TextView size = barButton("⤢");
        android.widget.TextView title = new android.widget.TextView(this);
        title.setText(windowTitle);
        title.setSingleLine(true);
        title.setEllipsize(android.text.TextUtils.TruncateAt.END);
        windowTitleView = title;
        title.setTextColor(0xCCFFFFFF);
        title.setTypeface(Fonts.bold(this));
        title.setTextSize(13);
        title.setGravity(Gravity.CENTER);
        bar.addView(close, new LinearLayout.LayoutParams(dp(40), LinearLayout.LayoutParams.MATCH_PARENT));
        bar.addView(size, new LinearLayout.LayoutParams(dp(40), LinearLayout.LayoutParams.MATCH_PARENT));
        bar.addView(title, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1));
        mapWindow.addView(bar, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, dp(30)));
        close.setOnClickListener(v -> hideMap());
        size.setOnClickListener(v -> {
            mapBig = !mapBig;
            mapParams.width = mapBig ? Math.min(dm.widthPixels - dp(16), dp(640)) : dp(340);
            mapParams.height = mapBig ? Math.min(dm.heightPixels - dp(80), dp(460)) : dp(250);
            try { windowManager.updateViewLayout(mapWindow, mapParams); } catch (Exception ignored) { }
        });

        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        mapParams = new WindowManager.LayoutParams(dp(340), dp(250), type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN, PixelFormat.TRANSLUCENT);
        mapParams.gravity = Gravity.TOP | Gravity.START;
        mapParams.x = NativeIslandPlugin.prefs(this).getInt("mapX", dp(12));
        mapParams.y = NativeIslandPlugin.prefs(this).getInt("mapY", dp(90));
        title.setOnTouchListener(new View.OnTouchListener() {
            float dx, dy;
            int sx, sy;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        dx = e.getRawX(); dy = e.getRawY(); sx = mapParams.x; sy = mapParams.y;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        mapParams.x = sx + (int) (e.getRawX() - dx);
                        mapParams.y = Math.max(0, sy + (int) (e.getRawY() - dy));
                        try { windowManager.updateViewLayout(mapWindow, mapParams); } catch (Exception ignored) { }
                        return true;
                    case MotionEvent.ACTION_UP:
                        NativeIslandPlugin.prefs(IslandService.this).edit().putInt("mapX", mapParams.x).putInt("mapY", mapParams.y).apply();
                        return true;
                }
                return false;
            }
        });
        try {
            windowManager.addView(mapWindow, mapParams);
        } catch (Exception e) {
            mapWindow = null;
            mapView = null;
            return;
        }
        Widgets.updateAll(this);
        handler.postDelayed(mapSnapshot, 8_000);
    }

    private android.widget.TextView barButton(String s) {
        android.widget.TextView t = new android.widget.TextView(this);
        t.setText(s);
        t.setTextColor(0xFFFFFFFF);
        t.setTextSize(15);
        t.setGravity(Gravity.CENTER);
        return t;
    }

    /** While the map is open: its picture every minute, for the widget. */
    private final Runnable mapSnapshot = new Runnable() {
        @Override
        public void run() {
            if (mapView == null || mapView.getWidth() == 0 || !windowIsMap) return;
            try {
                Bitmap b = Bitmap.createBitmap(mapView.getWidth(), mapView.getHeight(), Bitmap.Config.ARGB_8888);
                mapView.draw(new Canvas(b));
                // a blank picture (some maps draw with the GPU only) is not kept
                int c0 = b.getPixel(b.getWidth() / 2, b.getHeight() / 2), c1 = b.getPixel(b.getWidth() / 4, b.getHeight() / 3);
                if (!(c0 == c1 && c0 == b.getPixel(b.getWidth() * 3 / 4, b.getHeight() * 2 / 3))) {
                    try (java.io.FileOutputStream o = new java.io.FileOutputStream(new java.io.File(getFilesDir(), "map-snapshot.png"))) {
                        b.compress(Bitmap.CompressFormat.PNG, 90, o);
                    }
                    Widgets.updateAll(IslandService.this);
                }
            } catch (Throwable ignored) {
            }
            handler.postDelayed(this, 60_000);
        }
    };

    private void hideMap() {
        handler.removeCallbacks(mapSnapshot);
        if (mapWindow != null) {
            try { windowManager.removeView(mapWindow); } catch (Exception ignored) { }
        }
        if (mapView != null) mapView.destroy();
        mapWindow = null;
        mapView = null;
        windowTitleView = null;
        windowIsMap = true;
        Widgets.updateAll(this);
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
            } else if ("audio".equals(it.kind)) {
                line = "🎧 " + it.title;
            } else if ("countdown".equals(it.kind) && it.at > now) {
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
