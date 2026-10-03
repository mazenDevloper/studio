package com.drivecast.sovereign;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.RectF;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

/**
 * Not a pass/fail test: draws every widget and island with sample data (today's real matches from the site's API, so
 * real logos and names) into PNG files, so the look can be checked on CI without a phone
 * (.github/workflows/android-previews.yml publishes them).
 */
@RunWith(AndroidJUnit4.class)
public class PreviewRender {

    private Context ctx;
    private File out;

    @Test
    public void renderAll() throws Exception {
        ctx = InstrumentationRegistry.getInstrumentation().getTargetContext();
        out = new File(ctx.getFilesDir(), "previews");
        //noinspection ResultOfMethodCallIgnored
        out.mkdirs();
        // the real font: start the downloads and wait for them
        Fonts.black(ctx);
        Fonts.bold(ctx);
        Fonts.medium(ctx);
        for (int i = 0; i < 60 && !Fonts.ready(ctx); i++) Thread.sleep(500);
        Thread.sleep(500);
        int s = 2; // pixels per dp, like a tablet

        // ---- prayer ----
        List<WidgetArt.Prayer> today = new ArrayList<>();
        String[][] p = {{"الفجر", "4:52"}, {"الظهر", "11:58"}, {"العصر", "3:20"}, {"المغرب", "6:17"}, {"العشاء", "7:23"}};
        WidgetArt.Prayer next = null;
        for (int i = 0; i < p.length; i++) {
            WidgetArt.Prayer x = new WidgetArt.Prayer();
            x.name = p[i][0];
            x.time = p[i][1];
            x.passed = i < 3;
            x.next = i == 3;
            if (x.next) next = x;
            today.add(x);
        }
        save("prayer_wide", WidgetArt.prayer(ctx, 360 * s, 180 * s, next, next.time, today));
        save("prayer_tall", WidgetArt.prayer(ctx, 220 * s, 300 * s, next, next.time, today));

        // ---- matches (today's real fixtures) ----
        JSONArray list = sampleMatches();
        save("matches", WidgetArt.matches(ctx, 400 * s, 230 * s, list));
        save("matches_small", WidgetArt.matches(ctx, 260 * s, 130 * s, list));

        // ---- media, Quran, screens ----
        save("media", WidgetArt.media(ctx, 380 * s, 100 * s, "سورة الكهف كاملة بصوت مشاري العفاسي", "قناة التلاوات", "video", true,
                Images.get(ctx, "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg", 640)));
        save("quran", WidgetArt.quran(ctx, 380 * s, 100 * s, "سورة البقرة", "مشاري راشد العفاسي", false));
        save("screens", WidgetArt.screens(ctx, 380 * s, 200 * s));

        // ---- moon ----
        int[] hj = Widgets.hijri();
        Bitmap moon = Images.get(ctx, "https://phasesmoon.com/moonpng/220/moon-phase-" + Math.max(1, Math.min(30, hj[0])) + ".webp", 440);
        save("moon_hijri", WidgetArt.moon(ctx, 200 * s, 200 * s, moon, Art.arabicDigits(String.valueOf(hj[0])), "ربيع الآخر", "الهجري", 0));
        save("moon_greg", WidgetArt.moon(ctx, 200 * s, 200 * s, moon, "3", "أكتوبر", "الميلادي", 1));

        // ---- manuscript: gold ink over the board's default background ----
        Art.Ink gold = new Art.Ink();
        gold.mode = "gold";
        Bitmap bg = Images.get(ctx, "https://www.image2url.com/r2/default/images/1782382707952-d99447c6-bc60-475d-9406-5fd2ef320bd5.png", 1024);
        save("manuscript_gold", WidgetArt.manuscript(ctx, 320 * s, 200 * s, bg, null, "فإذا فرغت فانصب", null, 1f, gold, true));
        save("manuscript_white", WidgetArt.manuscript(ctx, 320 * s, 200 * s, bg, null, "وإلى ربك فارغب", null, 1f, new Art.Ink(), false));

        // ---- folders ----
        save("folders_header", WidgetArt.foldersHeader(ctx, 380 * s, 34 * s, 7));
        Bitmap thumb = Images.get(ctx, "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg", 640);
        save("folder_card", WidgetArt.folderCard(ctx, 200 * s, 120 * s, "تلاوات الحرم", 24, thumb));
        save("video_card", WidgetArt.videoCard(ctx, 200 * s, 120 * s, "أجمل تلاوة خاشعة تريح القلب - سورة يس", "قناة القرآن الكريم", thumb, thumb));

        // ---- islands ----
        long now = System.currentTimeMillis();
        List<IslandArt.Item> items = new ArrayList<>();
        for (int i = 0; i < Math.min(3, list.length()); i++) items.add(item(list.getJSONObject(i), now));
        IslandArt.Item cd = new IslandArt.Item();
        cd.kind = "countdown";
        cd.title = "المغرب";
        cd.at = now + 4 * 60_000 + 59_000;
        cd.ckind = "azan";
        items.add(cd);
        IslandArt.Item az = new IslandArt.Item();
        az.kind = "azkar";
        az.title = "أذكار المساء";
        items.add(az);
        // logos for the islands (they draw only cached ones)
        for (IslandArt.Item it : items) {
            Images.get(ctx, it.homeLogo, 200);
            Images.get(ctx, it.awayLogo, 200);
        }
        save("islands_compact", strip(items, 44 * s, false, now));
        save("islands_expanded", strip(items, 60 * s, true, now));

        if (list.length() > 0) {
            IslandArt.Item g = item(list.getJSONObject(0), now);
            g.kind = "goal";
            g.side = "away";
            g.scorer = "نيكولاس جاكسون";
            g.minute = "58'";
            Bitmap card = WidgetArt.blank(380 * s, 96 * s + 16 * s);
            IslandArt.drawGoal(ctx, new Canvas(card), new RectF(8 * s, 8 * s, card.getWidth() - 8 * s, card.getHeight() - 8 * s), g, null, null);
            save("goal_card", card);
        }
    }

