import api from './api';
import { API_CONFIG } from '../config/api';
import { 
  ChapiCheckInRequest, 
  ChapiCheckInResponse, 
  ChapiInsightsResponse,
  ChapiMessage,
  ChapiConversation,
  EmotionalState,
  ChapiAction
} from '../types/nutrition';

/**
 * Servicio para interactuar con Chapi - Asistente Virtual de Acompañamiento Emocional
 */
class ChapiService {
  /**
   * Enviar mensaje a Chapi y recibir respuesta
   */
  async sendMessage(message: string): Promise<ChapiCheckInResponse> {
    try {
      const request: ChapiCheckInRequest = { message };
      const response = await api.post<ChapiCheckInResponse>(
        API_CONFIG.ENDPOINTS.CHAPI.CHECK_IN,
        request
      );
      
      console.log('✅ Respuesta de Chapi 2.0:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error sending message to Chapi 2.0:', error);
      
      // Fallback response si hay error
      return {
        success: false,
        data: {
          response: {
            message: 'Lo siento, estoy teniendo problemas para conectarme en este momento. Por favor, intenta de nuevo más tarde.',
            messageType: 'error',
            personalizedInsights: [],
            actions: [],
            followUpSuggestions: [],
          },
          conversationId: 'error',
          sessionId: 'error',
        },
      };
    }
  }
  
  /**
   * Convertir acciones del backend a formato ChapiAction
   */
  convertBackendActions(backendActions: any[]): ChapiAction[] {
    if (!backendActions || backendActions.length === 0) return [];
    
    console.log('🔄 Convirtiendo acciones del backend (Chapi 2.0):', backendActions);
    
    const convertedActions = backendActions.map((action, index) => {
      // Mapear tipos de acción
      let actionType: ChapiAction['type'] = 'routine';
      if (action.type === 'create_plan') actionType = 'routine';
      else if (action.type === 'PHYSICAL') actionType = 'exercise';
      else if (action.type === 'MENTAL') actionType = 'breathing';
      
      const converted: ChapiAction = {
        id: `action_${index}_${Date.now()}`,
        label: action.type === 'create_plan' ? 'Crear plan personalizado' : action.title || 'Acción sugerida',
        type: actionType,
        duration: action.durationMinutes,
        description: action.type === 'create_plan' ? 'Te ayudo a crear un plan personalizado' : (action.title || 'Acción recomendada'),
        youtubeUrl: action.youtubeUrl, // Mantener soporte para URLs de YouTube
      };
      
      console.log(`📺 Acción ${index}:`, {
        original: action,
        converted: converted,
        hasYouTubeUrl: !!converted.youtubeUrl
      });
      
      return converted;
    });
    
    console.log('✅ Acciones convertidas (Chapi 2.0):', convertedActions);
    return convertedActions;
  }

  /**
   * Obtener insights personalizados de Chapi 2.0
   */
  async getInsights(): Promise<ChapiInsightsResponse> {
    try {
      const response = await api.get<ChapiInsightsResponse>(
        API_CONFIG.ENDPOINTS.CHAPI.INSIGHTS,
        { timeout: API_CONFIG.LONG_TIMEOUT }
      );
      
      console.log('✅ Insights de Chapi 2.0:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error obteniendo insights de Chapi 2.0:', error);
      
      // Fallback response si hay error
      return {
        success: false,
        data: {
          insights: ['No se pudieron cargar los insights en este momento.'],
          recommendations: [],
          predictiveAlerts: [],
          userContext: {
            todayProgress: {
              checkinCompleted: false,
              hydrationProgress: 0,
              mealsLogged: 0,
              workoutCompleted: false,
              sleepLogged: false,
            },
            recentTrends: {
              weightTrend: 'stable',
              adherenceTrend: 'stable',
              emotionalTrend: 'neutral',
            },
            upcomingEvents: {
              goalDeadlines: [],
              planExpirations: [],
              streakMilestones: [],
            },
          },
          conversationOpportunities: {
            suggestedTopics: [],
            followUpQuestions: [],
            motivationalMessages: [],
          },
        },
      };
    }
  }

