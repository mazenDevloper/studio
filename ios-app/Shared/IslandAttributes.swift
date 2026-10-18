import ActivityKit
import Foundation

/// One Live Activity type for everything the island shows: a countdown (adhan, iqamah, reminder) or a match.
struct IslandAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// azan | iqamah | reminder | match
        var kind: String
        var title: String
        /// countdown: from (for the progress bar) / to
        var start: Date
        var end: Date
        /// the target time as text ("6:17")
        var timeText: String
        // match
        var home: String = ""
        var away: String = ""
        /// logo file names in the shared folder
        var homeLogo: String = ""
        var awayLogo: String = ""
        /// the logos themselves, tiny (~1 KB each), carried inside the Live Activity: shown even when the app and
        /// the widget part share no folder (sideloaded without an App Group)
        var homeLogoData: Data? = nil
        var awayLogoData: Data? = nil
        var sh: Int = 0
        var sa: Int = 0
        /// upcoming | live | finished
        var status: String = ""
        var minute: String = ""
        var fav: Bool = false
        var league: String = ""
        /// side that just scored ("home" / "away"), shown bright for a while
        var scored: String = ""
        /// who scored it and when ("Salah 67'")
        var scorer: String = ""
        /// the day's occasion / a saying under the prayer countdown (like Android's occasion islands)
        var note: String = ""
        /// the event after this one: the island moves on to it by itself when the first is due (no app needed)
        var nKind: String = ""
        var nTitle: String = ""
        var nEnd: Date? = nil
        var nTime: String = ""
        /// a match island also carrying the next prayer / reminder (one island for both)
        var pKind: String = ""
        var pTitle: String = ""
        var pEnd: Date? = nil
        var pTime: String = ""
        var pnKind: String = ""
        var pnTitle: String = ""
        var pnEnd: Date? = nil
    }

    /// prayer | match
    var type: String
    var matchId: String
}

extension IslandAttributes.ContentState {
    /// The countdown to show now: this event, or the next one once this is due.
    func countdown(stale: Bool) -> (kind: String, title: String, end: Date, time: String) {
        if (stale || end <= Date()), let n = nEnd, n > Date() { return (nKind, nTitle, n, nTime) }
        return (kind, title, end, timeText)
    }
    /// A match island's prayer / reminder part (nil: none).
    var prayerPart: (kind: String, title: String, end: Date)? {
        guard let e = pEnd else { return nil }
        if e <= Date(), let n = pnEnd, n > Date() { return (pnKind, pnTitle, n) }
        return (pKind, pTitle, e)
    }
}
