import AVFoundation
import BackgroundTasks
import UIKit
import UserNotifications

@main
final class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // media keeps playing behind other apps and with the screen locked
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
        try? AVAudioSession.sharedInstance().setActive(true)
        UserDefaults.standard.register(defaults: ["prayerIsland": true, "matchesIsland": false])
        UNUserNotificationCenter.current().delegate = self
        Island.shared.registerBackgroundRefresh()
        Island.shared.downloadFonts()

        let w = UIWindow(frame: UIScreen.main.bounds)
        w.backgroundColor = .black
        w.rootViewController = WebViewController()
        w.makeKeyAndVisible()
        window = w
        Updater.repo = "mazenDevloper/studio"; Updater.ipa = "DriveCast.ipa"; Updater.appName = "DriveCast"
        Updater.installShortcut()
        let fromShortcut = (launchOptions?[.shortcutItem] as? UIApplicationShortcutItem)?.type == "update"
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { Updater.check(silent: !fromShortcut) }
        // shake the phone: what the widget / island really have on this phone (to find why they don't show)
        return true
    }

    /// drivecast://... from a widget (open a screen, a channel, the microphone, show / hide the islands)
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        guard url.scheme == "drivecast" else { return false }
        Bridge.shared.handle(url: url)
        return true
    }

    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        UIDevice.current.userInterfaceIdiom == .pad ? .all : .allButUpsideDown
    }

    func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        if shortcutItem.type == "update" { Updater.check(silent: false) }
        completionHandler(true)
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        Updater.check(silent: true)
        KeepAlive.shared.enterForeground()
        Island.shared.appActive()
    }

    /// the diagnostics (after the page had time to send the prayer times)
    static func showDiagnostics() {
        guard let root = UIApplication.shared.connectedScenes.compactMap({ ($0 as? UIWindowScene)?.keyWindow }).first?.rootViewController
                ?? (UIApplication.shared.delegate as? AppDelegate)?.window?.rootViewController else { return }
        let text = Island.diagnostics()
        let a = UIAlertController(title: "تشخيص الجزيرة والودجت", message: text, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "نسخ", style: .default) { _ in UIPasteboard.general.string = text })
        a.addAction(UIAlertAction(title: "إغلاق", style: .cancel))
        root.present(a, animated: true)
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        Island.shared.scheduleBackgroundRefresh()
        KeepAlive.shared.enterBackground()
    }

    /// Notifications also show while the app is open.
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .list])
    }
}
