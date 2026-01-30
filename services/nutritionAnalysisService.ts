import api from './api';
import { API_CONFIG } from '../config/api';
import openFoodFactsService from './openFoodFactsService';
import chapiService from './chapiService';
import { 
  NutritionalAnalysis, 
  ChapiProductAnalysisRequest,
  ChapiProductAnalysisResponse 
} from '../types/openFoodFacts';
import { UserProfile } from '../types/nutrition';

/**
 * Servicio integrado para análisis nutricional que combina OpenFoodFacts con Chapi
 */
class NutritionAnalysisService {
  
  /**
   * Analizar un producto escaneado con análisis completo de Chapi
   */
  async analyzeScannedProduct(
    barcode: string, 
    userProfile?: UserProfile,
    currentContext?: any
  ): Promise<{
    success: boolean;
    product?: NutritionalAnalysis;
    chapiAnalysis?: ChapiProductAnalysisResponse;
    error?: string;
  }> {
    try {
      console.log('🔬 Iniciando análisis completo del producto:', barcode);
      
      // 1. Obtener datos del producto de OpenFoodFacts
      const productResponse = await openFoodFactsService.analyzeScannedProduct({
        barcode,
        userProfile: userProfile ? {
          nutritionGoal: userProfile.nutritionGoal,
          allergies: userProfile.allergies?.map(a => typeof a === 'string' ? a : a.name) || [],
          conditions: userProfile.conditions?.map(c => typeof c === 'string' ? c : c.code) || [],
          targetCalories: 2000 // Esto debería venir del plan actual
        } : undefined
      });

      if (!productResponse.success || !productResponse.product) {
        return {
          success: false,
          error: productResponse.error || 'Producto no encontrado'
        };
      }

      // 2. Obtener análisis avanzado de Chapi si hay perfil de usuario
      let chapiAnalysis: ChapiProductAnalysisResponse | undefined;
      
      if (userProfile && productResponse.product.personalizedAnalysis) {
        try {
          chapiAnalysis = await this.getChapiProductAnalysis(
            productResponse.product,
            {
              currentPlan: currentContext?.currentPlan,
              recentMeals: currentContext?.recentMeals || [],
              dailyProgress: currentContext?.dailyProgress,
              goals: {
                nutritionGoal: userProfile.nutritionGoal,
                targetWeight: userProfile.targetWeightKg,
                timeFrame: userProfile.timeFrame,
                intensity: userProfile.intensity
              }
            }
          );
        } catch (error) {
          console.warn('⚠️ Error obteniendo análisis de Chapi:', error);
          // Continuar sin el análisis de Chapi
        }
      }

      console.log('✅ Análisis completo terminado');
      
      return {
        success: true,
        product: productResponse.product,
        chapiAnalysis
      };
      
    } catch (error) {
      console.error('❌ Error en análisis completo:', error);
      return {
        success: false,
        error: 'Error procesando el análisis del producto'
      };
    }
  }

  /**
   * Obtener análisis inteligente de Chapi sobre un producto
   */
  async getChapiProductAnalysis(
    product: NutritionalAnalysis,
    userContext: ChapiProductAnalysisRequest['userContext']
  ): Promise<ChapiProductAnalysisResponse> {
    try {
      console.log('🤖 Solicitando análisis de Chapi para:', product.productName);
      
      // Construir mensaje contextual para Chapi
      const contextMessage = this.buildChapiContextMessage(product, userContext);
      
      const response = await chapiService.sendMessage(contextMessage);
      
      if (response.success && response.data.response.message) {
        // Parsear la respuesta de Chapi y convertirla a nuestro formato
        return this.parseChapiResponse(response.data.response.message, product);
      }
      
      throw new Error('No se pudo obtener respuesta de Chapi');
      
    } catch (error) {
      console.error('❌ Error obteniendo análisis de Chapi:', error);
      
      // Fallback: generar análisis básico
      return this.generateFallbackAnalysis(product);
    }
  }

