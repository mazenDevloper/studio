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
    /// commands the page wasn't listening for yet (a widget started the app): handed over by takePendingCommands
    private var pending: [[String: String]] = []

    /// A command for the page ("channel", "play", "reciter", "voice", "hub"...), like Android's emitCommand.
    func emit(_ cmd: String, _ arg: String) {
        let item = ["cmd": cmd, "arg": arg]
        guard let web, let d = try? JSONSerialization.data(withJSONObject: item), let json = String(data: d, encoding: .utf8) else {
            pending.append(item); return
        }
        DispatchQueue.main.async {
            web.evaluateJavaScript("window.__dcEmit ? window.__dcEmit('command', \(json)) : false") { r, _ in
                if (r as? Bool) != true { self.pending.append(item) }
            }
        }
    }

    /// The app on a screen of the site (no reload when the page is already there).
    func open(route: String) {
        guard let web, route.hasPrefix("/") else { return }
        DispatchQueue.main.async {
            if web.url == nil || web.url?.host != WebViewController.siteURL.host {
                web.load(URLRequest(url: URL(string: WebViewController.siteURL.absoluteString + route)!))
                return
            }
            let r = route.replacingOccurrences(of: "'", with: "")
            web.evaluateJavaScript("""
            (function(r){if(location.pathname===r)return;try{if(window.next&&window.next.router&&window.next.router.push){window.next.router.push(r);return}}catch(e){}location.assign(r)})('\(r)')
            """, completionHandler: nil)
        }
    }

    /// drivecast://open?route=/matches · drivecast://cmd?route=/media&cmd=channel&arg=ID · drivecast://voice · drivecast://islands
    func handle(url: URL) {
        let q = Dictionary((URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []).map { ($0.name, $0.value ?? "") }) { a, _ in a }
        switch url.host ?? "" {
        case "open":
            open(route: q["route"] ?? "/")
        case "cmd":
            if let r = q["route"], !r.isEmpty { open(route: r) }
            if let c = q["cmd"], !c.isEmpty { emit(c, q["arg"] ?? "") }
        case "voice":
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { VoiceController.present() }
        case "islands":
            DispatchQueue.main.async {
                Island.shared.toggleHidden()
                let hidden = Island.shared.hidden
                self.emit("hub", "{\"islandsHidden\":\(hidden)}")
                Toast.show(hidden ? "🙈 أُخفيت الجزر" : "👁 ظهرت الجزر")
            }
        default:
            break
        }
    }

    /// What the phone heard: the islands' own words here, the rest to the page (like the site's microphone)
    func voiceCommand(_ text: String) {
        if text.range(of: "(اخف|أخف|اخفي|إخفاء|اخفاء|سكّر|سكر|اقفل).*(الجزر|الجزيرة)", options: .regularExpression) != nil {
            if !Island.shared.hidden { handle(url: DCLink.islands) }
            return
        }
        if text.range(of: "(اظهر|أظهر|اظهار|إظهار|افتح|رجع).*(الجزر|الجزيرة)", options: .regularExpression) != nil {
            if Island.shared.hidden { handle(url: DCLink.islands) }
            return
        }
        emit("voice", text)
    }

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
                    "appGroup": DCShared.group,
                    "appGroupWorks": DCShared.groupWorks,
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
            let list = pending
            pending.removeAll()
            reply(["commands": list])
        case "voice":
            DispatchQueue.main.async { VoiceController.present() }
            reply([:])
        default:
            // setVideoPlaying, setOverlayEnabled, setTextZoom...: nothing to do on iOS
            reply([:])
        }
    }
}
