import Foundation
import UIKit
import ImageIO

/// The cloud the site and the Android app read (JSONBin), read straight by the widgets: a sideloaded app often has
/// no shared folder with its widgets, so each widget fetches what it shows. The last good answer is kept on disk.
enum Cloud {
    static let key = "$2a$10$SYrYv.ct8hiMU9YeUxEQ.ecRkOrTqs.TDchJRV3wW.aKJnDXy2oVy"
    static let master = "69c782cbb7ec241ddcb0b99a"
    static let manuscripts = "69b63c5cc3097a1dd5278b25"
    static let channels = "68ef1b3dd0ea881f40a38bd1"
    static let prayers = "69a00f6eae596e708f4b7291"
    static let reciters = "6909c1cd43b1c97be997b522"
    static let site = "https://cplay3.netlify.app"

    private static var cacheDir: URL {
        let u = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("dc-cloud", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }

    /// A bin's JSON (fresh when older than `maxAge`, else the copy on disk; the copy when offline).
    static func bin(_ id: String, maxAge: TimeInterval = 3600) async -> Any? {
        let file = cacheDir.appendingPathComponent(id + ".json")
        let attrs = try? FileManager.default.attributesOfItem(atPath: file.path)
        let age = Date().timeIntervalSince((attrs?[.modificationDate] as? Date) ?? .distantPast)
        if age < maxAge, let d = try? Data(contentsOf: file), let o = try? JSONSerialization.jsonObject(with: d) { return o }
        if let u = URL(string: "https://api.jsonbin.io/v3/b/\(id)/latest") {
            var r = URLRequest(url: u, timeoutInterval: 20)
            r.setValue(key, forHTTPHeaderField: "X-Master-Key")
            r.setValue("false", forHTTPHeaderField: "X-Bin-Meta")
            if let res = try? await URLSession.shared.data(for: r), (res.1 as? HTTPURLResponse)?.statusCode == 200,
               case let d = res.0, let o = try? JSONSerialization.jsonObject(with: d) {
                try? d.write(to: file)
                return o
            }
        }
        if let d = try? Data(contentsOf: file) { return try? JSONSerialization.jsonObject(with: d) }
        return nil
    }

    /// The list inside a bin: the bin itself, or under `field` ("reciters", "channels"...).
    static func list(_ id: String, _ field: String, maxAge: TimeInterval = 3600) async -> [[String: Any]] {
        let o = await bin(id, maxAge: maxAge)
        if let a = o as? [[String: Any]] { return a }
        if let d = o as? [String: Any] {
            if let a = d[field] as? [[String: Any]] { return a }
            if let a = d["data"] as? [[String: Any]] { return a }
        }
        return []
    }

    static func masterData(maxAge: TimeInterval = 3600) async -> [String: Any] {
        (await bin(master, maxAge: maxAge) as? [String: Any]) ?? [:]
    }

    /// "name~country" for each favourite team (the site's favSpecString)
    static func teamsSpec(_ m: [String: Any]) -> String {
        ((m["favoriteTeams"] as? [[String: Any]]) ?? []).compactMap { t -> String? in
            guard let n = t["name"] as? String, !n.isEmpty else { return nil }
            let c = t["country"] as? String ?? ""
            return c.isEmpty ? n : n + "~" + c
        }.joined(separator: "|")
    }

    /// Today's favourite matches (the site's /api/matches, logos filled in, live minute fresh).
    static func matches() async -> [[String: Any]]? {
        // Straight from 365Scores first (no site in between); the site only when that fails.
        if let direct = await Direct365.matches() { return direct }
        let m = await masterData(maxAge: 6 * 3600)
        var c = URLComponents(string: site + "/api/matches")!
        c.queryItems = [URLQueryItem(name: "limit", value: "30"), URLQueryItem(name: "teams", value: teamsSpec(m))]
        guard let u = c.url else { return nil }
        var r = URLRequest(url: u, timeoutInterval: 25)
        r.setValue("application/json", forHTTPHeaderField: "Accept")
        guard let d = try? await URLSession.shared.data(for: r).0,
              let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any],
              let list = o["matches"] as? [[String: Any]] else { return nil }
        return list
    }

