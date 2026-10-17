import AppIntents
import SwiftUI
import WidgetKit

/// The day's adhan / iqamah times: what the app shared, else worked out here from the cloud.
func widgetEvents() async -> [Cloud.Event] {
    let shared = DCShared.events().map { Cloud.Event(title: $0.title, at: $0.at, kind: $0.kind) }
    if shared.contains(where: { $0.at > Date() }) { return shared }
    return await Cloud.dayEvents()
}

// MARK: - the day (the dashboard's day card): Hijri date + occasion, the day's name, the time, the next adhan / iqamah

struct DayEntry: TimelineEntry {
    let date: Date
    let hijri: String
    let occasion: String?
    let dayName: String
    let next: String?
    let nextAt: Date?
}

struct DayProvider: TimelineProvider {
    func placeholder(in context: Context) -> DayEntry {
        DayEntry(date: Date(), hijri: Hijri.text(), occasion: Hijri.label(), dayName: Hijri.longDays[0], next: "المغرب", nextAt: Date().addingTimeInterval(3600))
    }

    func getSnapshot(in context: Context, completion: @escaping (DayEntry) -> Void) {
        Task { completion(Self.entries(await widgetEvents()).first ?? placeholder(in: context)) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DayEntry>) -> Void) {
        Task { completion(Timeline(entries: Self.entries(await widgetEvents()), policy: .atEnd)) }
    }

    static func entries(_ events: [Cloud.Event]) -> [DayEntry] {
        minuteDates(hours: 2).map { d in
            // the next adhan - or, between an adhan and its iqamah, the time left to the iqamah
            let n = events.first { ($0.kind == "azan" || $0.kind == "iqamah") && $0.at > d }
            var title = n?.title
            if n?.kind == "iqamah", let t = title, !t.contains("إقامة") { title = "إقامة " + t }
            let wd = Calendar.current.component(.weekday, from: d) - 1
            return DayEntry(date: d, hijri: Hijri.text(d), occasion: Hijri.label(d), dayName: Hijri.longDays[wd], next: title, nextAt: n?.at)
        }
    }
}

struct DayWidgetView: View {
    let e: DayEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        let small = family == .systemSmall
        VStack(spacing: small ? 2 : 4) {
            Text(e.hijri + (e.occasion.map { "  •  " + $0 } ?? ""))
                .font(DC.font(small ? 10 : 13, "Bold")).foregroundColor(DC.emerald).lineLimit(1).minimumScaleFactor(0.6)
            Text(e.dayName).font(DC.font(small ? 26 : 38)).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.5)
            Text(clockText(e.date)).font(DC.font(small ? 20 : 26, "Bold")).foregroundColor(.white.opacity(0.75)).monospacedDigit()
            if let n = e.next, let at = e.nextAt {
                HStack(spacing: 8) {
                    Text(n).font(DC.font(small ? 11 : 14, "Bold")).foregroundColor(.white.opacity(0.7)).lineLimit(1)
                    Text(timerInterval: e.date...max(e.date, at), countsDown: true)
                        .font(DC.font(small ? 14 : 18)).monospacedDigit()
                        .foregroundColor(n.contains("إقامة") ? DC.emerald : DC.blue)
                        .environment(\.layoutDirection, .leftToRight)
                        .frame(width: small ? 62 : 78)
                }
                .padding(.horizontal, 10).padding(.vertical, 3)
                .background(Capsule().fill(Color.white.opacity(0.07)))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetURL(DCLink.open("/dashboard"))
    }
}

struct DayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DriveCastDay", provider: DayProvider()) { e in
            DayWidgetView(e: e).dcBackground()
        }
        .configurationDisplayName("اليوم")
        .description("التاريخ الهجري والمناسبة، اسم اليوم، الوقت، والمتبقي للأذان أو الإقامة")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - the clock (the dashboard's)

struct ClockEntry: TimelineEntry { let date: Date }

struct ClockProvider: TimelineProvider {
    func placeholder(in context: Context) -> ClockEntry { ClockEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (ClockEntry) -> Void) { completion(ClockEntry(date: Date())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<ClockEntry>) -> Void) {
        completion(Timeline(entries: minuteDates(hours: 3).map { ClockEntry(date: $0) }, policy: .atEnd))
    }
}

struct ClockWidgetView: View {
    let e: ClockEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        let d = e.date
        let g = Calendar(identifier: .gregorian).dateComponents([.day, .month], from: d)
        VStack(spacing: 2) {
            Text(clockText(d))
                .font(DC.font(family == .systemSmall ? 52 : 74))
                .foregroundStyle(LinearGradient(colors: [.white, .white.opacity(0.55)], startPoint: .top, endPoint: .bottom))
                .monospacedDigit().lineLimit(1).minimumScaleFactor(0.5)
                .environment(\.layoutDirection, .leftToRight)
            Text("\(Hijri.days[Calendar.current.component(.weekday, from: d) - 1]) · \(g.day ?? 1) \(Hijri.gregMonths[(g.month ?? 1) - 1])")
                .font(DC.font(13, "Bold")).foregroundColor(.white.opacity(0.5)).lineLimit(1).minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetURL(DCLink.open("/dashboard"))
    }
}

struct ClockWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DriveCastClock", provider: ClockProvider()) { e in
            ClockWidgetView(e: e).dcBackground()
        }
        .configurationDisplayName("الساعة")
        .description("ساعة اللوحة")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - the moon (phase photo + Hijri / Gregorian date / weather; a tap shows the next)

