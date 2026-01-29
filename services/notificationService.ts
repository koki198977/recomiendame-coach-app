import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Achievement } from '../types/nutrition';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  /**
   * Solicitar permisos de notificaciones
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permissions denied');
        return false;
      }

      // Configurar canal de notificaciones para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('achievements', {
          name: 'Logros y Trofeos',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('streaks', {
          name: 'Rachas',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF9500',
          sound: 'default',
        });
      }

      console.log('✅ Notification permissions granted');
      return true;
    } catch (error) {
      console.log('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Enviar notificación de logro desbloqueado
   */
  static async sendAchievementNotification(achievement: Achievement): Promise<void> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏆 ¡Logro Desbloqueado!',
          body: `${achievement.icon} ${achievement.title}: ${achievement.description}`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          color: '#4CAF50',
          data: {
            type: 'achievement',
            achievementId: achievement.id,
            category: achievement.category,
          },
        },
        trigger: null, // Enviar inmediatamente
        identifier: `achievement_${achievement.id}`,
      });

      console.log('🔔 Achievement notification sent:', achievement.title);
    } catch (error) {
      console.log('Error sending achievement notification:', error);
    }
  }

  /**
   * Enviar notificación de racha completada
   */
  static async sendStreakNotification(streakDays: number, photosToday: number): Promise<void> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) return;

      let title = '🔥 ¡Racha Completada!';
      let body = `Has subido ${photosToday} fotos hoy. ¡Sigue así!`;
      
      if (streakDays > 1) {
        body = `¡${streakDays} días consecutivos! Has subido ${photosToday} fotos hoy.`;
      }

      // Emojis especiales para rachas largas
      if (streakDays >= 30) {
        title = '👑 ¡Racha Épica!';
      } else if (streakDays >= 7) {
        title = '🏆 ¡Racha Increíble!';
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          color: '#FF9500',
          data: {
            type: 'streak',
            streakDays,
            photosToday,
          },
        },
        trigger: null, // Enviar inmediatamente
        identifier: `streak_${Date.now()}`,
      });

      console.log('🔔 Streak notification sent:', streakDays, 'days');
    } catch (error) {
      console.log('Error sending streak notification:', error);
    }
  }

  /**
   * Enviar notificación de recordatorio para completar racha
   */
  static async sendStreakReminderNotification(photosToday: number): Promise<void> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) return;

      const photosNeeded = 3 - photosToday;
      
      if (photosNeeded <= 0) return; // Ya completó la racha

      let body = '';
      if (photosToday === 0) {
        body = '📸 ¡No olvides subir fotos de tus comidas hoy! Necesitas 3 para completar tu racha.';
      } else if (photosToday === 1) {
        body = '📸 ¡Vas bien! Te faltan 2 fotos más para completar tu racha de hoy.';
      } else if (photosToday === 2) {
        body = '📸 ¡Casi lo logras! Solo 1 foto más para completar tu racha de hoy.';
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📸 Completa tu Racha',
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          color: '#4CAF50',
          data: {
            type: 'streak_reminder',
            photosToday,
            photosNeeded,
          },
        },
        trigger: null,
        identifier: `streak_reminder_${Date.now()}`,
      });

      console.log('🔔 Streak reminder notification sent');
    } catch (error) {
      console.log('Error sending streak reminder notification:', error);
    }
  }

  /**
   * Programar recordatorio diario para subir fotos
   */
  static async scheduleDailyReminder(): Promise<void> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) return;

      // Cancelar recordatorios anteriores
      await Notifications.cancelScheduledNotificationAsync('daily_photo_reminder');

      // Programar recordatorio para las 8 PM todos los días
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📸 ¿Ya subiste tus fotos de hoy?',
          body: 'Mantén tu racha fotográfica documentando tus comidas. ¡Solo necesitas 3 fotos!',
          sound: 'default',
          data: {
            type: 'daily_reminder',
          },
        },
        trigger: {
          hour: 20,
          minute: 0,
          repeats: true,
        } as Notifications.CalendarTriggerInput,
        identifier: 'daily_photo_reminder',
      });

      console.log('⏰ Daily photo reminder scheduled for 8 PM');
    } catch (error) {
      console.log('Error scheduling daily reminder:', error);
    }
  }

  /**
   * Cancelar todas las notificaciones programadas
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🔕 All notifications cancelled');
    } catch (error) {
      console.log('Error cancelling notifications:', error);
    }
  }

  /**
   * Obtener token de notificaciones push (para backend)
   */
  static async getExpoPushToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      console.log('📱 Expo push token:', token.data);
      return token.data;
    } catch (error) {
      console.log('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Inicializar servicio de notificaciones
   */
  static async initialize(): Promise<void> {
    try {
      await this.requestPermissions();
      await this.scheduleDailyReminder();
      
      // Obtener token para el backend (opcional)
      await this.getExpoPushToken();
      
      console.log('🔔 Notification service initialized');
    } catch (error) {
      console.log('Error initializing notification service:', error);
    }
  }
}