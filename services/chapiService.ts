import api from './api';
import { API_CONFIG } from '../config/api';
import { 
  ChapiCheckInRequest, 
  ChapiCheckInResponse, 
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
      
      console.log('✅ Respuesta de Chapi:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error sending message to Chapi:', error);
      
      // Fallback response si hay error
      return {
        logId: 'error',
        emotion: 'neutral',
        advice: 'Lo siento, estoy teniendo problemas para conectarme en este momento. Por favor, intenta de nuevo más tarde.',
        actions: [],
      };
    }
  }
  
  /**
   * Convertir acciones del backend a formato ChapiAction
   */
  convertBackendActions(backendActions: any[]): ChapiAction[] {
    if (!backendActions || backendActions.length === 0) return [];
    
    return backendActions.map((action, index) => ({
      id: `action_${index}_${Date.now()}`,
      label: action.title,
      type: action.type === 'PHYSICAL' ? 'exercise' : 'breathing',
      duration: action.durationMinutes,
      description: action.title,
    }));
  }

  /**
   * Obtener historial de conversación con Chapi desde el backend
   */
  async getConversationHistory(): Promise<ChapiMessage[]> {
    try {
      const response = await api.get<{ messages: ChapiMessage[] }>(
        API_CONFIG.ENDPOINTS.CHAPI.CONVERSATION_HISTORY
      );
      
      return response.data.messages || [];
    } catch (error: any) {
      console.error('Error fetching Chapi conversation history:', error);
      
      // Si el endpoint no existe o hay error, retornar array vacío
      if (error.response?.status === 404) {
        return [];
      }
      
      throw error;
    }
  }

  /**
   * Guardar mensaje en el historial del backend
   * (Si el backend lo soporta en el futuro)
   */
  async saveMessage(message: ChapiMessage): Promise<boolean> {
    try {
      // Por ahora, el endpoint check-in ya guarda internamente
      // Esta función está preparada para futuras implementaciones
      return true;
    } catch (error) {
      console.error('Error saving message to backend:', error);
      return false;
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
