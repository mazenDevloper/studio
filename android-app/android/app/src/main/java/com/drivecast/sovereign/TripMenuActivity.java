package com.drivecast.sovereign;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONObject;

import java.util.Iterator;

/**
 * The trip options (long press on the islands' microphone): go to a saved place (the route, the prayers on the way and
 * their mosques), the current trip's plan / end, save where you are as a place.
 */
public class TripMenuActivity extends Activity {

    private final Handler ui = new Handler(Looper.getMainLooper());
    private LinearLayout list;
    private TextView status;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        float d = getResources().getDisplayMetrics().density;
        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        int p = Math.round(14 * d);
        list.setPadding(p, p, p, p);
        TextView title = text("🧭 الرحلات", 19, Color.WHITE);
        title.setTypeface(Fonts.black(this));
        list.addView(title);
        status = text("", 12, 0x99FFFFFF);
        status.setVisibility(View.GONE);
        list.addView(status);

        if (Intent.ACTION_SEND.equals(getIntent().getAction())) sharedPlace(getIntent().getStringExtra(Intent.EXTRA_TEXT));

        JSONObject t = Trip.current(this);
        if (t != null) {
            list.addView(section("الرحلة الحالية: " + Trip.placeName(this, t.optString("dest", t.optString("name")))));
            list.addView(row("🔊 خطة الرحلة والمساجد", true, () -> { IslandService.speak(Trip.summary(t)); finish(); }));
            list.addView(row("🗺 الملاحة في خرائط جوجل", true, () -> { Notify.navigateTrip(this); finish(); }));
            list.addView(row("📤 شارك وقت وصولي (واتساب)", false, () -> { Notify.shareEta(this); finish(); }));
            list.addView(row("⏹ إنهاء الرحلة", false, () -> { Trip.stop(this); finish(); }));
        }
        if (!Notify.allowed(this)) {
            list.addView(section("الربط مع التطبيقات"));
            list.addView(text("اسمح بالوصول للإشعارات: يأخذ وقت الوصول من خرائط جوجل (مع الزحام)، وتظهر رسائل واتساب وتيليجرام كجزر تُقرأ ويُرد عليها بالصوت", 12, 0x99FFFFFF));
            list.addView(row("🔔 السماح بالوصول للإشعارات", false, () -> { Notify.askAccess(this); finish(); }));
        }
        list.addView(section("اذهب إلى"));
        JSONObject places = Trip.places(this);
        boolean any = false;
        for (String k : new String[]{"home", "work"}) {
            if (places.has(k)) { addPlace(k, places.optJSONObject(k)); any = true; }
        }
        Iterator<String> it = places.keys();
        while (it.hasNext()) {
            String k = it.next();
            if ("home".equals(k) || "work".equals(k)) continue;
            addPlace(k, places.optJSONObject(k));
            any = true;
        }
        if (!any) list.addView(text("لا أماكن محفوظة - أضفها من الإعدادات ← رحلاتي", 13, 0x99FFFFFF));
        list.addView(section("احفظ موقعي الحالي كـ"));
        LinearLayout two = new LinearLayout(this);
        two.setOrientation(LinearLayout.HORIZONTAL);
        two.addView(chip("🏠 البيت", () -> saveHere("home")), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        two.addView(chip("🏢 العمل", () -> saveHere("work")), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        list.addView(two);
        list.addView(row("🎤 قل وجهتك بصوتك", false, () -> {
            startActivity(new Intent(this, VoiceActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            finish();
        }));

        ScrollView sv = new ScrollView(this);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xF20B0B10);
        bg.setCornerRadius(26 * d);
        bg.setStroke(Math.round(d), 0x33FFFFFF);
        sv.setBackground(bg);
        sv.addView(list);
        setContentView(sv);
        getWindow().setLayout(Math.round(Math.min(getResources().getDisplayMetrics().widthPixels - 32 * d, 520 * d)),
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        getWindow().setBackgroundDrawableResource(android.R.color.transparent);
    }

    /**
     * A place shared from Google Maps (Share → DriveCast): "Name\nAddress\nhttps://maps.app.goo.gl/..." - the link is
     * followed to its coordinates, then: go there now (route + the mosques on the way) or keep it as a place.
     */
    private void sharedPlace(String text) {
        if (text == null) return;
        String[] lines = text.trim().split("\n");
        String name = lines.length > 1 ? lines[0].trim() : "المكان المشارك";
        java.util.regex.Matcher u = java.util.regex.Pattern.compile("https?://\\S+").matcher(text);
        String url = u.find() ? u.group() : null;
        list.addView(section("📍 من خرائط جوجل: " + name));
        TextView info = text("أقرأ الموقع...", 12, 0x99FFFFFF);
        list.addView(info);
        new Thread(() -> {
            double[] ll = url != null ? coords(url) : coords(text);
            ui.post(() -> {
                if (ll == null) { info.setText("لم أستطع قراءة الإحداثيات من الرابط"); return; }
                info.setText(String.format(java.util.Locale.ROOT, "%.5f, %.5f", ll[0], ll[1]));
                String id = "p" + System.currentTimeMillis();
                JSONObject places = Trip.places(this);
                try {
                    places.put(id, new JSONObject().put("name", name).put("lat", ll[0]).put("lon", ll[1]));
                } catch (Exception ignored) {
                }
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                int at = list.indexOfChild(info) + 1;
                list.addView(row("🧭 انطلق الآن (المسار والمساجد)", true, () -> { Hub.set(this, "places", places); go(id); }), at);
                list.addView(row("💾 احفظه في أماكني", false, () -> {
                    Hub.set(this, "places", places);
                    status.setVisibility(View.VISIBLE);
                    status.setText("✓ حفظت «" + name + "» في أماكني");
                }), at + 1);
            });
        }).start();
    }

    /** lat/lon in a Google Maps link (short links followed) */
    static double[] coords(String url) {
        String s = url;
        for (int hop = 0; hop < 5 && s != null; hop++) {
            double[] ll = parse(s);
            if (ll != null) return ll;
            if (!s.startsWith("http")) return null;
            try {
                java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(s).openConnection();
                c.setInstanceFollowRedirects(false);
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13)");
                int code = c.getResponseCode();
                String loc = c.getHeaderField("Location");
                if (code >= 300 && code < 400 && loc != null) { s = loc; continue; }
                // the page itself may hold the coordinates
                java.io.InputStream in = c.getInputStream();
                byte[] buf = new byte[200_000];
                int n = 0, r;
                while (n < buf.length && (r = in.read(buf, n, buf.length - n)) > 0) n += r;
                in.close();
                return parse(new String(buf, 0, n, "UTF-8"));
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    private static double[] parse(String s) {
        try { s = java.net.URLDecoder.decode(s, "UTF-8"); } catch (Exception ignored) { }
        String[] pats = {"!3d(-?\\d+\\.\\d+)!4d(-?\\d+\\.\\d+)", "@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)", "[?&](?:q|query|ll|destination|center)=(-?\\d+\\.\\d+),\\s*(-?\\d+\\.\\d+)",
                "geo:(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)", "/(-?\\d{1,2}\\.\\d{4,}),\\s*\\+?(-?\\d{1,3}\\.\\d{4,})"};
        for (String p : pats) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile(p).matcher(s);
            if (m.find()) return new double[]{Double.parseDouble(m.group(1)), Double.parseDouble(m.group(2))};
        }
        return null;
    }

    private void addPlace(String key, JSONObject p) {
        String icon = "home".equals(key) ? "🏠 " : "work".equals(key) ? "🏢 " : "📍 ";
        list.addView(row(icon + Trip.placeName(this, key), true, () -> go(key)));
    }

    private void go(String key) {
        status.setVisibility(View.VISIBLE);
        status.setText("أخطط الطريق إلى " + Trip.placeName(this, key) + " وأبحث عن المساجد عليه...");
        new Thread(() -> {
            String plan = Trip.start(getApplicationContext(), key);
            ui.post(() -> {
                IslandService.start(getApplicationContext());
                IslandService.speak(plan);
                status.setText(plan);
                ui.postDelayed(this::finish, 5000);
            });
        }).start();
    }

    private void saveHere(String key) {
        boolean ok = Trip.saveHere(this, key);
        status.setVisibility(View.VISIBLE);
        status.setText(ok ? "✓ حفظت موقعك الحالي كـ" + Trip.placeName(key) : "لا أعرف موقعك الآن - فعّل الموقع");
    }

    private TextView text(String s, float sp, int color) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setTypeface(Fonts.bold(this));
        return t;
    }

    private View section(String s) {
        TextView t = text(s, 12, 0xFF34D399);
        t.setPadding(0, Math.round(14 * getResources().getDisplayMetrics().density), 0, Math.round(4 * getResources().getDisplayMetrics().density));
        return t;
    }

    private View row(String s, boolean accent, Runnable r) {
        float d = getResources().getDisplayMetrics().density;
        TextView t = text(s, 16, Color.WHITE);
        t.setPadding(Math.round(14 * d), Math.round(12 * d), Math.round(14 * d), Math.round(12 * d));
        GradientDrawable g = new GradientDrawable();
        g.setCornerRadius(16 * d);
        g.setColor(accent ? 0x2610B981 : 0x14FFFFFF);
        t.setBackground(g);
        t.setOnClickListener(v -> r.run());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = Math.round(6 * d);
        t.setLayoutParams(lp);
        return t;
    }

    private View chip(String s, Runnable r) {
        float d = getResources().getDisplayMetrics().density;
        TextView t = text(s, 14, Color.WHITE);
        t.setGravity(Gravity.CENTER);
        t.setPadding(0, Math.round(10 * d), 0, Math.round(10 * d));
        GradientDrawable g = new GradientDrawable();
        g.setCornerRadius(40 * d);
        g.setColor(0x1FFFFFFF);
        t.setBackground(g);
        t.setOnClickListener(v -> r.run());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        lp.setMargins(Math.round(3 * d), 0, Math.round(3 * d), 0);
        t.setLayoutParams(lp);
        return t;
    }
}
