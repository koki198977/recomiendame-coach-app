import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import SimpleBarcodeScanner from './SimpleBarcodeScanner';
import ProductToMealModal from './ProductToMealModal';
import openFoodFactsService from '../services/openFoodFactsService';
import chapiService from '../services/chapiService';
import { NutritionService } from '../services/nutritionService';
import { SocialService } from '../services/socialService';
import { NutritionalAnalysis, PersonalizedNutritionAnalysis } from '../types/openFoodFacts';
import { UserProfile } from '../types/nutrition';

interface ProductScannerModalProps {
  visible: boolean;
  onClose: () => void;
  userProfile?: UserProfile;
  onProductAnalyzed?: (analysis: NutritionalAnalysis) => void;
  onMealAdded?: () => void; // Nuevo callback para refresh
}

export default function ProductScannerModal({
  visible,
  onClose,
  userProfile,
  onProductAnalyzed,
  onMealAdded
}: ProductScannerModalProps) {
  const [barcode, setBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<NutritionalAnalysis | null>(null);
  const [chapiAdvice, setChapiAdvice] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [labelImageUri, setLabelImageUri] = useState<string | null>(null);
  const [labelAnalysis, setLabelAnalysis] = useState<{ kcal: number; protein_g: number; carbs_g: number; fat_g: number; title: string } | null>(null);
  const [labelGrams, setLabelGrams] = useState('100');
  const [isAnalyzingLabel, setIsAnalyzingLabel] = useState(false);

  const scannedRef = React.useRef(false);

  const handleBarcodeFromCamera = async (scannedBarcode: string) => {
    if (scannedRef.current) return; // evitar doble disparo del scanner
    scannedRef.current = true;
    console.log('📷 Código escaneado desde cámara:', scannedBarcode);
    setShowCamera(false);
    setBarcode(scannedBarcode);
    await handleScanProduct(scannedBarcode);
    scannedRef.current = false;
  };

  const handleScanProduct = async (inputBarcode?: string) => {
    const codeToScan = inputBarcode || barcode;
    
    if (!codeToScan.trim()) {
      Alert.alert('Error', 'Por favor ingresa un código de barras válido');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setChapiAdvice('');

    try {
      console.log('🔍 Escaneando producto:', codeToScan);
      
      const response = await openFoodFactsService.analyzeScannedProduct({
        barcode: codeToScan.trim(),
        userProfile: userProfile ? {
          nutritionGoal: userProfile.nutritionGoal,
          allergies: userProfile.allergies?.map(a => typeof a === 'string' ? a : a.name) || [],
          conditions: userProfile.conditions?.map(c => typeof c === 'string' ? c : c.code) || [],
          targetCalories: 2000 // Esto debería venir del perfil o plan actual
        } : undefined
      });

      if (response.success && response.product) {
        setAnalysis(response.product);
        
        // Obtener consejo personalizado de Chapi
        if (response.product.personalizedAnalysis) {
          await getChapiAdvice(response.product);
        }
        
        onProductAnalyzed?.(response.product);
      } else {
        Alert.alert(
          'Producto no encontrado',
          response.error || 'No se pudo encontrar información sobre este producto.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Intentar otro', onPress: () => setBarcode('') },
            { text: 'Fotografiar etiqueta', onPress: () => setShowManualForm(true) },
          ]
        );
      }
    } catch (error) {
      console.error('Error escaneando producto:', error);
      Alert.alert('Error', 'Hubo un problema al escanear el producto. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const getChapiAdvice = async (product: NutritionalAnalysis) => {
    try {
      const personalizedAnalysis = product.personalizedAnalysis;
      if (!personalizedAnalysis) return;

      const message = `He escaneado un producto: ${product.productName} de ${product.brand || 'marca desconocida'}. 
      
Información nutricional por 100g:
- Calorías: ${product.nutritionPer100g.calories}
- Proteína: ${product.nutritionPer100g.protein}g
- Carbohidratos: ${product.nutritionPer100g.carbohydrates}g
- Grasas: ${product.nutritionPer100g.fat}g
- Azúcar: ${product.nutritionPer100g.sugar}g

Calificación Nutri-Score: ${product.scores.nutriscore?.grade || 'No disponible'}
Nivel de procesamiento NOVA: ${product.scores.novaGroup || 'No disponible'}

Mi análisis automático dice que es: ${personalizedAnalysis.overallRating} (${personalizedAnalysis.overallScore}/100)

¿Qué opinas de este producto para mi plan de alimentación? ¿Cómo debería incluirlo en mi dieta?`;

      const response = await chapiService.sendMessage(message);
      
      if (response.success && response.data.response.message) {
        setChapiAdvice(response.data.response.message);
      }
    } catch (error) {
      console.error('Error obteniendo consejo de Chapi:', error);
    }
  };

  const getRatingColor = (rating: PersonalizedNutritionAnalysis['overallRating']) => {
    switch (rating) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'moderate': return '#FF9800';
      case 'poor': return '#FF5722';
      case 'avoid': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getRatingText = (rating: PersonalizedNutritionAnalysis['overallRating']) => {
    switch (rating) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Bueno';
      case 'moderate': return 'Moderado';
      case 'poor': return 'Pobre';
      case 'avoid': return 'Evitar';
      default: return 'Sin calificar';
    }
  };

  const handleTakeLabelPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setLabelImageUri(result.assets[0].uri);
      setLabelAnalysis(null);
    }
  };

  const handleAnalyzeLabel = async () => {
    if (!labelImageUri) return;
    setIsAnalyzingLabel(true);
    try {
      const uploaded = await SocialService.uploadImage(labelImageUri);
      const result = await NutritionService.analyzeMeal(uploaded.url, 'tabla nutricional de producto');
      setLabelAnalysis(result);
    } catch (error) {
      Alert.alert('Error', 'No se pudo analizar la imagen. Intenta de nuevo.');
    } finally {
      setIsAnalyzingLabel(false);
    }
  };

  const handleAddLabelToMeal = async () => {
    if (!labelAnalysis) return;
    const grams = parseFloat(labelGrams) || 100;
    const factor = grams / 100;
    // Construir NutritionalAnalysis a partir del análisis de la etiqueta
    const product: NutritionalAnalysis = {
      productName: labelAnalysis.title || 'Producto escaneado',
      barcode: barcode.trim() || 'LABEL',
      nutritionPer100g: {
        calories: Math.round(labelAnalysis.kcal / factor),
        protein: Math.round((labelAnalysis.protein_g / factor) * 10) / 10,
        carbohydrates: Math.round((labelAnalysis.carbs_g / factor) * 10) / 10,
        fat: Math.round((labelAnalysis.fat_g / factor) * 10) / 10,
        saturatedFat: 0,
        sugar: 0,
        fiber: 0,
        sodium: 0,
        salt: 0,
      },
      scores: {},
    };

    // Guardar en backend para futuras consultas
    try {
      const backendApi = (await import('../services/api')).default;
      const { API_CONFIG } = await import('../config/api');
      await backendApi.post(API_CONFIG.ENDPOINTS.NUTRITION_ANALYSIS.SUBMIT_PRODUCT, {
        barcode: product.barcode,
        productName: product.productName,
        nutritionPer100g: product.nutritionPer100g,
        scores: product.scores,
      });
      console.log('✅ Producto de etiqueta guardado en NutritionProduct');
    } catch (saveError: any) {
      // 409 = ya existe, ignorar silenciosamente
      if (saveError?.response?.status !== 409) {
        console.warn('⚠️ No se pudo guardar producto en backend:', saveError);
      }
    }

    setShowManualForm(false);
    setAnalysis(product);
    onProductAnalyzed?.(product);
  };

  const resetModal = () => {
    setBarcode('');
    setAnalysis(null);
    setChapiAdvice('');
    setShowCamera(false);
    setShowMealModal(false);
    setShowManualForm(false);
    setLabelImageUri(null);
    setLabelAnalysis(null);
    setLabelGrams('100');
    scannedRef.current = false;
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      {showCamera ? (
        <SimpleBarcodeScanner
          onBarcodeScanned={handleBarcodeFromCamera}
          onClose={() => setShowCamera(false)}
          isActive={showCamera}
        />
      ) : (
        <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Escanear Producto</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {!analysis ? (
            <View style={styles.scanSection}>
              {showManualForm ? (
                <View style={styles.manualFormSection}>
                  <Text style={styles.manualFormTitle}>Fotografiar etiqueta nutricional</Text>
                  <Text style={styles.manualFormSubtitle}>
                    Saca una foto a la tabla nutricional del producto y Chapi extraerá los datos automáticamente
                  </Text>

                  {/* Foto de la etiqueta */}
                  <TouchableOpacity style={styles.photoPickerButton} onPress={handleTakeLabelPhoto}>
                    {labelImageUri ? (
                      <Image source={{ uri: labelImageUri }} style={styles.labelPhotoPreview} resizeMode="cover" />
                    ) : (
                      <View style={styles.photoPickerPlaceholder}>
                        <Ionicons name="camera" size={40} color="#667eea" />
                        <Text style={styles.photoPickerText}>Tomar foto de la etiqueta</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Botón analizar */}
                  {labelImageUri && !labelAnalysis && (
                    <TouchableOpacity
                      style={[styles.primaryCameraButton, isAnalyzingLabel && styles.scanButtonDisabled]}
                      onPress={handleAnalyzeLabel}
                      disabled={isAnalyzingLabel}
                    >
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.primaryCameraButtonGradient}
                      >
                        {isAnalyzingLabel ? (
                          <>
                            <ActivityIndicator color="white" />
                            <Text style={styles.primaryCameraButtonText}>Analizando...</Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="sparkles" size={22} color="white" />
                            <Text style={styles.primaryCameraButtonText}>Analizar con Chapi</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {/* Resultado del análisis */}
                  {labelAnalysis && (
                    <View style={styles.labelResultCard}>
                      <Text style={styles.labelResultTitle}>{labelAnalysis.title}</Text>
                      <View style={styles.manualRow}>
                        <View style={styles.labelMacroItem}>
                          <Text style={styles.labelMacroValue}>{labelAnalysis.kcal}</Text>
                          <Text style={styles.labelMacroLabel}>kcal</Text>
                        </View>
                        <View style={styles.labelMacroItem}>
                          <Text style={styles.labelMacroValue}>{labelAnalysis.protein_g}g</Text>
                          <Text style={styles.labelMacroLabel}>Proteína</Text>
                        </View>
                        <View style={styles.labelMacroItem}>
                          <Text style={styles.labelMacroValue}>{labelAnalysis.carbs_g}g</Text>
                          <Text style={styles.labelMacroLabel}>Carbos</Text>
                        </View>
                        <View style={styles.labelMacroItem}>
                          <Text style={styles.labelMacroValue}>{labelAnalysis.fat_g}g</Text>
                          <Text style={styles.labelMacroLabel}>Grasas</Text>
                        </View>
                      </View>

                      <View style={styles.manualInputGroup}>
                        <Text style={styles.manualInputLabel}>¿Cuántos gramos vas a consumir?</Text>
                        <TextInput
                          style={styles.manualInput}
                          value={labelGrams}
                          onChangeText={setLabelGrams}
                          keyboardType="numeric"
                          placeholderTextColor="#999"
                        />
                      </View>

                      <TouchableOpacity
                        style={styles.primaryCameraButton}
                        onPress={handleAddLabelToMeal}
                      >
                        <LinearGradient
                          colors={['#667eea', '#764ba2']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.primaryCameraButtonGradient}
                        >
                          <Ionicons name="restaurant" size={22} color="white" />
                          <Text style={styles.primaryCameraButtonText}>Agregar a comida</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity style={styles.scanAnotherButton} onPress={() => setShowManualForm(false)}>
                    <Ionicons name="arrow-back" size={18} color="#007AFF" />
                    <Text style={styles.scanAnotherText}>Volver</Text>
                  </TouchableOpacity>
                </View>
              ) : (
              <>
              <View style={styles.chapiContainer}>
                <Image 
                  source={require('../assets/chapi-3d-onboarding.png')}
                  style={styles.chapiImage}
                  resizeMode="contain"
                />
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.scanIconContainer}
                >
                  <Ionicons name="camera" size={40} color="white" />
                </LinearGradient>
              </View>
              
              <Text style={styles.scanTitle}>Escanear código de barras</Text>
              <Text style={styles.scanDescription}>
                Chapi te ayudará a obtener un análisis nutricional personalizado
              </Text>

              {/* Botón principal de cámara */}
              <TouchableOpacity 
                style={styles.primaryCameraButton} 
                onPress={() => setShowCamera(true)}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryCameraButtonGradient}
                >
                  <Ionicons name="camera" size={24} color="white" />
                  <Text style={styles.primaryCameraButtonText}>Escanear con cámara</Text>
                </LinearGradient>

              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.orText}>o</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Input manual del código como opción secundaria */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="barcode" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.barcodeInput}
                    placeholder="Ingresar código manualmente"
                    value={barcode}
                    onChangeText={setBarcode}
                    keyboardType="numeric"
                    autoCapitalize="none"
                    placeholderTextColor="#999"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.scanButton, isLoading && styles.scanButtonDisabled]}
                  onPress={() => handleScanProduct()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#667eea" />
                  ) : (
                    <>
                      <Ionicons name="search" size={20} color="#667eea" />
                      <Text style={styles.secondaryScanButtonText}>Analizar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              </>
              )}
            </View>
          ) : (
            <View style={styles.analysisSection}>
              {/* Información básica del producto */}
              <View style={styles.productCard}>
                {analysis.imageUrl && (
                  <Image source={{ uri: analysis.imageUrl }} style={styles.productImage} />
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{analysis.productName}</Text>
                  {analysis.brand && (
                    <Text style={styles.productBrand}>{analysis.brand}</Text>
                  )}
                  <Text style={styles.productBarcode}>Código: {analysis.barcode}</Text>
                </View>
              </View>

              {/* Análisis personalizado */}
              {analysis.personalizedAnalysis && (
                <View style={styles.personalizedCard}>
                  <View style={styles.ratingHeader}>
                    <Text style={styles.ratingTitle}>Análisis Personalizado</Text>
                    <View style={[
                      styles.ratingBadge,
                      { backgroundColor: getRatingColor(analysis.personalizedAnalysis.overallRating) }
                    ]}>
                      <Text style={styles.ratingText}>
                        {getRatingText(analysis.personalizedAnalysis.overallRating)}
                      </Text>
                      <Text style={styles.ratingScore}>
                        {analysis.personalizedAnalysis.overallScore}/100
                      </Text>
                    </View>
                  </View>

                  {/* Compatibilidad con objetivos */}
                  <View style={styles.analysisItem}>
                    <Text style={styles.analysisTitle}>Compatibilidad con tus objetivos</Text>
                    <Text style={styles.analysisScore}>
                      {analysis.personalizedAnalysis.analysis.goalCompatibility.score}/100
                    </Text>
                    {analysis.personalizedAnalysis.analysis.goalCompatibility.reasons.map((reason, index) => (
                      <Text key={index} style={styles.analysisReason}>• {reason}</Text>
                    ))}
                  </View>

                  {/* Advertencias */}
                  {analysis.personalizedAnalysis.recommendations.warnings && 
                   analysis.personalizedAnalysis.recommendations.warnings.length > 0 && (
                    <View style={styles.warningsContainer}>
                      <Text style={styles.warningsTitle}>⚠️ Advertencias</Text>
                      {analysis.personalizedAnalysis.recommendations.warnings.map((warning, index) => (
                        <Text key={index} style={styles.warningText}>{warning}</Text>
                      ))}
                    </View>
                  )}

                  {/* Recomendaciones */}
                  {analysis.personalizedAnalysis.recommendations.consumptionTips && 
                   analysis.personalizedAnalysis.recommendations.consumptionTips.length > 0 && (
                    <View style={styles.recommendationsContainer}>
                      <Text style={styles.recommendationsTitle}>💡 Recomendaciones</Text>
                      {analysis.personalizedAnalysis.recommendations.consumptionTips.map((tip, index) => (
                        <Text key={index} style={styles.recommendationText}>• {tip}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Información nutricional */}
              <View style={styles.nutritionCard}>
                <Text style={styles.nutritionTitle}>Información Nutricional (por 100g)</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Calorías</Text>
                    <Text style={styles.nutritionValue}>{analysis.nutritionPer100g.calories}</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Proteína</Text>
                    <Text style={styles.nutritionValue}>{analysis.nutritionPer100g.protein}g</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Carbohidratos</Text>
                    <Text style={styles.nutritionValue}>{analysis.nutritionPer100g.carbohydrates}g</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Grasas</Text>
                    <Text style={styles.nutritionValue}>{analysis.nutritionPer100g.fat}g</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Azúcar</Text>
                    <Text style={styles.nutritionValue}>{analysis.nutritionPer100g.sugar}g</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Fibra</Text>
                    <Text style={styles.nutritionValue}>{analysis.nutritionPer100g.fiber}g</Text>
                  </View>
                </View>
              </View>

              {/* Calificaciones */}
              <View style={styles.scoresCard}>
                <Text style={styles.scoresTitle}>Calificaciones de Calidad</Text>
                <View style={styles.scoresGrid}>
                  {analysis.scores.nutriscore && (
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Nutri-Score</Text>
                      <View style={[styles.scoreBadge, { backgroundColor: getRatingColor('good') }]}>
                        <Text style={styles.scoreValue}>{analysis.scores.nutriscore.grade}</Text>
                      </View>
                    </View>
                  )}
                  {analysis.scores.novaGroup && (
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Procesamiento NOVA</Text>
                      <View style={[styles.scoreBadge, { backgroundColor: '#FF9800' }]}>
                        <Text style={styles.scoreValue}>{analysis.scores.novaGroup}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Consejo de Chapi */}
              {chapiAdvice && (
                <View style={styles.chapiCard}>
                  <View style={styles.chapiHeader}>
                    <Ionicons name="chatbubble-ellipses" size={24} color="#007AFF" />
                    <Text style={styles.chapiTitle}>Consejo de Chapi</Text>
                  </View>
                  <Text style={styles.chapiAdvice}>{chapiAdvice}</Text>
                </View>
              )}

              {/* Botón de acción después del análisis */}
              {analysis && (
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryActionButton]}
                    onPress={() => {
                      setShowMealModal(true);
                    }}
                  >
                    <Ionicons name="restaurant" size={20} color="white" />
                    <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>
                      Agregar a Comida
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Botón para escanear otro producto */}
              <TouchableOpacity style={styles.scanAnotherButton} onPress={resetModal}>
                <Ionicons name="barcode-outline" size={20} color="#007AFF" />
                <Text style={styles.scanAnotherText}>Escanear otro producto</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
      )}
      
      <ProductToMealModal
        visible={showMealModal}
        onClose={() => setShowMealModal(false)}
        product={analysis}
        onMealLogged={(meal) => {
          console.log('Comida registrada desde escáner:', meal);
          // Primero ejecutar el callback para refresh del home
          onMealAdded?.();
          // Luego cerrar ambos modales de forma secuencial
          setShowMealModal(false);
          // Usar un pequeño delay para asegurar que el primer modal se cierre
          setTimeout(() => {
            onClose(); // Cerrar el modal principal directamente
          }, 50);
        }}
      />
    </Modal>
  );
}

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
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  headerSpacer: {
    width: 40, // Same width as close button for centering
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40, // Extra padding at bottom to ensure buttons are visible
  },
  scanSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  chapiContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 24,
  },
  chapiImage: {
    width: 120,
    height: 120,
    marginBottom: -20, // Overlap with the barcode icon
  },
  scanIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: 'white',
  },
  scanTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  scanDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  primaryCameraButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 24,
  },
  primaryCameraButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  primaryCameraButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  inputContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: 'white',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 8,
  },
  barcodeInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  secondaryScanButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  orText: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 16,
    fontWeight: '500',
  },
  cameraButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  analysisSection: {
    gap: 16,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
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
    marginBottom: 4,
  },
  productBarcode: {
    fontSize: 12,
    color: '#999',
  },
  personalizedCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  ratingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  ratingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingScore: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  analysisItem: {
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  analysisScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  analysisReason: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  warningsContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
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
    lineHeight: 18,
  },
  recommendationsContainer: {
    backgroundColor: '#d1ecf1',
    padding: 12,
    borderRadius: 8,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0c5460',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#0c5460',
    lineHeight: 18,
    marginBottom: 4,
  },
  nutritionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  nutritionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  scoresCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  scoresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  scoresGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  chapiCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  chapiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chapiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  chapiAdvice: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  scanAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  scanAnotherText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    marginBottom: 20,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  primaryActionButton: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryActionButtonText: {
    color: 'white',
  },
  manualFormSection: {
    width: '100%',
    paddingVertical: 8,
  },
  manualFormTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  manualFormSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
    lineHeight: 18,
  },
  photoPickerButton: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
  },
  photoPickerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0ff',
    gap: 8,
  },
  photoPickerText: {
    color: '#667eea',
    fontSize: 15,
    fontWeight: '600',
  },
  labelPhotoPreview: {
    width: '100%',
    height: '100%',
  },
  labelResultCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  labelResultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  labelMacroItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
  },
  labelMacroValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  labelMacroLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  manualSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginTop: 4,
  },
  manualInputGroup: {
    marginBottom: 12,
  },
  manualInputLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    fontWeight: '500',
  },
  manualInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: 'white',
  },
  manualRow: {
    flexDirection: 'row',
    gap: 12,
  },
});