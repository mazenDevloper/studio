import ActivityKit
import SwiftUI
import WidgetKit

/// The Dynamic Island and lock-screen look of the islands, like the app's floating islands on Android / the site:
/// black glass, the countdown (blue for the adhan, green for the iqamah and reminders), round team logos, the red
/// minute badge, the score in emerald while live, the gold ring of a favourite team's live match, the goal card.
/// Each region is its own view so the previews (Snapshots) draw exactly the same thing.
struct IslandLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: IslandAttributes.self) { context in
            LockScreenView(s: context.state, stale: context.isStale)
                .activityBackgroundTint(Color.black.opacity(0.88))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            let s = context.state
            let stale = context.isStale
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { IslandLeading(s: s) }
                DynamicIslandExpandedRegion(.trailing) { IslandTrailing(s: s) }
                DynamicIslandExpandedRegion(.center) { IslandCenter(s: s, stale: stale) }
                DynamicIslandExpandedRegion(.bottom) { IslandBottom(s: s, stale: stale) }
            } compactLeading: {
                IslandCompactLeading(s: s)
            } compactTrailing: {
                IslandCompactTrailing(s: s, stale: stale)
            } minimal: {
                IslandMinimal(s: s)
            }
            .keylineTint(s.kind == "match" ? (s.fav && s.status == "live" ? DC.yellow : DC.emerald) : DC.color(for: s.kind))
        }
    }
}

// MARK: - the regions

struct IslandLeading: View {
    let s: IslandAttributes.ContentState
    var body: some View {
        if s.kind == "match" {
            TeamView(name: s.home, logo: s.homeLogo, data: s.homeLogoData, size: 44, bright: s.scored == "home")
        } else {
            IconSquare(kind: s.kind, size: 44)
        }
    }
}

struct IslandTrailing: View {
    let s: IslandAttributes.ContentState
    var body: some View {
        if s.kind == "match" {
            TeamView(name: s.away, logo: s.awayLogo, data: s.awayLogoData, size: 44, bright: s.scored == "away")
        } else {
            Text(s.timeText).font(LA.font(15, "Bold")).foregroundColor(.white.opacity(0.5)).padding(.top, 12)
        }
    }
}

struct IslandCenter: View {
    let s: IslandAttributes.ContentState
    let stale: Bool
    var body: some View {
        if s.kind == "match" {
            VStack(spacing: 2) {
                ScoreText(s: s, size: 34)
                if s.status == "live" { MinuteBadge(text: s.minute, size: 13) }
                else if s.status == "finished" { Text("انتهت").font(LA.font(12, "Bold")).foregroundColor(.white.opacity(0.5)) }
            }
        } else {
            VStack(spacing: 0) {
                Text(s.title).font(LA.font(15, "Bold")).foregroundColor(.white.opacity(0.8)).lineLimit(1)
                CountdownText(s: s, stale: stale, size: 34)
            }
        }
    }
}

struct IslandBottom: View {
    let s: IslandAttributes.ContentState
    let stale: Bool
    var body: some View {
        if s.kind == "match" {
            VStack(spacing: 4) {
                if !s.scored.isEmpty && s.status == "live" { GoalCard(s: s, big: true) }
                if !s.league.isEmpty {
                    Text(s.league).font(LA.font(11, "Bold")).foregroundColor(.white.opacity(0.4)).lineLimit(1)
                }
            }
        } else {
            VStack(spacing: 4) {
                if !stale && s.end > Date() && s.start < s.end {
                    ProgressView(timerInterval: s.start...s.end, countsDown: true) { EmptyView() } currentValueLabel: { EmptyView() }
                        .tint(DC.color(for: s.kind))
                }
                if !s.note.isEmpty {
                    Text(s.note).font(LA.font(11, "Bold")).foregroundColor(DC.emerald.opacity(0.85)).lineLimit(1).minimumScaleFactor(0.7)
                }
            }
            .padding(.horizontal, 8)
        }
    }
}

struct IslandCompactLeading: View {
    let s: IslandAttributes.ContentState
    var body: some View {
        if s.kind == "match" {
            HStack(spacing: 4) {
                Logo(file: s.homeLogo, data: s.homeLogoData, name: s.home, size: 22)
                if !s.scored.isEmpty && s.status == "live" { Text("⚽").font(.system(size: 14)) }
                else if s.status == "live" { MinuteBadge(text: s.minute, size: 10) }
            }
        } else {
            IconSquare(kind: s.kind, size: 22)
        }
    }
}

