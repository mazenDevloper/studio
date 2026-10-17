import AppIntents
import SwiftUI
import WidgetKit

/// The widgets' own small store (the widget part's settings: pages, counters, modes).
enum WState {
    static var d: UserDefaults { .standard }

    static func page(_ kind: String) -> Int {
        // back to the first page after 3 minutes untouched (like Android)
        if Date().timeIntervalSince1970 - d.double(forKey: "pageAt_" + kind) > 180 { return 0 }
        return d.integer(forKey: "page_" + kind)
    }

    static func setPage(_ kind: String, _ p: Int) {
        d.set(p, forKey: "page_" + kind)
        d.set(Date().timeIntervalSince1970, forKey: "pageAt_" + kind)
    }

    /// today's azkar counts (a new day starts from zero)
    static func azkarCounts() -> [String: Int] {
        guard d.string(forKey: "azkarDay") == Cloud.dayKey(Date()) else { return [:] }
        return (d.dictionary(forKey: "azkarCounts") as? [String: Int]) ?? [:]
    }

    static func addZikr(_ id: String) {
        var c = azkarCounts()
        let need = AzkarData.items.first { $0.id == id }?.count ?? 1
        c[id] = min(need, (c[id] ?? 0) + 1)
        d.set(c, forKey: "azkarCounts")
        d.set(Cloud.dayKey(Date()), forKey: "azkarDay")
    }

    /// "morning" from Fajr until Asr, "evening" otherwise
    static func azkarPeriod(_ events: [Cloud.Event]) -> String {
        let now = Date(), cal = Calendar.current
        let today = events.filter { $0.kind == "azan" && cal.isDateInToday($0.at) }
        if let f = today.first(where: { $0.title.contains("الفجر") })?.at, let a = today.first(where: { $0.title.contains("العصر") })?.at {
            return now >= f && now < a ? "morning" : "evening"
        }
        let h = cal.component(.hour, from: now)
        return h >= 4 && h < 15 ? "morning" : "evening"
    }
}

// MARK: - buttons (iOS 17: they work inside the widget; before that they open the app)

@available(iOS 17.0, *)
struct PageIntent: AppIntent {
    static var title: LocalizedStringResource = "الصفحة"
    @Parameter(title: "Widget") var kind: String
    @Parameter(title: "Delta") var delta: Int
    init() {}
    init(_ kind: String, _ delta: Int) { self.kind = kind; self.delta = delta }
    func perform() async throws -> some IntentResult {
        WState.setPage(kind, WState.page(kind) + delta)
        return .result()
    }
}

@available(iOS 17.0, *)
struct RefreshIntent: AppIntent {
    static var title: LocalizedStringResource = "تحديث"
    @Parameter(title: "Widget") var kind: String
    init() {}
    init(_ kind: String) { self.kind = kind }
    func perform() async throws -> some IntentResult {
        WState.d.set(Date().timeIntervalSince1970, forKey: "refresh_" + kind)
        return .result()
    }
}

@available(iOS 17.0, *)
struct ZikrIntent: AppIntent {
    static var title: LocalizedStringResource = "ذكر"
    @Parameter(title: "Zikr") var id: String
    init() {}
    init(_ id: String) { self.id = id }
    func perform() async throws -> some IntentResult {
        WState.addZikr(id)
        return .result()
    }
}

/// a tap on the moon / manuscript: the next mode / the next manuscript
@available(iOS 17.0, *)
struct StepIntent: AppIntent {
    static var title: LocalizedStringResource = "التالي"
    @Parameter(title: "Key") var key: String
    init() {}
    init(_ key: String) { self.key = key }
    func perform() async throws -> some IntentResult {
        WState.d.set(WState.d.integer(forKey: key) + 1, forKey: key)
        return .result()
    }
}

/// A button that runs `intent` in the widget on iOS 17, and opens `fallback` before that.
struct WButton<Label: View>: View {
    let intent: (any AppIntent)?
    let fallback: URL?
    @ViewBuilder let label: () -> Label

    var body: some View {
        if #available(iOS 17.0, *), let i = intent {
            Button(intent: i) { label() }.buttonStyle(.plain)
        } else if let u = fallback {
            Link(destination: u) { label() }
        } else {
            label()
        }
    }
}

extension View {
    /// the site's black card as the widget's background (iOS 17's container background, padding before that)
    @ViewBuilder func dcBackground(_ color: Color = DC.card) -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(color, for: .widget)
        } else {
            padding().background(color)
        }
    }

    @ViewBuilder func dcBackground(image: UIImage?) -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(for: .widget) {
                ZStack {
                    DC.card
                    if let image { Image(uiImage: image).resizable().scaledToFill().opacity(0.55) }
                }
            }
        } else {
            padding().background(ZStack { DC.card; if let image { Image(uiImage: image).resizable().scaledToFill().opacity(0.55) } })
        }
    }
}

/// a round picture (team logo, channel), initials when there is none
struct RoundPic: View {
    let image: UIImage?
    let name: String
    let size: CGFloat
    var fill = false

    var body: some View {
        ZStack {
            Circle().fill(Color.white.opacity(0.07))
            if let image {
                if fill {
                    Image(uiImage: image).resizable().scaledToFill().frame(width: size, height: size).clipShape(Circle())
                } else {
                    Image(uiImage: image).resizable().scaledToFit().frame(width: size * 0.78, height: size * 0.78)
                }
            } else {
                Text(String(name.prefix(2))).font(DC.font(size * 0.36)).foregroundColor(.white.opacity(0.6))
            }
            Circle().stroke(Color.white.opacity(0.14), lineWidth: max(1, size / 24))
        }
        .frame(width: size, height: size)
    }
}

/// ‹ › in round dark buttons
struct PagerButtons: View {
    let kind: String
    let hasPrev: Bool
    let hasNext: Bool
    var size: CGFloat = 30
    var fallback: URL? = nil

    var body: some View {
        HStack(spacing: 8) {
            arrow("‹", delta: -1, on: hasPrev)
            arrow("›", delta: 1, on: hasNext)
        }
        .environment(\.layoutDirection, .leftToRight)
    }

    @ViewBuilder private func arrow(_ t: String, delta: Int, on: Bool) -> some View {
        let label = Text(t).font(.system(size: size * 0.75, weight: .heavy)).foregroundColor(.white.opacity(on ? 0.95 : 0.25))
            .frame(width: size * 1.4, height: size).background(Capsule().fill(Color.white.opacity(on ? 0.14 : 0.05)))
        if #available(iOS 17.0, *) {
            WButton(intent: on ? PageIntent(kind, delta) : nil, fallback: nil) { label }
        } else {
            label
        }
    }
}

/// Entries every minute for a while (a clock without seconds that keeps time), then a fresh timeline.
func minuteDates(hours: Double = 2) -> [Date] {
    let now = Date()
    let first = Date(timeIntervalSince1970: floor(now.timeIntervalSince1970 / 60) * 60)
    return [now] + (1..<Int(hours * 60)).map { first.addingTimeInterval(TimeInterval($0 * 60)) }
}

func clockText(_ d: Date) -> String {
    let c = Calendar.current.dateComponents([.hour, .minute], from: d)
    let h = (c.hour ?? 0) % 12
    return "\(h == 0 ? 12 : h):" + String(format: "%02d", c.minute ?? 0)
}

/// The widget's size handed to a view as a value (so the same views can be drawn outside a widget, for the previews)
struct WithFamily<V: View>: View {
    @Environment(\.widgetFamily) private var f
    let make: (WidgetFamily) -> V
    var body: some View { make(f) }
}
