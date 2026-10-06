package com.drivecast.sovereign;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/**
 * A trip ("رحلتي إلى صلالة", or a weekly trip from the settings): the driving route (Google Routes), then for each
 * prayer that falls during the drive, where you will be at its time and the nearest mosque there (Google Places,
 * OpenStreetMap when Google refuses). Kept in the shared state ("trip"), shown as an island and read aloud.
 * Saved places ("places": home / work) and weekly trips ("weeklyTrips") come from the settings or the voice.
 */
final class Trip {

    private Trip() {
    }

    static JSONObject current(Context ctx) {
        Object t = Hub.get(ctx, "trip");
        if (!(t instanceof JSONObject)) return null;
        JSONObject j = (JSONObject) t;
        long end = j.optLong("startAt") + j.optLong("seconds") * 1000L + 30 * 60_000L;
        return System.currentTimeMillis() < end ? j : null;
    }

    static void stop(Context ctx) {
        Hub.set(ctx, "trip", null);
    }

    /** The phone's last known position (null without permission / fix). */
    static Location here(Context ctx) {
        if (Build.VERSION.SDK_INT >= 23 && ctx.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && ctx.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) return null;
        LocationManager lm = (LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
        Location best = null;
        if (lm == null) return null;
        for (String p : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER}) {
            try {
                @SuppressWarnings("MissingPermission") Location l = lm.getLastKnownLocation(p);
                if (l != null && (best == null || l.getTime() > best.getTime())) best = l;
            } catch (Exception ignored) {
            }
        }
        return best;
    }

    /** "home" / "work" / any words: where to. {name, lat, lon} or null. */
    static JSONObject resolve(Context ctx, String dest, Location from) {
        Object pl = Hub.get(ctx, "places");
        JSONObject places = pl instanceof JSONObject ? (JSONObject) pl : new JSONObject();
        JSONObject saved = places.optJSONObject(dest);
        if (saved != null) {
            if (saved.has("lat")) return saved;
            if (!saved.optString("text").isEmpty()) {
                JSONObject f = GMaps.find(saved.optString("text"), from != null ? from.getLatitude() : 0, from != null ? from.getLongitude() : 0);
                if (f != null) {
                    // remember the coordinates of a typed address
                    try {
                        saved.put("lat", f.optDouble("lat")).put("lon", f.optDouble("lon"));
                        places.put(dest, saved);
                        Hub.set(ctx, "places", places);
                    } catch (Exception ignored) {
                    }
                    return saved;
                }
            }
            return null;
        }
        return GMaps.find(dest, from != null ? from.getLatitude() : 0, from != null ? from.getLongitude() : 0);
    }

    static String placeName(String key) {
        return "home".equals(key) ? "البيت" : "work".equals(key) ? "العمل" : key;
    }

    /** Save where the phone is now as "home" / "work". */
    static boolean saveHere(Context ctx, String key) {
        Location l = here(ctx);
        if (l == null) return false;
        Object pl = Hub.get(ctx, "places");
        JSONObject places = pl instanceof JSONObject ? (JSONObject) pl : new JSONObject();
        try {
            places.put(key, new JSONObject().put("name", placeName(key)).put("lat", l.getLatitude()).put("lon", l.getLongitude()));
        } catch (Exception ignored) {
        }
        Hub.set(ctx, "places", places);
        return true;
    }

