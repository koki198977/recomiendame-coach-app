import { OpenFoodFactsProduct } from '../types/openFoodFacts';

/**
 * Servicio de datos mock para testing cuando OpenFoodFacts no está disponible
 */
class MockFoodDataService {
  private mockProducts: { [barcode: string]: OpenFoodFactsProduct } = {
    // Yogurt Protein Soprole
    '7802900001926': {
      code: '7802900001926',
      product: {
        _id: '7802900001926',
        product_name: 'Yogurt Protein Sopr',
        product_name_es: 'Yogurt Protein con Trozos de Frutilla',
        brands: 'Soprole',
        categories: 'es:yogurt, en:yogurts',
        nutriments: {
          'energy-kcal_100g': 74.8,
          'proteins_100g': 6.6,
          'carbohydrates_100g': 8.5,
          'fat_100g': 1.6,
          'saturated-fat_100g': 1.1,
          'sugars_100g': 7.2,
          'fiber_100g': 0,
          'sodium_100g': 50,
          'salt_100g': 0.125,
          'energy-kcal_serving': 116,
          'proteins_serving': 10.23,
          'carbohydrates_serving': 13.175,
          'fat_serving': 2.48,
        },
        nutriscore_grade: 'b',
        nutriscore_score: 67,
        nova_group: 4,
        ecoscore_grade: 'b',
        ecoscore_score: 67,
        ingredients_text_es: 'Leche natural parcialmente descremada, preparado de fruta (15%): (trozos de frutilla (7,5%), agua, sólidos lácteos, maltitol, almidón de maíz modificado, ácido cítrico, lactasa, benzoato de sodio, saborizante idéntico a natural, colorante natural caramelo, sucralosa y colorante natural carmín de cochinilla), sólidos lácteos, gelatina, sorbato de potasio, lactasa, sucralosa, cepas de yoghurt (L bulgaricus y S. thermophilus) y estevia.',
        allergens_tags: ['en:milk'],
        labels_tags: ['en:no-gluten'],
        image_front_url: 'https://images.openfoodfacts.org/images/products/780/290/000/1926/front_fr.23.400.jpg',
        serving_size: '155g',
        serving_quantity: '155',
        quantity: '155 gramos',
        countries: 'Chile',
        countries_tags: ['en:chile'],
        completeness: 0.675,
        data_quality_tags: []
      },
      status: 1,
      status_verbose: 'product found'
    },

    // Coca-Cola (ejemplo de producto no recomendado)
    '7411001889090': {
      code: '7411001889090',
      product: {
        _id: '7411001889090',
        product_name: 'Coca-Cola Original',
        product_name_es: 'Coca-Cola Sabor Original',
        brands: 'Coca-Cola',
        categories: 'en:beverages, en:carbonated-drinks, en:sodas',
        nutriments: {
          'energy-kcal_100g': 42,
          'proteins_100g': 0,
          'carbohydrates_100g': 10.6,
          'fat_100g': 0,
          'saturated-fat_100g': 0,
          'sugars_100g': 10.6,
          'fiber_100g': 0,
          'sodium_100g': 10,
          'salt_100g': 0.025,
        },
        nutriscore_grade: 'e',
        nutriscore_score: 15,
        nova_group: 4,
        ecoscore_grade: 'd',
        ecoscore_score: 35,
        ingredients_text_es: 'Agua carbonatada, azúcar, colorante caramelo IV, acidulante ácido fosfórico, aromas naturales, cafeína.',
        allergens_tags: [],
        labels_tags: [],
        image_front_url: 'https://images.openfoodfacts.org/images/products/741/100/188/9090/front_es.jpg',
        serving_size: '355ml',
        serving_quantity: '355',
        quantity: '355 ml',
        countries: 'Chile',
        countries_tags: ['en:chile'],
        completeness: 0.8,
        data_quality_tags: []
      },
      status: 1,
      status_verbose: 'product found'
    },

    // Avena Quaker (ejemplo de producto saludable)
    '7501030400016': {
      code: '7501030400016',
      product: {
        _id: '7501030400016',
        product_name: 'Avena Quaker',
        product_name_es: 'Avena Instantánea Quaker',
        brands: 'Quaker',
        categories: 'en:cereals, en:breakfast-cereals, en:oats',
        nutriments: {
          'energy-kcal_100g': 380,
          'proteins_100g': 13.4,
          'carbohydrates_100g': 58,
          'fat_100g': 8.2,
          'saturated-fat_100g': 1.5,
          'sugars_100g': 1,
          'fiber_100g': 10,
          'sodium_100g': 5,
          'salt_100g': 0.0125,
        },
        nutriscore_grade: 'a',
        nutriscore_score: 85,
        nova_group: 1,
        ecoscore_grade: 'a',
        ecoscore_score: 90,
        ingredients_text_es: 'Avena integral.',
        allergens_tags: ['en:gluten'],
        labels_tags: ['en:whole-grain'],
        image_front_url: 'https://images.openfoodfacts.org/images/products/750/103/040/0016/front_es.jpg',
        serving_size: '40g',
        serving_quantity: '40',
        quantity: '500g',
        countries: 'Chile',
        countries_tags: ['en:chile'],
        completeness: 0.9,
        data_quality_tags: []
      },
      status: 1,
      status_verbose: 'product found'
    },

    // Pan integral (otro ejemplo saludable)
    '7802800000123': {
      code: '7802800000123',
      product: {
        _id: '7802800000123',
        product_name: 'Pan Integral',
        product_name_es: 'Pan Integral Artesano',
        brands: 'Bimbo',
        categories: 'en:breads, en:whole-grain-breads',
        nutriments: {
          'energy-kcal_100g': 250,
          'proteins_100g': 8.5,
          'carbohydrates_100g': 45,
          'fat_100g': 4.2,
          'saturated-fat_100g': 0.8,
          'sugars_100g': 3.5,
          'fiber_100g': 6.5,
          'sodium_100g': 450,
          'salt_100g': 1.125,
        },
        nutriscore_grade: 'b',
        nutriscore_score: 70,
        nova_group: 2,
        ecoscore_grade: 'b',
        ecoscore_score: 75,
        ingredients_text_es: 'Harina integral de trigo, agua, levadura, sal, azúcar, aceite vegetal.',
        allergens_tags: ['en:gluten'],
        labels_tags: ['en:whole-grain'],
        image_front_url: 'https://images.openfoodfacts.org/images/products/780/280/000/0123/front_es.jpg',
        serving_size: '30g',
        serving_quantity: '30',
        quantity: '500g',
        countries: 'Chile',
        countries_tags: ['en:chile'],
        completeness: 0.85,
        data_quality_tags: []
      },
      status: 1,
      status_verbose: 'product found'
    }
  };

