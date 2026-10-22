package com.drivecast.sovereign;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.service.dreams.DreamService;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Locale;
import java.util.Random;

/**
 * The always-on screen (AOD / lock screen) for the tablet: a big clock, the next prayer counting down, the day with
 * the Gregorian and Hijri dates small; from {@link #ALERT_MIN} minutes before an iqamah it turns green, beeps and
 * counts down to the iqamah. Samsung's own AOD can't show an app's content, so this is a screen shown over the lock
 * screen when the screen goes off (while charging, or always), dim and moving a little every minute against
 * burn-in; also the system's screen saver ("Screen saver" in Display settings).
 */
final class Aod {

    private Aod() {
    }

    static final int ALERT_MIN = 19;
    static final String ALERT = "com.drivecast.AOD_ALERT";
    private static final String CHANNEL = "drivecast_iqamah";

    /** "charging" (default on a tablet) | "always" | "off" (default on a phone) */
    static String mode(Context ctx) {
        boolean tablet = ctx.getResources().getConfiguration().smallestScreenWidthDp >= 600;
        return NativeIslandPlugin.prefs(ctx).getString("aodMode", tablet ? "charging" : "off");
    }

    static void setMode(Context ctx, String m) {
        NativeIslandPlugin.prefs(ctx).edit().putString("aodMode", m).apply();
        schedule(ctx);
    }

    static int alertMinutes(Context ctx) {
        return NativeIslandPlugin.prefs(ctx).getInt("aodAlertMin", ALERT_MIN);
    }

    static boolean charging(Context ctx) {
        Intent b = ctx.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        int st = b != null ? b.getIntExtra(BatteryManager.EXTRA_STATUS, -1) : -1;
        return st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL;
    }

    static boolean wanted(Context ctx) {
        String m = mode(ctx);
        return "always".equals(m) || ("charging".equals(m) && charging(ctx));
    }

    /** when the AOD screen was last seen (a power press while it shows really turns the screen off) */
    static long lastShown = 0;
    static boolean showing = false;

    /** the screen went off: show the AOD screen (not when it was just showing: the press meant "off") */
    static void screenOff(Context ctx) {
        if (!wanted(ctx)) return;
        if (showing || SystemClock.elapsedRealtime() - lastShown < 2500) return;
        start(ctx, false);
    }

    static void start(Context ctx, boolean alert) {
        try {
            Intent i = new Intent(ctx, AodActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    .putExtra("alert", alert);
            ctx.startActivity(i);
        } catch (Exception ignored) {
        }
    }

    // ---- times ----

    /** {title, at, kind} of the next adhan / iqamah after now (from the day's times) */
    static JSONObject next(Context ctx, String kind, long now) {
        JSONArray list = Widgets.dayCountdowns(ctx);
        JSONObject best = null;
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject c = list.optJSONObject(i);
            if (c == null || !kind.equals(c.optString("kind"))) continue;
            long at = c.optLong("at");
            if (at > now && (best == null || at < best.optLong("at"))) best = c;
        }
        return best;
    }

    /** A wake-up {minutes} before the next iqamah (and one at the iqamah itself). */
    static void schedule(Context ctx) {
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            Intent i = new Intent(ctx, AodReceiver.class).setAction(ALERT);
            PendingIntent pi = PendingIntent.getBroadcast(ctx, 9100, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            am.cancel(pi);
            if ("off".equals(mode(ctx)) && !NativeIslandPlugin.prefs(ctx).getBoolean("iqamahAlert", true)) return;
            long now = System.currentTimeMillis(), lead = alertMinutes(ctx) * 60_000L;
            JSONArray list = Widgets.dayCountdowns(ctx);
            long when = 0;
            for (int k = 0; list != null && k < list.length(); k++) {
                JSONObject c = list.optJSONObject(k);
                if (c == null || !"iqamah".equals(c.optString("kind"))) continue;
                long t = c.optLong("at") - lead;
                if (t > now + 5_000 && (when == 0 || t < when)) when = t;
            }
            if (when == 0) return;
            boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
        } catch (Exception ignored) {
        }
    }

