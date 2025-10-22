import api from './api';
import { 
  UserProfile, 
  NutritionPlan, 
  Progress, 
  WeightEntry, 
  AIGenerationRequest, 
  AIGenerationResponse,
  Meal,
  Food,
  WeeklyPlan,
  GeneratePlanResponse,
  ShoppingListResponse,
  Cuisine,
  Allergy,
  Condition
} from '../types/nutrition';

export class NutritionService {
  // Perfil del usuario
  static async getUserProfile(): Promise<UserProfile> {
    const response = await api.get<UserProfile>('/me/profile');
    return response.data;
  }

  static async createUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const response = await api.post<UserProfile>('/me/profile', profileData);
    return response.data;
  }

  static async updateUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const response = await api.put<UserProfile>('/me/profile', profileData);
    return response.data;
  }

  // Crear perfil completo (datos básicos)
  static async createUserProfile(profileData: {
    sex: string;
    birthDate?: string;
    heightCm: number;
    weightKg: number;
    activityLevel: string;
    country: string;
    budgetLevel?: number;
    cookTimePerMeal?: number;
  }): Promise<UserProfile> {
    const response = await api.post<UserProfile>('/me/profile', profileData);
    return response.data;
  }

  // Actualizar preferencias (alergias, condiciones, cuisines)
  static async updateUserPreferences(preferences: {
    allergyIds?: number[];
    conditionIds?: number[];
    cuisinesLike?: number[];
    cuisinesDislike?: number[];
  }): Promise<any> {
    const response = await api.post('/me/preferences', preferences);
    return response.data;
  }

  // Planes nutricionales
  static async getCurrentPlan(): Promise<NutritionPlan | null> {
    try {
      const response = await api.get<NutritionPlan>('/plans/current');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No hay plan activo
      }
      throw error;
    }
  }

  static async getUserPlans(): Promise<NutritionPlan[]> {
    const response = await api.get<NutritionPlan[]>('/plans');
    return response.data;
  }

  static async getPlanById(planId: string): Promise<NutritionPlan> {
    const response = await api.get<NutritionPlan>(`/plans/${planId}`);
    return response.data;
  }

  static async createPlan(planData: Partial<NutritionPlan>): Promise<NutritionPlan> {
    const response = await api.post<NutritionPlan>('/plans', planData);
    return response.data;
  }

  static async updatePlan(planId: string, planData: Partial<NutritionPlan>): Promise<NutritionPlan> {
    const response = await api.put<NutritionPlan>(`/plans/${planId}`, planData);
    return response.data;
  }

  static async activatePlan(planId: string): Promise<NutritionPlan> {
    const response = await api.patch<NutritionPlan>(`/plans/${planId}/activate`);
    return response.data;
  }

  // Comidas
  static async getMealsByDate(date: string): Promise<Meal[]> {
    const response = await api.get<Meal[]>('/meals', {
      params: { date }
    });
    return response.data;
  }

  static async updateMeal(mealId: string, mealData: Partial<Meal>): Promise<Meal> {
    const response = await api.put<Meal>(`/meals/${mealId}`, mealData);
    return response.data;
  }

  // Progreso
  static async getTodayProgress(): Promise<Progress | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get<Progress>(`/progress/${today}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  static async getProgressByDateRange(startDate: string, endDate: string): Promise<Progress[]> {
    const response = await api.get<Progress[]>('/progress', {
      params: { startDate, endDate }
    });
    return response.data;
  }

  static async logProgress(progressData: Partial<Progress>): Promise<Progress> {
    const response = await api.post<Progress>('/progress', progressData);
    return response.data;
  }

  static async updateProgress(date: string, progressData: Partial<Progress>): Promise<Progress> {
    const response = await api.put<Progress>(`/progress/${date}`, progressData);
    return response.data;
  }

  // Peso
  static async getWeightHistory(): Promise<WeightEntry[]> {
    const response = await api.get<WeightEntry[]>('/weight');
    return response.data;
  }

  static async logWeight(weightData: Partial<WeightEntry>): Promise<WeightEntry> {
    const response = await api.post<WeightEntry>('/weight', weightData);
    return response.data;
  }

  // Planes semanales
  static async getWeeklyPlan(week?: string): Promise<WeeklyPlan | null> {
    try {
      const currentWeek = week || this.getCurrentWeek();
      const response = await api.get<WeeklyPlan>(`/plans?week=${currentWeek}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No hay plan para esta semana
      }
      throw error;
    }
  }

  // IA - Generación de planes
  static async generatePlanWithAI(week?: string): Promise<GeneratePlanResponse> {
    // Si no se proporciona semana, usar la semana actual
    const currentWeek = week || this.getCurrentWeek();
    
    // Crear una instancia de axios con timeout extendido para este endpoint específico
    const response = await api.post<GeneratePlanResponse>(
      `/plans/generate?week=${currentWeek}`, 
      {},
      {
        timeout: 120000, // 2 minutos para la generación de plan
      }
    );
    return response.data;
  }

  // Regenerar día completo
  static async regenerateDay(planId: string, dayIndex: number): Promise<{ dayIndex: number; meals: WeeklyPlanMeal[]; planId: string }> {
    const response = await api.post<{ dayIndex: number; meals: WeeklyPlanMeal[]; planId: string }>(
      `/plans/${planId}/days/${dayIndex}/regenerate`,
      {},
      {
        timeout: 60000, // 1 minuto para regenerar día
      }
    );
    return response.data;
  }

  // Cambiar comida específica
  static async swapMeal(planId: string, dayIndex: number, mealIndex: number): Promise<{ dayIndex: number; meal: WeeklyPlanMeal; mealIndex: number; planId: string }> {
    const response = await api.post<{ dayIndex: number; meal: WeeklyPlanMeal; mealIndex: number; planId: string }>(
      `/plans/${planId}/days/${dayIndex}/meals/${mealIndex}/swap`,
      {},
      {
        timeout: 30000, // 30 segundos para cambiar comida
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    );
    return response.data;
  }

  // Lista de compras
  static async getShoppingList(planId: string, take: number = 500): Promise<ShoppingListResponse> {
    const response = await api.get<ShoppingListResponse>(`/plans/${planId}/shopping-list?take=${take}`);
    return response.data;
  }

  // Exportar lista de compras como CSV
  static async exportShoppingListCSV(planId: string): Promise<string> {
    const response = await api.get(`/plans/${planId}/shopping-list.csv`, {
      responseType: 'text'
    });
    return response.data;
  }

  // Función helper para obtener la semana actual en formato ISO (YYYY-WXX)
  static getCurrentWeek(): string {
    const now = new Date();
    
    // Cálculo correcto de semana ISO 8601
    // La semana ISO comienza en lunes y la semana 1 es la primera semana que contiene el 4 de enero
    
    // Obtener el año ISO (puede ser diferente al año calendario)
    const thursday = new Date(now.getTime());
    thursday.setDate(now.getDate() + 3 - (now.getDay() + 6) % 7);
    const year = thursday.getFullYear();
    
    // Encontrar el primer jueves del año (semana 1)
    const jan4 = new Date(year, 0, 4);
    const firstThursday = new Date(jan4.getTime());
    firstThursday.setDate(jan4.getDate() + 3 - (jan4.getDay() + 6) % 7);
    
    // Calcular el número de semana
    const weekNumber = Math.floor((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  // Alimentos
  static async searchFoods(query: string): Promise<Food[]> {
    const response = await api.get<Food[]>('/foods/search', {
      params: { q: query }
    });
    return response.data;
  }

  static async getFoodById(foodId: string): Promise<Food> {
    const response = await api.get<Food>(`/foods/${foodId}`);
    return response.data;
  }

  // Taxonomías - Obtener listas de opciones
  static async getCuisines(search = '', take = 20, skip = 0): Promise<{ items: Cuisine[], total: number }> {
    try {
      // Intentar primero con el endpoint público
      const response = await api.get<{ items: Cuisine[], total: number }>('/taxonomies/cuisines', {
        params: { search, take, skip }
      });
      return response.data;
    } catch (error) {
      // Si falla, intentar con el endpoint admin
      const response = await api.get<{ items: Cuisine[], total: number }>('/admin/taxonomies/cuisines', {
        params: { search, take, skip }
      });
      return response.data;
    }
  }

  static async getAllergies(search = '', take = 20, skip = 0): Promise<{ items: Allergy[], total: number }> {
    try {
      // Intentar primero con el endpoint público
      const response = await api.get<{ items: Allergy[], total: number }>('/taxonomies/allergies', {
        params: { search, take, skip }
      });
      return response.data;
    } catch (error) {
      // Si falla, intentar con el endpoint admin
      const response = await api.get<{ items: Allergy[], total: number }>('/admin/taxonomies/allergies', {
        params: { search, take, skip }
      });
      return response.data;
    }
  }

  static async getConditions(search = '', take = 20, skip = 0): Promise<{ items: Condition[], total: number }> {
    try {
      // Intentar primero con el endpoint público
      const response = await api.get<{ items: Condition[], total: number }>('/taxonomies/conditions', {
        params: { search, take, skip }
      });
      return response.data;
    } catch (error) {
      // Si falla, intentar con el endpoint admin
      const response = await api.get<{ items: Condition[], total: number }>('/admin/taxonomies/conditions', {
        params: { search, take, skip }
      });
      return response.data;
    }
  }
}