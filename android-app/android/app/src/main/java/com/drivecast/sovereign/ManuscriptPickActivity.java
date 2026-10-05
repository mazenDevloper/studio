package com.drivecast.sovereign;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Pin a manuscript on one manuscript widget: opens when the widget is placed, from its pin button, or from the
 * launcher's "reconfigure". "تناوب تلقائي" lets the widget go back to taking turns (or to the site's pinned one).
 */
public class ManuscriptPickActivity extends Activity {

    private int wid;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        wid = getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, getIntent().getIntExtra("wid", 0));
        setResult(RESULT_OK, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, wid));
        float d = getResources().getDisplayMetrics().density;
        String current = NativeIslandPlugin.prefs(this).getString("manuPin_" + wid, "");

        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        int p = Math.round(14 * d);
        list.setPadding(p, p, p, p);

        TextView title = new TextView(this);
        title.setText("تثبيت مخطوطة على الويدجت");
        title.setTextColor(Color.WHITE);
        title.setTypeface(Fonts.black(this));
        title.setTextSize(18);
        title.setPadding(0, 0, 0, Math.round(10 * d));
        list.addView(title);

        list.addView(row("🔄  تناوب تلقائي", null, current.isEmpty(), v -> pick("")));

        JSONArray items = Cloud.array(this, "cloud_manuscripts");
        if (items.length() == 0) items = Widgets.json(this, "widgets").optJSONArray("manuscripts");
        for (int i = 0; items != null && i < items.length(); i++) {
            JSONObject o = items.optJSONObject(i);
            if (o == null) continue;
            String id = o.optString("id");
            String text = o.optString("content", "").trim();
            if (text.isEmpty()) text = o.optString("title", "مخطوطة " + (i + 1));
            Bitmap thumb = Images.get(this, o.optString("src", null), 300);
            list.addView(row(text, thumb, id.equals(current), v -> pick(id)));
        }
        if (items == null || items.length() == 0) {
            TextView t = new TextView(this);
            t.setText("لا توجد مخطوطات بعد - أضفها من لوحة الموقع");
            t.setTextColor(0x99FFFFFF);
            t.setTypeface(Fonts.bold(this));
            list.addView(t);
        }

        ScrollView sv = new ScrollView(this);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xFF0B0B10);
        bg.setCornerRadius(24 * d);
        bg.setStroke(Math.round(d), 0x33FFFFFF);
        sv.setBackground(bg);
        sv.addView(list);
        setContentView(sv);
        getWindow().setLayout(Math.round(Math.min(getResources().getDisplayMetrics().widthPixels - 32 * d, 520 * d)),
                Math.round(Math.min(getResources().getDisplayMetrics().heightPixels * 0.75f, 640 * d)));
        getWindow().setBackgroundDrawableResource(android.R.color.transparent);
    }

    private View row(String text, Bitmap thumb, boolean selected, View.OnClickListener l) {
        float d = getResources().getDisplayMetrics().density;
        LinearLayout r = new LinearLayout(this);
        r.setOrientation(LinearLayout.HORIZONTAL);
        r.setGravity(Gravity.CENTER_VERTICAL);
        int p = Math.round(10 * d);
        r.setPadding(p, p, p, p);
        GradientDrawable g = new GradientDrawable();
        g.setColor(selected ? 0x3310B981 : 0x14FFFFFF);
        g.setCornerRadius(16 * d);
        if (selected) g.setStroke(Math.round(1.5f * d), 0xFF34D399);
        r.setBackground(g);
        if (thumb != null) {
            ImageView iv = new ImageView(this);
            iv.setImageBitmap(thumb);
            iv.setScaleType(ImageView.ScaleType.FIT_CENTER);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(Math.round(64 * d), Math.round(44 * d));
            lp.setMarginEnd(Math.round(10 * d));
            r.addView(iv, lp);
        }
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextColor(Color.WHITE);
        t.setTypeface(Fonts.bold(this), Typeface.NORMAL);
        t.setTextSize(15);
        t.setMaxLines(2);
        t.setEllipsize(TextUtils.TruncateAt.END);
        r.addView(t, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        if (selected) {
            TextView c = new TextView(this);
            c.setText("📌");
            r.addView(c);
        }
        r.setOnClickListener(l);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = Math.round(6 * d);
        r.setLayoutParams(lp);
        return r;
    }

    private void pick(String id) {
        NativeIslandPlugin.prefs(this).edit().putString("manuPin_" + wid, id).putInt("manuIdx_" + wid, 0).apply();
        Widgets.updateAll(getApplicationContext());
        finish();
    }
}