    /** The iqamah is near: a notification counting down, a beep, and the AOD screen when the screen is off. */
    static void alert(Context ctx) {
        long now = System.currentTimeMillis();
        JSONObject iq = next(ctx, "iqamah", now);
        schedule(ctx);
        if (iq == null || iq.optLong("at") - now > (alertMinutes(ctx) + 1) * 60_000L) return;
        String title = iq.optString("title");
        if (!title.contains("إقامة")) title = "إقامة " + title;
        try {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
                NotificationChannel ch = new NotificationChannel(CHANNEL, "اقتراب الإقامة", NotificationManager.IMPORTANCE_HIGH);
                ch.enableVibration(true);
                nm.createNotificationChannel(ch);
            }
            PendingIntent open = PendingIntent.getActivity(ctx, 9101, new Intent(ctx, AodActivity.class).putExtra("alert", true)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title + " بعد " + Math.max(1, Math.round((iq.optLong("at") - now) / 60_000.0)) + " دقيقة")
                    .setContentText("الإقامة · " + Art.to12h(new java.text.SimpleDateFormat("H:mm", Locale.ROOT).format(new java.util.Date(iq.optLong("at")))))
                    .setWhen(iq.optLong("at"))
                    .setShowWhen(true)
                    .setUsesChronometer(true)
                    .setTimeoutAfter(Math.max(60_000L, iq.optLong("at") - now + 60_000L))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_REMINDER)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setContentIntent(open)
                    .setAutoCancel(true);
            if (Build.VERSION.SDK_INT >= 24) b.setChronometerCountDown(true);
            nm.notify(9102, b.build());
        } catch (Exception ignored) {
        }
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        if (!"off".equals(mode(ctx)) && (pm == null || !pm.isInteractive())) start(ctx, true);
    }

    static void beep(Context ctx, boolean strong) {
        try {
            ToneGenerator tg = new ToneGenerator(AudioManager.STREAM_NOTIFICATION, 90);
            tg.startTone(strong ? ToneGenerator.TONE_PROP_BEEP2 : ToneGenerator.TONE_PROP_BEEP, strong ? 600 : 250);
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(tg::release, 1200);
        } catch (Exception ignored) {
        }
        try {
            Vibrator v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null && Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(strong ? new long[]{0, 300, 150, 300} : new long[]{0, 200}, -1));
        } catch (Exception ignored) {
        }
    }

    // ---- the screen itself ----

    /** The AOD picture: drawn every second, dim, moving a little every minute. */
    static final class AodView extends View {
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Random rnd = new Random();
        private float dx, dy;
        private long movedAt;
        private boolean alertBeeped, zeroBeeped;
        private long alertFor; // the iqamah the beep was for
        Runnable onAlertChange;
        boolean alertMode;

        private static final String[] DAYS = {"الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"};
        private static final String[] GREG = {"يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"};
        private static final int BLUE = Color.rgb(0, 128, 255), GREEN = Color.rgb(52, 211, 153);

        AodView(Context c) {
            super(c);
            setBackgroundColor(Color.BLACK);
            p.setTextAlign(Paint.Align.CENTER);
        }

        private final Runnable tick = new Runnable() {
            @Override
            public void run() {
                invalidate();
                postDelayed(this, 1000 - (System.currentTimeMillis() % 1000) + 5);
            }
        };

        @Override
        protected void onAttachedToWindow() {
            super.onAttachedToWindow();
            post(tick);
        }

        @Override
        protected void onDetachedFromWindow() {
            removeCallbacks(tick);
            super.onDetachedFromWindow();
        }

        private float text(Canvas c, String s, float x, float y, float size, int color, android.graphics.Typeface tf) {
            p.setTypeface(tf);
            p.setTextSize(size);
            p.setColor(color);
            c.drawText(s, x, y, p);
            return p.measureText(s);
        }

        @Override
        protected void onDraw(Canvas c) {
            Context ctx = getContext();
            int w = getWidth(), h = getHeight();
            float u = Math.min(w, h);
            long now = System.currentTimeMillis();
            // against burn-in: everything moves a little every minute
            if (now - movedAt > 60_000L) {
                movedAt = now;
                dx = (rnd.nextFloat() - 0.5f) * u * 0.08f;
                dy = (rnd.nextFloat() - 0.5f) * u * 0.06f;
            }
            float cx = w / 2f + dx, cy = h / 2f + dy;

            JSONObject azan = next(ctx, "azan", now), iq = next(ctx, "iqamah", now);
            long lead = alertMinutes(ctx) * 60_000L;
            long iqAt = iq != null ? iq.optLong("at") : 0;
            boolean alert = iqAt > now && iqAt - now <= lead;
            if (alert != alertMode) {
                alertMode = alert;
                if (onAlertChange != null) onAlertChange.run();
            }
            if (alert && (alertFor != iqAt || !alertBeeped)) {
                alertFor = iqAt;
                alertBeeped = true;
                zeroBeeped = false;
                beep(ctx, true);
            }
            if (alert && !zeroBeeped && iqAt - now <= 1000) {
                zeroBeeped = true;
                beep(ctx, true);
            }

            Calendar g = Calendar.getInstance();
            int h12 = g.get(Calendar.HOUR) == 0 ? 12 : g.get(Calendar.HOUR);
            String clock = h12 + ":" + String.format(Locale.ROOT, "%02d", g.get(Calendar.MINUTE));
            int dim = alert ? 0xFFFFFFFF : 0xFFD8D8D8;

            // the big clock
            float clockSize = u * (alert ? 0.30f : 0.38f);
            float clockY = cy - u * (alert ? 0.10f : 0.05f);
            text(c, clock, cx, clockY, clockSize, dim, Fonts.black(ctx));

            // the day · Gregorian date · Hijri date (small)
            int[] hj = Widgets.hijri(now);
            String date = DAYS[g.get(Calendar.DAY_OF_WEEK) - 1] + "  ·  " + g.get(Calendar.DAY_OF_MONTH) + " " + GREG[g.get(Calendar.MONTH)] + " " + g.get(Calendar.YEAR)
                    + "  ·  " + hj[0] + " " + Widgets.HIJRI_MONTHS[Math.max(0, Math.min(11, hj[1]))] + " " + hj[2] + " هـ";
            text(c, date, cx, clockY + u * 0.08f, u * 0.035f, 0x99FFFFFF, Fonts.bold(ctx));

            if (alert) {
                // the iqamah: a green countdown with a ring emptying over the last minutes
                String title = iq.optString("title");
                if (!title.contains("إقامة")) title = "إقامة " + title;
                long left = Math.max(0, (iqAt - now + 999) / 1000);
                float ry = clockY + u * 0.30f, r = u * 0.13f;
                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(u * 0.012f);
                p.setColor(0x33FFFFFF);
                c.drawCircle(cx, ry, r, p);
                p.setColor(GREEN);
                p.setStrokeCap(Paint.Cap.ROUND);
                float frac = Math.min(1f, left * 1000f / lead);
                c.drawArc(new RectF(cx - r, ry - r, cx + r, ry + r), -90, 360 * frac, false, p);
                p.setStyle(Paint.Style.FILL);
                // a soft pulse
                float pulse = 0.55f + 0.45f * (float) Math.abs(Math.sin(now / 600.0));
                p.setAlpha(255);
                text(c, String.format(Locale.ROOT, "%d:%02d", left / 60, left % 60), cx, ry + u * 0.04f, u * 0.11f,
                        Color.argb((int) (255 * pulse), 52, 211, 153), Fonts.black(ctx));
                text(c, title + " بعد", cx, ry - r - u * 0.04f, u * 0.055f, GREEN, Fonts.black(ctx));
            } else if (azan != null) {
                // the next adhan, counting down
                long left = Math.max(0, (azan.optLong("at") - now) / 1000);
                String cd = left >= 3600 ? String.format(Locale.ROOT, "%d:%02d:%02d", left / 3600, (left / 60) % 60, left % 60)
                        : String.format(Locale.ROOT, "%d:%02d", left / 60, left % 60);
                String at = Art.to12h(new java.text.SimpleDateFormat("H:mm", Locale.ROOT).format(new java.util.Date(azan.optLong("at"))));
                float y = clockY + u * 0.22f;
                text(c, azan.optString("title") + "  ·  الأذان " + at, cx, y, u * 0.05f, 0xCCFFFFFF, Fonts.bold(ctx));
                text(c, cd, cx, y + u * 0.11f, u * 0.10f, BLUE, Fonts.black(ctx));
                if (iqAt > 0) {
                    String iqt = Art.to12h(new java.text.SimpleDateFormat("H:mm", Locale.ROOT).format(new java.util.Date(iqAt)));
                    text(c, "الإقامة " + iqt, cx, y + u * 0.17f, u * 0.032f, 0x77FFFFFF, Fonts.medium(ctx));
                }
            }
        }
    }

    /** The AOD screen over the lock screen. A tap closes it, a long press changes when it shows. */
    public static final class AodActivity extends Activity {
        private AodView view;

        @Override
        protected void onCreate(Bundle b) {
            super.onCreate(b);
            if (Build.VERSION.SDK_INT >= 27) {
                setShowWhenLocked(true);
                setTurnScreenOn(true);
            } else {
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
            }
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
            view = new AodView(this);
            view.onAlertChange = this::brightness;
            setContentView(view);
            view.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
            GestureDetector gd = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
                @Override
                public boolean onSingleTapConfirmed(MotionEvent e) {
                    close();
                    return true;
                }

                @Override
                public void onLongPress(MotionEvent e) {
                    String m = mode(AodActivity.this);
                    String next = "charging".equals(m) ? "always" : "always".equals(m) ? "off" : "charging";
                    setMode(AodActivity.this, next);
                    Toast.makeText(AodActivity.this, "الشاشة الدائمة: " + ("charging".equals(next) ? "عند الشحن" : "always".equals(next) ? "دائماً" : "مطفأة"), Toast.LENGTH_LONG).show();
                }
            });
            view.setOnTouchListener((v, e) -> gd.onTouchEvent(e));
            brightness();
        }

        private void close() {
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (km != null && km.isKeyguardLocked() && Build.VERSION.SDK_INT >= 26) km.requestDismissKeyguard(this, null);
            finish();
        }

        /** dim normally (like AOD), brighter while the iqamah counts down */
        private void brightness() {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.screenBrightness = view != null && view.alertMode ? 0.55f : 0.08f;
            getWindow().setAttributes(lp);
        }

        @Override
        protected void onResume() {
            super.onResume();
            showing = true;
        }

        @Override
        protected void onPause() {
            showing = false;
            lastShown = SystemClock.elapsedRealtime();
            super.onPause();
        }

        @Override
        protected void onStop() {
            super.onStop();
            // the screen went off with the power key, or another app opened: done (the next screen-off brings it back)
            finish();
        }
    }

    /** The same picture as the system's screen saver (Settings → Display → Screen saver). */
    public static final class AodDream extends DreamService {
        @Override
        public void onAttachedToWindow() {
            super.onAttachedToWindow();
            setInteractive(false);
            setFullscreen(true);
            setScreenBright(false);
            setContentView(new AodView(this));
        }
    }

    /** the iqamah wake-up, and a restart of the schedule */
    public static final class AodReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context ctx, Intent i) {
            if (ALERT.equals(i.getAction())) alert(ctx);
            else schedule(ctx);
        }
    }

    /** screen off / power connected while the app runs (registered by the island service) */
    static BroadcastReceiver screenReceiver() {
        return new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent i) {
                if (Intent.ACTION_SCREEN_OFF.equals(i.getAction())) screenOff(ctx);
                schedule(ctx);
            }
        };
    }

    static SharedPreferences prefs(Context ctx) {
        return NativeIslandPlugin.prefs(ctx);
    }
}
