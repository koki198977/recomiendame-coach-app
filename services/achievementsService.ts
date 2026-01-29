import { Achievement } from '../types/nutrition';

export class AchievementsService {
  // Definición de todos los logros disponibles
  static getAllAchievements(): Achievement[] {
    return [
      // Logros de racha
      {
        id: 'first_checkin',
        title: 'Primer Paso',
        description: 'Completa tu primer check-in diario',
        icon: '🎯',
        category: 'streak',
        requirement: 1,
        isUnlocked: false,
        progress: 0,
        maxProgress: 1,
      },
      {
        id: 'streak_3',
        title: 'Constancia',
        description: 'Mantén una racha de 3 días consecutivos',
        icon: '🔥',
        category: 'streak',
        requirement: 3,
        isUnlocked: false,
        progress: 0,
        maxProgress: 3,
      },
      {
        id: 'streak_7',
        title: 'Primera Semana',
        description: 'Completa 7 días consecutivos de check-ins',
        icon: '🏆',
        category: 'streak',
        requirement: 7,
        isUnlocked: false,
        progress: 0,
        maxProgress: 7,
      },
      {
        id: 'streak_30',
        title: 'Mes Completo',
        description: 'Mantén una racha de 30 días consecutivos',
        icon: '👑',
        category: 'streak',
        requirement: 30,
        isUnlocked: false,
        progress: 0,
        maxProgress: 30,
      },

      // Logros de peso
      {
        id: 'weight_loss_1kg',
        title: 'Primer Kilo',
        description: 'Pierde tu primer kilogramo',
        icon: '⚖️',
        category: 'weight',
        requirement: 1,
        isUnlocked: false,
        progress: 0,
        maxProgress: 1,
      },
      {
        id: 'weight_loss_5kg',
        title: 'Gran Progreso',
        description: 'Pierde 5 kilogramos',
        icon: '🎖️',
        category: 'weight',
        requirement: 5,
        isUnlocked: false,
        progress: 0,
        maxProgress: 5,
      },
      {
        id: 'weight_loss_10kg',
        title: 'Transformación',
        description: 'Pierde 10 kilogramos',
        icon: '🏅',
        category: 'weight',
        requirement: 10,
        isUnlocked: false,
        progress: 0,
        maxProgress: 10,
      },
      {
        id: 'weight_loss_20kg',
        title: 'Metamorfosis',
        description: 'Pierde 20 kilogramos',
        icon: '🦋',
        category: 'weight',
        requirement: 20,
        isUnlocked: false,
        progress: 0,
        maxProgress: 20,
      },

      // Logros de adherencia
      {
        id: 'adherence_80',
        title: 'Buen Seguimiento',
        description: 'Mantén 80% de adherencia por una semana',
        icon: '📊',
        category: 'adherence',
        requirement: 80,
        isUnlocked: false,
        progress: 0,
        maxProgress: 80,
      },
      {
        id: 'adherence_90',
        title: 'Excelente Adherencia',
        description: 'Mantén 90% de adherencia por una semana',
        icon: '🎯',
        category: 'adherence',
        requirement: 90,
        isUnlocked: false,
        progress: 0,
        maxProgress: 90,
      },

      // Logros de fotos de comida (NUEVOS)
      {
        id: 'food_photo_first',
        title: 'Primera Foto',
        description: 'Sube tu primera foto de comida',
        icon: '📸',
        category: 'food_photos',
        requirement: 1,
        isUnlocked: false,
        progress: 0,
        maxProgress: 1,
      },
      {
        id: 'food_photo_streak_3',
        title: 'Racha Fotográfica',
        description: 'Sube 3 fotos de comida en un día',
        icon: '🔥',
        category: 'food_photos',
        requirement: 3,
        isUnlocked: false,
        progress: 0,
        maxProgress: 3,
      },
      {
        id: 'food_photo_streak_7',
        title: 'Semana Completa',
        description: 'Completa rachas de 3 fotos durante 7 días consecutivos',
        icon: '🏆',
        category: 'food_photos',
        requirement: 7,
        isUnlocked: false,
        progress: 0,
        maxProgress: 7,
      },
      {
        id: 'food_photo_streak_30',
        title: 'Mes Fotográfico',
        description: 'Completa rachas de 3 fotos durante 30 días consecutivos',
        icon: '👑',
        category: 'food_photos',
        requirement: 30,
        isUnlocked: false,
        progress: 0,
        maxProgress: 30,
      },
      {
        id: 'food_photo_total_50',
        title: 'Coleccionista',
        description: 'Sube un total de 50 fotos de comida',
        icon: '📚',
        category: 'food_photos',
        requirement: 50,
        isUnlocked: false,
        progress: 0,
        maxProgress: 50,
      },
      {
        id: 'food_photo_total_100',
        title: 'Fotógrafo Culinario',
        description: 'Sube un total de 100 fotos de comida',
        icon: '📷',
        category: 'food_photos',
        requirement: 100,
        isUnlocked: false,
        progress: 0,
        maxProgress: 100,
      },
      {
        id: 'adherence_perfect',
        title: 'Día Perfecto',
        description: 'Logra 100% de adherencia en un día',
        icon: '⭐',
        category: 'adherence',
        requirement: 100,
        isUnlocked: false,
        progress: 0,
        maxProgress: 100,
      },
      {
        id: 'adherence_week_90',
        title: 'Semana Excelente',
        description: 'Mantén 90%+ de adherencia por una semana',
        icon: '🌟',
        category: 'adherence',
        requirement: 90,
        isUnlocked: false,
        progress: 0,
        maxProgress: 90,
      },

      // Logros sociales
      {
        id: 'first_post',
        title: 'Primera Publicación',
        description: 'Comparte tu primer post en la comunidad',
        icon: '📝',
        category: 'social',
        requirement: 1,
        isUnlocked: false,
        progress: 0,
        maxProgress: 1,
      },
      {
        id: 'social_butterfly',
        title: 'Mariposa Social',
        description: 'Recibe 10 likes en tus posts',
        icon: '🦋',
        category: 'social',
        requirement: 10,
        isUnlocked: false,
        progress: 0,
        maxProgress: 10,
      },
      {
        id: 'community_helper',
        title: 'Ayudante Comunitario',
        description: 'Comenta en 5 posts de otros usuarios',
        icon: '🤝',
        category: 'social',
        requirement: 5,
        isUnlocked: false,
        progress: 0,
        maxProgress: 5,
      },

      // Logros de entrenamiento
      {
        id: 'first_workout',
        title: 'Primer Entrenamiento',
        description: 'Completa tu primera rutina de ejercicios',
        icon: '💪',
        category: 'workout',
        requirement: 1,
        isUnlocked: false,
        progress: 0,
        maxProgress: 1,
      },
      {
        id: 'workout_week',
        title: 'Semana Activa',
        description: 'Entrena 3 días en una semana',
        icon: '🏃',
        category: 'workout',
        requirement: 3,
        isUnlocked: false,
        progress: 0,
        maxProgress: 3,
      },
      {
        id: 'workout_dedication',
        title: 'Dedicación Total',
        description: 'Completa 10 entrenamientos',
        icon: '🎯',
        category: 'workout',
        requirement: 10,
        isUnlocked: false,
        progress: 0,
        maxProgress: 10,
      },
      {
        id: 'calories_100',
        title: 'Quemador Principiante',
        description: 'Quema 100 calorías en un entrenamiento',
        icon: '🔥',
        category: 'workout',
        requirement: 100,
        isUnlocked: false,
        progress: 0,
        maxProgress: 100,
      },
      {
        id: 'calories_300',
        title: 'Quemador Avanzado',
        description: 'Quema 300 calorías en un entrenamiento',
        icon: '🔥🔥',
        category: 'workout',
        requirement: 300,
        isUnlocked: false,
        progress: 0,
        maxProgress: 300,
      },
      {
        id: 'calories_500',
        title: 'Máquina de Quemar',
        description: 'Quema 500 calorías en un entrenamiento',
        icon: '🔥🔥🔥',
        category: 'workout',
        requirement: 500,
        isUnlocked: false,
        progress: 0,
        maxProgress: 500,
      },
      {
        id: 'calories_total_1000',
        title: 'Mil Calorías',
        description: 'Quema 1000 calorías en total',
        icon: '⚡',
        category: 'workout',
        requirement: 1000,
        isUnlocked: false,
        progress: 0,
        maxProgress: 1000,
      },
      {
        id: 'calories_total_5000',
        title: 'Incinerador',
        description: 'Quema 5000 calorías en total',
        icon: '💥',
        category: 'workout',
        requirement: 5000,
        isUnlocked: false,
        progress: 0,
        maxProgress: 5000,
      },
      {
        id: 'workout_streak_7',
        title: 'Semana Imparable',
        description: 'Entrena 7 días consecutivos',
        icon: '🏆',
        category: 'workout',
        requirement: 7,
        isUnlocked: false,
        progress: 0,
        maxProgress: 7,
      },

      // Logros de hitos
      {
        id: 'first_plan',
        title: 'Plan Personalizado',
        description: 'Genera tu primer plan nutricional con IA',
        icon: '🤖',
        category: 'milestone',
        requirement: 1,
        isUnlocked: false,
        progress: 0,
        maxProgress: 1,
      },
      {
        id: 'profile_complete',
        title: 'Perfil Completo',
        description: 'Completa toda la información de tu perfil',
        icon: '✅',
        category: 'milestone',
        requirement: 1,
        isUnlocked: false,
        progress: 0,
        maxProgress: 1,
      },
    ];
  }

