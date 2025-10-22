import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Wrapper para manejar storage tanto en móvil como en web
class StorageService {
  static async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      // En web usar localStorage
      localStorage.setItem(key, value);
    } else {
      // En móvil usar AsyncStorage
      await AsyncStorage.setItem(key, value);
    }
  }

  static async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      // En web usar localStorage
      return localStorage.getItem(key);
    } else {
      // En móvil usar AsyncStorage
      return await AsyncStorage.getItem(key);
    }
  }

  static async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      // En web usar localStorage
      localStorage.removeItem(key);
    } else {
      // En móvil usar AsyncStorage
      await AsyncStorage.removeItem(key);
    }
  }

  static async multiRemove(keys: string[]): Promise<void> {
    if (Platform.OS === 'web') {
      // En web remover uno por uno
      keys.forEach(key => localStorage.removeItem(key));
    } else {
      // En móvil usar AsyncStorage
      await AsyncStorage.multiRemove(keys);
    }
  }
}

export default StorageService;