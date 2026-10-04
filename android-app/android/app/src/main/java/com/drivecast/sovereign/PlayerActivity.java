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
        setContentView(root);
        hideBars();
        load(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        load(intent);
    }

    private void load(Intent i) {
        String type = i.getStringExtra("type"), id = i.getStringExtra("id");
        if (id == null) { finish(); return; }
        String css = "<meta name='viewport' content='width=device-width,initial-scale=1'><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}"
                + "iframe,video{border:0;width:100%;height:100%;background:#000}</style>";
        if ("stream".equals(type)) {
            String u = id.replace("'", "%27");
            String html = "<!doctype html><html><head>" + css
                    + "<script src='https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js'></script></head><body>"
                    + "<video id='v' autoplay playsinline controls></video><script>"
                    + "var v=document.getElementById('v'),s='" + u + "';"
                    + "if(s.indexOf('.m3u8')<0||v.canPlayType('application/vnd.apple.mpegurl')){v.src=s;}"
                    + "else if(window.Hls&&Hls.isSupported()){var h=new Hls();h.loadSource(s);h.attachMedia(v);}else{v.src=s;}"
                    + "v.play().catch(function(){});</script></body></html>";
            web.loadDataWithBaseURL("http://localhost/", html, "text/html", "UTF-8", null);
        } else {
            String html = "<!doctype html><html><head>" + css + "</head><body>"
                    + "<iframe src='https://www.youtube.com/embed/" + id + "?autoplay=1&playsinline=1&rel=0&fs=1' "
                    + "allow='autoplay; encrypted-media; picture-in-picture; fullscreen' allowfullscreen></iframe></body></html>";
            // the site's address as the page origin: YouTube's player refuses pages without one
            String origin = Widgets.json(this, "widgets").optString("origin", "https://cplay2.vercel.app");
            web.loadDataWithBaseURL(origin + "/", html, "text/html", "UTF-8", null);
        }
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
