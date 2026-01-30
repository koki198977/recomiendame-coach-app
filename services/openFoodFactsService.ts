import axios from 'axios';
import { 
  OpenFoodFactsProduct, 
  NutritionalAnalysis, 
  PersonalizedNutritionAnalysis,
  ProductScanRequest,
  ProductScanResponse,
  ProductSearchRequest,
  ProductSearchResponse
} from '../types/openFoodFacts';
import { UserProfile } from '../types/nutrition';
import mockFoodDataService from './mockFoodDataService';

// Configuración específica para React Native
axios.defaults.timeout = 15000;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

/**
 * Servicio para interactuar con la API de OpenFoodFacts
 * Proporciona análisis nutricional personalizado de productos
 */
class OpenFoodFactsService {
  private readonly baseUrl = 'https://world.openfoodfacts.org/api/v2';
  private readonly searchUrl = 'https://world.openfoodfacts.org/cgi/search.pl';

  /**
   * Obtener información de un producto por código de barras
   */
  async getProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
    try {
      console.log(`🔍 Buscando producto con código: ${barcode}`);
      
      // Intentar con diferentes URLs si la primera falla
      const urls = [
        `${this.baseUrl}/product/${barcode}.json`,
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, // URL alternativa
        `https://world.openfoodfacts.net/api/v2/product/${barcode}.json`  // Otro dominio
      ];

      for (let i = 0; i < urls.length; i++) {
        try {
          console.log(`🔄 Intentando URL ${i + 1}/${urls.length}: ${urls[i]}`);
          
          const response = await axios.get<OpenFoodFactsProduct>(urls[i], {
            timeout: 15000, // Aumentar timeout
            headers: {
              'User-Agent': 'RecomiendameCoach/1.0 (contact@recomiendame.app)',
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            },
            // Configuración adicional para React Native
            validateStatus: (status) => status < 500, // Aceptar códigos de estado < 500
          });

          console.log(`📡 Respuesta recibida. Status: ${response.status}`);

          if (response.status === 200 && response.data.status === 1 && response.data.product) {
            console.log('✅ Producto encontrado:', response.data.product.product_name || 'Sin nombre');
            return response.data;
          } else if (response.status === 200 && response.data.status === 0) {
            console.log('❌ Producto no encontrado en la base de datos');
            return null;
          }
        } catch (urlError: any) {
          console.warn(`⚠️ Error con URL ${i + 1}:`, urlError.message);
          
          // Si es el último intento, lanzar el error
          if (i === urls.length - 1) {
            throw urlError;
          }
          
          // Esperar un poco antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return null;
    } catch (error: any) {
      console.error('❌ Error obteniendo producto de OpenFoodFacts:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
      
      // Intentar con datos mock como fallback
      console.log('🎭 Intentando con datos mock como fallback...');
      try {
        const mockProduct = await mockFoodDataService.getMockProduct(barcode);
        if (mockProduct) {
          console.log('✅ Usando datos mock para el producto');
          return mockProduct;
        }
      } catch (mockError) {
        console.warn('⚠️ Error con datos mock:', mockError);
      }
      
      // Proporcionar información más específica del error
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        throw new Error('Sin conexión a internet. Usando datos de ejemplo disponibles.');
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Tiempo de espera agotado. Verifica tu conexión.');
      } else if (error.response?.status >= 500) {
        throw new Error('Servidor no disponible. Usando datos de ejemplo.');
      } else {
        throw new Error(`Error de conexión: ${error.message}`);
      }
    }
  }

  /**
   * Buscar productos por texto
   */
  async searchProducts(request: ProductSearchRequest): Promise<ProductSearchResponse> {
    try {
      console.log(`🔍 Buscando productos: "${request.query}"`);
      
      const params = new URLSearchParams({
        search_terms: request.query,
        json: '1',
        page_size: (request.limit || 20).toString(),
        page: (request.page || 1).toString(),
        fields: 'code,product_name,brands,image_url,nutriscore_grade,nova_group'
      });

      if (request.categories?.length) {
        params.append('categories', request.categories.join(','));
      }

      if (request.brands?.length) {
        params.append('brands', request.brands.join(','));
      }

      const response = await axios.get(`${this.searchUrl}?${params.toString()}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'RecomiendameCoach/1.0 (contact@recomiendame.app)'
        }
      });

      console.log(`✅ Encontrados ${response.data.count} productos`);
      return response.data;
    } catch (error) {
      console.error('❌ Error buscando productos:', error);
      return {
        products: [],
        count: 0,
        page: 1,
        page_count: 0
      };
    }
  }

  /**
   * Analizar un producto escaneado con contexto del usuario
   */
  async analyzeScannedProduct(request: ProductScanRequest): Promise<ProductScanResponse> {
    try {
      console.log(`🔬 Analizando producto escaneado: ${request.barcode}`);
      
      const productData = await this.getProductByBarcode(request.barcode);
      
      if (!productData || !productData.product) {
        return {
          success: false,
          error: 'Producto no encontrado en la base de datos',
          suggestions: {
            searchTerms: ['producto genérico', 'alimento similar'],
            similarProducts: []
          }
        };
      }

      const analysis = this.convertToNutritionalAnalysis(productData);
      
      // Agregar análisis personalizado si hay perfil de usuario
      if (request.userProfile) {
        analysis.personalizedAnalysis = this.generatePersonalizedAnalysis(
          analysis, 
          request.userProfile
        );
      }

      console.log('✅ Análisis completado');
      return {
        success: true,
        product: analysis
      };
    } catch (error) {
      console.error('❌ Error analizando producto:', error);
      return {
        success: false,
        error: 'Error procesando el producto'
      };
    }
  }

  /**
   * Convertir datos de OpenFoodFacts a nuestro formato de análisis
   */
  private convertToNutritionalAnalysis(data: OpenFoodFactsProduct): NutritionalAnalysis {
    const product = data.product;
    const nutriments = product.nutriments || {};

    // Obtener nombre del producto en español o inglés
    const productName = product.product_name_es || 
                       product.product_name_en || 
                       product.product_name || 
                       'Producto sin nombre';

    const analysis: NutritionalAnalysis = {
      productName,
      brand: product.brands,
      barcode: data.code,
      
      nutritionPer100g: {
        calories: nutriments['energy-kcal_100g'] || 0,
        protein: nutriments['proteins_100g'] || 0,
        carbohydrates: nutriments['carbohydrates_100g'] || 0,
        fat: nutriments['fat_100g'] || 0,
        saturatedFat: nutriments['saturated-fat_100g'] || 0,
        sugar: nutriments['sugars_100g'] || 0,
        fiber: nutriments['fiber_100g'] || 0,
        sodium: nutriments['sodium_100g'] || 0,
        salt: nutriments['salt_100g'] || 0,
      },

      scores: {
        nutriscore: product.nutriscore_grade ? {
          grade: product.nutriscore_grade.toUpperCase(),
          score: product.nutriscore_score
        } : undefined,
        novaGroup: product.nova_group,
        ecoscore: product.ecoscore_grade ? {
          grade: product.ecoscore_grade.toUpperCase(),
          score: product.ecoscore_score
        } : undefined
      },

      ingredients: product.ingredients_text_es || product.ingredients_text,
      allergens: product.allergens_tags || [],
      labels: product.labels_tags || [],
      imageUrl: product.image_front_url || product.image_url
    };

    // Agregar información por porción si está disponible
    if (product.serving_size && nutriments['energy-kcal_serving']) {
      analysis.nutritionPerServing = {
        servingSize: product.serving_size,
        calories: nutriments['energy-kcal_serving'] || 0,
        protein: nutriments['proteins_serving'] || 0,
        carbohydrates: nutriments['carbohydrates_serving'] || 0,
        fat: nutriments['fat_serving'] || 0,
        saturatedFat: (nutriments['saturated-fat_serving']) || 0,
        sugar: (nutriments['sugars'] * (nutriments['energy-kcal_serving'] / nutriments['energy-kcal_100g'])) || 0,
        fiber: (nutriments['fiber'] * (nutriments['energy-kcal_serving'] / nutriments['energy-kcal_100g'])) || 0,
        sodium: (nutriments['sodium'] * (nutriments['energy-kcal_serving'] / nutriments['energy-kcal_100g'])) || 0,
        salt: (nutriments['salt'] * (nutriments['energy-kcal_serving'] / nutriments['energy-kcal_100g'])) || 0,
      };
    }

    return analysis;
  }

  /**
   * Generar análisis personalizado basado en el perfil del usuario
   */
  private generatePersonalizedAnalysis(
    product: NutritionalAnalysis, 
    userProfile: any
  ): PersonalizedNutritionAnalysis {
    const nutrition = product.nutritionPer100g;
    let overallScore = 50; // Puntuación base
    const reasons: string[] = [];
    const recommendations: string[] = [];

    // Análisis de macronutrientes según objetivo
    const macroAnalysis = this.analyzeMacronutrients(nutrition, userProfile.nutritionGoal);
    
    // Análisis de calidad del producto
    const qualityAnalysis = this.analyzeProductQuality(product);
    
    // Análisis de restricciones
    const restrictionAnalysis = this.analyzeRestrictions(product, userProfile);

    // Calcular puntuación general
    overallScore += macroAnalysis.scoreAdjustment;
    overallScore += qualityAnalysis.scoreAdjustment;
    overallScore += restrictionAnalysis.scoreAdjustment;
    
    // Limitar puntuación entre 0-100
    overallScore = Math.max(0, Math.min(100, overallScore));

    // Determinar rating general
    let overallRating: PersonalizedNutritionAnalysis['overallRating'];
    if (overallScore >= 80) overallRating = 'excellent';
    else if (overallScore >= 65) overallRating = 'good';
    else if (overallScore >= 45) overallRating = 'moderate';
    else if (overallScore >= 25) overallRating = 'poor';
    else overallRating = 'avoid';

    return {
      overallRating,
      overallScore,
      analysis: {
        goalCompatibility: {
          score: macroAnalysis.goalScore,
          reasons: macroAnalysis.reasons,
          recommendations: macroAnalysis.recommendations
        },
        macroAnalysis: macroAnalysis.macros,
        qualityAnalysis: qualityAnalysis.analysis,
        restrictions: restrictionAnalysis.analysis
      },
      recommendations: {
        portionSuggestion: this.generatePortionSuggestion(product, userProfile),
        alternatives: this.generateAlternatives(product, userProfile),
        consumptionTips: this.generateConsumptionTips(product, userProfile),
        warnings: restrictionAnalysis.warnings
      },
      analysisContext: {
        userGoal: userProfile.nutritionGoal || 'general_health',
        userRestrictions: [
          ...(userProfile.allergies || []),
          ...(userProfile.conditions || [])
        ],
        analysisDate: new Date().toISOString()
      }
    };
  }

  /**
   * Analizar macronutrientes según objetivo del usuario
   */
  private analyzeMacronutrients(nutrition: any, goal?: string) {
    const analysis = {
      scoreAdjustment: 0,
      goalScore: 50,
      reasons: [] as string[],
      recommendations: [] as string[],
      macros: {
        protein: { rating: 'adequate' as const, message: '' },
        carbs: { rating: 'adequate' as const, message: '' },
        fat: { rating: 'adequate' as const, message: '' }
      }
    };

    // Análisis de proteína
    if (nutrition.protein >= 15) {
      analysis.macros.protein = { rating: 'high', message: 'Alto contenido de proteína' };
      analysis.scoreAdjustment += 10;
    } else if (nutrition.protein >= 5) {
      analysis.macros.protein = { rating: 'adequate', message: 'Contenido moderado de proteína' };
    } else {
      analysis.macros.protein = { rating: 'low', message: 'Bajo contenido de proteína' };
      analysis.scoreAdjustment -= 5;
    }

    // Análisis según objetivo específico
    switch (goal) {
      case 'BUILD_MUSCLE':
        if (nutrition.protein >= 20) {
          analysis.goalScore += 20;
          analysis.reasons.push('Excelente para construcción muscular por su alto contenido proteico');
        }
        break;
      
      case 'LOSE_WEIGHT':
        if (nutrition.calories <= 100 && nutrition.protein >= 10) {
          analysis.goalScore += 15;
          analysis.reasons.push('Buena opción para pérdida de peso: pocas calorías, buena proteína');
        }
        if (nutrition.fiber >= 3) {
          analysis.goalScore += 10;
          analysis.reasons.push('Alto contenido de fibra ayuda con la saciedad');
        }
        break;
      
      case 'ATHLETIC_PERFORMANCE':
        if (nutrition.carbohydrates >= 15) {
          analysis.goalScore += 15;
          analysis.reasons.push('Buenos carbohidratos para rendimiento atlético');
        }
        break;
    }

    return analysis;
  }

  /**
   * Analizar calidad del producto
   */
  private analyzeProductQuality(product: NutritionalAnalysis) {
    const analysis = {
      scoreAdjustment: 0,
      analysis: {
        processing: {
          level: 'processed' as const,
          message: '',
          impact: ''
        },
        additives: {
          count: 0,
          concerns: [] as string[]
        }
      }
    };

    // Análisis NOVA (nivel de procesamiento)
    switch (product.scores.novaGroup) {
      case 1:
        analysis.analysis.processing = {
          level: 'minimal',
          message: 'Alimento sin procesar o mínimamente procesado',
          impact: 'Excelente opción para una alimentación saludable'
        };
        analysis.scoreAdjustment += 15;
        break;
      case 2:
        analysis.analysis.processing = {
          level: 'processed',
          message: 'Ingrediente culinario procesado',
          impact: 'Buena opción con procesamiento mínimo'
        };
        analysis.scoreAdjustment += 5;
        break;
      case 3:
        analysis.analysis.processing = {
          level: 'processed',
          message: 'Alimento procesado',
          impact: 'Consumir con moderación'
        };
        analysis.scoreAdjustment -= 5;
        break;
      case 4:
        analysis.analysis.processing = {
          level: 'ultra-processed',
          message: 'Producto ultraprocesado',
          impact: 'Limitar su consumo en una dieta saludable'
        };
        analysis.scoreAdjustment -= 15;
        break;
    }

    // Análisis Nutri-Score
    if (product.scores.nutriscore) {
      switch (product.scores.nutriscore.grade) {
        case 'A':
          analysis.scoreAdjustment += 15;
          break;
        case 'B':
          analysis.scoreAdjustment += 10;
          break;
        case 'C':
          analysis.scoreAdjustment += 0;
          break;
        case 'D':
          analysis.scoreAdjustment -= 10;
          break;
        case 'E':
          analysis.scoreAdjustment -= 15;
          break;
      }
    }

    return analysis;
  }

  /**
   * Analizar restricciones del usuario
   */
  private analyzeRestrictions(product: NutritionalAnalysis, userProfile: any) {
    const analysis = {
      scoreAdjustment: 0,
      warnings: [] as string[],
      analysis: {
        allergies: {
          safe: true,
          warnings: [] as string[]
        },
        conditions: {
          compatible: true,
          concerns: [] as string[]
        }
      }
    };

    // Verificar alergias
    const userAllergies = userProfile.allergies || [];
    const productAllergens = product.allergens || [];
    
    for (const allergy of userAllergies) {
      const allergyName = typeof allergy === 'string' ? allergy : allergy.name;
      const hasAllergen = productAllergens.some(allergen => 
        allergen.toLowerCase().includes(allergyName.toLowerCase())
      );
      
      if (hasAllergen) {
        analysis.analysis.allergies.safe = false;
        analysis.analysis.allergies.warnings.push(`Contiene ${allergyName}`);
        analysis.warnings.push(`⚠️ ALÉRGENO: Contiene ${allergyName}`);
        analysis.scoreAdjustment -= 50; // Penalización severa por alérgenos
      }
    }

    // Verificar condiciones médicas
    const userConditions = userProfile.conditions || [];
    for (const condition of userConditions) {
      const conditionCode = typeof condition === 'string' ? condition : condition.code;
      
      // Análisis específico por condición
      if (conditionCode === 'diabetes' && product.nutritionPer100g.sugar > 15) {
        analysis.analysis.conditions.compatible = false;
        analysis.analysis.conditions.concerns.push('Alto contenido de azúcar');
        analysis.warnings.push('⚠️ Alto contenido de azúcar - revisar con médico');
        analysis.scoreAdjustment -= 20;
      }
      
      if (conditionCode === 'hypertension' && product.nutritionPer100g.sodium > 600) {
        analysis.analysis.conditions.compatible = false;
        analysis.analysis.conditions.concerns.push('Alto contenido de sodio');
        analysis.warnings.push('⚠️ Alto contenido de sodio - no recomendado para hipertensión');
        analysis.scoreAdjustment -= 20;
      }
    }

    return analysis;
  }

  /**
   * Generar sugerencia de porción
   */
  private generatePortionSuggestion(product: NutritionalAnalysis, userProfile: any): string {
    if (product.nutritionPerServing) {
      return `Porción recomendada: ${product.nutritionPerServing.servingSize}`;
    }
    
    // Sugerencia basada en calorías objetivo
    const targetCalories = userProfile.targetCalories || 2000;
    const caloriesPer100g = product.nutritionPer100g.calories;
    
    if (caloriesPer100g > 0) {
      const suggestedGrams = Math.round((targetCalories * 0.1) / caloriesPer100g * 100); // 10% de calorías diarias
      return `Porción sugerida: ${suggestedGrams}g (aproximadamente ${Math.round(caloriesPer100g * suggestedGrams / 100)} calorías)`;
    }
    
    return 'Consulta la etiqueta del producto para la porción recomendada';
  }

  /**
   * Generar alternativas más saludables
   */
  private generateAlternatives(product: NutritionalAnalysis, userProfile: any): string[] {
    const alternatives: string[] = [];
    
    // Alternativas basadas en el tipo de producto
    if (product.productName.toLowerCase().includes('yogurt')) {
      alternatives.push('Yogurt griego natural sin azúcar');
      alternatives.push('Kéfir natural');
    }
    
    if (product.scores.novaGroup === 4) {
      alternatives.push('Versión casera del mismo producto');
      alternatives.push('Alternativas menos procesadas de la misma categoría');
    }
    
    if (product.nutritionPer100g.sugar > 10) {
      alternatives.push('Versión sin azúcar añadido');
      alternatives.push('Endulzar naturalmente con frutas');
    }
    
    return alternatives;
  }

  /**
   * Generar consejos de consumo
   */
  private generateConsumptionTips(product: NutritionalAnalysis, userProfile: any): string[] {
    const tips: string[] = [];
    
    if (product.nutritionPer100g.protein > 15) {
      tips.push('Ideal para consumir post-entrenamiento');
    }
    
    if (product.nutritionPer100g.carbohydrates > 20) {
      tips.push('Mejor consumir en la primera mitad del día');
    }
    
    if (product.scores.novaGroup === 4) {
      tips.push('Consumir ocasionalmente como parte de una dieta balanceada');
    }
    
    if (product.nutritionPer100g.fiber > 5) {
      tips.push('Aumentar consumo de agua al comer este producto');
    }
    
    return tips;
  }
}

export default new OpenFoodFactsService();