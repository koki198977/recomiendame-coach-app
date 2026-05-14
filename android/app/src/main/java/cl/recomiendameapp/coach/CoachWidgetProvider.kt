package cl.recomiendameapp.coach

import cl.recomiendameapp.coach.R
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
            try {
                val views = RemoteViews(context.packageName, R.layout.coach_widget_layout)
                val data = loadWidgetData(context)

                // Calorías con valores por defecto seguros
                val caloriesConsumed = data.optInt("caloriesConsumed", 0)
                val caloriesTarget = data.optInt("caloriesTarget", 2000).let { if (it <= 0) 2000 else it }
                val proteinConsumed = data.optInt("proteinConsumed", 0)
                val proteinTarget = data.optInt("proteinTarget", 150).let { if (it <= 0) 150 else it }
                val nextWorkout = data.optString("nextWorkout", "Descanso")
                val lastUpdated = data.optString("lastUpdated", "")

                // Actualizar títulos con emojis por código (más seguro que en XML)
                views.setTextViewText(R.id.widget_title, "Coach 🥑")
                
                // Actualizar vistas principales
                views.setTextViewText(R.id.widget_calories, "$caloriesConsumed / $caloriesTarget kcal")

                // Progress bar (0-100)
                val progress = ((caloriesConsumed.toFloat() / caloriesTarget.toFloat()) * 100).toInt().coerceIn(0, 100)
                views.setProgressBar(R.id.widget_progress, 100, progress, false)

                // Proteína
                views.setTextViewText(R.id.widget_protein, "$proteinConsumed/${proteinTarget}g")

                // Siguiente entreno
                val workoutDisplay = if (nextWorkout.isNullOrEmpty() || nextWorkout == "null" || nextWorkout == "undefined") {
                    "Descanso"
                } else {
                    nextWorkout
                }
                views.setTextViewText(R.id.widget_workout, workoutDisplay)

                // Hora de actualización
                val timeStr = formatTime(lastUpdated)
                if (timeStr.isNotEmpty()) {
                    views.setTextViewText(R.id.widget_time, "Act. $timeStr")
                }

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                // Si falla el inflado o la carga, intentar al menos mostrar algo básico
                try {
                    val views = RemoteViews(context.packageName, R.layout.coach_widget_layout)
                    views.setTextViewText(R.id.widget_calories, "Error de carga")
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                } catch (e2: Exception) {
                    e2.printStackTrace()
                }
            }
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
