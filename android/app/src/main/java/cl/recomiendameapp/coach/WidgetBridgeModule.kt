package cl.recomiendameapp.coach

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetBridgeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetBridge"

    /**
     * Actualiza los datos del widget y fuerza un refresh inmediato.
     * Se llama desde JS: NativeModules.WidgetBridge.updateAndReload(jsonString)
     */
    @ReactMethod
    fun updateAndReload(jsonString: String) {
        val context = reactApplicationContext
        // Guardar datos en SharedPreferences
        CoachWidgetProvider.saveWidgetData(context, jsonString)
        // Forzar actualización de todos los widgets
        CoachWidgetProvider.updateAllWidgets(context)
    }

    /**
     * Solo fuerza la recarga del widget sin cambiar datos.
     * Se llama desde JS: NativeModules.WidgetBridge.reloadAllTimelines()
     */
    @ReactMethod
    fun reloadAllTimelines() {
        val context = reactApplicationContext
        CoachWidgetProvider.updateAllWidgets(context)
    }
}
