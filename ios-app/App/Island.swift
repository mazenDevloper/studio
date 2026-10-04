import ActivityKit
import BackgroundTasks
import CryptoKit
import UIKit
import UserNotifications
import WidgetKit

/**
 The Dynamic Island, like the Android floating islands:
 - prayers and reminders (on by default): one Live Activity counting down to the next adhan / iqamah / reminder by
   itself, moved on to the next one whenever the app runs (open, playing media in the background, background
   refresh); plus a notification at each of them, scheduled ahead so they come even when the app is closed.
 - matches (on from the settings): favourite teams' / pinned live matches with logos, score and minute; a goal
   expands the island with a sound.
 iOS only lets the app start a Live Activity while it is open, and update it while it runs: without Apple push
 (a paid developer account) the scores move on while the app is open or alive in the background.
 */
final class Island {
    static let shared = Island()
    private let refreshTask = "com.drivecast.sovereign.refresh"
    private var timer: Timer?
    private var lastPoll: Date = .distantPast
    private var lastPollOk: Date = .distantPast
    private var pollFailed = false
    private var polling = false
    private var matches: [[String: Any]] = []

    private var prayerOn: Bool { UserDefaults.standard.bool(forKey: "prayerIsland") }
    private var matchesOn: Bool { UserDefaults.standard.bool(forKey: "matchesIsland") }

    // MARK: lifecycle

    func appActive() {
        if timer == nil {
            let t = Timer(timeInterval: 5, repeats: true) { [weak self] _ in self?.tick() }
            RunLoop.main.add(t, forMode: .common)
            timer = t
        }
        configChanged()
        poll(force: true)
    }

    func configChanged() {
        updatePrayerActivity()
        scheduleNotifications()
    }

    func settingsChanged() {
        if !matchesOn { endMatchActivities(now: true) } else { poll(force: true) }
        configChanged()
    }

    /// every 5 s while the app runs (open, or in the background playing media)
    private func tick() {
        updatePrayerActivity()
        if matchesOn && pollDue() { poll(force: false) }
    }

    // MARK: prayers + reminders

    private func prayerActivity() -> Activity<IslandAttributes>? {
        Activity<IslandAttributes>.activities.first { $0.attributes.type == "prayer" }
    }

    private func updatePrayerActivity() {
        let current = prayerActivity()
        guard prayerOn else {
            if let a = current { Task { await a.end(nil, dismissalPolicy: .immediate) } }
            return
        }
        let now = Date()
        let all = DCShared.events()
        guard let next = all.first(where: { $0.at > now }) else { return }
        let prev = all.last(where: { $0.at <= now })?.at ?? now.addingTimeInterval(-3600)
        let state = IslandAttributes.ContentState(kind: next.kind, title: next.title, start: max(prev, next.at.addingTimeInterval(-6 * 3600)),
                                                  end: next.at, timeText: DCShared.time12(next.at))
        let content = ActivityContent(state: state, staleDate: next.at)
        if let a = current {
            if a.content.state != state { Task { await a.update(content) } }
        } else if ActivityAuthorizationInfo().areActivitiesEnabled && UIApplication.shared.applicationState == .active {
            _ = try? Activity.request(attributes: IslandAttributes(type: "prayer", matchId: ""), content: content, pushType: nil)
        }
    }

