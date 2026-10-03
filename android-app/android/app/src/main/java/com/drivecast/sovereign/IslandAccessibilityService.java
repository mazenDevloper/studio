package com.drivecast.sovereign;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;

/**
 * Optional: lets the floating island be drawn as an accessibility overlay - the way "dynamic island" apps do it -
 * so it shows over the status bar and the lock screen and is not stopped by battery savers. It reads nothing
 * from the screen: it only hosts the island window drawn by IslandService.
 */
public class IslandAccessibilityService extends AccessibilityService {

    static volatile IslandAccessibilityService instance;

    WindowManager windowManager() {
        return (WindowManager) getSystemService(Context.WINDOW_SERVICE);
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        IslandService.start(this);
        IslandService.hostChanged();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // nothing to read: the service only provides the overlay window
    }

    @Override
    public void onInterrupt() {
    }

    @Override
    public void onDestroy() {
        instance = null;
        IslandService.hostChanged();
        super.onDestroy();
    }
}
