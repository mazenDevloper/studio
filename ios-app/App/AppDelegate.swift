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
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        Island.shared.appActive()
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        Island.shared.scheduleBackgroundRefresh()
    }

    /// Notifications also show while the app is open.
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .list])
    }
}
