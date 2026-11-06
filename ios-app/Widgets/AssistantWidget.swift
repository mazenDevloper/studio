import WidgetKit
import SwiftUI

/// «المساعد»: your Memoji (or any picture with a transparent background chosen in the dashboard's Memoji widget)
/// on the home screen; tapping it opens the voice assistant. The picture is a file the app writes into the
/// shared folder (assistant.png); without one, the bundled Memoji.
struct AssistantEntry: TimelineEntry { let date: Date }

struct AssistantProvider: TimelineProvider {
    func placeholder(in context: Context) -> AssistantEntry { AssistantEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (AssistantEntry) -> Void) { completion(AssistantEntry(date: Date())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<AssistantEntry>) -> Void) {
        completion(Timeline(entries: [AssistantEntry(date: Date())], policy: .never))   // changes only when the app reloads it
    }
}

struct AssistantWidgetView: View {
    var entry: AssistantEntry
    var picture: UIImage? {
        if let u = UIImage(contentsOfFile: DCShared.folder.appendingPathComponent("assistant.png").path) { return u }
        return UIImage(named: "assistant_memoji")
    }
    var body: some View {
        ZStack {
            if let p = picture {
                Image(uiImage: p).resizable().scaledToFit().padding(6)
            } else {
                Text("🎤").font(.system(size: 44))
            }
        }
        .widgetURL(DCLink.voice)
        .assistantBackground()
    }
}

private extension View {
    @ViewBuilder func assistantBackground() -> some View {
        if #available(iOS 17.0, *) { self.containerBackground(.clear, for: .widget) } else { self }
    }
}

struct AssistantWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AssistantWidget", provider: AssistantProvider()) { entry in
            AssistantWidgetView(entry: entry)
        }
        .configurationDisplayName("المساعد")
        .description("ميموجيك أو أي صورة بخلفية شفافة — اضغطها لتكلّم المساعد")
        .supportedFamilies([.systemSmall])
        .contentMarginsDisabledIfAvailable()
    }
}

private extension WidgetConfiguration {
    func contentMarginsDisabledIfAvailable() -> some WidgetConfiguration {
        if #available(iOSApplicationExtension 17.0, *) { return self.contentMarginsDisabled() } else { return self }
    }
}
