import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { AuthService } from '../services/authService';

interface SimpleAuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

interface SimpleAuthProviderProps {
  children: ReactNode;
}

export const SimpleAuthProvider: React.FC<SimpleAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.log('Error init auth:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await AuthService.login({ email, password });
      
      const userData: User = {
        id: 'user-' + Date.now(),
        email: email,
        name: email.split('@')[0],
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value: SimpleAuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
  };

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
};

export const useSimpleAuth = (): SimpleAuthContextType => {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
};