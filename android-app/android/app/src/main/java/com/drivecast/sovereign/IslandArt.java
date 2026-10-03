package com.drivecast.sovereign;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.text.TextPaint;

/**
 * The floating islands, drawn like the site's LiveMatchIsland: black glass pills side by side - a match (minute badge,
 * two round logos, the score in emerald glass while live, gold ring for a favourite team's live match), a countdown
 * (icon square, name, the glass countdown), a dhikr ("الآن"), and the goal celebration card. Shared by the overlay
 * (IslandService) and the goal notification.
 */
final class IslandArt {

    private IslandArt() {
    }

    /** One island. */
    static final class Item {
        String kind;         // match | countdown | azkar | goal | more
        String id = "";
        String matchId = "", leagueId = "", homeId = "";
        // match / goal
        String home = "", away = "", homeLogo, awayLogo, status = "";
        int sh, sa;
        int elapsed = -1;
        long kickoff;        // ms
        String kickoffText = "";
        boolean fav;
        // countdown / azkar
        String title = "";
        long at;             // ms
        String ckind = "";   // azan | iqamah
        // goal
        String side = "";    // home | away
        String scorer = "", minute = "", photo;
        int more;

        boolean live() { return "live".equals(status); }
        boolean finished() { return "finished".equals(status); }
    }

    private static Typeface black, bold, medium;

    private static void fonts(Context ctx) {
        black = Fonts.black(ctx);
        bold = Fonts.bold(ctx);
        medium = Fonts.medium(ctx);
    }

    /** Width a pill needs at height h (px). */
    static float measure(Context ctx, Item it, float h, boolean expanded, long now) {
        fonts(ctx);
        switch (it.kind) {
            case "match": {
                float w = h * 0.25f;
                if (it.live()) w += Art.minuteBadgeWidth(minuteText(it), h * 0.56f, black) + h * 0.16f;
                w += h * 0.86f * 2; // logos
                TextPaint sp = Art.text(black, h * 0.56f, Art.WHITE);
                w += Math.max(h * 1.3f, sp.measureText(centerText(it, now))) + h * 0.36f;
                if (expanded) {
                    TextPaint np = Art.text(bold, h * 0.26f, Art.WHITE);
                    w += Math.min(np.measureText(it.home), h * 2.6f) + Math.min(np.measureText(it.away), h * 2.6f) + h * 0.4f;
                }
                return w + h * 0.25f;
            }
            case "countdown":
            case "azkar": {
                TextPaint n = Art.text(bold, h * 0.24f, Art.WHITE);
                TextPaint t = Art.text(black, h * 0.46f, Art.WHITE);
                float text = Math.max(n.measureText(it.title), t.measureText(countdownText(it, now)));
                return h * 0.3f + h * 0.66f + h * 0.22f + Math.max(text, h * 1.6f) + h * 0.38f;
            }
            case "goal":
                return h * 4.6f;
            default: // more
                return h;
        }
    }

    static String minuteText(Item it) {
        return it.elapsed >= 0 ? "د" + it.elapsed : "مباشر";
    }

    /** What sits between the logos: the score, or the kick-off countdown / time for a match about to start. */
    static String centerText(Item it, long now) {
        if (it.live() || it.finished()) return it.sh + "-" + it.sa;
        long left = (it.kickoff - now) / 1000;
        if (left > 0 && left <= 3600) return "-" + Art.countdown(left);
        return it.kickoffText;
    }

    static String countdownText(Item it, long now) {
        if ("azkar".equals(it.kind)) return "الآن";
        long left = (it.at - now) / 1000;
        return left > 0 ? "-" + Art.countdown(left) : "الآن";
    }

    static void draw(Context ctx, Canvas c, RectF r, Item it, boolean expanded, long now) {
        fonts(ctx);
        switch (it.kind) {
            case "match": drawMatch(ctx, c, r, it, expanded, now); break;
            case "countdown":
            case "azkar": drawCountdown(c, r, it, now); break;
            case "goal": drawGoal(ctx, c, r, it, null, null); break;
            default: drawMore(c, r, it); break;
        }
    }

    private static void pillBase(Canvas c, RectF r, int border, int glow) {
        float rad = r.height() / 2;
        if (glow != 0) Art.glow(c, r, rad, glow, r.height() * 0.3f);
        Art.fill(c, r, rad, 0xF2000000);
        Paint sheen = new Paint(Paint.ANTI_ALIAS_FLAG);
        sheen.setShader(new android.graphics.LinearGradient(r.left, r.top, r.right, r.bottom, 0x14FFFFFF, 0x00FFFFFF, android.graphics.Shader.TileMode.CLAMP));
        c.drawRoundRect(r, rad, rad, sheen);
        Art.stroke(c, r, rad, border, Math.max(1.5f, r.height() / 36f));
    }

