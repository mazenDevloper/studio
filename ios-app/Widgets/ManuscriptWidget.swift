import AppIntents
import SwiftUI
import WidgetKit

// MARK: - the manuscripts (the board's calligraphy): the pinned one stays, otherwise they take turns every 5 minutes;
// a tap shows the next

struct ManuscriptEntry: TimelineEntry {
    let date: Date
    let art: UIImage?
    let text: String?
    let background: UIImage?
    let ink: Color?
    let pinned: Bool
    let empty: Bool
}

struct ManuscriptProvider: TimelineProvider {
    static let defaultBg = "https://www.image2url.com/r2/default/images/1782382707952-d99447c6-bc60-475d-9406-5fd2ef320bd5.png"

    func placeholder(in context: Context) -> ManuscriptEntry {
        ManuscriptEntry(date: Date(), art: nil, text: "بسم الله الرحمن الرحيم", background: nil, ink: .white, pinned: false, empty: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (ManuscriptEntry) -> Void) {
        Task { completion(await entries(family: context.family, count: 1).first ?? placeholder(in: context)) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ManuscriptEntry>) -> Void) {
        Task {
            let list = await entries(family: context.family, count: 3)
            completion(Timeline(entries: list.isEmpty ? [placeholder(in: context)] : list, policy: .atEnd))
        }
    }

    func entries(family: WidgetFamily, count: Int) async -> [ManuscriptEntry] {
        let items = await Cloud.list(Cloud.manuscripts, "manuscripts", maxAge: 3 * 3600)
        let m = await Cloud.masterData(maxAge: 3 * 3600)
        let ms = (m["mapSettings"] as? [String: Any]) ?? m
        let pinnedId = (ms["pinnedManuscriptId"] as? String) ?? ""
        let showBg = (ms["showManuscriptBg"] as? Bool) ?? true
        let bgUrl = ((ms["manuscriptBgUrl"] as? String).flatMap { $0.isEmpty ? nil : $0 }) ?? Self.defaultBg
        let inkMode = (ms["manuscriptInk"] as? String) ?? "white"
        let inkColor = (ms["manuscriptInkColor"] as? String) ?? ""
        let ink: Color? = inkMode == "original" ? nil : inkMode == "color" ? Color(hex: inkColor) ?? .white : .white
        let px: CGFloat = family == .systemLarge ? 620 : family == .systemMedium ? 520 : 300
        let bg = showBg ? await Cloud.image(bgUrl, maxPx: px) : nil
        guard !items.isEmpty else {
            return [ManuscriptEntry(date: Date(), art: nil, text: nil, background: bg, ink: ink, pinned: false, empty: true)]
        }
        var ordered = items
        if !pinnedId.isEmpty, let i = ordered.firstIndex(where: { "\($0["id"] ?? "")" == pinnedId }) { ordered.insert(ordered.remove(at: i), at: 0) }
        let pinned = !pinnedId.isEmpty && "\(ordered[0]["id"] ?? "")" == pinnedId
        let tap = WState.d.integer(forKey: "manuNext")
        let slot = Int(Date().timeIntervalSince1970 / 300)
        var out: [ManuscriptEntry] = []
        for k in 0..<(pinned && tap == 0 ? 1 : count) {
            let idx = pinned && tap == 0 ? 0 : (tap + slot + k) % ordered.count
            let it = ordered[idx]
            let src = it["pngDataUrl"] as? String ?? it["src"] as? String
            let art = await Cloud.image(src, maxPx: px)
            let at = k == 0 ? Date() : Date(timeIntervalSince1970: TimeInterval((slot + k) * 300))
            out.append(ManuscriptEntry(date: at, art: art, text: art == nil ? (it["content"] as? String) : nil, background: bg, ink: ink,
                                       pinned: pinned && idx == 0, empty: false))
        }
        if pinned && tap == 0, let e = out.first {
            // the pinned one: drawn again in a few hours
            return [e, ManuscriptEntry(date: Date().addingTimeInterval(3 * 3600), art: e.art, text: e.text, background: e.background, ink: e.ink, pinned: true, empty: false)]
        }
        return out
    }
}

extension Color {
    init?(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
        self.init(red: Double((v >> 16) & 0xff) / 255, green: Double((v >> 8) & 0xff) / 255, blue: Double(v & 0xff) / 255)
    }
}

struct ManuscriptWidgetView: View {
    let e: ManuscriptEntry

    var body: some View {
        WButton(intent: next, fallback: nil) {
            ZStack(alignment: .topLeading) {
                Group {
                    if let a = e.art {
                        if let ink = e.ink {
                            Image(uiImage: a).renderingMode(.template).resizable().scaledToFit().foregroundColor(ink)
                        } else {
                            Image(uiImage: a).resizable().scaledToFit()
                        }
                    } else if let t = e.text {
                        Text(t).font(DC.font(28)).foregroundColor(e.ink ?? .white).multilineTextAlignment(.center).minimumScaleFactor(0.3)
                    } else if e.empty {
                        Text("لا مخطوطات بعد").font(DC.font(14, "Bold")).foregroundColor(.white.opacity(0.5))
                    }
                }
                .shadow(color: .black.opacity(0.6), radius: 4)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                if e.pinned { Text("📌").font(.system(size: 13)) }
            }
        }
    }

    private var next: (any AppIntent)? {
        if #available(iOS 17.0, *) { return StepIntent("manuNext") }
        return nil
    }
}

struct ManuscriptWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DriveCastManuscript", provider: ManuscriptProvider()) { e in
            ManuscriptWidgetView(e: e).dcBackground(image: e.background)
        }
        .configurationDisplayName("المخطوطات")
        .description("مخطوطات اللوحة تتبدّل كل ٥ دقائق، اضغط للتالية")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
