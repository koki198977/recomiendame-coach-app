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

      // Logros de adherencia
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
  }): Achievement[] {
    console.log('🎯 AchievementsService recibió datos:', data);
    const achievements = this.getAllAchievements();

    return achievements.map(achievement => {
      let progress = 0;
      let isUnlocked = false;

      switch (achievement.id) {
        // Logros de racha
        case 'first_checkin':
          progress = Math.min(data.totalCheckins, 1);
          isUnlocked = data.totalCheckins >= 1;
          console.log('🎯 first_checkin:', { totalCheckins: data.totalCheckins, progress, isUnlocked });
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

        // Logros de hitos
        case 'first_plan':
          progress = data.hasPlans ? 1 : 0;
          isUnlocked = data.hasPlans;
          break;
        case 'profile_complete':
          progress = data.hasProfile ? 1 : 0;
          isUnlocked = data.hasProfile;
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
      'adherence_perfect': '¡Día perfecto con 100% de adherencia! ⭐ #DiaPerfecto #RecomiendameCoach',
      'adherence_week_90': '¡Semana excelente con +90% adherencia! 🌟 #SemanaExcelente #RecomiendameCoach',
      'first_post': '¡Mi primera publicación en la comunidad! 📝 #PrimeraPublicacion #RecomiendameCoach',
      'social_butterfly': '¡10 likes en mis posts! Gracias comunidad 🦋 #MariposaSocial #RecomiendameCoach',
      'community_helper': '¡Ayudando a la comunidad con mis comentarios! 🤝 #AyudanteComunitario #RecomiendameCoach',
      'first_plan': '¡Mi primer plan nutricional personalizado con IA! 🤖 #PlanPersonalizado #RecomiendameCoach',
      'profile_complete': '¡Perfil 100% completo! Listo para la transformación ✅ #PerfilCompleto #RecomiendameCoach',
    };

    return messages[achievement.id as keyof typeof messages] || 
           `¡Nuevo logro desbloqueado: ${achievement.title}! ${achievement.icon} #RecomiendameCoach`;
  }
}