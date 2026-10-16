import SwiftUI
import WidgetKit

@main
struct DriveCastWidgets: WidgetBundle {
    var body: some Widget {
        IslandLiveActivity()
        PrayerWidget()
    }
}

// MARK: - home-screen prayer widget (the next prayer, counting down by itself)

struct PrayerEntry: TimelineEntry {
    let date: Date
    let title: String
    let at: Date?
    let kind: String
    let times: [(String, String, Bool)]
}

struct PrayerProvider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(date: Date(), title: "المغرب", at: Date().addingTimeInterval(3600), kind: "azan", times: [])
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        completion(entries(from: Date(), events: DCShared.events()).first ?? placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        let list = entries(from: Date(), events: DCShared.events())
        if !list.isEmpty && list.first?.at != nil {
            completion(Timeline(entries: list, policy: .after(Date().addingTimeInterval(6 * 3600))))
            return
        }
        // nothing shared by the app (sideloaded without an App Group): the widget reads the prayer times itself
        CloudPrayers.fetch { events in
            let l = entries(from: Date(), events: events)
            completion(Timeline(entries: l.isEmpty ? [placeholder(in: context)] : l, policy: .after(Date().addingTimeInterval(l.isEmpty ? 1800 : 6 * 3600))))
        }
    }

    /// One entry now and one at each adhan, so the widget moves on to the next prayer by itself.
    private func entries(from now: Date, events: [(title: String, at: Date, kind: String)]) -> [PrayerEntry] {
        let all = events.filter { $0.kind == "azan" }
        let cal = Calendar.current
        var out: [PrayerEntry] = []
        var moments = [now]
        moments += all.map { $0.at }.filter { $0 > now }.prefix(8)
        for m in moments {
            let next = all.first { $0.at > m }
            let today = all.filter { cal.isDate($0.at, inSameDayAs: m) }.map { ($0.title, DCShared.time12($0.at), $0.at <= m) }
            out.append(PrayerEntry(date: m, title: next?.title ?? "", at: next?.at, kind: "azan", times: today))
        }
        return out
    }
}

struct PrayerWidgetView: View {
    let e: PrayerEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        VStack(alignment: .trailing, spacing: 6) {
            HStack {
                if let at = e.at {
                    Text(at, style: .timer)
                        .font(DC.font(family == .systemSmall ? 22 : 30))
                        .foregroundColor(DC.emerald)
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 0) {
                    Text(e.title.isEmpty ? (DCShared.groupWorks ? "افتح التطبيق مرة" : "أعد التثبيت") : e.title).font(DC.font(22)).foregroundColor(.white)
                    if let at = e.at { Text("الأذان · " + DCShared.time12(at)).font(DC.font(11, "Bold")).foregroundColor(.white.opacity(0.45)) }
                }
                IconSquare(kind: "azan", size: 40)
            }
            if family != .systemSmall {
                Spacer(minLength: 0)
                HStack(spacing: 6) {
                    ForEach(Array(e.times.enumerated()), id: \.offset) { _, t in
                        VStack(spacing: 2) {
                            Text(t.0).font(DC.font(11, "Bold")).foregroundColor(.white.opacity(t.2 ? 0.35 : 0.8))
                            Text(t.1).font(DC.font(17, "Medium")).foregroundColor(.white.opacity(t.2 ? 0.3 : 0.95)).monospacedDigit()
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.white.opacity(t.0 == e.title ? 0.15 : 0.05)))
                    }
                }
                .environment(\.layoutDirection, .rightToLeft)
            }
        }
        .padding(family == .systemSmall ? 2 : 4)
    }
}

struct PrayerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DriveCastPrayer", provider: PrayerProvider()) { e in
            if #available(iOS 17.0, *) {
                PrayerWidgetView(e: e).containerBackground(DC.card, for: .widget)
            } else {
                PrayerWidgetView(e: e).padding().background(DC.card)
            }
        }
        .configurationDisplayName("الصلاة")
        .description("الصلاة القادمة مع عدّاد ومواقيت اليوم")
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
