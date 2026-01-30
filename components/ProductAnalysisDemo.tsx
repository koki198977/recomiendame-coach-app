import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import nutritionAnalysisService from '../services/nutritionAnalysisService';
import { NutritionalAnalysis } from '../types/openFoodFacts';
import { UserProfile } from '../types/nutrition';

interface ProductAnalysisDemoProps {
  userProfile?: UserProfile;
}

export default function ProductAnalysisDemo({ userProfile }: ProductAnalysisDemoProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<NutritionalAnalysis | null>(null);

  // Productos de ejemplo para demostrar la funcionalidad
  const demoProducts = [
    {
      name: 'Yogurt Protein Soprole',
      barcode: '7802900001926',
      description: 'Yogurt con proteína y trozos de frutilla'
    },
    {
      name: 'Coca-Cola Original',
      barcode: '7411001889090',
      description: 'Bebida gaseosa azucarada'
    },
    {
      name: 'Avena Quaker',
      barcode: '7501030400016',
      description: 'Avena instantánea'
    }
  ];

  const analyzeProduct = async (barcode: string, productName: string) => {
    setIsAnalyzing(true);
    
    try {
      console.log(`🔍 Analizando ${productName}...`);
      
      const result = await nutritionAnalysisService.analyzeScannedProduct(
        barcode,
        userProfile,
        {
          // Contexto simulado
          dailyProgress: {
            caloriesConsumed: 800,
            caloriesTarget: 2000,
          },
          recentMeals: [
            { title: 'Desayuno con avena', kcal: 350 },
            { title: 'Snack de frutas', kcal: 150 }
          ]
        }
      );

      if (result.success && result.product) {
        setLastAnalysis(result.product);
        
        const analysis = result.product.personalizedAnalysis;
        const chapiAnalysis = result.chapiAnalysis;
        
        let message = `✅ Análisis completado para ${productName}\n\n`;
        
        if (analysis) {
          message += `📊 Calificación: ${analysis.overallRating} (${analysis.overallScore}/100)\n\n`;
          
          if (analysis.recommendations.warnings?.length) {
            message += `⚠️ Advertencias:\n${analysis.recommendations.warnings.join('\n')}\n\n`;
          }
          
          if (analysis.recommendations.consumptionTips?.length) {
            message += `💡 Consejos:\n${analysis.recommendations.consumptionTips.join('\n')}\n\n`;
          }
        }
        
        if (chapiAnalysis) {
          message += `🤖 Análisis de Chapi:\n${chapiAnalysis.summary}\n\n`;
          message += `Recomendación: ${chapiAnalysis.recommendation}\n`;
          message += `Puntuación: ${chapiAnalysis.score}/100`;
        }
        
        Alert.alert('Análisis Completado', message);
      } else {
        Alert.alert('Error', result.error || 'No se pudo analizar el producto');
      }
    } catch (error) {
      console.error('Error en demo:', error);
      Alert.alert('Error', 'Hubo un problema al analizar el producto');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRatingColor = (rating?: string) => {
    switch (rating) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'moderate': return '#FF9800';
      case 'poor': return '#FF5722';
      case 'avoid': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="flask" size={24} color="#007AFF" />
        <Text style={styles.title}>Demo: Análisis Nutricional</Text>
      </View>
      
      <Text style={styles.description}>
        Prueba el análisis nutricional con estos productos de ejemplo:
      </Text>

      <ScrollView style={styles.productsContainer} showsVerticalScrollIndicator={false}>
        {demoProducts.map((product, index) => (
          <TouchableOpacity
            key={index}
            style={styles.productCard}
            onPress={() => analyzeProduct(product.barcode, product.name)}
            disabled={isAnalyzing}
          >
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productDescription}>{product.description}</Text>
              <Text style={styles.productBarcode}>Código: {product.barcode}</Text>
            </View>
            <View style={styles.analyzeButton}>
              {isAnalyzing ? (
                <Ionicons name="hourglass" size={20} color="#666" />
              ) : (
                <Ionicons name="search" size={20} color="#007AFF" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {lastAnalysis && (
        <View style={styles.lastAnalysisContainer}>
          <Text style={styles.lastAnalysisTitle}>Último análisis:</Text>
          <View style={styles.lastAnalysisCard}>
            <Text style={styles.lastAnalysisName} numberOfLines={1}>
              {lastAnalysis.productName}
            </Text>
            {lastAnalysis.personalizedAnalysis && (
              <View style={[
                styles.ratingBadge,
                { backgroundColor: getRatingColor(lastAnalysis.personalizedAnalysis.overallRating) }
              ]}>
                <Text style={styles.ratingText}>
                  {lastAnalysis.personalizedAnalysis.overallScore}/100
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Ionicons name="information-circle" size={16} color="#666" />
        <Text style={styles.infoText}>
          El análisis considera tu perfil, objetivos y progreso actual
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  productsContainer: {
    maxHeight: 200,
    marginBottom: 16,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  productBarcode: {
    fontSize: 12,
    color: '#999',
  },
  analyzeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastAnalysisContainer: {
    marginBottom: 16,
  },
  lastAnalysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  lastAnalysisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
  },
  lastAnalysisName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    lineHeight: 16,
  },
});