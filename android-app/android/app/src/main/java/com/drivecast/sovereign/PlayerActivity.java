package com.drivecast.sovereign;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.graphics.PathParser;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The full-screen player for what the widgets play, with the site's GlobalVideoPlayer bar (global-player.tsx):
 * close (red) · [previous · next · list · save · floating window · island audio · fill screen] · the expand button.
 * Like the site, the next video starts by itself 3 seconds after YouTube reports the end (state 0) — no timer, so
 * pauses, buffering and ads can't make it jump early; replaying or seeking back cancels it.
 */
public class PlayerActivity extends Activity {

    private WebView web;
    private String type, id, title;
    /** what was around the video when it was tapped (the widget's list): previous / next / the list panel */
    private JSONArray queue = new JSONArray();
    private int index = 0;
    private boolean expanded = false, fill = false;

    private FrameLayout root;
    private LinearLayout controls, bar, extra;
    private TextView titleView, countdown;
    private HorizontalScrollView listPanel;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Runnable hide = () -> {
        if (controls != null && listPanel.getVisibility() != View.VISIBLE)
            controls.animate().alpha(0f).setDuration(300).withEndAction(() -> controls.setVisibility(View.GONE)).start();
    };
    private Runnable pendingNext;
    /** the open player (voice "التالي" / "السابق") */
    static PlayerActivity open;

    static boolean voiceStep(int d) {
        PlayerActivity p = open;
        if (p == null || p.queue.length() <= 1) return false;
        p.ui.post(() -> p.step(d));
        return true;
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface", "ClickableViewAccessibility"})
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        if (Build.VERSION.SDK_INT >= 28) getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        root = new FrameLayout(this);
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
        web.addJavascriptInterface(new Js(), "DCP");
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        controls = buildControls();
        FrameLayout.LayoutParams cl = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM);
        cl.bottomMargin = dp(18);
        root.addView(controls, cl);

        countdown = new TextView(this);
        countdown.setTextColor(Color.WHITE);
        countdown.setTypeface(Fonts.black(this));
        countdown.setTextSize(16);
        countdown.setGravity(Gravity.CENTER);
        countdown.setPadding(dp(18), dp(10), dp(18), dp(10));
        countdown.setBackground(pill(0xCC000000, 0x6634D399));
        countdown.setVisibility(View.GONE);
        countdown.setOnClickListener(v -> cancelNext());
        FrameLayout.LayoutParams ql = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        ql.topMargin = dp(24);
        root.addView(countdown, ql);

        web.setOnTouchListener((v, e) -> {
            if (e.getAction() == MotionEvent.ACTION_DOWN) showControls();
            return false;
        });
        setContentView(root);
        hideBars();
        open = this;
        load(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        load(intent);
    }

