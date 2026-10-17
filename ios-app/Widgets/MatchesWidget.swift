import AppIntents
import SwiftUI
import WidgetKit

// MARK: - the matches widget (like Android's: favourites' live first, pages with ‹ ›, ⟳)

struct MatchRow: Identifiable {
    let id: String
    let home: String
    let away: String
    let homeLogo: UIImage?
    let awayLogo: UIImage?
    let sh: Int
    let sa: Int
    let status: String
    let minute: String
    let time: String
    let fav: Bool
    let league: String
}

struct MatchesEntry: TimelineEntry {
    let date: Date
    let rows: [MatchRow]
    let heading: String
    let pageText: String
    let hasPrev: Bool
    let hasNext: Bool
    let empty: String
}

enum MatchesStore {
    private static var file: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("dc-matches.json")
    }

    /// The matches (fresh after `maxAge`, the kept copy for a page change or when offline).
    static func load(maxAge: TimeInterval) async -> [[String: Any]] {
        let attrs = try? FileManager.default.attributesOfItem(atPath: file.path)
        let age = Date().timeIntervalSince((attrs?[.modificationDate] as? Date) ?? .distantPast)
        let refreshAsked = Date().timeIntervalSince1970 - WState.d.double(forKey: "refresh_matches") < 20
        if age > maxAge || refreshAsked, let fresh = await Cloud.matches() {
            WState.d.set(0, forKey: "refresh_matches")
            if let d = try? JSONSerialization.data(withJSONObject: ["matches": fresh]) { try? d.write(to: file) }
            return fresh
        }
        if let d = try? Data(contentsOf: file), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] {
            return o["matches"] as? [[String: Any]] ?? []
        }
        return []
    }

    static func rank(_ m: [String: Any]) -> Int {
        let s = m["status"] as? String ?? ""
        if s == "live" { return (m["favorite"] as? Bool ?? false) ? 0 : 1 }
        return s == "upcoming" ? 2 : 3
    }
}

struct MatchesProvider: TimelineProvider {
    func placeholder(in context: Context) -> MatchesEntry {
        MatchesEntry(date: Date(), rows: [], heading: "مباريات فرقي ⚽", pageText: "", hasPrev: false, hasNext: false, empty: "")
    }

    func getSnapshot(in context: Context, completion: @escaping (MatchesEntry) -> Void) {
        Task { completion(await entry(family: context.family, maxAge: 1800)) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MatchesEntry>) -> Void) {
        Task {
            let e = await entry(family: context.family, maxAge: 120)
            // live: fresh scores every few minutes (iOS may space them out); otherwise every half hour
            let live = e.rows.contains { $0.status == "live" }
            completion(Timeline(entries: [e], policy: .after(Date().addingTimeInterval(live ? 300 : 1800))))
        }
    }

    static func perPage(_ f: WidgetFamily) -> Int {
        switch f {
        case .systemSmall: return 3
        case .systemLarge, .systemExtraLarge: return 7
        default: return 3
        }
    }

    func entry(family: WidgetFamily, maxAge: TimeInterval) async -> MatchesEntry {
        let list = await MatchesStore.load(maxAge: maxAge).sorted {
            let a = MatchesStore.rank($0), b = MatchesStore.rank($1)
            if a != b { return a < b }
            return (($0["timestamp"] as? NSNumber)?.doubleValue ?? 0) < (($1["timestamp"] as? NSNumber)?.doubleValue ?? 0)
        }
        // pages: ‹ the finished ones · the live and upcoming (the first) · › the rest by kick-off time
        let done = list.filter { ($0["status"] as? String) == "finished" }
        let active = list.filter { ($0["status"] as? String) != "finished" }
        let per = Self.perPage(family)
        let pages = max(1, (active.count + per - 1) / per)
        let minPage = done.isEmpty ? 0 : -1
        var page = max(minPage, min(pages - 1, WState.page("matches")))
        if page != WState.page("matches") { WState.setPage("matches", page) }
        var shown: [[String: Any]]
        var heading = "مباريات فرقي ⚽", pageText = ""
        if page < 0 {
            heading = "المنتهية ✓"
            shown = Array(done.suffix(per))
        } else {
            page = max(0, page)
            shown = Array(active.dropFirst(page * per).prefix(per))
            if page > 0 { heading = "التالية" }
            if pages > 1 { pageText = "\(page + 1)/\(pages)" }
        }
        if shown.isEmpty && page == 0 && !done.isEmpty { shown = Array(done.suffix(per)); heading = "المنتهية ✓" }
        var rows: [MatchRow] = []
        for m in shown {
            let h = m["home"] as? [String: Any] ?? [:], a = m["away"] as? [String: Any] ?? [:]
            let score = m["score"] as? [String: Any]
            let st = m["status"] as? String ?? ""
            let el = (m["elapsed"] as? NSNumber)?.intValue
            async let hl = Cloud.image(h["logo"] as? String, maxPx: 72)
            async let al = Cloud.image(a["logo"] as? String, maxPx: 72)
            rows.append(MatchRow(id: "\(m["id"] ?? UUID().uuidString)", home: h["name"] as? String ?? "", away: a["name"] as? String ?? "",
                                 homeLogo: await hl, awayLogo: await al,
                                 sh: (score?["home"] as? NSNumber)?.intValue ?? 0, sa: (score?["away"] as? NSNumber)?.intValue ?? 0,
                                 status: st, minute: st == "live" ? (el.map { "\($0)'" } ?? "مباشر") : "",
                                 time: Self.time12(m["omanTime"] as? String ?? ""), fav: m["favorite"] as? Bool ?? false,
                                 league: (m["league"] as? [String: Any])?["name"] as? String ?? (m["league"] as? String ?? "")))
        }
        return MatchesEntry(date: Date(), rows: rows, heading: heading, pageText: pageText,
                            hasPrev: page > minPage, hasNext: page >= 0 && page < pages - 1,
                            empty: list.isEmpty ? "لا مباريات لفرقك اليوم" : "")
    }

