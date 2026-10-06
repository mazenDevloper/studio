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

    private static JSONObject post(String url, String fieldMask, JSONObject body) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(8_000);
        c.setReadTimeout(15_000);
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        c.setRequestProperty("X-Goog-Api-Key", KEY);
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
