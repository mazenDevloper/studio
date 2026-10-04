import ActivityKit
import Foundation
import UIKit
import UserNotifications
import WebKit
import WidgetKit

/// The NativeIsland calls the page makes (same names as the Android plugin).
final class Bridge {
    static let shared = Bridge()
    weak var web: WKWebView?

    func handle(_ method: String, args: [String: Any], reply: @escaping ([String: Any]) -> Void) {
        switch method {
        case "configure":
            // prayer times (adhan / iqamah), reminders, the matches address with the favourite teams, pins
            if let c = args["config"] as? String { DCShared.defaults.set(c, forKey: "config") }
            WidgetCenter.shared.reloadAllTimelines()
            DispatchQueue.main.async { Island.shared.configChanged() }
            reply([:])
        case "updateWidgets":
            // merged like on Android (each call sends some keys)
            var merged = DCShared.json("widgets")
            if let s = args["data"] as? String, let d = s.data(using: .utf8), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] {
                for (k, v) in o { merged[k] = v }
            }
            if let d = try? JSONSerialization.data(withJSONObject: merged), let s = String(data: d, encoding: .utf8) {
                DCShared.defaults.set(s, forKey: "widgets")
            }
            reply([:])
        case "getStatus":
            UNUserNotificationCenter.current().getNotificationSettings { st in
                reply([
                    "platform": "ios",
                    "overlay": true, "background": true, "accessibility": true, "overlayEnabled": true,
                    "notifications": st.authorizationStatus == .authorized || st.authorizationStatus == .provisional,
                    "liveActivities": ActivityAuthorizationInfo().areActivitiesEnabled,
                    "prayerIsland": UserDefaults.standard.bool(forKey: "prayerIsland"),
                    "matchesIsland": UserDefaults.standard.bool(forKey: "matchesIsland"),
                    "version": (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "1.0",
                    "textZoom": Int(((self.web?.pageZoom ?? 1) * 100).rounded()),
                ])
            }
        case "requestNotifications":
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in
                DispatchQueue.main.async { Island.shared.configChanged() }
                reply([:])
            }
        case "setMatchesIsland":
            UserDefaults.standard.set((args["enabled"] as? Bool) ?? false, forKey: "matchesIsland")
            DispatchQueue.main.async { Island.shared.settingsChanged() }
            reply([:])
        case "setPrayerIsland":
            UserDefaults.standard.set((args["enabled"] as? Bool) ?? true, forKey: "prayerIsland")
            DispatchQueue.main.async { Island.shared.settingsChanged() }
            reply([:])
        case "requestOverlay", "requestBackground", "requestAccessibility":
            // iOS: the Live Activities switch lives in the app's settings page
            DispatchQueue.main.async {
                if let u = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(u) }
            }
            reply([:])
        case "setTextZoom":
            let p = max(50, min(200, (args["percent"] as? NSNumber)?.intValue ?? 100))
            UserDefaults.standard.set(p, forKey: "textZoom")
            DispatchQueue.main.async { self.web?.pageZoom = CGFloat(p) / 100 }
            reply([:])
        case "takePendingCommands":
            reply(["commands": []])
        default:
            // setVideoPlaying, setOverlayEnabled, setTextZoom...: nothing to do on iOS
            reply([:])
        }
    }
}