    // MARK: pictures (small, the widgets have little memory)

    private static var imageDir: URL {
        let u = cacheDir.appendingPathComponent("img", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }

    /// A picture from the web (or a data: URL) at most `maxPx` on its longest side, kept on disk.
    static func image(_ url: String?, maxPx: CGFloat) async -> UIImage? {
        guard let url, !url.isEmpty else { return nil }
        let file = imageDir.appendingPathComponent(stableName(url) + "-\(Int(maxPx)).png")
        if let img = UIImage(contentsOfFile: file.path) { return img }
        var data: Data?
        if url.hasPrefix("data:"), let comma = url.firstIndex(of: ",") {
            data = Data(base64Encoded: String(url[url.index(after: comma)...]), options: .ignoreUnknownCharacters)
        } else if let u = URL(string: url) {
            data = try? await URLSession.shared.data(from: u).0
        }
        guard let data, let img = downsample(data, maxPx: maxPx) else { return nil }
        try? img.pngData()?.write(to: file)
        return img
    }

    /// Decode at the small size directly (a big picture decoded whole would use the widget's memory).
    static func downsample(_ data: Data, maxPx: CGFloat) -> UIImage? {
        guard let src = CGImageSourceCreateWithData(data as CFData, [kCGImageSourceShouldCache: false] as CFDictionary) else { return nil }
        let opts: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPx,
        ]
        guard let cg = CGImageSourceCreateThumbnailAtIndex(src, 0, opts as CFDictionary) else { return nil }
        return UIImage(cgImage: cg)
    }

    static func stableName(_ s: String) -> String {
        var h: UInt64 = 1469598103934665603
        for b in s.utf8 { h = (h ^ UInt64(b)) &* 1099511628211 }
        return String(h, radix: 36)
    }

    // MARK: the day's prayer times (worked out like the page / the Android app)

    struct Event { let title: String; let at: Date; let kind: String }

    /// Today's and tomorrow's adhan + iqamah times from the cloud's times and the prayer settings.
    static func dayEvents() async -> [Event] {
        let rows = await list(prayers, "prayers", maxAge: 12 * 3600)
        let m = await masterData(maxAge: 12 * 3600)
        return events(rows: rows, settings: m["prayerSettings"] as? [[String: Any]])
    }

    static func events(rows: [[String: Any]], settings: [[String: Any]]?) -> [Event] {
        var s = settings ?? []
        if s.isEmpty {
            s = [("fajr", "الفجر", 25), ("sunrise", "الشروق", 0), ("dhuhr", "الظهر", 20), ("asr", "العصر", 20), ("maghrib", "المغرب", 10), ("isha", "العشاء", 20)]
                .map { ["id": $0.0, "name": $0.1, "iqamahDuration": $0.2] }
        }
        let cal = Calendar.current
        var out: [Event] = []
        for off in 0...1 {
            guard let day = cal.date(byAdding: .day, value: off, to: cal.startOfDay(for: Date())) else { continue }
            guard let row = rows.first(where: { ($0["date"] as? String) == dayKey(day) }) else { continue }
            for p in s {
                let id = p["id"] as? String ?? ""
                guard let ref = row[id == "duha" ? "sunrise" : id] as? String, let mins = hm(ref) else { continue }
                let offset = (p["offsetMinutes"] as? NSNumber)?.intValue ?? 0
                let at = day.addingTimeInterval(TimeInterval((mins + (id == "duha" ? 15 : 0) + offset) * 60))
                let name = p["name"] as? String ?? id
                if (p["showCountdown"] as? Bool) ?? true { out.append(Event(title: name, at: at, kind: "azan")) }
                let iq = (p["iqamahDuration"] as? NSNumber)?.intValue ?? 0
                if iq > 0 { out.append(Event(title: "إقامة " + name, at: at.addingTimeInterval(TimeInterval(iq * 60)), kind: "iqamah")) }
            }
        }
        return out.sorted { $0.at < $1.at }
    }

