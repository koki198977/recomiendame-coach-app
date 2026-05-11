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
        // Refrescar cada 15 minutos como fallback por si no se llama reloadAllTimelines()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func loadData() -> WidgetData {
        let userDefaults = UserDefaults(suiteName: "group.cl.recomiendameapp.coach")
        
        // Intentar leer como string (formato de react-native-shared-group-preferences)
        if let savedData = userDefaults?.string(forKey: "widgetData"),
           let jsonData = savedData.data(using: .utf8),
           let decodedData = try? JSONDecoder().decode(WidgetData.self, from: jsonData) {
            return decodedData
        }
        
        // Fallback: intentar leer como diccionario nativo (por si acaso)
        if let dict = userDefaults?.dictionary(forKey: "widgetData"),
           let jsonData = try? JSONSerialization.data(withJSONObject: dict),
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
    
    var calorieProgress: Double {
        guard entry.data.caloriesTarget > 0 else { return 0 }
        return min(Double(entry.data.caloriesConsumed) / Double(entry.data.caloriesTarget), 1.0)
    }
    
    var proteinProgress: Double {
        guard entry.data.proteinTarget > 0 else { return 0 }
        return min(Double(entry.data.proteinConsumed) / Double(entry.data.proteinTarget), 1.0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Coach 🥑")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.green)
                Spacer()
                Text(formatTime(entry.data.lastUpdated))
                    .font(.system(size: 8))
                    .foregroundColor(.gray)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text("Calorías")
                    .font(.system(size: 10, weight: .bold))
                
                ProgressView(value: calorieProgress)
                    .accentColor(.green)
                
                Text("\(entry.data.caloriesConsumed) / \(entry.data.caloriesTarget) kcal")
                    .font(.system(size: 12, weight: .heavy))
            }
            
            Divider()
            
            HStack(spacing: 6) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("🥩 Proteína")
                        .font(.system(size: 8))
                        .foregroundColor(.gray)
                    Text("\(entry.data.proteinConsumed)/\(entry.data.proteinTarget)g")
                        .font(.system(size: 10, weight: .bold))
                }
                
                Spacer()
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Siguiente:")
                        .font(.system(size: 8))
                        .foregroundColor(.gray)
                    Text(entry.data.nextWorkout ?? "Descanso")
                        .font(.system(size: 10, weight: .bold))
                        .lineLimit(1)
                }
            }
        }
        .padding()
    }
    
    /// Formatea el timestamp ISO a hora local legible (HH:mm)
    private func formatTime(_ isoString: String) -> String {
        guard !isoString.isEmpty else { return "" }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        if let date = formatter.date(from: isoString) {
            let timeFormatter = DateFormatter()
            timeFormatter.dateFormat = "HH:mm"
            return timeFormatter.string(from: date)
        }
        
        // Fallback: mostrar los primeros 5 chars
        return String(isoString.prefix(5))
    }
}

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
