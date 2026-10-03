package com.drivecast.sovereign;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

/** The Quran widget / native player: current surah (1-114), reciter and play state, kept on the phone. */
final class QuranState {
    int surah;
    int reciterIndex;
    boolean playing;

    static QuranState load(Context ctx) {
        SharedPreferences p = NativeIslandPlugin.prefs(ctx);
        QuranState q = new QuranState();
        q.surah = Math.max(1, Math.min(114, p.getInt("quranSurah", 1)));
        q.reciterIndex = Math.max(0, p.getInt("quranReciter", 0));
        q.playing = p.getBoolean("quranPlaying", false);
        return q;
    }

    void save(Context ctx) {
        NativeIslandPlugin.prefs(ctx).edit().putInt("quranSurah", surah).putInt("quranReciter", reciterIndex).putBoolean("quranPlaying", playing).apply();
    }

    /** reciters sent by the page (quran.com ids); Mishari al-Afasy until then */
    static JSONArray reciters(Context ctx) {
        JSONObject q = Widgets.json(ctx, "widgets").optJSONObject("quran");
        JSONArray r = q != null ? q.optJSONArray("reciters") : null;
        if (r != null && r.length() > 0) return r;
        JSONArray d = new JSONArray();
        try {
            d.put(new JSONObject().put("id", 7).put("name", "مشاري راشد العفاسي"));
        } catch (Exception ignored) {
        }
        return d;
    }

    int reciterId(Context ctx) {
        JSONArray r = reciters(ctx);
        JSONObject o = r.optJSONObject(reciterIndex % r.length());
        return o != null ? o.optInt("id", 7) : 7;
    }

    String reciterName(Context ctx) {
        JSONArray r = reciters(ctx);
        JSONObject o = r.optJSONObject(reciterIndex % r.length());
        return o != null ? o.optString("name", "") : "";
    }

    String surahName(Context ctx) {
        JSONObject q = Widgets.json(ctx, "widgets").optJSONObject("quran");
        JSONArray s = q != null ? q.optJSONArray("surahs") : null;
        String n = s != null ? s.optString(surah - 1, "") : "";
        return n.isEmpty() ? String.valueOf(surah) : n;
    }
}