    static func time12(_ hhmm: String) -> String {
        let p = hhmm.split(separator: ":")
        guard p.count >= 2, let h = Int(p[0]) else { return hhmm }
        return "\(h % 12 == 0 ? 12 : h % 12):\(p[1].prefix(2))"
    }
}

struct MatchesWidgetView: View {
    let e: MatchesEntry
    var family: WidgetFamily = .systemMedium

    var body: some View {
        let small = family == .systemSmall
        VStack(spacing: small ? 4 : 5) {
            // one bar on top: ⟳ ‹ › on the left, the title and page on the right (the rows get the rest)
            HStack(spacing: 6) {
                refresh
                PagerButtons(kind: "matches", hasPrev: e.hasPrev, hasNext: e.hasNext, size: small ? 20 : 22)
                Spacer(minLength: 2)
                if !small { Text(e.pageText).font(DC.font(10, "Bold")).foregroundColor(.white.opacity(0.4)).monospacedDigit() }
                Text(small ? (e.pageText.isEmpty ? "⚽" : e.pageText) : e.heading).font(DC.font(small ? 11 : 13)).foregroundColor(.white.opacity(0.85)).lineLimit(1)
            }
            .environment(\.layoutDirection, .leftToRight)
            if e.rows.isEmpty {
                Spacer()
                Text(e.empty.isEmpty ? "جاري تحميل المباريات..." : e.empty).font(DC.font(13, "Bold")).foregroundColor(.white.opacity(0.5))
                Spacer()
            } else {
                ForEach(e.rows) { r in row(r, small: small) }
                Spacer(minLength: 0)
            }
        }
        .widgetURL(DCLink.open("/matches"))
    }

    private var refresh: some View {
        WButton(intent: refreshIntent, fallback: nil) {
            Text("⟳").font(.system(size: family == .systemSmall ? 14 : 17, weight: .heavy)).foregroundColor(.white.opacity(0.7))
                .frame(width: family == .systemSmall ? 20 : 24, height: family == .systemSmall ? 20 : 22)
                .background(Circle().fill(Color.white.opacity(0.1)))
        }
    }

    private var refreshIntent: (any AppIntent)? {
        if #available(iOS 17.0, *) { return RefreshIntent("matches") }
        return nil
    }

    @ViewBuilder private func row(_ r: MatchRow, small: Bool) -> some View {
        let logo: CGFloat = small ? 22 : 26
        HStack(spacing: 5) {
            RoundPic(image: r.homeLogo, name: r.home, size: logo)
            if !small { Text(r.home).font(DC.font(12, "Bold")).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.7).frame(maxWidth: .infinity, alignment: .leading) }
            HStack(spacing: 3) {
                if r.status == "upcoming" {
                    Text(r.time).font(DC.font(small ? 14 : 17)).foregroundColor(.white.opacity(0.9))
                } else {
                    Text("\(r.sh)-\(r.sa)").font(DC.font(small ? 15 : 18))
                        .foregroundColor(r.status == "live" ? DC.emerald : .white.opacity(0.75))
                }
                if r.status == "live" {
                    Text(r.minute).font(DC.font(small ? 8 : 9)).foregroundColor(.white)
                        .padding(.horizontal, 4).padding(.vertical, 1).background(Capsule().fill(DC.red))
                } else if r.status == "finished" && !small {
                    Text("انتهت").font(DC.font(9, "Bold")).foregroundColor(.white.opacity(0.4))
                }
            }
            .monospacedDigit()
            .lineLimit(1)
            .frame(minWidth: small ? 40 : 64)
            if !small { Text(r.away).font(DC.font(12, "Bold")).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.7).frame(maxWidth: .infinity, alignment: .trailing) }
            RoundPic(image: r.awayLogo, name: r.away, size: logo)
        }
        .environment(\.layoutDirection, .leftToRight)
        .padding(.horizontal, 5)
        .padding(.vertical, 3)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 11, style: .continuous)
                .fill(Color.white.opacity(r.status == "live" ? 0.09 : 0.04))
                .overlay(RoundedRectangle(cornerRadius: 11, style: .continuous)
                    .stroke(r.fav && r.status == "live" ? DC.yellow.opacity(0.6) : .clear, lineWidth: 1.2))
        )
    }
}

struct MatchesWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DriveCastMatches", provider: MatchesProvider()) { e in
            WithFamily { MatchesWidgetView(e: e, family: $0) }.dcBackground()
        }
        .configurationDisplayName("المباريات")
        .description("مباريات فرقك اليوم: المباشرة أولاً، صفحات ‹ ›، تحديث ⟳")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
