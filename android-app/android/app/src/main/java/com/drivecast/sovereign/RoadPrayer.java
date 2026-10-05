package com.drivecast.sovereign;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * "Prayer on the road": while driving near a prayer (from 15 minutes before the adhan until the iqamah), the mosques
 * ahead on the way (OpenStreetMap, the ones you are heading towards — not behind) with the distance, the arrival
 * time and whether you will make the iqamah: green (before), yellow (a few minutes late), red (too late — the next one
 * on the way is suggested). Location is only listened to in that window, so the battery isn't used the rest of the day.
 */
final class RoadPrayer {

    static final class Mosque {
        String name;
        double lat, lon;
        float meters;
        long eta;      // ms from now
        int state;     // 0 green, 1 yellow, 2 red
    }

    private final Context ctx;
    private LocationManager lm;
    private boolean listening = false;
    private Location last;
    private long lastMoving = 0;
    private final List<JSONObject> cache = new ArrayList<>();
    private double cacheLat, cacheLon;
    private long cacheAt = 0;
    private boolean loading = false;
    private final Runnable changed;

    RoadPrayer(Context ctx, Runnable changed) {
        this.ctx = ctx.getApplicationContext();
        this.changed = changed;
    }

    private final LocationListener listener = new LocationListener() {
        @Override
        public void onLocationChanged(Location l) {
            if (last != null && !l.hasSpeed()) {
                float d = last.distanceTo(l);
                long dt = Math.max(1, l.getTime() - last.getTime());
                if (d / (dt / 1000f) > 5) lastMoving = System.currentTimeMillis();
            }
            if (l.hasSpeed() && l.getSpeed() > 5) lastMoving = System.currentTimeMillis(); // > 18 km/h
            if (last == null || l.getAccuracy() < 200) {
                if (last != null && !l.hasBearing() && last.distanceTo(l) > 30) l.setBearing(last.bearingTo(l));
                last = l;
            }
            maybeLoad();
            changed.run();
        }

        @Override public void onStatusChanged(String p, int s, Bundle b) { }
        @Override public void onProviderEnabled(String p) { }
        @Override public void onProviderDisabled(String p) { }
    };

    static boolean permitted(Context ctx) {
        return Build.VERSION.SDK_INT < 23 || ctx.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || ctx.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    /** Listen only when needed (called every second by the service). */
    @SuppressLint("MissingPermission")
    void setActive(boolean on) {
        if (on == listening) return;
        if (on && (!permitted(ctx) || !Hub.bool(ctx, "roadPrayer", true))) return;
        if (lm == null) lm = (LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) return;
        try {
            if (on) {
                for (String p : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER}) {
                    if (lm.isProviderEnabled(p)) lm.requestLocationUpdates(p, 5_000, 20, listener, Looper.getMainLooper());
                    Location k = lm.getLastKnownLocation(p);
                    if (k != null && (last == null || k.getTime() > last.getTime())) last = k;
                }
            } else {
                lm.removeUpdates(listener);
            }
            listening = on;
            if (on) maybeLoad();
        } catch (Exception ignored) {
        }
    }

    boolean hasFix() {
        return last != null;
    }

    boolean searching() {
        return loading || (last != null && cacheAt == 0);
    }

    boolean failed() {
        return lastFailed;
    }

    private boolean lastFailed = false;

    boolean driving() {
        return System.currentTimeMillis() - lastMoving < 3 * 60_000L || Hub.bool(ctx, "roadPrayerAlways", false);
    }

