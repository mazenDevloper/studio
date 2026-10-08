package com.drivecast.sovereign;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.List;

/**
 * The Islamic calendar's own islands, worked out on the phone from today's prayer times and the Hijri date:
 * Friday (Surat al-Kahf from Fajr to Maghrib, going early to Jumu'ah, the last hour before Maghrib), fasting
 * (the evening before Monday / Thursday / the white days / Arafah / Ashura asks "will you fast tomorrow?"; a fasting
 * day — and every day of Ramadan — counts down to suhoor and iftar), and the seasons (the ten days of Dhul-Hijjah,
 * Arafah, Ashura, the Eids). Each can be marked done for today from its island.
 */
final class Occasions {

    private Occasions() {
    }

    private static final int MUHARRAM = 0, RABI1 = 2, RAJAB = 6, SHABAN = 7, RAMADAN = 8, SHAWWAL = 9, DHUL_HIJJAH = 11;

    private static final String[] MONTHS = {"محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"};

    /** one short saying a day, so every day has at least one island (by day of the year) */
    private static final String[] DAILY = {
            "«أحبّ الأعمال إلى الله أدومها وإن قلّ»",
            "«كلمتان خفيفتان على اللسان: سبحان الله وبحمده، سبحان الله العظيم»",
            "«من قال سبحان الله وبحمده مئة مرة حُطّت خطاياه»",
            "«الكلمة الطيبة صدقة»",
            "«تبسّمك في وجه أخيك صدقة»",
            "«لا حول ولا قوة إلا بالله كنز من كنوز الجنة»",
            "«من صلّى عليّ صلاة صلّى الله عليه بها عشراً»",
            "«الطهور شطر الإيمان»",
            "«خيركم من تعلّم القرآن وعلّمه»",
            "«اتق الله حيثما كنت»",
            "«لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه»",
            "«الدعاء هو العبادة»",
            "«من سلك طريقاً يلتمس فيه علماً سهّل الله له به طريقاً إلى الجنة»",
            "سورة الملك قبل النوم · «تنجي من عذاب القبر»",
    };

    /** the day's Hijri occasion (null: none) */
    static String hijriOccasion(int[] hj) {
        int d = hj[0], m = hj[1];
        if (m == MUHARRAM && d == 1) return "رأس السنة الهجرية " + hj[2] + " هـ";
        if (m == MUHARRAM && d == 9) return "يوم تاسوعاء";
        if (m == MUHARRAM && d == 10) return "يوم عاشوراء";
        if (m == RABI1 && d == 12) return "ذكرى المولد النبوي الشريف ﷺ";
        if (m == RAJAB && d == 27) return "ذكرى الإسراء والمعراج";
        if (m == SHABAN && d == 15) return "النصف من شعبان";
        if (m == RAMADAN && d == 1) return "أول أيام رمضان · رمضان كريم";
        if (m == RAMADAN && d == 27) return "ليلة السابع والعشرين · تحرّ ليلة القدر";
        if (m == RAMADAN && d >= 21) return "العشر الأواخر · تحرّ ليلة القدر";
        if (m == RAMADAN) return "رمضان كريم · اليوم " + d;
        if (m == SHAWWAL && d <= 3) return "عيد الفطر مبارك";
        if (m == DHUL_HIJJAH && d == 9) return "يوم عرفة · خير الدعاء دعاء يوم عرفة";
        if (m == DHUL_HIJJAH && d == 10) return "عيد الأضحى مبارك";
        if (m == DHUL_HIJJAH && d >= 11 && d <= 13) return "أيام التشريق · أيام أكل وشرب وذكر لله";
        if (m == DHUL_HIJJAH && d <= 8) return "العشر من ذي الحجة · أكثروا التكبير";
        if (d == 1) return "هلّ شهر " + MONTHS[m] + " · دعاء رؤية الهلال";
        if (d >= 13 && d <= 15) return "الأيام البيض";
        return null;
    }

