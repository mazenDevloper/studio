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
        if (WidgetActionReceiver.MAP_TOGGLE.equals(a)) handler.post(this::toggleMap);
        if ((POPUP.equals(a) || AUDIO.equals(a)) && intent.getStringExtra("id") != null) {
            final String t = intent.getStringExtra("type"), id = intent.getStringExtra("id"), title = intent.getStringExtra("title");
            final boolean audio = AUDIO.equals(a);
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
        hideMap();
        stopAudio();
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
        if (now - lastPoll > (appVisible ? 4 * POLL_MS : POLL_MS) && pollDue(now)) {
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
        boolean show = (!appVisible || audioView != null) && (!items.isEmpty() || celebration != null) && canDraw()
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
            JSONArray pins = master.optJSONArray("pinnedMatches") != null ? master.optJSONArray("pinnedMatches") : configPins;
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
        reminderItems(out, now);
        {
            // the day's dhikr: always shown, like the site (hidden once marked done today)
            JSONArray az = Cloud.master(this).optJSONArray("generalAzkar");
            if (az == null) az = config.optJSONArray("azkar");
            String today = Cloud.day(now);
            for (int i = 0; az != null && i < az.length(); i++) {
                JSONObject a = az.optJSONObject(i);
                if (a == null || a.optBoolean("done") || today.equals(a.optString("completedOn"))) continue;
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
                                PillView hit = pillAt(e.getRawX(), e.getRawY());
                                if (hit != null && "audio".equals(hit.item.kind) && celebration == null) {
                                    // the sound island: tap = pause / resume (expanded: the ✕ part stops it)
                                    if (expanded && e.getRawX() < hitLeft(hit) + hit.getHeight() * 0.9f) stopAudio();
                                    else toggleAudio();
                                    islandSignature = "";
                                    tick();
                                    return true;
                                }
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
