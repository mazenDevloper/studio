import SwiftUI
import UIKit

/**
 Goal / full-time alerts shaped like SofaScore's: the match as the title ("ريال مدريد 2 - 0 إشبيلية"), the event
 on the first line ("⚽ هدف! ريال مدريد · د45"), the scorer under it, and both team badges as the picture on the
 side (one badge over the other's corner). Drawn here so the app, and the CI previews, use the same thing.
 */
enum GoalAlert {
    struct Text3 { let title: String; let subtitle: String; let body: String }

    /// kind: "goal" | "end" | "start" | "cancelled" (a goal taken back by VAR)
    static func text(kind: String, home: String, away: String, sh: Int, sa: Int, scored: String, minute: String, scorer: String) -> Text3 {
        // the scoring side's number in brackets, like SofaScore highlights it
        let hs = scored == "home" && kind == "goal" ? "[\(sh)]" : "\(sh)"
        let as_ = scored == "away" && kind == "goal" ? "[\(sa)]" : "\(sa)"
        let title = "\(home) \(hs) - \(as_) \(away)"
        let team = scored == "home" ? home : away
        switch kind {
        case "end":
            return Text3(title: "\(home) - \(away)", subtitle: "", body: "🏁 انتهت المباراة: \(sh) - \(sa)")
        case "start":
            return Text3(title: "\(home) - \(away)", subtitle: "", body: "▶️ بدأت المباراة")
        case "cancelled":
            return Text3(title: title, subtitle: "", body: "❌ هدف ملغى لـ\(team)" + (minute.isEmpty ? "" : " · \(minute)"))
        default:
            return Text3(title: title, subtitle: "⚽ هدف! \(team)" + (minute.isEmpty ? "" : " · \(minute)"), body: scorer)
        }
    }

    /// both badges in one square picture (the notification's thumbnail)
    static func badges(home: UIImage?, away: UIImage?) -> UIImage {
        let side: CGFloat = 120
        let fmt = UIGraphicsImageRendererFormat(); fmt.scale = 2
        return UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: fmt).image { _ in
            func draw(_ img: UIImage?, _ r: CGRect) {
                guard let img else { return }
                let s = min(r.width / img.size.width, r.height / img.size.height)
                let w = img.size.width * s, h = img.size.height * s
                img.draw(in: CGRect(x: r.midX - w / 2, y: r.midY - h / 2, width: w, height: h))
            }
            draw(home, CGRect(x: 4, y: 4, width: 70, height: 70))
            draw(away, CGRect(x: 46, y: 46, width: 70, height: 70))
        }
    }

    /// the banner as iOS shows it (for the previews only)
    struct Banner: View {
        let t: Text3
        let badges: UIImage
        var body: some View {
            HStack(alignment: .center, spacing: 10) {
                RoundedRectangle(cornerRadius: 9).fill(Color(red: 0.2, green: 0.35, blue: 0.95)).frame(width: 38, height: 38)
                    .overlay(SwiftUI.Text("D").font(.system(size: 20, weight: .black)).foregroundColor(.white))
                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        SwiftUI.Text(t.title).font(.system(size: 15, weight: .semibold)).lineLimit(1)
                        Spacer()
                        SwiftUI.Text("الآن").font(.system(size: 13)).foregroundColor(.secondary)
                    }
                    if !t.subtitle.isEmpty { SwiftUI.Text(t.subtitle).font(.system(size: 15, weight: .semibold)) }
                    if !t.body.isEmpty { SwiftUI.Text(t.body).font(.system(size: 15)) }
                }
                Image(uiImage: badges).resizable().frame(width: 38, height: 38)
            }
            .foregroundColor(.white)
            .padding(14)
            .frame(width: 370)
            .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(Color(white: 0.17)))
            .environment(\.layoutDirection, .rightToLeft)
        }
    }
}
