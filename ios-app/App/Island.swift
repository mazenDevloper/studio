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
    /// the last reason iOS refused to start a Live Activity (shown in the diagnostics)
    static var lastError = ""

    /// What the phone really has: the widget part inside the app, the shared folder, the Live Activities switch.
    static func diagnostics() -> String {
        let app = Bundle.main.bundleIdentifier ?? "?"
        var ext = "غير موجود ✗"
        if let dir = Bundle.main.builtInPlugInsURL,
           let items = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) {
            let names = items.compactMap { Bundle(url: $0)?.bundleIdentifier }
            if !names.isEmpty { ext = names.joined(separator: ", ") + (names.allSatisfy { $0.hasPrefix(app + ".") } ? " ✓" : " ✗ (لا يبدأ بمعرّف التطبيق)") }
        }
        let cfg = DCShared.json("config")
        let events = DCShared.events().filter { $0.at > Date() }.count
        let running = Activity<IslandAttributes>.activities.filter { $0.activityState == .active }.count
        return [
            "التطبيق: \(app)",
            "جزء الودجت: \(ext)",
            "المجلد المشترك: \(DCShared.group) " + (DCShared.groupWorks ? "✓" : "✗"),
            "الأنشطة المباشرة: " + (ActivityAuthorizationInfo().areActivitiesEnabled ? "مفعّلة ✓" : "مطفأة ✗"),
            "المواقيت القادمة: \(events) · المصدر: " + (cfg.isEmpty ? "السيرفر (الموقع لم يرسل بعد)" : "الموقع") + (events > 0 ? " ✓" : " ✗"),
            "جزر تعمل الآن: \(running)",
            "جزيرة المباريات: " + (UserDefaults.standard.bool(forKey: "matchesIsland") ? "مفعّلة" : "مطفأة") + " · مباريات فرقك اليوم: \(Island.shared.matches.count)" + " · المصدر: سيرفر DriveCast ✓",
            "آخر خطأ: " + (lastError.isEmpty ? "لا يوجد" : lastError),
            "iOS \(UIDevice.current.systemVersion)",
        ].joined(separator: "\n")
    }
    private let refreshTask = "com.drivecast.sovereign.refresh"
    private var timer: Timer?
    private var lastPoll: Date = .distantPast
    private var lastPollOk: Date = .distantPast
    private var pollFailed = false
    private var polling = false
    private(set) var matches: [[String: Any]] = []

    /// the controls widget's eye: every island hidden until shown again
    var hidden: Bool { UserDefaults.standard.bool(forKey: "islandsHidden") }
    private var prayerOn: Bool { UserDefaults.standard.bool(forKey: "prayerIsland") && !hidden }
    private var matchesOn: Bool { UserDefaults.standard.bool(forKey: "matchesIsland") && !hidden }

    /// show / hide all the islands (the controls widget)
    func toggleHidden() {
        UserDefaults.standard.set(!hidden, forKey: "islandsHidden")
        settingsChanged()
    }

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
        KeepAlive.shared.stopIfIdle()
    }

    /// every 5 s while the app runs (open, or in the background playing media)
    private func tick() {
        updatePrayerActivity()
        if matchesOn && pollDue() { poll(force: false) }
    }

    // MARK: prayers + reminders

    private func prayerActivity() -> Activity<IslandAttributes>? {
        // only a running one: iOS ends a Live Activity after 8 hours (or the user swipes it away) - then a new one starts
        Activity<IslandAttributes>.activities.first { $0.attributes.type == "prayer" && $0.activityState == .active }
    }

    /// the next two prayers / reminders (the island moves to the second by itself)
    private func nextEvents() -> [(title: String, at: Date, kind: String)] {
        let now = Date()
        return Array(DCShared.events().filter { $0.at > now }.prefix(3))
    }

    /// a match is on the island now (it carries the prayer too: one island)
    private var matchActive = false
    private var turn = 0

    private func updatePrayerActivity() {
        let current = prayerActivity()
        if matchActive && matchesOn {
            // the match lives in the prayer island itself, or in its own island (then this one goes)
            if current?.content.state.kind == "match" { return }
            if let a = current { Task { await a.end(nil, dismissalPolicy: .immediate) } }
            return
        }
        guard prayerOn else {
            if let a = current { Task { await a.end(nil, dismissalPolicy: .immediate) } }
            return
        }
        let now = Date()
        let all = DCShared.events()
        guard let next = all.first(where: { $0.at > now }) else { return }
        let prev = all.last(where: { $0.at <= now })?.at ?? now.addingTimeInterval(-3600)
        var state = IslandAttributes.ContentState(kind: next.kind, title: next.title, start: max(prev, next.at.addingTimeInterval(-6 * 3600)),
                                                  end: next.at, timeText: DCShared.time12(next.at))
        state.note = Hijri.occasionLine(now)
        if let n = nextEvents().dropFirst().first {
            state.nKind = n.kind; state.nTitle = n.title; state.nEnd = n.at; state.nTime = DCShared.time12(n.at)
        }
        let content = ActivityContent(state: state, staleDate: next.at)
        if let a = current {
            if a.content.state != state { Task { await a.update(content) } }
        } else if ActivityAuthorizationInfo().areActivitiesEnabled && UIApplication.shared.applicationState == .active {
            do { _ = try Activity.request(attributes: IslandAttributes(type: "prayer", matchId: ""), content: content, pushType: nil); Island.lastError = "" }
            catch { Island.lastError = "\(error)" }
        }
    }

    /// A notification at each adhan / iqamah / reminder of the next two days (they come with the app closed).
    private func scheduleNotifications() {
        let c = UNUserNotificationCenter.current()
        c.getPendingNotificationRequests { pending in
            c.removePendingNotificationRequests(withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix("dc-") })
            guard UserDefaults.standard.bool(forKey: "prayerIsland") else { return }
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

    /// an island is (or will soon be) showing: keep the app running behind other apps to move it on
    var needsKeepAlive: Bool {
        if hidden { return false }
        // prayers / reminders: the island moves on by itself (two events inside it) and iOS's background refresh
        // brings the next ones - no need to keep the app running for them
        if matchesOn {
            let now = Date()
            return matches.contains { m in
                let st = m["status"] as? String ?? ""
                let k = Date(timeIntervalSince1970: (m["timestamp"] as? NSNumber)?.doubleValue ?? 0)
                return st == "live" || (st == "upcoming" && k.timeIntervalSince(now) < 15 * 60)
            }
        }
        return false
    }

    // MARK: test (the settings' buttons): sample islands, and four goals 3 s apart

    private var testTimers: [Timer] = []

    func test(kind: String) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { Island.lastError = "الأنشطة المباشرة مطفأة"; return }
        testTimers.forEach { $0.invalidate() }
        testTimers.removeAll()
        for a in Activity<IslandAttributes>.activities where a.attributes.matchId.hasPrefix("test") {
            Task { await a.end(nil, dismissalPolicy: .immediate) }
        }
        let home = "https://media.api-sports.io/football/teams/2939.png", away = "https://media.api-sports.io/football/teams/2932.png"
        let m: [String: Any] = ["home": ["logo": home], "away": ["logo": away]]
        DispatchQueue.global().async {
            self.saveLogos(m)
            DispatchQueue.main.async { self.startTest(kind: kind, home: home, away: away) }
        }
    }

    private func startTest(kind: String, home: String, away: String) {
        func state(_ sh: Int, _ sa: Int, _ minute: Int, _ scored: String) -> IslandAttributes.ContentState {
            var st = IslandAttributes.ContentState(kind: "match", title: "دوري روشن السعودي", start: Date(), end: Date(), timeText: "9:00")
            st.home = "النصر"; st.away = "الهلال"
            st.homeLogo = Self.logoFile(home); st.awayLogo = Self.logoFile(away)
            if !DCShared.groupWorks { st.homeLogoData = Self.tinyLogo(home); st.awayLogoData = Self.tinyLogo(away) }
            st.sh = sh; st.sa = sa; st.status = "live"; st.minute = "د\(minute)"; st.fav = true; st.league = st.title; st.scored = scored
            return st
        }
        var activity: Activity<IslandAttributes>?
        do {
            activity = try Activity.request(attributes: IslandAttributes(type: "match", matchId: "test-match"),
                                            content: ActivityContent(state: state(0, 0, 30, ""), staleDate: nil), pushType: nil)
        } catch { Island.lastError = "\(error)"; return }
        var extra: Activity<IslandAttributes>?
        if kind == "islands" {
            // a reminder counting down two minutes, beside the match
            let r = IslandAttributes.ContentState(kind: "reminder", title: "تذكير تجريبي", start: Date(), end: Date().addingTimeInterval(120),
                                                  timeText: DCShared.time12(Date().addingTimeInterval(120)), note: Hijri.occasionLine())
            extra = try? Activity.request(attributes: IslandAttributes(type: "test", matchId: "test-reminder"),
                                          content: ActivityContent(state: r, staleDate: Date().addingTimeInterval(120)), pushType: nil)
        }
        let goals: [(Int, Int, Int, String)] = kind == "goal" ? [(1, 0, 34, "home"), (1, 1, 41, "away"), (2, 1, 67, "home"), (2, 2, 88, "away")] : []
        for (i, g) in goals.enumerated() {
            testTimers.append(Timer.scheduledTimer(withTimeInterval: Double(i + 1) * 3, repeats: false) { _ in
                let st = state(g.0, g.1, g.2, g.3)
                let team = g.3 == "home" ? st.home : st.away
                Task {
                    await activity?.update(ActivityContent(state: st, staleDate: nil),
                                           alertConfiguration: AlertConfiguration(title: "⚽ هدف! \(team)", body: "\(st.home) \(g.0)-\(g.1) \(st.away)", sound: .default))
                }
            })
        }
        testTimers.append(Timer.scheduledTimer(withTimeInterval: 60, repeats: false) { _ in
            Task {
                await activity?.end(nil, dismissalPolicy: .immediate)
                await extra?.end(nil, dismissalPolicy: .immediate)
            }
        })
    }

    // MARK: matches

    /// every 30 s while a match is live or about to start; otherwise not before 5 minutes ahead of the next kick-off
    private func pollDue() -> Bool {
        let now = Date()
        if now.timeIntervalSince(lastPoll) < 10 { return false }
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
        guard matchesOn, !polling else { done?(); return }
        polling = true
        lastPoll = Date()
        let pins = (cfg["pins"] as? [[String: Any]]) ?? []
        // Straight from 365Scores (favourites from the cloud): no waiting for the site, works with the app in the background.
        Direct365.fetch { list in
            guard let list else { self.polling = false; self.pollViaSite(cfg: cfg, pins: pins, done: done); return }
            var mine = list.filter { ($0["favorite"] as? Bool) ?? false }
            for m in list where !(m["favorite"] as? Bool ?? false) {
                let h = (m["home"] as? [String: Any])?["name"] as? String ?? "", a = (m["away"] as? [String: Any])?["name"] as? String ?? ""
                if pins.contains(where: { Self.same($0["home"] as? String ?? "", h) && Self.same($0["away"] as? String ?? "", a) }) { mine.append(m) }
            }
            if mine.isEmpty { mine = list }   // no island team marked: every match of your teams
            for m in mine { self.saveLogos(m) }
            self.polling = false; self.pollFailed = false; self.lastPollOk = Date()
            self.matches = mine
            self.scheduleKickoffs(list)
            self.updateMatchActivities()
            done?()
        }
    }

    private func pollViaSite(cfg: [String: Any], pins: [[String: Any]], done: (() -> Void)?) {
        guard let api = cfg["apiUrl"] as? String, let url = URL(string: api) else { pollFailed = true; done?(); return }
        polling = true
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
            if ok, mine.isEmpty, let o = try? JSONSerialization.jsonObject(with: data ?? Data()) as? [String: Any], let list = o["matches"] as? [[String: Any]] { mine = list }
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
        // one island: the most important match (live first), with the next prayer / reminder inside it
        let ordered = matches.sorted { a, b in
            let la = (a["status"] as? String) == "live", lb = (b["status"] as? String) == "live"
            if la != lb { return la }
            return ((a["favorite"] as? Bool) ?? false) && !((b["favorite"] as? Bool) ?? false)
        }
        let ev = prayerOn ? nextEvents() : []
        // several live: they take turns on the island, one per refresh
        let lives = ordered.filter { ($0["status"] as? String) == "live" }
        let kickOf = { (m: [String: Any]) in Date(timeIntervalSince1970: (m["timestamp"] as? NSNumber)?.doubleValue ?? 0) }
        let nearest = ordered.filter { ($0["status"] as? String) == "upcoming" && kickOf($0) > now.addingTimeInterval(-20 * 60) && kickOf($0) < now.addingTimeInterval(7 * 86400) }
            .min { kickOf($0) < kickOf($1) }
        let justDone = ordered.first { ($0["status"] as? String) == "finished" && now.timeIntervalSince(kickOf($0)) < 150 * 60 }
        turn += 1
        let pick: [[String: Any]] = !lives.isEmpty ? [lives[turn % lives.count]] : nearest.map { [$0] } ?? justDone.map { [$0] } ?? []
        for m in pick where seen.isEmpty {
            let id = "\(m["id"] ?? "")"
            let st = m["status"] as? String ?? ""
            let kick = kickOf(m)
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
                                                      start: kick, end: kick, timeText: Self.dayWord(kick) + Self.omanTime(m["omanTime"] as? String ?? ""))
            state.home = home["name"] as? String ?? ""
            state.away = away["name"] as? String ?? ""
            state.homeLogo = Self.logoFile(home["logo"] as? String)
            state.awayLogo = Self.logoFile(away["logo"] as? String)
            if !DCShared.groupWorks {
                state.homeLogoData = Self.tinyLogo(home["logo"] as? String)
                state.awayLogoData = Self.tinyLogo(away["logo"] as? String)
            }
            state.sh = sh
            state.sa = sa
            state.status = st
            state.minute = st == "live" ? (elapsed.map { "د\($0)" } ?? "مباشر") : ""
            state.fav = m["favorite"] as? Bool ?? false
            state.league = state.title
            state.scored = scored
            if !scored.isEmpty, let last = (m["goals"] as? [[String: Any]])?.last(where: { ($0["side"] as? String) == scored }) {
                let who = (last["player"] as? String) ?? "", min = (last["minute"] as? String) ?? ""
                let kind = (last["type"] as? String) == "own" ? " (عكسي)" : (last["type"] as? String) == "penalty" ? " (جزاء)" : ""
                state.scorer = [who + kind, min].filter { !$0.isEmpty }.joined(separator: " ")
            }
            if let e = ev.first {
                state.pKind = e.kind; state.pTitle = e.title; state.pEnd = e.at; state.pTime = DCShared.time12(e.at)
                if let n = ev.dropFirst().first { state.pnKind = n.kind; state.pnTitle = n.title; state.pnEnd = n.at }
            }
            let content = ActivityContent(state: state, staleDate: st == "live" ? now.addingTimeInterval(10 * 60) : st == "upcoming" ? max(kick, now.addingTimeInterval(600)) : now.addingTimeInterval(3 * 3600))
            // the match goes into the island already showing (the prayer one): iOS lets a running island change at
            // any time, while a new one can only start with the app open
            if let a = Activity<IslandAttributes>.activities.first(where: { $0.attributes.type == "match" && $0.attributes.matchId == id && $0.activityState == .active })
                ?? prayerActivity() {
                if a.content.state != state {
                    Task {
                        if !scored.isEmpty {
                            // a goal: the island opens up with a sound, like the goal card on Android
                            let team = scored == "home" ? state.home : state.away
                            await a.update(content, alertConfiguration: AlertConfiguration(title: "⚽ هدف! \(team)", body: "\(state.scorer.isEmpty ? "" : state.scorer + " · ")\(state.home) \(sh)-\(sa) \(state.away)", sound: .default))
                        } else {
                            await a.update(content)
                        }
                        if st == "finished" && a.attributes.type == "match" { await a.end(content, dismissalPolicy: .after(now.addingTimeInterval(30 * 60))) }
                    }
                }
            } else if st != "finished", ActivityAuthorizationInfo().areActivitiesEnabled, UIApplication.shared.applicationState == .active {
                do { _ = try Activity.request(attributes: IslandAttributes(type: "match", matchId: id), content: content, pushType: nil) }
                catch { Island.lastError = "\(error)" }
            }
            if !scored.isEmpty { notifyGoal(state, scored: scored) }
        }
        DCShared.defaults.set(nextScores, forKey: "goalScores")
        matchActive = !seen.isEmpty
        defer { DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.updatePrayerActivity() } }   // the prayer island again when no match
        for a in Activity<IslandAttributes>.activities where a.attributes.type == "match" && !seen.contains(a.attributes.matchId) && !a.attributes.matchId.hasPrefix("test") {
            Task { await a.end(nil, dismissalPolicy: .default) }
        }
    }

    private func endMatchActivities(now: Bool) {
        matchActive = false
        for a in Activity<IslandAttributes>.activities where a.attributes.type == "match" {
            Task { await a.end(nil, dismissalPolicy: now ? .immediate : .default) }
        }
    }

    private func notifyGoal(_ s: IslandAttributes.ContentState, scored: String) {
        let n = UNMutableNotificationContent()
        n.title = "⚽ هدف! \(scored == "home" ? s.home : s.away)"
        n.body = "\(s.home) \(s.sh) - \(s.sa) \(s.away)" + (s.minute.isEmpty ? "" : " · \(s.minute)")
        if !s.scorer.isEmpty { n.subtitle = s.scorer }
        n.sound = .default
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "goal-\(UUID().uuidString)", content: n, trigger: nil))
    }

    /// «غداً · » / «الخميس · » before the time (nothing for today)
    private static func dayWord(_ d: Date) -> String {
        let cal = Calendar.current, days = cal.dateComponents([.day], from: cal.startOfDay(for: Date()), to: cal.startOfDay(for: d)).day ?? 0
        if days <= 0 { return "" }
        if days == 1 { return "غداً · " }
        let names = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
        return names[cal.component(.weekday, from: d) - 1] + " · "
    }

    /// Kick-off alerts scheduled ahead (like the prayers): iOS fires them on time even with the app frozen.
    private func scheduleKickoffs(_ list: [[String: Any]]) {
        let c = UNUserNotificationCenter.current(), now = Date()
        c.getPendingNotificationRequests { pending in
            c.removePendingNotificationRequests(withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix("ko-") })
            for m in list where (m["status"] as? String) == "upcoming" {
                let kick = Date(timeIntervalSince1970: (m["timestamp"] as? NSNumber)?.doubleValue ?? 0)
                guard kick > now.addingTimeInterval(60), kick < now.addingTimeInterval(3 * 86400) else { continue }
                let h = (m["home"] as? [String: Any])?["name"] as? String ?? "", a = (m["away"] as? [String: Any])?["name"] as? String ?? ""
                for (before, title) in [(15.0 * 60, "بعد 15 دقيقة"), (0.0, "بدأت الآن")] {
                    let at = kick.addingTimeInterval(-before); guard at > now else { continue }
                    let n = UNMutableNotificationContent()
                    n.title = "⚽ \(title): \(h) × \(a)"
                    n.body = before > 0 ? "افتح DriveCast لتظهر الجزيرة وتتابع النتيجة" : "افتح DriveCast للنتيجة المباشرة في الجزيرة"
                    n.sound = .default
                    if #available(iOS 15.0, *) { n.interruptionLevel = .timeSensitive }
                    let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: at)
                    c.add(UNNotificationRequest(identifier: "ko-\(m["id"] ?? "")-\(Int(before))", content: n, trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)))
                }
            }
        }
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

    private static var tinyCache: [String: Data] = [:]

    /// A logo small enough to travel inside the Live Activity (its data has a ~4 KB limit): 30 px PNG, or a JPEG on
    /// the island's black when the PNG is too big.
    static func tinyLogo(_ url: String?) -> Data? {
        guard let url, !url.isEmpty else { return nil }
        if let d = tinyCache[url] { return d }
        let name = SHA256.hash(data: Data(url.utf8)).map { String(format: "%02x", $0) }.joined().prefix(24) + ".png"
        guard let img = UIImage(contentsOfFile: DCShared.dir("logos").appendingPathComponent(String(name)).path) else { return nil }
        for px in [30.0, 24.0, 20.0] {
            let scale = min(px / img.size.width, px / img.size.height, 1)
            let size = CGSize(width: max(1, (img.size.width * scale).rounded()), height: max(1, (img.size.height * scale).rounded()))
            let fmt = UIGraphicsImageRendererFormat()
            fmt.scale = 1
            let small = UIGraphicsImageRenderer(size: size, format: fmt).image { _ in img.draw(in: CGRect(origin: .zero, size: size)) }
            if let png = small.pngData(), png.count <= 1100 { tinyCache[url] = png; return png }
            fmt.opaque = true
            let flat = UIGraphicsImageRenderer(size: size, format: fmt).image { c in
                UIColor(white: 0.07, alpha: 1).setFill(); c.fill(CGRect(origin: .zero, size: size))
                img.draw(in: CGRect(origin: .zero, size: size))
            }
            for q in [0.7, 0.5, 0.35] {
                if let jpg = flat.jpegData(compressionQuality: q), jpg.count <= 1100 { tinyCache[url] = jpg; return jpg }
            }
        }
        return nil
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
