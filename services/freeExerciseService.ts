import api from './api';
import { ActivityType, FreeExerciseLog, SaveFreeExerciseRequest } from '../types/nutrition';

/**
 * Tabla MET simplificada: calorías estimadas por minuto (~70kg)
 */
const CAL_PER_MINUTE: Record<ActivityType, number> = {
  RUNNING: 10,
  CYCLING: 8,
  SWIMMING: 9,
  ROWING: 7,
  JUMP_ROPE: 11,
  ELLIPTICAL: 7,
  WALKING: 4,
  OTHER: 5,
};

/**
 * Estima las calorías quemadas según el tipo de actividad y la duración.
 * Retorna 0 si durationMinutes <= 0.
 */
export function estimateCalories(activityType: ActivityType, durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return CAL_PER_MINUTE[activityType] * durationMinutes;
}

/**
 * Servicio para registrar y consultar actividades físicas libres
 */
class FreeExerciseService {
  /**
   * Guarda un registro de actividad libre en el backend.
   */
  async saveFreeExercise(data: SaveFreeExerciseRequest): Promise<FreeExerciseLog> {
    const response = await api.post<FreeExerciseLog>('/workouts/free-exercise', data);
    return response.data;
  }

  /**
   * Obtiene los registros de actividad libre en un rango de fechas.
   * Si el backend responde 404, retorna un array vacío.
   */
  async getFreeExerciseLogs(startDate: string, endDate: string): Promise<FreeExerciseLog[]> {
    try {
      const response = await api.get<FreeExerciseLog[]>('/workouts/free-exercise', {
        params: { startDate, endDate },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  async deleteFreeExercise(id: string): Promise<void> {
    await api.delete(`/workouts/free-exercise/${id}`);
  }
}

export default new FreeExerciseService();