  // Calcular progreso de logros basado en datos del usuario
  static calculateAchievements(data: {
    streakDays: number;
    totalCheckins: number;
    weightLoss: number;
    maxAdherence: number;
    avgAdherence: number;
    postsCount: number;
    likesReceived: number;
    commentsGiven: number;
    hasProfile: boolean;
    hasPlans: boolean;
    // Datos de entrenamiento
    totalWorkouts?: number;
    maxCaloriesInWorkout?: number;
    totalCaloriesBurned?: number;
    workoutStreakDays?: number;
    workoutsThisWeek?: number;
    // Datos de fotos de comida
    foodPhotoStreak?: number;
    foodPhotoLongestStreak?: number;
    foodPhotoTotalPhotos?: number;
    foodPhotoTodayPhotos?: number;
    // Logros ya desbloqueados (para persistencia)
    unlockedAchievementIds?: string[];
  }): Achievement[] {
    const achievements = this.getAllAchievements();

    return achievements.map(achievement => {
      let progress = 0;
      let isUnlocked = false;

      // Verificar si ya está desbloqueado en storage
      const wasAlreadyUnlocked = data.unlockedAchievementIds?.includes(achievement.id) || false;

      switch (achievement.id) {
        // Logros de racha
        case 'first_checkin':
          progress = Math.min(data.totalCheckins, 1);
          isUnlocked = data.totalCheckins >= 1;
          break;
        case 'streak_3':
          progress = Math.min(data.streakDays, 3);
          isUnlocked = data.streakDays >= 3;
          break;
        case 'streak_7':
          progress = Math.min(data.streakDays, 7);
          isUnlocked = data.streakDays >= 7;
          break;
        case 'streak_30':
          progress = Math.min(data.streakDays, 30);
          isUnlocked = data.streakDays >= 30;
          break;

        // Logros de peso
        case 'weight_loss_1kg':
          progress = Math.min(data.weightLoss, 1);
          isUnlocked = data.weightLoss >= 1;
          break;
        case 'weight_loss_5kg':
          progress = Math.min(data.weightLoss, 5);
          isUnlocked = data.weightLoss >= 5;
          break;
        case 'weight_loss_10kg':
          progress = Math.min(data.weightLoss, 10);
          isUnlocked = data.weightLoss >= 10;
          break;
        case 'weight_loss_20kg':
          progress = Math.min(data.weightLoss, 20);
          isUnlocked = data.weightLoss >= 20;
          break;

        // Logros de adherencia
        case 'adherence_perfect':
          progress = Math.min(data.maxAdherence, 100);
          isUnlocked = data.maxAdherence >= 100;
          break;
        case 'adherence_week_90':
          progress = Math.min(data.avgAdherence, 90);
          isUnlocked = data.avgAdherence >= 90;
          break;

        // Logros sociales
        case 'first_post':
          progress = Math.min(data.postsCount, 1);
          isUnlocked = data.postsCount >= 1;
          break;
        case 'social_butterfly':
          progress = Math.min(data.likesReceived, 10);
          isUnlocked = data.likesReceived >= 10;
          break;
        case 'community_helper':
          progress = Math.min(data.commentsGiven, 5);
          isUnlocked = data.commentsGiven >= 5;
          break;

        // Logros de entrenamiento
        case 'first_workout':
          progress = Math.min(data.totalWorkouts || 0, 1);
          isUnlocked = (data.totalWorkouts || 0) >= 1;
          break;
        case 'workout_week':
          progress = Math.min(data.workoutsThisWeek || 0, 3);
          isUnlocked = (data.workoutsThisWeek || 0) >= 3;
          break;
        case 'workout_dedication':
          progress = Math.min(data.totalWorkouts || 0, 10);
          isUnlocked = (data.totalWorkouts || 0) >= 10;
          break;
        case 'calories_100':
          progress = Math.min(data.maxCaloriesInWorkout || 0, 100);
          isUnlocked = (data.maxCaloriesInWorkout || 0) >= 100;
          break;
        case 'calories_300':
          progress = Math.min(data.maxCaloriesInWorkout || 0, 300);
          isUnlocked = (data.maxCaloriesInWorkout || 0) >= 300;
          break;
        case 'calories_500':
          progress = Math.min(data.maxCaloriesInWorkout || 0, 500);
          isUnlocked = (data.maxCaloriesInWorkout || 0) >= 500;
          break;
        case 'calories_total_1000':
          progress = Math.min(data.totalCaloriesBurned || 0, 1000);
          isUnlocked = (data.totalCaloriesBurned || 0) >= 1000;
          break;
        case 'calories_total_5000':
          progress = Math.min(data.totalCaloriesBurned || 0, 5000);
          isUnlocked = (data.totalCaloriesBurned || 0) >= 5000;
          break;
        case 'workout_streak_7':
          progress = Math.min(data.workoutStreakDays || 0, 7);
          isUnlocked = (data.workoutStreakDays || 0) >= 7;
          break;

        // Logros de hitos
        case 'first_plan':
          progress = data.hasPlans ? 1 : 0;
          isUnlocked = data.hasPlans;
          break;
        case 'profile_complete':
          progress = data.hasProfile ? 1 : 0;
          isUnlocked = data.hasProfile;
          break;

        // Logros de fotos de comida
        case 'food_photo_first':
          progress = Math.min(data.foodPhotoTotalPhotos || 0, 1);
          isUnlocked = wasAlreadyUnlocked && (data.foodPhotoTotalPhotos || 0) >= 1;
          break;
        case 'food_photo_streak_3':
          progress = Math.min(data.foodPhotoTodayPhotos || 0, 3);
          // Solo está desbloqueado si cumple la condición Y está en storage
          isUnlocked = wasAlreadyUnlocked && (data.foodPhotoTodayPhotos || 0) >= 3;
          break;
        case 'food_photo_streak_7':
          progress = Math.min(data.foodPhotoStreak || 0, 7);
          isUnlocked = wasAlreadyUnlocked && (data.foodPhotoStreak || 0) >= 7;
          break;
        case 'food_photo_streak_30':
          progress = Math.min(data.foodPhotoStreak || 0, 30);
          isUnlocked = wasAlreadyUnlocked && (data.foodPhotoStreak || 0) >= 30;
          break;
        case 'food_photo_total_50':
          progress = Math.min(data.foodPhotoTotalPhotos || 0, 50);
          isUnlocked = wasAlreadyUnlocked && (data.foodPhotoTotalPhotos || 0) >= 50;
          break;
        case 'food_photo_total_100':
          progress = Math.min(data.foodPhotoTotalPhotos || 0, 100);
          isUnlocked = wasAlreadyUnlocked && (data.foodPhotoTotalPhotos || 0) >= 100;
          break;
      }

      return {
        ...achievement,
        progress,
        isUnlocked,
        unlockedAt: isUnlocked ? new Date().toISOString() : undefined,
      };
    });
  }