    /**
     * Plan a trip (blocking: call on a thread). Returns the sentence to read, or why it failed.
     */
    static String start(Context ctx, String dest) {
        Location from = here(ctx);
        if (from == null) return "لا أعرف موقعك الآن - فعّل الموقع";
        JSONObject to = resolve(ctx, dest, from);
        if (to == null) return "لم أجد «" + placeName(dest) + "»" + (GMaps.lastError.isEmpty() ? "" : " (" + GMaps.lastError + ")")
                + ("home".equals(dest) || "work".equals(dest) ? " - احفظه من الإعدادات أو قل: احفظ موقعي " + placeName(dest) : "");
        JSONObject route = GMaps.route(from.getLatitude(), from.getLongitude(), to.optDouble("lat"), to.optDouble("lon"));
        long now = System.currentTimeMillis();
        long seconds;
        List<double[]> pts = new ArrayList<>();
        if (route != null) {
            seconds = route.optLong("seconds");
            JSONArray p = route.optJSONArray("points");
            for (int i = 0; p != null && i < p.length(); i++) pts.add(new double[]{p.optJSONArray(i).optDouble(0), p.optJSONArray(i).optDouble(1)});
        } else {
            // no route from Google: a straight line at 80 km/h (the mosques are still looked up on the way)
            float[] d = new float[1];
            Location.distanceBetween(from.getLatitude(), from.getLongitude(), to.optDouble("lat"), to.optDouble("lon"), d);
            seconds = (long) (d[0] * 1.3f / 22f);
            for (int i = 0; i <= 20; i++) {
                double f = i / 20.0;
                pts.add(new double[]{from.getLatitude() + (to.optDouble("lat") - from.getLatitude()) * f, from.getLongitude() + (to.optDouble("lon") - from.getLongitude()) * f});
            }
        }
        // cumulative distance along the route
        double[] cum = new double[pts.size()];
        float[] seg = new float[1];
        for (int i = 1; i < pts.size(); i++) {
            Location.distanceBetween(pts.get(i - 1)[0], pts.get(i - 1)[1], pts.get(i)[0], pts.get(i)[1], seg);
            cum[i] = cum[i - 1] + seg[0];
        }
        double total = pts.isEmpty() ? 0 : cum[pts.size() - 1];
        // the prayers during the drive (and the one right after arriving)
        JSONArray plan = new JSONArray();
        JSONArray list = Widgets.dayCountdowns(ctx);
        long arrive = now + seconds * 1000L;
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject c = list.optJSONObject(i);
            if (c == null || !"azan".equals(c.optString("kind"))) continue;
            String title = c.optString("title");
            if (title.contains("الشروق") || title.contains("الضحى")) continue;
            long at = c.optLong("at");
            if (at < now - 10 * 60_000L || at > arrive + 20 * 60_000L) continue;
            try {
                JSONObject row = new JSONObject().put("prayer", title).put("at", at);
                if (at >= arrive) {
                    row.put("after", true);
                } else {
                    double f = seconds <= 0 ? 0 : Math.max(0, (at - now) / (seconds * 1000.0));
                    double target = total * f;
                    int k = 0;
                    while (k < cum.length - 1 && cum[k] < target) k++;
                    double[] p = pts.isEmpty() ? new double[]{from.getLatitude(), from.getLongitude()} : pts.get(k);
                    row.put("km", Math.round(target / 1000)).put("lat", p[0]).put("lon", p[1]);
                    List<JSONObject> ms = GMaps.mosquesNear(p[0], p[1], 6000);
                    if (ms == null || ms.isEmpty()) ms = RoadPrayer.osmMosques(p[0], p[1], 6000);
                    if (ms != null && !ms.isEmpty()) {
                        // the nearest to that point of the road
                        JSONObject best = null;
                        float bd = Float.MAX_VALUE;
                        for (JSONObject m : ms) {
                            float[] dd = new float[1];
                            Location.distanceBetween(p[0], p[1], m.optDouble("lat"), m.optDouble("lon"), dd);
                            if (dd[0] < bd) { bd = dd[0]; best = m; }
                        }
                        row.put("mosque", best).put("off", Math.round(bd));
                    }
                }
                plan.put(row);
            } catch (Exception ignored) {
            }
        }
        JSONObject t = new JSONObject();
        try {
            t.put("name", to.optString("name", placeName(dest))).put("dest", dest).put("toLat", to.optDouble("lat")).put("toLon", to.optDouble("lon"))
                    .put("startAt", now).put("seconds", seconds).put("meters", Math.round(total)).put("plan", plan).put("google", route != null);
        } catch (Exception ignored) {
        }
        Hub.set(ctx, "trip", t);
        return summary(t);
    }

    /** "رحلتك إلى صلالة: ساعتان و10 دقائق. العصر 3:15 عند الكيلو 85: مسجد ..." */
    static String summary(JSONObject t) {
        StringBuilder sb = new StringBuilder("رحلتك إلى " + placeName(t.optString("name")) + ": " + duration(t.optLong("seconds")) + "، " + Math.round(t.optLong("meters") / 1000.0) + " كيلو.");
        JSONArray plan = t.optJSONArray("plan");
        if (plan == null || plan.length() == 0) sb.append(" لا صلاة أثناء الطريق.");
        for (int i = 0; plan != null && i < plan.length(); i++) {
            JSONObject r = plan.optJSONObject(i);
            sb.append(" ").append(r.optString("prayer")).append(" الساعة ").append(clock(r.optLong("at")));
            if (r.optBoolean("after")) sb.append(" بعد وصولك.");
            else if (r.optJSONObject("mosque") != null) sb.append(" عند الكيلو ").append(r.optLong("km")).append("، أقرب مسجد: ").append(r.optJSONObject("mosque").optString("name")).append(".");
            else sb.append(" عند الكيلو ").append(r.optLong("km")).append(".");
        }
        return sb.toString();
    }

    static String clock(long at) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(at);
        int h = c.get(Calendar.HOUR) == 0 ? 12 : c.get(Calendar.HOUR);
        return h + ":" + String.format(Locale.ROOT, "%02d", c.get(Calendar.MINUTE));
    }

    static String duration(long s) {
        long m = Math.max(1, s / 60);
        if (m < 60) return m + " دقيقة";
        return (m / 60) + " ساعة" + (m % 60 > 0 ? " و" + (m % 60) + " دقيقة" : "");
    }

    /** The weekly trips: started by themselves near their time (once a day each). Call every minute (off the main thread). */
    static String autoWeekly(Context ctx) {
        Object w = Hub.get(ctx, "weeklyTrips");
        if (!(w instanceof JSONArray) || current(ctx) != null) return null;
        Calendar c = Calendar.getInstance();
        int dow = c.get(Calendar.DAY_OF_WEEK) - 1; // 0 = Sunday, like the site
        int nowMin = c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE);
        String today = Cloud.day(System.currentTimeMillis());
        JSONArray list = (JSONArray) w;
        for (int i = 0; i < list.length(); i++) {
            JSONObject t = list.optJSONObject(i);
            if (t == null || t.optBoolean("off")) continue;
            JSONArray days = t.optJSONArray("days");
            boolean on = false;
            for (int k = 0; days != null && k < days.length(); k++) if (days.optInt(k) == dow) on = true;
            if (!on) continue;
            String[] hm = t.optString("time", "").split(":");
            if (hm.length < 2) continue;
            int at;
            try {
                at = Integer.parseInt(hm[0].trim()) * 60 + Integer.parseInt(hm[1].trim());
            } catch (Exception e) {
                continue;
            }
            if (nowMin < at - 5 || nowMin > at + 20) continue;
            String key = "tripDone:" + today;
            String id = t.optString("id", String.valueOf(i));
            if (Hub.has(ctx, key, id)) continue;
            Hub.toggle(ctx, key, id);
            return start(ctx, t.optString("to", "work"));
        }
        return null;
    }
}
