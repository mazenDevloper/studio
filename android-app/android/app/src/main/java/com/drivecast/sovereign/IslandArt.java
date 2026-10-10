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
        String league = "";
        int more;
        /** the deciding minutes of a favourite's close match: gold pulsing ring, faster updates, opens by itself */
        boolean critical;
        /** shown as a small round icon while another island is opened wide */
        boolean mini;
        /** goal: when its animation started (ms) */
        long shownAt;

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
        if (it.mini) return h;
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
            case "audio": {
                TextPaint n = Art.text(bold, h * (expanded ? 0.3f : 0.28f), Art.WHITE);
                float tw = Math.min(n.measureText(it.title), h * (expanded ? 6f : 3.4f));
                return h * 0.25f + h * 0.66f + h * 0.25f + tw + h * 0.35f + (expanded ? h * 0.9f : 0);
            }
            case "countdown":
            case "azkar": {
                TextPaint n = Art.text(bold, h * 0.24f, Art.WHITE);
                TextPaint t = Art.text(black, h * 0.46f, Art.WHITE);
                // a long title (an occasion, a message) is cut with "…" - the island stays phone-sized
                float text = Math.max(Math.min(n.measureText(it.title), h * (expanded ? 7f : 4.4f)), t.measureText(countdownText(it, now)));
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
        if ("mosque".equals(it.ckind)) return it.minute; // "1.2 كم · 4 د"
        long left = (it.at - now) / 1000;
        return left > 0 ? "-" + Art.countdown(left) : "الآن";
    }

    static void draw(Context ctx, Canvas c, RectF r, Item it, boolean expanded, long now) {
        fonts(ctx);
        if (it.mini) { drawMini(ctx, c, r, it, now); return; }
        switch (it.kind) {
            case "match": drawMatch(ctx, c, r, it, expanded, now); break;
            case "audio": drawAudio(c, r, it, expanded, now); break;
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
        if (it.critical) {
            // the deciding minutes: a gold ring that breathes
            float p = 0.55f + 0.45f * (float) Math.abs(Math.sin(now / 420.0));
            pillBase(c, r, Art.alpha(Art.YELLOW, p), Art.alpha(0xFFFACC15, 0.55f * p));
        } else
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
        if ("mosque".equals(it.ckind)) color = it.more == 0 ? Art.EMERALD : it.more == 1 ? Art.YELLOW : Art.RED;
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

    /** Sound only: an emerald disc with play / pause, moving equaliser bars while playing, the title; expanded adds ✕. */
    private static void drawAudio(Canvas c, RectF r, Item it, boolean expanded, long now) {
        float h = r.height();
        boolean playing = it.fav;
        pillBase(c, r, Art.alpha(Art.EMERALD, playing ? 0.55f : 0.2f), playing ? 0x3334D399 : 0);
        float icon = h * 0.66f;
        RectF ib = new RectF(r.right - h * 0.25f - icon, r.centerY() - icon / 2, r.right - h * 0.25f, r.centerY() + icon / 2);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(Art.EMERALD);
        c.drawCircle(ib.centerX(), ib.centerY(), icon / 2, p);
        Art.playIcon(c, ib.centerX() + (playing ? 0 : icon * 0.04f), ib.centerY(), icon * 0.22f, 0xFF000000, playing);
        float textR = ib.left - h * 0.25f, textL = r.left + h * 0.35f + (expanded ? h * 0.9f : 0);
        // equaliser
        float bx = textL, bw = h * 0.07f;
        for (int i = 0; i < 3 && playing; i++) {
            float amp = 0.25f + 0.25f * (float) Math.abs(Math.sin(now / 180.0 + i * 1.7));
            RectF bar = new RectF(bx + i * bw * 1.7f, r.centerY() - h * amp, bx + i * bw * 1.7f + bw, r.centerY() + h * amp);
            Art.fill(c, bar, bw / 2, Art.alpha(Art.EMERALD, 0.85f));
        }
        if (playing) textL += bw * 5.5f;
        TextPaint t = Art.text(bold, h * (expanded ? 0.3f : 0.28f), Art.WHITE);
        t.setTextAlign(Paint.Align.RIGHT);
        c.drawText(Art.ellipsize(t, it.title, Math.max(h, textR - textL)), textR, Art.baseline(t, r.centerY()), t);
        if (expanded) {
            float cx = r.left + h * 0.55f;
            Paint x = new Paint(Paint.ANTI_ALIAS_FLAG);
            x.setColor(Art.alpha(Art.RED, 0.85f));
            c.drawCircle(cx, r.centerY(), h * 0.28f, x);
            TextPaint xp = Art.text(bold, h * 0.3f, Art.WHITE);
            Art.centerText(c, "✕", cx, r.centerY(), xp);
        }
    }

    /** A small round island (another one is open wide): the team logo with the score, or the icon. */
    private static void drawMini(Context ctx, Canvas c, RectF r, Item it, long now) {
        float h = r.height();
        RectF q = new RectF(r.centerX() - h / 2, r.top, r.centerX() + h / 2, r.bottom);
        int ring = it.critical ? Art.alpha(Art.YELLOW, 0.8f) : "audio".equals(it.kind) ? Art.alpha(Art.EMERALD, 0.6f) : Art.alpha(Art.WHITE, 0.14f);
        pillBase(c, q, ring, 0);
        float cx = q.centerX(), cy = q.centerY();
        if ("match".equals(it.kind)) {
            Bitmap hl = Images.cached(ctx, it.homeLogo, Math.round(h));
            Art.logo(c, hl, cx, cy - h * 0.08f, h * 0.28f, it.home, bold);
            String t = it.live() || it.finished() ? it.sh + "-" + it.sa : it.kickoffText;
            TextPaint tp = Art.text(black, h * 0.2f, it.live() ? Art.EMERALD : Art.WHITE);
            RectF tag = new RectF(cx - h * 0.34f, q.bottom - h * 0.3f, cx + h * 0.34f, q.bottom - h * 0.04f);
            Art.fill(c, tag, tag.height() / 2, 0xE6000000);
            Art.centerText(c, Art.ellipsize(tp, t, tag.width()), cx, tag.centerY(), tp);
        } else if ("audio".equals(it.kind)) {
            Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
            p.setColor(Art.EMERALD);
            c.drawCircle(cx, cy, h * 0.3f, p);
            Art.playIcon(c, cx, cy, h * 0.11f, 0xFF000000, it.fav);
        } else if ("azkar".equals(it.kind)) {
            Art.centerText(c, "📿", cx, cy, Art.text(Typeface.DEFAULT, h * 0.4f, Art.WHITE));
        } else if ("countdown".equals(it.kind)) {
            int color = "iqamah".equals(it.ckind) || "reminder".equals(it.ckind) ? Art.EMERALD : Art.BLUE;
            Art.clockIcon(c, cx, cy, h * 0.2f, color);
        } else {
            drawMore(c, q, it);
        }
    }

    private static void drawMore(Canvas c, RectF r, Item it) {
        pillBase(c, r, Art.alpha(Art.WHITE, 0.12f), 0);
        TextPaint t = Art.text(black, r.height() * 0.36f, Art.alpha(Art.WHITE, 0.85f));
        Art.centerText(c, "+" + it.more, r.centerX(), r.centerY(), t);
    }

    /**
     * The goal card like the site's: a purple-to-magenta card with a green ring, the green "GOAL ⚽" pill and
     * "league · minute", a dark pill with both logos and the big score (the scoring side green), and the scorer -
     * photo and name, large - under it. Logos can be passed in (the notification loads them blocking).
     */
    static void drawGoal(Context ctx, Canvas c, RectF r, Item it, Bitmap homeLogo, Bitmap awayLogo) {
        fonts(ctx);
        float w = r.width(), h = r.height();
        boolean compact = h < w * 0.24f; // the notification's small view: the score pill only
        float rad = Math.min(h * 0.18f, w * 0.09f);
        Art.glow(c, r, rad, 0x6634D399, Math.min(w, h) * 0.06f);
        Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
        bg.setShader(new android.graphics.LinearGradient(r.left, r.bottom, r.right, r.top,
                new int[]{0xFF1C2347, 0xFF2D1846, 0xFF4A0E35}, new float[]{0f, 0.5f, 1f}, android.graphics.Shader.TileMode.CLAMP));
        c.drawRoundRect(r, rad, rad, bg);
        Art.stroke(c, r, rad, 0xFF5BD38A, Math.max(2f, Math.min(w, h) / 60f));
        float pad = Math.min(w, h) * (compact ? 0.08f : 0.07f);
        if (homeLogo == null) homeLogo = Images.cached(ctx, it.homeLogo, 200);
        if (awayLogo == null) awayLogo = Images.cached(ctx, it.awayLogo, 200);

        // top row: GOAL pill + league · minute
        float y = r.top + pad;
        if (!compact) {
            float ph = h * 0.13f;
            TextPaint gp = Art.text(black, ph * 0.62f, 0xFF0B0B10);
            gp.setTextSkewX(-0.18f);
            String g = "GOAL ⚽";
            float pw = gp.measureText(g) + ph * 1.1f;
            RectF pill = new RectF(r.left + pad, y, r.left + pad + pw, y + ph);
            Art.fill(c, pill, ph / 2, 0xFF5BF08C);
            Art.centerText(c, g, pill.centerX(), pill.centerY(), gp);
            String meta = (it.league == null || it.league.isEmpty() ? "" : it.league) + (it.minute.isEmpty() ? "" : (it.league == null || it.league.isEmpty() ? "" : " · ") + it.minute);
            if (!meta.isEmpty()) {
                TextPaint mp = Art.text(bold, ph * 0.52f, Art.alpha(Art.WHITE, 0.72f));
                mp.setTextAlign(android.graphics.Paint.Align.LEFT);
                c.drawText(Art.ellipsize(mp, meta, r.right - pill.right - pad * 2), pill.right + pad * 0.7f, Art.baseline(mp, pill.centerY()), mp);
            }
            y = pill.bottom + pad * 0.9f;
        }

        // the score pill
        boolean withScorer = !compact && it.scorer != null && !it.scorer.isEmpty();
        float bottom = withScorer ? r.bottom - h * 0.24f : r.bottom - pad;
        RectF sp = compact ? new RectF(r.left + pad, r.top + pad, r.right - pad, r.bottom - pad) : new RectF(r.left + pad * 1.2f, y, r.right - pad * 1.2f, bottom);
        Art.fill(c, sp, sp.height() / 2, 0xF20A0A0F);
        Art.stroke(c, sp, sp.height() / 2, Art.alpha(Art.WHITE, 0.1f), Math.max(1f, sp.height() / 90f));
        float lr = sp.height() * 0.33f;
        float hcx = sp.left + sp.height() * 0.62f, acx = sp.right - sp.height() * 0.62f;
        drawPlainLogo(c, homeLogo, hcx, sp.centerY(), lr, it.home);
        drawPlainLogo(c, awayLogo, acx, sp.centerY(), lr, it.away);
        TextPaint num = Art.text(black, sp.height() * 0.78f, Art.WHITE);
        String hs = String.valueOf(it.sh), as = String.valueOf(it.sa);
        float wh = num.measureText(hs), wa = num.measureText(as), dash = sp.height() * 0.32f, gap = sp.height() * 0.14f;
        float total = wh + gap + dash + gap + wa, sx = sp.centerX() - total / 2;
        float base = Art.baseline(num, sp.centerY());
        num.setColor("home".equals(it.side) ? 0xFF5BF08C : Art.WHITE);
        c.drawText(hs, sx, base, num);
        Paint dp = new Paint(Paint.ANTI_ALIAS_FLAG);
        dp.setColor(0xFF6E6E78);
        float dx = sx + wh + gap;
        c.drawRect(dx, sp.centerY() - sp.height() * 0.05f, dx + dash, sp.centerY() + sp.height() * 0.05f, dp);
        num.setColor("away".equals(it.side) ? 0xFF5BF08C : Art.WHITE);
        c.drawText(as, dx + dash + gap, base, num);

        // the scorer, large
        if (withScorer) {
            float rowH = r.bottom - sp.bottom - pad * 0.6f, cy = sp.bottom + (r.bottom - sp.bottom) / 2;
            TextPaint np = Art.text(black, rowH * 0.5f, Art.WHITE);
            String name = it.scorer;
            String minute = it.minute.isEmpty() ? "" : "  " + it.minute;
            TextPaint mp = Art.text(bold, rowH * 0.36f, 0xFF5BF08C);
            float pr = rowH * 0.38f;
            Bitmap photo = Images.cached(ctx, it.photo, Math.round(pr * 2.4f));
            float nameW = Math.min(np.measureText(name), w * 0.62f);
            float tw = nameW + mp.measureText(minute) + (photo != null ? pr * 2 + rowH * 0.25f : 0);
            float x = r.centerX() + tw / 2;
            if (photo != null) {
                Art.circleImage(c, photo, x - pr, cy, pr);
                Paint ring = new Paint(Paint.ANTI_ALIAS_FLAG);
                ring.setStyle(Paint.Style.STROKE);
                ring.setStrokeWidth(Math.max(1.5f, pr / 10f));
                ring.setColor(0xFF5BF08C);
                c.drawCircle(x - pr, cy, pr, ring);
                x -= pr * 2 + rowH * 0.25f;
            }
            np.setTextAlign(Paint.Align.RIGHT);
            np.setShadowLayer(rowH * 0.12f, 0, 0, 0x99000000);
            c.drawText(Art.ellipsize(np, name, w * 0.62f), x, Art.baseline(np, cy), np);
            mp.setTextAlign(Paint.Align.RIGHT);
            c.drawText(minute, x - nameW, Art.baseline(mp, cy), mp);
        }
    }

    // ---- the goal animation, like the site's GoalCelebration: the pill grows into a card, a colour wipe, act 1
    // "GOAL!" alone (slams in, then leaves), act 2 the scorer: label, photo from the scoring side, name, score bar,
    // the scoring digit pops green - then the card shrinks back to a pill ----

    static final long ACT2_MS = 2300;

    static long goalDuration(Item it) {
        return it.scorer != null && !it.scorer.isEmpty() ? 7000 : 5600;
    }

    private static float clamp01(float v) {
        return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    /** cubic-bezier(.2,.9,.2,1)-like: fast then soft */
    private static float easeOut(float t) {
        t = clamp01(t);
        return 1 - (float) Math.pow(1 - t, 3);
    }

    /** overshoot a little, like (.2,.9,.25,1.1) */
    private static float easeBack(float t) {
        t = clamp01(t);
        float c1 = 1.4f, c3 = c1 + 1;
        return 1 + c3 * (float) Math.pow(t - 1, 3) + c1 * (float) Math.pow(t - 1, 2);
    }

    private static float prog(long t, long start, long dur) {
        return clamp01((t - start) / (float) dur);
    }

    /** Draws the goal card at time t (ms since it started) inside the view's bounds (the full card size). */
    static void drawGoalAnimated(Context ctx, Canvas c, RectF full, Item it, long t) {
        fonts(ctx);
        long D = goalDuration(it);
        float W = full.width(), H = full.height();
        float pillW = Math.min(W, H * 1.1f), pillH = H * 0.3f;
        // size: pill -> card (120..520 ms), hold, back to a pill from 90 % of the show, gone at the end
        float grow = easeOut(prog(t, 120, 400));
        float shrink = easeOut(prog(t, (long) (D * 0.9f), (long) (D * 0.07f)));
        float k = grow * (1 - shrink);
        float w = pillW + (W - pillW) * k, h = pillH + (H - pillH) * k;
        float alpha = t < 120 ? t / 120f : t > D * 0.97f ? clamp01(1 - (t - D * 0.97f) / (D * 0.03f)) : 1;
        if (alpha <= 0) return;
        RectF r = new RectF(full.centerX() - w / 2, full.top, full.centerX() + w / 2, full.top + h);
        float rad = Math.min(h / 2, H * 0.18f + (pillH / 2 - H * 0.18f) * (1 - k));
        int layer = c.saveLayerAlpha(full, Math.round(alpha * 255));
        Art.glow(c, r, rad, 0x5900FF85, Math.min(W, H) * 0.08f);
        android.graphics.Path clip = new android.graphics.Path();
        clip.addRoundRect(r, rad, rad, android.graphics.Path.Direction.CW);
        c.save();
        c.clipPath(clip);
        // background: deep purple with magenta / cyan blooms
        Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
        bg.setShader(new android.graphics.LinearGradient(r.left, r.top, r.right, r.bottom,
                new int[]{0xFF37003C, 0xFF24002A, 0xFF0B0010}, null, android.graphics.Shader.TileMode.CLAMP));
        c.drawRect(r, bg);
        Paint bloom = new Paint(Paint.ANTI_ALIAS_FLAG);
        bloom.setShader(new android.graphics.RadialGradient(r.right - H * 0.1f, r.top, H * 0.9f, 0x40E90052, 0x00E90052, android.graphics.Shader.TileMode.CLAMP));
        c.drawRect(r, bloom);
        bloom.setShader(new android.graphics.RadialGradient(r.left + H * 0.1f, r.bottom, H * 0.9f, 0x3304F5FF, 0x0004F5FF, android.graphics.Shader.TileMode.CLAMP));
        c.drawRect(r, bloom);
        // the colour wipe (330..1130 ms)
        float wp = prog(t, 330, 800);
        if (wp > 0 && wp < 1) {
            float x = r.left - r.width() * 1.2f + r.width() * 2.5f * easeOut(wp);
            Paint wipe = new Paint(Paint.ANTI_ALIAS_FLAG);
            wipe.setShader(new android.graphics.LinearGradient(x, 0, x + r.width() * 1.2f, 0, new int[]{0xFF00FF85, 0xFF04F5FF, 0xFFE90052}, null, android.graphics.Shader.TileMode.CLAMP));
            wipe.setAlpha(Math.round(255 * (wp > 0.85f ? (1 - wp) / 0.15f : 1)));
            c.save();
            c.skew(-0.32f, 0);
            c.drawRect(x + h * 0.3f, r.top - h, x + h * 0.3f + r.width() * 1.2f, r.bottom + h, wipe);
            c.restore();
        }
        if (k > 0.6f) {
            // ACT 1: "GOAL!" alone (480..2240 ms)
            if (t >= 480 && t < ACT2_MS) {
                float in = easeOut(prog(t, 480, 620));
                float out = prog(t, 1960, 330);
                float scale = (2.6f - 1.6f * in) * (1 - 0.28f * out);
                TextPaint gp = Art.text(black, H * 0.42f, 0xFFFFFFFF);
                gp.setTextSkewX(-0.22f);
                gp.setShadowLayer(H * 0.12f, 0, 0, 0xE600FF85);
                gp.setAlpha(Math.round(255 * clamp01((t - 480) / 80f) * (1 - out)));
                c.save();
                float cy = r.centerY() - r.height() * 0.28f * out;
                c.scale(scale, scale, r.centerX(), cy);
                Art.centerText(c, "GOAAAL!", r.centerX(), cy, gp);
                c.restore();
            }
            // ACT 2: the scorer card
            if (t >= ACT2_MS && t < D * 0.9f) {
                long a = t - ACT2_MS;
                boolean fromLeft = "home".equals(it.side);
                float pad = H * 0.06f;
                // label
                float lp = easeOut(prog(a, 0, 360));
                float ph = H * 0.12f, ly = r.top + pad - (1 - lp) * H * 0.07f;
                TextPaint gl = Art.text(black, ph * 0.62f, 0xFF37003C);
                gl.setTextSkewX(-0.18f);
                String gt = "GOAL ⚽";
                float gw = gl.measureText(gt) + ph * 1.1f;
                RectF pill = new RectF(r.left + pad, ly, r.left + pad + gw, ly + ph);
                int la = Math.round(255 * lp);
                Paint pf = new Paint(Paint.ANTI_ALIAS_FLAG);
                pf.setColor(0xFF00FF85);
                pf.setAlpha(la);
                c.drawRoundRect(pill, ph / 2, ph / 2, pf);
                gl.setAlpha(la);
                Art.centerText(c, gt, pill.centerX(), pill.centerY(), gl);
                String meta = it.league + (it.minute.isEmpty() ? "" : (it.league.isEmpty() ? "" : " · ") + it.minute);
                TextPaint mp = Art.text(bold, ph * 0.5f, Art.alpha(Art.WHITE, 0.7f));
                mp.setAlpha(Math.round(180 * lp));
                mp.setTextAlign(Paint.Align.LEFT);
                c.drawText(Art.ellipsize(mp, meta, r.right - pill.right - pad * 2), pill.right + pad * 0.6f, Art.baseline(mp, pill.centerY()), mp);

                boolean withScorer = it.scorer != null && !it.scorer.isEmpty();
                Bitmap hl = Images.cached(ctx, it.homeLogo, 200), al = Images.cached(ctx, it.awayLogo, 200);
                RectF bar;
                if (withScorer) {
                    float pr = H * 0.29f;
                    float pcx = fromLeft ? r.left + pad + pr : r.right - pad - pr, pcy = r.bottom - pad - pr;
                    // photo flies in from its side
                    float fp = easeBack(prog(a, 60, 620));
                    float off = (1 - fp) * pr * 2.8f * (fromLeft ? -1 : 1);
                    float ps = 0.6f + 0.4f * fp;
                    c.save();
                    c.translate(off, 0);
                    c.scale(ps, ps, pcx, pcy);
                    Paint ring = new Paint(Paint.ANTI_ALIAS_FLAG);
                    ring.setShader(new android.graphics.LinearGradient(pcx - pr, pcy - pr, pcx + pr, pcy + pr, new int[]{0xFF00FF85, 0xFF04F5FF, 0xFFE90052}, null, android.graphics.Shader.TileMode.CLAMP));
                    ring.setAlpha(Math.round(255 * clamp01(fp)));
                    c.drawCircle(pcx, pcy, pr, ring);
                    Bitmap photo = Images.cached(ctx, it.photo, Math.round(pr * 2.2f));
                    Bitmap scoring = fromLeft ? hl : al;
                    if (photo != null) {
                        Art.circleImage(c, photo, pcx, pcy, pr * 0.93f);
                        if (scoring != null) {
                            float br = pr * 0.3f, bx = fromLeft ? pcx + pr * 0.72f : pcx - pr * 0.72f, by = pcy + pr * 0.72f;
                            Paint wb = new Paint(Paint.ANTI_ALIAS_FLAG);
                            wb.setColor(0xFFFFFFFF);
                            c.drawCircle(bx, by, br, wb);
                            drawPlainLogo(c, scoring, bx, by, br * 0.7f, "");
                        }
                    } else {
                        Paint wb = new Paint(Paint.ANTI_ALIAS_FLAG);
                        wb.setColor(0xFFFFFFFF);
                        c.drawCircle(pcx, pcy, pr * 0.93f, wb);
                        drawPlainLogo(c, scoring, pcx, pcy, pr * 0.6f, fromLeft ? it.home : it.away);
                    }
                    c.restore();
                    // name + minute, beside the photo
                    float np = easeOut(prog(a, 330, 460));
                    float nl = fromLeft ? pcx + pr + pad : r.left + pad, nr = fromLeft ? r.right - pad : pcx - pr - pad;
                    TextPaint nm = Art.text(black, H * 0.13f, 0xFFFFFFFF);
                    nm.setAlpha(Math.round(255 * np));
                    nm.setTextAlign(fromLeft ? Paint.Align.LEFT : Paint.Align.RIGHT);
                    float nx = (fromLeft ? nl : nr) + (1 - np) * H * 0.2f * (fromLeft ? 1 : -1);
                    float ny = r.top + H * 0.32f;
                    c.drawText(Art.ellipsize(nm, it.scorer, nr - nl), nx, Art.baseline(nm, ny), nm);
                    TextPaint mm = Art.text(black, H * 0.065f, 0xFF00FF85);
                    mm.setAlpha(Math.round(255 * np));
                    mm.setTextAlign(fromLeft ? Paint.Align.LEFT : Paint.Align.RIGHT);
                    c.drawText(it.minute, nx, Art.baseline(mm, ny + H * 0.11f), mm);
                    bar = new RectF(nl, r.top + H * 0.5f, nr, r.bottom - pad);
                } else {
                    bar = new RectF(r.left + W * 0.12f, r.top + H * 0.28f, r.right - W * 0.12f, r.bottom - pad);
                }
                // the score bar slides up, in front of everything
                float sp = easeOut(prog(a, 180, 460));
                c.save();
                c.translate(0, (1 - sp) * H * 0.16f);
                Paint sb = new Paint(Paint.ANTI_ALIAS_FLAG);
                sb.setColor(0xBF000000);
                sb.setAlpha(Math.round(191 * sp));
                float br2 = Math.min(bar.height() / 2, H * 0.14f);
                c.drawRoundRect(bar, br2, br2, sb);
                Art.stroke(c, bar, br2, Art.alpha(Art.WHITE, 0.15f * sp), Math.max(1f, H / 200f));
                float lr = bar.height() * 0.31f;
                drawPlainLogo(c, hl, bar.left + bar.height() * 0.55f, bar.centerY(), lr, it.home);
                drawPlainLogo(c, al, bar.right - bar.height() * 0.55f, bar.centerY(), lr, it.away);
                TextPaint num = Art.text(black, bar.height() * 0.72f, 0xFFFFFFFF);
                num.setAlpha(Math.round(255 * sp));
                String hs = String.valueOf(it.sh), as = String.valueOf(it.sa);
                float wh = num.measureText(hs), wa = num.measureText(as), gap = bar.height() * 0.18f;
                TextPaint dash = Art.text(black, bar.height() * 0.6f, Art.alpha(Art.WHITE, 0.4f));
                float dw = dash.measureText("-");
                float total = wh + gap + dw + gap + wa, sx = bar.centerX() - total / 2, base = Art.baseline(num, bar.centerY());
                // the scoring digit pops (scale 1.9, green)
                float pp = prog(a, 650, 700);
                float pop = pp <= 0 ? 1 : pp < 0.35f ? 1 + 0.9f * (pp / 0.35f) : 1 + 0.9f * (1 - (pp - 0.35f) / 0.65f);
                boolean green = pp > 0.1f;
                drawDigit(c, hs, sx, base, num, "home".equals(it.side), pop, green, bar.centerY());
                c.drawText("-", sx + wh + gap, Art.baseline(dash, bar.centerY()), dash);
                drawDigit(c, as, sx + wh + gap + dw + gap, base, num, "away".equals(it.side), pop, green, bar.centerY());
                c.restore();
            }
        }
        c.restore();
        Art.stroke(c, r, rad, Art.alpha(0xFF00FF85, 0.7f), Math.max(2f, H / 110f));
        c.restoreToCount(layer);
    }

    private static void drawDigit(Canvas c, String d, float x, float base, TextPaint p, boolean scoring, float pop, boolean green, float cy) {
        if (!scoring) { p.setColor(Art.WHITE); c.drawText(d, x, base, p); return; }
        int keep = p.getAlpha();
        p.setColor(green ? 0xFF00FF85 : Art.WHITE);
        p.setAlpha(keep);
        float w = p.measureText(d);
        c.save();
        c.scale(pop, pop, x + w / 2, cy);
        c.drawText(d, x, base, p);
        c.restore();
        p.setColor(Art.WHITE);
        p.setAlpha(keep);
    }

    /** A logo without a plate (the goal card shows them bare, like the site). */
    private static void drawPlainLogo(Canvas c, Bitmap b, float cx, float cy, float r, String name) {
        if (b == null) {
            Art.logo(c, null, cx, cy, r, name, bold);
            return;
        }
        float s = Math.min(r * 2 / b.getWidth(), r * 2 / b.getHeight());
        float lw = b.getWidth() * s, lh = b.getHeight() * s;
        c.drawBitmap(b, null, new RectF(cx - lw / 2, cy - lh / 2, cx + lw / 2, cy + lh / 2), new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG));
    }
}
