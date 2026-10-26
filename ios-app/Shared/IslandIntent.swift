import AppIntents
import Foundation

/// Set by the app at launch: what the «ابدأ الجزيرة» button does (the widget part only carries the button).
enum IslandHook {
    static var start: (() async -> Void)?
    /// set by the app: apply «البقاء في الخلفية» now (start / stop the silent sound)
    static var aliveChanged: (() -> Void)?
}

/// «البقاء في الخلفية»: on by default; only the island widget (or Control Center) turns it off and on again.
enum DCAlive {
    static var on: Bool {
        get { DCShared.defaults.object(forKey: "dcAlive") as? Bool ?? true }
        set { DCShared.defaults.set(newValue, forKey: "dcAlive") }
    }
    /// «حسب الوقت» (Settings app): only from 4 pm to 2 am
    static var inWindow: Bool {
        guard UserDefaults.standard.bool(forKey: "aliveSchedule") else { return true }
        let h = Calendar.current.component(.hour, from: Date())
        return h >= 16 || h < 2
    }
    static var wanted: Bool { on && inWindow }
}

/// The widget's switch: runs inside the app in the background, so the sound starts / stops at once.
@available(iOS 17.0, *)
struct ToggleAliveIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "البقاء في الخلفية"
    static var description = IntentDescription("يبقي DriveCast يعمل خلف التطبيقات الأخرى لتتحدث الجزيرة والودجت لحظياً")
    static var openAppWhenRun: Bool = false
    init() {}
    func perform() async throws -> some IntentResult {
        DCAlive.on.toggle()
        await MainActor.run { IslandHook.aliveChanged?() }
        return .result()
    }
}

/// «ابدأ الجزيرة»: iOS runs this inside the app, in the background, without opening it - and a Live Activity may
/// start then. The nearest match of your teams (or the prayer countdown) goes on the island.
@available(iOS 17.0, *)
struct StartIslandIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "ابدأ جزيرة المباراة"
    static var description = IntentDescription("تظهر أقرب مباراة لفرقك في الجزيرة الديناميكية دون فتح التطبيق")
    static var openAppWhenRun: Bool = false
    init() {}
    func perform() async throws -> some IntentResult {
        await IslandHook.start?()
        return .result()
    }
}

