package com.drivecast.sovereign;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The results of a voice search ("سورة الكهف ياسر الدوسري"), full screen, to browse: the first one already plays as
 * sound in the island; tap a card = the full player (with the list for next / previous), "🎧" = as sound in the
 * island.
 */
public class SearchResultsActivity extends Activity {

    private final Handler ui = new Handler(Looper.getMainLooper());
    private JSONArray items = new JSONArray();

    private int dp(float v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        try {
            items = new JSONArray(getIntent().getStringExtra("items") == null ? "[]" : getIntent().getStringExtra("items"));
        } catch (Exception ignored) {
        }
        String query = getIntent().getStringExtra("query");

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xF2050507);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(16), dp(14), dp(16), dp(10));
        TextView title = text("🔎 " + (query == null ? "" : query), 18, Color.WHITE, true);
        title.setSingleLine(true);
        title.setEllipsize(TextUtils.TruncateAt.END);
        bar.addView(title, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        TextView close = pill("✕ إغلاق", 0x99DC2626);
        close.setOnClickListener(v -> finish());
        bar.addView(close);
        root.addView(bar);
        TextView hint = text("اضغط بطاقة للمشغّل الكامل · 🎧 للصوت فقط في الجزيرة", 12, 0x99FFFFFF, false);
        hint.setPadding(dp(16), 0, dp(16), dp(8));
        root.addView(hint);

        ScrollView sv = new ScrollView(this);
        LinearLayout grid = new LinearLayout(this);
        grid.setOrientation(LinearLayout.VERTICAL);
        grid.setPadding(dp(10), 0, dp(10), dp(20));
        int cols = getResources().getDisplayMetrics().widthPixels > dp(700) ? 3 : 2;
        LinearLayout row = null;
        for (int i = 0; i < items.length(); i++) {
            if (i % cols == 0) {
                row = new LinearLayout(this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                grid.addView(row);
            }
            row.addView(card(i), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        }
        if (row != null) for (int k = items.length() % cols; k > 0 && k < cols; k++) row.addView(new View(this), new LinearLayout.LayoutParams(0, 1, 1));
        if (items.length() == 0) grid.addView(text("لا نتائج", 16, 0x99FFFFFF, false));
        sv.addView(grid);
        root.addView(sv, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);
    }

    private View card(int i) {
        JSONObject o = items.optJSONObject(i);
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setPadding(dp(5), dp(5), dp(5), dp(10));
        FrameLayout pic = new FrameLayout(this);
        ImageView iv = new ImageView(this);
        iv.setScaleType(ImageView.ScaleType.CENTER_CROP);
        GradientDrawable g = new GradientDrawable();
        g.setColor(0xFF15151C);
        g.setCornerRadius(dp(16));
        pic.setBackground(g);
        pic.setClipToOutline(true);
        pic.addView(iv, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, dp(110)));
        TextView audio = pill("🎧", 0xCC000000);
        audio.setOnClickListener(v -> { playAudio(i); finish(); });
        FrameLayout.LayoutParams al = new FrameLayout.LayoutParams(dp(40), dp(40), Gravity.BOTTOM | Gravity.START);
        al.setMargins(dp(6), dp(6), dp(6), dp(6));
        pic.addView(audio, al);
        c.addView(pic);
        TextView t = text(o != null ? o.optString("name") : "", 13, Color.WHITE, true);
        t.setMaxLines(2);
        t.setEllipsize(TextUtils.TruncateAt.END);
        t.setPadding(dp(4), dp(6), dp(4), 0);
        c.addView(t);
        TextView ch = text(o != null ? o.optString("channel") : "", 11, 0x80FFFFFF, false);
        ch.setSingleLine(true);
        ch.setPadding(dp(4), dp(2), dp(4), 0);
        c.addView(ch);
        c.setOnClickListener(v -> { full(i); finish(); });
        final String thumb = o != null ? o.optString("thumb", "") : "";
        if (!thumb.isEmpty()) new Thread(() -> {
            Bitmap bm = Images.get(getApplicationContext(), thumb, dp(320));
            if (bm != null) ui.post(() -> iv.setImageBitmap(bm));
        }).start();
        return c;
    }

    private void full(int i) {
        JSONObject o = items.optJSONObject(i);
        if (o == null) return;
        ContextCompat.startForegroundService(this, new Intent(this, IslandService.class).setAction(IslandService.STOP_ALL));
        MediaBrowser.play(this, "youtube", o.optString("id"), o.optString("name"), items);
    }

    private void playAudio(int i) {
        JSONObject o = items.optJSONObject(i);
        if (o == null) return;
        Intent a = new Intent(this, IslandService.class).setAction(IslandService.AUDIO).putExtra("type", "youtube")
                .putExtra("id", o.optString("id")).putExtra("title", o.optString("name")).putExtra("queue", items.toString()).putExtra("index", i);
        ContextCompat.startForegroundService(this, a);
    }

    private TextView text(String s, float sp, int color, boolean heavy) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setTypeface(heavy ? Fonts.black(this) : Fonts.bold(this));
        return t;
    }

    private TextView pill(String s, int bg) {
        TextView t = text(s, 13, Color.WHITE, true);
        t.setGravity(Gravity.CENTER);
        t.setPadding(dp(12), dp(6), dp(12), dp(6));
        GradientDrawable g = new GradientDrawable();
        g.setColor(bg);
        g.setCornerRadius(dp(40));
        t.setBackground(g);
        return t;
    }
}