struct IslandCompactTrailing: View {
    let s: IslandAttributes.ContentState
    let stale: Bool
    var body: some View {
        if s.kind == "match" {
            HStack(spacing: 4) {
                ScoreText(s: s, size: 15)
                Logo(file: s.awayLogo, data: s.awayLogoData, name: s.away, size: 22)
            }
        } else if stale || s.end <= Date() {
            Text("الآن").font(LA.font(14)).foregroundColor(DC.color(for: s.kind))
        } else {
            // a plain timer with a fixed width, one solid colour: a gradient / mask turns a timer into a still picture
            Text(timerInterval: Date()...max(Date(), s.end), countsDown: true)
                .font(LA.font(14))
                .monospacedDigit()
                .foregroundColor(DC.color(for: s.kind))
                .multilineTextAlignment(.center)
                .frame(width: s.end.timeIntervalSinceNow >= 3600 ? 62 : 46)
                .environment(\.layoutDirection, .leftToRight)
        }
    }
}

struct IslandMinimal: View {
    let s: IslandAttributes.ContentState
    var body: some View {
        if s.kind == "match" {
            if !s.scored.isEmpty && s.status == "live" { Text("⚽").font(.system(size: 14)) } else { ScoreText(s: s, size: 12) }
        } else {
            IconSquare(kind: s.kind, size: 22)
        }
    }
}

/// "⚽ هدف! <team>" — the island's goal card (the Android goal animation's card)
struct GoalCard: View {
    let s: IslandAttributes.ContentState
    let big: Bool
    var body: some View {
        let team = s.scored == "home" ? s.home : s.away
        HStack(spacing: 6) {
            Text("⚽").font(.system(size: big ? 18 : 15))
            Text("هدف!").font(LA.font(big ? 18 : 15)).foregroundColor(.black)
            Text(team).font(LA.font(big ? 14 : 12, "Bold")).foregroundColor(.black.opacity(0.75)).lineLimit(1)
            Text("\(s.sh)-\(s.sa)").font(LA.font(big ? 16 : 13)).foregroundColor(.black).monospacedDigit()
                .environment(\.layoutDirection, .leftToRight)
        }
        .padding(.horizontal, 14).padding(.vertical, big ? 5 : 4)
        .background(Capsule().fill(LinearGradient(colors: [DC.yellow, Color(red: 1, green: 0.62, blue: 0.1)], startPoint: .leading, endPoint: .trailing)))
        .shadow(color: DC.yellow.opacity(0.6), radius: 8)
    }
}

// MARK: - pieces

/// Live Activity fonts: the system's rounded heavy font (custom fonts are not reliable in the island).
enum LA {
    static func font(_ size: CGFloat, _ weight: String = "Black") -> Font {
        .system(size: size, weight: weight == "Black" ? .heavy : weight == "Bold" ? .bold : .semibold, design: .rounded)
    }
}

/// "-04:59" counting down by itself; "الآن" once it is due.
struct CountdownText: View {
    let s: IslandAttributes.ContentState
    let stale: Bool
    let size: CGFloat

    var body: some View {
        let color = DC.color(for: s.kind)
        Group {
            if stale || s.end <= Date() {
                Text("الآن").font(LA.font(size))
            } else {
                Text(timerInterval: min(Date(), s.end)...s.end, countsDown: true)
                    .font(LA.font(size))
                    .monospacedDigit()
            }
        }
        // one solid colour (+ a glow): a gradient fill makes iOS draw the timer as a still picture that stops counting
        .foregroundColor(color)
        .shadow(color: color.opacity(0.55), radius: 6)
        .multilineTextAlignment(.center)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
    }
}

/// The clock (adhan) / timer (iqamah) / bell (reminder) in a tinted rounded square.
struct IconSquare: View {
    let kind: String
    let size: CGFloat

    var body: some View {
        let color = DC.color(for: kind)
        RoundedRectangle(cornerRadius: size * 0.3, style: .continuous)
            .fill(color.opacity(0.2))
            .frame(width: size, height: size)
            .overlay(
                Image(systemName: kind == "azan" ? "clock" : kind == "iqamah" ? "timer" : "bell.fill")
                    .font(.system(size: size * 0.5, weight: .bold))
                    .foregroundColor(color)
            )
    }
}

