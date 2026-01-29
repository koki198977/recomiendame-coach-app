import { NutritionService } from './nutritionService';
import { AchievementsService } from './achievementsService';
import { Achievement, MealLog, TodayMealsResponse } from '../types/nutrition';
import StorageService from './storage';

export interface FoodPhotoStreakData {
  currentStreak: number;
  longestStreak: number;
  todayPhotos: number;
  totalPhotos: number;
  streakDays: string[]; // Array de fechas con rachas completadas
  lastStreakDate: string | null;
}

export class FoodPhotoStreakService {
  private static readonly PHOTOS_PER_STREAK = 3;
  private static readonly STORAGE_KEY = 'food_photo_streak_data';

  /**
   * Obtener datos actuales de racha de fotos
   */
  static async getStreakData(): Promise<FoodPhotoStreakData> {
    try {
      const stored = await StorageService.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.log('Error loading streak data:', error);
    }

    // Datos por defecto
    return {
      currentStreak: 0,
      longestStreak: 0,
      todayPhotos: 0,
      totalPhotos: 0,
      streakDays: [],
      lastStreakDate: null,
    };
  }

  /**
   * Guardar datos de racha
   */
  private static async saveStreakData(data: FoodPhotoStreakData): Promise<void> {
    try {
      await StorageService.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('✅ Streak data saved:', data);
    } catch (error) {
      console.log('Error saving streak data:', error);
    }
  }

  /**
   * Actualizar racha después de subir una foto
   */
  static async updateStreakAfterPhotoUpload(): Promise<{
    streakData: FoodPhotoStreakData;
    achievementsUnlocked: Achievement[];
  }> {
    console.log('🚀 Updating streak after photo upload...');
    const today = new Date().toISOString().split('T')[0];
    const streakData = await this.getStreakData();
    
    console.log('📊 Current streak data:', streakData);
    
    // Obtener fotos del día actual
    const todayMeals = await NutritionService.getTodayMeals();
    const todayPhotos = this.countPhotosInMeals(todayMeals);
    
    console.log(`📸 Photos today: ${todayPhotos} (was ${streakData.todayPhotos})`);
    
    // Actualizar contador de fotos del día
    streakData.todayPhotos = todayPhotos;
    streakData.totalPhotos = await this.getTotalPhotosCount();

    // Verificar si se completó la racha del día (3 fotos)
    const completedStreakToday = todayPhotos >= this.PHOTOS_PER_STREAK;
    
    console.log(`🔥 Streak completed today: ${completedStreakToday}`);
    
    if (completedStreakToday && !streakData.streakDays.includes(today)) {
      console.log('✅ Adding today to streak days');
      // Agregar el día a las rachas completadas
      streakData.streakDays.push(today);
      streakData.lastStreakDate = today;
      
      // Calcular racha actual
      streakData.currentStreak = this.calculateCurrentStreak(streakData.streakDays);
      
      // Actualizar racha más larga
      if (streakData.currentStreak > streakData.longestStreak) {
        streakData.longestStreak = streakData.currentStreak;
      }
      
      console.log(`🏆 New streak: ${streakData.currentStreak} days`);
    }

    await this.saveStreakData(streakData);

    // Verificar logros desbloqueados
    const achievementsUnlocked = await this.checkAchievements(streakData);
    
    console.log('🎉 Achievements unlocked:', achievementsUnlocked.length);

    return { streakData, achievementsUnlocked };
  }

  /**
   * Contar fotos en las comidas del día
   */
  private static countPhotosInMeals(todayMeals: TodayMealsResponse): number {
    console.log('🔍 Counting photos in meals:', todayMeals.logs.length, 'meals');
    const photosCount = todayMeals.logs.filter(meal => {
      const hasPhoto = meal.imageUrl && meal.imageUrl.trim() !== '';
      console.log(`📸 Meal "${meal.title}": ${hasPhoto ? 'HAS PHOTO' : 'NO PHOTO'} (${meal.imageUrl})`);
      return hasPhoto;
    }).length;
    console.log(`📊 Total photos found: ${photosCount}`);
    return photosCount;
  }

