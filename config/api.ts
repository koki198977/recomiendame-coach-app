// Configuración de la API
export const API_CONFIG = {
  // URL de tu backend en producción
  BASE_URL: 'https://api-coach.recomiendameapp.cl',
  
  TIMEOUT: 10000,
  
  // Endpoints principales
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      PROFILE: '/auth/profile',
    },
    NUTRITION: {
      PROFILE: '/me/profile',
      PLANS: '/plans',
      GENERATE_PLAN: '/plans/generate',
      CURRENT_PLAN: '/plans/current',
      MEALS: '/meals',
      PROGRESS: '/progress',
      WEIGHT: '/weight',
      FOODS: '/foods',
      FOOD_SEARCH: '/foods/search',
    },
    // Mantenemos los endpoints de coaches por si los necesitas después
    COACHES: {
      LIST: '/coaches',
      SEARCH: '/coaches/search',
      RECOMMENDATIONS: '/coaches/recommendations',
      BY_ID: (id: string) => `/coaches/${id}`,
    },
    SESSIONS: {
      LIST: '/sessions',
      COACH_SESSIONS: '/sessions/coach',
      BY_ID: (id: string) => `/sessions/${id}`,
      CANCEL: (id: string) => `/sessions/${id}/cancel`,
      COMPLETE: (id: string) => `/sessions/${id}/complete`,
    },
  },
};