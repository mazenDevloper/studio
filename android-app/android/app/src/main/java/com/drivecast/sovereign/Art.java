package com.drivecast.sovereign;

import android.graphics.Bitmap;
import android.graphics.BitmapShader;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.RadialGradient;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.text.TextPaint;
import android.text.TextUtils;

/**
 * Drawing primitives shared by the widgets, the floating island and the goal notification, so they look like the
 * site: black glass cards with a faint sheen and a hairline border, white-to-transparent "glass" numbers, round team
 * logos, red minute badges, the gold glow of a favourite team's live match. Colours are the site's Tailwind ones.
 */
final class Art {

    private Art() {
    }

    static final int WHITE = 0xFFFFFFFF;
    /** --primary / --accent: hsl(210 100% 50%) */
    static final int BLUE = 0xFF0080FF;
    static final int EMERALD = 0xFF34D399;   // emerald-400
    static final int RED = 0xFFDC2626;       // red-600
    static final int RED_SOFT = 0xFFF87171;  // red-400
    static final int YELLOW = 0xFFFACC15;    // yellow-400
    static final int ORANGE = 0xFFFB923C;    // orange-400
    static final int INDIGO = 0xFF4F46E5;    // indigo-600
    static final int CARD = 0xF2050507;

    static int alpha(int color, float a) {
        return (Math.round(Math.max(0, Math.min(1, a)) * 255) << 24) | (color & 0x00FFFFFF);
    }

    static TextPaint text(Typeface tf, float size, int color) {
        TextPaint p = new TextPaint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        p.setTypeface(tf);
        p.setTextSize(size);
        p.setColor(color);
        return p;
    }

    // ---- surfaces ----

    /** The site's widget card: black, a faint diagonal sheen (premium-glass) and a white/10 hairline. */
    static void card(Canvas c, RectF r, float radius) {
        card(c, r, radius, alpha(WHITE, 0.10f));
    }

