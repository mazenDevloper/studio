import ActivityKit
import SwiftUI
import WidgetKit

/// The Dynamic Island and lock-screen look of the islands, like the app's floating islands on Android / the site:
/// black glass, the glass countdown (blue for the adhan, green for the iqamah and reminders), round team logos, the red
/// minute badge, the score in emerald while live, the gold ring of a favourite team's live match.
struct IslandLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: IslandAttributes.self) { context in
            LockScreenView(s: context.state, stale: context.isStale)
                .activityBackgroundTint(Color.black.opacity(0.88))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            let s = context.state
            let stale = context.isStale
            let match = s.kind == "match"
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    if match {
                        TeamView(name: s.home, logo: s.homeLogo, size: 44, bright: s.scored == "home")
                    } else {
                        IconSquare(kind: s.kind, size: 44)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if match {
                        TeamView(name: s.away, logo: s.awayLogo, size: 44, bright: s.scored == "away")
                    } else {
                        Text(s.timeText)
                            .font(DC.font(15, "Bold"))
                            .foregroundColor(.white.opacity(0.5))
                            .padding(.top, 12)
                    }
                }
                DynamicIslandExpandedRegion(.center) {
                    if match {
                        VStack(spacing: 2) {
                            ScoreText(s: s, size: 34)
                            if s.status == "live" { MinuteBadge(text: s.minute, size: 13) }
                            else if s.status == "finished" { Text("انتهت").font(DC.font(12, "Bold")).foregroundColor(.white.opacity(0.5)) }
                        }
                    } else {
                        VStack(spacing: 0) {
                            Text(s.title).font(DC.font(15, "Bold")).foregroundColor(.white.opacity(0.8)).lineLimit(1)
                            CountdownText(s: s, stale: stale, size: 34)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if match {
                        if !s.league.isEmpty {
                            Text(s.league).font(DC.font(11, "Bold")).foregroundColor(.white.opacity(0.4)).lineLimit(1)
                        }
                    } else if !stale && s.end > Date() && s.start < s.end {
                        ProgressView(timerInterval: s.start...s.end, countsDown: true) { EmptyView() } currentValueLabel: { EmptyView() }
                            .tint(DC.color(for: s.kind))
                            .padding(.horizontal, 8)
                    }
                }
            } compactLeading: {
                if match {
                    HStack(spacing: 4) {
                        Logo(file: s.homeLogo, name: s.home, size: 22)
                        if s.status == "live" { MinuteBadge(text: s.minute, size: 10) }
                    }
                } else {
                    IconSquare(kind: s.kind, size: 22)
                }
            } compactTrailing: {
                if match {
                    HStack(spacing: 4) {
                        ScoreText(s: s, size: 15)
                        Logo(file: s.awayLogo, name: s.away, size: 22)
                    }
                } else {
                    CountdownText(s: s, stale: stale, size: 15)
                        .frame(maxWidth: 64)
                }
            } minimal: {
                if match {
                    ScoreText(s: s, size: 12)
                } else {
                    IconSquare(kind: s.kind, size: 22)
                }
            }
            .keylineTint(match ? (s.fav && s.status == "live" ? DC.yellow : DC.emerald) : DC.color(for: s.kind))
        }
    }
}

// MARK: - pieces

/// "-04:59" counting down by itself; "الآن" once it is due.
struct CountdownText: View {
    let s: IslandAttributes.ContentState
    let stale: Bool
    let size: CGFloat

    var body: some View {
        let color = DC.color(for: s.kind)
        Group {
            if stale || s.end <= Date() {
                Text("الآن").font(DC.font(size))
            } else {
                Text(timerInterval: min(Date(), s.end)...s.end, countsDown: true)
                    .font(DC.font(size))
                    .monospacedDigit()
            }
        }
        .foregroundStyle(LinearGradient(colors: [color, color.opacity(0.6)], startPoint: .topLeading, endPoint: .bottomTrailing))
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
    let name: String
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle().fill(Color.white.opacity(0.07))
            Circle().stroke(Color.white.opacity(0.14), lineWidth: max(1, size / 22))
            if let img = DCShared.logo(file) {
                Image(uiImage: img).resizable().scaledToFit().frame(width: size * 0.78, height: size * 0.78)
            } else {
                Text(initials(name)).font(DC.font(size * 0.38)).foregroundColor(.white.opacity(0.6))
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
    let size: CGFloat
    let bright: Bool

    var body: some View {
        VStack(spacing: 3) {
            Logo(file: logo, name: name, size: size)
                .shadow(color: bright ? DC.emerald.opacity(0.8) : .clear, radius: 8)
            Text(name).font(DC.font(10, "Bold")).foregroundColor(.white.opacity(0.85)).lineLimit(1).frame(maxWidth: size * 1.9)
        }
    }
}

/// "د58" in a red pill.
struct MinuteBadge: View {
    let text: String
    let size: CGFloat

    var body: some View {
        Text(text.isEmpty ? "مباشر" : text)
            .font(DC.font(size))
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
        .font(DC.font(size))
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
                Logo(file: s.homeLogo, name: s.home, size: 40)
                Text(s.home).font(DC.font(14, "Bold")).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.7)
                Spacer(minLength: 4)
                ScoreText(s: s, size: 28)
                Spacer(minLength: 4)
                Text(s.away).font(DC.font(14, "Bold")).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.7)
                Logo(file: s.awayLogo, name: s.away, size: 40)
            }
            .environment(\.layoutDirection, .leftToRight)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(s.fav && s.status == "live" ? DC.yellow.opacity(0.7) : Color.white.opacity(0.1), lineWidth: 1.5)
            )
        } else {
            HStack(spacing: 14) {
                IconSquare(kind: s.kind, size: 46)
                VStack(alignment: .leading, spacing: 2) {
                    Text(s.title).font(DC.font(18)).foregroundColor(.white).lineLimit(1)
                    Text((s.kind == "azan" ? "الأذان · " : s.kind == "iqamah" ? "الإقامة · " : "التذكير · ") + s.timeText)
                        .font(DC.font(12, "Bold")).foregroundColor(.white.opacity(0.45))
                }
                Spacer()
                CountdownText(s: s, stale: stale, size: 36)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
        }
    }
}