    private static void drawMatch(Context ctx, Canvas c, RectF r, Item it, boolean expanded, long now) {
        float h = r.height();
        boolean favLive = it.fav && it.live();
        pillBase(c, r, favLive ? Art.alpha(Art.YELLOW, 0.7f) : Art.alpha(Art.WHITE, 0.12f), favLive ? 0x59FACC15 : 0);
        float x = r.left + h * 0.25f;
        float cy = r.centerY();
        if (it.live()) {
            String m = minuteText(it);
            float bw = Art.minuteBadgeWidth(m, h * 0.56f, black);
            Art.minuteBadge(c, m, x + bw / 2, cy, h * 0.56f, black);
            x += bw + h * 0.16f;
        }
        float lr = h * 0.4f;
        int px = Math.round(lr * 2.2f);
        Bitmap hl = Images.cached(ctx, it.homeLogo, px), al = Images.cached(ctx, it.awayLogo, px);
        float hcx = x + lr + h * 0.03f;
        float acx = r.right - h * 0.25f - lr - h * 0.03f;
        Art.logo(c, hl, hcx, cy, lr, it.home, bold);
        Art.logo(c, al, acx, cy, lr, it.away, bold);
        String center = centerText(it, now);
        TextPaint sp = Art.text(black, h * 0.56f, Art.WHITE);
        sp.setTextAlign(Paint.Align.CENTER);
        float mid;
        if (expanded) {
            TextPaint np = Art.text(bold, h * 0.26f, Art.alpha(Art.WHITE, 0.9f));
            float sw = Math.max(h * 1.3f, sp.measureText(center));
            float nameSpace = (acx - lr) - (hcx + lr) - sw - h * 0.36f;
            float each = Math.max(h * 0.5f, nameSpace / 2 - h * 0.2f);
            mid = (hcx + acx) / 2;
            np.setTextAlign(Paint.Align.LEFT);
            c.drawText(Art.teamName(np, it.home, each), hcx + lr + h * 0.2f, Art.baseline(np, cy), np);
            np.setTextAlign(Paint.Align.RIGHT);
            c.drawText(Art.teamName(np, it.away, each), acx - lr - h * 0.2f, Art.baseline(np, cy), np);
        } else {
            mid = (hcx + acx) / 2;
        }
        if (it.live()) {
            // a slow breathing pulse like the site's animate-pulse
            float pulse = 0.75f + 0.25f * (float) Math.abs(Math.sin(now / 650.0));
            Art.glassText(c, center, mid, cy, sp, Art.alpha(Art.EMERALD, pulse), Art.alpha(Art.EMERALD, 0.5f * pulse));
        } else if (it.finished()) {
            Art.glassText(c, center, mid, cy - h * 0.06f, sp);
            TextPaint f = Art.text(bold, h * 0.17f, Art.alpha(Art.WHITE, 0.5f));
            Art.centerText(c, "انتهت", mid, cy + h * 0.32f, f);
        } else {
            if (center.startsWith("-")) sp.setTextSize(h * 0.44f);
            Art.glassText(c, center, mid, cy, sp);
        }
    }

    private static void drawCountdown(Canvas c, RectF r, Item it, long now) {
        float h = r.height();
        boolean iqamah = "iqamah".equals(it.ckind), azkar = "azkar".equals(it.kind);
        int color = azkar || iqamah ? Art.EMERALD : Art.BLUE;
        pillBase(c, r, Art.alpha(Art.WHITE, 0.12f), 0);
        // RTL: icon square on the right, text to its left (centred in the rest)
        float icon = h * 0.66f;
        RectF ib = new RectF(r.right - h * 0.3f - icon, r.centerY() - icon / 2, r.right - h * 0.3f, r.centerY() + icon / 2);
        Art.fill(c, ib, icon * 0.3f, Art.alpha(color, 0.2f));
        if (azkar) {
            TextPaint ip = Art.text(Typeface.DEFAULT, icon * 0.5f, Art.WHITE);
            Art.centerText(c, "📿", ib.centerX(), ib.centerY(), ip);
        } else {
            Art.clockIcon(c, ib.centerX(), ib.centerY(), icon * 0.26f, color);
        }
        float textR = ib.left - h * 0.22f, textL = r.left + h * 0.38f;
        float mid = (textL + textR) / 2;
        TextPaint n = Art.text(bold, h * 0.24f, Art.alpha(Art.WHITE, 0.8f));
        Art.centerText(c, Art.ellipsize(n, it.title, textR - textL), mid, r.top + h * 0.3f, n);
        String t = countdownText(it, now);
        TextPaint tp = Art.text(black, h * 0.46f, color);
        tp.setTextAlign(Paint.Align.CENTER);
        Art.glassText(c, t, mid, r.top + h * 0.66f, tp, color, Art.alpha(color, 0.55f));
    }

    private static void drawMore(Canvas c, RectF r, Item it) {
        pillBase(c, r, Art.alpha(Art.WHITE, 0.12f), 0);
        TextPaint t = Art.text(black, r.height() * 0.36f, Art.alpha(Art.WHITE, 0.85f));
        Art.centerText(c, "+" + it.more, r.centerX(), r.centerY(), t);
    }

