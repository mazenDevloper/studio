import AppIntents

/// Siri / Shortcuts / the Action Button: «ابدأ الجزيرة في DriveCast»
@available(iOS 17.0, *)
struct DriveCastShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: StartIslandIntent(), phrases: ["ابدأ الجزيرة في \(.applicationName)", "Start island in \(.applicationName)"],
                    shortTitle: "ابدأ الجزيرة", systemImageName: "sportscourt")
    }
}
