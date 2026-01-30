// Tipos para la integración con OpenFoodFacts API

export interface OpenFoodFactsProduct {
  code: string;
  product: {
    _id: string;
    product_name?: string;
    product_name_en?: string;
    product_name_es?: string;
    brands?: string;
    categories?: string;
    categories_tags?: string[];
    
    // Información nutricional
    nutriments?: {
      'energy-kcal'?: number;
      'energy-kcal_100g'?: number;
      'energy-kcal_serving'?: number;
      'proteins'?: number;
      'proteins_100g'?: number;
      'proteins_serving'?: number;
      'carbohydrates'?: number;
      'carbohydrates_100g'?: number;
      'carbohydrates_serving'?: number;
      'fat'?: number;
      'fat_100g'?: number;
      'fat_serving'?: number;
      'saturated-fat'?: number;
      'saturated-fat_100g'?: number;
      'sugars'?: number;
      'sugars_100g'?: number;
      'fiber'?: number;
      'fiber_100g'?: number;
      'sodium'?: number;
      'sodium_100g'?: number;
      'salt'?: number;
      'salt_100g'?: number;
    };
    
    // Información de calidad nutricional
    nutriscore_grade?: string;
    nutriscore_score?: number;
    nova_group?: number;
    ecoscore_grade?: string;
    ecoscore_score?: number;
    
    // Ingredientes y alérgenos
    ingredients_text?: string;
    ingredients_text_es?: string;
    allergens?: string;
    allergens_tags?: string[];
    
    // Imágenes
    image_url?: string;
    image_front_url?: string;
    image_front_small_url?: string;
    image_nutrition_url?: string;
    
    // Información adicional
    serving_size?: string;
    serving_quantity?: string;
    quantity?: string;
    packaging?: string;
    labels?: string;
    labels_tags?: string[];
    
    // Información de origen
    countries?: string;
    countries_tags?: string[];
    manufacturing_places?: string;
    
    // Completitud de datos
    completeness?: number;
    data_quality_tags?: string[];
  };
  status: number;
  status_verbose: string;
}

export interface NutritionalAnalysis {
  // Información básica del producto
  productName: string;
  brand?: string;
  barcode: string;
  
  // Valores nutricionales por 100g
  nutritionPer100g: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    saturatedFat: number;
    sugar: number;
    fiber: number;
    sodium: number;
    salt: number;
  };
  
  // Valores por porción (si está disponible)
  nutritionPerServing?: {
    servingSize: string;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    saturatedFat: number;
    sugar: number;
    fiber: number;
    sodium: number;
    salt: number;
  };
  
  // Calificaciones de calidad
  scores: {
    nutriscore?: {
      grade: string; // A, B, C, D, E
      score?: number;
    };
    novaGroup?: number; // 1-4 (nivel de procesamiento)
    ecoscore?: {
      grade: string; // A, B, C, D, E
      score?: number;
    };
  };
  
  // Información adicional
  ingredients?: string;
  allergens?: string[];
  labels?: string[];
  imageUrl?: string;
  
  // Análisis personalizado basado en el perfil del usuario
  personalizedAnalysis?: PersonalizedNutritionAnalysis;
}

export interface PersonalizedNutritionAnalysis {
  // Evaluación general
  overallRating: 'excellent' | 'good' | 'moderate' | 'poor' | 'avoid';
  overallScore: number; // 0-100
  
  // Análisis específico
  analysis: {
    // Compatibilidad con objetivos
    goalCompatibility: {
      score: number; // 0-100
      reasons: string[];
      recommendations: string[];
    };
    
    // Análisis de macronutrientes
    macroAnalysis: {
      protein: {
        rating: 'high' | 'adequate' | 'low';
        message: string;
      };
      carbs: {
        rating: 'high' | 'adequate' | 'low';
        message: string;
      };
      fat: {
        rating: 'high' | 'adequate' | 'low';
        message: string;
      };
    };
    
    // Análisis de calidad
    qualityAnalysis: {
      processing: {
        level: 'minimal' | 'processed' | 'ultra-processed';
        message: string;
        impact: string;
      };
      additives: {
        count: number;
        concerns: string[];
      };
    };
    
    // Compatibilidad con restricciones
    restrictions: {
      allergies: {
        safe: boolean;
        warnings: string[];
      };
      conditions: {
        compatible: boolean;
        concerns: string[];
      };
    };
  };
  
  // Recomendaciones específicas
  recommendations: {
    portionSuggestion?: string;
    alternatives?: string[];
    consumptionTips?: string[];
    warnings?: string[];
  };
  
  // Contexto del análisis
  analysisContext: {
    userGoal: string;
    userRestrictions: string[];
    analysisDate: string;
  };
}

export interface ProductScanRequest {
  barcode: string;
  userProfile?: {
    nutritionGoal?: string;
    allergies?: string[];
    conditions?: string[];
    targetCalories?: number;
  };
}

export interface ProductScanResponse {
  success: boolean;
  product?: NutritionalAnalysis;
  error?: string;
  suggestions?: {
    searchTerms?: string[];
    similarProducts?: string[];
  };
}

// Tipos para el análisis de Chapi sobre productos
export interface ChapiProductAnalysisRequest {
  product: NutritionalAnalysis;
  userContext: {
    currentPlan?: any;
    recentMeals?: any[];
    dailyProgress?: any;
    goals?: any;
  };
}

export interface ChapiProductAnalysisResponse {
  recommendation: 'highly_recommended' | 'recommended' | 'moderate' | 'not_recommended' | 'avoid';
  score: number; // 0-100
  summary: string;
  
  analysis: {
    pros: string[];
    cons: string[];
    fitWithPlan: string;
    portionAdvice: string;
    timingAdvice?: string;
  };
  
  alternatives?: {
    betterOptions: string[];
    whyBetter: string[];
  };
  
  actionSuggestions: {
    immediate: string[];
    longTerm: string[];
  };
}

// Tipos para búsqueda de productos
export interface ProductSearchRequest {
  query: string;
  limit?: number;
  page?: number;
  categories?: string[];
  brands?: string[];
}

export interface ProductSearchResult {
  code: string;
  product_name: string;
  brands?: string;
  image_url?: string;
  nutriscore_grade?: string;
  nova_group?: number;
}

export interface ProductSearchResponse {
  products: ProductSearchResult[];
  count: number;
  page: number;
  page_count: number;
}