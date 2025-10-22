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
      // Token expirado, limpiar storage y redirigir al login
      await StorageService.removeItem('authToken');
      await StorageService.removeItem('userData');
    }
    return Promise.reject(error);
  }
);

export default api;