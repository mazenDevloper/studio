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

    private static final int MUHARRAM = 0, RAMADAN = 8, SHAWWAL = 9, DHUL_HIJJAH = 11;

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
        if (fasting(ctx, now)) return "صائم اليوم";
        if (c.get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY) return "يوم الجمعة";
        if (hj[0] >= 13 && hj[0] <= 15) return "الأيام البيض";
        return null;
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
            if (now >= fajr && now < maghrib && !done(ctx, "occ-kahf", now)) out.add(banner("occ-kahf", "سورة الكهف · يوم الجمعة"));
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
        if (reason != null && now >= maghrib && now < askEnd && !fasting(ctx, now + 24 * 3600_000L) && !done(ctx, "occ-fast", now)) {
            out.add(banner("occ-fast", "غداً " + reason + " · هل ستصوم؟"));
        }

        // seasons
        if (hj[1] == DHUL_HIJJAH && hj[0] >= 1 && hj[0] <= 8 && now >= fajr && now < (isha > 0 ? isha : maghrib) && !done(ctx, "occ-ten", now))
            out.add(banner("occ-ten", "العشر من ذي الحجة · أكثروا التكبير"));
        if (hj[1] == DHUL_HIJJAH && hj[0] == 9 && now >= fajr && now < maghrib && !done(ctx, "occ-arafah", now))
            out.add(banner("occ-arafah", "يوم عرفة · خير الدعاء دعاء يوم عرفة"));
        if (hj[1] == MUHARRAM && hj[0] == 10 && now >= fajr && now < maghrib && !done(ctx, "occ-ashura", now))
            out.add(banner("occ-ashura", "يوم عاشوراء"));
        boolean eid = (hj[1] == SHAWWAL && hj[0] == 1) || (hj[1] == DHUL_HIJJAH && hj[0] == 10);
        if (eid && now >= fajr && now < dhuhr && !done(ctx, "occ-eid", now))
            out.add(banner("occ-eid", hj[1] == SHAWWAL ? "عيد الفطر مبارك · تقبل الله منا ومنكم" : "عيد الأضحى مبارك · الله أكبر"));
    }
}
