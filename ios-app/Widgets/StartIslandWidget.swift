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
                VStack(spacing: 8) {
                    Image(systemName: "sportscourt.fill").font(.system(size: 38, weight: .bold)).foregroundStyle(.green)
                    Text("ابدأ الجزيرة").font(.system(size: 16, weight: .heavy)).foregroundColor(.white)
                    Text("أقرب مباراة لفرقك").font(.system(size: 11, weight: .semibold)).foregroundColor(.white.opacity(0.6))
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .buttonStyle(.plain)
        .containerBackground(for: .widget) { Color.black }
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
