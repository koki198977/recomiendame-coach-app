import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { AuthService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: 'USER' | 'COACH') => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Simplificar la verificación inicial
    const initAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            setUser(JSON.parse(userData));
          }
        }
      } catch (error) {
        console.log('Error init auth:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await AuthService.login({ email, password });
      
      // Crear usuario simple con datos básicos
      const userData: User = {
        id: 'user-' + Date.now(),
        email: email,
        name: email.split('@')[0],
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Guardar en storage
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, role: 'USER' | 'COACH' = 'USER') => {
    try {
      const response = await AuthService.register({ email, password, name, role });
      
      // Crear usuario simple
      const userData: User = {
        id: 'user-' + Date.now(),
        email: email,
        name: name,
        role: role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Guardar en storage
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
      setUser(null); // Forzar logout en el estado
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null && user !== undefined,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};