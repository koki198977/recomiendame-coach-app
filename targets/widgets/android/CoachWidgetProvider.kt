package cl.recomiendameapp.coach

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import android.content.SharedPreferences
import org.json.JSONObject

class CoachWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.coach_widget_layout)
        
        // Leer datos de SharedPreferences (donde WidgetService los guarda en Android)
        val sharedPref = context.getSharedPreferences("widget_data_sync", Context.MODE_PRIVATE)
        val dataStr = sharedPref.getString("widget_data_sync", null)
        
        if (dataStr != null) {
            try {
                val data = JSONObject(dataStr)
                val consumed = data.getInt("caloriesConsumed")
                val target = data.getInt("caloriesTarget")
                val protein = data.getInt("proteinConsumed")
                val workout = data.getString("nextWorkout")

                views.setTextViewText(R.id.widget_calories, "$consumed / $target kcal")
                views.setTextViewText(R.id.widget_workout, workout)
                views.setProgressBar(R.id.widget_progress, target, consumed, false)
            } catch (e: Exception) {
                views.setTextViewText(R.id.widget_calories, "Error al cargar")
            }
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
