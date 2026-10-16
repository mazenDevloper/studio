import Foundation
import SwiftUI
import UIKit
import CoreText

/// Data shared by the app and the widget extension (an App Group).
enum DCShared {
    static let baseGroup = "group.com.drivecast.sovereign"

    /**
     The App Group the app and the widget really share. Sideloading tools (AltStore, Sideloadly) sign with a free
     account and rename it (e.g. "group.com.drivecast.sovereign.KZ7R4K8247"): the name is read from the signing
     profile inside the app, then guessed from the renamed bundle id, and the first one iOS actually opens wins. With
     the wrong name the widget and the Dynamic Island would read an empty store (no prayers, no logos).
     */
    static let group: String = {
        var candidates: [String] = profileGroups()
        if let id = Bundle.main.bundleIdentifier, let r = id.range(of: "com.drivecast.sovereign") {
            // "com.drivecast.sovereign.TEAM" (app) / "com.drivecast.sovereign.TEAM.widgets" (widget)
            let rest = id[r.upperBound...].split(separator: ".").map(String.init).filter { $0 != "widgets" }
            if let team = rest.first { candidates += [baseGroup + "." + team, "group." + team + ".com.drivecast.sovereign"] }
        }
        candidates.append(baseGroup)
        for c in candidates where FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: c) != nil { return c }
        return candidates.first ?? baseGroup
    }()

    /// application-groups listed in embedded.mobileprovision (the sideloaded app's real entitlements)
    private static func profileGroups() -> [String] {
        guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
              let data = try? Data(contentsOf: url),
              let start = data.range(of: Data("<?xml".utf8)),
              let end = data.range(of: Data("</plist>".utf8), in: start.lowerBound..<data.endIndex) else { return [] }
        let plistData = data.subdata(in: start.lowerBound..<end.upperBound)
        guard let plist = try? PropertyListSerialization.propertyList(from: plistData, format: nil) as? [String: Any],
              let ent = plist["Entitlements"] as? [String: Any],
              let groups = ent["com.apple.security.application-groups"] as? [String] else { return [] }
        return groups.filter { !$0.contains("*") }
    }

    /// true when the app and the widget really share a folder
    static var groupWorks: Bool { FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) != nil }

    static var defaults: UserDefaults { UserDefaults(suiteName: group) ?? .standard }

    static var folder: URL {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
            ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    }

    static func dir(_ name: String) -> URL {
        let u = folder.appendingPathComponent(name, isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }

    /// A logo saved by the app (file name in "logos").
    static func logo(_ name: String) -> UIImage? {
        guard !name.isEmpty else { return nil }
        return UIImage(contentsOfFile: dir("logos").appendingPathComponent(name).path)
    }

    /// The JSON the page sent (config: countdowns, reminders, apiUrl...).
    static func json(_ key: String) -> [String: Any] {
        guard let s = defaults.string(forKey: key), let d = s.data(using: .utf8),
              let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else { return [:] }
        return o
    }

    /// Upcoming adhan / iqamah / reminder times, soonest first.
    static func events() -> [(title: String, at: Date, kind: String)] {
        let cfg = json("config")
        var out: [(String, Date, String)] = []
        for key in ["countdowns", "reminders"] {
            for c in (cfg[key] as? [[String: Any]]) ?? [] {
                guard let t = c["title"] as? String, let at = (c["at"] as? NSNumber)?.doubleValue else { continue }
                out.append((t, Date(timeIntervalSince1970: at / 1000), (c["kind"] as? String) ?? (key == "reminders" ? "reminder" : "azan")))
            }
        }
        return out.sorted { $0.1 < $1.1 }.map { (title: $0.0, at: $0.1, kind: $0.2) }
    }

    static func time12(_ d: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "h:mm"
        return f.string(from: d)
    }
}

/// The site's colours and Thmanyah (downloaded by the app into the shared folder; the system font until then).
enum DC {
    static let blue = Color(red: 0, green: 0.5, blue: 1)
    static let emerald = Color(red: 0.204, green: 0.827, blue: 0.6)
    static let red = Color(red: 0.863, green: 0.149, blue: 0.149)
    static let yellow = Color(red: 0.98, green: 0.8, blue: 0.08)
    static let card = Color(red: 0.02, green: 0.02, blue: 0.03)

    static func font(_ size: CGFloat, _ weight: String = "Black") -> Font {
        if UIFont(name: "thmanyahsans-\(weight)", size: size) != nil { return .custom("thmanyahsans-\(weight)", size: size) }
        let w: Font.Weight = weight == "Black" ? .heavy : weight == "Bold" ? .bold : .semibold
        return .system(size: size, weight: w, design: .rounded)
    }

    static let fontWeights = ["Medium", "Bold", "Black"]

    /// Make the downloaded font files usable in this process (app or widget extension).
    static func registerFonts() {
        for w in fontWeights {
            let u = DCShared.dir("fonts").appendingPathComponent("thmanyah-sans-\(w).otf")
            if FileManager.default.fileExists(atPath: u.path), UIFont(name: "thmanyahsans-\(w)", size: 12) == nil {
                CTFontManagerRegisterFontsForURL(u as CFURL, .process, nil)
            }
        }
    }

    static func color(for kind: String) -> Color {
        kind == "azan" ? blue : emerald
    }
}
