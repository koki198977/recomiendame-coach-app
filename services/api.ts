import axios from 'axios';
import StorageService from './storage';
import { API_CONFIG } from '../config/api';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token de autenticación
api.interceptors.request.use(
  async (config) => {
    const token = await StorageService.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Variable para almacenar el callback de logout
let onUnauthorizedCallback: (() => void) | null = null;

// Función para registrar el callback de logout
export const setUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido, limpiar storage
      await StorageService.removeItem('authToken');
      await StorageService.removeItem('userData');
      await StorageService.removeItem('userProfile');
      await StorageService.removeItem('onboardingCompleted');
      
      // Llamar al callback para redirigir al login
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    
    // Si es 500 y el mensaje indica problema de autenticación, también cerrar sesión
    if (error.response?.status === 500 && error.response?.data?.message?.includes('auth')) {
      await StorageService.removeItem('authToken');
      await StorageService.removeItem('userData');
      await StorageService.removeItem('userProfile');
      await StorageService.removeItem('onboardingCompleted');
      
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;