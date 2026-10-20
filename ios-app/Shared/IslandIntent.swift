import AppIntents
import Foundation

/// Set by the app at launch: what the «ابدأ الجزيرة» button does (the widget part only carries the button).
enum IslandHook {
    static var start: (() async -> Void)?
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

