import SwiftUI
import UIKit
import WidgetKit

/**
 Not shipped: a small simulator app run by CI that draws every widget (with the real cloud data) and every island
 state with the very same views, and saves them as pictures (Documents/snaps) — the previews of each build.
 */
@main
struct SnapApp: App {
    init() {
        Task { @MainActor in await Snap.run() }
    }

    var body: some Scene {
        WindowGroup { Text("DriveCast snapshots").foregroundColor(.white) }
    }
}

@MainActor
enum Snap {
    static let dir: URL = {
        let u = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("snaps", isDirectory: true)
        try? FileManager.default.removeItem(at: u)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }()

    static let small = CGSize(width: 170, height: 170)
    static let medium = CGSize(width: 364, height: 170)
    static let large = CGSize(width: 364, height: 382)

    static func run() async {
        await fonts()
        var log: [String] = []
        func note(_ s: String) { log.append(s); print("SNAP", s) }

        // widgets
        let ev = await widgetEvents()
        note("events: \(ev.count)")
        for (f, size, n) in [(WidgetFamily.systemSmall, small, "small"), (.systemMedium, medium, "medium")] {
            if let e = PrayerProvider.entries(ev).first { save("widget-prayer-\(n)", widget(PrayerWidgetView(e: e, family: f), size)) }
        }
        // the prayer card between an adhan and its iqamah
        if let iq = ev.first(where: { $0.kind == "iqamah" }) {
            let e = PrayerEntry(date: iq.at.addingTimeInterval(-300), title: iq.title, at: Date().addingTimeInterval(300), kind: "iqamah",
                                times: ev.filter { $0.kind == "azan" && Calendar.current.isDate($0.at, inSameDayAs: iq.at) }.map { ($0.title, DCShared.time12($0.at), false) })
            save("widget-prayer-iqamah-medium", widget(PrayerWidgetView(e: e, family: .systemMedium), medium))
        }
        for (f, size, n) in [(WidgetFamily.systemSmall, small, "small"), (.systemMedium, medium, "medium"), (.systemLarge, large, "large")] {
            let e = await MatchesProvider().entry(family: f, maxAge: 0)
            note("matches \(n): \(e.rows.count) rows \(e.empty)")
            save("widget-matches-\(n)", widget(MatchesWidgetView(e: e, family: f), size))
        }
        if let e = DayProvider.entries(ev).first {
            save("widget-day-small", widget(DayWidgetView(e: e, family: .systemSmall), small))
            save("widget-day-medium", widget(DayWidgetView(e: e, family: .systemMedium), medium))
        }
        save("widget-clock-small", widget(ClockWidgetView(e: ClockEntry(date: Date()), family: .systemSmall), small))
        for f in [WidgetFamily.systemMedium, .systemLarge] {
            let e = AzkarProvider.entry(ev, family: f, at: Date())
            save("widget-azkar-\(f == .systemLarge ? "large" : "medium")", widget(AzkarWidgetView(e: e, family: f), f == .systemLarge ? large : medium))
        }
        for mode in 0..<3 {
            UserDefaults.standard.set(mode, forKey: "moonMode")
            let e = await MoonProvider().entry()
            save("widget-moon-\(mode)", widget(MoonWidgetView(e: e, family: .systemSmall), small, bg: .black))
        }
        if let e = await ManuscriptProvider().entries(family: .systemMedium, count: 1).first {
            note("manuscript: art \(e.art != nil) text \(e.text ?? "-") empty \(e.empty)")
            save("widget-manuscript-medium", widget(ManuscriptWidgetView(e: e), medium, image: e.background))
        }
        save("widget-controls-small", widget(ControlsWidgetView(family: .systemSmall), small))
        save("widget-controls-medium", widget(ControlsWidgetView(family: .systemMedium), medium))
        for kind in ["reciters", "channels", "folders"] {
            for (f, size, n) in [(WidgetFamily.systemMedium, medium, "medium"), (.systemLarge, large, "large")] {
                let e = await BrowseProvider(kind: kind).entry(f)
                note("\(kind) \(n): \(e.items.count) items")
                save("widget-\(kind)-\(n)", widget(BrowseWidgetView(e: e, family: f), size))
            }
        }

        // islands
        let home = await Cloud.image("https://media.api-sports.io/football/teams/2939.png", maxPx: 30)?.pngData()
        let away = await Cloud.image("https://media.api-sports.io/football/teams/2932.png", maxPx: 30)?.pngData()
        var azan = IslandAttributes.ContentState(kind: "azan", title: "المغرب", start: Date().addingTimeInterval(-3000), end: Date().addingTimeInterval(1500), timeText: "5:52")
        azan.note = Hijri.occasionLine()
        var iqamah = azan
        iqamah.kind = "iqamah"; iqamah.title = "إقامة المغرب"; iqamah.end = Date().addingTimeInterval(420); iqamah.start = Date().addingTimeInterval(-180)
        var live = IslandAttributes.ContentState(kind: "match", title: "دوري روشن السعودي", start: Date(), end: Date(), timeText: "9:00")
        live.home = "النصر"; live.away = "الهلال"; live.homeLogoData = home; live.awayLogoData = away
        live.sh = 2; live.sa = 1; live.status = "live"; live.minute = "د67"; live.fav = true; live.league = live.title
        var goal = live
        goal.scored = "home"
        var upcoming = live
        upcoming.status = "upcoming"; upcoming.sh = 0; upcoming.sa = 0; upcoming.fav = false
        var livePrayer = live
        livePrayer.pKind = "azan"; livePrayer.pTitle = "الظهر"; livePrayer.pEnd = Date().addingTimeInterval(2 * 3600 + 7 * 60)
        save("island-match-live-prayer-compact", compact(livePrayer))
        for (n, s) in [("azan", azan), ("iqamah", iqamah), ("match-live", live), ("match-goal", goal), ("match-upcoming", upcoming)] {
            save("island-\(n)-expanded", expanded(s))
            save("island-\(n)-compact", compact(s))
            save("island-\(n)-lockscreen", lock(s))
        }
        save("island-minimal", AnyView(HStack(spacing: 20) { pill(IslandMinimal(s: azan)); pill(IslandMinimal(s: live)); pill(IslandMinimal(s: goal)) }
            .padding(20).background(Color(white: 0.85))))

        // the goal / full-time alerts (SofaScore style)
        let rm = await Cloud.image("https://imagecache.365scores.com/image/upload/f_png,w_64,h_64,c_limit,q_auto:eco/Competitors/131", maxPx: 120)
        let sev = await Cloud.image("https://imagecache.365scores.com/image/upload/f_png,w_64,h_64,c_limit,q_auto:eco/Competitors/138", maxPx: 120)
        let mbappe = await Cloud.image("https://imagecache.365scores.com/image/upload/f_png,w_200,h_200,c_limit,q_auto:eco,d_Athletes:default.png/Athletes/26911", maxPx: 200)
        save("notification-card", AnyView(Image(uiImage: GoalAlert.card(player: mbappe, home: rm, away: sev, sh: 2, sa: 0, scored: "home"))))
        let pic = GoalAlert.card(player: mbappe, home: rm, away: sev, sh: 2, sa: 0, scored: "home")
        for (n, t) in [
            ("goal-home", GoalAlert.text(kind: "goal", home: "ريال مدريد", away: "إشبيلية", sh: 2, sa: 0, scored: "home", minute: "د45", scorer: "كيليان مبابي 45'")),
            ("goal-away", GoalAlert.text(kind: "goal", home: "ريال مدريد", away: "إشبيلية", sh: 3, sa: 1, scored: "away", minute: "د78", scorer: "إيساك روميرو 78' (جزاء)")),
            ("end", GoalAlert.text(kind: "end", home: "ريال مدريد", away: "إشبيلية", sh: 4, sa: 1, scored: "", minute: "", scorer: "")),
        ] {
            save("notification-\(n)", AnyView(GoalAlert.Banner(t: t, badges: pic).padding(16)
                .background(LinearGradient(colors: [Color(red: 0.25, green: 0.3, blue: 0.45), Color(red: 0.55, green: 0.4, blue: 0.5)], startPoint: .top, endPoint: .bottom))))
        }

        try? log.joined(separator: "\n").write(to: dir.appendingPathComponent("log.txt"), atomically: true, encoding: .utf8)
        try? "ok".write(to: dir.appendingPathComponent("done"), atomically: true, encoding: .utf8)
        print("SNAP done")
    }

