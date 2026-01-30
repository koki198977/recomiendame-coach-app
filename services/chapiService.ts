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
        API_CONFIG.ENDPOINTS.CHAPI.INSIGHTS
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
}

export default new ChapiService();
