package com.drivecast.sovereign;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

/**
 * Google Maps for the phone (the site's Maps key): nearby mosques (Places), a place by name (Places text search) and a
 * driving route (Routes). Every call says why it failed, so the island can show it and the app falls back to
 * OpenStreetMap.
 */
final class GMaps {

    private GMaps() {
    }

    /** the site's Google Maps key (src/lib/constants.ts) */
    static final String KEY = "AIzaSyBRqAHJ2elbE_Z7NXXYC50XZpqi6HbG6Rk";
    static String lastError = "";
    private static String key = KEY;

    /** the key: your own from the settings ("googleKey"), else the site's */
    static String key(android.content.Context ctx) {
        Object k = Hub.get(ctx, "googleKey");
        if (k == null || String.valueOf(k).trim().length() < 20) {
            JSONObject m = Cloud.master(ctx).optJSONObject("mapSettings");
            k = m != null ? m.optString("googleKey", "") : "";
        }
        key = k != null && String.valueOf(k).trim().length() >= 20 ? String.valueOf(k).trim() : KEY;
        return key;
    }

    /** Mosques: Google web service, then Google's JavaScript library (works with a site-limited key), else null. */
    static List<JSONObject> mosques(android.content.Context ctx, double lat, double lon, int radius) {
        key(ctx);
        List<JSONObject> l = mosquesNear(lat, lon, radius);
        if (l != null && !l.isEmpty()) return l;
        String webErr = lastError;
        JSONObject j = GJs.nearby(ctx, lat, lon, radius);
        if (j != null) {
            try {
                return listOf(j);
            } catch (Exception ignored) {
            }
        }
        lastError = webErr + (GJs.lastError.isEmpty() ? "" : " · " + GJs.lastError);
        return l;
    }

    static JSONObject findAny(android.content.Context ctx, String text, double lat, double lon) {
        key(ctx);
        JSONObject f = find(text, lat, lon);
        if (f != null) return f;
        String webErr = lastError;
        JSONObject j = GJs.find(ctx, text, lat, lon);
        try {
            if (j != null && !listOf(j).isEmpty()) return listOf(j).get(0);
        } catch (Exception ignored) {
        }
        // OpenStreetMap's search (Nominatim)
        try {
            String url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ar&q=" + java.net.URLEncoder.encode(text, "UTF-8")
                    + (lat != 0 || lon != 0 ? "&viewbox=" + (lon - 1) + "," + (lat + 1) + "," + (lon + 1) + "," + (lat - 1) : "");
            JSONArray a = new JSONArray(getText(url));
            if (a.length() > 0) {
                JSONObject e = a.getJSONObject(0);
                return new JSONObject().put("name", e.optString("name", text)).put("lat", e.optDouble("lat")).put("lon", e.optDouble("lon"));
            }
        } catch (Exception ignored) {
        }
        lastError = webErr + (GJs.lastError.isEmpty() ? "" : " · " + GJs.lastError);
        return null;
    }

    /** A route: Google web service, Google's JavaScript library, then OSRM (OpenStreetMap routing). */
    static JSONObject routeAny(android.content.Context ctx, double a, double b, double c, double d) {
        key(ctx);
        JSONObject r = route(a, b, c, d);
        if (r != null) {
            try { r.put("via", "Google"); } catch (Exception ignored) { }
            return r;
        }
        String webErr = lastError;
        JSONObject j = GJs.route(ctx, a, b, c, d);
        if (j != null && j.optJSONArray("points") != null) {
            try {
                return new JSONObject().put("meters", j.optLong("meters")).put("seconds", j.optLong("seconds")).put("points", j.getJSONArray("points")).put("via", "Google");
            } catch (Exception ignored) {
            }
        }
        try {
            JSONObject o = new JSONObject(getText("https://router.project-osrm.org/route/v1/driving/" + b + "," + a + ";" + d + "," + c + "?overview=simplified&geometries=polyline"));
            JSONObject rt = o.optJSONArray("routes").getJSONObject(0);
            JSONArray pts = new JSONArray();
            for (double[] p : decode(rt.optString("geometry"))) pts.put(new JSONArray().put(p[0]).put(p[1]));
            lastError = webErr;
            return new JSONObject().put("meters", Math.round(rt.optDouble("distance"))).put("seconds", Math.round(rt.optDouble("duration"))).put("points", pts).put("via", "OSRM");
        } catch (Exception ignored) {
        }
        lastError = webErr + (GJs.lastError.isEmpty() ? "" : " · " + GJs.lastError);
        return null;
    }

    private static List<JSONObject> listOf(JSONObject j) throws Exception {
        List<JSONObject> out = new ArrayList<>();
        JSONArray r = j.optJSONArray("res");
        for (int i = 0; r != null && i < r.length(); i++) out.add(r.getJSONObject(i));
        return out;
    }

