import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Obtiene el ID correcto del usuario actual desde el token JWT
 * El endpoint /me devuelve un ID diferente, por eso usamos el token
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      // El ID correcto está en 'sub' del JWT decodificado
      const userId = parsedUser.sub || parsedUser.id || parsedUser.userId;
      console.log('getCurrentUserId - Found user ID:', userId);
      return userId;
    }
    console.log('getCurrentUserId - No user data found');
    return null;
  } catch (error) {
    console.log('getCurrentUserId - Error:', error);
    return null;
  }
};

/**
 * Obtiene el email del usuario actual
 */
export const getCurrentUserEmail = async (): Promise<string | null> => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      return parsedUser.email || null;
    }
    return null;
  } catch (error) {
    console.log('getCurrentUserEmail - Error:', error);
    return null;
  }
};

/**
 * Obtiene los datos completos del usuario desde AsyncStorage
 */
export const getCurrentUserData = async (): Promise<any | null> => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.log('getCurrentUserData - Error:', error);
    return null;
  }
};