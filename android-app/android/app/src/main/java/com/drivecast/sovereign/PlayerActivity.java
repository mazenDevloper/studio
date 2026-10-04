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
        // three ways to watch: full screen (here), a floating window, or sound only in the floating island
        float d = getResources().getDisplayMetrics().density;
        android.widget.LinearLayout modes = new android.widget.LinearLayout(this);
        modes.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        android.widget.TextView popup = modeButton("⧉ نافذة عائمة"), island = modeButton("🎧 صوت في الجزيرة");
        popup.setOnClickListener(v -> switchTo("popup"));
        island.setOnClickListener(v -> switchTo("audio"));
        android.widget.LinearLayout.LayoutParams bl = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, Math.round(36 * d));
        bl.setMarginEnd(Math.round(8 * d));
        modes.addView(island, bl);
        modes.addView(popup, new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, Math.round(36 * d)));
        FrameLayout.LayoutParams ml = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, android.view.Gravity.TOP | android.view.Gravity.START);
        ml.setMargins(Math.round(14 * d), Math.round(14 * d), 0, 0);
        root.addView(modes, ml);
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

    private void load(Intent i) {
        type = i.getStringExtra("type");
        id = i.getStringExtra("id");
        title = i.getStringExtra("title");
        if (id == null) { finish(); return; }
        web.loadDataWithBaseURL(base(this, type), html(type, id), "text/html", "UTF-8", null);
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
