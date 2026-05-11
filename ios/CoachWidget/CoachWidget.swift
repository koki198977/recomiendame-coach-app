import WidgetKit
import SwiftUI

struct WidgetData: Codable {
    let caloriesTarget: Int
    let caloriesConsumed: Int
    let proteinTarget: Int
    let proteinConsumed: Int
    let nextWorkout: String?
    let lastUpdated: String
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), data: WidgetData(caloriesTarget: 2000, caloriesConsumed: 1200, proteinTarget: 150, proteinConsumed: 80, nextWorkout: "Pecho y Tríceps", lastUpdated: ""))
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), data: loadData())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = SimpleEntry(date: Date(), data: loadData())
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
    
    private func loadData() -> WidgetData {
        let userDefaults = UserDefaults(suiteName: "group.cl.recomiendameapp.coach")
        if let savedData = userDefaults?.string(forKey: "widgetData"),
           let jsonData = savedData.data(using: .utf8),
           let decodedData = try? JSONDecoder().decode(WidgetData.self, from: jsonData) {
            return decodedData
        }
        return WidgetData(caloriesTarget: 2000, caloriesConsumed: 0, proteinTarget: 150, proteinConsumed: 0, nextWorkout: "Sin datos", lastUpdated: "")
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct CoachWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Coach 🥑")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.green)
                Spacer()
                Text(entry.data.lastUpdated.prefix(5))
                    .font(.system(size: 8))
                    .foregroundColor(.gray)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text("Calorías")
                    .font(.system(size: 10, weight: .bold))
                
                ProgressView(value: Double(entry.data.caloriesConsumed), total: Double(entry.data.caloriesTarget))
                    .accentColor(.green)
                
                Text("\(entry.data.caloriesConsumed) / \(entry.data.caloriesTarget) kcal")
                    .font(.system(size: 12, weight: .heavy))
            }
            
            Divider()
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Siguiente:")
                    .font(.system(size: 8))
                    .foregroundColor(.gray)
                Text(entry.data.nextWorkout ?? "Descanso")
                    .font(.system(size: 11, weight: .bold))
                    .lineLimit(1)
            }
        }
        .padding()
    }
}

@main
struct CoachWidget: Widget {
    let kind: String = "CoachWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            CoachWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Estado Diario")
        .description("Mira tus calorías y entrenamiento del día.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
