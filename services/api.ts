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

// Log para debugging
console.log('API Base URL:', API_CONFIG.BASE_URL);

// Interceptor para agregar el token de autenticación
api.interceptors.request.use(
  async (config) => {
    console.log('Making request to:', config.baseURL + config.url);
    console.log('Request data:', config.data);
    
    const token = await StorageService.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.log('Request error:', error);
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
    console.log('Response success:', response.status, response.data);
    return response;
  },
  async (error) => {
    console.log('Response error:', error.response?.status, error.response?.data);
    console.log('Full error:', error);
    
    if (error.response?.status === 401) {
      console.log('🔒 Token inválido o expirado - Cerrando sesión');
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
      console.log('🔒 Error de autenticación en el servidor - Cerrando sesión');
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