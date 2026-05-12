package cl.recomiendameapp.coach

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.ComponentName
import android.content.SharedPreferences
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class CoachWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        private const val PREFS_NAME = "CoachWidgetPrefs"
        private const val DATA_KEY = "widgetData"

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.coach_widget_layout)
            val data = loadWidgetData(context)

            // Calorías
            val caloriesConsumed = data.optInt("caloriesConsumed", 0)
            val caloriesTarget = data.optInt("caloriesTarget", 2000)
            val proteinConsumed = data.optInt("proteinConsumed", 0)
            val proteinTarget = data.optInt("proteinTarget", 150)
            val nextWorkout = data.optString("nextWorkout", "Descanso")
            val lastUpdated = data.optString("lastUpdated", "")

            // Actualizar vistas
            views.setTextViewText(R.id.widget_calories, "$caloriesConsumed / $caloriesTarget kcal")

            // Progress bar (0-100)
            val progress = if (caloriesTarget > 0) {
                ((caloriesConsumed.toFloat() / caloriesTarget.toFloat()) * 100).toInt().coerceIn(0, 100)
            } else 0
            views.setProgressBar(R.id.widget_progress, 100, progress, false)

            // Proteína
            views.setTextViewText(R.id.widget_protein, "$proteinConsumed/${proteinTarget}g")

            // Siguiente entreno
            views.setTextViewText(R.id.widget_workout, if (nextWorkout.isNullOrEmpty()) "Descanso" else nextWorkout)

            // Hora de actualización
            val timeStr = formatTime(lastUpdated)
            views.setTextViewText(R.id.widget_time, timeStr)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, CoachWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

            for (appWidgetId in appWidgetIds) {
                updateWidget(context, appWidgetManager, appWidgetId)
            }
        }

        fun saveWidgetData(context: Context, jsonString: String) {
            val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(DATA_KEY, jsonString).apply()
        }

        private fun loadWidgetData(context: Context): JSONObject {
            val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(DATA_KEY, null) ?: return JSONObject()
            return try {
                JSONObject(jsonString)
            } catch (e: Exception) {
                JSONObject()
            }
        }

        private fun formatTime(isoString: String): String {
            if (isoString.isEmpty()) return ""
            return try {
                val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                inputFormat.timeZone = TimeZone.getTimeZone("UTC")
                val date = inputFormat.parse(isoString) ?: return ""
                val outputFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                outputFormat.format(date)
            } catch (e: Exception) {
                // Fallback: mostrar primeros 5 chars
                isoString.take(5)
            }
        }
    }
}
