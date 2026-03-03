import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Servicio para manejar cache de la aplicación
 */
class CacheService {
  // Claves de cache
  static readonly CHAPI_INSIGHTS_KEY = 'chapi_insights_cache';
  static readonly USER_PROFILE_KEY = 'user_profile_cache';
  static readonly NUTRITION_PLAN_KEY = 'nutrition_plan_cache';
  static readonly WEEKLY_PROGRESS_KEY = 'weekly_progress_cache';
  static readonly MONTHLY_PROGRESS_KEY = 'monthly_progress_cache';

  /**
   * Limpiar cache específico
   */
  static async clearCache(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Cache cleared: ${key}`);
    } catch (error) {
      console.error(`❌ Error clearing cache ${key}:`, error);
    }
  }

  /**
   * Limpiar todo el cache de Chapi
   */
  static async clearChapiCache(): Promise<void> {
    await this.clearCache(this.CHAPI_INSIGHTS_KEY);
  }

  /**
   * Limpiar cache de progreso (semanal y mensual)
   */
  static async clearProgressCache(): Promise<void> {
    await Promise.all([
      this.clearCache(this.WEEKLY_PROGRESS_KEY),
      this.clearCache(this.MONTHLY_PROGRESS_KEY),
    ]);
    console.log('🗑️ Progress cache cleared');
  }

  /**
   * Limpiar todo el cache de la app
   */
  static async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.includes('_cache'));
      
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`🗑️ Cleared ${cacheKeys.length} cache entries`);
    } catch (error) {
      console.error('❌ Error clearing all cache:', error);
    }
  }

  /**
   * Obtener información del cache
   */
  static async getCacheInfo(): Promise<{
    totalKeys: number;
    cacheKeys: string[];
    totalSize: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.includes('_cache'));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return {
        totalKeys: keys.length,
        cacheKeys,
        totalSize
      };
    } catch (error) {
      console.error('❌ Error getting cache info:', error);
      return {
        totalKeys: 0,
        cacheKeys: [],
        totalSize: 0
      };
    }
  }

  /**
   * Verificar si un cache ha expirado
   */
  static async isCacheExpired(key: string, maxAge: number): Promise<boolean> {
    try {
      const cachedData = await AsyncStorage.getItem(key);
      if (!cachedData) return true;

      const parsed = JSON.parse(cachedData);
      const now = Date.now();
      
      return (now - parsed.timestamp) > maxAge;
    } catch (error) {
      console.error(`❌ Error checking cache expiration for ${key}:`, error);
      return true;
    }
  }

  /**
   * Limpiar cache expirado automáticamente
   */
  static async cleanExpiredCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.includes('_cache'));
      
      for (const key of cacheKeys) {
        const cachedData = await AsyncStorage.getItem(key);
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            const now = Date.now();
            
            // Si el cache tiene más de 24 horas, eliminarlo
            if (parsed.timestamp && (now - parsed.timestamp) > 24 * 60 * 60 * 1000) {
              await AsyncStorage.removeItem(key);
              console.log(`🗑️ Removed expired cache: ${key}`);
            }
          } catch (parseError) {
            // Si no se puede parsear, eliminar el cache corrupto
            await AsyncStorage.removeItem(key);
            console.log(`🗑️ Removed corrupted cache: ${key}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning expired cache:', error);
    }
  }

  /**
   * Guardar datos de progreso en caché
   */
  static async saveProgressCache(period: 'week' | 'month', data: any): Promise<void> {
    try {
      const key = period === 'week' ? this.WEEKLY_PROGRESS_KEY : this.MONTHLY_PROGRESS_KEY;
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`💾 Progress cache saved for ${period}`);
    } catch (error) {
      console.error(`❌ Error saving progress cache for ${period}:`, error);
    }
  }

  /**
   * Obtener datos de progreso desde caché
   */
  static async getProgressCache(period: 'week' | 'month'): Promise<any | null> {
    try {
      const key = period === 'week' ? this.WEEKLY_PROGRESS_KEY : this.MONTHLY_PROGRESS_KEY;
      const cachedData = await AsyncStorage.getItem(key);
      
      if (!cachedData) {
        console.log(`📭 No cache found for ${period}`);
        return null;
      }

      const parsed = JSON.parse(cachedData);
      const now = Date.now();
      
      // Cache válido por 1 hora (3600000 ms)
      const maxAge = 60 * 60 * 1000;
      
      if (now - parsed.timestamp > maxAge) {
        console.log(`⏰ Cache expired for ${period}`);
        await this.clearCache(key);
        return null;
      }

      console.log(`✅ Using cached data for ${period}`);
      return parsed.data;
    } catch (error) {
      console.error(`❌ Error getting progress cache for ${period}:`, error);
      return null;
    }
  }
}

export default CacheService;