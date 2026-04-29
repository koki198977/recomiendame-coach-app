import api from './api';
import { Platform } from 'react-native';
import { API_CONFIG } from '../config/api';
import { 
  GenerateWorkoutRequest, 
  GenerateWorkoutResponse,
  WorkoutPlan,
  WorkoutGoal 
} from '../types/nutrition';

/**
 * Servicio para manejar rutinas de ejercicio (workouts)
 */
class WorkoutService {
  /**
   * Subir imagen de equipamiento al servidor
   */
  async uploadEquipmentImage(imageUri: string): Promise<string> {
    try {
      console.log('📸 Uploading equipment image:', imageUri);
      
      // Crear FormData para la subida de imagen
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // En web, necesitamos convertir el blob
        console.log('🌐 Uploading from web');
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('image', blob, 'equipment.jpg');
      } else {
        // En móvil, usar el formato estándar
        console.log('📱 Uploading from mobile');
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'equipment.jpg',
        } as any);
      }

      console.log('📤 Sending FormData to /media/equipment/upload');
      
      // Subir al endpoint específico de equipamiento
      const uploadResponse = await api.post('/media/equipment/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Equipment image uploaded:', uploadResponse.data.url);
      return uploadResponse.data.url; // Retornar solo la URL
    } catch (error: any) {
      console.error('❌ Error uploading equipment image:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error;
    }
  }

  /**
   * Calcular la semana ISO actual (formato: YYYY-Www)
   * Ejemplo: "2023-W49"
   */
  getCurrentISOWeek(): string {
    const date = new Date();
    
    // Copiar la fecha para no mutar
    const tempDate = new Date(date.getTime());
    
    // Establecer al jueves de la semana actual (ISO 8601)
    tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
    
    // Enero 4 siempre está en la semana 1
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    
    // Calcular el número de semana
    const weekNumber = 1 + Math.round(
      ((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7
    );
    
    const year = tempDate.getFullYear();
    const formattedWeek = weekNumber < 10 ? `0${weekNumber}` : `${weekNumber}`;
    
    return `${year}-W${formattedWeek}`;
  }

  /**
   * Generar un plan de entrenamiento con IA
   */
  async generateWorkoutPlan(
    daysAvailable: number,
    goal: WorkoutGoal,
    isoWeek?: string,
    equipmentImageUris?: string[],
    environment?: 'GYM' | 'HOME' | 'OUTDOOR' | 'SPORT',
    sportName?: string
  ): Promise<GenerateWorkoutResponse> {
    try {
      const week = isoWeek || this.getCurrentISOWeek();
      
      // Calcular el día actual de la semana (1 = Lunes, 7 = Domingo)
      const today = new Date().getDay();
      const startDayIndex = today === 0 ? 7 : today; // Convertir domingo (0) a 7
      
      console.log('🏋️ [GENERATE] Input parameters:', {
        daysAvailable,
        goal,
        week,
        startDayIndex,
        equipmentImageUris: equipmentImageUris?.length || 0,
        hasImages: !!equipmentImageUris && equipmentImageUris.length > 0,
        environment,
        sportName
      });
      
      const request: GenerateWorkoutRequest = {
        isoWeek: week,
        daysAvailable,
        goal,
        startDayIndex, // Agregar día de inicio
      };

      // Agregar campos opcionales solo si están definidos
      if (environment) {
        request.environment = environment;
      }
      if (sportName) {
        request.sportName = sportName;
      }

      // Si hay imágenes locales, subirlas y obtener URLs
      if (equipmentImageUris && equipmentImageUris.length > 0) {
        console.log(`📸 [GENERATE] Subiendo ${equipmentImageUris.length} imágenes de equipamiento...`);
        
        try {
          // Subir todas las imágenes en paralelo
          const uploadPromises = equipmentImageUris.map(uri => this.uploadEquipmentImage(uri));
          const imageUrls = await Promise.all(uploadPromises);
          
          console.log(`✅ [GENERATE] ${imageUrls.length} imágenes subidas exitosamente`);
          console.log(`📋 [GENERATE] Image URLs:`, imageUrls);
          
          // Agregar URLs al request (ahora tipado correctamente)
          request.equipmentImageUrls = imageUrls;
        } catch (uploadError: any) {
          console.error('❌ [GENERATE] Error subiendo imágenes:', uploadError);
          console.error('❌ [GENERATE] Error details:', {
            message: uploadError.message,
            status: uploadError.response?.status,
            data: uploadError.response?.data
          });
          console.warn('⚠️ [GENERATE] Continuando sin imágenes de equipamiento');
          // No lanzar el error, continuar sin imágenes
        }
      }

      console.log('🏋️ Generando plan de entrenamiento:', {
        ...request,
        equipmentImages: request.equipmentImageUrls?.length || 0
      });

      // Usar timeout largo para generación (2 minutos)
      const timeout = API_CONFIG.LONG_TIMEOUT || 120000;

      const response = await api.post<GenerateWorkoutResponse>(
        API_CONFIG.ENDPOINTS.WORKOUTS.GENERATE,
        request,
        {
          timeout
        }
      );

      console.log('✅ Plan de entrenamiento generado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error generando plan de entrenamiento:', error);
      
      // Log detallado del error para debugging
      if (error.response) {
        console.error('❌ Error response status:', error.response.status);
        console.error('❌ Error response data:', JSON.stringify(error.response.data, null, 2));
        console.error('❌ Request data:', JSON.stringify({
          ...request,
          equipmentImageUrls: request.equipmentImageUrls?.length || 0
        }, null, 2));
      } else if (error.request) {
        console.error('❌ No response received:', error.request);
      } else {
        console.error('❌ Error message:', error.message);
      }
      
      throw error;
    }
  }

  /**
   * Obtener el plan de entrenamiento de una semana específica
   */
  async getWorkoutPlan(isoWeek?: string): Promise<WorkoutPlan | null> {
    try {
      const week = isoWeek || this.getCurrentISOWeek();
      
      console.log('📋 Obteniendo plan de entrenamiento para:', week);

      const response = await api.get<WorkoutPlan>(
        API_CONFIG.ENDPOINTS.WORKOUTS.GET_PLAN,
        {
          params: { isoWeek: week }
        }
      );

      console.log('✅ Plan obtenido:', response.data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('ℹ️ No hay plan de entrenamiento para esta semana');
        return null;
      }
      console.error('❌ Error obteniendo plan de entrenamiento:', error);
      throw error;
    }
  }

  /**
   * Obtener nombre del día en español
   */
  getDayName(dayIndex: number): string {
    const days = [
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo'
    ];
    return days[dayIndex - 1] || 'Día';
  }

  /**
   * Obtener emoji para el objetivo
   */
  getGoalEmoji(goal: WorkoutGoal): string {
    const emojis = {
      HYPERTROPHY: '💪',
      STRENGTH: '🏋️',
      ENDURANCE: '🏃',
      WEIGHT_LOSS: '🔥',
    };
    return emojis[goal] || '💪';
  }

  /**
   * Obtener label traducido para el objetivo
   */
  getGoalLabel(goal: WorkoutGoal): string {
    const labels = {
      HYPERTROPHY: 'Hipertrofia',
      STRENGTH: 'Fuerza',
      ENDURANCE: 'Resistencia',
      WEIGHT_LOSS: 'Pérdida de peso',
    };
    return labels[goal] || goal;
  }

  /**
   * Obtener estadísticas de actividad física
   */
  async getActivityStats(startDate: string, endDate: string): Promise<any[]> {
    try {
      const response = await api.get('/workouts/activity-stats', {
        params: {
          startDate,
          endDate
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Error obteniendo estadísticas de actividad:', error);
      return [];
    }
  }

  /**
   * Guardar el progreso de una rutina completada
   */
  async saveWorkoutCompletion(data: {
    isoWeek: string;
    dayIndex: number;
    durationMinutes: number;
    caloriesBurned: number;
    completedExercises: number;
    totalExercises: number;
    exercises: any[];
  }): Promise<void> {
    try {
      await api.post('/workouts/completion', {
        isoWeek: data.isoWeek,
        dayIndex: data.dayIndex,
        durationMinutes: data.durationMinutes,
        caloriesBurned: data.caloriesBurned,
        completedExercises: data.completedExercises,
        totalExercises: data.totalExercises,
        exercises: data.exercises,
        completedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Error guardando progreso de rutina:', error);
      throw error;
    }
  }

}

export default new WorkoutService();
