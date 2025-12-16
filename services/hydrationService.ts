import api from './api';
import { API_CONFIG } from '../config/api';
import { 
  HydrationPlanStatus, 
  HydrationRecommendation, 
  HydrationLogRequest, 
  HydrationLogResponse,
  HydrationGoalRequest,
  HydrationGoalResponse
} from '../types/nutrition';

/**
 * Servicio para el sistema de hidratación
 */
class HydrationService {
  /**
   * Obtener el estado del plan de hidratación del usuario
   */
  async getPlanStatus(): Promise<HydrationPlanStatus> {
    try {
      const response = await api.get<HydrationPlanStatus>('/hydration/plan-status');
      return response.data;
    } catch (error: any) {
      console.error('Error getting hydration plan status:', error);
      throw error;
    }
  }

  /**
   * Calcular la recomendación personalizada de hidratación
   */
  async calculateRecommended(): Promise<HydrationRecommendation> {
    try {
      const response = await api.get<HydrationRecommendation>('/hydration/calculate-recommended');
      return response.data;
    } catch (error: any) {
      console.error('Error calculating hydration recommendation:', error);
      throw error;
    }
  }

  /**
   * Crear/actualizar objetivo de hidratación
   */
  async setHydrationGoal(goalData: HydrationGoalRequest): Promise<HydrationGoalResponse> {
    try {
      const response = await api.post<HydrationGoalResponse>('/hydration/goal', goalData);
      return response.data;
    } catch (error: any) {
      console.error('Error setting hydration goal:', error);
      throw error;
    }
  }

  /**
   * Registrar consumo de agua personalizado
   */
  async logCustomIntake(logData: HydrationLogRequest): Promise<HydrationLogResponse> {
    try {
      const response = await api.post<HydrationLogResponse>('/hydration/custom-log', logData);
      return response.data;
    } catch (error: any) {
      console.error('Error logging hydration intake:', error);
      throw error;
    }
  }



  /**
   * Obtener el progreso diario de hidratación
   */
  async getDailyProgress(): Promise<HydrationPlanStatus['currentProgress']> {
    try {
      const planStatus = await this.getPlanStatus();
      return planStatus.currentProgress;
    } catch (error: any) {
      console.error('Error getting daily hydration progress:', error);
      throw error;
    }
  }

  /**
   * Formatear mililitros para mostrar
   */
  formatMl(ml: number): string {
    if (ml >= 1000) {
      return `${(ml / 1000).toFixed(1)}L`;
    }
    return `${ml}ml`;
  }

  /**
   * Obtener color según el estado de hidratación
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'EXCELLENT': return '#4CAF50';
      case 'GOOD': return '#8BC34A';
      case 'FAIR': return '#FF9800';
      case 'POOR': return '#F44336';
      default: return '#9E9E9E';
    }
  }

  /**
   * Obtener emoji según el estado de hidratación
   */
  getStatusEmoji(status: string): string {
    switch (status) {
      case 'EXCELLENT': return '💧';
      case 'GOOD': return '🌊';
      case 'FAIR': return '⚠️';
      case 'POOR': return '🚨';
      default: return '💧';
    }
  }

  /**
   * Obtener mensaje motivacional según el progreso
   */
  getMotivationalMessage(percentage: number): string {
    if (percentage >= 100) return '¡Excelente! Has alcanzado tu objetivo diario 🎉';
    if (percentage >= 75) return '¡Muy bien! Estás cerca de tu objetivo 💪';
    if (percentage >= 50) return '¡Buen progreso! Sigue así 👍';
    if (percentage >= 25) return 'Vas por buen camino, continúa 🌟';
    return '¡Comienza tu día hidratándote! 💧';
  }
}

export default new HydrationService();