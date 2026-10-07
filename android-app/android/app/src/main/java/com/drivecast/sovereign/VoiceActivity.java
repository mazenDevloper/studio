package com.drivecast.sovereign;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognizerIntent;
import android.view.Gravity;
import android.view.View;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Locale;

/**
 * Arabic voice commands (from the islands' bubble — long press — or the app icon's shortcut): listens once, does it,
 * answers out loud and shows what it understood. "شغّل سورة الكهف للعفاسي", "كم النتيجة؟", "متى المغرب؟",
 * "أقرب مسجد", "أذكار المساء", "اخفِ الجزر" / "أظهر الجزر", "ذكّرني بعد ربع ساعة أتصل بأبوي",
 * "ذكرني بعد العشاء ...", "التالي" / "السابق" / "أوقف".
 */
public class VoiceActivity extends Activity {

    private static final int VOICE = 7301;
    private TextView view;
    private final Handler ui = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        float d = getResources().getDisplayMetrics().density;
        view = new TextView(this);
        view.setText("🎤  تحدّث الآن...");
        view.setTextColor(Color.WHITE);
        view.setTypeface(Fonts.black(this));
        view.setTextSize(17);
        view.setGravity(Gravity.CENTER);
        int p = Math.round(18 * d);
        view.setPadding(p, p, p, p);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xF20B0B10);
        bg.setCornerRadius(28 * d);
        bg.setStroke(Math.round(1.5f * d), 0x8034D399);
        view.setBackground(bg);
        setContentView(view);
        getWindow().setLayout(Math.round(Math.min(getResources().getDisplayMetrics().widthPixels - 32 * d, 520 * d)), android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        getWindow().setGravity(Gravity.TOP);
        listen();
    }

    private boolean auto = false;
    private int autoRetries = 0;
    private android.speech.SpeechRecognizer rec;
    private static final int MIC = 7302;

    /**
     * Listen in the app itself (Android's SpeechRecognizer: no Google window, nothing opens full screen); the
     * system's voice window only when the phone has no recognizer.
     */
    private void listen() {
        auto = getIntent().getBooleanExtra("auto", false);
        if (android.os.Build.VERSION.SDK_INT >= 23 && checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO}, MIC);
            return;
        }
        if (!android.speech.SpeechRecognizer.isRecognitionAvailable(this)) { listenWithSystem(); return; }
        if (rec == null) {
            rec = android.speech.SpeechRecognizer.createSpeechRecognizer(this);
            rec.setRecognitionListener(new android.speech.RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle p) { showListening(); }
                @Override public void onBeginningOfSpeech() { }
                @Override public void onRmsChanged(float v) { if (level != null) level.setScaleX(0.2f + Math.min(1f, Math.max(0f, (v + 2) / 12f))); }
                @Override public void onBufferReceived(byte[] b) { }
                @Override public void onEndOfSpeech() { }
                @Override public void onError(int e) { onHeard(null); }
                @Override public void onResults(Bundle r) {
                    ArrayList<String> l = r.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION);
                    onHeard(l == null || l.isEmpty() ? null : l.get(0));
                }
                @Override public void onPartialResults(Bundle r) {
                    ArrayList<String> l = r.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION);
                    if (l != null && !l.isEmpty() && !l.get(0).isEmpty()) view.setText("🎤  " + l.get(0));
                }
                @Override public void onEvent(int t, Bundle b) { }
            });
        }
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar");
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        if (IslandService.azkarActive()) {
            // reciting: allow long phrases and pauses
            i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2500);
            i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000);
        }
        try {
            rec.startListening(i);
        } catch (Exception e) {
            listenWithSystem();
        }
    }

    private View level;

    private void showListening() {
        if (IslandService.azkarActive()) view.setText(IslandService.azkarStatus() + "\n\n🎤 كرّر الذكر · «التالي» · «كرر» · «أوقف»");
        else view.setText("🎤  تحدّث الآن...");
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] p, int[] r) {
        super.onRequestPermissionsResult(code, p, r);
        if (code != MIC) return;
        if (r.length > 0 && r[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) listen();
        else listenWithSystem();
    }

    private void listenWithSystem() {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar");
        try {
            startActivityForResult(i, VOICE);
        } catch (Exception e) {
            done("التعرّف على الصوت غير متاح على هذا الجهاز", false);
        }
    }

    @Override
    protected void onDestroy() {
        if (rec != null) { try { rec.destroy(); } catch (Exception ignored) { } }
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != VOICE) return;
        ArrayList<String> r = data != null ? data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS) : null;
        onHeard(res != RESULT_OK || r == null || r.isEmpty() ? null : r.get(0));
    }

    /** What was heard (null: nothing). */
    private void onHeard(String heardText) {
        boolean azkar = IslandService.azkarActive();
        if (heardText == null) {
            // the azkar: keep listening a while (silence between repetitions)
            if (azkar && ++autoRetries <= 6) { listen(); return; }
            finish();
            return;
        }
        autoRetries = 0;
        if (azkar) {
            String n = norm(heardText);
            boolean command = n.contains("التالي") || n.contains("بعده") || n.equals("تم") || n.contains("كرر") || n.contains("اعد")
                    || n.contains("اوقف") || n.contains("وقف") || n.contains("توقف") || n.contains("انهي") || n.equals("خلاص");
            if (!command) {
                // a repetition of the current dhikr: counted (several in one breath count as several)
                int got = IslandService.azkarCount(heardText);
                if (got == 2) { finish(); return; }          // done: the next one is being read
                showListening();
                ui.postDelayed(this::listen, 250);
                return;
            }
        }
        handleText(heardText);
    }

    private void handleText(String heardText) {
        ArrayList<String> r = new ArrayList<>();
        r.add(heardText);
        String said = r.get(0);
        String answer;
        try {
            answer = run(said);
        } catch (Exception e) {
            answer = null;
        }
        if (answer == null) {
            // not one of the known phrasings: the AI works out what was meant (or answers the question)
            view.setText("«" + said + "»\n\n🤔 ...");
            final String heard = said;
            new Thread(() -> {
                String a;
                try {
                    a = VoiceBrain.understand(getApplicationContext(), heard, this::runIntent);
                } catch (Exception e) {
                    a = null;
                }
                final String ans = a != null ? a : "لم أفهم: «" + heard + "». جرّب: شغّل سورة الكهف، كم النتيجة، متى المغرب";
                ui.post(() -> {
                    if (ans.startsWith("@")) { view.setText("«" + heard + "»\n\n" + ans.substring(1)); return; }
                    if (ans.startsWith("#")) { view.setText("«" + heard + "»\n\n" + ans.substring(1)); ui.postDelayed(this::finish, 1500); return; }
                    view.setText("«" + heard + "»\n\n" + ans);
                    done(ans, true);
                });
            }).start();
            return;
        }
        if (answer.startsWith("@")) {
            // still working (a trip being planned): the answer comes by itself
            view.setText("«" + said + "»\n\n" + answer.substring(1));
            return;
        }
        if (answer.startsWith("#")) {
            // the service answers by itself (the azkar are read aloud, a surah starts): just show it
            view.setText("«" + said + "»\n\n" + answer.substring(1));
            ui.postDelayed(this::finish, 1500);
            return;
        }
        view.setText("«" + said + "»\n\n" + answer);
        done(answer, true);
    }

    private void done(String answer, boolean speak) {
        if (speak) say(answer);
        else view.setText(answer);
        ui.postDelayed(this::finish, 3500);
    }

    private void say(String text) {
        IslandService.start(getApplicationContext());
        ui.postDelayed(() -> IslandService.speak(text), 300);
    }

    /** Arabic without diacritics, alef / ya / ta-marbuta forms unified. */
    static String norm(String s) {
        return s.replaceAll("[\\u064B-\\u0652\\u0640]", "").replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
                .replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي').toLowerCase(Locale.ROOT).trim();
    }

    private String run(String said) {
        String s = norm(said);

        // trips: "رحلتي إلى صلالة", "رايح العمل", "وديني البيت", "احفظ موقعي البيت", "أنهِ الرحلة", "وين أصلي؟"
        if (s.contains("رحله") && (s.contains("انهي") || s.contains("الغ") || s.contains("وقف") || s.contains("اوقف"))) {
            Trip.stop(this);
            return "أنهيت الرحلة";
        }
        if (s.contains("احفظ") && (s.contains("موقع") || s.contains("هنا") || s.contains("المكان"))) {
            String key = placeKey(s);
            if (key == null) return "قل: احفظ موقعي البيت، أو احفظ موقعي العمل";
            return Trip.saveHere(this, key) ? "حفظت موقعك الحالي كـ" + Trip.placeName(key) : "لا أعرف موقعك الآن - فعّل الموقع";
        }
        if (s.contains("وين اصلي") || s.contains("اين اصلي") || s.contains("مساجد الطريق") || s.contains("خطه الرحله") || s.contains("مساجد طريقي")) {
            org.json.JSONObject t = Trip.current(this);
            return t != null ? Trip.summary(t) : "لا توجد رحلة الآن. قل مثلاً: رحلتي إلى صلالة";
        }
        String dest = tripDestination(said, s);
        if (dest != null) {
            final String d = dest;
            new Thread(() -> {
                String plan = Trip.start(getApplicationContext(), d);
                ui.post(() -> { view.setText(plan); say(plan); ui.postDelayed(this::finish, 6000); });
            }).start();
            return "@أخطط الطريق إلى " + Trip.placeName(dest) + " وأبحث عن المساجد عليه...";
        }

        // the day, the date, the time
        if (s.contains("التاريخ") || s.contains("اي يوم") || s.contains("ايش اليوم") || s.contains("وش اليوم") || s.contains("كم اليوم") || s.contains("اليوم كم") || s.contains("الهجري") || s.equals("اليوم")) return VoiceBrain.today();
        if (s.contains("الساعه كم") || s.contains("كم الساعه") || s.contains("الوقت الحين") || s.equals("الساعه")) return VoiceBrain.timeNow();

        // "أهم مباريات اليوم / الغد", "وش المباريات بكرة"
        if ((s.contains("مباري") || s.contains("ماتشات")) && (s.contains("اهم") || s.contains("ابرز") || s.contains("كبيره") || s.contains("القويه"))) {
            final int day = s.contains("بكره") || s.contains("بكرا") || s.contains("غدا") || s.contains("الغد") ? 1 : s.contains("امس") || s.contains("البارحه") ? -1 : 0;
            new Thread(() -> {
                String a = VoiceBrain.matchesOn(getApplicationContext(), day, true);
                ui.post(() -> { view.setText(a); say(a); ui.postDelayed(this::finish, 9000); });
            }).start();
            return "@أجلب أهم المباريات...";
        }
        // matches of another day: "مباريات الغد / بكره / أمس"
        if ((s.contains("مباري") || s.contains("ماتش") || s.contains("مباراه")) && (s.contains("بكره") || s.contains("بكرا") || s.contains("غدا") || s.contains("الغد") || s.contains("امس") || s.contains("البارحه"))) {
            final int day = s.contains("امس") || s.contains("البارحه") ? -1 : 1;
            new Thread(() -> {
                String a = VoiceBrain.matchesOn(getApplicationContext(), day);
                ui.post(() -> { view.setText(a); say(a); ui.postDelayed(this::finish, 8000); });
            }).start();
            return "@" + (day == 1 ? "أجلب مباريات الغد..." : "أجلب مباريات الأمس...");
        }
        if (s.contains("مباريات اليوم") || s.contains("مباريات الليله") || s.equals("المباريات") || s.contains("وش المباريات") || s.contains("ايش المباريات")) {
            new Thread(() -> {
                String a = VoiceBrain.matchesOn(getApplicationContext(), 0);
                ui.post(() -> { view.setText(a); say(a); ui.postDelayed(this::finish, 8000); });
            }).start();
            return "@أجلب مباريات اليوم...";
        }

        // next / previous video (the sound island, the full player, or the app's player)
        if ((s.contains("التالي") || s.contains("بعده") || s.contains("الجاي")) && !IslandService.azkarActive()) {
            if (!IslandService.mediaStep(1) && !PlayerActivity.voiceStep(1)) media(WidgetActionReceiver.MEDIA_NEXT);
            return "التالي";
        }
        if (s.contains("السابق") || s.contains("اللي قبله") || s.contains("ارجع")) {
            if (!IslandService.mediaStep(-1) && !PlayerActivity.voiceStep(-1)) media(WidgetActionReceiver.MEDIA_PREV);
            return "السابق";
        }

        // stop everything that plays / reads
        if (s.contains("اوقف") || s.contains("وقف") || s.contains("توقف") || s.contains("اسكت") || s.contains("انهي") || s.equals("خلاص")) {
            boolean az = IslandService.azkarActive();
            ContextCompat.startForegroundService(this, new Intent(this, IslandService.class).setAction(IslandService.STOP_ALL));
            return az ? "أنهيت قراءة الأذكار" : "أوقفت التشغيل";
        }

        // the azkar being read aloud: "التالي" = this one done, read the next; "كرر" = again
        if (IslandService.azkarActive()) {
            if (s.contains("التالي") || s.contains("بعده") || s.equals("تم") || s.contains("تم ") || s.contains("الي بعده") || s.contains("كملت")) {
                IslandService.azkar("next", null);
                return "#التالي ✓";
            }
            if (s.contains("كرر") || s.contains("اعد") || s.contains("مره ثانيه") || s.contains("عيد")) {
                IslandService.azkar("repeat", null);
                return "#أعيد الذكر";
            }
        }

        // islands
        if ((s.contains("اخف") || s.contains("خبي") || s.contains("سكر")) && s.contains("جزر")) {
            Hub.set(this, "islandsHidden", true);
            return "أخفيت الجزر";
        }
        if ((s.contains("اظهر") || s.contains("ورني") || s.contains("افتح")) && s.contains("جزر")) {
            Hub.set(this, "islandsHidden", false);
            return "أظهرت الجزر";
        }

        // reminders
        if (s.startsWith("ذكرني") || s.contains("ذكرني")) return remind(s, said);

        // the Quran
        int surah = findSurah(s);
        if (surah > 0 && (s.contains("شغل") || s.contains("اقرا") || s.contains("سوره") || s.contains("سمعني"))) {
            int reciter = findReciter(s);
            String rname = reciter >= 0 ? QuranState.reciters(this).optJSONObject(reciter).optString("name") : spokenReciter(said);
            // what was said, minus the verb ("سورة الكهف ياسر الدوسري"): keeps any reciter, even one not in the list
            String spoken = said.replaceAll("^\\s*(شغّل|شغل|شغلي|شغّلي|اقرأ|اقرا|إقرأ|سمعني|سمّعني|أبي|ابي|ابغى|أبغى|حط|حطلي)\\s*(لي\\s+)?", "").trim();
            if (!VoiceActivity.norm(spoken).contains("سوره")) spoken = "سورة " + spoken;
            final String query = rname.isEmpty() || VoiceActivity.norm(spoken).contains(norm(rname)) ? spoken : spoken + " " + rname;
            final int fs = surah, fr = reciter;
            // YouTube: the first result plays as sound in the island (the other results are its next / previous)
            new Thread(() -> {
                JSONArray res = MediaBrowser.search(query, null);
                JSONObject first = res.optJSONObject(0);
                if (first != null) {
                    JSONArray q = new JSONArray();
                    for (int i = 0; i < res.length(); i++) q.put(res.optJSONObject(i));
                    Intent a = new Intent(this, IslandService.class).setAction(IslandService.AUDIO).putExtra("type", "youtube")
                            .putExtra("id", first.optString("id")).putExtra("title", first.optString("name")).putExtra("queue", q.toString()).putExtra("index", 0);
                    ContextCompat.startForegroundService(this, a);
                } else {
                    // no YouTube (quota / network): the Quran player
                    ContextCompat.startForegroundService(this, new Intent(this, IslandService.class).setAction(IslandService.QURAN_PLAY).putExtra("surah", fs).putExtra("reciter", fr));
                }
            }).start();
            return "أبحث وأشغّل " + query;
        }

        // "شغل <anything>": a YouTube search, the first result as sound in the island
        if ((s.startsWith("شغل") || s.startsWith("شغلي") || s.startsWith("ابي اسمع") || s.startsWith("سمعني") || s.startsWith("حط")) && !s.contains("سوره") && findSurah(s) == 0) {
            String q = said.replaceFirst("^\\s*(شغّل|شغل|شغلي|شغّلي|أبي أسمع|ابي اسمع|سمعني|سمّعني|حط|حطلي)\\s*", "").trim();
            if (!q.isEmpty()) return runIntent("play_youtube", q, null);
        }

        // scores
        if (s.contains("نتيجه") || s.contains("النتيجه") || s.contains("كم المباراه") || s.contains("المباراه") || s.contains("الماتش") || s.contains("كوره")) return scores();

        // prayers
        String[][] prayers = {{"فجر", "الفجر"}, {"ظهر", "الظهر"}, {"عصر", "العصر"}, {"مغرب", "المغرب"}, {"عشا", "العشاء"}};
        for (String[] p : prayers) if (s.contains(p[0]) && (s.contains("متي") || s.contains("كم") || s.contains("باقي") || s.contains("وقت") || s.contains("اذان"))) return prayer(p[1]);
        if (s.contains("الصلاه") || s.contains("الاذان")) return prayer(null);

        // mosque
        if (s.contains("مسجد") || s.contains("جامع")) {
            Intent m = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("geo:0,0?q=" + android.net.Uri.encode("مسجد")));
            m.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { startActivity(m); } catch (Exception ignored) { }
            return "أبحث عن أقرب مسجد على الخريطة";
        }

        // azkar
        if (s.contains("اذكار") || s.contains("ذكر")) {
            if (s.contains("افتح") || s.contains("صفحه")) {
                open("/football");
                return "فتحت الأذكار";
            }
            // read them aloud, one by one: say "التالي" after each
            String period = s.contains("مسا") ? "evening" : s.contains("صباح") ? "morning" : null;
            IslandService.start(this);
            ui.postDelayed(() -> IslandService.azkar("start", period), 400);
            return "#أقرأ لك الأذكار · قل «التالي» بعد كل ذكر، «كرر» للإعادة، «أوقف» للإنهاء";
        }

        // media
        if (s.equals("التالي") || s.contains("اللي بعده") || s.contains("التالي")) { media(WidgetActionReceiver.MEDIA_NEXT); return "التالي"; }
        if (s.contains("السابق") || s.contains("اللي قبله")) { media(WidgetActionReceiver.MEDIA_PREV); return "السابق"; }
        if (s.contains("كمل") || s.contains("استمر")) {
            media(WidgetActionReceiver.MEDIA_TOGGLE);
            return "تم";
        }
        if (s.contains("المباريات")) { open("/matches"); return "المباريات"; }
        return null;
    }

    private void open(String route) {
        Intent i = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("route", route);
        startActivity(i);
    }

    private void media(String action) {
        sendBroadcast(new Intent(this, WidgetActionReceiver.class).setAction(action));
    }

    /**
     * Do what the AI understood (intent + one or two arguments). Returns what to say ("#…" = shown only, "@…" =
     * still working).
     */
    String runIntent(String intent, String a, String b) {
        switch (intent == null ? "" : intent) {
            case "play_surah": {
                String q = "سورة " + a + (b == null || b.isEmpty() ? "" : " " + b);
                return runIntent("play_youtube", q, null);
            }
            case "play_youtube": {
                final String q = a;
                new Thread(() -> {
                    JSONArray res = MediaBrowser.search(q, null);
                    JSONObject first = res.optJSONObject(0);
                    if (first == null) return;
                    Intent i = new Intent(this, IslandService.class).setAction(IslandService.AUDIO).putExtra("type", "youtube")
                            .putExtra("id", first.optString("id")).putExtra("title", first.optString("name")).putExtra("queue", res.toString()).putExtra("index", 0);
                    ContextCompat.startForegroundService(getApplicationContext(), i);
                }).start();
                return "أشغّل: " + q;
            }
            case "stop":
                ContextCompat.startForegroundService(getApplicationContext(), new Intent(this, IslandService.class).setAction(IslandService.STOP_ALL));
                return "أوقفت التشغيل";
            case "next_video":
                if (!IslandService.mediaStep(1) && !PlayerActivity.voiceStep(1)) media(WidgetActionReceiver.MEDIA_NEXT);
                return "التالي";
            case "prev_video":
                if (!IslandService.mediaStep(-1) && !PlayerActivity.voiceStep(-1)) media(WidgetActionReceiver.MEDIA_PREV);
                return "السابق";
            case "pause_resume":
                media(WidgetActionReceiver.MEDIA_TOGGLE);
                return "تم";
            case "scores":
                return scores();
            case "matches_day":
                return VoiceBrain.matchesOn(getApplicationContext(), a == null ? 0 : parseInt(a, 0), "top".equals(b));
            case "prayer_time":
                return prayer(a == null || a.isEmpty() ? null : a);
            case "date_today":
                return VoiceBrain.today();
            case "time_now":
                return VoiceBrain.timeNow();
            case "azkar":
                IslandService.start(getApplicationContext());
                final String period = "evening".equals(a) || "morning".equals(a) ? a : null;
                ui.postDelayed(() -> IslandService.azkar("start", period), 400);
                return "#أقرأ لك الأذكار · قل «التالي» بعد كل ذكر";
            case "azkar_next":
                IslandService.azkar("next", null);
                return "#التالي ✓";
            case "open_screen":
                open(a == null || !a.startsWith("/") ? "/dashboard" : a);
                return "تم";
            case "hide_islands":
                Hub.set(this, "islandsHidden", true);
                return "أخفيت الجزر";
            case "show_islands":
                Hub.set(this, "islandsHidden", false);
                return "أظهرت الجزر";
            case "remind":
                return remind(norm("ذكرني بعد " + parseInt(a, 10) + " دقيقه"), "ذكرني " + (b == null ? "" : b));
            case "trip":
                return Trip.start(getApplicationContext(), "البيت".equals(a) ? "home" : "العمل".equals(a) ? "work" : a);
            case "trip_plan": {
                JSONObject t = Trip.current(this);
                return t != null ? Trip.summary(t) : "لا توجد رحلة الآن";
            }
            case "end_trip":
                Trip.stop(this);
                return "أنهيت الرحلة";
            case "save_place":
                return Trip.saveHere(this, "work".equals(a) ? "work" : "home") ? "حفظت موقعك" : "لا أعرف موقعك الآن";
            case "mosque": {
                Intent m = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("geo:0,0?q=" + android.net.Uri.encode("مسجد")));
                m.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try { startActivity(m); } catch (Exception ignored) { }
                return "أقرب مسجد على الخريطة";
            }
            case "answer":
                return a;
            default:
                return null;
        }
    }

    private static int parseInt(String v, int def) {
        try {
            return Integer.parseInt(v.trim());
        } catch (Exception e) {
            return def;
        }
    }

    /** "home" / "work" from the words (null: neither) */
    private static String placeKey(String s) {
        if (s.contains("البيت") || s.contains("بيتي") || s.contains("المنزل") || s.contains("منزلي") || s.contains("الحاره")) return "home";
        if (s.contains("العمل") || s.contains("الدوام") || s.contains("الشغل") || s.contains("المكتب") || s.contains("عملي")) return "work";
        return null;
    }

    /** "رحلتي إلى صلالة" -> "صلالة"; "رايح البيت" -> "home"; null when it isn't a trip */
    private static final String TRIP_WORDS = "رحلتي|رحلة|رحله|رايح|رايحه|رايحين|وديني|ودني|خذني|مشواري|مشوار|طريقي|متجه|متوجه|ذاهب|مسافر|الذهاب|اذهب|أذهب|نروح|اروح|أروح|بروح|توجه|ودنا";

    /**
     * "رحلتي إلى صلالة", "الذهاب إلى العمل", "إلى العمل", "رايح البيت", "روح الجامعة" (a saved place) -> where to
     * ("home" / "work" / a saved place's key / the words for the search); null when it isn't a trip.
     */
    private String tripDestination(String said, String s) {
        boolean trip = false;
        for (String k : TRIP_WORDS.split("\\|")) if (s.contains(norm(k))) trip = true;
        // "إلى العمل" / "الى البيت" alone
        if (s.startsWith("الي ") || s.startsWith("الى ") || s.startsWith("روح ")) trip = true;
        if (!trip) return null;
        String key = placeKey(s);
        if (key != null) return key;
        // a saved place by its name ("الجامعة", "بيت الوالد")
        JSONObject places = Trip.places(this);
        java.util.Iterator<String> it = places.keys();
        while (it.hasNext()) {
            String k = it.next();
            JSONObject p = places.optJSONObject(k);
            String n = p != null ? norm(p.optString("name")) : "";
            if (n.length() >= 2 && s.contains(n)) return k;
        }
        // the words after "إلى / الى" (the original spelling, for the search)
        String rest = said.replaceAll("^.*?(" + TRIP_WORDS + ")\\s*", "");
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?:^|\\s)(?:إلى|الى|الي|إلي|لـ)\\s+(.+)$").matcher(" " + rest);
        String d = m.find() ? m.group(1).trim() : rest.replaceAll("^(?:إلى|الى|الي|إلي)\\s*", "").trim();
        if (d.startsWith("ال") && d.length() < 2) return null;
        return d.isEmpty() ? null : d;
    }

    /** a reciter named after "لـ" / "بصوت" that isn't in the list ("شغل الكهف للمنشاوي") */
    private static String spokenReciter(String said) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?:^|\\s)(?:بصوت\\s+|للقارئ\\s+|للشيخ\\s+|لل)(\\S+(?:\\s+\\S+)?)").matcher(said);
        return m.find() ? m.group(1).trim() : "";
    }

    private int findSurah(String s) {
        int best = 0, bestLen = 0;
        for (int i = 0; i < MediaBrowser.SURAHS.length; i++) {
            String n = norm(MediaBrowser.SURAHS[i]);
            String bare = n.startsWith("ال") ? n.substring(2) : n;
            if ((s.contains(n) || (bare.length() >= 3 && s.contains(bare))) && n.length() > bestLen) { best = i + 1; bestLen = n.length(); }
        }
        return best;
    }

    private int findReciter(String s) {
        JSONArray r = QuranState.reciters(this);
        for (int i = 0; i < r.length(); i++) {
            String n = norm(r.optJSONObject(i).optString("name"));
            for (String part : n.split(" ")) {
                String bare = part.startsWith("ال") ? part.substring(2) : part;
                if (bare.length() >= 4 && s.contains(bare)) return i;
            }
        }
        return -1;
    }

    private String scores() {
        JSONArray list = Widgets.array(this, "matchesData");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < list.length(); i++) {
            JSONObject m = list.optJSONObject(i);
            if (m == null || !"live".equals(m.optString("status"))) continue;
            JSONObject sc = m.optJSONObject("score");
            sb.append(sb.length() > 0 ? ". " : "").append(m.optJSONObject("home").optString("name")).append(" ").append(sc != null ? sc.optInt("home") : 0)
                    .append("، ").append(m.optJSONObject("away").optString("name")).append(" ").append(sc != null ? sc.optInt("away") : 0)
                    .append(m.isNull("elapsed") ? "" : "، الدقيقة " + m.optInt("elapsed"));
        }
        if (sb.length() > 0) return sb.toString();
        // nothing live: the next one
        long now = System.currentTimeMillis(), best = Long.MAX_VALUE;
        JSONObject next = null;
        for (int i = 0; i < list.length(); i++) {
            JSONObject m = list.optJSONObject(i);
            long k = m != null ? m.optLong("timestamp") * 1000L : 0;
            if (m != null && "upcoming".equals(m.optString("status")) && k > now && k < best) { best = k; next = m; }
        }
        if (next != null) return "لا توجد مباراة مباشرة لفرقك. القادمة: " + next.optJSONObject("home").optString("name") + " ضد "
                + next.optJSONObject("away").optString("name") + " الساعة " + Art.to12h(next.optString("omanTime"));
        return "لا توجد مباريات لفرقك اليوم";
    }

    private String prayer(String name) {
        JSONArray list = Widgets.countdowns(this);
        long now = System.currentTimeMillis();
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject c = list.optJSONObject(i);
            if (c == null || !"azan".equals(c.optString("kind")) || c.optLong("at") <= now) continue;
            if (name != null && !c.optString("title").contains(name)) continue;
            long min = (c.optLong("at") - now) / 60_000L;
            Calendar t = Calendar.getInstance();
            t.setTimeInMillis(c.optLong("at"));
            int h = t.get(Calendar.HOUR) == 0 ? 12 : t.get(Calendar.HOUR);
            String clock = h + ":" + String.format(Locale.ROOT, "%02d", t.get(Calendar.MINUTE));
            String left = min >= 60 ? (min / 60) + " ساعة و" + (min % 60) + " دقيقة" : min + " دقيقة";
            return c.optString("title") + " بعد " + left + "، الساعة " + clock;
        }
        return name == null ? "لا أعرف مواقيت اليوم بعد - افتح التطبيق مرة" : "مرّ وقت " + name + " اليوم";
    }

    /** "ذكرني بعد 10 دقايق ...", "بعد ساعه", "بعد ربع ساعه", "بعد نص ساعه", "بعد العشا ..." */
    private String remind(String s, String said) {
        long now = System.currentTimeMillis(), at = 0;
        String label = said;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("بعد\\s*(\\d+)\\s*(دقيق|دقايق|دقيقه|دقائق|ساع|ساعات)").matcher(s);
        if (m.find()) {
            int n = Integer.parseInt(m.group(1));
            at = now + (m.group(2).startsWith("ساع") ? n * 60L : n) * 60_000L;
        } else if (s.contains("ربع ساعه")) at = now + 15 * 60_000L;
        else if (s.contains("نص ساعه") || s.contains("نصف ساعه")) at = now + 30 * 60_000L;
        else if (s.contains("ساعتين")) at = now + 120 * 60_000L;
        else if (s.contains("بعد ساعه")) at = now + 60 * 60_000L;
        else if (s.contains("دقيقتين")) at = now + 2 * 60_000L;
        else {
            String[][] prayers = {{"فجر", "الفجر"}, {"ظهر", "الظهر"}, {"عصر", "العصر"}, {"مغرب", "المغرب"}, {"عشا", "العشاء"}};
            JSONArray list = Widgets.countdowns(this);
            for (String[] p : prayers) {
                if (!s.contains(p[0])) continue;
                for (int i = 0; list != null && i < list.length(); i++) {
                    JSONObject c = list.optJSONObject(i);
                    if (c != null && "azan".equals(c.optString("kind")) && c.optString("title").contains(p[1]) && c.optLong("at") > now) {
                        at = c.optLong("at") + (s.contains("بعد") ? 20 : 0) * 60_000L;
                        break;
                    }
                }
                if (at > 0) break;
            }
        }
        if (at == 0) return "متى أذكّرك؟ قل مثلاً: ذكّرني بعد 10 دقائق أتصل بأبوي";
        // the words after the time are the reminder
        label = label.replaceFirst("^\\s*ذك[ّ]?رني\\s*", "")
                .replaceFirst("بعد\\s*(\\d+\\s*)?(دقيقتين|دقيقة|دقائق|دقايق|ساعتين|ساعة|ربع ساعة|نص ساعة|نصف ساعة)", "")
                .replaceFirst("^\\s*(أن|ان)\\s+", "").trim();
        if (label.isEmpty()) label = "تذكير";
        JSONArray list;
        Object cur = Hub.get(this, "voiceReminders");
        list = cur instanceof JSONArray ? (JSONArray) cur : new JSONArray();
        JSONArray keep = new JSONArray();
        for (int i = 0; i < list.length(); i++) if (list.optJSONObject(i) != null && list.optJSONObject(i).optLong("at") > now - 3600_000L) keep.put(list.optJSONObject(i));
        try {
            keep.put(new JSONObject().put("id", "v" + now).put("label", label).put("at", at));
        } catch (Exception ignored) {
        }
        Hub.set(this, "voiceReminders", keep);
        long min = Math.max(1, (at - now) / 60_000L);
        return "حسناً، أذكّرك بعد " + (min >= 60 ? (min / 60) + " ساعة" + (min % 60 > 0 ? " و" + (min % 60) + " دقيقة" : "") : min + " دقيقة") + ": " + label;
    }
}