  /**
   * Obtener total de fotos subidas históricamente
   */
  private static async getTotalPhotosCount(): Promise<number> {
    try {
      // Por ahora, incrementar el contador basado en las fotos actuales
      const streakData = await this.getStreakData();
      const todayMeals = await NutritionService.getTodayMeals();
      const todayPhotos = this.countPhotosInMeals(todayMeals);
      
      // Si hay más fotos hoy de las que teníamos registradas, actualizar el total
      const newTotal = Math.max(streakData.totalPhotos, streakData.totalPhotos + (todayPhotos - streakData.todayPhotos));
      console.log(`📈 Total photos: ${newTotal} (was ${streakData.totalPhotos}, today: ${todayPhotos})`);
      return newTotal;
    } catch (error) {
      console.log('Error getting total photos count:', error);
      return 0;
    }
  }

  /**
   * Calcular racha actual basada en días consecutivos
   */
  private static calculateCurrentStreak(streakDays: string[]): number {
    if (streakDays.length === 0) return 0;

    // Ordenar fechas de más reciente a más antigua
    const sortedDays = streakDays.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let currentStreak = 0;
    const today = new Date();
    
    for (let i = 0; i < sortedDays.length; i++) {
      const streakDate = new Date(sortedDays[i]);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      // Verificar si la fecha es consecutiva
      if (streakDate.toDateString() === expectedDate.toDateString()) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    return currentStreak;
  }

  /**
   * Verificar y desbloquear logros
   */
  private static async checkAchievements(streakData: FoodPhotoStreakData): Promise<Achievement[]> {
    const achievements = AchievementsService.getAllAchievements();
    const unlockedAchievements: Achievement[] = [];

    // Cargar logros ya desbloqueados para evitar duplicados
    let alreadyUnlockedIds: string[] = [];
    try {
      const existingAchievements = await StorageService.getItem('unlocked_achievements');
      alreadyUnlockedIds = existingAchievements ? JSON.parse(existingAchievements) : [];
    } catch (error) {
      console.log('Error loading existing achievements:', error);
    }

    // Verificar logros de fotos de comida
    const foodPhotoAchievements = achievements.filter(a => a.category === 'food_photos');

    for (const achievement of foodPhotoAchievements) {
      // Skip si ya está desbloqueado
      if (alreadyUnlockedIds.includes(achievement.id)) {
        console.log(`⏭️ Skipping already unlocked achievement: ${achievement.title}`);
        continue;
      }

      let shouldUnlock = false;
      let progress = 0;

      switch (achievement.id) {
        case 'food_photo_first':
          progress = streakData.totalPhotos > 0 ? 1 : 0;
          shouldUnlock = streakData.totalPhotos >= 1;
          break;
          
        case 'food_photo_streak_3':
          progress = streakData.todayPhotos;
          shouldUnlock = streakData.todayPhotos >= 3;
          break;
          
        case 'food_photo_streak_7':
          progress = streakData.currentStreak;
          shouldUnlock = streakData.currentStreak >= 7;
          break;
          
        case 'food_photo_streak_30':
          progress = streakData.currentStreak;
          shouldUnlock = streakData.currentStreak >= 30;
          break;
          
        case 'food_photo_total_50':
          progress = streakData.totalPhotos;
          shouldUnlock = streakData.totalPhotos >= 50;
          break;
          
        case 'food_photo_total_100':
          progress = streakData.totalPhotos;
          shouldUnlock = streakData.totalPhotos >= 100;
          break;
      }

      // Actualizar progreso
      achievement.progress = Math.min(progress, achievement.maxProgress);

      if (shouldUnlock) {
        achievement.isUnlocked = true;
        achievement.unlockedAt = new Date().toISOString();
        unlockedAchievements.push(achievement);
        console.log('🏆 NEW Achievement unlocked:', achievement.title);
      }
    }

    // Guardar logros actualizados en storage local para persistencia
    if (unlockedAchievements.length > 0) {
      try {
        unlockedAchievements.forEach(achievement => {
          if (!alreadyUnlockedIds.includes(achievement.id)) {
            alreadyUnlockedIds.push(achievement.id);
          }
        });
        
        await StorageService.setItem('unlocked_achievements', JSON.stringify(alreadyUnlockedIds));
        console.log('💾 Unlocked achievements saved to storage:', alreadyUnlockedIds);
      } catch (error) {
        console.log('Error saving unlocked achievements:', error);
      }
    }

    return unlockedAchievements;
  }

  /**
   * Obtener progreso de racha para mostrar en UI
   */
  static async getStreakProgress(): Promise<{
    todayPhotos: number;
    photosNeeded: number;
    currentStreak: number;
    longestStreak: number;
    progressPercentage: number;
  }> {
    const streakData = await this.getStreakData();
    const photosNeeded = Math.max(0, this.PHOTOS_PER_STREAK - streakData.todayPhotos);
    const progressPercentage = Math.min((streakData.todayPhotos / this.PHOTOS_PER_STREAK) * 100, 100);

    return {
      todayPhotos: streakData.todayPhotos,
      photosNeeded,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      progressPercentage,
    };
  }

  /**
   * Actualizar racha después de eliminar una foto
   */
  static async updateStreakAfterPhotoDelete(): Promise<{
    streakData: FoodPhotoStreakData;
    achievementsRevoked: string[];
  }> {
    console.log('🗑️ Updating streak after photo delete...');
    const today = new Date().toISOString().split('T')[0];
    const streakData = await this.getStreakData();
    
    console.log('📊 Current streak data before delete:', streakData);
    
    // Obtener fotos del día actual
    const todayMeals = await NutritionService.getTodayMeals();
    const todayPhotos = this.countPhotosInMeals(todayMeals);
    
    console.log(`📸 Photos today after delete: ${todayPhotos} (was ${streakData.todayPhotos})`);
    
    // Actualizar contador de fotos del día
    const previousTodayPhotos = streakData.todayPhotos;
    streakData.todayPhotos = todayPhotos;
    
    // Si tenía 3+ fotos y ahora tiene menos de 3, remover el día de las rachas
    const hadStreakToday = previousTodayPhotos >= this.PHOTOS_PER_STREAK;
    const hasStreakToday = todayPhotos >= this.PHOTOS_PER_STREAK;
    
    const achievementsRevoked: string[] = [];
    
    if (hadStreakToday && !hasStreakToday) {
      console.log('❌ Streak lost for today, removing from streak days');
      // Remover el día de las rachas completadas
      streakData.streakDays = streakData.streakDays.filter(day => day !== today);
      
      // Recalcular racha actual
      streakData.currentStreak = this.calculateCurrentStreak(streakData.streakDays);
      
      // Si la racha actual cambió, verificar si hay que revocar logros
      if (streakData.currentStreak < 7) {
        achievementsRevoked.push('food_photo_streak_7');
      }
      if (streakData.currentStreak < 30) {
        achievementsRevoked.push('food_photo_streak_30');
      }
      
      // Revocar el logro de racha diaria
      achievementsRevoked.push('food_photo_streak_3');
      
      console.log(`🔄 New streak: ${streakData.currentStreak} days`);
    }

    // Actualizar total de fotos (decrementar si es necesario)
    if (previousTodayPhotos > todayPhotos) {
      const photosRemoved = previousTodayPhotos - todayPhotos;
      streakData.totalPhotos = Math.max(0, streakData.totalPhotos - photosRemoved);
      console.log(`📉 Total photos reduced by ${photosRemoved}, now: ${streakData.totalPhotos}`);
    }

    await this.saveStreakData(streakData);

    // Revocar logros si es necesario
    if (achievementsRevoked.length > 0) {
      await this.revokeAchievements(achievementsRevoked);
    }

    console.log('🔄 Streak updated after delete:', streakData);
    console.log('❌ Achievements revoked:', achievementsRevoked);

    return { streakData, achievementsRevoked };
  }

  /**
   * Revocar logros desbloqueados
   */
  private static async revokeAchievements(achievementIds: string[]): Promise<void> {
    try {
      const existingAchievements = await StorageService.getItem('unlocked_achievements');
      let unlockedIds = existingAchievements ? JSON.parse(existingAchievements) : [];
      
      // Remover los logros revocados
      unlockedIds = unlockedIds.filter((id: string) => !achievementIds.includes(id));
      
      await StorageService.setItem('unlocked_achievements', JSON.stringify(unlockedIds));
      console.log('🔒 Achievements revoked and removed from storage:', achievementIds);
    } catch (error) {
      console.log('Error revoking achievements:', error);
    }
  }

  /**
   * Resetear datos de racha (para testing o reset manual)
   */
  static async resetStreakData(): Promise<void> {
    const defaultData: FoodPhotoStreakData = {
      currentStreak: 0,
      longestStreak: 0,
      todayPhotos: 0,
      totalPhotos: 0,
      streakDays: [],
      lastStreakDate: null,
    };
    
    await this.saveStreakData(defaultData);
  }
}