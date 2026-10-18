import AppIntents
import SwiftUI
import WidgetKit

// MARK: - reciters / subscriptions / folders: pages of pictures with ‹ › at the bottom; a tap opens it in the app
// (medium: one row of circles like Android's wide widget, large: one column like its tall one)

/// Reciters widget: tap a reciter, then a surah → YouTube opens straight on that recitation (no app in between).
enum Quran {
    static let surahs: [String] = ["الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر", "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق", "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج", "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس", "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد", "الإخلاص", "الفلق", "الناس"]
    static let key = "reciter_sel"
    static var picked: String? {
        guard let s = WState.d.string(forKey: key), !s.isEmpty else { return nil }
        // back to the reciters after 3 minutes untouched
        if Date().timeIntervalSince1970 - WState.d.double(forKey: key + "_at") > 180 { return nil }
        return s
    }
    static func youtube(_ q: String) -> URL {
        var c = URLComponents(string: "https://www.youtube.com/results")!
        c.queryItems = [URLQueryItem(name: "search_query", value: q)]
        return c.url!
    }
}

@available(iOS 17.0, *)
struct ReciterIntent: AppIntent {
    static var title: LocalizedStringResource = "القارئ"
    @Parameter(title: "Name") var name: String
    init() {}
    init(_ name: String) { self.name = name }
    func perform() async throws -> some IntentResult {
        WState.d.set(name, forKey: Quran.key)
        WState.d.set(name.isEmpty ? 0 : Date().timeIntervalSince1970, forKey: Quran.key + "_at")
        WState.setPage("surahs", 0)
        return .result()
    }
}

struct BrowseItem: Identifiable {
    let id: String
    let name: String
    let image: UIImage?
    let link: URL
    var starred = false
    var sub = ""
}

struct BrowseEntry: TimelineEntry {
    let date: Date
    let kind: String
    let items: [BrowseItem]
    let hasPrev: Bool
    let hasNext: Bool
    let pageText: String
    let empty: String
    var reciter: String? = nil   // a reciter was picked: the items are surahs
}

struct BrowseProvider: TimelineProvider {
    let kind: String // reciters | channels | folders

    func placeholder(in context: Context) -> BrowseEntry {
        BrowseEntry(date: Date(), kind: kind, items: [], hasPrev: false, hasNext: false, pageText: "", empty: "")
    }

    func getSnapshot(in context: Context, completion: @escaping (BrowseEntry) -> Void) {
        Task { completion(await entry(context.family)) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BrowseEntry>) -> Void) {
        Task {
            let e = await entry(context.family)
            completion(Timeline(entries: [e], policy: .after(Date().addingTimeInterval(e.items.isEmpty ? 900 : 3 * 3600))))
        }
    }

    static func perPage(_ f: WidgetFamily) -> Int {
        switch f {
        case .systemSmall: return 4
        case .systemLarge, .systemExtraLarge: return 6
        default: return 4
        }
    }

    private struct Raw { let id: String; let name: String; let image: String; let link: URL; let starred: Bool; let sub: String }

    private func raw() async -> [Raw] {
        switch kind {
        case "reciters":
            let r = await Cloud.list(Cloud.reciters, "reciters", maxAge: 6 * 3600)
                .sorted { (($0["clickschannel"] as? NSNumber)?.intValue ?? 0) > (($1["clickschannel"] as? NSNumber)?.intValue ?? 0) }
            return r.map {
                let id = $0["channelid"] as? String ?? $0["id"] as? String ?? ""
                let name = $0["name"] as? String ?? $0["channeltitle"] as? String ?? ""
                return Raw(id: id, name: name, image: $0["image"] as? String ?? "", link: DCLink.cmd("/media", "reciter", id.isEmpty ? name : id), starred: false, sub: "")
            }
        case "folders":
            let m = await Cloud.masterData(maxAge: 3 * 3600)
            return ((m["playlists"] as? [[String: Any]]) ?? []).map {
                let id = "\($0["id"] ?? "")"
                let vids = ($0["videos"] as? [[String: Any]]) ?? []
                return Raw(id: id, name: $0["name"] as? String ?? "", image: vids.first?["thumbnail"] as? String ?? "",
                           link: DCLink.cmd("/media", "play", "pl:" + id), starred: false, sub: "\(vids.count) فيديو")
            }
        default:
            let c = await Cloud.list(Cloud.channels, "channels", maxAge: 6 * 3600)
            let all = c.map {
                let id = $0["channelid"] as? String ?? $0["id"] as? String ?? ""
                return Raw(id: id, name: $0["name"] as? String ?? "", image: $0["image"] as? String ?? "",
                           link: id.hasPrefix("UC") ? URL(string: "https://www.youtube.com/channel/" + id)! : DCLink.cmd("/media", "channel", id),
                           starred: $0["starred"] as? Bool ?? false, sub: "")
            }
            return all.filter(\.starred) + all.filter { !$0.starred }
        }
    }

