package com.drivecast.sovereign;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

/**
 * The full-screen player for what the widgets play: a YouTube video (YouTube's player) or an IPTV stream (hls.js, like
 * the site). Black, edge to edge, system bars hidden; back closes it.
 */
public class PlayerActivity extends Activity {

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        if (Build.VERSION.SDK_INT >= 28) getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        web.setBackgroundColor(Color.BLACK);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        // the site's player bar: round glass buttons along the bottom (it hides after a few seconds; touch to show it)
        controls = buildControls();
        FrameLayout.LayoutParams cl = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT,
                android.view.Gravity.BOTTOM | android.view.Gravity.CENTER_HORIZONTAL);
        cl.bottomMargin = Math.round(22 * getResources().getDisplayMetrics().density);
        root.addView(controls, cl);
        web.setOnTouchListener((v, e) -> {
            if (e.getAction() == android.view.MotionEvent.ACTION_DOWN) showControls();
            return false;
        });
        setContentView(root);
        hideBars();
        load(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        load(intent);
    }

    private String type, id, title;
    /** what was around the video when it was tapped (the widget's list): previous / next */
    private org.json.JSONArray queue = new org.json.JSONArray();
    private int index = 0;
    private android.widget.LinearLayout controls;
    private android.widget.TextView titleView;
    private final android.os.Handler ui = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable hide = () -> { if (controls != null) controls.animate().alpha(0f).setDuration(300).withEndAction(() -> controls.setVisibility(android.view.View.GONE)).start(); };

    private void load(Intent i) {
        type = i.getStringExtra("type");
        id = i.getStringExtra("id");
        title = i.getStringExtra("title");
        if (id == null) { finish(); return; }
        try {
            queue = new org.json.JSONArray(i.getStringExtra("queue") == null ? "[]" : i.getStringExtra("queue"));
        } catch (Exception e) {
            queue = new org.json.JSONArray();
        }
        index = 0;
        for (int k = 0; k < queue.length(); k++) if (id.equals(queue.optJSONObject(k).optString("id"))) index = k;
        play();
    }

    private void play() {
        web.loadDataWithBaseURL(base(this, type), html(type, id), "text/html", "UTF-8", null);
        if (titleView != null) titleView.setText(title == null ? "" : title);
        showControls();
    }

    private void step(int d) {
        if (queue.length() == 0) return;
        index = (index + d + queue.length()) % queue.length();
        org.json.JSONObject o = queue.optJSONObject(index);
        if (o == null) return;
        id = o.optString("id");
        title = o.optString("name");
        play();
    }

    private void showControls() {
        if (controls == null) return;
        controls.setVisibility(android.view.View.VISIBLE);
        controls.animate().alpha(1f).setDuration(200).start();
        ui.removeCallbacks(hide);
        ui.postDelayed(hide, 5000);
    }

    /** One round glass button like the site's player bar. */
    private android.widget.TextView round(String glyph, int bg, int ring, Runnable onTap) {
        float d = getResources().getDisplayMetrics().density;
        android.widget.TextView t = new android.widget.TextView(this);
        t.setText(glyph);
        t.setTextColor(Color.WHITE);
        t.setTextSize(22);
        t.setGravity(android.view.Gravity.CENTER);
        android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
        g.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        g.setColor(bg);
        if (ring != 0) g.setStroke(Math.round(2.5f * d), ring);
        t.setBackground(g);
        t.setOnClickListener(v -> { onTap.run(); showControls(); });
        android.widget.LinearLayout.LayoutParams lp = new android.widget.LinearLayout.LayoutParams(Math.round(58 * d), Math.round(58 * d));
        lp.setMargins(Math.round(6 * d), 0, Math.round(6 * d), 0);
        t.setLayoutParams(lp);
        return t;
    }

    private android.widget.LinearLayout buildControls() {
        float d = getResources().getDisplayMetrics().density;
        android.widget.LinearLayout col = new android.widget.LinearLayout(this);
        col.setOrientation(android.widget.LinearLayout.VERTICAL);
        col.setGravity(android.view.Gravity.CENTER_HORIZONTAL);
        titleView = new android.widget.TextView(this);
        titleView.setTextColor(0xE6FFFFFF);
        titleView.setTypeface(Fonts.bold(this));
        titleView.setTextSize(15);
        titleView.setSingleLine(true);
        titleView.setEllipsize(android.text.TextUtils.TruncateAt.END);
        titleView.setMaxWidth(Math.round(520 * d));
        titleView.setShadowLayer(8, 0, 0, Color.BLACK);
        titleView.setPadding(0, 0, 0, Math.round(10 * d));
        col.addView(titleView);
        android.widget.LinearLayout bar = new android.widget.LinearLayout(this);
        bar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        bar.setLayoutDirection(android.view.View.LAYOUT_DIRECTION_LTR);
        int p = Math.round(10 * d);
        bar.setPadding(p, p, p, p);
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setColor(0x660A1A3A);
        bg.setCornerRadius(40 * d);
        bar.setBackground(bg);
        int glass = 0x40FFFFFF;
        bar.addView(round("›", glass, 0xFFFFFFFF, () -> step(1)));                        // next (ringed, like the site)
        bar.addView(round("⧉", 0xFF2F80ED, 0, () -> switchTo("popup")));                 // floating window
        bar.addView(round("🎧", glass, 0, () -> switchTo("audio")));                      // sound in the island
        bar.addView(round("‹", glass, 0, () -> step(-1)));                                // previous
        bar.addView(round("✕", 0xFFE53935, 0, this::finish));                            // close
        col.addView(bar);
        return col;
    }

    /** The player page: YouTube's embed, or a stream through hls.js (like the site). */
    static String html(String type, String id) {
        String css = "<meta name='viewport' content='width=device-width,initial-scale=1'><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}"
                + "iframe,video{border:0;width:100%;height:100%;background:#000}</style>";
        if ("stream".equals(type)) {
            String u = id.replace("'", "%27");
            return "<!doctype html><html><head>" + css
                    + "<script src='https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js'></script></head><body>"
                    + "<video id='v' autoplay playsinline controls></video><script>"
                    + "var v=document.getElementById('v'),s='" + u + "';"
                    + "if(s.indexOf('.m3u8')<0||v.canPlayType('application/vnd.apple.mpegurl')){v.src=s;}"
                    + "else if(window.Hls&&Hls.isSupported()){var h=new Hls();h.loadSource(s);h.attachMedia(v);}else{v.src=s;}"
                    + "v.play().catch(function(){});"
                    + "window.dcToggle=function(){if(v.paused)v.play();else v.pause();return !v.paused;};</script></body></html>";
        }
        // the IFrame API, so the island can pause / resume it
        return "<!doctype html><html><head>" + css + "</head><body><div id='p'></div>"
                + "<script src='https://www.youtube.com/iframe_api'></script><script>var P;"
                + "function onYouTubeIframeAPIReady(){P=new YT.Player('p',{width:'100%',height:'100%',videoId:'" + id.replace("'", "") + "',"
                + "playerVars:{autoplay:1,playsinline:1,rel:0,fs:1},events:{onReady:function(e){e.target.playVideo();}}});}"
                + "window.dcToggle=function(){if(!P||!P.getPlayerState)return true;if(P.getPlayerState()==1){P.pauseVideo();return false;}P.playVideo();return true;};"
                + "</script></body></html>";
    }

    /** The page's origin: the site's address (YouTube's player refuses pages without one). */
    static String base(android.content.Context ctx, String type) {
        if ("stream".equals(type)) return "http://localhost/";
        return Widgets.json(ctx, "widgets").optString("origin", "https://cplay2.vercel.app") + "/";
    }

    /** Switch to the floating window or to audio only in the island. */
    private void switchTo(String mode) {
        Intent s = new Intent(this, IslandService.class).setAction("popup".equals(mode) ? IslandService.POPUP : IslandService.AUDIO)
                .putExtra("type", type).putExtra("id", id).putExtra("title", title);
        try { androidx.core.content.ContextCompat.startForegroundService(this, s); } catch (Exception ignored) { }
        finish();
    }

    private android.widget.TextView modeButton(String text) {
        android.widget.TextView t = new android.widget.TextView(this);
        t.setText(text);
        t.setTextColor(Color.WHITE);
        t.setTypeface(Fonts.bold(this));
        t.setTextSize(13);
        t.setGravity(android.view.Gravity.CENTER);
        float d = getResources().getDisplayMetrics().density;
        t.setPadding(Math.round(14 * d), 0, Math.round(14 * d), 0);
        android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
        g.setColor(0x99000000);
        g.setStroke(Math.round(d), 0x40FFFFFF);
        g.setCornerRadius(100);
        t.setBackground(g);
        return t;
    }

    private void hideBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
        }
        super.onDestroy();
    }
}