  /**
   * Parsear respuesta de Chapi y extraer acciones sugeridas
   */
  parseActionsFromResponse(response: string): ChapiAction[] {
    const actions: ChapiAction[] = [];
    
    // Buscar patrones comunes de acciones en el texto
    const actionPatterns = [
      { pattern: /(\d+)\s*min(?:utos?)?\s*de\s*sol/i, type: 'sunlight' as const, label: 'Tomar sol' },
      { pattern: /ducha\s*fr[íi]a/i, type: 'shower' as const, label: 'Ducha fría' },
      { pattern: /respiraci[óo]n|breathing/i, type: 'breathing' as const, label: 'Ejercicio de respiración' },
      { pattern: /caminar\s*(\d+)\s*min/i, type: 'walk' as const, label: 'Caminar' },
      { pattern: /ejercicio\s*de\s*(\d+)\s*min/i, type: 'exercise' as const, label: 'Ejercicio rápido' },
      { pattern: /rutina|reset/i, type: 'routine' as const, label: 'Rutina de reset' },
    ];

    actionPatterns.forEach((pattern, index) => {
      const match = response.match(pattern.pattern);
      if (match) {
        const duration = match[1] ? parseInt(match[1]) : undefined;
        actions.push({
          id: `action_${index}_${Date.now()}`,
          label: pattern.label,
          type: pattern.type,
          duration,
          description: match[0],
        });
      }
    });

    return actions;
  }

  /**
   * Clasificar estado emocional basado en palabras clave
   * (Esto es un clasificador simple, el backend debería hacer esto mejor)
   */
  classifyEmotionalState(message: string): EmotionalState {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.match(/motivado|energi[sz]ado|feliz|genial|excelente|bien/)) {
      return 'motivated';
    }
    if (lowerMessage.match(/cansado|agotado|sin\s*energ[íi]a|exhausto/)) {
      return 'tired';
    }
    if (lowerMessage.match(/burnout|quemado|desbordado/)) {
      return 'burnout';
    }
    if (lowerMessage.match(/triste|pena|mal|deprimido/)) {
      return 'sad';
    }
    if (lowerMessage.match(/ansioso|ansiedad|nervioso|estresado|estr[ée]s/)) {
      return 'anxious';
    }
    