    private int dp(float v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private void load(Intent i) {
        type = i.getStringExtra("type");
        id = i.getStringExtra("id");
        title = i.getStringExtra("title");
        if (id == null) { finish(); return; }
        try {
            queue = new JSONArray(i.getStringExtra("queue") == null ? "[]" : i.getStringExtra("queue"));
        } catch (Exception e) {
            queue = new JSONArray();
        }
        index = 0;
        for (int k = 0; k < queue.length(); k++) {
            JSONObject o = queue.optJSONObject(k);
            if (o != null && id.equals(o.optString("id"))) index = k;
        }
        play();
    }

    private void play() {
        cancelNext();
        web.loadDataWithBaseURL(base(this, type), html(type, id), "text/html", "UTF-8", null);
        titleView.setText(title == null ? "" : title);
        rebuildBar();
        if (listPanel.getVisibility() == View.VISIBLE) fillList();
        Hub.set(this, "player", nowPlaying());
        showControls();
    }

    private JSONObject nowPlaying() {
        try {
            return new JSONObject().put("type", type).put("id", id).put("title", title == null ? "" : title).put("index", index).put("count", queue.length());
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private void step(int d) {
        if (queue.length() <= 1) return;
        index = (index + d + queue.length()) % queue.length();
        JSONObject o = queue.optJSONObject(index);
        if (o == null) return;
        String nid = o.optString("id");
        if ("iptv".equals(o.optString("kind")) || "stream".equals(type)) {
            String u = o.optString("url", "");
            if (!u.isEmpty()) nid = u;
        }
        id = nid;
        title = o.optString("name", o.optString("title"));
        play();
    }

    // ---- auto next (like the site: 3 seconds after the player reports the end) ----

    private void scheduleNext() {
        if (pendingNext != null || queue.length() <= 1) return;
        final int[] left = {3};
        countdown.setVisibility(View.VISIBLE);
        countdown.setText("التالي خلال " + left[0] + " ث · إلغاء");
        pendingNext = new Runnable() {
            @Override
            public void run() {
                left[0]--;
                if (left[0] <= 0) { pendingNext = null; countdown.setVisibility(View.GONE); step(1); return; }
                countdown.setText("التالي خلال " + left[0] + " ث · إلغاء");
                ui.postDelayed(this, 1000);
            }
        };
        ui.postDelayed(pendingNext, 1000);
    }

    private void cancelNext() {
        if (pendingNext != null) ui.removeCallbacks(pendingNext);
        pendingNext = null;
        if (countdown != null) countdown.setVisibility(View.GONE);
    }

    /** Called by the player page. */
    private class Js {
        @JavascriptInterface
        public void ended() { ui.post(PlayerActivity.this::scheduleNext); }

        @JavascriptInterface
        public void resumed() { ui.post(PlayerActivity.this::cancelNext); }
    }

    // ---- the bar ----

    private void showControls() {
        if (controls == null) return;
        controls.setVisibility(View.VISIBLE);
        controls.animate().alpha(1f).setDuration(200).start();
        ui.removeCallbacks(hide);
        ui.postDelayed(hide, expanded ? 8000 : 5000);
    }

    /** The site's lucide icons (24-unit paths), drawn white with round caps. */
    static final String I_X = "M18 6L6 18M6 6L18 18";
    static final String I_PREV = "M9 18L15 12L9 6";   // ChevronRight: "previous" in the RTL bar
    static final String I_NEXT = "M15 18L9 12L15 6";  // ChevronLeft: "next"
    static final String I_LIST = "M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01";
    static final String I_SAVE = "M19 21L12 17L5 21V5A2 2 0 0 1 7 3H17A2 2 0 0 1 19 5Z";
    static final String I_POPUP = "M15 3H21V9M10 14L21 3M18 13V19A2 2 0 0 1 16 21H5A2 2 0 0 1 3 19V8A2 2 0 0 1 5 6H11";
    static final String I_AUDIO = "M3 14H6A2 2 0 0 1 8 16V19A2 2 0 0 1 6 21H5A2 2 0 0 1 3 19V12A9 9 0 0 1 21 12V19A2 2 0 0 1 19 21H18A2 2 0 0 1 16 19V16A2 2 0 0 1 18 14H21";
    static final String I_FILL = "M15 3H21V9M9 21H3V15M21 3L14 10M3 21L10 14";
    static final String I_STAR = "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26Z";

    static Bitmap icon(String path, int px, int color, boolean filled) {
        Bitmap b = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        c.scale(px / 24f, px / 24f);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(color);
        p.setStrokeWidth(2.5f);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setStrokeJoin(Paint.Join.ROUND);
        p.setStyle(filled ? Paint.Style.FILL_AND_STROKE : Paint.Style.STROKE);
        try {
            Path path1 = PathParser.createPathFromPathData(path);
            c.drawPath(path1, p);
        } catch (Exception ignored) {
        }
        return b;
    }

    private static GradientDrawable pill(int color, int ring) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(999);
        if (ring != 0) g.setStroke(3, ring);
        return g;
    }

    /** One round button like the site's ctrlBtnClass (w-14 h-14, glass, the icon stroke 2.5). */
    private ImageView round(String path, int bg, int ring, int fg, boolean filled, Runnable onTap) {
        ImageView t = new ImageView(this);
        t.setImageBitmap(icon(path, dp(26), fg, filled));
        t.setScaleType(ImageView.ScaleType.CENTER);
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        g.setColor(bg);
        if (ring != 0) g.setStroke(dp(2), ring);
        t.setBackground(g);
        t.setOnClickListener(v -> {
            v.animate().scaleX(0.9f).scaleY(0.9f).setDuration(80).withEndAction(() -> v.animate().scaleX(1f).scaleY(1f).setDuration(80).start()).start();
            onTap.run();
            showControls();
        });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(54), dp(54));
        lp.setMargins(dp(4), 0, dp(4), 0);
        t.setLayoutParams(lp);
        return t;
    }

    private LinearLayout buildControls() {
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER_HORIZONTAL);

        // the list panel (the site's horizontal strip of cards above the bar)
        listPanel = new HorizontalScrollView(this);
        listPanel.setHorizontalScrollBarEnabled(false);
        listPanel.setVisibility(View.GONE);
        GradientDrawable lb = new GradientDrawable();
        lb.setColor(0xCC000000);
        lb.setCornerRadius(dp(32));
        lb.setStroke(dp(1), 0x1AFFFFFF);
        listPanel.setBackground(lb);
        LinearLayout.LayoutParams lpl = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(150));
        lpl.setMargins(dp(24), 0, dp(24), dp(12));
        col.addView(listPanel, lpl);