    private Bitmap strip(List<IslandArt.Item> items, int h, boolean expanded, long now) {
        int gap = h / 6;
        List<Float> widths = new ArrayList<>();
        float total = gap;
        for (IslandArt.Item it : items) {
            float w = IslandArt.measure(ctx, it, h, expanded, now);
            widths.add(w);
            total += w + gap;
        }
        Bitmap b = Bitmap.createBitmap(Math.round(total), h + gap * 2, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        c.drawColor(0xFF1E293B); // a home-screen-ish backdrop
        float x = total - gap; // right to left
        for (int i = 0; i < items.size(); i++) {
            float w = widths.get(i);
            IslandArt.draw(ctx, c, new RectF(x - w, gap, x, gap + h), items.get(i), expanded, now);
            x -= w + gap;
        }
        return b;
    }

    private static IslandArt.Item item(JSONObject m, long now) {
        IslandArt.Item it = new IslandArt.Item();
        it.kind = "match";
        JSONObject h = m.optJSONObject("home"), a = m.optJSONObject("away");
        it.home = h.optString("name");
        it.away = a.optString("name");
        it.homeLogo = h.optString("logo", null);
        it.awayLogo = a.optString("logo", null);
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

    /** Today's matches from the site, the first ones dressed as live / upcoming / finished to show every state. */
    private JSONArray sampleMatches() throws Exception {
        JSONArray src = new JSONArray();
        try {
            HttpURLConnection c = (HttpURLConnection) new URL("https://cplay2.vercel.app/api/matches?limit=12").openConnection();
            c.setConnectTimeout(20_000);
            c.setReadTimeout(40_000);
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
            }
            JSONArray m = new JSONObject(sb.toString()).optJSONArray("matches");
            if (m != null) src = m;
        } catch (Exception ignored) {
        }
        if (src.length() < 4) {
            String[][] t = {{"Crystal Palace", "Bristol City"}, {"Cracovia Krakow", "Termalica Nieciecza"}, {"Saudi Arabia", "Qatar"}, {"Oman", "United Arab Emirates"}};
            for (String[] x : t) src.put(new JSONObject().put("id", x[0]).put("home", new JSONObject().put("name", x[0])).put("away", new JSONObject().put("name", x[1])));
        }
        JSONArray outList = new JSONArray();
        long now = System.currentTimeMillis() / 1000;
        for (int i = 0; i < Math.min(5, src.length()); i++) {
            JSONObject m = new JSONObject(src.getJSONObject(i).toString());
            switch (i) {
                case 0: m.put("status", "live").put("elapsed", 58).put("favorite", true).put("score", new JSONObject().put("home", 0).put("away", 2)); break;
                case 1: m.put("status", "live").put("elapsed", 91).put("favorite", false).put("score", new JSONObject().put("home", 2).put("away", 0)); break;
                case 2: m.put("status", "upcoming").put("timestamp", now + 5318).put("omanTime", "19:55").put("score", new JSONObject().put("home", JSONObject.NULL).put("away", JSONObject.NULL)).put("elapsed", JSONObject.NULL); break;
                case 3: m.put("status", "upcoming").put("timestamp", now + 4 * 3600).put("omanTime", "22:30").put("score", new JSONObject().put("home", JSONObject.NULL).put("away", JSONObject.NULL)).put("elapsed", JSONObject.NULL); break;
                default: m.put("status", "finished").put("score", new JSONObject().put("home", 1).put("away", 1)).put("elapsed", JSONObject.NULL); break;
            }
            outList.put(m);
        }
        return outList;
    }

    private void save(String name, Bitmap b) throws Exception {
        try (FileOutputStream o = new FileOutputStream(new File(out, name + ".png"))) {
            b.compress(Bitmap.CompressFormat.PNG, 100, o);
        }
    }
}
