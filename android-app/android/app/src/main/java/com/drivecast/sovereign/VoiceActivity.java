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

    private void listen() {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar");
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, "قل أمرك: شغّل سورة… / كم النتيجة / متى المغرب");
        try {
            startActivityForResult(i, VOICE);
        } catch (Exception e) {
            done("التعرّف على الصوت غير متاح على هذا الجهاز", false);
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != VOICE) return;
        ArrayList<String> r = data != null ? data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS) : null;
        if (res != RESULT_OK || r == null || r.isEmpty()) { finish(); return; }
        String said = r.get(0);
        String answer;
        try {
            answer = run(said);
        } catch (Exception e) {
            answer = null;
        }
        if (answer == null) answer = "لم أفهم: «" + said + "». جرّب: شغّل سورة الكهف، كم النتيجة، متى المغرب";
        view.setText("«" + said + "»\n\n" + answer);
        done(answer, true);
    }

    private void done(String answer, boolean speak) {
        if (speak) say(answer);
        else view.setText(answer);
        ui.postDelayed(this::finish, 3500);
    }

    private void say(String text) {
        IslandService.start(this);
        ui.postDelayed(() -> IslandService.speak(text), 300);
    }

    /** Arabic without diacritics, alef / ya / ta-marbuta forms unified. */
    static String norm(String s) {
        return s.replaceAll("[\\u064B-\\u0652\\u0640]", "").replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
                .replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي').toLowerCase(Locale.ROOT).trim();
    }

    private String run(String said) {
        String s = norm(said);

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
            Intent q = new Intent(this, IslandService.class).setAction(IslandService.QURAN_PLAY).putExtra("surah", surah).putExtra("reciter", reciter);
            ContextCompat.startForegroundService(this, q);
            QuranState st = QuranState.load(this);
            if (reciter >= 0) st.reciterIndex = reciter;
            return "أشغّل سورة " + MediaBrowser.SURAHS[surah - 1] + (st.reciterName(this).isEmpty() ? "" : " بصوت " + st.reciterName(this));
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
            open("/football");
            return s.contains("مسا") ? "أذكار المساء" : s.contains("صباح") ? "أذكار الصباح" : "الأذكار";
        }

        // media
        if (s.equals("التالي") || s.contains("اللي بعده") || s.contains("التالي")) { media(WidgetActionReceiver.MEDIA_NEXT); return "التالي"; }
        if (s.contains("السابق") || s.contains("اللي قبله")) { media(WidgetActionReceiver.MEDIA_PREV); return "السابق"; }
        if (s.contains("اوقف") || s.contains("وقف") || s.contains("كمل") || s.contains("استمر")) {
            QuranState q = QuranState.load(this);
            if (q.playing) { ContextCompat.startForegroundService(this, new Intent(this, IslandService.class).setAction(WidgetActionReceiver.QURAN_TOGGLE)); return "أوقفت التلاوة"; }
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
