import api from './api';
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
    isoWeek?: string
  ): Promise<GenerateWorkoutResponse> {
    try {
      const week = isoWeek || this.getCurrentISOWeek();
      
      const request: GenerateWorkoutRequest = {
        isoWeek: week,
        daysAvailable,
        goal,
      };

      console.log('🏋️ Generando plan de entrenamiento:', request);

      const response = await api.post<GenerateWorkoutResponse>(
        API_CONFIG.ENDPOINTS.WORKOUTS.GENERATE,
        request
      );

      console.log('✅ Plan de entrenamiento generado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error generando plan de entrenamiento:', error);
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
}

export default new WorkoutService();
