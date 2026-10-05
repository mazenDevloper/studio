package com.drivecast.sovereign;

import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.webkit.WebView;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import com.getcapacitor.BridgeActivity;

import java.util.HashSet;
import java.util.Set;

/**
 * The site in a native shell. The page keeps running when the app goes to the background (audio, live scores),
 * YouTube keeps playing behind other apps, a playing video shrinks to picture-in-picture when you leave, widgets
 * and launcher shortcuts open a given screen, and the floating island service takes over while the app is hidden.
 */
public class MainActivity extends BridgeActivity {

    /** set by the page (NativeIsland.setVideoPlaying): a video is playing, so leaving the app goes picture-in-picture */
    static volatile boolean videoPlaying = false;

    /**
     * Runs first in every YouTube frame: the page always looks visible, so the embed never pauses itself when the
     * app is in the background or the screen is off.
     */
    private static final String KEEP_PLAYING_JS =
            "(function(){try{" +
            "var D=Document.prototype;" +
            "Object.defineProperty(D,'visibilityState',{get:function(){return 'visible'},configurable:true});" +
            "Object.defineProperty(D,'hidden',{get:function(){return false},configurable:true});" +
            "Object.defineProperty(D,'webkitVisibilityState',{get:function(){return 'visible'},configurable:true});" +
            "Object.defineProperty(D,'webkitHidden',{get:function(){return false},configurable:true});" +
            "var stop=function(e){e.stopImmediatePropagation();};" +
            "['visibilitychange','webkitvisibilitychange','pagehide','freeze'].forEach(function(t){" +
            "window.addEventListener(t,stop,true);document.addEventListener(t,stop,true);});" +
            "}catch(e){}})();";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeIslandPlugin.class);
        super.onCreate(savedInstanceState);
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            // the font size chosen in the app's settings
            webView.getSettings().setTextZoom(NativeIslandPlugin.prefs(this).getInt("textZoom", 100));
            if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                Set<String> youtube = new HashSet<>();
                youtube.add("https://www.youtube.com");
                youtube.add("https://youtube.com");
                youtube.add("https://m.youtube.com");
                youtube.add("https://www.youtube-nocookie.com");
                try {
                    WebViewCompat.addDocumentStartJavaScript(webView, KEEP_PLAYING_JS, youtube);
                } catch (Exception ignored) {
                }
            }
        }
        IslandService.start(this);
        openRoute(getIntent(), true);
        // prayer on the road needs the location: ask once on first start (Android shows its own dialog)
        if (Build.VERSION.SDK_INT >= 23 && !RoadPrayer.permitted(this) && !NativeIslandPlugin.prefs(this).getBoolean("askedRoadLocation", false)) {
            NativeIslandPlugin.prefs(this).edit().putBoolean("askedRoadLocation", true).apply();
            requestPermissions(new String[]{android.Manifest.permission.ACCESS_FINE_LOCATION, android.Manifest.permission.ACCESS_COARSE_LOCATION}, 7101);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        // location just allowed: the service keeps it behind other apps from now on
        if (requestCode == 7101 && RoadPrayer.permitted(this)) IslandService.locationGranted();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openRoute(intent, false);
    }

    /** A widget / launcher shortcut asked for a screen ("route": "/matches") or a command for the page. */
    private void openRoute(Intent intent, boolean coldStart) {
        if (intent == null) return;
        String route = intent.getStringExtra("route");
        String command = intent.getStringExtra("command");
        if (route != null && route.startsWith("/")) {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            String base = getBridge() != null ? getBridge().getServerUrl() : null;
            if (webView != null && base != null) {
                Uri b = Uri.parse(base);
                String url = b.getScheme() + "://" + b.getAuthority() + route;
                // on a cold start the bridge is loading its first page: go to the screen right after
                webView.postDelayed(() -> webView.loadUrl(url), coldStart ? 600 : 0);
            }
        }
        // with a screen to open, the command waits for that screen's page (the current page is about to be replaced)
        if (command != null) {
            if (route != null && route.startsWith("/")) NativeIslandPlugin.queueCommand(command, intent.getStringExtra("arg"));
            else NativeIslandPlugin.emitCommand(command, intent.getStringExtra("arg"));
        }
        // the radar map asked for the location permission (a service can't ask)
        if (intent.getBooleanExtra("askLocation", false) && Build.VERSION.SDK_INT >= 23) {
            requestPermissions(new String[]{android.Manifest.permission.ACCESS_FINE_LOCATION, android.Manifest.permission.ACCESS_COARSE_LOCATION}, 7101);
        }
        intent.removeExtra("route");
        intent.removeExtra("command");
        intent.removeExtra("askLocation");
    }

    @Override
    public void onResume() {
        super.onResume();
        IslandService.setAppVisible(true);
    }

    @Override
    public void onPause() {
        super.onPause();
        // keep the page alive behind other apps: audio keeps playing and timers keep running
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
        }
        boolean pip = Build.VERSION.SDK_INT >= 24 && isInPictureInPictureMode();
        IslandService.setAppVisible(pip);
    }

    /** Leaving the app while a video plays: keep watching it in a small floating window. */
    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (videoPlaying && Build.VERSION.SDK_INT >= 26) {
            try {
                enterPictureInPictureMode(new PictureInPictureParams.Builder().setAspectRatio(new Rational(16, 9)).build());
            } catch (Exception ignored) {
            }
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        NativeIslandPlugin.emitCommand("pip", isInPictureInPictureMode ? "1" : "0");
    }
}