    /// A notification at each adhan / iqamah / reminder of the next two days (they come with the app closed).
    private func scheduleNotifications() {
        let c = UNUserNotificationCenter.current()
        c.getPendingNotificationRequests { pending in
            c.removePendingNotificationRequests(withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix("dc-") })
            guard self.prayerOn else { return }
            let now = Date()
            for e in DCShared.events().filter({ $0.at > now && $0.at < now.addingTimeInterval(48 * 3600) }).prefix(50) {
                let n = UNMutableNotificationContent()
                n.title = e.kind == "azan" ? "حان الآن موعد أذان \(e.title)" : e.kind == "iqamah" ? e.title : "تذكير: \(e.title)"
                n.body = e.kind == "azan" ? "الأذان · \(DCShared.time12(e.at))" : e.kind == "iqamah" ? "أقيمت الصلاة" : DCShared.time12(e.at)
                n.sound = .default
                if #available(iOS 15.0, *) { n.interruptionLevel = .timeSensitive }
                let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: e.at)
                let id = "dc-\(e.kind)-\(Int(e.at.timeIntervalSince1970))-\(e.title.hashValue)"
                c.add(UNNotificationRequest(identifier: id, content: n, trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)))
            }
        }
    }

    // MARK: matches

    /// every 30 s while a match is live or about to start; otherwise not before 5 minutes ahead of the next kick-off
    private func pollDue() -> Bool {
        let now = Date()
        if now.timeIntervalSince(lastPoll) < 30 { return false }
        if pollFailed || lastPollOk == .distantPast { return true }
        var next = Date.distantFuture
        for m in matches {
            let st = m["status"] as? String ?? ""
            if st == "live" { return true }
            let k = Date(timeIntervalSince1970: (m["timestamp"] as? NSNumber)?.doubleValue ?? 0)
            if st == "upcoming" && k > now.addingTimeInterval(-15 * 60) { next = min(next, k) }
        }
        if next != .distantFuture && next.timeIntervalSince(now) < 5 * 60 { return true }
        return now >= min(lastPollOk.addingTimeInterval(30 * 60), next.addingTimeInterval(-5 * 60))
    }

    func poll(force: Bool, done: (() -> Void)? = nil) {
        let cfg = DCShared.json("config")
        guard matchesOn, !polling, let api = cfg["apiUrl"] as? String, let url = URL(string: api) else { done?(); return }
        polling = true
        lastPoll = Date()
        let pins = (cfg["pins"] as? [[String: Any]]) ?? []
        var req = URLRequest(url: url, timeoutInterval: 40)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        URLSession.shared.dataTask(with: req) { data, _, err in
            var mine: [[String: Any]] = []
            var ok = false
            if err == nil, let data, let o = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let list = o["matches"] as? [[String: Any]] {
                ok = true
                for m in list {
                    let h = (m["home"] as? [String: Any])?["name"] as? String ?? "", a = (m["away"] as? [String: Any])?["name"] as? String ?? ""
                    let pinned = pins.contains { Self.same($0["home"] as? String ?? "", h) && Self.same($0["away"] as? String ?? "", a) }
                    if (m["favorite"] as? Bool ?? false) || pinned { mine.append(m) }
                }
            }
            if ok { for m in mine { self.saveLogos(m) } }
            DispatchQueue.main.async {
                self.polling = false
                self.pollFailed = !ok
                if ok {
                    self.lastPollOk = Date()
                    self.matches = mine
                    self.updateMatchActivities()
                }
                done?()
            }
        }.resume()
    }

    private static func same(_ a: String, _ b: String) -> Bool {
        let x = a.lowercased().trimmingCharacters(in: .whitespaces), y = b.lowercased().trimmingCharacters(in: .whitespaces)
        return !x.isEmpty && !y.isEmpty && (x.contains(y) || y.contains(x))
    }

    private func updateMatchActivities() {
        let now = Date()
        var seen = Set<String>()
        let scores = (DCShared.defaults.dictionary(forKey: "goalScores") as? [String: String]) ?? [:]
        var nextScores: [String: String] = [:]
        for m in matches.prefix(4) {
            let id = "\(m["id"] ?? "")"
            let st = m["status"] as? String ?? ""
            let kick = Date(timeIntervalSince1970: (m["timestamp"] as? NSNumber)?.doubleValue ?? 0)
            // live, or starting within 15 minutes, or finished less than half an hour ago
            let show = st == "live" || (st == "upcoming" && kick.timeIntervalSince(now) < 15 * 60 && kick.timeIntervalSince(now) > -20 * 60)
                || (st == "finished" && now.timeIntervalSince(kick) < 150 * 60)
            guard show else { continue }
            seen.insert(id)
            let score = m["score"] as? [String: Any]
            let sh = (score?["home"] as? NSNumber)?.intValue ?? 0, sa = (score?["away"] as? NSNumber)?.intValue ?? 0
            nextScores[id] = "\(sh):\(sa)"
            var scored = ""
            if let old = scores[id]?.split(separator: ":"), old.count == 2, let oh = Int(old[0]), let oa = Int(old[1]) {
                if sh > oh { scored = "home" } else if sa > oa { scored = "away" }
            }
            let home = m["home"] as? [String: Any] ?? [:], away = m["away"] as? [String: Any] ?? [:]
            let elapsed = (m["elapsed"] as? NSNumber)?.intValue
            var state = IslandAttributes.ContentState(kind: "match", title: m["league"].flatMap { ($0 as? [String: Any])?["name"] as? String } ?? "",
                                                      start: kick, end: kick, timeText: Self.omanTime(m["omanTime"] as? String ?? ""))
            state.home = home["name"] as? String ?? ""
            state.away = away["name"] as? String ?? ""
            state.homeLogo = Self.logoFile(home["logo"] as? String)
            state.awayLogo = Self.logoFile(away["logo"] as? String)
            state.sh = sh
            state.sa = sa
            state.status = st
            state.minute = st == "live" ? (elapsed.map { "د\($0)" } ?? "مباشر") : ""
            state.fav = m["favorite"] as? Bool ?? false
            state.league = state.title
            state.scored = scored
            let content = ActivityContent(state: state, staleDate: now.addingTimeInterval(st == "live" ? 10 * 60 : 3 * 3600))
            if let a = Activity<IslandAttributes>.activities.first(where: { $0.attributes.type == "match" && $0.attributes.matchId == id }) {
                if a.content.state != state {
                    Task {
                        if !scored.isEmpty {
                            // a goal: the island opens up with a sound, like the goal card on Android
                            let team = scored == "home" ? state.home : state.away
                            await a.update(content, alertConfiguration: AlertConfiguration(title: "⚽ هدف! \(team)", body: "\(state.home) \(sh)-\(sa) \(state.away)", sound: .default))
                        } else {
                            await a.update(content)
                        }
                        if st == "finished" { await a.end(content, dismissalPolicy: .after(now.addingTimeInterval(30 * 60))) }
                    }
                }
            } else if st != "finished", ActivityAuthorizationInfo().areActivitiesEnabled, UIApplication.shared.applicationState == .active {
                _ = try? Activity.request(attributes: IslandAttributes(type: "match", matchId: id), content: content, pushType: nil)
            }
            if !scored.isEmpty { notifyGoal(state, scored: scored) }
        }
        DCShared.defaults.set(nextScores, forKey: "goalScores")
        for a in Activity<IslandAttributes>.activities where a.attributes.type == "match" && !seen.contains(a.attributes.matchId) {
            Task { await a.end(nil, dismissalPolicy: .default) }
        }
    }

    private func endMatchActivities(now: Bool) {
        for a in Activity<IslandAttributes>.activities where a.attributes.type == "match" {
            Task { await a.end(nil, dismissalPolicy: now ? .immediate : .default) }
        }
    }

    private func notifyGoal(_ s: IslandAttributes.ContentState, scored: String) {
        let n = UNMutableNotificationContent()
        n.title = "⚽ هدف! \(scored == "home" ? s.home : s.away)"
        n.body = "\(s.home) \(s.sh) - \(s.sa) \(s.away)" + (s.minute.isEmpty ? "" : " · \(s.minute)")
        n.sound = .default
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "goal-\(UUID().uuidString)", content: n, trigger: nil))
    }

    private static func omanTime(_ hhmm: String) -> String {
        let p = hhmm.split(separator: ":")
        guard p.count >= 2, let h = Int(p[0]) else { return hhmm }
        return "\(h % 12 == 0 ? 12 : h % 12):\(p[1].prefix(2))"
    }

    // MARK: logos (small files in the shared folder: Live Activities can't load from the web)

    private static func logoFile(_ url: String?) -> String {
        guard let url, !url.isEmpty else { return "" }
        let name = SHA256.hash(data: Data(url.utf8)).map { String(format: "%02x", $0) }.joined().prefix(24) + ".png"
        return FileManager.default.fileExists(atPath: DCShared.dir("logos").appendingPathComponent(String(name)).path) ? String(name) : ""
    }

    private func saveLogos(_ m: [String: Any]) {
        for side in ["home", "away"] {
            guard let url = (m[side] as? [String: Any])?["logo"] as? String, !url.isEmpty, let u = URL(string: url) else { continue }
            let name = SHA256.hash(data: Data(url.utf8)).map { String(format: "%02x", $0) }.joined().prefix(24) + ".png"
            let file = DCShared.dir("logos").appendingPathComponent(String(name))
            if FileManager.default.fileExists(atPath: file.path) { continue }
            guard let data = try? Data(contentsOf: u), let img = UIImage(data: data) else { continue }
            // small: the system refuses big pictures in a Live Activity
            let side = CGFloat(84), scale = min(side / img.size.width, side / img.size.height, 1)
            let size = CGSize(width: img.size.width * scale, height: img.size.height * scale)
            let fmt = UIGraphicsImageRendererFormat()
            fmt.scale = 1
            let small = UIGraphicsImageRenderer(size: size, format: fmt).image { _ in img.draw(in: CGRect(origin: .zero, size: size)) }
            try? small.pngData()?.write(to: file)
        }
    }

    // MARK: background refresh (iOS decides when; usually every 15-60 minutes)

    func registerBackgroundRefresh() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: refreshTask, using: nil) { task in
            self.scheduleBackgroundRefresh()
            DispatchQueue.main.async {
                self.updatePrayerActivity()
                self.scheduleNotifications()
                WidgetCenter.shared.reloadAllTimelines()
                self.poll(force: true) { task.setTaskCompleted(success: true) }
            }
            task.expirationHandler = { task.setTaskCompleted(success: false) }
        }
    }

    func scheduleBackgroundRefresh() {
        let r = BGAppRefreshTaskRequest(identifier: refreshTask)
        r.earliestBeginDate = Date().addingTimeInterval(15 * 60)
        try? BGTaskScheduler.shared.submit(r)
    }

    // MARK: Thmanyah for the island (downloaded once, like the Android app: its licence forbids bundling it)

    func downloadFonts() {
        let base = "https://cdn.jsdelivr.net/gh/engdawood/thmanyah-font-web@451a047/fonts/thmanyah-sans/otf/thmanyah-sans-"
        for w in DC.fontWeights {
            let file = DCShared.dir("fonts").appendingPathComponent("thmanyah-sans-\(w).otf")
            if FileManager.default.fileExists(atPath: file.path) { continue }
            guard let u = URL(string: base + w + ".otf") else { continue }
            URLSession.shared.dataTask(with: u) { data, resp, _ in
                guard let data, data.count > 20_000, (resp as? HTTPURLResponse)?.statusCode == 200 else { return }
                try? data.write(to: file)
                DC.registerFonts()
                WidgetCenter.shared.reloadAllTimelines()
            }.resume()
        }
    }
}
