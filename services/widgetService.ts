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

// Módulo nativo para recargar widgets
const { WidgetBridge } = NativeModules;

export class WidgetService {
  /**
   * Sincroniza los datos actuales con el almacenamiento del widget
   * y fuerza la recarga del timeline del widget
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

      // 2. Mezclar con nuevos datos y asegurar que los números sean enteros (Swift Int)
      const mergedData = { ...existingData, ...data };
      const updatedData: WidgetData = {
        ...mergedData,
        caloriesTarget: Math.round(Number(mergedData.caloriesTarget) || 0),
        caloriesConsumed: Math.round(Number(mergedData.caloriesConsumed) || 0),
        proteinTarget: Math.round(Number(mergedData.proteinTarget) || 0),
        proteinConsumed: Math.round(Number(mergedData.proteinConsumed) || 0),
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

      // 5. Forzar recarga del widget para que muestre los datos actualizados
      await this.reloadWidgets();

      console.log('✅ Datos del Widget actualizados:', updatedData);
    } catch (error) {
      console.error('❌ Error actualizando datos del Widget:', error);
    }
  }

  private static async syncToIOSWidget(data: WidgetData): Promise<void> {
    try {
      // Verificación ultra-segura para Expo Go: El módulo nativo no existe en Expo Go
      if (
        SharedGroupPreferences === null || 
        SharedGroupPreferences === undefined || 
        NativeModules.RNReactNativeSharedGroupPreferences == null
      ) {
        console.log('⚠️ [WidgetService] Módulo nativo de AppGroup no disponible (Entorno Expo Go)');
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
    try {
      if (WidgetBridge?.updateAndReload) {
        console.log('🤖 [Android] Sincronizando con SharedPreferences + widget refresh');
        WidgetBridge.updateAndReload(JSON.stringify(data));
        console.log('✅ [Android] Datos sincronizados y widget actualizado');
      } else {
        console.log('⚠️ [Android] WidgetBridge no disponible');
      }
    } catch (error) {
      console.error('❌ [Android] Error sincronizando widget:', error);
    }
  }

  /**
   * Forzar al sistema operativo a recargar el widget inmediatamente
   */
  static async reloadWidgets(): Promise<void> {
    try {
      if (Platform.OS === 'ios' && WidgetBridge?.reloadAllTimelines) {
        // Pequeño delay de 500ms para asegurar que NSUserDefaults haya escrito en disco
        // antes de que WidgetKit levante la extensión para leer los datos.
        setTimeout(() => {
          WidgetBridge.reloadAllTimelines();
          console.log('🔄 [iOS] Widget timeline recargado');
        }, 500);
      } else if (Platform.OS === 'android' && WidgetBridge?.reloadAllTimelines) {
        WidgetBridge.reloadAllTimelines();
        console.log('🔄 [Android] Widget recargado');
      }
    } catch (error) {
      console.log('⚠️ Error recargando widgets:', error);
    }
  }
}
