import SwiftUI
import UIKit

extension UIFont {
    func withDesign(_ d: UIFontDescriptor.SystemDesign) -> UIFont {
        fontDescriptor.withDesign(d).map { UIFont(descriptor: $0, size: pointSize) } ?? self
    }
}

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

    /// the scorer of the latest goal for that side, straight from 365Scores: (name, photo)
    static func scorer(gameId: String, side: String) async -> (String, UIImage?) {
        let id = gameId.hasPrefix("365") ? String(gameId.dropFirst(3)) : gameId
        guard let u = URL(string: "https://webws.365scores.com/web/game/?appTypeId=5&langId=1&timezoneName=Asia/Muscat&userCountryId=1&gameId=\(id)") else { return ("", nil) }
        var r = URLRequest(url: u, timeoutInterval: 8)
        r.setValue("https://www.365scores.com", forHTTPHeaderField: "Origin")
        r.setValue("https://www.365scores.com/", forHTTPHeaderField: "Referer")
        guard let (d, _) = try? await URLSession.shared.data(for: r),
              let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any], let g = o["game"] as? [String: Any] else { return ("", nil) }
        let homeId = ((g["homeCompetitor"] as? [String: Any])?["id"] as? NSNumber)?.intValue
        let goals = ((g["events"] as? [[String: Any]]) ?? []).filter { e in
            guard ((e["eventType"] as? [String: Any])?["id"] as? NSNumber)?.intValue == 1 else { return false }
            let isHome = (e["competitorId"] as? NSNumber)?.intValue == homeId
            return side == "home" ? isHome : !isHome
        }
        guard let last = goals.last, let pid = (last["playerId"] as? NSNumber)?.intValue else { return ("", nil) }
        let name = ((g["members"] as? [[String: Any]]) ?? []).first { ($0["id"] as? NSNumber)?.intValue == pid }
            .flatMap { ($0["shortName"] as? String) ?? ($0["name"] as? String) } ?? ""
        let img = URL(string: "https://imagecache.365scores.com/image/upload/f_png,w_200,h_200,c_limit,q_auto:eco,d_Athletes:default.png/Athletes/\(pid)")
        var photo: UIImage? = nil
        if let img, let (pd, _) = try? await URLSession.shared.data(from: img) { photo = UIImage(data: pd) }
        return (name, photo)
    }

    /// the alert's picture: the scorer's photo big, the score big under it, both badges at its sides
    /// (a thumbnail in the banner, the full card when the alert is held / pulled down)
    static func card(player: UIImage?, home: UIImage?, away: UIImage?, sh: Int, sa: Int, scored: String) -> UIImage {
        let W: CGFloat = 300, H: CGFloat = 300
        let fmt = UIGraphicsImageRendererFormat(); fmt.scale = 2
        return UIGraphicsImageRenderer(size: CGSize(width: W, height: H), format: fmt).image { ctx in
            let c = ctx.cgContext
            UIColor(white: 0.09, alpha: 1).setFill(); c.fill(CGRect(x: 0, y: 0, width: W, height: H))
            func fit(_ img: UIImage?, _ r: CGRect) {
                guard let img else { return }
                let s = min(r.width / img.size.width, r.height / img.size.height)
                let w = img.size.width * s, h = img.size.height * s
                img.draw(in: CGRect(x: r.midX - w / 2, y: r.midY - h / 2, width: w, height: h))
            }
            // the player (or the scoring team's badge) in a ring
            let ring = CGRect(x: W / 2 - 82, y: 18, width: 164, height: 164)
            UIColor(red: 0.13, green: 0.8, blue: 0.5, alpha: 1).setStroke()
            c.setLineWidth(5); c.strokeEllipse(in: ring.insetBy(dx: 2.5, dy: 2.5))
            c.saveGState()
            c.addEllipse(in: ring.insetBy(dx: 7, dy: 7)); c.clip()
            UIColor(white: 0.18, alpha: 1).setFill(); c.fill(ring)
            if let player { fit(player, ring.insetBy(dx: 7, dy: 7)) } else { fit(scored == "away" ? away : home, ring.insetBy(dx: 30, dy: 30)) }
            c.restoreGState()
            // badges + big score
            fit(home, CGRect(x: 16, y: 206, width: 70, height: 70))
            fit(away, CGRect(x: W - 86, y: 206, width: 70, height: 70))
            let txt = "\(sh) - \(sa)" as NSString
            let font = UIFont.systemFont(ofSize: 58, weight: .heavy).withDesign(.rounded)
            let a: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: UIColor.white]
            let sz = txt.size(withAttributes: a)
            txt.draw(at: CGPoint(x: W / 2 - sz.width / 2, y: 241 - sz.height / 2), withAttributes: a)
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
