import Foundation

/// Matches straight from 365Scores (no site in the middle): your favourite teams come from the cloud (JSONBin,
/// with their 365Scores ids), and one request returns their live, coming and just-finished games. The result has
/// the same shape as the site's /api/matches, so widgets and islands use it unchanged.
enum Direct365 {
    static let api = "https://webws.365scores.com/web/games/current/"

    /// Favourite teams from the cloud: [(id, name, island)]
    static func favourites(maxAge: TimeInterval = 3600) async -> [(id: Int, name: String, island: Bool)] {
        let m = await Cloud.masterData(maxAge: maxAge)
        return ((m["favoriteTeams"] as? [[String: Any]]) ?? []).compactMap { t in
            guard let id = (t["id"] as? NSNumber)?.intValue ?? Int("\(t["id"] ?? "")"), id > 0 else { return nil }
            return (id, t["name"] as? String ?? "", (t["island"] as? Bool) ?? true)
        }
    }

    /// Today's games of the favourite teams (live first), or nil when 365Scores can't be reached.
    static let server = "https://studio.c-p.workers.dev"

    static func matches(lang: Int = 1) async -> [[String: Any]]? {
        // 1) our server: one small ready file (it does the cloud + 365Scores work)
        //    /now = matches + goals (scorer, minute) + today's prayers and reminders, in one request
        if let u = URL(string: "\(server)/now?lang=\(lang)"),
           let (d, res) = try? await URLSession.shared.data(for: URLRequest(url: u, timeoutInterval: 12)),
           (res as? HTTPURLResponse)?.statusCode == 200,
           let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any],
           var list = o["matches"] as? [[String: Any]], !((o["teams"] as? [Any]) ?? []).isEmpty {
            let goals = o["goals"] as? [String: Any] ?? [:]
            for i in list.indices { if let g = goals["\(list[i]["id"] ?? "")"] { list[i]["goals"] = g } }
            if let ev = o["events"] as? [[String: Any]], !ev.isEmpty,
               let data = try? JSONSerialization.data(withJSONObject: ev) {
                DCShared.defaults.set(String(decoding: data, as: UTF8.self), forKey: "serverEvents")
            }
            return list
        }
        // 2) straight from the sources
        let favs = await favourites(maxAge: 6 * 3600)
        guard !favs.isEmpty else { return nil }
        var c = URLComponents(string: api)!
        c.queryItems = [
            URLQueryItem(name: "appTypeId", value: "5"), URLQueryItem(name: "langId", value: "\(lang)"),
            URLQueryItem(name: "timezoneName", value: "Asia/Muscat"), URLQueryItem(name: "userCountryId", value: "1"),
            URLQueryItem(name: "competitors", value: favs.map { "\($0.id)" }.joined(separator: ",")),
        ]
        guard let u = c.url else { return nil }
        var r = URLRequest(url: u, timeoutInterval: 20)
        r.setValue("application/json", forHTTPHeaderField: "Accept")
        r.setValue("https://www.365scores.com", forHTTPHeaderField: "Origin")
        r.setValue("https://www.365scores.com/", forHTTPHeaderField: "Referer")
        guard let (d, res) = try? await URLSession.shared.data(for: r), (res as? HTTPURLResponse)?.statusCode == 200,
              let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else { return nil }
        let island = Set(favs.filter(\.island).map(\.id))
        let now = Date()
        let list = ((o["games"] as? [[String: Any]]) ?? []).compactMap { map($0, island: island) }.filter { m in
            let st = m["status"] as? String ?? ""
            let k = Date(timeIntervalSince1970: (m["timestamp"] as? NSNumber)?.doubleValue ?? 0)
            if st == "live" { return true }
            if st == "upcoming" { return k.timeIntervalSince(now) < 36 * 3600 && k.timeIntervalSince(now) > -3 * 3600 }
            return now.timeIntervalSince(k) < 8 * 3600   // finished today
        }
        return list.sorted {
            let a = ($0["status"] as? String) == "live", b = ($1["status"] as? String) == "live"
            if a != b { return a }
            return (($0["timestamp"] as? NSNumber)?.doubleValue ?? 0) < (($1["timestamp"] as? NSNumber)?.doubleValue ?? 0)
        }
    }

    /// Callback form for older code: the result arrives on the main thread.
    static func fetch(_ done: @escaping ([[String: Any]]?) -> Void) {
        nonisolated(unsafe) let cb = done
        Task.detached {
            let r = await matches()
            nonisolated(unsafe) let out = r
            DispatchQueue.main.async { cb(out) }
        }
    }

    static func logo(_ kind: String, _ id: Any?) -> String {
        "https://imagecache.365scores.com/image/upload/f_png,w_64,h_64,c_limit,q_auto:eco/\(kind)/\(id ?? "")"
    }

    /// One 365Scores game → the site's match shape.
    static func map(_ g: [String: Any], island: Set<Int>) -> [String: Any]? {
        guard let h = g["homeCompetitor"] as? [String: Any], let a = g["awayCompetitor"] as? [String: Any],
              let start = iso(g["startTime"] as? String) else { return nil }
        let group = (g["statusGroup"] as? NSNumber)?.intValue ?? 2
        let text = g["statusText"] as? String ?? ""
        if group != 3 && group != 4 && text.range(of: "postpon|cancel|abandon|suspend|مؤجل|ملغ", options: .regularExpression) != nil { return nil }
        let status = group == 3 ? "live" : group == 4 ? "finished" : "upcoming"
        let started = status != "upcoming"
        let hid = (h["id"] as? NSNumber)?.intValue ?? 0, aid = (a["id"] as? NSNumber)?.intValue ?? 0
        var m: [String: Any] = [
            "id": "365\(g["id"] ?? "")",
            "home": ["id": "\(hid)", "name": h["name"] as? String ?? "", "logo": logo("Competitors", hid)],
            "away": ["id": "\(aid)", "name": a["name"] as? String ?? "", "logo": logo("Competitors", aid)],
            "timestamp": NSNumber(value: start.timeIntervalSince1970),
            "status": status, "statusText": text,
            "league": ["id": "\(g["competitionId"] ?? "")", "name": g["competitionDisplayName"] as? String ?? ""],
            "omanTime": omanHM(start),
            "favorite": island.contains(hid) || island.contains(aid),
        ]
        m["score"] = ["home": started ? (h["score"] as? NSNumber).map { NSNumber(value: $0.intValue) } ?? NSNull() : NSNull(),
                      "away": started ? (a["score"] as? NSNumber).map { NSNumber(value: $0.intValue) } ?? NSNull() : NSNull()]
        if status == "live", let t = g["gameTime"] as? NSNumber, t.doubleValue >= 0 { m["elapsed"] = NSNumber(value: Int(t.doubleValue)) }
        return m
    }

    static func iso(_ s: String?) -> Date? {
        guard let s else { return nil }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: s)
    }

    static func omanHM(_ d: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "Asia/Muscat")
        f.dateFormat = "HH:mm"
        return f.string(from: d)
    }
}
