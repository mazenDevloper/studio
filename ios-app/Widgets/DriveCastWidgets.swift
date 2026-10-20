import SwiftUI
import WidgetKit

@main
struct DriveCastWidgets: WidgetBundle {
    var body: some Widget {
        #if NO_LIVE_ACTIVITY
        PrayerWidget()
        MoreWidgets().body
        #else
        IslandLiveActivity()
        PrayerWidget()
        MoreWidgets().body
        if #available(iOS 17.0, *) { StartIslandWidget() }
        if #available(iOS 18.0, *) { StartIslandControl() }
        #endif
    }
}

/// The rest of the Android app's widgets (a bundle holds at most 10 in one block).
struct MoreWidgets: WidgetBundle {
    var body: some Widget {
        MatchesWidget()
        DayWidget()
        AzkarWidget()
        ManuscriptWidget()
        MoonWidget()
        ClockWidget()
        ControlsWidget()
        RecitersWidget()
        ChannelsWidget()
        FoldersWidget()
    }
}
