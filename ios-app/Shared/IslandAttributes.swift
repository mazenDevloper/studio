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
        /// the day's occasion / a saying under the prayer countdown (like Android's occasion islands)
        var note: String = ""
    }

    /// prayer | match
    var type: String
    var matchId: String
}