        titleView = new TextView(this);
        titleView.setTextColor(0xE6FFFFFF);
        titleView.setTypeface(Fonts.bold(this));
        titleView.setTextSize(15);
        titleView.setSingleLine(true);
        titleView.setEllipsize(TextUtils.TruncateAt.END);
        titleView.setMaxWidth(dp(520));
        titleView.setShadowLayer(8, 0, 0, Color.BLACK);
        titleView.setPadding(dp(16), 0, dp(16), dp(10));
        col.addView(titleView);

        HorizontalScrollView sc = new HorizontalScrollView(this);
        sc.setHorizontalScrollBarEnabled(false);
        bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        bar.setPadding(dp(6), dp(6), dp(6), dp(6));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0x66000000);
        bg.setCornerRadius(dp(40));
        bg.setStroke(dp(1), 0x1AFFFFFF);
        bar.setBackground(bg);
        sc.addView(bar);
        LinearLayout.LayoutParams sl = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        sl.gravity = Gravity.CENTER_HORIZONTAL;
        col.addView(sc, sl);
        return col;
    }

    private boolean isSaved() {
        JSONArray sv = Cloud.master(this).optJSONArray("savedVideos");
        for (int i = 0; sv != null && i < sv.length(); i++) {
            JSONObject o = sv.optJSONObject(i);
            if (o != null && id.equals(o.optString("id"))) return true;
        }
        return false;
    }

    private boolean isIptv() {
        return "stream".equals(type) || "web".equals(type);
    }

    private void rebuildBar() {
        bar.removeAllViews();
        int glass = 0x26FFFFFF;
        bar.addView(round(I_X, 0x99DC2626, 0x66F87171, Color.WHITE, false, this::finish));
        if (expanded) {
            if (queue.length() > 1) {
                bar.addView(round(I_PREV, glass, 0, Color.WHITE, false, () -> step(-1)));
                bar.addView(round(I_NEXT, glass, 0, Color.WHITE, false, () -> step(1)));
                bar.addView(round(I_LIST, listPanel.getVisibility() == View.VISIBLE ? 0xFF4F46E5 : glass, 0, Color.WHITE, false, this::toggleList));
            }
            if (!isIptv()) {
                boolean saved = isSaved();
                bar.addView(round(I_SAVE, saved ? 0x66F59E0B : glass, 0, saved ? 0xFFFBBF24 : Color.WHITE, saved, this::toggleSave));
            } else {
                boolean fav = Hub.has(this, "iptvFav", id);
                bar.addView(round(I_STAR, fav ? 0xFFEAB308 : glass, 0, fav ? Color.BLACK : Color.WHITE, fav, () -> {
                    Hub.toggle(this, "iptvFav", id);
                    rebuildBar();
                }));
            }
            bar.addView(round(I_POPUP, glass, 0, Color.WHITE, false, () -> switchTo("popup")));
            bar.addView(round(I_AUDIO, glass, 0, 0xFF34D399, false, () -> switchTo("audio")));
            bar.addView(round(I_FILL, fill ? 0xFF2563EB : glass, 0, Color.WHITE, false, this::toggleFill));
        }
        bar.addView(round(expanded ? I_PREV : I_NEXT, 0x33FFFFFF, 0x33FFFFFF, Color.WHITE, false, () -> {
            expanded = !expanded;
            rebuildBar();
        }));
    }

    private void toggleList() {
        if (listPanel.getVisibility() == View.VISIBLE) listPanel.setVisibility(View.GONE);
        else { fillList(); listPanel.setVisibility(View.VISIBLE); }
        rebuildBar();
    }

    private void fillList() {
        listPanel.removeAllViews();
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        row.setPadding(dp(14), dp(14), dp(14), dp(14));
        for (int k = 0; k < queue.length(); k++) {
            JSONObject o = queue.optJSONObject(k);
            if (o == null) continue;
            final int at = k;
            FrameLayout card = new FrameLayout(this);
            GradientDrawable cg = new GradientDrawable();
            cg.setColor(k == index ? 0x334F46E5 : 0x0DFFFFFF);
            cg.setCornerRadius(dp(22));
            cg.setStroke(dp(2), k == index ? 0xFF818CF8 : 0x0DFFFFFF);
            card.setBackground(cg);
            card.setClipToOutline(true);
            ImageView th = new ImageView(this);
            th.setScaleType(ImageView.ScaleType.CENTER_CROP);
            th.setAlpha(0.45f);
            String thumb = o.optString("thumb", o.optString("image", ""));
            if (!thumb.isEmpty()) new Thread(() -> {
                Bitmap bm = Images.get(getApplicationContext(), thumb, dp(220));
                if (bm != null) ui.post(() -> th.setImageBitmap(bm));
            }).start();
            card.addView(th, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
            TextView t = new TextView(this);
            t.setText(o.optString("name", o.optString("title")));
            t.setTextColor(Color.WHITE);
            t.setTypeface(Fonts.black(this));
            t.setTextSize(12);
            t.setMaxLines(2);
            t.setEllipsize(TextUtils.TruncateAt.END);
            t.setShadowLayer(6, 0, 0, Color.BLACK);
            t.setPadding(dp(12), 0, dp(12), dp(10));
            card.addView(t, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM));
            card.setOnClickListener(v -> step(at - index));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(210), LinearLayout.LayoutParams.MATCH_PARENT);
            lp.setMarginEnd(dp(10));
            row.addView(card, lp);
        }
        listPanel.addView(row);
        final int scrollTo = index;
        listPanel.post(() -> {
            View c = row.getChildAt(scrollTo);
            if (c != null) listPanel.smoothScrollTo(c.getLeft() - dp(24), 0);
        });
    }

    /** Save / unsave in the general favourites: the widget list at once, the site through the page (cloud sync). */
    private void toggleSave() {
        boolean was = isSaved();
        try {
            JSONObject master = Cloud.master(this);
            JSONArray sv = master.optJSONArray("savedVideos");
            JSONArray out = new JSONArray();
            if (!was) out.put(new JSONObject().put("kind", "video").put("id", id).put("name", title == null ? "" : title)
                    .put("thumb", "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"));
            for (int i = 0; sv != null && i < sv.length(); i++) {
                JSONObject o = sv.optJSONObject(i);
                if (o != null && !id.equals(o.optString("id"))) out.put(o);
            }
            master.put("savedVideos", out);
            NativeIslandPlugin.prefs(this).edit().putString("cloud_master", master.toString()).apply();
            JSONObject v = new JSONObject().put("id", id).put("title", title == null ? "" : title)
                    .put("thumbnail", "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg").put("saved", !was);
            Hub.send(this, "saveVideo", v.toString());
        } catch (Exception ignored) {
        }
        Toast.makeText(this, was ? "أزيل من المفضلات" : "حُفظ في المفضلات العامة ⭐", Toast.LENGTH_SHORT).show();
        Widgets.updateAll(getApplicationContext());
        rebuildBar();
    }

    /** The site's "fullscreen" button: here, fill the screen (crop) or fit it. */
    private void toggleFill() {
        fill = !fill;
        web.evaluateJavascript("document.body.classList.toggle('fill'," + fill + ")", null);
        rebuildBar();
    }

    /** The player page: YouTube's IFrame API (end / resume reported to DCP), or a stream through hls.js. */
    static String html(String type, String id) {
        String css = "<meta name='viewport' content='width=device-width,initial-scale=1'><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}"
                + "iframe,video{border:0;width:100%;height:100%;background:#000;transition:transform .3s}"
                + "body.fill iframe{transform:scale(1.34)}body.fill video{object-fit:cover}</style>";
        String bridge = "function dcEnd(){if(window.DCP)DCP.ended()}function dcOn(){if(window.DCP)DCP.resumed()}";
        if ("stream".equals(type)) {
            String u = id.replace("'", "%27");
            return "<!doctype html><html><head>" + css
                    + "<script src='https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js'></script></head><body>"
                    + "<video id='v' autoplay playsinline controls></video><script>" + bridge
                    + "var v=document.getElementById('v'),s='" + u + "';"
                    + "if(s.indexOf('.m3u8')<0||v.canPlayType('application/vnd.apple.mpegurl')){v.src=s;}"
                    + "else if(window.Hls&&Hls.isSupported()){var h=new Hls();h.loadSource(s);h.attachMedia(v);}else{v.src=s;}"
                    + "v.addEventListener('ended',dcEnd);v.addEventListener('playing',dcOn);v.play().catch(function(){});"
                    + "window.dcToggle=function(){if(v.paused)v.play();else v.pause();return !v.paused;};</script></body></html>";
        }
        return "<!doctype html><html><head>" + css + "</head><body><div id='p'></div>"
                + "<script src='https://www.youtube.com/iframe_api'></script><script>" + bridge + "var P;"
                + "function onYouTubeIframeAPIReady(){P=new YT.Player('p',{width:'100%',height:'100%',videoId:'" + id.replace("'", "") + "',"
                + "playerVars:{autoplay:1,playsinline:1,rel:0,fs:1,modestbranding:1,iv_load_policy:3,hl:'ar'},"
                + "events:{onReady:function(e){e.target.playVideo();},onStateChange:function(e){if(e.data===0)dcEnd();else if(e.data===1||e.data===3)dcOn();}}});}"
                + "window.dcToggle=function(){if(!P||!P.getPlayerState)return true;if(P.getPlayerState()==1){P.pauseVideo();return false;}P.playVideo();return true;};"
                + "</script></body></html>";
    }

    /** The page's origin: the site's address (YouTube's player refuses pages without one). */
    static String base(android.content.Context ctx, String type) {
        if ("stream".equals(type)) return "http://localhost/";
        return Widgets.json(ctx, "widgets").optString("origin", "https://cplay2.vercel.app") + "/";
    }

    /** Switch to the floating window or to audio only in the island (the list goes along for next / previous). */
    private void switchTo(String mode) {
        Intent s = new Intent(this, IslandService.class).setAction("popup".equals(mode) ? IslandService.POPUP : IslandService.AUDIO)
                .putExtra("type", type).putExtra("id", id).putExtra("title", title).putExtra("queue", queue.toString()).putExtra("index", index);
        try { androidx.core.content.ContextCompat.startForegroundService(this, s); } catch (Exception ignored) { }
        finish();
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
        if (open == this) open = null;
        cancelNext();
        ui.removeCallbacksAndMessages(null);
        if (isFinishing()) Hub.set(this, "player", null);
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
        }
        super.onDestroy();
    }
}