  /**
   * Construir mensaje contextual para Chapi
   */
  private buildChapiContextMessage(
    product: NutritionalAnalysis,
    userContext: ChapiProductAnalysisRequest['userContext']
  ): string {
    const personalizedAnalysis = product.personalizedAnalysis;
    
    let message = `Analiza este producto que acabo de escanear:

📦 PRODUCTO: ${product.productName}
🏷️ Marca: ${product.brand || 'No especificada'}
📊 Código: ${product.barcode}

🔢 INFORMACIÓN NUTRICIONAL (por 100g):
• Calorías: ${product.nutritionPer100g.calories} kcal
• Proteína: ${product.nutritionPer100g.protein}g
• Carbohidratos: ${product.nutritionPer100g.carbohydrates}g
• Grasas: ${product.nutritionPer100g.fat}g
• Azúcar: ${product.nutritionPer100g.sugar}g
• Fibra: ${product.nutritionPer100g.fiber}g
• Sodio: ${product.nutritionPer100g.sodium}mg

📈 CALIFICACIONES:
• Nutri-Score: ${product.scores.nutriscore?.grade || 'No disponible'}
• Procesamiento NOVA: ${product.scores.novaGroup || 'No disponible'}`;

    if (personalizedAnalysis) {
      message += `
• Mi análisis automático: ${personalizedAnalysis.overallRating} (${personalizedAnalysis.overallScore}/100)`;
    }

    // Agregar contexto del usuario
    if (userContext.goals) {
      message += `

👤 MI CONTEXTO:
• Objetivo: ${userContext.goals.nutritionGoal}`;
      
      if (userContext.goals.targetWeight) {
        message += `
• Peso objetivo: ${userContext.goals.targetWeight}kg`;
      }
    }

    // Agregar progreso del día si está disponible
    if (userContext.dailyProgress) {
      message += `

📊 PROGRESO DE HOY:
• Calorías consumidas: ${userContext.dailyProgress.caloriesConsumed || 0}
• Objetivo calórico: ${userContext.dailyProgress.caloriesTarget || 'No definido'}`;
    }

    // Agregar comidas recientes
    if (userContext.recentMeals && userContext.recentMeals.length > 0) {
      message += `

🍽️ COMIDAS RECIENTES:`;
      userContext.recentMeals.slice(0, 3).forEach((meal: any, index: number) => {
        message += `
• ${meal.title || `Comida ${index + 1}`}: ${meal.kcal || 0} kcal`;
      });
    }

    message += `

❓ PREGUNTA:
¿Qué tan recomendable es este producto para mi plan? Dame:
1. Una recomendación clara (muy recomendado/recomendado/moderado/no recomendado/evitar)
2. Puntuación del 1-100
3. Pros y contras específicos
4. Cómo encaja con mi plan actual
5. Sugerencias de porción y momento de consumo
6. Alternativas mejores si las hay
7. Acciones específicas que debería tomar`;

    return message;
  }

  /**
   * Parsear respuesta de Chapi y convertir a formato estructurado
   */
  private parseChapiResponse(
    chapiMessage: string,
    product: NutritionalAnalysis
  ): ChapiProductAnalysisResponse {
    // Análisis básico de la respuesta de Chapi
    const lowerMessage = chapiMessage.toLowerCase();
    
    // Determinar recomendación
    let recommendation: ChapiProductAnalysisResponse['recommendation'] = 'moderate';
    let score = 50;
    
    if (lowerMessage.includes('muy recomendado') || lowerMessage.includes('excelente')) {
      recommendation = 'highly_recommended';
      score = 85;
    } else if (lowerMessage.includes('recomendado') || lowerMessage.includes('bueno')) {
      recommendation = 'recommended';
      score = 70;
    } else if (lowerMessage.includes('no recomendado') || lowerMessage.includes('evitar')) {
      recommendation = 'not_recommended';
      score = 30;
    } else if (lowerMessage.includes('evitar')) {
      recommendation = 'avoid';
      score = 15;
    }

    // Extraer puntuación si está mencionada
    const scoreMatch = chapiMessage.match(/(\d+)\/100|(\d+)\s*puntos?/i);
    if (scoreMatch) {
      score = parseInt(scoreMatch[1] || scoreMatch[2]);
    }

    // Extraer pros y contras (análisis simple)
    const pros: string[] = [];
    const cons: string[] = [];
    
    if (lowerMessage.includes('alto en proteína') || lowerMessage.includes('buena proteína')) {
      pros.push('Alto contenido de proteína');
    }
    if (lowerMessage.includes('bajo en calorías') || lowerMessage.includes('pocas calorías')) {
      pros.push('Bajo en calorías');
    }
    if (lowerMessage.includes('alto en azúcar') || lowerMessage.includes('mucho azúcar')) {
      cons.push('Alto contenido de azúcar');
    }
    if (lowerMessage.includes('procesado') || lowerMessage.includes('ultraprocesado')) {
      cons.push('Producto procesado');
    }

    return {
      recommendation,
      score,
      summary: chapiMessage.split('\n')[0] || 'Análisis completado',
      analysis: {
        pros,
        cons,
        fitWithPlan: this.extractFitWithPlan(chapiMessage),
        portionAdvice: this.extractPortionAdvice(chapiMessage),
        timingAdvice: this.extractTimingAdvice(chapiMessage)
      },
      alternatives: this.extractAlternatives(chapiMessage),
      actionSuggestions: {
        immediate: this.extractImmediateActions(chapiMessage),
        longTerm: this.extractLongTermActions(chapiMessage)
      }
    };
  }

