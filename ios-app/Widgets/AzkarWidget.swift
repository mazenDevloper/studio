import AppIntents
import SwiftUI
import WidgetKit

// MARK: - the azkar of now (morning from Fajr until Asr, evening after): a tap counts one, done ones go to the end

struct ZikrRow: Identifiable {
    let id: String
    let label: String
    let text: String
    let need: Int
    let have: Int
}

struct AzkarEntry: TimelineEntry {
    let date: Date
    let title: String
    let doneCount: Int
    let total: Int
    let rows: [ZikrRow]
    let hasPrev: Bool
    let hasNext: Bool
}

struct AzkarProvider: TimelineProvider {
    func placeholder(in context: Context) -> AzkarEntry {
        AzkarEntry(date: Date(), title: "أذكار الصباح", doneCount: 0, total: 11, rows: [], hasPrev: false, hasNext: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (AzkarEntry) -> Void) {
        Task { completion(Self.entry(await widgetEvents(), family: context.family, at: Date())) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<AzkarEntry>) -> Void) {
        Task {
            let ev = await widgetEvents()
            // a new list at Fajr / Asr / midnight
            let now = Date()
            let switches = ev.filter { $0.kind == "azan" && ($0.title.contains("الفجر") || $0.title.contains("العصر")) && $0.at > now }.map(\.at)
            let midnight = Calendar.current.startOfDay(for: now).addingTimeInterval(86400 + 5)
            let next = ([midnight] + switches).min() ?? midnight
            completion(Timeline(entries: [Self.entry(ev, family: context.family, at: now)], policy: .after(next)))
        }
    }

    static func perPage(_ f: WidgetFamily) -> Int { f == .systemLarge ? 6 : 3 }

    static func entry(_ ev: [Cloud.Event], family: WidgetFamily, at: Date) -> AzkarEntry {
        let period = WState.azkarPeriod(ev)
        let counts = WState.azkarCounts()
        let all = AzkarData.items.filter { $0.period == period }.map {
            ZikrRow(id: $0.id, label: $0.label, text: $0.text, need: $0.count, have: min($0.count, counts[$0.id] ?? 0))
        }
        // the ones left first (in their order), then the done ones
        let ordered = all.filter { $0.have < $0.need } + all.filter { $0.have >= $0.need }
        let per = perPage(family)
        let pages = max(1, (ordered.count + per - 1) / per)
        let page = max(0, min(pages - 1, WState.page("azkar")))
        let done = all.filter { $0.have >= $0.need }.count
        return AzkarEntry(date: at, title: period == "morning" ? "أذكار الصباح" : "أذكار المساء", doneCount: done, total: all.count,
                          rows: Array(ordered.dropFirst(page * per).prefix(per)), hasPrev: page > 0, hasNext: page < pages - 1)
    }
}

struct AzkarWidgetView: View {
    let e: AzkarEntry
    var family: WidgetFamily = .systemMedium

    var body: some View {
        let large = family == .systemLarge
        VStack(spacing: 6) {
            HStack {
                PagerButtons(kind: "azkar", hasPrev: e.hasPrev, hasNext: e.hasNext, size: 22)
                Spacer()
                Text("\(e.doneCount)/\(e.total)").font(DC.font(13)).foregroundColor(DC.emerald).monospacedDigit()
                Text(e.title).font(DC.font(15)).foregroundColor(.white)
            }
            .environment(\.layoutDirection, .leftToRight)
            if e.doneCount == e.total && e.total > 0 && e.rows.allSatisfy({ $0.have >= $0.need }) && !e.hasPrev {
                Spacer()
                Text("✓ أتممت \(e.title)").font(DC.font(18)).foregroundColor(DC.emerald)
                Spacer()
            }
            ForEach(e.rows) { r in
                WButton(intent: zikr(r), fallback: DCLink.open("/football")) {
                    HStack(spacing: 8) {
                        ZStack {
                            Circle().stroke(Color.white.opacity(0.12), lineWidth: 3)
                            Circle().trim(from: 0, to: CGFloat(r.have) / CGFloat(max(1, r.need)))
                                .stroke(DC.emerald, style: StrokeStyle(lineWidth: 3, lineCap: .round)).rotationEffect(.degrees(-90))
                            Text(r.have >= r.need ? "✓" : "\(r.need - r.have)").font(DC.font(12)).foregroundColor(r.have >= r.need ? DC.emerald : .white)
                        }
                        .frame(width: 28, height: 28)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(r.label).font(DC.font(13)).foregroundColor(.white.opacity(r.have >= r.need ? 0.4 : 1)).lineLimit(1)
                            Text(r.text).font(DC.font(10, "Medium")).foregroundColor(.white.opacity(r.have >= r.need ? 0.3 : 0.6))
                                .lineLimit(large ? 2 : 1)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .frame(maxWidth: .infinity)
                    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.white.opacity(r.have >= r.need ? 0.03 : 0.07)))
                    .environment(\.layoutDirection, .rightToLeft)
                }
            }
            Spacer(minLength: 0)
        }
    }

    private func zikr(_ r: ZikrRow) -> (any AppIntent)? {
        if #available(iOS 17.0, *), r.have < r.need { return ZikrIntent(r.id) }
        return nil
    }
}

struct AzkarWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DriveCastAzkar", provider: AzkarProvider()) { e in
            WithFamily { AzkarWidgetView(e: e, family: $0) }.dcBackground()
        }
        .configurationDisplayName("الأذكار")
        .description("أذكار الصباح والمساء، اضغط على الذكر ليُحسب")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}
