import api from './api';
import StorageService from './storage';
import { LoginRequest, RegisterRequest, AuthResponse, User } from '../types';

export class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log('🚀 Starting login with:', credentials.email);
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    
    // Debug: Log para ver qué devuelve la API
    console.log('Login response:', response.data);
    console.log('Response status:', response.status);
    
    // Guardar token (tu API devuelve access_token)
    const token = response.data.access_token;
    console.log('Token received:', token);
    
    if (token && typeof token === 'string') {
      await StorageService.setItem('authToken', token);
      console.log('Token saved to storage');
    } else {
      console.log('No valid token received');
    }
    
    // Si hay datos del usuario, guardarlos
    if (response.data.user) {
      await StorageService.setItem('userData', JSON.stringify(response.data.user));
      console.log('User data saved');
    } else {
      console.log('No user data received');
    }
    
    return response.data;
  }

  static async register(userData: RegisterRequest): Promise<User> {
    // Tu endpoint es /users, no /auth/register
    const response = await api.post<User>('/users', userData);
    
    // El endpoint de registro solo crea el usuario, no devuelve token
    // Necesitaremos hacer login después del registro
    return response.data;
  }

  static async logout(): Promise<void> {
    try {
      await StorageService.multiRemove(['authToken', 'userData']);
    } catch (error) {
      console.log('Error during logout cleanup:', error);
      // Como fallback, intentar limpiar individualmente
      try {
        await StorageService.removeItem('authToken');
        await StorageService.removeItem('userData');
      } catch (fallbackError) {
        console.log('Fallback cleanup also failed:', fallbackError);
      }
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await StorageService.getItem('userData');
      if (userData && userData !== 'undefined' && userData !== 'null') {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.log('Error getting current user:', error);
      return null;
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    try {
      const token = await StorageService.getItem('authToken');
      return token !== null && token !== undefined && token.length > 0;
    } catch (error) {
      console.log('Error checking authentication:', error);
      return false;
    }
  }

  static async getProfile(): Promise<User> {
    // Tu backend no tiene /auth/profile, usar /me/profile en su lugar
    const response = await api.get<User>('/me/profile');
    
    // Actualizar datos del usuario en storage
    await StorageService.setItem('userData', JSON.stringify(response.data));
    
    return response.data;
  }
}