  /**
   * Generar análisis de fallback si Chapi no está disponible
   */
  private generateFallbackAnalysis(product: NutritionalAnalysis): ChapiProductAnalysisResponse {
    const personalizedAnalysis = product.personalizedAnalysis;
    
    if (!personalizedAnalysis) {
      return {
        recommendation: 'moderate',
        score: 50,
        summary: 'Análisis básico completado',
        analysis: {
          pros: ['Información nutricional disponible'],
          cons: [],
          fitWithPlan: 'Revisar con tu plan nutricional',
          portionAdvice: 'Seguir las recomendaciones del envase'
        },
        actionSuggestions: {
          immediate: ['Revisar etiqueta nutricional'],
          longTerm: ['Consultar con nutricionista']
        }
      };
    }

    // Usar el análisis personalizado existente
    const recommendation = this.mapOverallRatingToRecommendation(personalizedAnalysis.overallRating);
    
    return {
      recommendation,
      score: personalizedAnalysis.overallScore,
      summary: `Producto ${personalizedAnalysis.overallRating} para tus objetivos`,
      analysis: {
        pros: personalizedAnalysis.analysis.goalCompatibility.reasons,
        cons: personalizedAnalysis.recommendations.warnings || [],
        fitWithPlan: personalizedAnalysis.analysis.goalCompatibility.reasons[0] || 'Compatible con moderación',
        portionAdvice: personalizedAnalysis.recommendations.portionSuggestion || 'Seguir porción recomendada'
      },
      alternatives: {
        betterOptions: personalizedAnalysis.recommendations.alternatives || [],
        whyBetter: ['Menos procesados', 'Mejor perfil nutricional']
      },
      actionSuggestions: {
        immediate: personalizedAnalysis.recommendations.consumptionTips || [],
        longTerm: ['Incluir en plan balanceado']
      }
    };
  }

  // Métodos auxiliares para extraer información de la respuesta de Chapi
  private extractFitWithPlan(message: string): string {
    const lines = message.split('\n');
    const fitLine = lines.find(line => 
      line.toLowerCase().includes('plan') || 
      line.toLowerCase().includes('encaja') ||
      line.toLowerCase().includes('compatible')
    );
    return fitLine || 'Revisar compatibilidad con tu plan';
  }

  private extractPortionAdvice(message: string): string {
    const lines = message.split('\n');
    const portionLine = lines.find(line => 
      line.toLowerCase().includes('porción') || 
      line.toLowerCase().includes('cantidad') ||
      line.toLowerCase().includes('gramos')
    );
    return portionLine || 'Seguir porción recomendada del envase';
  }

  private extractTimingAdvice(message: string): string | undefined {
    const lines = message.split('\n');
    const timingLine = lines.find(line => 
      line.toLowerCase().includes('momento') || 
      line.toLowerCase().includes('cuándo') ||
      line.toLowerCase().includes('desayuno') ||
      line.toLowerCase().includes('almuerzo') ||
      line.toLowerCase().includes('cena')
    );
    return timingLine;
  }