    static func hm(_ t: String) -> Int? {
        let p = t.split(separator: ":")
        guard p.count >= 2, let h = Int(p[0].trimmingCharacters(in: .whitespaces)), let m = Int(p[1].trimmingCharacters(in: .whitespaces).prefix(2)) else { return nil }
        return h * 60 + m
    }

    static func dayKey(_ d: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: d)
    }
}

/// The Hijri date (Umm al-Qura, like the site) and the day's occasion (the Android app's Occasions).
enum Hijri {
    static let months = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"]
    static let gregMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
    static let days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    /// the day name stretched with kashida, like the dashboard's day card
    static let longDays = ["الاحــــد", "الاثنيـــــن", "الثلاثــــاء", "الاربعــــاء", "الخميــــس", "الجمعــــة", "السبــــت"]

    /// (day, month 0 = Muharram, year)
    static func date(_ d: Date = Date()) -> (day: Int, month: Int, year: Int) {
        let c = Calendar(identifier: .islamicUmmAlQura).dateComponents([.day, .month, .year], from: d)
        return (c.day ?? 1, max(0, min(11, (c.month ?? 1) - 1)), c.year ?? 1448)
    }

    static func text(_ d: Date = Date()) -> String {
        let h = date(d)
        return "\(h.day) \(months[h.month])، \(h.year) هـ"
    }

    static func occasion(_ h: (day: Int, month: Int, year: Int)) -> String? {
        let d = h.day, m = h.month
        if m == 0 && d == 1 { return "رأس السنة الهجرية \(h.year) هـ" }
        if m == 0 && d == 9 { return "يوم تاسوعاء" }
        if m == 0 && d == 10 { return "يوم عاشوراء" }
        if m == 2 && d == 12 { return "ذكرى المولد النبوي الشريف ﷺ" }
        if m == 6 && d == 27 { return "ذكرى الإسراء والمعراج" }
        if m == 7 && d == 15 { return "النصف من شعبان" }
        if m == 8 && d == 1 { return "أول أيام رمضان · رمضان كريم" }
        if m == 8 && d == 27 { return "ليلة السابع والعشرين · تحرّ ليلة القدر" }
        if m == 8 && d >= 21 { return "العشر الأواخر · تحرّ ليلة القدر" }
        if m == 8 { return "رمضان كريم · اليوم \(d)" }
        if m == 9 && d <= 3 { return "عيد الفطر مبارك" }
        if m == 11 && d == 9 { return "يوم عرفة · خير الدعاء دعاء يوم عرفة" }
        if m == 11 && d == 10 { return "عيد الأضحى مبارك" }
        if m == 11 && d >= 11 && d <= 13 { return "أيام التشريق · أيام أكل وشرب وذكر لله" }
        if m == 11 && d <= 8 { return "العشر من ذي الحجة · أكثروا التكبير" }
        if d == 1 { return "هلّ شهر \(months[m]) · دعاء رؤية الهلال" }
        if d >= 13 && d <= 15 { return "الأيام البيض" }
        return nil
    }

    static func gregorianOccasion(_ date: Date) -> String? {
        let c = Calendar(identifier: .gregorian).dateComponents([.day, .month, .year], from: date)
        switch (c.month ?? 0, c.day ?? 0) {
        case (1, 1): return "رأس السنة الميلادية \(c.year ?? 0)"
        case (1, 11): return "ذكرى تولّي جلالة السلطان مقاليد الحكم"
        case (3, 21): return "عيد الأم"
        case (8, 26): return "يوم الشباب العُماني"
        case (10, 17): return "يوم المرأة العُمانية"
        case (11, 20): return "العيد الوطني العُماني"
        default: return nil
        }
    }