/// A team logo on the site's round plate (initials when there is no logo).
struct Logo: View {
    let file: String
    var data: Data? = nil
    let name: String
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle().fill(Color.white.opacity(0.07))
            Circle().stroke(Color.white.opacity(0.14), lineWidth: max(1, size / 22))
            if let img = DCShared.logo(file) ?? data.flatMap({ UIImage(data: $0) }) {
                Image(uiImage: img).resizable().scaledToFit().frame(width: size * 0.78, height: size * 0.78)
            } else {
                Text(initials(name)).font(LA.font(size * 0.38)).foregroundColor(.white.opacity(0.6))
            }
        }
        .frame(width: size, height: size)
    }

    private func initials(_ n: String) -> String {
        let parts = n.split(separator: " ")
        if parts.count >= 2 { return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased() }
        return String(n.prefix(2)).uppercased()
    }
}

struct TeamView: View {
    let name: String
    let logo: String
    var data: Data? = nil
    let size: CGFloat
    let bright: Bool

    var body: some View {
        VStack(spacing: 3) {
            Logo(file: logo, data: data, name: name, size: size)
                .shadow(color: bright ? DC.emerald.opacity(0.8) : .clear, radius: 8)
            Text(name).font(LA.font(10, "Bold")).foregroundColor(.white.opacity(0.85)).lineLimit(1).frame(maxWidth: size * 1.9)
        }
    }
}

/// "د58" in a red pill.
struct MinuteBadge: View {
    let text: String
    let size: CGFloat

    var body: some View {
        Text(text.isEmpty ? "مباشر" : text)
            .font(LA.font(size))
            .foregroundColor(.white)
            .padding(.horizontal, size * 0.55)
            .padding(.vertical, size * 0.18)
            .background(Capsule().fill(DC.red))
            .shadow(color: DC.red.opacity(0.6), radius: 4)
            .lineLimit(1)
    }
}

/// The score (left to right like the site: home - away): emerald while live, the kick-off time before.
struct ScoreText: View {
    let s: IslandAttributes.ContentState
    let size: CGFloat

    var body: some View {
        Group {
            if s.status == "upcoming" {
                Text(s.timeText).foregroundColor(.white.opacity(0.85))
            } else {
                Text("\(s.sh)-\(s.sa)")
                    .foregroundStyle(s.status == "live"
                        ? LinearGradient(colors: [DC.emerald, DC.emerald.opacity(0.6)], startPoint: .topLeading, endPoint: .bottomTrailing)
                        : LinearGradient(colors: [.white, .white.opacity(0.5)], startPoint: .topLeading, endPoint: .bottomTrailing))
            }
        }
        .font(LA.font(size))
        .monospacedDigit()
        .environment(\.layoutDirection, .leftToRight)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
    }
}

// MARK: - lock screen / notification banner

struct LockScreenView: View {
    let s: IslandAttributes.ContentState
    let stale: Bool

    var body: some View {
        if s.kind == "match" {
            HStack(spacing: 10) {
                if s.status == "live" { MinuteBadge(text: s.minute, size: 14) }
                Logo(file: s.homeLogo, data: s.homeLogoData, name: s.home, size: 40)
                Text(s.home).font(LA.font(14, "Bold")).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.7)
                Spacer(minLength: 4)
                ScoreText(s: s, size: 28)
                Spacer(minLength: 4)
                Text(s.away).font(LA.font(14, "Bold")).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.7)
                Logo(file: s.awayLogo, data: s.awayLogoData, name: s.away, size: 40)
            }
            .environment(\.layoutDirection, .leftToRight)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .overlay(alignment: .top) {
                if !s.scored.isEmpty && s.status == "live" { GoalCard(s: s, big: false).offset(y: -2) }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(s.fav && s.status == "live" ? DC.yellow.opacity(0.7) : Color.white.opacity(0.1), lineWidth: 1.5)
            )
        } else {
            HStack(spacing: 14) {
                IconSquare(kind: s.kind, size: 46)
                VStack(alignment: .leading, spacing: 2) {
                    Text(s.title).font(LA.font(18)).foregroundColor(.white).lineLimit(1)
                    Text((s.kind == "azan" ? "الأذان · " : s.kind == "iqamah" ? "الإقامة · " : "التذكير · ") + s.timeText)
                        .font(LA.font(12, "Bold")).foregroundColor(.white.opacity(0.45))
                    if !s.note.isEmpty {
                        Text(s.note).font(LA.font(11, "Bold")).foregroundColor(DC.emerald.opacity(0.85)).lineLimit(1).minimumScaleFactor(0.7)
                    }
                }
                Spacer()
                CountdownText(s: s, stale: stale, size: 36)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
        }
    }
}
