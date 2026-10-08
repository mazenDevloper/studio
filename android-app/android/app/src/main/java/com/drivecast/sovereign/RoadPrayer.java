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
                // each provider on its own: "approximate location only" refuses the GPS but allows the others
                int ok = 0;
                for (String p : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER}) {
                    try {
                        Location k = lm.getLastKnownLocation(p);
                        if (k != null && (last == null || k.getTime() > last.getTime())) last = k;
                        if (lm.isProviderEnabled(p)) { lm.requestLocationUpdates(p, 5_000, 20, listener, Looper.getMainLooper()); ok++; }
                    } catch (Exception ignored) {
                    }
                }
                status = ok == 0 ? "خدمة الموقع مغلقة في الجهاز" : "";
            } else {
                lm.removeUpdates(listener);
            }
            listening = on;
            if (on) maybeLoad();
        } catch (Exception ignored) {
        }
    }

    /** what went wrong last (shown in the island's panel) */
    String status = "";
    /** where the mosques came from */
    String source = "";
    static String osmError = "";

    /** OpenStreetMap mosques around a point (Overpass, mirrors, then Nominatim); null when all failed (osmError). */
    static List<JSONObject> osmMosques(double lat, double lon, int radius) {
        List<JSONObject> got = new ArrayList<>();
        String why = "";
        String q = "[out:json][timeout:15];(nwr[\"amenity\"=\"place_of_worship\"](around:" + radius + "," + lat + "," + lon + ");"
                + "nwr[\"building\"=\"mosque\"](around:" + radius + "," + lat + "," + lon + "););out center 80;";
        boolean ok = false;
        for (String host : new String[]{"https://overpass-api.de", "https://overpass.kumi.systems", "https://overpass.private.coffee"}) {
            try {
                JSONArray els = new JSONObject(get(host + "/api/interpreter?data=" + URLEncoder.encode(q, "UTF-8"))).optJSONArray("elements");
                for (int i = 0; els != null && i < els.length(); i++) {
                    JSONObject e = els.optJSONObject(i);
                    if (e == null) continue;
                    JSONObject tags = e.optJSONObject("tags");
                    String rel = tags != null ? tags.optString("religion", "") : "";
                    if (!rel.isEmpty() && !"muslim".equals(rel)) continue;
                    JSONObject center = e.optJSONObject("center");
                    double la = e.has("lat") ? e.optDouble("lat") : center != null ? center.optDouble("lat") : Double.NaN;
                    double lo = e.has("lon") ? e.optDouble("lon") : center != null ? center.optDouble("lon") : Double.NaN;
                    if (Double.isNaN(la) || Double.isNaN(lo)) continue;
                    String name = tags != null ? tags.optString("name:ar", tags.optString("name", "")) : "";
                    got.add(new JSONObject().put("name", name.isEmpty() ? "مسجد" : name).put("lat", la).put("lon", lo));
                }
                ok = true;
                break;
            } catch (Exception ex) {
                why = "Overpass: " + ex.getClass().getSimpleName() + " " + (ex.getMessage() == null ? "" : ex.getMessage());
            }
        }
        if (got.isEmpty()) {
            double dl = radius / 100_000.0;
            String box = (lon - dl) + "," + (lat + dl) + "," + (lon + dl) + "," + (lat - dl);
            for (String term : new String[]{"mosque", "مسجد", "جامع"}) {
                try {
                    JSONArray arr = new JSONArray(get("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=40&bounded=1&viewbox=" + box
                            + "&q=" + URLEncoder.encode(term, "UTF-8") + "&accept-language=ar"));
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject e = arr.optJSONObject(i);
                        if (e == null) continue;
                        String name = e.optString("name", "");
                        if (name.isEmpty()) name = e.optString("display_name", "مسجد").split(",")[0];
                        got.add(new JSONObject().put("name", name).put("lat", e.optDouble("lat")).put("lon", e.optDouble("lon")));
                    }
                    ok = true;
                } catch (Exception ex) {
                    why = (why.isEmpty() ? "" : why + " · ") + "Nominatim: " + ex.getClass().getSimpleName();
                }
                if (!got.isEmpty()) break;
            }
        }
        osmError = why;
        return ok ? got : null;
    }

    android.location.Location location() {
        return last;
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
            String why = "";
            // 1) Google Maps (the site's key), 2) OpenStreetMap when Google refuses or finds nothing
            List<JSONObject> got = GMaps.mosques(ctx, lat, lon, 6000);
            if (got == null || got.isEmpty()) {
                String g = got == null ? "Google: " + GMaps.lastError : "";
                got = osmMosques(lat, lon, 6000);
                if (got == null) { got = new ArrayList<>(); why = (g.isEmpty() ? "" : g + " · ") + osmError; }
                else source = "OpenStreetMap" + (g.isEmpty() ? "" : " (" + g + ")");
            } else {
                source = "Google";
            }
            synchronized (cache) {
                cache.clear();
                cache.addAll(got);
                cacheLat = lat;
                cacheLon = lon;
                // a failure tries again in 2 minutes, a result is kept 20 minutes / 3 km
                cacheAt = got.isEmpty() && !why.isEmpty() ? System.currentTimeMillis() - 18 * 60_000L : System.currentTimeMillis();
            }
            lastFailed = got.isEmpty() && !why.isEmpty();
            status = why;
            loading = false;
            changed.run();
        }).start();
    }

    private static String get(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(8_000);
        c.setReadTimeout(18_000);
        c.setRequestProperty("User-Agent", "DriveCast/1.0 (car dashboard; mosque finder)");
        c.setRequestProperty("Accept", "application/json");
        int code = c.getResponseCode();
        if (code != 200) throw new Exception("HTTP " + code);
        StringBuilder b = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
            String line;
            while ((line = r.readLine()) != null) b.append(line);
        }
        return b.toString();
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
        // your own mosques (settings ← رحلاتي, a place marked 🕌) always count, even when the maps miss them
        List<JSONObject> all = new ArrayList<>(savedMosques(ctx));
        synchronized (cache) {
            all.addAll(cache);
        }
        {
            for (JSONObject o : all) {
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

    /** the saved places marked as a mosque: {name, lat, lon} */
    static List<JSONObject> savedMosques(Context ctx) {
        List<JSONObject> out = new ArrayList<>();
        JSONObject places = Trip.places(ctx);
        java.util.Iterator<String> it = places.keys();
        while (it.hasNext()) {
            JSONObject p = places.optJSONObject(it.next());
            if (p == null || !p.optBoolean("mosque") || !p.has("lat")) continue;
            try {
                out.add(new JSONObject().put("name", p.optString("name", "مسجد")).put("lat", p.optDouble("lat")).put("lon", p.optDouble("lon")).put("saved", true));
            } catch (Exception ignored) {
            }
        }
        return out;
    }

    static String distanceText(float m) {
        return m < 1000 ? Math.round(m / 10f) * 10 + " م" : String.format(java.util.Locale.ROOT, "%.1f كم", m / 1000f);
    }
}
