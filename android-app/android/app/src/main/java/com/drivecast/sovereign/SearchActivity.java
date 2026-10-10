package com.drivecast.sovereign;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.ArrayList;

/**
 * The search box of a browsing widget: a small dialog over the home screen (type, or tap the microphone and speak).
 * The results open inside the widget that asked, like the media screen's search.
 */
public class SearchActivity extends Activity {

    private static final int VOICE = 7201;
    private int wid;
    private EditText input;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        wid = getIntent().getIntExtra("wid", 0);
        float d = getResources().getDisplayMetrics().density;

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.HORIZONTAL);
        root.setGravity(Gravity.CENTER_VERTICAL);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        int p = Math.round(12 * d);
        root.setPadding(p, p, p, p);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xFF0B0B10);
        bg.setCornerRadius(24 * d);
        bg.setStroke(Math.round(d), 0x33FFFFFF);
        root.setBackground(bg);

        input = new EditText(this);
        input.setHint("ابحث عن تلاوة أو قناة...");
        input.setTextColor(Color.WHITE);
        input.setHintTextColor(0x66FFFFFF);
        input.setTypeface(Fonts.bold(this));
        input.setTextSize(17);
        input.setSingleLine(true);
        input.setImeOptions(EditorInfo.IME_ACTION_SEARCH);
        input.setBackground(null);
        input.setOnEditorActionListener((v, actionId, e) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH || (e != null && e.getKeyCode() == KeyEvent.KEYCODE_ENTER)) { submit(); return true; }
            return false;
        });
        root.addView(input, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));

        TextView mic = button("🎤", 0x33FFFFFF);
        mic.setOnClickListener(v -> voice());
        root.addView(mic, new LinearLayout.LayoutParams(Math.round(46 * d), Math.round(46 * d)));
        TextView go = button("بحث", 0xFFDC2626);
        go.setOnClickListener(v -> submit());
        LinearLayout.LayoutParams gl = new LinearLayout.LayoutParams(Math.round(72 * d), Math.round(46 * d));
        gl.setMarginStart(Math.round(8 * d));
        root.addView(go, gl);
        setContentView(root);
        getWindow().setLayout(Math.round(Math.min(getResources().getDisplayMetrics().widthPixels - 32 * d, 560 * d)), LinearLayout.LayoutParams.WRAP_CONTENT);
        getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        input.requestFocus();
    }

    private TextView button(String text, int color) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextColor(Color.WHITE);
        t.setTypeface(Fonts.black(this));
        t.setTextSize(15);
        t.setGravity(Gravity.CENTER);
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(100);
        t.setBackground(g);
        return t;
    }

    private void voice() {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar");
        try {
            startActivityForResult(i, VOICE);
        } catch (Exception e) {
            input.setHint("البحث الصوتي غير متاح هنا - اكتب");
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == VOICE && res == RESULT_OK && data != null) {
            ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (r != null && !r.isEmpty()) {
                input.setText(r.get(0));
                submit();
            }
        }
    }

    private void submit() {
        String q = input.getText().toString().trim();
        if (q.isEmpty()) return;
        // the results full screen (like the voice search), not inside the widget
        SearchResultsActivity.open(getApplicationContext(), new Intent().putExtra("query", q));
        finish();
    }
}