    func entry(_ f: WidgetFamily) async -> BrowseEntry {
        if kind == "reciters", let r = Quran.picked {
            let per = f == .systemLarge ? 18 : 8
            let all = Quran.surahs.enumerated().map { i, n in
                BrowseItem(id: "s\(i)", name: n, image: nil, link: Quran.youtube("\(r) سورة \(n)"), sub: "\(i + 1)")
            }
            let pages = (all.count + per - 1) / per
            let page = max(0, min(pages - 1, WState.page("surahs")))
            let from = page * per + 1, to = min(all.count, (page + 1) * per)
            return BrowseEntry(date: Date(), kind: "surahs", items: Array(all.dropFirst(page * per).prefix(per)), hasPrev: page > 0, hasNext: page < pages - 1,
                               pageText: "\(from)-\(to) / 114", empty: "", reciter: r)
        }
        let all = await raw()
        let per = Self.perPage(f)
        let pages = max(1, (all.count + per - 1) / per)
        let page = max(0, min(pages - 1, WState.page(kind)))
        var items: [BrowseItem] = []
        let px: CGFloat = kind == "folders" ? 240 : 140
        for r in all.dropFirst(page * per).prefix(per) {
            items.append(BrowseItem(id: r.id + r.name, name: r.name, image: await Cloud.image(r.image, maxPx: px), link: r.link, starred: r.starred, sub: r.sub))
        }
        let from = page * per + 1, to = min(all.count, (page + 1) * per)
        return BrowseEntry(date: Date(), kind: kind, items: items, hasPrev: page > 0, hasNext: page < pages - 1,
                           pageText: all.isEmpty ? "" : "\(from)-\(to) / \(all.count)",
                           empty: kind == "folders" ? "لا توجد مجلدات" : "جاري التحميل...")
    }
}

struct BrowseWidgetView: View {
    let e: BrowseEntry
    var family: WidgetFamily = .systemMedium

    var body: some View {
        if e.kind == "surahs" { surahsView } else { listView }
    }

    /// The picked reciter's surahs: a tap opens YouTube on that recitation.
    private var surahsView: some View {
        VStack(spacing: 6) {
            HStack {
                if #available(iOS 17.0, *) {
                    WButton(intent: ReciterIntent(""), fallback: nil) {
                        Text("‹ القرّاء").font(DC.font(11, "Bold")).foregroundColor(.white.opacity(0.8))
                            .padding(.horizontal, 8).padding(.vertical, 3).background(Capsule().fill(Color.white.opacity(0.12)))
                    }
                }
                Spacer()
                Text(e.reciter ?? "").font(DC.font(13)).foregroundColor(DC.emerald).lineLimit(1)
            }
            .environment(\.layoutDirection, .leftToRight)
            let cols = Array(repeating: GridItem(.flexible(), spacing: 5), count: family == .systemLarge ? 3 : 4)
            LazyVGrid(columns: cols, spacing: 5) {
                ForEach(e.items) { it in
                    Link(destination: it.link) {
                        Text(it.name).font(DC.font(11, "Bold")).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.6)
                            .frame(maxWidth: .infinity).padding(.vertical, 6)
                            .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(DC.emerald.opacity(0.14)))
                    }
                }
            }
            .environment(\.layoutDirection, .rightToLeft)
            Spacer(minLength: 0)
            HStack(spacing: 8) {
                PagerButtons(kind: "surahs", hasPrev: e.hasPrev, hasNext: e.hasNext, size: 24)
                Text(e.pageText).font(DC.font(10, "Bold")).foregroundColor(.white.opacity(0.4)).monospacedDigit()
                Spacer()
            }
            .environment(\.layoutDirection, .leftToRight)
        }
    }

    /// A reciter opens his surahs inside the widget (iOS 17); other items open their link.
    @ViewBuilder private func tap<V: View>(_ it: BrowseItem, @ViewBuilder _ label: () -> V) -> some View {
        let v = label()
        if e.kind == "reciters", #available(iOS 17.0, *) {
            WButton(intent: ReciterIntent(it.name), fallback: it.link) { v }
        } else {
            Link(destination: it.link) { v }
        }
    }

    private var listView: some View {
        VStack(spacing: 6) {
            if e.items.isEmpty {
                Spacer()
                Text(e.empty).font(DC.font(13, "Bold")).foregroundColor(.white.opacity(0.5))
                Spacer()
            } else if family == .systemLarge {
                ForEach(e.items) { it in
                    tap(it) {
                        HStack(spacing: 10) {
                            picture(it, size: 46)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(it.name).font(DC.font(15)).foregroundColor(.white).lineLimit(1)
                                if !it.sub.isEmpty { Text(it.sub).font(DC.font(10, "Bold")).foregroundColor(.white.opacity(0.45)) }
                            }
                            Spacer(minLength: 0)
                            if it.starred { Text("★").font(.system(size: 13)).foregroundColor(DC.yellow) }
                        }
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.white.opacity(0.05)))
                    }
                }
                Spacer(minLength: 0)
            } else {
                HStack(alignment: .top, spacing: 6) {
                    ForEach(e.items) { it in
                        tap(it) {
                            VStack(spacing: 4) {
                                picture(it, size: family == .systemSmall ? 46 : 58)
                                Text(it.name).font(DC.font(10, "Bold")).foregroundColor(.white.opacity(0.85)).lineLimit(1).minimumScaleFactor(0.7)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                }
                .environment(\.layoutDirection, .rightToLeft)
                Spacer(minLength: 0)
            }
            // ‹ › fixed at the bottom left, the page beside them
            HStack(spacing: 8) {
                PagerButtons(kind: e.kind, hasPrev: e.hasPrev, hasNext: e.hasNext, size: 24)
                Text(e.pageText).font(DC.font(10, "Bold")).foregroundColor(.white.opacity(0.4)).monospacedDigit()
                Spacer()
            }
            .environment(\.layoutDirection, .leftToRight)
        }
        .widgetURL(DCLink.open("/media"))
    }

    @ViewBuilder private func picture(_ it: BrowseItem, size: CGFloat) -> some View {
        if e.kind == "folders" {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color.white.opacity(0.07))
                if let i = it.image { Image(uiImage: i).resizable().scaledToFill() } else { Text("📁").font(.system(size: size * 0.45)) }
            }
            .frame(width: size * 1.5, height: size)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        } else {
            RoundPic(image: it.image, name: it.name, size: size, fill: true)
                .overlay(Circle().stroke(e.kind == "reciters" ? DC.emerald.opacity(0.4) : it.starred ? DC.yellow.opacity(0.6) : .clear, lineWidth: 2))
        }
    }
}

