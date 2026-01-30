import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NutritionalAnalysis } from '../types/openFoodFacts';
import { LogMealRequest } from '../types/nutrition';
import { NutritionService } from '../services/nutritionService';

interface ProductToMealModalProps {
  visible: boolean;
  onClose: () => void;
  product: NutritionalAnalysis | null;
  onMealLogged?: (meal: LogMealRequest) => void;
}

export default function ProductToMealModal({
  visible,
  onClose,
  product,
  onMealLogged
}: ProductToMealModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('SNACK');
  const [portion, setPortion] = useState('100');
  const [isLogging, setIsLogging] = useState(false);

  const mealSlots = [
    { key: 'BREAKFAST' as const, label: 'Desayuno', icon: 'sunny' },
    { key: 'LUNCH' as const, label: 'Almuerzo', icon: 'restaurant' },
    { key: 'DINNER' as const, label: 'Cena', icon: 'moon' },
    { key: 'SNACK' as const, label: 'Snack', icon: 'cafe' },
  ];

  const calculateNutrition = () => {
    if (!product) return null;
    
    const portionMultiplier = parseFloat(portion) / 100;
    const nutrition = product.nutritionPer100g;
    
    return {
      calories: Math.round(nutrition.calories * portionMultiplier),
      protein: Math.round(nutrition.protein * portionMultiplier), // Redondear a entero
      carbs: Math.round(nutrition.carbohydrates * portionMultiplier), // Redondear a entero
      fat: Math.round(nutrition.fat * portionMultiplier), // Redondear a entero
    };
  };

  const handleLogMeal = async () => {
    if (!product) return;
    
    const calculatedNutrition = calculateNutrition();
    if (!calculatedNutrition) return;

    setIsLogging(true);

    try {
      const mealRequest: LogMealRequest = {
        slot: selectedSlot,
        title: `${product.productName} (${portion}g)`,
        kcal: calculatedNutrition.calories,
        protein_g: calculatedNutrition.protein,
        carbs_g: calculatedNutrition.carbs,
        fat_g: calculatedNutrition.fat,
        imageUrl: product.imageUrl,
      };

      console.log('🍽️ Enviando datos de comida:', mealRequest);

      const response = await NutritionService.logMeal(mealRequest);
      
      if (response) {
        // Ejecutar callback inmediatamente sin Alert
        onMealLogged?.(mealRequest);
      }
    } catch (error: any) {
      console.error('Error logging meal:', error);
      
      let errorMessage = 'No se pudo registrar la comida. Intenta de nuevo.';
      
      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = `Error de validación:\n${error.response.data.message.join('\n')}`;
        } else {
          errorMessage = error.response.data.message;
        }
      }
      
      console.error('Error al registrar comida:', errorMessage);
    } finally {
      setIsLogging(false);
    }
  };

  const resetModal = () => {
    setSelectedSlot('SNACK');
    setPortion('100');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!product) return null;

  const calculatedNutrition = calculateNutrition();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Agregar a Comida</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Información del producto */}
          <View style={styles.productCard}>
            <View style={styles.productHeader}>
              <Text style={styles.productName}>{product.productName}</Text>
              {product.brand && (
                <Text style={styles.productBrand}>{product.brand}</Text>
              )}
            </View>
            
            {/* Rating del producto */}
            {product.personalizedAnalysis && (
              <View style={styles.ratingContainer}>
                <View style={[
                  styles.ratingBadge,
                  { backgroundColor: getRatingColor(product.personalizedAnalysis.overallRating) }
                ]}>
                  <Text style={styles.ratingText}>
                    {getRatingText(product.personalizedAnalysis.overallRating)}
                  </Text>
                </View>
                <Text style={styles.ratingScore}>
                  {product.personalizedAnalysis.overallScore}/100
                </Text>
              </View>
            )}
          </View>

          {/* Selección de comida */}
          <View style={styles.mealSelectionCard}>
            <Text style={styles.sectionTitle}>¿A qué comida quieres agregarlo?</Text>
            <View style={styles.mealSlotsContainer}>
              {mealSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.key}
                  style={[
                    styles.mealSlot,
                    selectedSlot === slot.key && styles.mealSlotSelected
                  ]}
                  onPress={() => setSelectedSlot(slot.key)}
                >
                  <Ionicons 
                    name={slot.icon as any} 
                    size={24} 
                    color={selectedSlot === slot.key ? 'white' : '#666'} 
                  />
                  <Text style={[
                    styles.mealSlotText,
                    selectedSlot === slot.key && styles.mealSlotTextSelected
                  ]}>
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Selección de porción */}
          <View style={styles.portionCard}>
            <Text style={styles.sectionTitle}>Porción consumida</Text>
            <View style={styles.portionInputContainer}>
              <TextInput
                style={styles.portionInput}
                value={portion}
                onChangeText={setPortion}
                keyboardType="numeric"
                placeholder="100"
              />
              <Text style={styles.portionUnit}>gramos</Text>
            </View>
            
            {/* Información nutricional calculada */}
            {calculatedNutrition && (
              <View style={styles.calculatedNutrition}>
                <Text style={styles.calculatedTitle}>Información nutricional:</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{calculatedNutrition.calories}</Text>
                    <Text style={styles.nutritionLabel}>kcal</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{calculatedNutrition.protein}g</Text>
                    <Text style={styles.nutritionLabel}>Proteína</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{calculatedNutrition.carbs}g</Text>
                    <Text style={styles.nutritionLabel}>Carbos</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{calculatedNutrition.fat}g</Text>
                    <Text style={styles.nutritionLabel}>Grasas</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Recomendaciones del análisis */}
          {product.personalizedAnalysis?.recommendations.consumptionTips && (
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>💡 Consejos de consumo</Text>
              {product.personalizedAnalysis.recommendations.consumptionTips.map((tip, index) => (
                <Text key={index} style={styles.tipText}>• {tip}</Text>
              ))}
            </View>
          )}

          {/* Advertencias */}
          {product.personalizedAnalysis?.recommendations.warnings && 
           product.personalizedAnalysis.recommendations.warnings.length > 0 && (
            <View style={styles.warningsCard}>
              <Text style={styles.warningsTitle}>⚠️ Advertencias</Text>
              {product.personalizedAnalysis.recommendations.warnings.map((warning, index) => (
                <Text key={index} style={styles.warningText}>{warning}</Text>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Botón de acción */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.logButton, isLogging && styles.logButtonDisabled]}
            onPress={handleLogMeal}
            disabled={isLogging || !calculatedNutrition}
          >
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.logButtonGradient}
            >
              {isLogging ? (
                <Text style={styles.logButtonText}>Registrando...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.logButtonText}>
                    Registrar en {mealSlots.find(s => s.key === selectedSlot)?.label}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getRatingColor = (rating: string) => {
  switch (rating) {
    case 'excellent': return '#4CAF50';
    case 'good': return '#8BC34A';
    case 'moderate': return '#FF9800';
    case 'poor': return '#FF5722';
    case 'avoid': return '#F44336';
    default: return '#9E9E9E';
  }
};

const getRatingText = (rating: string) => {
  switch (rating) {
    case 'excellent': return 'Excelente';
    case 'good': return 'Bueno';
    case 'moderate': return 'Moderado';
    case 'poor': return 'Pobre';
    case 'avoid': return 'Evitar';
    default: return 'Sin calificar';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  productHeader: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  mealSelectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  mealSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mealSlot: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mealSlotSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  mealSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 8,
  },
  mealSlotTextSelected: {
    color: 'white',
  },
  portionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  portionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  portionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  portionUnit: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  calculatedNutrition: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
  },
  calculatedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tipsCard: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#2e7d32',
    lineHeight: 20,
    marginBottom: 4,
  },
  warningsCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  logButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  logButtonDisabled: {
    opacity: 0.6,
  },
  logButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  logButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});