  // Detectar nuevos logros desbloqueados
  static getNewlyUnlockedAchievements(
    previousAchievements: Achievement[],
    currentAchievements: Achievement[]
  ): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    currentAchievements.forEach(current => {
      const previous = previousAchievements.find(p => p.id === current.id);
      
      if (current.isUnlocked && (!previous || !previous.isUnlocked)) {
        newlyUnlocked.push(current);
      }
    });

    return newlyUnlocked;
  }

  // Generar mensaje para compartir trofeo
  static generateTrophyShareMessage(achievement: Achievement): string {
    const messages = {
      'first_checkin': '¡Acabo de completar mi primer check-in! 🎯 #PrimerPaso #RecomiendameCoach',
      'streak_3': '¡3 días consecutivos de constancia! 🔥 #Constancia #RecomiendameCoach',
      'streak_7': '¡Una semana completa de dedicación! 🏆 #PrimeraSemana #RecomiendameCoach',
      'streak_30': '¡30 días consecutivos! Soy imparable 👑 #MesCompleto #RecomiendameCoach',
      'weight_loss_1kg': '¡Perdí mi primer kilogramo! ⚖️ #PrimerKilo #RecomiendameCoach',
      'weight_loss_5kg': '¡5 kilos menos! El progreso es real 🎖️ #GranProgreso #RecomiendameCoach',
      'weight_loss_10kg': '¡10 kilos perdidos! Transformación total 🏅 #Transformacion #RecomiendameCoach',
      'weight_loss_20kg': '¡20 kilos perdidos! Metamorfosis completa 🦋 #Metamorfosis #RecomiendameCoach',
      'adherence_perfect': '¡Día perfecto con 100% de adherencia! ⭐ #DiaPerfecto #RecomiendameCoach',
      'adherence_week_90': '¡Semana excelente con +90% adherencia! 🌟 #SemanaExcelente #RecomiendameCoach',
      'first_post': '¡Mi primera publicación en la comunidad! 📝 #PrimeraPublicacion #RecomiendameCoach',
      'social_butterfly': '¡10 likes en mis posts! Gracias comunidad 🦋 #MariposaSocial #RecomiendameCoach',
      'community_helper': '¡Ayudando a la comunidad con mis comentarios! 🤝 #AyudanteComunitario #RecomiendameCoach',
      'first_workout': '¡Completé mi primer entrenamiento! 💪 #PrimerEntrenamiento #RecomiendameCoach',
      'workout_week': '¡3 entrenamientos esta semana! 🏃 #SemanaActiva #RecomiendameCoach',
      'workout_dedication': '¡10 entrenamientos completados! 🎯 #DedicacionTotal #RecomiendameCoach',
      'calories_100': '¡Quemé 100 calorías en un entrenamiento! 🔥 #QuemadorPrincipiante #RecomiendameCoach',
      'calories_300': '¡300 calorías quemadas en una sesión! 🔥🔥 #QuemadorAvanzado #RecomiendameCoach',
      'calories_500': '¡500 calorías en un solo entrenamiento! 🔥🔥🔥 #MaquinaDeQuemar #RecomiendameCoach',
      'calories_total_1000': '¡1000 calorías quemadas en total! ⚡ #MilCalorias #RecomiendameCoach',
      'calories_total_5000': '¡5000 calorías quemadas! Soy un incinerador 💥 #Incinerador #RecomiendameCoach',
      'workout_streak_7': '¡7 días consecutivos entrenando! 🏆 #SemanaImparable #RecomiendameCoach',
      'first_plan': '¡Mi primer plan nutricional personalizado con IA! 🤖 #PlanPersonalizado #RecomiendameCoach',
      'profile_complete': '¡Perfil 100% completo! Listo para la transformación ✅ #PerfilCompleto #RecomiendameCoach',
      // Logros de fotos de comida
      'food_photo_first': '¡Subí mi primera foto de comida! 📸 #PrimeraFoto #RecomiendameCoach',
      'food_photo_streak_3': '¡3 fotos de comida en un día! Racha fotográfica 🔥 #RachaFotografica #RecomiendameCoach',
      'food_photo_streak_7': '¡7 días consecutivos con 3 fotos diarias! 🏆 #SemanaCompleta #RecomiendameCoach',
      'food_photo_streak_30': '¡30 días de rachas fotográficas! Soy un fotógrafo culinario 👑 #MesFotografico #RecomiendameCoach',
      'food_photo_total_50': '¡50 fotos de comida subidas! Coleccionista gastronómico 📚 #Coleccionista #RecomiendameCoach',
      'food_photo_total_100': '¡100 fotos de comida! Fotógrafo culinario profesional 📷 #FotografoCulinario #RecomiendameCoach',
    };

    return messages[achievement.id as keyof typeof messages] || 
           `¡Nuevo logro desbloqueado: ${achievement.title}! ${achievement.icon} #RecomiendameCoach`;
  }
}