struct RecitersWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DriveCastReciters", provider: BrowseProvider(kind: "reciters")) { e in
            WithFamily { BrowseWidgetView(e: e, family: $0) }.dcBackground()
        }
        .configurationDisplayName("القرّاء")
        .description("نخبة القرّاء، الأكثر استماعاً أولاً، اضغط على القارئ ليفتح")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct ChannelsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DriveCastChannels", provider: BrowseProvider(kind: "channels")) { e in
            WithFamily { BrowseWidgetView(e: e, family: $0) }.dcBackground()
        }
        .configurationDisplayName("الاشتراكات")
        .description("قنواتك المفضلة (المميّزة ★ أولاً)، اضغط على القناة لتفتح")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct FoldersWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DriveCastFolders", provider: BrowseProvider(kind: "folders")) { e in
            WithFamily { BrowseWidgetView(e: e, family: $0) }.dcBackground()
        }
        .configurationDisplayName("المجلدات")
        .description("مجلدات الفيديو، اضغط على المجلد ليُشغَّل")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - the controls: the microphone and show / hide the islands

struct ControlsEntry: TimelineEntry { let date: Date }

struct ControlsProvider: TimelineProvider {
    func placeholder(in context: Context) -> ControlsEntry { ControlsEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (ControlsEntry) -> Void) { completion(ControlsEntry(date: Date())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<ControlsEntry>) -> Void) {
        completion(Timeline(entries: [ControlsEntry(date: Date())], policy: .never))
    }
}

struct ControlsWidgetView: View {
    var family: WidgetFamily = .systemMedium

    var body: some View {
        if family == .systemSmall {
            // one tap target on a small widget: the microphone
            button("🎤", "أمر صوتي", DC.emerald).widgetURL(DCLink.voice)
        } else {
            HStack(spacing: 10) {
                Link(destination: DCLink.voice) { button("🎤", "أمر صوتي", DC.emerald) }
                Link(destination: DCLink.islands) { button("👁", "إظهار / إخفاء الجزر", DC.blue) }
            }
        }
    }

    private func button(_ icon: String, _ label: String, _ c: Color) -> some View {
        VStack(spacing: 6) {
            Text(icon).font(.system(size: 34))
            Text(label).font(DC.font(11, "Bold")).foregroundColor(.white.opacity(0.75)).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(c.opacity(0.16)))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(c.opacity(0.35), lineWidth: 1))
    }
}

struct ControlsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DriveCastControls", provider: ControlsProvider()) { _ in
            WithFamily { ControlsWidgetView(family: $0) }.dcBackground()
        }
        .configurationDisplayName("التحكم")
        .description("المايكروفون، وإظهار أو إخفاء الجزر")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