  private extractAlternatives(message: string): { betterOptions: string[]; whyBetter: string[] } | undefined {
    const alternatives: string[] = [];
    const reasons: string[] = [];
    
    const lines = message.split('\n');
    let inAlternativesSection = false;
    
    for (const line of lines) {
      if (line.toLowerCase().includes('alternativa') || line.toLowerCase().includes('mejor opción')) {
        inAlternativesSection = true;
        continue;
      }
      
      if (inAlternativesSection && line.trim().startsWith('•') || line.trim().startsWith('-')) {
        alternatives.push(line.trim().substring(1).trim());
      }
    }
    
    if (alternatives.length > 0) {
      return {
        betterOptions: alternatives,
        whyBetter: ['Mejor perfil nutricional', 'Menos procesado']
      };
    }
    
    return undefined;
  }

  private extractImmediateActions(message: string): string[] {
    const actions: string[] = [];
    const lines = message.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('inmediato') || 
          line.toLowerCase().includes('ahora') ||
          line.toLowerCase().includes('hoy')) {
        actions.push(line.trim());
      }
    }
    
    return actions.length > 0 ? actions : ['Revisar información nutricional'];
  }

  private extractLongTermActions(message: string): string[] {
    const actions: string[] = [];
    const lines = message.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('largo plazo') || 
          line.toLowerCase().includes('futuro') ||
          line.toLowerCase().includes('plan')) {
        actions.push(line.trim());
      }
    }
    
    return actions.length > 0 ? actions : ['Incluir en plan balanceado'];
  }

  private mapOverallRatingToRecommendation(
    rating: string
  ): ChapiProductAnalysisResponse['recommendation'] {
    switch (rating) {
      case 'excellent': return 'highly_recommended';
      case 'good': return 'recommended';
      case 'moderate': return 'moderate';
      case 'poor': return 'not_recommended';
      case 'avoid': return 'avoid';
      default: return 'moderate';
    }
  }

  /**
   * Buscar productos similares o alternativos
   */
  async searchAlternativeProducts(
    originalProduct: NutritionalAnalysis,
    userProfile?: UserProfile
  ): Promise<NutritionalAnalysis[]> {
    try {
      // Extraer términos de búsqueda del producto original
      const searchTerms = this.extractSearchTerms(originalProduct);
      
      const alternatives: NutritionalAnalysis[] = [];
      
      for (const term of searchTerms) {
        const searchResponse = await openFoodFactsService.searchProducts({
          query: term,
          limit: 5
        });
        
        // Analizar los primeros resultados
        for (const result of searchResponse.products.slice(0, 2)) {
          if (result.code !== originalProduct.barcode) {
            const analysis = await openFoodFactsService.analyzeScannedProduct({
              barcode: result.code,
              userProfile: userProfile ? {
                nutritionGoal: userProfile.nutritionGoal,
                allergies: userProfile.allergies?.map(a => typeof a === 'string' ? a : a.name) || [],
                conditions: userProfile.conditions?.map(c => typeof c === 'string' ? c : c.code) || []
              } : undefined
            });
            
            if (analysis.success && analysis.product) {
              alternatives.push(analysis.product);
            }
          }
        }
      }
      
      // Filtrar y ordenar por calidad
      return alternatives
        .filter(alt => alt.personalizedAnalysis?.overallScore > (originalProduct.personalizedAnalysis?.overallScore || 0))
        .sort((a, b) => (b.personalizedAnalysis?.overallScore || 0) - (a.personalizedAnalysis?.overallScore || 0))
        .slice(0, 3);
        
    } catch (error) {
      console.error('Error buscando alternativas:', error);
      return [];
    }
  }

  private extractSearchTerms(product: NutritionalAnalysis): string[] {
    const terms: string[] = [];
    
    // Agregar categorías basadas en el nombre del producto
    const productName = product.productName.toLowerCase();
    
    if (productName.includes('yogurt') || productName.includes('yogur')) {
      terms.push('yogurt natural', 'yogur griego');
    }
    if (productName.includes('leche')) {
      terms.push('leche descremada', 'leche vegetal');
    }
    if (productName.includes('cereal')) {
      terms.push('cereal integral', 'avena');
    }
    if (productName.includes('pan')) {
      terms.push('pan integral', 'pan de centeno');
    }
    
    // Agregar términos genéricos si no hay específicos
    if (terms.length === 0) {
      terms.push('alimento saludable', 'producto natural');
    }
    
    return terms;
  }
}

export default new NutritionAnalysisService();