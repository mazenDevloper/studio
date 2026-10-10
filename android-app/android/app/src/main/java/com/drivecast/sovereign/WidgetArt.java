package com.drivecast.sovereign;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;

/**
 * Draws each home-screen widget as one picture, the same way the site draws its dashboard cards (Thmanyah, glass
 * numbers, round logos, gradients, glows) - things a plain Android widget layout cannot do. The widget layout puts
 * the picture full size and lays transparent touch areas (and the live countdown) over it; the proportions used
 * here match the weights in those layouts.
 */
final class WidgetArt {

    private WidgetArt() {
    }

    static Bitmap blank(int w, int h) {
        return Bitmap.createBitmap(Math.max(1, w), Math.max(1, h), Bitmap.Config.ARGB_8888);
    }

    private static float radius(int w, int h) {
        return Math.min(w, h) * 0.13f;
    }

    // =============================================================================================== prayer

    /** One prayer of today: name, adhan time ("HH:mm" already 12h), state. */
    static final class Prayer {
        String name;
        String time;
        boolean next;
        boolean passed;
    }

    /** Proportions of widget_prayer.xml: header 30, countdown 26, list 44. */
    static final float PRAYER_HEADER = 0.30f, PRAYER_COUNT = 0.26f;

    static Bitmap prayer(Context ctx, int w, int h, Prayer next, String nextTime, List<Prayer> today) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float rad = radius(w, h);
        RectF card = new RectF(0, 0, w, h);
        Art.card(c, card, rad);
        float pad = Math.min(w, h) * 0.075f;
        Typeface black = Fonts.black(ctx), medium = Fonts.medium(ctx), bold = Fonts.bold(ctx);
        if (next == null) {
            TextPaint t = Art.text(bold, h * 0.09f, Art.alpha(Art.WHITE, 0.45f));
            Art.centerText(c, "افتح التطبيق مرة لتحميل المواقيت", w / 2f, h / 2f, t);
            return b;
        }
        // soft blue light behind the card's top (the site's active prayer glow)
        Art.glow(c, new RectF(w * 0.2f, -h * 0.25f, w * 0.8f, h * 0.2f), h * 0.2f, 0x1F0080FF, h * 0.2f);

        // header: icon square + the next prayer's name, its adhan time underneath
        float headH = h * PRAYER_HEADER;
        float icon = Math.min(headH * 0.62f, w * 0.14f);
        RectF iconBox = new RectF(w - pad - icon, pad * 0.9f, w - pad, pad * 0.9f + icon);
        Art.fill(c, iconBox, icon * 0.3f, Art.alpha(Art.BLUE, 0.2f));
        Art.clockIcon(c, iconBox.centerX(), iconBox.centerY(), icon * 0.27f, Art.BLUE);
        float textRight = iconBox.left - pad * 0.6f;
        TextPaint name = Art.text(black, icon * 0.62f, Art.WHITE);
        name.setTextAlign(Paint.Align.RIGHT);
        Art.fit(name, next.name, textRight - pad - w * 0.3f, icon * 0.35f);
        Art.glassText(c, next.name, textRight, iconBox.top + icon * 0.36f, name, Art.WHITE, Art.alpha(Art.WHITE, 0.55f));
        TextPaint sub = Art.text(bold, icon * 0.27f, Art.alpha(Art.WHITE, 0.4f));
        sub.setTextAlign(Paint.Align.RIGHT);
        c.drawText("الأذان · " + nextTime, textRight, Art.baseline(sub, iconBox.top + icon * 0.86f), sub);
        // "متبقي" over the live countdown (the countdown itself is the widget's own ticking view)
        TextPaint left = Art.text(bold, Math.min(icon * 0.26f, h * 0.045f), Art.alpha(Art.EMERALD, 0.7f));
        Art.centerText(c, "متبقي", w / 2f, h * PRAYER_HEADER, left);

