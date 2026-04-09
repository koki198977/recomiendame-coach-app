import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { NutritionService } from '../services/nutritionService';
import { API_CONFIG } from '../config/api';
import { COLORS } from '../theme/theme';

const { width } = Dimensions.get('window');
const MAX_PHOTOS = 3;

interface DetectedIngredient {
  name: string;
  category: string;
  quantity_estimate: string;
}

interface DishSuggestion {
  name: string;
  prep_time_minutes: number;
  macros: { kcal: number; protein: number; carbs: number; fat: number };
  compatibility: string;
  ingredients_used: string[];
  steps: string[];
  how_to_cook?: string;
  chapix_note: string;
}

interface ScanResult {
  ingredients: DetectedIngredient[];
  confidence: 'alta' | 'media' | 'baja';
  notes?: string;
  dishes: DishSuggestion[];
}

interface IngredientScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onMealAdded?: () => void;
}

type Step = 'capture' | 'analyzing' | 'dishes' | 'logging';

export const IngredientScannerModal: React.FC<IngredientScannerModalProps> = ({
  visible,
  onClose,
  onMealAdded,
}) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [step, setStep] = useState<Step>('capture');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedDish, setSelectedDish] = useState<DishSuggestion | null>(null);

  const reset = () => {
    setPhotos([]);
    setStep('capture');
    setScanResult(null);
    setSelectedDish(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickPhoto = async (useCamera: boolean) => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Máximo alcanzado', `Puedes agregar hasta ${MAX_PHOTOS} fotos.`);
      return;
    }

    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permiso requerido', useCamera ? 'Necesitamos acceso a la cámara.' : 'Necesitamos acceso a la galería.');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });

    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeIngredients = async () => {
    if (photos.length === 0) {
      Alert.alert('Sin fotos', 'Agrega al menos una foto de tus ingredientes.');
      return;
    }

    setStep('analyzing');

    try {
      const base64Images = await Promise.all(
        photos.map(async (uri) => {
          const fetchResponse = await fetch(uri);
          const blob = await fetchResponse.blob();
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        })
      );

      const response = await api.post(
        API_CONFIG.ENDPOINTS.INGREDIENT_SCANNER.SUGGEST,
        { imagesBase64: base64Images },
        { timeout: API_CONFIG.LONG_TIMEOUT }
      );

      setScanResult(response.data);
      setStep('dishes');
    } catch (error: any) {
      console.error('Error analizando ingredientes:', error);
      Alert.alert('Error', 'No se pudieron analizar los ingredientes. Intenta de nuevo.');
      setStep('capture');
    }
  };

  const logDish = async (dish: DishSuggestion) => {
    setSelectedDish(dish);
    setStep('logging');

    try {
      await NutritionService.logMeal({
        title: String(dish.name),
        slot: 'LUNCH',
        kcal: Math.round(Number(dish.macros.kcal)),
        protein_g: Math.round(Number(dish.macros.protein)),
        carbs_g: Math.round(Number(dish.macros.carbs)),
        fat_g: Math.round(Number(dish.macros.fat)),
        notes: dish.chapix_note,
      });

      onMealAdded?.();
      Alert.alert('¡Listo! 🎉', `"${dish.name}" fue agregado a tu registro del día.`, [
        { text: 'OK', onPress: handleClose },
      ]);
    } catch (error) {
      console.error('Error registrando plato:', error);
      Alert.alert('Error', 'No se pudo registrar el plato. Intenta de nuevo.');
      setStep('dishes');
    }
  };

  // ─── Render: Captura ────────────────────────────────────────────────────────

  const renderCapture = () => (
    <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Image source={require('../assets/chapi-3d-alimento.png')} style={styles.chapiImage} resizeMode="contain" />
      <Text style={styles.stepTitle}>¿Qué cocino con esto?</Text>
      <Text style={styles.stepSubtitle}>
        Fotografía tus ingredientes. Puedes agregar hasta {MAX_PHOTOS} fotos si están en distintos lugares.
      </Text>

      <View style={styles.photosGrid}>
        {photos.map((uri, index) => (
          <View key={index} style={styles.photoSlot}>
            <Image source={{ uri }} style={styles.photoThumb} />
            <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(index)}>
              <Ionicons name="close-circle" size={22} color="#FF5252" />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < MAX_PHOTOS && (
          <View style={styles.addPhotoSlot}>
            <TouchableOpacity style={styles.addPhotoButton} onPress={() => pickPhoto(true)}>
              <Ionicons name="camera" size={28} color="#667eea" />
              <Text style={styles.addPhotoText}>Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addPhotoButton} onPress={() => pickPhoto(false)}>
              <Ionicons name="images" size={28} color="#667eea" />
              <Text style={styles.addPhotoText}>Galería</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {photos.length > 0 && (
        <Text style={styles.photoCount}>
          {photos.length}/{MAX_PHOTOS} foto{photos.length > 1 ? 's' : ''} agregada{photos.length > 1 ? 's' : ''}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.analyzeButton, photos.length === 0 && styles.analyzeButtonDisabled]}
        onPress={analyzeIngredients}
        disabled={photos.length === 0}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={photos.length > 0 ? ['#667eea', '#764ba2'] : ['#ccc', '#bbb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.analyzeButtonGradient}
        >
          <Ionicons name="sparkles" size={20} color="white" />
          <Text style={styles.analyzeButtonText}>Analizar con Chapix</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  // ─── Render: Analizando ─────────────────────────────────────────────────────

  const renderAnalyzing = () => (
    <View style={styles.centeredStep}>
      <Image source={require('../assets/chapi-3d-alimento.png')} style={styles.chapiImage} resizeMode="contain" />
      <ActivityIndicator size="large" color="#667eea" style={{ marginBottom: 16 }} />
      <Text style={styles.stepTitle}>Chapix está analizando...</Text>
      <Text style={styles.stepSubtitle}>
        Identificando ingredientes en {photos.length} foto{photos.length > 1 ? 's' : ''} y preparando tus opciones 🍳
      </Text>
    </View>
  );

  // ─── Render: Platos ─────────────────────────────────────────────────────────

  const renderDishes = () => {
    if (!scanResult) return null;
    const { ingredients, confidence, notes, dishes } = scanResult;
    const lowConfidence = confidence === 'media' || confidence === 'baja';

    return (
      <ScrollView contentContainerStyle={styles.stepContainer} showsVerticalScrollIndicator={false}>

        {/* Ingredientes detectados */}
        <View style={styles.ingredientsDetectedCard}>
          <View style={styles.ingredientsDetectedHeader}>
            <Text style={styles.ingredientsDetectedTitle}>🔍 Ingredientes detectados</Text>
            <View style={[styles.confidenceBadge, lowConfidence ? styles.confidenceLow : styles.confidenceHigh]}>
              <Text style={styles.confidenceText}>Confianza {confidence}</Text>
            </View>
          </View>

          <View style={styles.ingredientChips}>
            {ingredients.map((ing, i) => (
              <View key={i} style={styles.ingredientChip}>
                <Text style={styles.ingredientChipText}>{ing.name}</Text>
                <Text style={styles.ingredientChipQty}>{ing.quantity_estimate}</Text>
              </View>
            ))}
          </View>

          {lowConfidence && (
            <View style={styles.confidenceWarning}>
              <Ionicons name="information-circle-outline" size={16} color="#F57C00" />
              <Text style={styles.confidenceWarningText}>
                Algunos ingredientes pueden no ser exactos. Revisa la lista antes de elegir.
              </Text>
            </View>
          )}

          {notes ? (
            <Text style={styles.scanNotes}>📝 {notes}</Text>
          ) : null}
        </View>

        <Text style={styles.dishesTitle}>Tus 3 opciones de platos</Text>
        <Text style={styles.stepSubtitle}>Personalizadas según tu perfil y objetivo nutricional</Text>

        {dishes.map((dish, index) => (
          <View key={index} style={styles.dishCard}>
            <View style={styles.dishHeader}>
              <Text style={styles.dishName}>{dish.name}</Text>
              <View style={styles.dishTimeBadge}>
                <Ionicons name="time-outline" size={12} color="#667eea" />
                <Text style={styles.dishTime}>{dish.prep_time_minutes} min</Text>
              </View>
            </View>

            <View style={styles.macrosRow}>
              <View style={styles.macroBadge}>
                <Text style={styles.macroValue}>{dish.macros.kcal}</Text>
                <Text style={styles.macroLabel}>kcal</Text>
              </View>
              <View style={styles.macroBadge}>
                <Text style={styles.macroValue}>{dish.macros.protein}g</Text>
                <Text style={styles.macroLabel}>prot</Text>
              </View>
              <View style={styles.macroBadge}>
                <Text style={styles.macroValue}>{dish.macros.carbs}g</Text>
                <Text style={styles.macroLabel}>carbs</Text>
              </View>
              <View style={styles.macroBadge}>
                <Text style={styles.macroValue}>{dish.macros.fat}g</Text>
                <Text style={styles.macroLabel}>grasa</Text>
              </View>
            </View>

            <Text style={styles.compatibility}>✅ {dish.compatibility}</Text>
            <Text style={styles.chapixNote}>💬 {dish.chapix_note}</Text>

            <View style={styles.ingredientsUsed}>
              <Text style={styles.ingredientsLabel}>Ingredientes: </Text>
              <Text style={styles.ingredientsList}>{dish.ingredients_used.join(', ')}</Text>
            </View>

            {(dish.steps.length > 0 || dish.how_to_cook) && (
              <View style={styles.stepsContainer}>
                <Text style={styles.stepsTitle}>📋 Preparación</Text>
                {dish.how_to_cook ? (
                  <Text style={styles.howToCook}>{dish.how_to_cook}</Text>
                ) : null}
                {dish.steps.map((s, si) => (
                  <Text key={si} style={styles.stepItem}>{si + 1}. {s}</Text>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.chooseDishButton} onPress={() => logDish(dish)} activeOpacity={0.8}>
              <LinearGradient
                colors={['#4CAF50', '#388E3C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.chooseDishGradient}
              >
                <Text style={styles.chooseDishText}>Elegir este plato</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.retryButton} onPress={() => setStep('capture')}>
          <Text style={styles.retryText}>← Volver a escanear</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ─── Render: Registrando ────────────────────────────────────────────────────

  const renderLogging = () => (
    <View style={styles.centeredStep}>
      <ActivityIndicator size="large" color="#4CAF50" style={{ marginBottom: 16 }} />
      <Text style={styles.stepTitle}>Registrando plato...</Text>
      <Text style={styles.stepSubtitle}>Agregando "{selectedDish?.name}" a tu registro del día</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Escáner de Ingredientes</Text>
          <View style={{ width: 40 }} />
        </View>

        {step === 'capture' && renderCapture()}
        {step === 'analyzing' && renderAnalyzing()}
        {step === 'dishes' && renderDishes()}
        {step === 'logging' && renderLogging()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  stepContainer: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  centeredStep: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  chapiImage: { width: 120, height: 120, marginBottom: 16 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  stepSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  // Fotos
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 12, width: '100%' },
  photoSlot: { width: (width - 80) / 3, height: (width - 80) / 3, borderRadius: 12, overflow: 'visible' },
  photoThumb: { width: '100%', height: '100%', borderRadius: 12 },
  removePhotoBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: 'white', borderRadius: 11 },
  addPhotoSlot: { flexDirection: 'row', gap: 12 },
  addPhotoButton: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
  },
  addPhotoText: { fontSize: 12, color: '#667eea', fontWeight: '600' },
  photoCount: { fontSize: 13, color: '#888', marginBottom: 8 },

  // Botón analizar
  analyzeButton: { width: '100%', borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  analyzeButtonDisabled: { opacity: 0.6 },
  analyzeButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  analyzeButtonText: { fontSize: 16, fontWeight: '700', color: 'white' },

  // Ingredientes detectados
  ingredientsDetectedCard: {
    width: '100%',
    backgroundColor: '#f8f9ff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e8ecff',
  },
  ingredientsDetectedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  ingredientsDetectedTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  confidenceHigh: { backgroundColor: '#E8F5E9' },
  confidenceLow: { backgroundColor: '#FFF3E0' },
  confidenceText: { fontSize: 11, fontWeight: '600', color: '#555' },
  ingredientChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  ingredientChip: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#dde1ff',
  },
  ingredientChipText: { fontSize: 12, fontWeight: '600', color: '#444' },
  ingredientChipQty: { fontSize: 10, color: '#888', marginTop: 1 },
  confidenceWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  confidenceWarningText: { fontSize: 12, color: '#E65100', flex: 1, lineHeight: 16 },
  scanNotes: { fontSize: 12, color: '#777', fontStyle: 'italic', marginTop: 6 },

  // Platos
  dishesTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  dishCard: {
    width: '100%',
    backgroundColor: '#f8f9ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8ecff',
  },
  dishHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dishName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: 8 },
  dishTimeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eef0ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dishTime: { fontSize: 12, color: '#667eea', fontWeight: '600' },
  macrosRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  macroBadge: { flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e8ecff' },
  macroValue: { fontSize: 14, fontWeight: '700', color: '#667eea' },
  macroLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  compatibility: { fontSize: 13, color: '#388E3C', marginBottom: 6, lineHeight: 18 },
  chapixNote: { fontSize: 13, color: '#555', fontStyle: 'italic', marginBottom: 10, lineHeight: 18 },
  ingredientsUsed: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  ingredientsLabel: { fontSize: 12, color: '#888', fontWeight: '600' },
  ingredientsList: { fontSize: 12, color: '#555', flex: 1 },
  stepsContainer: { backgroundColor: 'white', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e8ecff' },
  stepsTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  howToCook: { fontSize: 13, color: '#444', lineHeight: 20, marginBottom: 8, fontStyle: 'italic' },
  stepItem: { fontSize: 12, color: '#444', lineHeight: 18, marginBottom: 4 },
  chooseDishButton: { borderRadius: 12, overflow: 'hidden' },
  chooseDishGradient: { paddingVertical: 12, alignItems: 'center' },
  chooseDishText: { fontSize: 15, fontWeight: '700', color: 'white' },
  retryButton: { marginTop: 8, paddingVertical: 12 },
  retryText: { fontSize: 14, color: '#667eea', fontWeight: '600' },
});
