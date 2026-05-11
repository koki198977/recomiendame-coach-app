import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SharedGroupPreferences from 'react-native-shared-group-preferences';

// Nota: Para que los widgets funcionen en producción, se requiere una librería nativa
// como 'react-native-shared-group-preferences' y configurar App Groups en iOS.
// Esta es una implementación base que prepara los datos.

export interface WidgetData {
  caloriesTarget: number;
  caloriesConsumed: number;
  proteinTarget: number;
  proteinConsumed: number;
  nextWorkout?: string;
  lastUpdated: string;
}

const WIDGET_DATA_KEY = 'widget_data_sync';
// En iOS esto debe coincidir con tu App Group ID (ej: group.cl.recomiendameapp.coach)
const APP_GROUP = 'group.cl.recomiendameapp.coach';

export class WidgetService {
  /**
   * Sincroniza los datos actuales con el almacenamiento del widget
   */
  static async updateWidgetData(data: Partial<WidgetData>): Promise<void> {
    try {
      // 1. Obtener datos actuales
      const existingDataStr = await AsyncStorage.getItem(WIDGET_DATA_KEY);
      const existingData: WidgetData = existingDataStr 
        ? JSON.parse(existingDataStr) 
        : {
            caloriesTarget: 0,
            caloriesConsumed: 0,
            proteinTarget: 0,
            proteinConsumed: 0,
            lastUpdated: new Date().toISOString()
          };

      // 2. Mezclar con nuevos datos
      const updatedData: WidgetData = {
        ...existingData,
        ...data,
        lastUpdated: new Date().toISOString(),
      };

      // 3. Guardar en AsyncStorage para persistencia de la app
      await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(updatedData));

      // 4. Sincronizar con almacenamiento NATIVO (accesible por el Widget)
      if (Platform.OS === 'ios') {
        await this.syncToIOSWidget(updatedData);
      } else if (Platform.OS === 'android') {
        await this.syncToAndroidWidget(updatedData);
      }

      console.log('✅ Datos del Widget actualizados:', updatedData);
    } catch (error) {
      console.error('❌ Error actualizando datos del Widget:', error);
    }
  }

  private static async syncToIOSWidget(data: WidgetData): Promise<void> {
    try {
      // Verificación ultra-segura para Expo Go
      if (SharedGroupPreferences === null || SharedGroupPreferences === undefined) {
        console.log('⚠️ [WidgetService] SharedGroupPreferences es null/undefined (Entorno Expo Go)');
        return;
      }

      // @ts-ignore - Evitar errores de tipos si el objeto es null en runtime
      if (typeof SharedGroupPreferences.setItem !== 'function') {
        console.log('⚠️ [WidgetService] setItem no es una función (Entorno Expo Go)');
        return;
      }

      console.log('📱 [iOS] Sincronizando con App Group:', APP_GROUP);
      await SharedGroupPreferences.setItem('widgetData', data, APP_GROUP);
      console.log('✅ [iOS] Datos sincronizados correctamente');
    } catch (error) {
      console.error('❌ [iOS] Error sincronizando con App Group:', error);
    }
  }

  private static async syncToAndroidWidget(data: WidgetData): Promise<void> {
    // En Android se suele usar un NativeModule para actualizar el AppWidgetManager
    console.log('🤖 [Android] Sincronizando con SharedPreferences');
  }

  /**
   * Forzar al sistema operativo a recargar el widget
   */
  static async reloadWidgets(): Promise<void> {
    if (Platform.OS === 'ios') {
      // WidgetCenter.reloadAllTimelines() vía NativeModule
    } else {
      // Intent para actualizar widgets en Android
    }
  }
}