    /**
     * The occasions around now (90 days back, 180 ahead): {at (ms, midnight), title}, in date order - for browsing
     * with ‹ › in the occasion island.
     */
    static java.util.List<long[]> aroundDays() {
        java.util.List<long[]> out = new java.util.ArrayList<>();
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, 12);
        c.set(Calendar.MINUTE, 0);
        c.add(Calendar.DAY_OF_MONTH, -90);
        for (int i = 0; i <= 270; i++) {
            int[] hj = Widgets.hijri(c.getTimeInMillis());
            if (hijriOccasion(hj) != null || gregorianOccasion(c) != null) out.add(new long[]{c.getTimeInMillis()});
            c.add(Calendar.DAY_OF_MONTH, 1);
        }
        return out;
    }

    /** "الخميس 15 جمادى الأولى · 22 أكتوبر — الأيام البيض (بعد 14 يوماً)" */
    static String describe(long at) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(at);
        int[] hj = Widgets.hijri(at);
        String[] days = {"الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"};
        String[] gm = {"يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"};
        StringBuilder t = new StringBuilder();
        String h = hijriOccasion(hj), g = gregorianOccasion(c);
        if (h != null) t.append(h);
        if (g != null) t.append(t.length() > 0 ? " · " : "").append(g);
        Calendar today = Calendar.getInstance();
        today.set(Calendar.HOUR_OF_DAY, 12);
        long diff = Math.round((at - today.getTimeInMillis()) / 86_400_000.0);
        String when = diff == 0 ? "اليوم" : diff == 1 ? "غداً" : diff == -1 ? "أمس" : diff > 0 ? "بعد " + diff + " يوماً" : "قبل " + (-diff) + " يوماً";
        return t + "\n" + days[c.get(Calendar.DAY_OF_WEEK) - 1] + " " + hj[0] + " " + MONTHS[hj[1]] + " · " + c.get(Calendar.DAY_OF_MONTH) + " " + gm[c.get(Calendar.MONTH)] + "  (" + when + ")";
    }

    /** the day's Gregorian occasion (null: none) */
    static String gregorianOccasion(Calendar c) {
        int d = c.get(Calendar.DAY_OF_MONTH), m = c.get(Calendar.MONTH) + 1;
        if (m == 1 && d == 1) return "رأس السنة الميلادية " + c.get(Calendar.YEAR);
        if (m == 1 && d == 11) return "ذكرى تولّي جلالة السلطان مقاليد الحكم";
        if (m == 3 && d == 21) return "عيد الأم";
        if (m == 8 && d == 26) return "يوم الشباب العُماني";
        if (m == 10 && d == 17) return "يوم المرأة العُمانية";
        if (m == 11 && d == 20) return "العيد الوطني العُماني";
        return null;
    }

    /** Today's adhan times by prayer id (fajr, dhuhr, asr, maghrib, isha) - 0 when unknown. */
    private static long[] times(Context ctx, long now) {
        long[] t = new long[5];
        String[][] names = {{"الفجر", "fajr"}, {"الظهر", "dhuhr"}, {"العصر", "asr"}, {"المغرب", "maghrib"}, {"العشاء", "isha"}};
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(now);
        JSONArray list = Widgets.dayCountdowns(ctx);
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject o = list.optJSONObject(i);
            if (o == null || !"azan".equals(o.optString("kind"))) continue;
            Calendar d = Calendar.getInstance();
            d.setTimeInMillis(o.optLong("at"));
            if (d.get(Calendar.DAY_OF_YEAR) != c.get(Calendar.DAY_OF_YEAR)) continue;
            String title = o.optString("title");
            for (int k = 0; k < names.length; k++) if (title.contains(names[k][0]) || title.equalsIgnoreCase(names[k][1])) t[k] = o.optLong("at");
        }
        return t;
    }

    private static long tomorrowFajr(Context ctx, long now) {
        JSONArray list = Widgets.dayCountdowns(ctx);
        long best = 0;
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject o = list.optJSONObject(i);
            if (o == null || !"azan".equals(o.optString("kind")) || !o.optString("title").contains("الفجر")) continue;
            long at = o.optLong("at");
            if (at > now && (best == 0 || at < best)) best = at;
        }
        return best;
    }

    private static boolean done(Context ctx, String id, long now) {
        return Hub.has(ctx, "doneToday:" + Cloud.day(now), id);
    }

    /** Is the user fasting on this date (Ramadan, or "I'll fast" chosen the evening before)? */
    static boolean fasting(Context ctx, long when) {
        int[] hj = Widgets.hijri(when);
        if (hj[1] == RAMADAN) return true;
        Object f = Hub.get(ctx, "fastDate");
        return f != null && Cloud.day(when).equals(String.valueOf(f));
    }

    /** Why tomorrow is a day to fast (null: it isn't). */
    static String fastReason(long now) {
        long tomorrow = now + 24 * 3600_000L;
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(tomorrow);
        int[] hj = Widgets.hijri(tomorrow);
        if (hj[1] == RAMADAN) return null; // Ramadan: always
        if (hj[1] == SHAWWAL && hj[0] == 1) return null; // Eid
        if (hj[1] == DHUL_HIJJAH && hj[0] == 9) return "صيام يوم عرفة";
        if (hj[1] == DHUL_HIJJAH && hj[0] >= 10 && hj[0] <= 13) return null; // Eid and tashreeq
        if (hj[1] == MUHARRAM && hj[0] == 10) return "صيام يوم عاشوراء";
        if (hj[1] == MUHARRAM && hj[0] == 9) return "صيام تاسوعاء";
        if (hj[0] >= 13 && hj[0] <= 15) return "صيام الأيام البيض";
        int dow = c.get(Calendar.DAY_OF_WEEK);
        if (dow == Calendar.MONDAY) return "صيام الإثنين";
        if (dow == Calendar.THURSDAY) return "صيام الخميس";
        return null;
    }

    /** A short label for the day widget (null: an ordinary day). */
    static String label(Context ctx) {
        long now = System.currentTimeMillis();
        int[] hj = Widgets.hijri(now);
        Calendar c = Calendar.getInstance();
        if (hj[1] == SHAWWAL && hj[0] == 1) return "عيد الفطر مبارك";
        if (hj[1] == DHUL_HIJJAH && hj[0] == 10) return "عيد الأضحى مبارك";
        if (hj[1] == DHUL_HIJJAH && hj[0] == 9) return "يوم عرفة";
        if (hj[1] == MUHARRAM && hj[0] == 10) return "يوم عاشوراء";
        if (hj[1] == RAMADAN) return "رمضان كريم";
        if (hj[1] == DHUL_HIJJAH && hj[0] <= 9) return "العشر من ذي الحجة";
        String h = hijriOccasion(hj);
        if (h != null) return h.split(" · ")[0];
        String g = gregorianOccasion(c);
        if (g != null) return g;
        if (fasting(ctx, now)) return "صائم اليوم";
        int dow = c.get(Calendar.DAY_OF_WEEK);
        if (dow == Calendar.FRIDAY) return "يوم الجمعة";
        if (fastReason(now) != null) return "غداً " + fastReason(now);
        if (dow == Calendar.SUNDAY || dow == Calendar.TUESDAY) return "يوم الرياضة";
        return null;
    }

    private static boolean containsId(List<IslandArt.Item> l, String id) {
        for (IslandArt.Item it : l) if (id.equals(it.id)) return true;
        return false;
    }

    /** the occasion rules: the app's copy (Hub), else the cloud's, else the defaults */
    static JSONArray rules(Context ctx) {
        Object h = Hub.get(ctx, "occasionRules");
        if (h instanceof JSONArray) return (JSONArray) h;
        JSONArray m = Cloud.master(ctx).optJSONArray("occasionRules");
        if (m != null) return m;
        try {
            return new JSONArray("[{\"id\":\"kahf\",\"title\":\"سورة الكهف · يوم الجمعة\",\"days\":[5]},{\"id\":\"sport\",\"title\":\"🏃 يوم الرياضة\",\"days\":[0,2]},"
                    + "{\"id\":\"mosque\",\"title\":\"🕌 طلعة المسجد\",\"days\":[3]},{\"id\":\"fast\",\"title\":\"تذكير: صيام الغد\",\"days\":[0,3]},{\"id\":\"shop\",\"title\":\"🛒 التسوّق الشهري\",\"monthDay\":23}]");
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    private static IslandArt.Item banner(String id, String title) {
        IslandArt.Item it = new IslandArt.Item();
        it.kind = "azkar";
        it.id = id;
        it.title = title;
        return it;
    }

    private static IslandArt.Item countdown(String id, String title, long at) {
        IslandArt.Item it = new IslandArt.Item();
        it.kind = "countdown";
        it.id = id;
        it.title = title;
        it.at = at;
        it.ckind = "occasion";
        return it;
    }

    /** The occasion islands for now (added to the others). */
    static void items(Context ctx, List<IslandArt.Item> out, long now) {
        if (!Hub.bool(ctx, "occasions", true)) return;
        long[] t = times(ctx, now);
        long fajr = t[0], dhuhr = t[1], asr = t[2], maghrib = t[3], isha = t[4];
        if (fajr == 0 || maghrib == 0) return;
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(now);
        int[] hj = Widgets.hijri(now);
        boolean friday = c.get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY;

        // Friday
        if (friday) {
            // (Surat al-Kahf now comes from the occasion rules below)
            if (dhuhr > 0 && now >= dhuhr - 90 * 60_000L && now < dhuhr) out.add(countdown("occ-jumuah", "الجمعة · بكّر إلى الصلاة", dhuhr));
            if (now >= maghrib - 60 * 60_000L && now < maghrib && !done(ctx, "occ-hour", now)) out.add(countdown("occ-hour", "ساعة الإجابة · أكثر من الدعاء", maghrib));
        }

        // fasting today: suhoor before Fajr, iftar from Asr
        if (fasting(ctx, now)) {
            if (now >= fajr - 60 * 60_000L && now < fajr) out.add(countdown("occ-suhoor", "السحور · ينتهي مع الفجر", fajr));
            if (asr > 0 && now >= asr && now < maghrib) out.add(countdown("occ-iftar", "الإفطار", maghrib));
        }
        // fasting tomorrow (chosen, or Ramadan): the suhoor countdown late at night
        long nextFajr = tomorrowFajr(ctx, now);
        if (nextFajr > 0 && nextFajr - now < 60 * 60_000L && nextFajr > fajr && fasting(ctx, nextFajr)) out.add(countdown("occ-suhoor2", "السحور · ينتهي مع الفجر", nextFajr));

        // the evening before a day to fast: ask
        String reason = fastReason(now);
        long askEnd = isha > 0 ? isha + 3 * 3600_000L : maghrib + 4 * 3600_000L;
        if (reason != null && now >= (asr > 0 ? asr : maghrib) && now < askEnd && !fasting(ctx, now + 24 * 3600_000L) && !done(ctx, "occ-fast", now)) {
            out.add(banner("occ-fast", "تذكير صيام الغد · " + reason + " · هل ستصوم؟"));
        }

        // the day's occasions, from Fajr until Isha: Hijri, Gregorian, sport days - and, when the day has none,
        // a short saying, so there is always one
        long dayEnd = isha > 0 ? isha + 60 * 60_000L : maghrib + 2 * 3600_000L;
        boolean daytime = now >= fajr && now < dayEnd;
        int before = out.size();
        String h = hijriOccasion(hj);
        if (h != null && daytime && !done(ctx, "occ-hijri", now)) out.add(banner("occ-hijri", "🌙 " + h));
        String g = gregorianOccasion(c);
        if (g != null && daytime && !done(ctx, "occ-greg", now)) out.add(banner("occ-greg", "📅 " + g));
        int dow = c.get(Calendar.DAY_OF_WEEK);
        // your weekly / monthly occasions (site settings ← المناسبات): Kahf on Friday, sport, the mosque outing, the
        // monthly shopping...; "fast" reminds the day before from Asr (with "سأصوم")
        JSONArray rules = rules(ctx);
        List<String> routine = new java.util.ArrayList<>();
        int jsDow = dow - 1; // 0 = Sunday, like the site
        for (int i = 0; i < rules.length(); i++) {
            JSONObject r = rules.optJSONObject(i);
            if (r == null || r.optBoolean("off")) continue;
            boolean today = false;
            JSONArray ds = r.optJSONArray("days");
            for (int k = 0; ds != null && k < ds.length(); k++) if (ds.optInt(k) == jsDow) today = true;
            if (r.optInt("monthDay") > 0 && r.optInt("monthDay") == c.get(Calendar.DAY_OF_MONTH)) today = true;
            if (!today) continue;
            String rid = r.optString("id");
            if ("fast".equals(rid)) {
                String why = reason != null ? reason : "صيام الغد";
                if (now >= (asr > 0 ? asr : maghrib) && now < askEnd && !fasting(ctx, now + 24 * 3600_000L) && !done(ctx, "occ-fast", now) && !containsId(out, "occ-fast"))
                    out.add(banner("occ-fast", "تذكير صيام الغد · " + why + " · هل ستصوم؟"));
                continue;
            }
            if (daytime && !done(ctx, "occ-r-" + rid, now)) routine.add(r.optString("title"));
        }
        // today's weekly / monthly ones together in one island
        if (!routine.isEmpty() && !done(ctx, "occ-routine", now)) {
            StringBuilder t = new StringBuilder("📅 ");
            for (int i = 0; i < routine.size(); i++) t.append(i > 0 ? " • " : "").append(routine.get(i));
            IslandArt.Item it = banner("occ-routine", t.toString());
            out.add(it);
        }
        boolean any = out.size() > before || friday || fasting(ctx, now) || reason != null;
        if (!any && daytime && !done(ctx, "occ-daily", now))
            out.add(banner("occ-daily", "✨ " + DAILY[c.get(Calendar.DAY_OF_YEAR) % DAILY.length]));
    }
}
