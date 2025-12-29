import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';
import StorageService from './storage';

// Configurar cómo se muestran las notificaciones cuando la app está en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class PushNotificationService {
  private static pushToken: string | null = null;

  /**
   * Registra el dispositivo para recibir push notifications
   * y envía el token al backend
   */
  static async registerForPushNotificationsAsync(): Promise<string | null> {
    // Las push notifications solo funcionan en dispositivos físicos
    if (!Device.isDevice) {
      console.log('⚠️ Push notifications solo funcionan en dispositivos físicos');
      return null;
    }

    try {
      // Verificar/solicitar permisos
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('📱 Solicitando permisos de notificaciones...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permisos de notificaciones denegados');
        return null;
      }

      // Configurar canal de notificaciones para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
        });
      }

      // Obtener el push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      const token = tokenData.data;
      this.pushToken = token;

      console.log('✅ Push token obtenido:', token);

      // Enviar token al backend
      await this.sendTokenToBackend(token);

      return token;
    } catch (error) {
      console.error('❌ Error registrando push notifications:', error);
      return null;
    }
  }

  /**
   * Envía el push token al backend
   */
  private static async sendTokenToBackend(token: string): Promise<void> {
    try {
      const platform = Platform.OS as 'ios' | 'android';
      
      await api.post('/users/push-token', {
        pushToken: token,
        platform: platform,
      });

      // Guardar token localmente para poder eliminarlo al logout
      await StorageService.setItem('pushToken', token);
      
      console.log('✅ Push token registrado en el backend');
    } catch (error) {
      console.error('❌ Error enviando push token al backend:', error);
    }
  }

  /**
   * Elimina el push token del backend (llamar en logout)
   */
  static async unregisterPushToken(): Promise<void> {
    try {
      const token = await StorageService.getItem('pushToken');
      
      if (token) {
        await api.delete('/users/push-token', {
          data: { pushToken: token }
        });
        
        await StorageService.removeItem('pushToken');
        this.pushToken = null;
        
        console.log('✅ Push token eliminado del backend');
      }
    } catch (error) {
      console.error('❌ Error eliminando push token:', error);
    }
  }

  /**
   * Configura los listeners para manejar notificaciones
   * @param onNotificationReceived Callback cuando se recibe una notificación (app en foreground)
   * @param onNotificationResponse Callback cuando el usuario toca una notificación
   */
  static setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): () => void {
    // Listener para notificaciones recibidas mientras la app está abierta
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📬 Notificación recibida:', notification);
        onNotificationReceived?.(notification);
      }
    );

    // Listener para cuando el usuario toca una notificación
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Usuario tocó notificación:', response);
        onNotificationResponse?.(response);
      }
    );

    // Retornar función para limpiar los listeners
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }

  /**
   * Obtiene el push token actual
   */
  static getPushToken(): string | null {
    return this.pushToken;
  }
}