    /** The mosques of OpenStreetMap within 6 km (again after moving 3 km or after 20 minutes). */
    private void maybeLoad() {
        if (last == null || loading) return;
        float[] d = new float[1];
        if (cacheAt > 0) Location.distanceBetween(cacheLat, cacheLon, last.getLatitude(), last.getLongitude(), d);
        if (cacheAt > 0 && d[0] < 3000 && System.currentTimeMillis() - cacheAt < 20 * 60_000L) return;
        loading = true;
        final double lat = last.getLatitude(), lon = last.getLongitude();
        new Thread(() -> {
            List<JSONObject> got = new ArrayList<>();
            try {
                String q = "[out:json][timeout:20];nwr[\"amenity\"=\"place_of_worship\"][\"religion\"=\"muslim\"](around:6000," + lat + "," + lon + ");out center 60;";
                StringBuilder sb = null;
                // the main Overpass server, then mirrors
                for (String host : new String[]{"https://overpass-api.de", "https://overpass.kumi.systems", "https://overpass.private.coffee"}) {
                    try {
                        HttpURLConnection c = (HttpURLConnection) new URL(host + "/api/interpreter?data=" + URLEncoder.encode(q, "UTF-8")).openConnection();
                        c.setConnectTimeout(12_000);
                        c.setReadTimeout(25_000);
                        c.setRequestProperty("User-Agent", "DriveCast/1.0");
                        StringBuilder b = new StringBuilder();
                        try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
                            String line;
                            while ((line = r.readLine()) != null) b.append(line);
                        }
                        sb = b;
                        break;
                    } catch (Exception ignored) {
                    }
                }
                if (sb == null) throw new Exception("overpass");
                JSONArray els = new JSONObject(sb.toString()).optJSONArray("elements");
                for (int i = 0; els != null && i < els.length(); i++) {
                    JSONObject e = els.optJSONObject(i);
                    if (e == null) continue;
                    JSONObject center = e.optJSONObject("center");
                    double la = e.has("lat") ? e.optDouble("lat") : center != null ? center.optDouble("lat") : Double.NaN;
                    double lo = e.has("lon") ? e.optDouble("lon") : center != null ? center.optDouble("lon") : Double.NaN;
                    if (Double.isNaN(la) || Double.isNaN(lo)) continue;
                    JSONObject tags = e.optJSONObject("tags");
                    String name = tags != null ? tags.optString("name:ar", tags.optString("name", "")) : "";
                    got.add(new JSONObject().put("name", name.isEmpty() ? "مسجد" : name).put("lat", la).put("lon", lo));
                }
                synchronized (cache) {
                    cache.clear();
                    cache.addAll(got);
                    cacheLat = lat;
                    cacheLon = lon;
                    cacheAt = System.currentTimeMillis();
                }
                lastFailed = false;
            } catch (Exception ignored) {
                lastFailed = true;
                cacheAt = System.currentTimeMillis() - 15 * 60_000L; // try again in 5 minutes
                cacheLat = lat;
                cacheLon = lon;
            }
            loading = false;
            changed.run();
        }).start();
    }

    /**
     * The mosques ahead (within 70° of the heading when moving), nearest first, with the arrival time (road distance
     * taken as 1.35 × straight line, at the current speed, at least 30 km/h in town) against the iqamah.
     */
    List<Mosque> ahead(long iqamahAt) {
        List<Mosque> out = new ArrayList<>();
        if (last == null) return out;
        float speed = last.hasSpeed() && last.getSpeed() > 3 ? last.getSpeed() : 8.3f;
        boolean heading = last.hasBearing() && last.hasSpeed() && last.getSpeed() > 3;
        long now = System.currentTimeMillis();
        synchronized (cache) {
            for (JSONObject o : cache) {
                Location m = new Location("osm");
                m.setLatitude(o.optDouble("lat"));
                m.setLongitude(o.optDouble("lon"));
                float dist = last.distanceTo(m);
                if (heading && dist > 400) {
                    float diff = Math.abs(((last.bearingTo(m) - last.getBearing()) + 540) % 360 - 180);
                    if (diff > 70) continue; // behind or to the side: a long way round
                }
                Mosque q = new Mosque();
                q.name = o.optString("name");
                q.lat = m.getLatitude();
                q.lon = m.getLongitude();
                q.meters = dist;
                q.eta = (long) (dist * 1.35f / speed * 1000) + 2 * 60_000L; // + parking and wudu
                long late = now + q.eta - iqamahAt;
                q.state = late <= 0 ? 0 : late <= 5 * 60_000L ? 1 : 2;
                out.add(q);
            }
        }
        Collections.sort(out, (a, b) -> {
            if (a.state != b.state && (a.state == 2 || b.state == 2)) return a.state == 2 ? 1 : -1; // reachable ones first
            return Float.compare(a.meters, b.meters);
        });
        return out.size() > 5 ? new ArrayList<>(out.subList(0, 5)) : out;
    }

    static String distanceText(float m) {
        return m < 1000 ? Math.round(m / 10f) * 10 + " م" : String.format(java.util.Locale.ROOT, "%.1f كم", m / 1000f);
    }
}