        // the day's prayers
        float listTop = h * (PRAYER_HEADER + PRAYER_COUNT);
        RectF list = new RectF(pad, listTop, w - pad, h - pad);
        int n = today.size();
        if (n == 0) return b;
        boolean wide = w > h * 1.25f;
        if (wide) {
            // chips side by side, right to left
            float gap = pad * 0.45f;
            float cw = (list.width() - gap * (n - 1)) / n;
            for (int i = 0; i < n; i++) {
                Prayer p = today.get(i);
                float r0 = list.right - i * (cw + gap);
                RectF chip = new RectF(r0 - cw, list.top, r0, list.bottom);
                drawPrayerChip(c, chip, p, black, medium, bold);
            }
        } else {
            // rows like the site's prayer card: icon, name, time
            int rows = Math.min(n, Math.max(1, (int) (list.height() / (h * 0.11f))));
            int start = 0;
            for (int i = 0; i < n; i++) if (today.get(i).next) start = Math.max(0, Math.min(i, n - rows));
            float rh = list.height() / rows;
            for (int i = 0; i < rows; i++) {
                Prayer p = today.get(start + i);
                RectF row = new RectF(list.left, list.top + i * rh, list.right, list.top + (i + 1) * rh);
                drawPrayerRow(c, row, p, medium, bold);
            }
        }
        return b;
    }

    private static void drawPrayerChip(Canvas c, RectF r, Prayer p, Typeface black, Typeface medium, Typeface bold) {
        float rad = Math.min(r.width(), r.height()) * 0.28f;
        if (p.next) {
            Art.glow(c, r, rad, 0x4D0080FF, r.height() * 0.25f);
            Art.fill(c, r, rad, Art.alpha(Art.WHITE, 0.15f));
            Art.stroke(c, r, rad, Art.alpha(Art.WHITE, 0.3f), Math.max(1.5f, r.height() / 40f));
        } else {
            Art.fill(c, r, rad, Art.alpha(Art.WHITE, 0.05f));
        }
        float a = p.passed ? 0.4f : 1f;
        TextPaint n = Art.text(bold, r.height() * 0.24f, Art.alpha(Art.WHITE, a * (p.next ? 1f : 0.75f)));
        Art.fit(n, p.name, r.width() * 0.86f, r.height() * 0.14f);
        Art.centerText(c, p.name, r.centerX(), r.top + r.height() * 0.32f, n);
        TextPaint t = Art.text(medium, r.height() * 0.34f, Art.WHITE);
        Art.fit(t, p.time, r.width() * 0.9f, r.height() * 0.18f);
        t.setTextAlign(Paint.Align.CENTER);
        if (p.passed) {
            t.setColor(Art.alpha(Art.WHITE, 0.35f));
            c.drawText(p.time, r.centerX(), Art.baseline(t, r.top + r.height() * 0.68f), t);
        } else {
            Art.glassText(c, p.time, r.centerX(), r.top + r.height() * 0.68f, t);
        }
    }

    private static void drawPrayerRow(Canvas c, RectF r, Prayer p, Typeface medium, Typeface bold) {
        float h = r.height();
        float a = p.passed ? 0.4f : 1f;
        if (p.next) Art.fill(c, new RectF(r.left, r.top + h * 0.06f, r.right, r.bottom - h * 0.06f), h * 0.3f, Art.alpha(Art.WHITE, 0.08f));
        float icon = h * 0.62f;
        RectF ib = new RectF(r.right - h * 0.12f - icon, r.centerY() - icon / 2, r.right - h * 0.12f, r.centerY() + icon / 2);
        Art.fill(c, ib, icon * 0.3f, Art.alpha(Art.WHITE, 0.05f));
        Art.clockIcon(c, ib.centerX(), ib.centerY(), icon * 0.26f, Art.alpha(Art.BLUE, a));
        TextPaint n = Art.text(bold, h * 0.38f, Art.alpha(Art.WHITE, a));
        n.setTextAlign(Paint.Align.RIGHT);
        c.drawText(p.name, ib.left - h * 0.25f, Art.baseline(n, r.top + h * 0.42f), n);
        TextPaint s = Art.text(bold, h * 0.2f, Art.alpha(Art.WHITE, 0.25f * a));
        s.setTextAlign(Paint.Align.RIGHT);
        c.drawText("الأذان", ib.left - h * 0.25f, Art.baseline(s, r.top + h * 0.78f), s);
        TextPaint t = Art.text(medium, h * 0.55f, Art.WHITE);
        t.setTextAlign(Paint.Align.LEFT);
        if (p.passed) {
            t.setColor(Art.alpha(Art.WHITE, 0.3f));
            c.drawText(p.time, r.left + h * 0.2f, Art.baseline(t, r.centerY()), t);
        } else {
            Art.glassText(c, p.time, r.left + h * 0.2f, r.centerY(), t, Art.alpha(Art.WHITE, 0.75f), Art.alpha(Art.WHITE, 0.3f));
        }
    }

    // ============================================================================================== matches

    /** how many match rows one page of the widget holds (the arrows page through the rest) */
    static int matchesPerPage(int w, int h) {
        float unit = Math.min(h, w * 0.5f);
        float pad = Math.max(unit * 0.07f, w * 0.03f);
        float headH = Math.max(h * 0.16f, Math.min(h * 0.22f, unit * 0.2f));
        float avail = h - (pad * 0.5f + headH + pad * 0.2f) - pad * 0.7f - headH * 0.45f - h * 0.13f; // the ‹ › row
        float minRow = Math.max(unit * 0.15f, h * 0.1f);
        int rows = Math.max(1, (int) (avail / minRow));
        return rows * (w > h * 1.6f ? 2 : 1);
    }

    static Bitmap matches(Context ctx, int w, int h, JSONArray list) {
        return matches(ctx, w, h, list, "مباريات فرقي ⚽", "");
    }

    static Bitmap matches(Context ctx, int w, int h, JSONArray list, String heading, String pageText) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float rad = radius(w, h);
        Art.card(c, new RectF(0, 0, w, h), rad);
        Typeface black = Fonts.black(ctx), bold = Fonts.bold(ctx), medium = Fonts.medium(ctx);
        float unit = Math.min(h, w * 0.5f);
        float pad = Math.max(unit * 0.07f, w * 0.03f);

        // header: "⚽ مباريات فرقي" (yellow, right) and how many are live (left)
        float headH = Math.max(h * 0.16f, Math.min(h * 0.22f, unit * 0.2f));
        TextPaint title = Art.text(black, headH * 0.5f, Art.YELLOW);
        title.setTextAlign(Paint.Align.RIGHT);
        c.drawText(heading + (pageText.isEmpty() ? "" : "  " + pageText), w - pad, Art.baseline(title, pad * 0.5f + headH / 2), title);
        int live = 0;
        for (int i = 0; i < list.length(); i++) if ("live".equals(list.optJSONObject(i).optString("status"))) live++;
        if (live > 0) {
            TextPaint lp = Art.text(bold, headH * 0.34f, Art.RED_SOFT);
            lp.setTextAlign(Paint.Align.LEFT);
            String s = "● " + live + " مباشر";
            c.drawText(s, pad, Art.baseline(lp, pad * 0.5f + headH / 2), lp);
        }

        float top = pad * 0.5f + headH + pad * 0.2f;
        float avail = h - top - pad * 0.7f - h * 0.13f; // room for the ‹ › buttons
        if (list.length() == 0) {
            TextPaint e = Art.text(bold, unit * 0.09f, Art.alpha(Art.WHITE, 0.35f));
            Art.centerText(c, heading.startsWith("المنتهية") ? "لا مباريات منتهية" : "لا مباريات لفرقك اليوم", w / 2f, top + avail / 2, e);
            return b;
        }
        // all your teams' matches: smaller rows, and two columns when they still don't fit (a wide widget)
        float minRow = Math.max(unit * 0.15f, h * 0.1f);
        int cap = Math.max(1, (int) (avail / minRow));
        int cols = (list.length() > cap && w > h * 1.1f) || w > h * 1.6f ? 2 : 1;
        int rows = Math.max(1, Math.min((list.length() + cols - 1) / cols, cap));
        int shown = Math.min(list.length(), rows * cols);
        if (shown < list.length()) {
            avail -= headH * 0.45f;
            rows = Math.max(1, Math.min(rows, (int) (avail / minRow)));
            shown = Math.min(list.length(), rows * cols);
        }
        float rowH = Math.min(avail / rows, unit * 0.34f);
        float gap = rowH * 0.1f;
        float colW = (w - pad * 1.4f) / cols;
        for (int i = 0; i < shown; i++) {
            JSONObject m = list.optJSONObject(i);
            int col = i / rows, r = i % rows;
            // RTL: the first column on the right
            float right = w - pad * 0.7f - col * colW, left = right - colW + (cols > 1 ? pad * 0.3f : 0);
            RectF row = new RectF(left, top + r * rowH + gap / 2, right, top + (r + 1) * rowH - gap / 2);
            drawMatchRow(ctx, c, row, m, black, bold, medium);
        }
        if (list.length() > shown) {
            TextPaint more = Art.text(bold, headH * 0.3f, Art.alpha(Art.WHITE, 0.35f));
            more.setTextAlign(Paint.Align.LEFT);
            c.drawText("+" + (list.length() - shown), pad, Art.baseline(more, top + avail + headH * 0.25f), more);
        }
        return b;
    }

    /** One match row (left to right like the site's island): status · home logo, name · score · name, away logo. */
    private static void drawMatchRow(Context ctx, Canvas c, RectF r, JSONObject m, Typeface black, Typeface bold, Typeface medium) {
        float h = r.height();
        String status = m.optString("status");
        boolean isLive = "live".equals(status), finished = "finished".equals(status);
        boolean favLive = isLive && m.optBoolean("favorite");
        float rad = h / 2;
        if (favLive) {
            Art.glow(c, r, rad, 0x59FACC15, h * 0.22f);
            Art.fill(c, r, rad, 0xFF0A0A0C);
            Art.stroke(c, r, rad, Art.alpha(Art.YELLOW, 0.7f), Math.max(1.5f, h / 30f));
        } else {
            Art.fill(c, r, rad, Art.alpha(Art.WHITE, 0.045f));
            Art.stroke(c, r, rad, Art.alpha(Art.WHITE, 0.08f), Math.max(1f, h / 50f));
        }
        JSONObject home = m.optJSONObject("home"), away = m.optJSONObject("away");
        String hn = home != null ? home.optString("name") : "", an = away != null ? away.optString("name") : "";
        int logoPx = Math.round(h * 0.8f);
        Bitmap hl = Images.get(ctx, home != null ? home.optString("logo") : null, logoPx);
        Bitmap al = Images.get(ctx, away != null ? away.optString("logo") : null, logoPx);

        // status at the left end: red minute badge / kick-off time / "انتهت"
        float x = r.left + h * 0.18f;
        float badgeH = h * 0.52f;
        String minute = isLive ? (m.isNull("elapsed") ? "مباشر" : "د" + m.optInt("elapsed")) : null;
        float statusW;
        if (isLive) {
            statusW = Art.minuteBadgeWidth(minute, badgeH, black);
            Art.minuteBadge(c, minute, x + statusW / 2, r.centerY(), badgeH, black);
        } else {
            String s = finished ? "انتهت" : Art.to12h(m.optString("omanTime"));
            TextPaint sp = Art.text(finished ? bold : medium, h * (finished ? 0.26f : 0.32f), Art.alpha(Art.WHITE, finished ? 0.4f : 0.6f));
            statusW = Math.max(sp.measureText(s), h * 0.6f);
            Art.centerText(c, s, x + statusW / 2, r.centerY(), sp);
        }
        float contentL = x + statusW + h * 0.22f, contentR = r.right - h * 0.12f;
        float lr = h * 0.38f;
        float hcx = contentL + lr, acx = contentR - lr;
        Art.logo(c, hl, hcx, r.centerY(), lr, hn, bold);
        Art.logo(c, al, acx, r.centerY(), lr, an, bold);

        // score in the middle: emerald glass while live, white for the kick-off / final score
        String score;
        if (isLive || finished) {
            JSONObject sc = m.optJSONObject("score");
            int sh = sc != null && !sc.isNull("home") ? sc.optInt("home") : 0, sa = sc != null && !sc.isNull("away") ? sc.optInt("away") : 0;
            score = sh + " - " + sa;
        } else {
            score = "×";
        }
        TextPaint sp = Art.text(black, h * 0.56f, Art.WHITE);
        float mid = (hcx + acx) / 2;
        float sw = sp.measureText(score);
        sp.setTextAlign(Paint.Align.CENTER);
        if (isLive) Art.glassText(c, score, mid, r.centerY(), sp, Art.EMERALD, Art.alpha(Art.EMERALD, 0.55f));
        else if (finished) Art.glassText(c, score, mid, r.centerY(), sp, Art.alpha(Art.WHITE, 0.85f), Art.alpha(Art.WHITE, 0.3f));
        else { sp.setColor(Art.alpha(Art.WHITE, 0.35f)); c.drawText(score, mid, Art.baseline(sp, r.centerY()), sp); }

        // names between logos and score, shortened smartly to fit
        float nameGap = h * 0.18f;
        TextPaint np = Art.text(bold, h * 0.34f, Art.alpha(Art.WHITE, 0.92f));
        float leftMax = (mid - sw / 2 - nameGap) - (hcx + lr + nameGap);
        float rightMax = (acx - lr - nameGap) - (mid + sw / 2 + nameGap);
        float nameSize = h * 0.34f;
        if (leftMax > h * 0.5f) {
            // a long name first gets a slightly smaller size, then the smart shortening
            np.setTextSize(nameSize);
            Art.fit(np, hn, leftMax, nameSize * 0.8f);
            String s = Art.teamName(np, hn, leftMax);
            np.setTextAlign(Paint.Align.LEFT);
            c.drawText(s, hcx + lr + nameGap, Art.baseline(np, r.centerY()), np);
        }
        if (rightMax > h * 0.5f) {
            np.setTextSize(nameSize);
            Art.fit(np, an, rightMax, nameSize * 0.8f);
            String s = Art.teamName(np, an, rightMax);
            np.setTextAlign(Paint.Align.RIGHT);
            c.drawText(s, acx - lr - nameGap, Art.baseline(np, r.centerY()), np);
        }
    }

    // ================================================================================================ media

    /** Proportions of widget_media.xml / widget_quran.xml (left to right): prev 12, toggle 12, next 12, info 64. */
    static final float CTRL = 0.12f;

    static Bitmap media(Context ctx, int w, int h, String title, String subtitle, String kind, boolean playing, Bitmap thumb) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float rad = radius(w, h);
        RectF card = new RectF(0, 0, w, h);
        Art.card(c, card, rad);
        if (thumb != null) {
            Art.cover(c, thumb, card, rad, 0.38f);
            Paint fade = new Paint(Paint.ANTI_ALIAS_FLAG);
            fade.setShader(new android.graphics.LinearGradient(0, 0, w, 0, new int[]{0xF2000000, 0xB3000000, 0x40000000}, new float[]{0f, 0.45f, 1f}, Shader.TileMode.CLAMP));
            c.drawRoundRect(card, rad, rad, fade);
            Art.stroke(c, card, rad, Art.alpha(Art.WHITE, 0.1f), Math.max(1f, h / 200f));
        }
        drawControls(c, w, h, playing, 0xFF22C55E);
        Typeface black = Fonts.black(ctx), bold = Fonts.bold(ctx);
        float infoL = w * CTRL * 3 + w * 0.02f, infoR = w - Math.min(w, h) * 0.12f;
        boolean empty = title == null || title.isEmpty();
        TextPaint t = Art.text(black, h * 0.2f, Art.WHITE);
        t.setTextAlign(Paint.Align.RIGHT);
        String tt = Art.ellipsize(t, empty ? "لا شيء يعمل الآن" : title, infoR - infoL);
        c.drawText(tt, infoR, Art.baseline(t, h * (subtitle == null || subtitle.isEmpty() ? 0.5f : 0.42f)), t);
        if (!empty && subtitle != null && !subtitle.isEmpty()) {
            TextPaint s = Art.text(bold, h * 0.13f, Art.alpha(Art.WHITE, 0.5f));
            s.setTextAlign(Paint.Align.RIGHT);
            c.drawText(Art.ellipsize(s, subtitle, infoR - infoL), infoR, Art.baseline(s, h * 0.66f), s);
        }
        if (!empty && kind != null) {
            String k = "iptv".equals(kind) ? "بث مباشر" : "video".equals(kind) ? "فيديو" : "صوت";
            TextPaint kp = Art.text(bold, h * 0.095f, Art.WHITE);
            float kw = kp.measureText(k) + h * 0.12f, kh = h * 0.16f;
            RectF kr = new RectF(infoR - kw, h * 0.1f, infoR, h * 0.1f + kh);
            Art.fill(c, kr, kh / 2, "iptv".equals(kind) ? Art.alpha(Art.RED, 0.8f) : Art.alpha(Art.BLUE, 0.6f));
            Art.centerText(c, k, kr.centerX(), kr.centerY(), kp);
        }
        return b;
    }

    /** prev / play-pause / next circles in the left 36% of the widget. */
    private static void drawControls(Canvas c, int w, int h, boolean playing, int toggleColor) {
        float cell = w * CTRL;
        float r = Math.min(cell * 0.4f, h * 0.2f);
        float cy = h / 2f;
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        // prev
        p.setColor(Art.alpha(Art.WHITE, 0.08f));
        c.drawCircle(cell * 0.5f + w * 0.01f, cy, r, p);
        Art.skipIcon(c, cell * 0.5f + w * 0.01f, cy, r * 0.45f, Art.WHITE, false);
        // toggle (bigger, coloured, glowing)
        float tr = r * 1.2f;
        Art.glow(c, new RectF(cell * 1.5f - tr, cy - tr, cell * 1.5f + tr, cy + tr), tr, Art.alpha(toggleColor, 0.45f), tr * 0.5f);
        p.setColor(toggleColor);
        c.drawCircle(cell * 1.5f, cy, tr, p);
        Art.playIcon(c, cell * 1.5f + (playing ? 0 : tr * 0.08f), cy, tr * 0.42f, 0xFF000000, playing);
        // next
        p.setColor(Art.alpha(Art.WHITE, 0.08f));
        c.drawCircle(cell * 2.5f - w * 0.01f, cy, r, p);
        Art.skipIcon(c, cell * 2.5f - w * 0.01f, cy, r * 0.45f, Art.WHITE, true);
    }

    // ================================================================================================ Quran

    /** Proportions of the info column in widget_quran.xml: surah 58 (top), reciter 42. */
    static final float QURAN_SURAH = 0.58f;

    static Bitmap quran(Context ctx, int w, int h, String surah, String reciter, boolean playing) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float rad = radius(w, h);
        RectF card = new RectF(0, 0, w, h);
        Art.card(c, card, rad);
        // a faint emerald light on the reading side
        Art.glow(c, new RectF(w * 0.55f, h * 0.1f, w * 1.1f, h * 0.9f), h * 0.3f, 0x1A34D399, h * 0.35f);
        drawControls(c, w, h, playing, Art.EMERALD);
        Typeface black = Fonts.black(ctx), bold = Fonts.bold(ctx);
        float infoL = w * CTRL * 3 + w * 0.02f, infoR = w - Math.min(w, h) * 0.12f;
        TextPaint s = Art.text(black, h * 0.24f, Art.WHITE);
        s.setTextAlign(Paint.Align.RIGHT);
        Art.fit(s, surah, infoR - infoL, h * 0.12f);
        Art.glassText(c, surah, infoR, h * QURAN_SURAH * 0.62f, s, Art.WHITE, Art.alpha(Art.WHITE, 0.45f));
        // reciter as a tappable chip ("tap to change")
        TextPaint rp = Art.text(bold, h * 0.11f, Art.alpha(Art.WHITE, 0.8f));
        String rt = Art.ellipsize(rp, "↻  " + reciter, infoR - infoL - h * 0.2f);
        float rw = rp.measureText(rt) + h * 0.2f, rh = h * 0.2f;
        float cy = h * (QURAN_SURAH + (1 - QURAN_SURAH) * 0.38f);
        RectF chip = new RectF(infoR - rw, cy - rh / 2, infoR, cy + rh / 2);
        Art.fill(c, chip, rh / 2, Art.alpha(Art.EMERALD, 0.15f));
        Art.stroke(c, chip, rh / 2, Art.alpha(Art.EMERALD, 0.35f), Math.max(1f, h / 160f));
        Art.centerText(c, rt, chip.centerX(), chip.centerY(), rp);
        return b;
    }

    // ============================================================================================== screens

    static final String[][] SCREENS = {
            {"الرئيسية", "🏠"}, {"المباريات", "⚽"}, {"IPTV", "📺"}, {"الوسائط", "🎬"},
            {"القرآن", "📖"}, {"الأذكار", "📿"}, {"الإعدادات", "⚙️"},
    };
    private static final int[] SCREEN_COLORS = {Art.BLUE, Art.EMERALD, 0xFFA855F7, Art.RED, 0xFFF59E0B, 0xFF14B8A6, 0xFF94A3B8};

    /** Two rows (4 + 3) like widget_screens.xml; each tile fills its cell minus a gap. */
    static Bitmap screens(Context ctx, int w, int h) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float rad = radius(w, h);
        Art.card(c, new RectF(0, 0, w, h), rad);
        Typeface bold = Fonts.bold(ctx);
        float gap = Math.min(w, h) * 0.035f;
        for (int i = 0; i < 7; i++) {
            int row = i < 4 ? 0 : 1, col = i < 4 ? i : i - 4, cols = row == 0 ? 4 : 3;
            float cw = w / (float) cols, ch = h / 2f;
            // right to left, like the app (RTL)
            float right = w - col * cw;
            RectF cell = new RectF(right - cw + gap, row * ch + gap, right - gap, (row + 1) * ch - gap);
            if (row == 0) cell.top += gap * 0.5f; else cell.bottom -= gap * 0.5f;
            float tr = Math.min(cell.width(), cell.height()) * 0.24f;
            int color = SCREEN_COLORS[i];
            Paint tp = new Paint(Paint.ANTI_ALIAS_FLAG);
            tp.setShader(new android.graphics.LinearGradient(cell.left, cell.top, cell.right, cell.bottom, Art.alpha(color, 0.16f), Art.alpha(Art.WHITE, 0.03f), Shader.TileMode.CLAMP));
            c.drawRoundRect(cell, tr, tr, tp);
            Art.stroke(c, cell, tr, Art.alpha(color, 0.25f), Math.max(1f, h / 220f));
            float icon = Math.min(cell.height() * 0.3f, cell.width() * 0.3f);
            TextPaint ip = Art.text(Typeface.DEFAULT, icon, Art.WHITE);
            Art.centerText(c, SCREENS[i][1], cell.centerX(), cell.top + cell.height() * 0.38f, ip);
            TextPaint lp = Art.text(bold, cell.height() * 0.17f, Art.WHITE);
            Art.fit(lp, SCREENS[i][0], cell.width() * 0.9f, cell.height() * 0.1f);
            Art.centerText(c, SCREENS[i][0], cell.centerX(), cell.top + cell.height() * 0.76f, lp);
        }
        return b;
    }

    // ================================================================================================= moon

    /** mode 0 = Hijri, 1 = Gregorian, 2 = weather (the site's moon widget cycles the same three). */
    static Bitmap moon(Context ctx, int w, int h, Bitmap photo, String value, String sub, String label, int mode) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float rad = radius(w, h);
        RectF card = new RectF(0, 0, w, h);
        Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
        bg.setColor(0xFF000000);
        c.drawRoundRect(card, rad, rad, bg);
        float r = Math.min(w, h) * 0.42f;
        float cx = w / 2f, cy = h * 0.47f;
        Art.moon(c, photo, cx, cy, r);
        Typeface black = Fonts.black(ctx), bold = Fonts.bold(ctx);
        // big number (glass) with a deep shadow so it reads on the bright moon
        TextPaint num = Art.text(black, r * (value.length() > 2 ? 0.78f : 1.0f), Art.WHITE);
        num.setTextAlign(Paint.Align.CENTER);
        num.setShadowLayer(r * 0.25f, 0, 0, 0xFF000000);
        float numCy = cy - r * 0.18f;
        c.drawText(value, cx, Art.baseline(num, numCy), num); // shadow pass
        num.clearShadowLayer();
        Art.glassText(c, value, cx, numCy, num, Art.WHITE, Art.alpha(Art.WHITE, 0.3f));
        // the blue line
        float lw = r * 0.62f, ly = cy + r * 0.32f, lh = Math.max(2f, r / 60f);
        RectF line = new RectF(cx - lw / 2, ly - lh / 2, cx + lw / 2, ly + lh / 2);
        Art.glow(c, line, lh, Art.alpha(Art.BLUE, 0.8f), lh * 4);
        Art.fill(c, line, lh, Art.alpha(Art.BLUE, 0.7f));
        TextPaint s = Art.text(black, r * 0.2f, Art.alpha(Art.WHITE, 0.92f));
        s.setShadowLayer(r * 0.2f, 0, 0, 0xFF000000);
        Art.fit(s, sub, w * 0.8f, r * 0.1f);
        Art.centerText(c, sub, cx, ly + r * 0.24f, s);
        // label chip at the bottom
        TextPaint lp = Art.text(bold, r * 0.11f, Art.alpha(Art.WHITE, 0.65f));
        float chipW = lp.measureText(label) + r * 0.5f, chipH = r * 0.24f;
        float chipCy = Math.min(h - chipH * 0.8f, cy + r + chipH * 0.1f);
        RectF chip = new RectF(cx - chipW / 2, chipCy - chipH / 2, cx + chipW / 2, chipCy + chipH / 2);
        Art.fill(c, chip, chipH / 2, 0xB3000000);
        Art.stroke(c, chip, chipH / 2, Art.alpha(Art.WHITE, 0.12f), Math.max(1f, r / 200f));
        int dot = mode == 0 ? 0xFF60A5FA : mode == 1 ? Art.EMERALD : Art.ORANGE;
        Paint dp = new Paint(Paint.ANTI_ALIAS_FLAG);
        dp.setColor(dot);
        c.drawCircle(chip.right - chipH * 0.55f, chipCy, chipH * 0.14f, dp);
        Art.centerText(c, label, chip.centerX() - chipH * 0.15f, chipCy, lp);
        return b;
    }

    // =========================================================================================== manuscript

    static Bitmap manuscript(Context ctx, int w, int h, Bitmap bgImage, Bitmap art, String text, Typeface textFont, float scale, Art.Ink ink, boolean pinned) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float rad = radius(w, h);
        RectF card = new RectF(0, 0, w, h);
        Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
        bg.setColor(0xFF000000);
        c.drawRoundRect(card, rad, rad, bg);
        if (bgImage != null) Art.cover(c, bgImage, card, rad, 0.4f);
        float inset = Math.min(w, h) * 0.08f;
        RectF box = new RectF(inset, inset, w - inset, h - inset);
        float s = Math.max(0.4f, Math.min(1.6f, scale));
        float bw = box.width() * s, bh = box.height() * s;
        RectF scaled = new RectF(box.centerX() - bw / 2, box.centerY() - bh / 2, box.centerX() + bw / 2, box.centerY() + bh / 2);
        if (art != null) {
            Art.inkImage(c, art, scaled, ink);
        } else if (text != null && !text.isEmpty()) {
            TextPaint tp = Art.text(textFont != null ? textFont : Fonts.black(ctx), Math.min(h * 0.2f, w * 0.12f), ink.paintColor());
            int lw = Math.max(1, Math.round(box.width()));
            StaticLayout sl;
            do {
                sl = new StaticLayout(text, tp, lw, Layout.Alignment.ALIGN_CENTER, 1.15f, 0f, false);
                if (sl.getHeight() <= box.height() || tp.getTextSize() < h * 0.05f) break;
                tp.setTextSize(tp.getTextSize() * 0.9f);
            } while (true);
            Shader sh = ink.shader(lw, sl.getHeight());
            if (sh != null) tp.setShader(sh);
            tp.setShadowLayer(tp.getTextSize() * 0.35f, 0, 0, ink.glowColor());
            c.save();
            c.translate(box.left, box.centerY() - sl.getHeight() / 2f);
            sl.draw(c);
            c.restore();
        } else {
            TextPaint e = Art.text(Fonts.bold(ctx), h * 0.07f, Art.alpha(Art.WHITE, 0.25f));
            Art.centerText(c, "افتح التطبيق مرة لتحميل المخطوطات", w / 2f, h / 2f, e);
        }
        Art.stroke(c, card, rad, Art.alpha(Art.WHITE, 0.1f), Math.max(1f, h / 250f));
        if (pinned) {
            float pr = Math.min(w, h) * 0.065f;
            float px = inset * 0.6f + pr, py = inset * 0.6f + pr;
            Art.glow(c, new RectF(px - pr, py - pr, px + pr, py + pr), pr, Art.alpha(Art.BLUE, 0.7f), pr * 0.8f);
            Paint pp = new Paint(Paint.ANTI_ALIAS_FLAG);
            pp.setColor(Art.alpha(Art.BLUE, 0.85f));
            c.drawCircle(px, py, pr, pp);
            TextPaint pin = Art.text(Typeface.DEFAULT, pr, Art.WHITE);
            Art.centerText(c, "📌", px, py, pin);
        }
        return b;
    }

    // ============================================================================================== folders

    /** Header strip of the folders widget: indigo icon square + title, like the site's card header. */
    static Bitmap foldersHeader(Context ctx, int w, int h, int count) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float icon = h * 0.78f;
        RectF ib = new RectF(w - icon - h * 0.15f, (h - icon) / 2, w - h * 0.15f, (h + icon) / 2);
        Art.glow(c, ib, icon * 0.3f, Art.alpha(Art.INDIGO, 0.5f), icon * 0.25f);
        Art.fill(c, ib, icon * 0.3f, Art.INDIGO);
        TextPaint ip = Art.text(Typeface.DEFAULT, icon * 0.5f, Art.WHITE);
        Art.centerText(c, "📚", ib.centerX(), ib.centerY(), ip);
        TextPaint t = Art.text(Fonts.black(ctx), h * 0.46f, Art.WHITE);
        t.setTextAlign(Paint.Align.RIGHT);
        c.drawText("المجلدات والأكثر مشاهدة", ib.left - h * 0.3f, Art.baseline(t, h / 2f), t);
        if (count > 0) {
            TextPaint n = Art.text(Fonts.bold(ctx), h * 0.3f, Art.alpha(Art.WHITE, 0.25f));
            n.setTextAlign(Paint.Align.LEFT);
            c.drawText(String.valueOf(count), h * 0.3f, Art.baseline(n, h / 2f), n);
        }
        return b;
    }

    /** A folder card: thumbnail at 40%, black fade, name and the indigo "n تلاوة" chip. */
    static Bitmap folderCard(Context ctx, int w, int h, String name, int count, Bitmap thumb) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float rad = h * 0.16f;
        RectF r = new RectF(0, 0, w, h);
        Art.fill(c, r, rad, 0xFF18181B);
        Art.cover(c, thumb, r, rad, 0.4f);
        Art.bottomFade(c, r, rad);
        Art.stroke(c, r, rad, Art.alpha(Art.WHITE, 0.06f), Math.max(1.5f, h / 120f));
        float pad = h * 0.1f;
        TextPaint t = Art.text(Fonts.black(ctx), h * 0.15f, Art.WHITE);
        t.setTextAlign(Paint.Align.RIGHT);
        c.drawText(Art.ellipsize(t, name, w - pad * 2), w - pad, Art.baseline(t, h * 0.64f), t);
        TextPaint cp = Art.text(Fonts.bold(ctx), h * 0.075f, Art.WHITE);
        String chip = count + " تلاوة";
        float cw = cp.measureText(chip) + h * 0.12f, ch = h * 0.13f;
        RectF cr = new RectF(w - pad - cw, h * 0.78f, w - pad, h * 0.78f + ch);
        Art.fill(c, cr, ch / 2, Art.alpha(Art.INDIGO, 0.45f));
        Art.stroke(c, cr, ch / 2, Art.alpha(0xFF818CF8, 0.35f), Math.max(1f, h / 200f));
        Art.centerText(c, chip, cr.centerX(), cr.centerY(), cp);
        return b;
    }

    /** A most-viewed video card: thumbnail at 60%, title, channel avatar + name, the yellow chip. */
    static Bitmap videoCard(Context ctx, int w, int h, String title, String channel, Bitmap thumb, Bitmap avatar, String badgeText) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float rad = h * 0.16f;
        RectF r = new RectF(0, 0, w, h);
        Art.fill(c, r, rad, 0xFF18181B);
        Art.cover(c, thumb, r, rad, 0.6f);
        Art.bottomFade(c, r, rad);
        Art.stroke(c, r, rad, Art.alpha(Art.WHITE, 0.06f), Math.max(1.5f, h / 120f));
        float pad = h * 0.1f;
        TextPaint t = Art.text(Fonts.black(ctx), h * 0.085f, Art.WHITE);
        t.setShadowLayer(h * 0.03f, 0, 0, 0xCC000000);
        StaticLayout sl = new StaticLayout(title == null ? "" : title, t, Math.round(w - pad * 2), Layout.Alignment.ALIGN_NORMAL, 1.05f, 0, false);
        int lines = Math.min(2, sl.getLineCount());
        float lineH = sl.getLineBottom(0);
        float textTop = h * 0.74f - lines * lineH;
        c.save();
        c.clipRect(pad, textTop, w - pad, textTop + lines * lineH);
        c.translate(pad, textTop);
        sl.draw(c);
        c.restore();
        float ay = h * 0.85f, ar = h * 0.055f;
        float ax = w - pad - ar;
        if (avatar != null) Art.circleImage(c, avatar, ax, ay, ar);
        TextPaint chp = Art.text(Fonts.bold(ctx), h * 0.055f, Art.alpha(Art.WHITE, 0.6f));
        chp.setTextAlign(Paint.Align.RIGHT);
        float nameRight = avatar != null ? ax - ar - h * 0.03f : w - pad;
        RectF br = new RectF(pad, ay, pad, ay);
        if (badgeText != null) {
            TextPaint bp = Art.text(Fonts.black(ctx), h * 0.05f, Art.YELLOW);
            float bw = bp.measureText(badgeText) + h * 0.06f, bh = h * 0.09f;
            br = new RectF(pad, ay - bh / 2, pad + bw, ay + bh / 2);
            Art.fill(c, br, bh * 0.25f, Art.alpha(0xFFEAB308, 0.2f));
            Art.stroke(c, br, bh * 0.25f, Art.alpha(0xFFEAB308, 0.4f), Math.max(1f, h / 220f));
            Art.centerText(c, badgeText, br.centerX(), br.centerY(), bp);
        } else {
            // play mark
            Paint pm = new Paint(Paint.ANTI_ALIAS_FLAG);
            pm.setColor(Art.alpha(Art.RED, 0.9f));
            c.drawCircle(pad + h * 0.06f, ay, h * 0.06f, pm);
            Art.playIcon(c, pad + h * 0.065f, ay, h * 0.028f, Art.WHITE, false);
            br = new RectF(pad, ay, pad + h * 0.12f, ay);
        }
        c.drawText(Art.ellipsize(chp, channel == null ? "" : channel, nameRight - br.right - h * 0.05f), nameRight, Art.baseline(chp, ay), chp);
        return b;
    }

    // ======================================================================================= subscriptions

    /** Header of the subscriptions widget: red icon square + "الاشتراكات" + count. */
    static Bitmap channelsHeader(Context ctx, int w, int h, int count) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float icon = h * 0.8f;
        RectF ib = new RectF(w - icon - h * 0.1f, (h - icon) / 2, w - h * 0.1f, (h + icon) / 2);
        Art.glow(c, ib, icon * 0.3f, Art.alpha(Art.RED, 0.5f), icon * 0.25f);
        Art.fill(c, ib, icon * 0.3f, Art.RED);
        Art.playIcon(c, ib.centerX() + icon * 0.03f, ib.centerY(), icon * 0.2f, Art.WHITE, false);
        TextPaint t = Art.text(Fonts.black(ctx), h * 0.46f, Art.WHITE);
        t.setTextAlign(Paint.Align.RIGHT);
        c.drawText("الاشتراكات", ib.left - h * 0.3f, Art.baseline(t, h / 2f), t);
        if (count > 0) {
            TextPaint n = Art.text(Fonts.bold(ctx), h * 0.3f, Art.alpha(Art.WHITE, 0.3f));
            n.setTextAlign(Paint.Align.LEFT);
            c.drawText(String.valueOf(count), h * 0.2f, Art.baseline(n, h / 2f), n);
        }
        return b;
    }

    /** The red search pill (opens the media screen with the search box ready). */
    static Bitmap searchButton(Context ctx, int w, int h) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        RectF r = new RectF(h * 0.06f, h * 0.08f, w - h * 0.06f, h * 0.92f);
        Art.glow(c, r, r.height() / 2, Art.alpha(Art.RED, 0.45f), h * 0.12f);
        Art.fill(c, r, r.height() / 2, Art.RED);
        // magnifier
        float cx = r.right - r.height() * 0.55f, cy = r.centerY(), rr = r.height() * 0.17f;
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(rr * 0.42f);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setColor(Art.WHITE);
        c.drawCircle(cx - rr * 0.2f, cy - rr * 0.2f, rr, p);
        c.drawLine(cx + rr * 0.55f, cy + rr * 0.55f, cx + rr * 1.15f, cy + rr * 1.15f, p);
        TextPaint t = Art.text(Fonts.black(ctx), r.height() * 0.4f, Art.WHITE);
        t.setTextAlign(Paint.Align.CENTER);
        c.drawText("بحث", (r.left + cx - rr * 1.4f) / 2, Art.baseline(t, cy), t);
        return b;
    }

    /** A channel: round avatar (gold ring when starred) and its name, like the media sidebar. */
    static Bitmap channelTile(Context ctx, int w, int h, String name, Bitmap avatar, boolean starred) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        RectF r = new RectF(0, 0, w, h);
        Art.fill(c, r, w * 0.18f, Art.alpha(Art.WHITE, 0.05f));
        Art.stroke(c, r, w * 0.18f, Art.alpha(Art.WHITE, 0.07f), Math.max(1f, w / 120f));
        float ar = w * 0.3f, cx = w / 2f, cy = h * 0.4f;
        if (starred) Art.glow(c, new RectF(cx - ar, cy - ar, cx + ar, cy + ar), ar, Art.alpha(Art.YELLOW, 0.4f), ar * 0.25f);
        Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
        bg.setColor(0xFF27272A);
        c.drawCircle(cx, cy, ar, bg);
        if (avatar != null) Art.circleImage(c, avatar, cx, cy, ar);
        Paint ring = new Paint(Paint.ANTI_ALIAS_FLAG);
        ring.setStyle(Paint.Style.STROKE);
        ring.setStrokeWidth(Math.max(1.5f, w / 45f));
        ring.setColor(starred ? Art.YELLOW : Art.alpha(Art.WHITE, 0.15f));
        c.drawCircle(cx, cy, ar, ring);
        TextPaint t = Art.text(Fonts.bold(ctx), h * 0.11f, Art.WHITE);
        Art.centerText(c, Art.ellipsize(t, name, w * 0.9f), cx, h * 0.83f, t);
        return b;
    }

    // ================================================================================================= map

    /** The car dashboard's radar map: the last picture of the floating map (or a radar drawing) and what a tap does. */
    static Bitmap map(Context ctx, int w, int h, Bitmap snapshot, boolean open) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float rad = radius(w, h);
        RectF card = new RectF(0, 0, w, h);
        Art.card(c, card, rad);
        if (snapshot != null) {
            Art.cover(c, snapshot, card, rad, 0.85f);
        } else {
            // a radar: rings and a sweep
            float cx = w / 2f, cy = h / 2f, R = Math.min(w, h) * 0.42f;
            Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(1f, R / 90f));
            for (int i = 1; i <= 3; i++) {
                p.setColor(Art.alpha(Art.EMERALD, 0.12f + 0.06f * i));
                c.drawCircle(cx, cy, R * i / 3f, p);
            }
            c.drawLine(cx - R, cy, cx + R, cy, p);
            c.drawLine(cx, cy - R, cx, cy + R, p);
            Paint sweep = new Paint(Paint.ANTI_ALIAS_FLAG);
            sweep.setShader(new android.graphics.SweepGradient(cx, cy, new int[]{0x0034D399, 0x0034D399, 0x6634D399}, new float[]{0f, 0.75f, 1f}));
            c.drawCircle(cx, cy, R, sweep);
        }
        Art.bottomFade(c, card, rad);
        TextPaint t = Art.text(Fonts.black(ctx), Math.min(h * 0.11f, w * 0.07f), Art.WHITE);
        t.setTextAlign(Paint.Align.RIGHT);
        float pad = Math.min(w, h) * 0.08f;
        c.drawText("رادار السيارة", w - pad, Art.baseline(t, h - pad - t.getTextSize() * 1.1f), t);
        TextPaint s = Art.text(Fonts.bold(ctx), t.getTextSize() * 0.55f, open ? Art.RED_SOFT : Art.EMERALD);
        s.setTextAlign(Paint.Align.RIGHT);
        c.drawText(open ? "اضغط لإغلاق النافذة العائمة" : "اضغط لفتح الخريطة عائمة فوق التطبيقات", w - pad, Art.baseline(s, h - pad), s);
        Art.stroke(c, card, rad, Art.alpha(Art.WHITE, 0.1f), Math.max(1f, h / 250f));
        return b;
    }

    // ================================================================================================== day

    /** The dashboard's day card: Hijri date (top), the day name stretched with kashida (huge), "الآن 9:55" (bottom right). */
    static Bitmap day(Context ctx, int w, int h, String hijri, String dayName, String now) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float rad = radius(w, h);
        RectF card = new RectF(0, 0, w, h);
        Art.fill(c, card, rad, 0xF209090B);
        Art.stroke(c, card, rad, Art.alpha(Art.WHITE, 0.1f), Math.max(1f, h / 250f));
        TextPaint top = Art.text(Fonts.bold(ctx), h * 0.065f, Art.alpha(Art.WHITE, 0.4f));
        Art.centerText(c, hijri, w / 2f, h * 0.13f, top);
        TextPaint d = Art.text(Fonts.black(ctx), h * 0.4f, Art.WHITE);
        Art.fit(d, dayName, w * 0.86f, h * 0.15f);
        Art.centerText(c, dayName, w / 2f, h * 0.45f, d);
        // bottom right: الآن + the time (the next prayer's countdown is the live view on the left)
        float pad = w * 0.075f, cy = h * 0.82f;
        TextPaint tm = Art.text(Fonts.medium(ctx), h * 0.12f, Art.alpha(Art.WHITE, 0.6f));
        tm.setTextAlign(Paint.Align.RIGHT);
        TextPaint lb = Art.text(Fonts.bold(ctx), h * 0.055f, Art.alpha(Art.WHITE, 0.4f));
        lb.setTextAlign(Paint.Align.RIGHT);
        c.drawText("الآن", w - pad, Art.baseline(lb, cy + h * 0.02f), lb);
        c.drawText(now, w - pad - lb.measureText("الآن") - h * 0.03f, Art.baseline(tm, cy), tm);
        return b;
    }

    /** The next prayer's name in blue (next to the live countdown). */
    static Bitmap dayPrayerName(Context ctx, String name, int h) {
        TextPaint t = Art.text(Fonts.black(ctx), h * 0.85f, 0xFF3B82F6);
        int w = Math.max(1, Math.round(t.measureText(name) + h * 0.3f));
        Bitmap b = blank(w, h);
        Art.centerText(new Canvas(b), name, w / 2f, h / 2f, t);
        return b;
    }

    // ============================================================================================ browsing

    /** Header of a browsing widget: icon square (red play / emerald book / blue magnifier) + the screen's title. */
    static Bitmap browseHeader(Context ctx, int w, int h, String title, int count, String root) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float icon = h * 0.8f;
        int color = "reciters".equals(root) ? Art.EMERALD : "search".equals(root) ? Art.BLUE : Art.RED;
        RectF ib = new RectF(w - icon - h * 0.1f, (h - icon) / 2, w - h * 0.1f, (h + icon) / 2);
        Art.glow(c, ib, icon * 0.3f, Art.alpha(color, 0.5f), icon * 0.25f);
        Art.fill(c, ib, icon * 0.3f, color);
        if ("reciters".equals(root)) {
            TextPaint ip = Art.text(Typeface.DEFAULT, icon * 0.5f, Art.WHITE);
            Art.centerText(c, "📖", ib.centerX(), ib.centerY(), ip);
        } else {
            Art.playIcon(c, ib.centerX() + icon * 0.03f, ib.centerY(), icon * 0.2f, Art.WHITE, false);
        }
        TextPaint t = Art.text(Fonts.black(ctx), h * 0.44f, Art.WHITE);
        t.setTextAlign(Paint.Align.RIGHT);
        float maxW = ib.left - h * 0.3f - h * 0.9f;
        c.drawText(Art.ellipsize(t, title, maxW), ib.left - h * 0.3f, Art.baseline(t, h / 2f), t);
        if (count > 0) {
            TextPaint n = Art.text(Fonts.bold(ctx), h * 0.3f, Art.alpha(Art.WHITE, 0.3f));
            n.setTextAlign(Paint.Align.LEFT);
            c.drawText(String.valueOf(count), h * 0.2f, Art.baseline(n, h / 2f), n);
        }
        return b;
    }

    /** The back button (an arrow pointing right: back in RTL). */
    static Bitmap backButton(Context ctx, int w, int h) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float r = Math.min(w, h) * 0.46f;
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(Art.alpha(Art.WHITE, 0.12f));
        c.drawCircle(w / 2f, h / 2f, r, p);
        p.setColor(Art.WHITE);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(r * 0.16f);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setStrokeJoin(Paint.Join.ROUND);
        float cx = w / 2f, cy = h / 2f, a = r * 0.42f;
        c.drawLine(cx - a, cy, cx + a, cy, p);
        android.graphics.Path head = new android.graphics.Path();
        head.moveTo(cx + a * 0.1f, cy - a * 0.8f);
        head.lineTo(cx + a, cy);
        head.lineTo(cx + a * 0.1f, cy + a * 0.8f);
        c.drawPath(head, p);
        return b;
    }

    /** A surah: its number in an emerald circle and its name. */
    static Bitmap surahTile(Context ctx, int w, int h, String number, String name) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        RectF r = new RectF(0, 0, w, h);
        Art.fill(c, r, h * 0.22f, Art.alpha(Art.WHITE, 0.05f));
        Art.stroke(c, r, h * 0.22f, Art.alpha(Art.EMERALD, 0.18f), Math.max(1f, h / 80f));
        float cr = h * 0.2f, cx = w - h * 0.14f - cr, cy = h / 2f;
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(Art.alpha(Art.EMERALD, 0.18f));
        c.drawCircle(cx, cy, cr, p);
        TextPaint n = Art.text(Fonts.black(ctx), cr * 0.9f, Art.EMERALD);
        Art.centerText(c, Art.arabicDigits(number), cx, cy, n);
        TextPaint t = Art.text(Fonts.black(ctx), h * 0.26f, Art.WHITE);
        float avail = cx - cr - h * 0.12f - h * 0.1f;
        Art.fit(t, name, avail, h * 0.15f);
        t.setTextAlign(Paint.Align.RIGHT);
        c.drawText(name, cx - cr - h * 0.12f, Art.baseline(t, cy), t);
        return b;
    }

    // ============================================================================================ prayer bar

    /** The dashboard's prayer bar: a card per prayer (name, time), the active one bright with a blue glow (green in iqamah). */
    static Bitmap prayerBar(Context ctx, int w, int h, java.util.List<String[]> rows, int active, boolean inIqamah) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float rad = Math.min(h * 0.32f, w * 0.06f);
        RectF card = new RectF(0, 0, w, h);
        Art.fill(c, card, rad, 0xB3000000);
        Art.stroke(c, card, rad, Art.alpha(Art.WHITE, 0.1f), Math.max(1f, h / 120f));
        int n = rows.size();
        if (n == 0) {
            TextPaint e = Art.text(Fonts.bold(ctx), h * 0.2f, Art.alpha(Art.WHITE, 0.4f));
            Art.centerText(c, "افتح التطبيق مرة لتحميل المواقيت", w / 2f, h / 2f, e);
            return b;
        }
        float pad = h * 0.1f, gap = h * 0.08f;
        float cw = (w - pad * 2 - gap * (n - 1)) / n;
        for (int i = 0; i < n; i++) {
            float right = w - pad - i * (cw + gap); // right to left
            RectF r = new RectF(right - cw, pad, right, h - pad);
            boolean on = i == active;
            float rr = Math.min(r.height() * 0.35f, cw * 0.2f);
            if (on) {
                Art.glow(c, r, rr, inIqamah ? 0x5934D399 : 0x4D0088FF, r.height() * 0.3f);
                Art.fill(c, r, rr, Art.alpha(Art.WHITE, 0.15f));
                Art.stroke(c, r, rr, Art.alpha(Art.WHITE, 0.3f), Math.max(1.5f, h / 60f));
            } else {
                Art.fill(c, r, rr, Art.alpha(Art.WHITE, 0.05f));
                Art.stroke(c, r, rr, Art.alpha(Art.WHITE, 0.05f), Math.max(1.5f, h / 60f));
            }
            String[] p = rows.get(i);
            boolean iq = on && inIqamah && !p[2].isEmpty();
            TextPaint nm = Art.text(Fonts.black(ctx), r.height() * 0.22f, Art.WHITE);
            nm.setTextAlign(Paint.Align.RIGHT);
            Art.fit(nm, p[0], r.width() * 0.8f, r.height() * 0.12f);
            c.drawText(p[0], r.right - r.width() * 0.1f, Art.baseline(nm, r.top + r.height() * 0.3f), nm);
            TextPaint tp = Art.text(Fonts.medium(ctx), r.height() * 0.4f, iq ? Art.EMERALD : Art.WHITE);
            tp.setTextAlign(Paint.Align.RIGHT);
            String t = iq ? p[2] : p[1];
            Art.fit(tp, t, r.width() * 0.8f, r.height() * 0.2f);
            tp.setShadowLayer(r.height() * 0.08f, 0, r.height() * 0.04f, 0xCC000000);
            c.drawText(t, r.right - r.width() * 0.1f, Art.baseline(tp, r.top + r.height() * 0.68f), tp);
            if (iq) {
                TextPaint l = Art.text(Fonts.black(ctx), r.height() * 0.13f, Art.EMERALD);
                l.setTextAlign(Paint.Align.LEFT);
                c.drawText("(الإقامة)", r.left + r.width() * 0.08f, Art.baseline(l, r.top + r.height() * 0.74f), l);
            }
        }
        return b;
    }

    // ================================================================================================ clock

    /** The dashboard's clock: big glass digits with the gradient outline, on a glass card. */
    static Bitmap clock(Context ctx, int w, int h, String time) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float rad = radius(w, h);
        RectF card = new RectF(0, 0, w, h);
        Art.card(c, card, rad);
        TextPaint t = Art.text(Fonts.black(ctx), h * 0.78f, Art.WHITE);
        t.setTextAlign(Paint.Align.CENTER);
        t.setLetterSpacing(-0.03f);
        Art.fit(t, time, w * 0.9f, h * 0.2f);
        Paint sh = new Paint(t);
        sh.setColor(0x00000000);
        sh.setShadowLayer(h * 0.12f, 0, h * 0.06f, 0x99000000);
        c.drawText(time, w / 2f, Art.baseline(sh, h / 2f), sh);
        Art.glassOutlinedText(c, time, w / 2f, h / 2f, t);
        return b;
    }

    /** A section title of the media screen: a coloured bar + the title, right aligned. */
    static Bitmap sectionHeader(Context ctx, int w, int h, String title) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float bh = h * 0.56f;
        RectF bar = new RectF(w - h * 0.16f, (h - bh) / 2, w - h * 0.04f, (h + bh) / 2);
        Art.fill(c, bar, bar.width(), Art.BLUE);
        TextPaint t = Art.text(Fonts.black(ctx), h * 0.5f, Art.WHITE);
        t.setTextAlign(Paint.Align.RIGHT);
        c.drawText(Art.ellipsize(t, title, w * 0.9f), bar.left - h * 0.3f, Art.baseline(t, h / 2f), t);
        return b;
    }

    /** An IPTV favourite like the app's IPTV screen: a rounded light card with the logo, a gold star, the name under it. */
    static Bitmap iptvTile(Context ctx, int w, int h, String name, Bitmap logo) {
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        float side = w * 0.94f;
        RectF r = new RectF((w - side) / 2, 0, (w + side) / 2, side * 0.92f);
        float rad = side * 0.18f;
        Art.fill(c, r, rad, logo != null ? 0xFFC7CBD8 : Art.alpha(Art.WHITE, 0.08f));
        if (logo != null) {
            float s = Math.min(r.width() * 0.84f / logo.getWidth(), r.height() * 0.6f / logo.getHeight());
            float lw = logo.getWidth() * s, lh = logo.getHeight() * s;
            c.drawBitmap(logo, null, new RectF(r.centerX() - lw / 2, r.centerY() - lh / 2, r.centerX() + lw / 2, r.centerY() + lh / 2),
                    new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG));
        } else {
            TextPaint tp = Art.text(Typeface.DEFAULT, r.height() * 0.3f, Art.WHITE);
            Art.centerText(c, "📺", r.centerX(), r.centerY(), tp);
        }
        float sr = side * 0.1f, sx = r.right - sr * 1.5f, sy = r.top + sr * 1.5f;
        Paint sp = new Paint(Paint.ANTI_ALIAS_FLAG);
        sp.setColor(0xFFEAB308);
        c.drawCircle(sx, sy, sr, sp);
        TextPaint star = Art.text(Typeface.DEFAULT_BOLD, sr * 1.2f, 0xFF111111);
        Art.centerText(c, "★", sx, sy, star);
        TextPaint t = Art.text(Fonts.black(ctx), h * 0.075f, Art.WHITE);
        Art.centerText(c, Art.ellipsize(t, name, w * 0.95f), w / 2f, r.bottom + (h - r.bottom) / 2, t);
        return b;
    }

    // ================================================================================================ azkar

    /** A dhikr: its name (emerald), the text, and the counter circle (remaining, ✓ when done). Height fits the text. */
    static Bitmap zikrCard(Context ctx, int w, String name, String text, int count, int done) {
        float pad = w * 0.045f, circle = w * 0.13f;
        TextPaint tp = Art.text(Fonts.bold(ctx), w * 0.042f, Art.alpha(Art.WHITE, done >= count ? 0.45f : 0.9f));
        int textW = Math.round(w - pad * 3 - circle);
        StaticLayout sl = new StaticLayout(text, tp, textW, Layout.Alignment.ALIGN_NORMAL, 1.25f, 0f, false);
        float titleH = w * 0.07f;
        int h = Math.round(Math.max(circle + pad * 2, pad * 1.6f + titleH + sl.getHeight()));
        Bitmap b = blank(w, h);
        Canvas c = new Canvas(b);
        RectF r = new RectF(0, 0, w, h);
        boolean finished = done >= count;
        float rad = w * 0.05f;
        Art.fill(c, r, rad, finished ? Art.alpha(Art.EMERALD, 0.1f) : Art.alpha(Art.WHITE, 0.05f));
        Art.stroke(c, r, rad, finished ? Art.alpha(Art.EMERALD, 0.45f) : Art.alpha(Art.WHITE, 0.1f), Math.max(1f, w / 300f));
        TextPaint np = Art.text(Fonts.black(ctx), titleH * 0.62f, Art.EMERALD);
        np.setTextAlign(Paint.Align.RIGHT);
        c.drawText(name, w - pad, Art.baseline(np, pad * 0.8f + titleH / 2), np);
        c.save();
        c.translate(w - pad - textW, pad * 0.8f + titleH);
        sl.draw(c);
        c.restore();
        // the counter
        float cx = pad + circle / 2, cy = h / 2f;
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(finished ? Art.EMERALD : Art.alpha(Art.WHITE, 0.08f));
        c.drawCircle(cx, cy, circle / 2, p);
        Paint ring = new Paint(Paint.ANTI_ALIAS_FLAG);
        ring.setStyle(Paint.Style.STROKE);
        ring.setStrokeWidth(circle * 0.07f);
        ring.setStrokeCap(Paint.Cap.ROUND);
        ring.setColor(Art.EMERALD);
        if (!finished && done > 0) c.drawArc(new RectF(cx - circle / 2, cy - circle / 2, cx + circle / 2, cy + circle / 2), -90, 360f * done / count, false, ring);
        TextPaint cp = Art.text(Fonts.black(ctx), circle * 0.42f, finished ? 0xFF04140D : Art.WHITE);
        Art.centerText(c, finished ? "✓" : Art.arabicDigits(String.valueOf(count - done)), cx, cy, cp);
        return b;
    }
}