struct MoonEntry: TimelineEntry {
    let date: Date
    let photo: UIImage?
    let value: String
    let sub: String
    let label: String
    let mode: Int
}

struct MoonProvider: TimelineProvider {
    func placeholder(in context: Context) -> MoonEntry {
        MoonEntry(date: Date(), photo: nil, value: "١٥", sub: "ربيع الآخر", label: "الهجري", mode: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (MoonEntry) -> Void) {
        Task { completion(await entry()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MoonEntry>) -> Void) {
        Task {
            let e = await entry()
            let midnight = Calendar.current.startOfDay(for: Date()).addingTimeInterval(86400 + 60)
            completion(Timeline(entries: [e], policy: .after(min(midnight, Date().addingTimeInterval(e.mode == 2 ? 1800 : 6 * 3600)))))
        }
    }

    private func entry() async -> MoonEntry {
        let mode = WState.d.integer(forKey: "moonMode") % 3
        let h = Hijri.date()
        let photo = await Cloud.image("https://phasesmoon.com/moonpng/220/moon-phase-\(max(1, min(30, h.day))).webp", maxPx: 260)
        switch mode {
        case 0:
            return MoonEntry(date: Date(), photo: photo, value: arabicDigits("\(h.day)"), sub: Hijri.months[h.month], label: "الهجري", mode: 0)
        case 1:
            let g = Calendar(identifier: .gregorian).dateComponents([.day, .month], from: Date())
            return MoonEntry(date: Date(), photo: photo, value: "\(g.day ?? 1)", sub: Hijri.gregMonths[(g.month ?? 1) - 1], label: "الميلادي", mode: 1)
        default:
            let w = await weather()
            return MoonEntry(date: Date(), photo: photo, value: w.map { "\(Int($0.t.rounded()))°" } ?? "--", sub: weatherText(w?.code ?? -1), label: "الرصد الجوي", mode: 2)
        }
    }

    /// Salalah's weather now (open-meteo, like the site)
    private func weather() async -> (t: Double, code: Int)? {
        guard let u = URL(string: "https://api.open-meteo.com/v1/forecast?latitude=17.0151&longitude=54.0924&current=temperature_2m,weather_code&timezone=Asia%2FMuscat"),
              let d = try? await URLSession.shared.data(from: u).0,
              let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any],
              let c = o["current"] as? [String: Any], let t = (c["temperature_2m"] as? NSNumber)?.doubleValue else { return nil }
        return (t, (c["weather_code"] as? NSNumber)?.intValue ?? -1)
    }

    private func weatherText(_ code: Int) -> String {
        switch code {
        case 0: return "صافٍ"
        case 1, 2: return "غائم جزئياً"
        case 3: return "غائم"
        case 45, 48: return "ضباب"
        case 51...57: return "رذاذ"
        case 61...67, 80...82: return "أمطار"
        case 95...99: return "عواصف رعدية"
        case -1: return ""
        default: return "متقلب"
        }
    }
}

func arabicDigits(_ s: String) -> String {
    let d = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]
    return s.map { c in c.wholeNumberValue.map { d[$0] } ?? String(c) }.joined()
}

struct MoonWidgetView: View {
    let e: MoonEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        WButton(intent: stepIntent, fallback: nil) {
            ZStack {
                if let p = e.photo {
                    Image(uiImage: p).resizable().scaledToFit().opacity(0.85)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                LinearGradient(colors: [.clear, .black.opacity(0.75)], startPoint: .center, endPoint: .bottom)
                VStack(spacing: 0) {
                    Spacer()
                    Text(e.value).font(DC.font(family == .systemSmall ? 34 : 44)).foregroundColor(.white).shadow(radius: 6)
                    Text(e.sub).font(DC.font(13, "Bold")).foregroundColor(.white.opacity(0.85)).lineLimit(1)
                    Text(e.label).font(DC.font(10, "Bold")).foregroundColor(DC.emerald.opacity(0.9))
                }
                .padding(.bottom, 4)
            }
        }
    }

    private var stepIntent: (any AppIntent)? {
        if #available(iOS 17.0, *) { return StepIntent("moonMode") }
        return nil
    }
}

struct MoonWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DriveCastMoon", provider: MoonProvider()) { e in
            MoonWidgetView(e: e).dcBackground(.black)
        }
        .configurationDisplayName("القمر")
        .description("طور القمر الليلة مع التاريخ الهجري / الميلادي / الطقس (اضغط للتبديل)")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