    /// the font the widgets use on the phone (downloaded there by the app)
    static func fonts() async {
        let base = "https://cdn.jsdelivr.net/gh/engdawood/thmanyah-font-web@451a047/fonts/thmanyah-sans/otf/thmanyah-sans-"
        for w in DC.fontWeights {
            let file = DCShared.dir("fonts").appendingPathComponent("thmanyah-sans-\(w).otf")
            if !FileManager.default.fileExists(atPath: file.path), let u = URL(string: base + w + ".otf"),
               let d = try? await URLSession.shared.data(from: u).0, d.count > 20_000 { try? d.write(to: file) }
        }
        DC.registerFonts()
    }

    static func save(_ name: String, _ v: AnyView) {
        let r = ImageRenderer(content: v.environment(\.colorScheme, .dark))
        r.scale = 3
        if let d = r.uiImage?.pngData() { try? d.write(to: dir.appendingPathComponent(name + ".png")) }
    }

    /// a widget as on the home screen: the wallpaper, the rounded card, the system's margins
    static func widget<V: View>(_ v: V, _ size: CGSize, bg: Color = DC.card, image: UIImage? = nil) -> AnyView {
        AnyView(
            v.padding(16)
                .frame(width: size.width, height: size.height)
                .background(ZStack { bg; if let image { Image(uiImage: image).resizable().scaledToFill().opacity(0.55) } })
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                .environment(\.layoutDirection, .rightToLeft)
                .padding(18)
                .background(LinearGradient(colors: [Color(red: 0.25, green: 0.3, blue: 0.45), Color(red: 0.55, green: 0.4, blue: 0.5)], startPoint: .top, endPoint: .bottom))
        )
    }

