import SwiftUI
import WidgetKit

// MARK: - home-screen prayer widget (the next prayer, counting down by itself)

struct PrayerEntry: TimelineEntry {
    let date: Date
    let title: String
    let at: Date?
    /// azan | iqamah: between an adhan and its iqamah the card counts down to the iqamah (like Android)
    let kind: String
    let times: [(String, String, Bool)]
}

struct PrayerProvider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(date: Date(), title: "المغرب", at: Date().addingTimeInterval(3600), kind: "azan", times: [])
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        Task { completion(Self.entries(await widgetEvents()).first ?? placeholder(in: context)) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        Task {
            let list = Self.entries(await widgetEvents())
            completion(Timeline(entries: list.isEmpty ? [placeholder(in: context)] : list,
                                policy: .after(Date().addingTimeInterval(list.isEmpty ? 1800 : 6 * 3600))))
        }
    }

    /// One entry now and one at each adhan and iqamah, so the card moves on by itself.
    static func entries(_ events: [Cloud.Event]) -> [PrayerEntry] {
        let now = Date()
        let all = events.filter { $0.kind == "azan" || $0.kind == "iqamah" }
        let cal = Calendar.current
        var out: [PrayerEntry] = []
        for m in [now] + all.map(\.at).filter { $0 > now }.prefix(14) {
            let next = all.first { $0.at > m }
            var title = next?.title ?? ""
            if next?.kind == "iqamah" && !title.contains("إقامة") { title = "إقامة " + title }
            let today = all.filter { $0.kind == "azan" && cal.isDate($0.at, inSameDayAs: m) }.map { ($0.title, DCShared.time12($0.at), $0.at <= m) }
            out.append(PrayerEntry(date: m, title: title, at: next?.at, kind: next?.kind ?? "azan", times: today))
        }
        return out
    }
}

struct PrayerWidgetView: View {
    let e: PrayerEntry
    var family: WidgetFamily = .systemMedium

    var body: some View {
        let color = DC.color(for: e.kind)
        VStack(alignment: .trailing, spacing: 6) {
            HStack {
                if let at = e.at {
                    Text(at, style: .timer)
                        .font(DC.font(family == .systemSmall ? 22 : 30))
                        .foregroundColor(color)
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 0) {
                    Text(e.title.isEmpty ? "جاري التحميل…" : e.title).font(DC.font(22)).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.6)
                    if let at = e.at { Text((e.kind == "iqamah" ? "الإقامة · " : "الأذان · ") + DCShared.time12(at)).font(DC.font(11, "Bold")).foregroundColor(.white.opacity(0.45)) }
                }
                IconSquare(kind: e.kind, size: 40)
            }
            if family != .systemSmall {
                Spacer(minLength: 0)
                HStack(spacing: 6) {
                    ForEach(Array(e.times.enumerated()), id: \.offset) { _, t in
                        let current = e.title == t.0 || e.title == "إقامة " + t.0
                        VStack(spacing: 2) {
                            Text(t.0).font(DC.font(11, "Bold")).foregroundColor(.white.opacity(t.2 && !current ? 0.35 : 0.8))
                            Text(t.1).font(DC.font(17, "Medium")).foregroundColor(.white.opacity(t.2 && !current ? 0.3 : 0.95)).monospacedDigit()
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(current ? color.opacity(0.22) : Color.white.opacity(0.05)))
                    }
                }
                .environment(\.layoutDirection, .rightToLeft)
            }
        }
        .padding(family == .systemSmall ? 2 : 4)
        .widgetURL(DCLink.open("/dashboard"))
    }
}

struct PrayerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DriveCastPrayer", provider: PrayerProvider()) { e in
            WithFamily { PrayerWidgetView(e: e, family: $0) }.dcBackground()
        }
        .configurationDisplayName("الصلاة")
        .description("الصلاة القادمة مع عدّاد الأذان ثم الإقامة، ومواقيت اليوم")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}


/// The prayer times straight from the cloud (the same bin the site and the Android app read), for when the app
/// can't share them with the widget.
enum CloudPrayers {
    static let bin = "69a00f6eae596e708f4b7291"
    static let key = "$2a$10$SYrYv.ct8hiMU9YeUxEQ.ecRkOrTqs.TDchJRV3wW.aKJnDXy2oVy"
    static let names: [(String, String)] = [("fajr", "الفجر"), ("sunrise", "الشروق"), ("dhuhr", "الظهر"), ("asr", "العصر"), ("maghrib", "المغرب"), ("isha", "العشاء")]

    static func fetch(_ done: @escaping ([(title: String, at: Date, kind: String)]) -> Void) {
        guard let u = URL(string: "https://api.jsonbin.io/v3/b/\(bin)/latest") else { done([]); return }
        var r = URLRequest(url: u, timeoutInterval: 20)
        r.setValue(key, forHTTPHeaderField: "X-Master-Key")
        r.setValue("false", forHTTPHeaderField: "X-Bin-Meta")
        URLSession.shared.dataTask(with: r) { data, _, _ in
            var out: [(title: String, at: Date, kind: String)] = []
            if let data, let o = try? JSONSerialization.jsonObject(with: data) {
                let rows = (o as? [[String: Any]]) ?? ((o as? [String: Any])?["prayers"] as? [[String: Any]]) ?? []
                let cal = Calendar.current
                let f = DateFormatter()
                f.locale = Locale(identifier: "en_US_POSIX")
                f.dateFormat = "yyyy-MM-dd"
                for off in 0...1 {
                    guard let day = cal.date(byAdding: .day, value: off, to: cal.startOfDay(for: Date())) else { continue }
                    let key = f.string(from: day)
                    guard let row = rows.first(where: { ($0["date"] as? String) == key }) else { continue }
                    for (id, name) in names {
                        guard let t = row[id] as? String else { continue }
                        let p = t.split(separator: ":")
                        guard p.count >= 2, let h = Int(p[0].trimmingCharacters(in: .whitespaces)), let m = Int(p[1].prefix(2)) else { continue }
                        out.append((name, day.addingTimeInterval(TimeInterval(h * 3600 + m * 60)), "azan"))
                    }
                }
            }
            done(out.sorted { $0.at < $1.at })
        }.resume()
    }
}
