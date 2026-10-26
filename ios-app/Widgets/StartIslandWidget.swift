import AppIntents
import SwiftUI
import WidgetKit

/// The «ابدأ الجزيرة» button as a widget: Home Screen (small) and Lock Screen (circle / line).
@available(iOS 17.0, *)
struct StartIslandWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DriveCastStartIsland", provider: StartIslandProvider()) { _ in
            StartIslandView()
        }
        .configurationDisplayName("ابدأ الجزيرة")
        .description("ضغطة واحدة تُظهر أقرب مباراة لفرقك في الجزيرة دون فتح التطبيق")
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular])
    }
}

@available(iOS 17.0, *)
struct StartIslandProvider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry { SimpleEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) { completion(SimpleEntry(date: Date())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        completion(Timeline(entries: [SimpleEntry(date: Date())], policy: .never))
    }
}

struct SimpleEntry: TimelineEntry { let date: Date }

@available(iOS 17.0, *)
struct StartIslandView: View {
    @Environment(\.widgetFamily) var family
    var body: some View {
        Button(intent: StartIslandIntent()) {
            switch family {
            case .accessoryCircular:
                ZStack { AccessoryWidgetBackground(); Image(systemName: "sportscourt.fill").font(.system(size: 22, weight: .bold)) }
            case .accessoryRectangular:
                HStack(spacing: 6) {
                    Image(systemName: "sportscourt.fill").font(.system(size: 20, weight: .bold))
                    VStack(alignment: .leading, spacing: 0) {
                        Text("ابدأ الجزيرة").font(.system(size: 15, weight: .bold))
                        Text("أقرب مباراة").font(.system(size: 12)).opacity(0.7)
                    }
                }
            default:
                VStack(spacing: 6) {
                    Image(systemName: "sportscourt.fill").font(.system(size: 30, weight: .bold)).foregroundStyle(.green)
                    Text("ابدأ الجزيرة").font(.system(size: 15, weight: .heavy)).foregroundColor(.white)
                    Text("أقرب مباراة لفرقك").font(.system(size: 10, weight: .semibold)).foregroundColor(.white.opacity(0.6))
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .buttonStyle(.plain)
        .overlay(alignment: .bottom) {
            // «البقاء في الخلفية»: the only switch for it (on by default)
            if family == .systemSmall {
                Button(intent: ToggleAliveIntent()) {
                    HStack(spacing: 5) {
                        Circle().fill(DCAlive.on ? Color.green : Color.gray).frame(width: 8, height: 8)
                        Text(DCAlive.on ? "يعمل في الخلفية" : "الخلفية متوقفة").font(.system(size: 11, weight: .bold)).foregroundColor(.white)
                    }
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(Capsule().fill(Color.white.opacity(0.14)))
                }
                .buttonStyle(.plain)
            }
        }
        .containerBackground(for: .widget) { Color.black }
    }
}

/// «البقاء في الخلفية» in Control Center / Lock Screen (iOS 18+): the same switch as on the island widget.
@available(iOS 18.0, *)
struct AliveControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "DriveCastAliveControl") {
            ControlWidgetButton(action: ToggleAliveIntent()) {
                Label(DCAlive.on ? "يعمل في الخلفية" : "الخلفية متوقفة", systemImage: DCAlive.on ? "bolt.horizontal.circle.fill" : "bolt.horizontal.circle")
            }
        }
        .displayName("البقاء في الخلفية")
        .description("الجزيرة والودجت تتحدث لحظياً")
    }
}

/// The same button in Control Center, on the Lock Screen's bottom corners and on the Action Button (iOS 18+).
@available(iOS 18.0, *)
struct StartIslandControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "DriveCastStartIslandControl") {
            ControlWidgetButton(action: StartIslandIntent()) {
                Label("ابدأ الجزيرة", systemImage: "sportscourt.fill")
            }
        }
        .displayName("ابدأ الجزيرة")
        .description("أقرب مباراة لفرقك في الجزيرة الديناميكية")
    }
}
