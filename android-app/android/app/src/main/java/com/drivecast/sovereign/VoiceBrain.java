package com.drivecast.sovereign;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.Calendar;
import java.util.Locale;

/**
 * What the voice commands know beyond the fixed phrasings: the date and time, the matches of another day, and — for
 * anything said in an unusual way — the AI (Gemini, the site's assistant key) turns the words into one of the app's
 * actions, or answers a general question in a sentence or two.
 */
final class VoiceBrain {

    private VoiceBrain() {
    }

    /** the site's assistant key (src/lib/constants.ts) */
    private static final String AI_KEY = "AIzaSyBMmtON9ww4dJxMHrl1wKyWTvI0ipJXJws";

    interface Runner {
        String run(String intent, String a, String b);
    }

    private static final String[] DAY_NAMES = {"الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"};
    private static final String[] G_MONTHS = {"يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"};

    /** "اليوم الثلاثاء، 24 ربيع الآخر 1448 هـ، الموافق 6 أكتوبر 2026" (+ the day's occasion) */
    static String today() {
        Calendar c = Calendar.getInstance();
        int[] hj = Widgets.hijri();
        String s = "اليوم " + DAY_NAMES[c.get(Calendar.DAY_OF_WEEK) - 1] + "، " + hj[0] + " " + Widgets.HIJRI_MONTHS[Math.max(0, Math.min(11, hj[1]))] + " " + hj[2]
                + " هـ، الموافق " + c.get(Calendar.DAY_OF_MONTH) + " " + G_MONTHS[c.get(Calendar.MONTH)] + " " + c.get(Calendar.YEAR) + ".";
        String h = Occasions.hijriOccasion(hj), g = Occasions.gregorianOccasion(c);
        if (h != null) s += " " + h.split(" · ")[0] + ".";
        if (g != null) s += " " + g + ".";
        return s;
    }

    static String timeNow() {
        Calendar c = Calendar.getInstance();
        int h = c.get(Calendar.HOUR) == 0 ? 12 : c.get(Calendar.HOUR);
        return "الساعة الآن " + h + ":" + String.format(Locale.ROOT, "%02d", c.get(Calendar.MINUTE)) + (c.get(Calendar.AM_PM) == Calendar.AM ? " صباحاً" : " مساءً");
    }