    static void card(Canvas c, RectF r, float radius, int border) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(CARD);
        c.drawRoundRect(r, radius, radius, p);
        p.setShader(new LinearGradient(r.left, r.top, r.right, r.bottom, alpha(WHITE, 0.06f), 0x00FFFFFF, Shader.TileMode.CLAMP));
        c.drawRoundRect(r, radius, radius, p);
        stroke(c, r, radius, border, Math.max(1f, r.height() / 300f));
    }

    static void stroke(Canvas c, RectF r, float radius, int color, float width) {
        Paint s = new Paint(Paint.ANTI_ALIAS_FLAG);
        s.setStyle(Paint.Style.STROKE);
        s.setStrokeWidth(width);
        s.setColor(color);
        RectF in = new RectF(r);
        in.inset(width / 2, width / 2);
        c.drawRoundRect(in, radius, radius, s);
    }

    static void fill(Canvas c, RectF r, float radius, int color) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(color);
        c.drawRoundRect(r, radius, radius, p);
    }

    /** A soft coloured light behind a shape (the gold ring of a live favourite, the blue of the next prayer). */
    static void glow(Canvas c, RectF r, float radius, int color, float blur) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(color);
        p.setMaskFilter(new BlurMaskFilter(Math.max(1f, blur), BlurMaskFilter.Blur.NORMAL));
        c.drawRoundRect(r, radius, radius, p);
    }

    // ---- text ----

    /** Baseline that centres the text vertically on cy. */
    static float baseline(Paint p, float cy) {
        Paint.FontMetrics fm = p.getFontMetrics();
        return cy - (fm.ascent + fm.descent) / 2f;
    }

    /** Shrink the paint's size (down to min) until the text fits maxW. */
    static void fit(Paint p, String s, float maxW, float min) {
        while (p.getTextSize() > min && p.measureText(s) > maxW) p.setTextSize(p.getTextSize() * 0.94f);
    }

    static String ellipsize(TextPaint p, String s, float maxW) {
        if (s == null) return "";
        return TextUtils.ellipsize(s, p, Math.max(1, maxW), TextUtils.TruncateAt.END).toString();
    }

    /** Text with the site's glass fill: a diagonal gradient (top-left bright, bottom-right faint). */
    static void glassText(Canvas c, String s, float x, float cy, Paint p, int from, int to) {
        float base = baseline(p, cy);
        float w = p.measureText(s);
        float left = p.getTextAlign() == Paint.Align.CENTER ? x - w / 2 : p.getTextAlign() == Paint.Align.RIGHT ? x - w : x;
        Paint.FontMetrics fm = p.getFontMetrics();
        Shader old = p.getShader();
        p.setShader(new LinearGradient(left, base + fm.ascent, left + w, base + fm.descent, from, to, Shader.TileMode.CLAMP));
        c.drawText(s, x, base, p);
        p.setShader(old);
    }

    static void glassText(Canvas c, String s, float x, float cy, Paint p) {
        glassText(c, s, x, cy, p, alpha(WHITE, 0.95f), alpha(WHITE, 0.18f));
    }

    /** The clock's look: glass fill plus a thin gradient outline. */
    static void glassOutlinedText(Canvas c, String s, float x, float cy, Paint p) {
        glassText(c, s, x, cy, p, alpha(WHITE, 0.88f), alpha(WHITE, 0.15f));
        Paint o = new Paint(p);
        o.setStyle(Paint.Style.STROKE);
        o.setStrokeWidth(Math.max(1f, p.getTextSize() / 100f));
        glassText(c, s, x, cy, o, alpha(WHITE, 0.1f), WHITE);
    }

    static void centerText(Canvas c, String s, float cx, float cy, Paint p) {
        Paint.Align a = p.getTextAlign();
        p.setTextAlign(Paint.Align.CENTER);
        c.drawText(s, cx, baseline(p, cy), p);
        p.setTextAlign(a);
    }

    // ---- pictures ----

    /** A team logo the site's way: a round white/5 plate with a white/10 ring, the logo contained inside. */
    static void logo(Canvas c, Bitmap b, float cx, float cy, float r, String fallbackName, Typeface tf) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(alpha(WHITE, 0.06f));
        c.drawCircle(cx, cy, r, p);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(Math.max(1f, r / 22f));
        p.setColor(alpha(WHITE, 0.12f));
        c.drawCircle(cx, cy, r - p.getStrokeWidth() / 2, p);
        if (b != null) {
            float inner = r * 0.80f;
            float s = Math.min(inner * 2 / b.getWidth(), inner * 2 / b.getHeight());
            float w = b.getWidth() * s, h = b.getHeight() * s;
            Paint bp = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
            bp.setShadowLayer(r / 10f, 0, r / 20f, 0x66000000);
            c.drawBitmap(b, null, new RectF(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), bp);
        } else {
            // no logo: the team's initials, like a monogram
            String ini = initials(fallbackName);
            TextPaint t = text(tf, r * (ini.length() > 1 ? 0.62f : 0.8f), alpha(WHITE, 0.55f));
            centerText(c, ini, cx, cy, t);
        }
    }

    private static String initials(String name) {
        if (name == null || name.trim().isEmpty()) return "⚽";
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) return parts[0].substring(0, Math.min(parts[0].length(), parts[0].codePointAt(0) > 0x600 ? 1 : 2)).toUpperCase();
        return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
    }

    /** A picture covering a rounded rectangle (thumbnails, backgrounds). */
    static void cover(Canvas c, Bitmap b, RectF r, float radius, float alpha) {
        if (b == null) return;
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        BitmapShader sh = new BitmapShader(b, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
        float s = Math.max(r.width() / b.getWidth(), r.height() / b.getHeight());
        Matrix m = new Matrix();
        m.setScale(s, s);
        m.postTranslate(r.left + (r.width() - b.getWidth() * s) / 2, r.top + (r.height() - b.getHeight() * s) / 2);
        sh.setLocalMatrix(m);
        p.setShader(sh);
        p.setAlpha(Math.round(alpha * 255));
        c.drawRoundRect(r, radius, radius, p);
    }

    static void circleImage(Canvas c, Bitmap b, float cx, float cy, float r) {
        cover(c, b, new RectF(cx - r, cy - r, cx + r, cy + r), r, 1f);
    }

    /** The bottom-up black fade the site puts over thumbnails so the white text reads. */
    static void bottomFade(Canvas c, RectF r, float radius) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setShader(new LinearGradient(0, r.bottom, 0, r.top, new int[]{0xF2000000, 0x99000000, 0x00000000}, new float[]{0f, 0.45f, 1f}, Shader.TileMode.CLAMP));
        c.drawRoundRect(r, radius, radius, p);
    }

    // ---- the moon ----

    /** The 3D moon of the dashboard: the phase photo in a circle, lit from the upper left, with a soft halo. */
    static void moon(Canvas c, Bitmap photo, float cx, float cy, float r) {
        Paint halo = new Paint(Paint.ANTI_ALIAS_FLAG);
        halo.setShader(new RadialGradient(cx, cy, r * 1.35f, new int[]{0x2EBECDFF, 0x0FBECDFF, 0x00BECDFF}, new float[]{0f, 0.6f, 1f}, Shader.TileMode.CLAMP));
        c.drawCircle(cx, cy, r * 1.35f, halo);
        Paint base = new Paint(Paint.ANTI_ALIAS_FLAG);
        base.setColor(Color.BLACK);
        c.drawCircle(cx, cy, r, base);
        if (photo != null) {
            float s = r * 1.04f;
            Paint pp = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
            BitmapShader sh = new BitmapShader(photo, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
            Matrix m = new Matrix();
            float k = Math.max(2 * s / photo.getWidth(), 2 * s / photo.getHeight());
            m.setScale(k, k);
            m.postTranslate(cx - photo.getWidth() * k / 2, cy - photo.getHeight() * k / 2);
            sh.setLocalMatrix(m);
            pp.setShader(sh);
            pp.setAlpha(205);
            c.drawCircle(cx, cy, r, pp);
        }
        Paint shade = new Paint(Paint.ANTI_ALIAS_FLAG);
        shade.setShader(new RadialGradient(cx - r * 0.36f, cy - r * 0.44f, r * 1.7f,
                new int[]{0x38FFFFFF, 0x0AFFFFFF, 0x00000000, 0x8C000000, 0xD9000000},
                new float[]{0f, 0.19f, 0.30f, 0.46f, 0.6f}, Shader.TileMode.CLAMP));
        c.drawCircle(cx, cy, r, shade);
        Paint rim = new Paint(Paint.ANTI_ALIAS_FLAG);
        rim.setStyle(Paint.Style.STROKE);
        rim.setStrokeWidth(Math.max(1f, r / 120f));
        rim.setColor(0x1AFFFFFF);
        c.drawCircle(cx, cy, r, rim);
    }

    // ---- manuscript ink ----

    /** The board's gold mosaic (GOLD_MOSAIC on the site): a polished gold sweep under small checker tiles. */
    static Shader goldMosaic(float w, float h, float tile) {
        int[] colors = {0xFF7A5A12, 0xFFF6D77A, 0xFFB8860B, 0xFFFFF1B8, 0xFFA8770E, 0xFFF3CF6B, 0xFF6B4C0C};
        float[] stops = {0f, 0.22f, 0.40f, 0.55f, 0.72f, 0.88f, 1f};
        Bitmap b = Bitmap.createBitmap(Math.max(1, (int) w), Math.max(1, (int) h), Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        Paint p = new Paint();
        p.setShader(new LinearGradient(0, 0, w, h, colors, stops, Shader.TileMode.CLAMP));
        c.drawRect(0, 0, w, h, p);
        Paint t = new Paint();
        int step = Math.max(2, Math.round(tile / 2));
        for (int y = 0; y < h; y += step) {
            for (int x = 0; x < w; x += step) {
                boolean light = ((x / step) + (y / step)) % 2 == 0;
                t.setColor(light ? 0x26FFF0B4 : 0x26785010);
                c.drawRect(x, y, x + step, y + step, t);
            }
        }
        return new BitmapShader(b, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
    }

    /** The board's ink (mapSettings.manuscriptInk): white, a colour, the gold mosaic or a texture picture. */
    static final class Ink {
        String mode = "white";
        int color = WHITE;
        Bitmap texture;

        boolean plainWhite() {
            return "white".equals(mode) || ("texture".equals(mode) && texture == null);
        }

        /** A shader filling a w x h area (null = plain colour, see paintColor). */
        Shader shader(float w, float h) {
            if ("gold".equals(mode)) return goldMosaic(w, h, Math.max(8f, Math.min(w, h) / 40f));
            if ("texture".equals(mode) && texture != null) {
                BitmapShader sh = new BitmapShader(texture, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
                float k = Math.max(w / texture.getWidth(), h / texture.getHeight());
                Matrix m = new Matrix();
                m.setScale(k, k);
                m.postTranslate((w - texture.getWidth() * k) / 2, (h - texture.getHeight() * k) / 2);
                sh.setLocalMatrix(m);
                return sh;
            }
            return null;
        }

        int paintColor() {
            return "color".equals(mode) ? color : WHITE;
        }

        int glowColor() {
            return plainWhite() ? 0x66FFFFFF : 0x40FFD778;
        }
    }

    /**
     * A manuscript picture drawn in the ink: its strokes (the picture's opaque pixels) filled with the ink, plus a
     * soft glow behind them (the site's mask over the ink / "brightness(0) invert(1)" for white).
     */
    static void inkImage(Canvas c, Bitmap art, RectF box, Ink ink) {
        float s = Math.min(box.width() / art.getWidth(), box.height() / art.getHeight());
        int w = Math.max(1, Math.round(art.getWidth() * s)), h = Math.max(1, Math.round(art.getHeight() * s));
        Bitmap layer = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas lc = new Canvas(layer);
        lc.drawBitmap(art, null, new Rect(0, 0, w, h), new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG));
        Paint ip = new Paint(Paint.ANTI_ALIAS_FLAG);
        ip.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        Shader sh = ink.shader(w, h);
        if (sh != null) ip.setShader(sh); else ip.setColor(ink.paintColor());
        lc.drawRect(0, 0, w, h, ip);
        float left = box.centerX() - w / 2f, top = box.centerY() - h / 2f;
        Bitmap alphaMask = layer.extractAlpha();
        Paint gp = new Paint(Paint.ANTI_ALIAS_FLAG);
        gp.setColor(ink.glowColor());
        gp.setMaskFilter(new BlurMaskFilter(Math.max(2f, Math.min(w, h) / 14f), BlurMaskFilter.Blur.NORMAL));
        c.drawBitmap(alphaMask, left, top, gp);
        c.drawBitmap(layer, left, top, new Paint(Paint.FILTER_BITMAP_FLAG));
    }

    // ---- icons (simple vector shapes, so no extra assets) ----

    /** A clock face (prayer rows), drawn as a ring with two hands. */
    static void clockIcon(Canvas c, float cx, float cy, float r, int color) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(r / 4.5f);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setColor(color);
        c.drawCircle(cx, cy, r, p);
        c.drawLine(cx, cy, cx, cy - r * 0.55f, p);
        c.drawLine(cx, cy, cx + r * 0.42f, cy + r * 0.25f, p);
    }

    static void playIcon(Canvas c, float cx, float cy, float r, int color, boolean playing) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(color);
        if (playing) {
            float w = r * 0.32f, h = r * 0.9f;
            c.drawRoundRect(new RectF(cx - r * 0.45f, cy - h, cx - r * 0.45f + w, cy + h), w / 3, w / 3, p);
            c.drawRoundRect(new RectF(cx + r * 0.45f - w, cy - h, cx + r * 0.45f, cy + h), w / 3, w / 3, p);
        } else {
            Path t = new Path();
            t.moveTo(cx - r * 0.55f, cy - r * 0.9f);
            t.lineTo(cx + r * 0.85f, cy);
            t.lineTo(cx - r * 0.55f, cy + r * 0.9f);
            t.close();
            c.drawPath(t, p);
        }
    }

    /** next (pointing right) or previous (pointing left): a triangle and a bar. */
    static void skipIcon(Canvas c, float cx, float cy, float r, int color, boolean next) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(color);
        float d = next ? 1 : -1;
        Path t = new Path();
        t.moveTo(cx - d * r * 0.7f, cy - r * 0.75f);
        t.lineTo(cx + d * r * 0.45f, cy);
        t.lineTo(cx - d * r * 0.7f, cy + r * 0.75f);
        t.close();
        c.drawPath(t, p);
        float bx = cx + d * r * 0.55f, bw = r * 0.22f;
        c.drawRoundRect(new RectF(Math.min(bx, bx + d * bw), cy - r * 0.75f, Math.max(bx, bx + d * bw), cy + r * 0.75f), bw / 3, bw / 3, p);
    }

    /** The site's red minute badge ("د58"): a red pill with a red glow. */
    static void minuteBadge(Canvas c, String s, float cx, float cy, float h, Typeface tf) {
        TextPaint t = text(tf, h * 0.58f, WHITE);
        float w = t.measureText(s) + h * 0.7f;
        RectF r = new RectF(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
        glow(c, r, h / 2, 0x99DC2626, h * 0.35f);
        fill(c, r, h / 2, RED);
        centerText(c, s, cx, cy, t);
    }

    static float minuteBadgeWidth(String s, float h, Typeface tf) {
        return text(tf, h * 0.58f, WHITE).measureText(s) + h * 0.7f;
    }

    // ---- words and numbers ----

    static String arabicDigits(String s) {
        StringBuilder b = new StringBuilder();
        for (char ch : s.toCharArray()) b.append(ch >= '0' && ch <= '9' ? (char) ('٠' + (ch - '0')) : ch);
        return b.toString();
    }

    /** "19:55" -> "7:55" (the site's convertTo12Hour, no am/pm). */
    static String to12h(String hhmm) {
        try {
            String[] p = hhmm.split(":");
            int h = Integer.parseInt(p[0].trim()) % 12;
            return (h == 0 ? 12 : h) + ":" + p[1].trim().substring(0, 2);
        } catch (Exception e) {
            return hhmm == null ? "" : hhmm;
        }
    }

    /** "1:28:38" / "04:59" like the site's formatCountdown. */
    static String countdown(long seconds) {
        long s = Math.abs(seconds);
        long h = s / 3600, m = (s % 3600) / 60, sec = s % 60;
        if (h > 0) return String.format(java.util.Locale.ROOT, "%d:%02d:%02d", h, m, sec);
        return String.format(java.util.Locale.ROOT, "%02d:%02d", m, sec);
    }

    private static final String[] NOISE = {"fc", "cf", "sc", "afc", "ac", "as", "ss", "us", "cd", "ca", "club", "fk", "sk", "if", "bk", "sv", "vfb", "vfl", "1."};
    private static final String[] PREFIXES = {"real", "sporting", "atletico", "atlético", "athletic", "deportivo", "inter", "borussia", "al", "el", "olympique", "racing", "royal", "union", "dynamo", "dinamo", "red", "young"};

    /**
     * A team name that fits: the full name, else without "FC" and friends, else its main word ("Termalica
     * Nieciecza" -> "Termalica", "Real Madrid" -> "Madrid"), else cut with an ellipsis.
     */
    static String teamName(TextPaint p, String name, float maxW) {
        if (name == null) return "";
        String n = name.trim();
        if (p.measureText(n) <= maxW) return n;
        StringBuilder kept = new StringBuilder();
        for (String w : n.split("\\s+")) {
            boolean noise = false;
            for (String x : NOISE) if (w.equalsIgnoreCase(x)) noise = true;
            if (!noise) kept.append(kept.length() > 0 ? " " : "").append(w);
        }
        String k = kept.length() > 0 ? kept.toString() : n;
        if (p.measureText(k) <= maxW) return k;
        String[] words = k.split("\\s+");
        if (words.length > 1) {
            String main = words[0];
            for (String x : PREFIXES) if (words[0].equalsIgnoreCase(x)) main = words[1];
            // a number or a tiny word is not a name ("15 De Agosto"): cut the full name instead
            if (main.length() < 3 || main.matches("\\d+.*")) return ellipsize(p, k, maxW);
            if (p.measureText(main) <= maxW) return main;
            return ellipsize(p, main, maxW);
        }
        return ellipsize(p, k, maxW);
    }
}