    /**
     * The goal card (island celebration and notification picture): gold ring, "⚽ هدف", the two logos with the new
     * score (the scoring side bright), and the scorer with photo and minute when known. Logos can be passed in (the
     * notification loads them blocking); otherwise the cached ones are used.
     */
    static void drawGoal(Context ctx, Canvas c, RectF r, Item it, Bitmap homeLogo, Bitmap awayLogo) {
        fonts(ctx);
        float h = r.height();
        float rad = Math.min(h / 2, r.width() * 0.12f);
        Art.glow(c, r, rad, 0x80FACC15, h * 0.18f);
        Art.fill(c, r, rad, 0xF7000000);
        Paint gold = new Paint(Paint.ANTI_ALIAS_FLAG);
        gold.setShader(new android.graphics.LinearGradient(r.left, r.top, r.right, r.bottom, 0x33FACC15, 0x00FACC15, android.graphics.Shader.TileMode.CLAMP));
        c.drawRoundRect(r, rad, rad, gold);
        Art.stroke(c, r, rad, Art.alpha(Art.YELLOW, 0.8f), Math.max(2f, h / 40f));
        boolean withScorer = it.scorer != null && !it.scorer.isEmpty();
        float topH = withScorer ? h * 0.62f : h;
        float cy = r.top + topH / 2;
        float lr = Math.min(topH * 0.34f, r.width() * 0.1f);
        int px = Math.round(lr * 2.2f);
        if (homeLogo == null) homeLogo = Images.cached(ctx, it.homeLogo, px);
        if (awayLogo == null) awayLogo = Images.cached(ctx, it.awayLogo, px);
        float hcx = r.left + rad * 0.6f + lr, acx = r.right - rad * 0.6f - lr;
        Art.logo(c, homeLogo, hcx, cy, lr, it.home, bold);
        Art.logo(c, awayLogo, acx, cy, lr, it.away, bold);
        float mid = r.centerX();
        TextPaint g = Art.text(black, topH * 0.2f, Art.YELLOW);
        g.setShadowLayer(topH * 0.08f, 0, 0, 0xAAFACC15);
        Art.centerText(c, "⚽ هدف", mid, cy - topH * 0.24f, g);
        TextPaint s = Art.text(black, topH * 0.36f, Art.WHITE);
        String hs = String.valueOf(it.sh), as = String.valueOf(it.sa), dash = " - ";
        float wh = s.measureText(hs), wd = s.measureText(dash), wa = s.measureText(as);
        float sx = mid - (wh + wd + wa) / 2;
        float base = Art.baseline(s, cy + topH * 0.14f);
        s.setColor("home".equals(it.side) ? Art.EMERALD : Art.alpha(Art.WHITE, 0.75f));
        c.drawText(hs, sx, base, s);
        s.setColor(Art.alpha(Art.WHITE, 0.5f));
        c.drawText(dash, sx + wh, base, s);
        s.setColor("away".equals(it.side) ? Art.EMERALD : Art.alpha(Art.WHITE, 0.75f));
        c.drawText(as, sx + wh + wd, base, s);
        TextPaint names = Art.text(bold, topH * 0.13f, Art.alpha(Art.WHITE, 0.6f));
        float nameW = (acx - lr) - (hcx + lr) - topH * 0.2f;
        String line = Art.teamName(names, it.home, nameW / 2.2f) + "  ·  " + Art.teamName(names, it.away, nameW / 2.2f);
        Art.centerText(c, Art.ellipsize(names, line, nameW), mid, cy + topH * 0.4f, names);
        if (withScorer) {
            float sh2 = h - topH;
            RectF strip = new RectF(r.left + rad * 0.5f, r.top + topH, r.right - rad * 0.5f, r.bottom - sh2 * 0.15f);
            Art.fill(c, strip, strip.height() / 2, Art.alpha(Art.WHITE, 0.07f));
            float pr = strip.height() * 0.38f;
            Bitmap photo = Images.cached(ctx, it.photo, Math.round(pr * 2.4f));
            TextPaint sc = Art.text(black, strip.height() * 0.42f, Art.WHITE);
            String text = it.scorer + (it.minute.isEmpty() ? "" : "  د" + it.minute.replace("'", ""));
            float tw = Math.min(sc.measureText(text), strip.width() * 0.8f);
            float total = tw + (photo != null ? pr * 2 + strip.height() * 0.2f : 0);
            float sx2 = strip.centerX() + total / 2;
            if (photo != null) {
                Art.circleImage(c, photo, sx2 - pr, strip.centerY(), pr);
                sx2 -= pr * 2 + strip.height() * 0.2f;
            }
            sc.setTextAlign(Paint.Align.RIGHT);
            c.drawText(Art.ellipsize(sc, text, strip.width() * 0.8f), sx2, Art.baseline(sc, strip.centerY()), sc);
        }
    }
}