    private static String get(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(10_000);
        c.setReadTimeout(25_000);
        c.setRequestProperty("Accept", "application/json");
        StringBuilder b = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
            String line;
            while ((line = r.readLine()) != null) b.append(line);
        }
        return b.toString();
    }

    /** The favourite teams' matches of a day (0 today, 1 tomorrow, -1 yesterday), else the day's top ones. */
    static String matchesOn(Context ctx, int day) {
        String when = day == 1 ? "غداً" : day == -1 ? "أمس" : "اليوم";
        try {
            String origin = Widgets.json(ctx, "widgets").optString("origin", "https://cplay2.vercel.app");
            JSONArray teams = Cloud.master(ctx).optJSONArray("favoriteTeams");
            StringBuilder t = new StringBuilder();
            for (int i = 0; teams != null && i < teams.length(); i++) {
                JSONObject f = teams.optJSONObject(i);
                if (f != null && !f.optString("name").isEmpty()) t.append(t.length() > 0 ? "|" : "").append(Cloud.favSpec(f));
            }
            JSONArray list = new JSONObject(get(origin + "/api/matches?limit=12&day=" + day + (t.length() > 0 ? "&teams=" + URLEncoder.encode(t.toString(), "UTF-8") : ""))).optJSONArray("matches");
            if (list == null || list.length() == 0) return "لا توجد مباريات مهمة " + when;
            StringBuilder fav = new StringBuilder(), top = new StringBuilder();
            int nf = 0, nt = 0;
            for (int i = 0; i < list.length(); i++) {
                JSONObject m = list.optJSONObject(i);
                if (m == null || m.optJSONObject("home") == null) continue;
                String line = m.optJSONObject("home").optString("name") + " ضد " + m.optJSONObject("away").optString("name");
                JSONObject sc = m.optJSONObject("score");
                if ("finished".equals(m.optString("status")) && sc != null && !sc.isNull("home")) line += " وانتهت " + sc.optInt("home") + " " + sc.optInt("away");
                else if (!m.optString("omanTime").isEmpty()) line += " الساعة " + Art.to12h(m.optString("omanTime"));
                if (m.optBoolean("favorite") && nf < 6) { fav.append(fav.length() > 0 ? ". " : "").append(line); nf++; }
                else if (nt < 4) { top.append(top.length() > 0 ? ". " : "").append(line); nt++; }
            }
            if (nf > 0) return "مباريات فرقك " + when + ": " + fav + ".";
            return "لا مباريات لفرقك " + when + ". أبرز المباريات: " + top + ".";
        } catch (Exception e) {
            return "تعذّر جلب مباريات " + when;
        }
    }

    private static final String PROMPT =
            "أنت مساعد صوتي عربي داخل تطبيق سيارة (DriveCast). المستخدم قال جملة (قد تكون بلهجة خليجية أو عمانية أو فيها أخطاء تعرّف صوتي). "
            + "حوّلها إلى أمر واحد من القائمة وأرجع JSON فقط بالشكل {\"intent\":\"...\",\"a\":\"...\",\"b\":\"...\"}.\n"
            + "الأوامر:\n"
            + "play_surah: a=اسم السورة، b=اسم القارئ إن ذُكر\n"
            + "play_youtube: a=ما يُبحث عنه في يوتيوب (نشيد، محاضرة، قناة، برنامج...)\n"
            + "stop: إيقاف التشغيل أو القراءة\n"
            + "next_video / prev_video: الفيديو أو المقطع التالي / السابق\n"
            + "pause_resume: إيقاف مؤقت أو متابعة\n"
            + "scores: نتيجة المباراة المباشرة الآن\n"
            + "matches_day: a=0 اليوم، 1 غداً، -1 أمس، 2 بعد غد\n"
            + "prayer_time: a=الفجر|الظهر|العصر|المغرب|العشاء أو فارغ للصلاة القادمة\n"
            + "date_today / time_now\n"
            + "azkar: a=morning|evening أو فارغ (قراءة الأذكار صوتياً)\n"
            + "open_screen: a=واحد من /dashboard /matches /media /football /iptv /quran /settings\n"
            + "hide_islands / show_islands\n"
            + "remind: a=بعد كم دقيقة (رقم)، b=نص التذكير\n"
            + "trip: a=الوجهة (البيت، العمل، أو اسم مكان)\n"
            + "trip_plan: أين أصلي في رحلتي / خطة الطريق\n"
            + "end_trip\n"
            + "save_place: a=home|work (احفظ موقعي الحالي)\n"
            + "mosque: أقرب مسجد\n"
            + "answer: لأي سؤال عام آخر، a=جواب عربي قصير جداً (جملة أو جملتين) مناسب للقراءة بصوت أثناء القيادة\n"
            + "الوقت الآن: ";

    /** The AI's reading of the words, carried out through the runner; null when the AI couldn't be reached. */
    static String understand(Context ctx, String said, Runner runner) throws Exception {
        Calendar c = Calendar.getInstance();
        String now = today() + " " + timeNow();
        JSONObject body = new JSONObject()
                .put("contents", new JSONArray().put(new JSONObject().put("role", "user")
                        .put("parts", new JSONArray().put(new JSONObject().put("text", PROMPT + now + "\nالجملة: «" + said + "»")))))
                .put("generationConfig", new JSONObject().put("responseMimeType", "application/json").put("temperature", 0.2).put("maxOutputTokens", 300));
        JSONObject r = null;
        for (String model : new String[]{"gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"}) {
            try {
                r = post("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + AI_KEY, body);
                break;
            } catch (Exception ignored) {
            }
        }
        if (r == null) return null;
        JSONArray cands = r.optJSONArray("candidates");
        JSONObject content = cands != null && cands.length() > 0 ? cands.optJSONObject(0).optJSONObject("content") : null;
        JSONArray parts = content != null ? content.optJSONArray("parts") : null;
        String text = parts != null && parts.length() > 0 ? parts.optJSONObject(0).optString("text") : "";
        text = text.replaceAll("^```(json)?", "").replaceAll("```$", "").trim();
        JSONObject j = new JSONObject(text);
        return runner.run(j.optString("intent"), j.optString("a", ""), j.optString("b", ""));
    }

    private static JSONObject post(String url, JSONObject body) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(8_000);
        c.setReadTimeout(20_000);
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        c.setRequestProperty("Referer", "https://cplay2.vercel.app/");
        try (OutputStream o = c.getOutputStream()) {
            o.write(body.toString().getBytes("UTF-8"));
        }
        int code = c.getResponseCode();
        if (code >= 400) throw new Exception("AI " + code);
        InputStream in = c.getInputStream();
        StringBuilder b = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(in, "UTF-8"))) {
            String line;
            while ((line = r.readLine()) != null) b.append(line);
        }
        return new JSONObject(b.toString());
    }
}
