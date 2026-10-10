package com.drivecast.sovereign;

import android.app.Notification;
import android.os.Bundle;

/**
 * Google Maps' navigation, read from its ongoing notification (Notify): the time left to arrival with the traffic
 * ("15 min · 12 km · ETA 5:40") and the next turn ("200 m · Turn right onto ...").
 */
final class MapsNav {

    private MapsNav() {
    }

    private static volatile long etaSec = -1, at = 0;
    static volatile String turn = "", distance = "";

    /** true when it was a navigation notification */
    static boolean from(Notification n) {
        if (n == null || (n.flags & Notification.FLAG_ONGOING_EVENT) == 0) return false;
        Bundle e = n.extras;
        String title = str(e.getCharSequence(Notification.EXTRA_TITLE));
        String text = str(e.getCharSequence(Notification.EXTRA_TEXT));
        String sub = str(e.getCharSequence(Notification.EXTRA_SUB_TEXT));
        String big = str(e.getCharSequence(Notification.EXTRA_BIG_TEXT));
        // the time left is in the sub text in most versions, sometimes in the text
        long s = -1;
        for (String c : new String[]{sub, text, big, title}) {
            if (s < 0 && !c.isEmpty() && !looksLikeDistanceOnly(c)) s = Notify.seconds(c);
        }
        if (s < 0) return false;
        etaSec = s;
        at = System.currentTimeMillis();
        turn = text.isEmpty() ? title : text;
        distance = title;
        return true;
    }

    private static boolean looksLikeDistanceOnly(String c) {
        String w = Notify.western(c).trim();
        return w.matches("^[\\d.,]+\\s*(m|km|م|كم|متر|كيلومتر)$");
    }

    static void clear() {
        etaSec = -1;
        at = 0;
        turn = "";
    }

    /** the time left Google Maps shows now (-1: not navigating, or no news for 2 minutes) */
    static long etaSec() {
        if (etaSec < 0 || System.currentTimeMillis() - at > 120_000L) return -1;
        // it updates every minute or so: count down between updates
        return Math.max(0, etaSec - (System.currentTimeMillis() - at) / 1000);
    }

    static boolean active() {
        return etaSec() >= 0;
    }

    private static String str(CharSequence c) {
        return c == null ? "" : c.toString();
    }
}