    /// Why tomorrow is a day to fast (nil: it isn't).
    static func fastReason(_ now: Date = Date()) -> String? {
        let t = now.addingTimeInterval(86400)
        let h = date(t)
        if h.month == 8 { return nil }
        if h.month == 9 && h.day == 1 { return nil }
        if h.month == 11 && h.day == 9 { return "صيام يوم عرفة" }
        if h.month == 11 && h.day >= 10 && h.day <= 13 { return nil }
        if h.month == 0 && h.day == 10 { return "صيام يوم عاشوراء" }
        if h.month == 0 && h.day == 9 { return "صيام تاسوعاء" }
        if h.day >= 13 && h.day <= 15 { return "صيام الأيام البيض" }
        let dow = Calendar.current.component(.weekday, from: t)
        if dow == 2 { return "صيام الإثنين" }
        if dow == 5 { return "صيام الخميس" }
        return nil
    }

    /// A short label for the day (the Android day widget's): nil on an ordinary day.
    static func label(_ now: Date = Date()) -> String? {
        let h = date(now)
        if h.month == 9 && h.day == 1 { return "عيد الفطر مبارك" }
        if h.month == 11 && h.day == 10 { return "عيد الأضحى مبارك" }
        if h.month == 11 && h.day == 9 { return "يوم عرفة" }
        if h.month == 0 && h.day == 10 { return "يوم عاشوراء" }
        if h.month == 8 { return "رمضان كريم" }
        if h.month == 11 && h.day <= 9 { return "العشر من ذي الحجة" }
        if let o = occasion(h) { return o.components(separatedBy: " · ")[0] }
        if let g = gregorianOccasion(now) { return g }
        let dow = Calendar.current.component(.weekday, from: now)
        if dow == 6 { return "يوم الجمعة" }
        if let r = fastReason(now) { return "غداً " + r }
        if dow == 1 || dow == 3 { return "يوم الرياضة" }
        return nil
    }

    static let daily = [
        "«أحبّ الأعمال إلى الله أدومها وإن قلّ»",
        "«كلمتان خفيفتان على اللسان: سبحان الله وبحمده، سبحان الله العظيم»",
        "«من قال سبحان الله وبحمده مئة مرة حُطّت خطاياه»",
        "«الكلمة الطيبة صدقة»",
        "«تبسّمك في وجه أخيك صدقة»",
        "«لا حول ولا قوة إلا بالله كنز من كنوز الجنة»",
        "«من صلّى عليّ صلاة صلّى الله عليه بها عشراً»",
        "«الطهور شطر الإيمان»",
        "«خيركم من تعلّم القرآن وعلّمه»",
        "«اتق الله حيثما كنت»",
        "«لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه»",
        "«الدعاء هو العبادة»",
        "«من سلك طريقاً يلتمس فيه علماً سهّل الله له به طريقاً إلى الجنة»",
        "سورة الملك قبل النوم · «تنجي من عذاب القبر»",
    ]

    /// The occasion line shown under the prayer island / in the occasions widget: the day's occasion, else a saying.
    static func occasionLine(_ now: Date = Date()) -> String {
        let h = date(now)
        if let o = occasion(h) { return "🌙 " + o }
        if let g = gregorianOccasion(now) { return "📅 " + g }
        let dow = Calendar.current.component(.weekday, from: now)
        if dow == 6 { return "سورة الكهف · يوم الجمعة" }
        if let r = fastReason(now) { return "تذكير صيام الغد · " + r }
        let doy = Calendar.current.ordinality(of: .day, in: .year, for: now) ?? 0
        return "✨ " + daily[doy % daily.count]
    }
}

/// The app's links (drivecast://...): what a widget tap asks the app to do.
enum DCLink {
    static func open(_ route: String) -> URL {
        var c = URLComponents(); c.scheme = "drivecast"; c.host = "open"
        c.queryItems = [URLQueryItem(name: "route", value: route)]
        return c.url!
    }

    /// open a screen and hand the page a command ("channel", "reciter", "play", "search"...)
    static func cmd(_ route: String, _ cmd: String, _ arg: String = "") -> URL {
        var c = URLComponents(); c.scheme = "drivecast"; c.host = "cmd"
        c.queryItems = [URLQueryItem(name: "route", value: route), URLQueryItem(name: "cmd", value: cmd), URLQueryItem(name: "arg", value: arg)]
        return c.url!
    }

    static let voice = URL(string: "drivecast://voice")!
    static let islands = URL(string: "drivecast://islands")!
}
