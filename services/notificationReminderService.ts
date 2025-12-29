import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Servicio para programar recordatorios locales de Chapi
 * Funciona en Expo Go sin necesidad de build nativo
 */
export class NotificationReminderService {
  
  /**
   * Configura todos los recordatorios al iniciar sesión
   */
  static async setupReminders(): Promise<void> {
    // Solo funciona en dispositivos físicos
    if (!Device.isDevice) {
      console.log('⚠️ Recordatorios solo funcionan en dispositivos físicos');
      return;
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
        return;
      }

      // Configurar canal para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Recordatorios de Chapi',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4CAF50',
        });
      }

      // Cancelar recordatorios anteriores antes de programar nuevos
      await this.cancelAllReminders();
      
      // Programar todos los recordatorios
      await this.scheduleMealReminders();
      await this.scheduleHydrationReminders();

      console.log('✅ Recordatorios de Chapi configurados');
    } catch (error) {
      console.error('❌ Error configurando recordatorios:', error);
    }
  }

  /**
   * Programa recordatorios de comidas
   */
  private static async scheduleMealReminders(): Promise<void> {
    const meals = [
      { hour: 8, minute: 0, title: '🍳 ¡Buenos días!', body: '¿Ya desayunaste? Registra tu desayuno' },
      { hour: 13, minute: 0, title: '🍽️ ¿Ya comiste?', body: 'Registra tu almuerzo en la app' },
      { hour: 20, minute: 0, title: '🌙 ¡Hora de cenar!', body: 'No olvides registrar tu cena' },
    ];

    for (const meal of meals) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: meal.title,
          body: meal.body,
          data: { type: 'meal_reminder' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: meal.hour,
          minute: meal.minute,
        },
      });
    }

    console.log('🍽️ Recordatorios de comidas programados (8:00, 13:00, 20:00)');
  }

  /**
   * Programa recordatorios de hidratación cada 2 horas
   */
  private static async scheduleHydrationReminders(): Promise<void> {
    const hydrationHours = [9, 11, 15, 17, 19, 21];
    
    const messages = [
      '💧 Recuerda tomar agua',
      '🌊 ¡Hora de hidratarte!',
      '💧 Un vaso de agua te hará bien',
      '🌊 No olvides beber agua',
      '💧 ¿Ya tomaste agua?',
      '🌊 Mantente hidratado/a',
    ];

    for (let i = 0; i < hydrationHours.length; i++) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Recordatorio de Hidratación',
          body: messages[i],
          data: { type: 'hydration_reminder' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hydrationHours[i],
          minute: 0,
        },
      });
    }

    console.log('💧 Recordatorios de hidratación programados (9, 11, 15, 17, 19, 21 hrs)');
  }

  /**
   * Cancela todos los recordatorios programados
   */
  static async cancelAllReminders(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🗑️ Recordatorios anteriores cancelados');
  }

  /**
   * Lista todos los recordatorios programados (para debugging)
   */
  static async listScheduledReminders(): Promise<Notifications.NotificationRequest[]> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📋 Recordatorios programados:', scheduled.length);
    scheduled.forEach(n => {
      console.log(`  - ${n.content.title}: ${n.content.body}`);
    });
    return scheduled;
  }
}