    return 'neutral';
  }

  /**
   * Generar ID único para mensajes
   */
  generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtener análisis del progreso semanal
   */
  async getWeeklyProgressAnalysis(weekData: {
    weeklyCompletion: number;
    macroCompliance: {
      calories: { days: number; total: number };
      protein: { days: number; total: number };
      fats: { days: number; total: number };
    };
    dailyAdherence: number[];
    weeklyAverage: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    };
    freeExercises?: {
      totalSessions: number;
      totalCaloriesBurned: number;
      totalMinutes: number;
      activities: string[]; // ej: ['Running 5km 30min', 'Ciclismo 45min']
    };
  }): Promise<{ message: string; emoji: string }> {
    try {
      // Construir sección de actividad física libre si hay datos
      const freeExerciseSection = weekData.freeExercises && weekData.freeExercises.totalSessions > 0
        ? `
ACTIVIDAD FÍSICA LIBRE ESTA SEMANA:
- ${weekData.freeExercises.totalSessions} sesión(es) registrada(s)
- Total calorías quemadas: ${weekData.freeExercises.totalCaloriesBurned} kcal
- Total tiempo activo: ${weekData.freeExercises.totalMinutes} minutos
- Actividades: ${weekData.freeExercises.activities.join(', ')}
`
        : '';

      // Construir mensaje contextual para Chapi
      const contextMessage = `
Analiza mi progreso semanal y dame un mensaje motivacional personalizado:

CUMPLIMIENTO GENERAL:
- ${weekData.weeklyCompletion}% de cumplimiento semanal (${Math.round((weekData.weeklyCompletion / 100) * 7)}/7 días con comidas registradas)

CUMPLIMIENTO DE MACROS:
- Calorías: ${weekData.macroCompliance.calories.days}/${weekData.macroCompliance.calories.total} días dentro del rango objetivo
- Proteína: ${weekData.macroCompliance.protein.days}/${weekData.macroCompliance.protein.total} días cumpliendo objetivo
- Grasas: ${weekData.macroCompliance.fats.days}/${weekData.macroCompliance.fats.total} días controladas

ADHERENCIA DIARIA (L-D):
${weekData.dailyAdherence.map((adh, i) => {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  return `- ${days[i]}: ${adh}%`;
}).join('\n')}

PROMEDIO SEMANAL:
- Calorías: ${weekData.weeklyAverage.calories} kcal/día
- Proteína: ${weekData.weeklyAverage.protein}g/día
- Carbohidratos: ${weekData.weeklyAverage.carbs}g/día
- Grasas: ${weekData.weeklyAverage.fats}g/día
${freeExerciseSection}
Dame un mensaje corto (máximo 2 líneas) que:
1. Reconozca mi progreso o identifique áreas de mejora${weekData.freeExercises && weekData.freeExercises.totalSessions > 0 ? ', incluyendo mi actividad física' : ''}
2. Sea motivacional y personalizado
3. Incluya un emoji apropiado al final
`;

      const response = await this.sendMessage(contextMessage);
      
      if (response.success && response.data.response.message) {
        // Extraer emoji del mensaje si existe
        const emojiMatch = response.data.response.message.match(/[\u{1F300}-\u{1F9FF}]/u);
        const emoji = emojiMatch ? emojiMatch[0] : '🚀';
        
        return {
          message: response.data.response.message,
          emoji: emoji,
        };
      }
      
      // Fallback si no hay respuesta
      return this.generateFallbackMessage(weekData);
    } catch (error) {
      console.error('Error obteniendo análisis semanal de Chapi:', error);
      return this.generateFallbackMessage(weekData);
    }
  }

  /**
   * Obtener análisis del progreso mensual
   */
  async getMonthlyProgressAnalysis(monthData: {
    monthlyCompletion: number;
    macroCompliance: {
      calories: { days: number; total: number };
      protein: { days: number; total: number };
      fats: { days: number; total: number };
    };
    dailyAdherence: number[];
    monthlyAverage: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    };
    freeExercises?: {
      totalSessions: number;
      totalCaloriesBurned: number;
      totalMinutes: number;
      activities: string[];
    };
  }): Promise<{ message: string; emoji: string }> {
    try {
      const totalDays = monthData.macroCompliance.calories.total;
      const daysWithData = Math.round((monthData.monthlyCompletion / 100) * totalDays);

      const freeExerciseSection = monthData.freeExercises && monthData.freeExercises.totalSessions > 0
        ? `
ACTIVIDAD FÍSICA LIBRE ESTE MES:
- ${monthData.freeExercises.totalSessions} sesión(es) registrada(s)
- Total calorías quemadas: ${monthData.freeExercises.totalCaloriesBurned} kcal
- Total tiempo activo: ${monthData.freeExercises.totalMinutes} minutos
`
        : '';

      // Construir mensaje contextual para Chapi
      const contextMessage = `
Analiza mi progreso mensual y dame un mensaje motivacional personalizado:

CUMPLIMIENTO GENERAL:
- ${monthData.monthlyCompletion}% de cumplimiento mensual (${daysWithData}/${totalDays} días con comidas registradas)

CUMPLIMIENTO DE MACROS:
- Calorías: ${monthData.macroCompliance.calories.days}/${monthData.macroCompliance.calories.total} días dentro del rango objetivo
- Proteína: ${monthData.macroCompliance.protein.days}/${monthData.macroCompliance.protein.total} días cumpliendo objetivo
- Grasas: ${monthData.macroCompliance.fats.days}/${monthData.macroCompliance.fats.total} días controladas

PROMEDIO MENSUAL:
- Calorías: ${monthData.monthlyAverage.calories} kcal/día
- Proteína: ${monthData.monthlyAverage.protein}g/día
- Carbohidratos: ${monthData.monthlyAverage.carbs}g/día
- Grasas: ${monthData.monthlyAverage.fats}g/día
${freeExerciseSection}
Dame un mensaje corto (máximo 2 líneas) que:
1. Reconozca mi progreso mensual o identifique áreas de mejora${monthData.freeExercises && monthData.freeExercises.totalSessions > 0 ? ', incluyendo mi actividad física' : ''}
2. Sea motivacional y personalizado
3. Incluya un emoji apropiado al final
`;

      const response = await this.sendMessage(contextMessage);
      
      if (response.success && response.data.response.message) {
        // Extraer emoji del mensaje si existe
        const emojiMatch = response.data.response.message.match(/[\u{1F300}-\u{1F9FF}]/u);
        const emoji = emojiMatch ? emojiMatch[0] : '🚀';
        
        return {
          message: response.data.response.message,
          emoji: emoji,
        };
      }
      
      // Fallback si no hay respuesta
      return this.generateFallbackMonthlyMessage(monthData);
    } catch (error) {
      console.error('Error obteniendo análisis mensual de Chapi:', error);
      return this.generateFallbackMonthlyMessage(monthData);
    }
  }

  /**
   * Generar mensaje fallback basado en los datos
   */
  private generateFallbackMessage(weekData: {
    weeklyCompletion: number;
    macroCompliance: {
      calories: { days: number; total: number };
      protein: { days: number; total: number };
      fats: { days: number; total: number };
    };
    dailyAdherence: number[];
  }): { message: string; emoji: string } {
    const completion = weekData.weeklyCompletion;
    const avgAdherence = weekData.dailyAdherence.reduce((a, b) => a + b, 0) / 7;
    
    // Mensajes basados en el cumplimiento
    if (completion >= 85) {
      return {
        message: '¡Excelente semana! Tu constancia está dando resultados increíbles. Sigue así y notarás grandes cambios en tu salud.',
        emoji: '🎉',
      };
    } else if (completion >= 70) {
      return {
        message: 'Muy buen progreso esta semana. Estás en el camino correcto, mantén el ritmo y verás resultados pronto.',
        emoji: '💪',
      };
    } else if (completion >= 50) {
      return {
        message: 'Vas por buen camino, pero hay espacio para mejorar. Intenta ser más consistente con tus registros esta semana.',
        emoji: '📈',
      };
    } else if (completion >= 30) {
      return {
        message: 'Veo que tuviste algunos días sin registros. No te desanimes, cada día es una nueva oportunidad para mejorar.',
        emoji: '🌱',
      };
    } else {
      return {
        message: 'Parece que esta semana fue difícil. Recuerda que el progreso no es lineal. ¡Vamos a retomar el ritmo juntos!',
        emoji: '💚',
      };
    }
  }

  /**
   * Generar mensaje fallback mensual basado en los datos
   */
  private generateFallbackMonthlyMessage(monthData: {
    monthlyCompletion: number;
    macroCompliance: {
      calories: { days: number; total: number };
      protein: { days: number; total: number };
      fats: { days: number; total: number };
    };
    dailyAdherence: number[];
  }): { message: string; emoji: string } {
    const completion = monthData.monthlyCompletion;
    const totalDays = monthData.macroCompliance.calories.total;
    const daysWithData = Math.round((completion / 100) * totalDays);
    
    // Mensajes basados en el cumplimiento mensual
    if (completion >= 85) {
      return {
        message: `¡Mes excepcional! Registraste ${daysWithData} de ${totalDays} días. Tu disciplina es admirable y los resultados llegarán pronto.`,
        emoji: '🏆',
      };
    } else if (completion >= 70) {
      return {
        message: `Buen mes con ${daysWithData} días registrados. Mantén esta consistencia y alcanzarás tus metas más rápido de lo que piensas.`,
        emoji: '💪',
      };
    } else if (completion >= 50) {
      return {
        message: `Avanzaste ${daysWithData} días este mes. Hay potencial para mejorar, intenta ser más constante el próximo mes.`,
        emoji: '📊',
      };
    } else if (completion >= 30) {
      return {
        message: `Este mes fue irregular con ${daysWithData} días. No te preocupes, cada mes es una nueva oportunidad para mejorar tu constancia.`,
        emoji: '🌱',
      };
    } else {
      return {
        message: `Veo que este mes fue desafiante. Recuerda que lo importante es retomar el hábito. ¡El próximo mes será mejor!`,
        emoji: '💚',
      };
    }
  }
}

export default new ChapiService();
