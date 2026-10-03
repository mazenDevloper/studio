package com.drivecast.sovereign;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * The site in a native shell. The page keeps running when the app goes to the background (audio, live scores),
 * and the floating island service takes over the screen above other apps while the app isn't visible.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeIslandPlugin.class);
        super.onCreate(savedInstanceState);
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            // the font size chosen in the app's settings
            webView.getSettings().setTextZoom(NativeIslandPlugin.prefs(this).getInt("textZoom", 100));
        }
        IslandService.start(this);
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
        IslandService.setAppVisible(false);
    }
}
