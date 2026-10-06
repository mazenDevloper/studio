package com.drivecast.sovereign;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Google Maps through its JavaScript library, in a hidden web page that carries the site's address — the same way the
 * site's map works (a key limited to the site's address is accepted there even when the web services refuse it):
 * nearby mosques (PlacesService), a place by name (text search) and a driving route (DirectionsService).
 * Called from a background thread; each call waits up to 15 seconds.
 */
final class GJs {

    private GJs() {
    }

    private static WebView view;
    private static volatile boolean ready = false, failed = false;
    private static final Handler main = new Handler(Looper.getMainLooper());
    private static final Map<Integer, String[]> results = new ConcurrentHashMap<>();
    private static final Map<Integer, CountDownLatch> waits = new ConcurrentHashMap<>();
    private static final AtomicInteger seq = new AtomicInteger();
    static String lastError = "";

    private static final String JS =
            "function done(id,o){try{DCG.done(id,JSON.stringify(o))}catch(e){}}"
            + "window.gm_authFailure=function(){try{DCG.fail('auth')}catch(e){}};"
            + "function init(){window.PS=new google.maps.places.PlacesService(document.getElementById('m'));window.DS=new google.maps.DirectionsService();DCG.ready()}"
            + "function pl(r){return (r||[]).map(function(p){return {name:p.name,lat:p.geometry.location.lat(),lon:p.geometry.location.lng(),address:p.formatted_address||p.vicinity||''}})}"
            + "window.nearby=function(id,lat,lng,rad){PS.nearbySearch({location:{lat:lat,lng:lng},radius:rad,type:'mosque',language:'ar'},function(r,s){done(id,{st:s,res:pl(r)})})};"
            + "window.find=function(id,q,lat,lng){var o={query:q,language:'ar'};if(lat||lng){o.location={lat:lat,lng:lng};o.radius=50000}PS.textSearch(o,function(r,s){done(id,{st:s,res:pl(r)})})};"
            + "window.route=function(id,a,b,c,d){DS.route({origin:{lat:a,lng:b},destination:{lat:c,lng:d},travelMode:'DRIVING'},function(r,s){if(s!=='OK')return done(id,{st:s});"
            + "var lg=r.routes[0].legs[0];done(id,{st:s,meters:lg.distance.value,seconds:lg.duration.value,points:r.routes[0].overview_path.map(function(p){return [p.lat(),p.lng()]})})})};";

    private static final class Bridge {
        @JavascriptInterface public void ready() { ready = true; }
        @JavascriptInterface public void fail(String why) { failed = true; lastError = "Google (JS): " + why; }
        @JavascriptInterface public void done(int id, String json) {
            results.put(id, new String[]{json});
            CountDownLatch l = waits.get(id);
            if (l != null) l.countDown();
        }
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private static void ensure(Context ctx) {
        if (view != null) return;
        view = new WebView(ctx.getApplicationContext());
        WebSettings s = view.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        view.setWebViewClient(new WebViewClient());
        view.addJavascriptInterface(new Bridge(), "DCG");
        String html = "<!doctype html><html><head><meta charset='utf-8'></head><body><div id='m' style='width:10px;height:10px'></div><script>" + JS
                + "</script><script async src='https://maps.googleapis.com/maps/api/js?key=" + GMaps.key(ctx) + "&libraries=places&language=ar&callback=init'></script></body></html>";
        view.loadDataWithBaseURL(Widgets.json(ctx, "widgets").optString("origin", "https://cplay2.vercel.app") + "/", html, "text/html", "UTF-8", null);
    }

    /** Run a call in the page and wait for its answer (null on failure / timeout). */
    private static JSONObject call(Context ctx, String fn, Object... args) {
        if (failed) return null;
        int id = seq.incrementAndGet();
        CountDownLatch l = new CountDownLatch(1);
        waits.put(id, l);
        StringBuilder a = new StringBuilder(String.valueOf(id));
        for (Object o : args) a.append(",").append(o instanceof String ? JSONObject.quote((String) o) : String.valueOf(o));
        final String js = "(function t(n){if(window." + fn + "&&window.PS){" + fn + "(" + a + ")}else if(n<60){setTimeout(function(){t(n+1)},250)}})(0)";
        main.post(() -> {
            try {
                ensure(ctx);
                view.evaluateJavascript(js, null);
            } catch (Exception e) {
                l.countDown();
            }
        });
        try {
            l.await(18, TimeUnit.SECONDS);
        } catch (InterruptedException ignored) {
        }
        waits.remove(id);
        String[] r = results.remove(id);
        if (r == null) { if (lastError.isEmpty()) lastError = "Google (JS): لا رد"; return null; }
        try {
            JSONObject j = new JSONObject(r[0]);
            String st = j.optString("st");
            if (!"OK".equals(st) && !"ZERO_RESULTS".equals(st)) { lastError = "Google (JS): " + st; return null; }
            lastError = "";
            return j;
        } catch (Exception e) {
            return null;
        }
    }

    static JSONObject nearby(Context ctx, double lat, double lon, int radius) {
        return call(ctx, "nearby", lat, lon, radius);
    }

    static JSONObject find(Context ctx, String q, double lat, double lon) {
        return call(ctx, "find", q, lat, lon);
    }

    static JSONObject route(Context ctx, double a, double b, double c, double d) {
        return call(ctx, "route", a, b, c, d);
    }

    /** a new key was set: load the page again */
    static void reset() {
        main.post(() -> {
            if (view != null) view.destroy();
            view = null;
            ready = false;
            failed = false;
        });
    }
}