  /**
   * Obtener producto mock por código de barras
   */
  async getMockProduct(barcode: string): Promise<OpenFoodFactsProduct | null> {
    console.log(`🎭 Usando datos mock para código: ${barcode}`);
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const product = this.mockProducts[barcode];
    if (product) {
      console.log('✅ Producto mock encontrado:', product.product.product_name);
      return product;
    } else {
      console.log('❌ Producto mock no encontrado');
      return null;
    }
  }

  /**
   * Obtener lista de productos disponibles para demo
   */
  getAvailableProducts(): Array<{ barcode: string; name: string; description: string }> {
    return [
      {
        barcode: '7802900001926',
        name: 'Yogurt Protein Soprole',
        description: 'Yogurt con proteína y trozos de frutilla - Producto saludable'
      },
      {
        barcode: '7411001889090',
        name: 'Coca-Cola Original',
        description: 'Bebida gaseosa azucarada - No recomendado'
      },
      {
        barcode: '7501030400016',
        name: 'Avena Quaker',
        description: 'Avena instantánea - Muy saludable'
      },
      {
        barcode: '7802800000123',
        name: 'Pan Integral',
        description: 'Pan integral artesano - Buena opción'
      }
    ];
  }

  /**
   * Verificar si un código de barras tiene datos mock disponibles
   */
  hasMockData(barcode: string): boolean {
    return barcode in this.mockProducts;
  }
}

export default new MockFoodDataService();