    /// the expanded Dynamic Island (the regions placed like iOS does)
    static func expanded(_ s: IslandAttributes.ContentState) -> AnyView {
        AnyView(
            VStack(spacing: 6) {
                HStack(alignment: .top) {
                    IslandLeading(s: s).frame(width: 70)
                    Spacer(minLength: 4)
                    IslandCenter(s: s, stale: false)
                    Spacer(minLength: 4)
                    IslandTrailing(s: s).frame(width: 70)
                }
                IslandBottom(s: s, stale: false)
            }
            .padding(.horizontal, 18).padding(.vertical, 16)
            .frame(width: 371)
            .background(RoundedRectangle(cornerRadius: 44, style: .continuous).fill(Color.black))
            .padding(14).background(Color(white: 0.85))
        )
    }

    /// the compact island: leading · the camera · trailing
    static func compact(_ s: IslandAttributes.ContentState) -> AnyView {
        AnyView(
            HStack(spacing: 0) {
                IslandCompactLeading(s: s)
                Spacer(minLength: 120)
                IslandCompactTrailing(s: s, stale: false)
            }
            .padding(.horizontal, 14).frame(height: 37)
            .background(Capsule().fill(Color.black))
            .fixedSize()
            .padding(14).background(Color(white: 0.85))
        )
    }

    static func lock(_ s: IslandAttributes.ContentState) -> AnyView {
        AnyView(
            LockScreenView(s: s, stale: false)
                .frame(width: 360)
                .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(Color.black.opacity(0.88)))
                .padding(16)
                .background(LinearGradient(colors: [Color(red: 0.2, green: 0.25, blue: 0.4), Color(red: 0.45, green: 0.3, blue: 0.4)], startPoint: .top, endPoint: .bottom))
        )
    }

    static func pill<V: View>(_ v: V) -> some View {
        v.frame(width: 37, height: 37).background(Circle().fill(Color.black))
    }
}