    private static String getText(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(8_000);
        c.setReadTimeout(15_000);
        c.setRequestProperty("User-Agent", "DriveCast/1.0");
        StringBuilder b = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
            String line;
            while ((line = r.readLine()) != null) b.append(line);
        }
        return b.toString();
    }

    private static JSONObject post(String url, String fieldMask, JSONObject body) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(8_000);
        c.setReadTimeout(15_000);
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        c.setRequestProperty("X-Goog-Api-Key", key);
        c.setRequestProperty("X-Goog-FieldMask", fieldMask);
        // the key may be limited to the site's address
        c.setRequestProperty("Referer", "https://cplay2.vercel.app/");
        c.setRequestProperty("X-Android-Package", "com.drivecast.sovereign");
        try (OutputStream o = c.getOutputStream()) {
            o.write(body.toString().getBytes("UTF-8"));
        }
        int code = c.getResponseCode();
        InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
        StringBuilder b = new StringBuilder();
        if (in != null) try (BufferedReader r = new BufferedReader(new InputStreamReader(in, "UTF-8"))) {
            String line;
            while ((line = r.readLine()) != null) b.append(line);
        }
        JSONObject j = b.length() > 0 ? new JSONObject(b.toString()) : new JSONObject();
        if (code >= 400) {
            JSONObject e = j.optJSONObject("error");
            throw new Exception("Google " + code + (e != null ? ": " + e.optString("status") + " " + e.optString("message") : ""));
        }
        return j;
    }

    private static JSONObject latLng(double lat, double lon) throws Exception {
        return new JSONObject().put("latitude", lat).put("longitude", lon);
    }

    /** Mosques around a point (nearest first): {name, lat, lon}. Null when Google refused (see lastError). */
    static List<JSONObject> mosquesNear(double lat, double lon, int radius) {
        try {
            JSONObject body = new JSONObject()
                    .put("includedTypes", new JSONArray().put("mosque"))
                    .put("maxResultCount", 20)
                    .put("rankPreference", "DISTANCE")
                    .put("languageCode", "ar")
                    .put("locationRestriction", new JSONObject().put("circle", new JSONObject().put("center", latLng(lat, lon)).put("radius", radius)));
            JSONObject r = post("https://places.googleapis.com/v1/places:searchNearby", "places.displayName,places.location", body);
            lastError = "";
            return places(r);
        } catch (Exception e) {
            lastError = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            return null;
        }
    }

    /** A place by name near a point ("صلالة", "مستشفى السلطان قابوس"): {name, lat, lon, address} or null. */
    static JSONObject find(String text, double lat, double lon) {
        try {
            JSONObject body = new JSONObject().put("textQuery", text).put("languageCode", "ar").put("maxResultCount", 1);
            if (lat != 0 || lon != 0) body.put("locationBias", new JSONObject().put("circle", new JSONObject().put("center", latLng(lat, lon)).put("radius", 50000.0)));
            JSONObject r = post("https://places.googleapis.com/v1/places:searchText", "places.displayName,places.location,places.formattedAddress", body);
            List<JSONObject> l = places(r);
            lastError = "";
            return l.isEmpty() ? null : l.get(0);
        } catch (Exception e) {
            lastError = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            return null;
        }
    }

    private static List<JSONObject> places(JSONObject r) throws Exception {
        List<JSONObject> out = new ArrayList<>();
        JSONArray ps = r.optJSONArray("places");
        for (int i = 0; ps != null && i < ps.length(); i++) {
            JSONObject p = ps.optJSONObject(i);
            JSONObject loc = p != null ? p.optJSONObject("location") : null;
            if (loc == null) continue;
            JSONObject dn = p.optJSONObject("displayName");
            out.add(new JSONObject().put("name", dn != null ? dn.optString("text", "مسجد") : "مسجد")
                    .put("lat", loc.optDouble("latitude")).put("lon", loc.optDouble("longitude"))
                    .put("address", p.optString("formattedAddress", "")));
        }
        return out;
    }

    /** A driving route: {meters, seconds, points: [[lat, lon], ...]} or null. */
    static JSONObject route(double fromLat, double fromLon, double toLat, double toLon) {
        try {
            JSONObject body = new JSONObject()
                    .put("origin", new JSONObject().put("location", new JSONObject().put("latLng", latLng(fromLat, fromLon))))
                    .put("destination", new JSONObject().put("location", new JSONObject().put("latLng", latLng(toLat, toLon))))
                    .put("travelMode", "DRIVE").put("languageCode", "ar");
            JSONObject r = post("https://routes.googleapis.com/directions/v2:computeRoutes", "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline", body);
            JSONObject rt = r.optJSONArray("routes") != null ? r.optJSONArray("routes").optJSONObject(0) : null;
            if (rt == null) throw new Exception("no route");
            long secs = Long.parseLong(rt.optString("duration", "0s").replace("s", ""));
            JSONArray pts = new JSONArray();
            for (double[] p : decode(rt.optJSONObject("polyline").optString("encodedPolyline"))) pts.put(new JSONArray().put(p[0]).put(p[1]));
            lastError = "";
            return new JSONObject().put("meters", rt.optLong("distanceMeters")).put("seconds", secs).put("points", pts);
        } catch (Exception e) {
            lastError = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            return null;
        }
    }

    /** Google's encoded polyline -> points. */
    static List<double[]> decode(String enc) {
        List<double[]> out = new ArrayList<>();
        int i = 0, lat = 0, lng = 0;
        while (enc != null && i < enc.length()) {
            int b, shift = 0, result = 0;
            do { b = enc.charAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20 && i < enc.length());
            lat += (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
            shift = 0;
            result = 0;
            do { b = enc.charAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20 && i < enc.length());
            lng += (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
            out.add(new double[]{lat / 1e5, lng / 1e5});
        }
        return out;
    }
}
