import React, { useState, useEffect } from 'react';
import { MealLog } from '../types/nutrition';
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NutritionService } from '../services/nutritionService';
import { SocialService } from '../services/socialService';
import { COLORS } from '../theme/theme';

interface LogMealModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingMeals?: MealLog[];
}

export const LogMealModal: React.FC<LogMealModalProps> = ({
  visible,
  onClose,
  onSuccess,
  existingMeals = [],
}) => {
  const [selectedSlot, setSelectedSlot] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('LUNCH');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzed, setAnalyzed] = useState<any>(null);
  const [description, setDescription] = useState('');

  const scrollViewRef = React.useRef<ScrollView>(null);

  const slots = [
    { value: 'BREAKFAST', label: '🌅 Desayuno', emoji: '🌅' },
    { value: 'LUNCH', label: '☀️ Almuerzo', emoji: '☀️' },
    { value: 'DINNER', label: '🌙 Cena', emoji: '🌙' },
    { value: 'SNACK', label: '🥜 Snack', emoji: '🥜' },
  ];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setAnalyzed(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setAnalyzed(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Selecciona una imagen primero');
      return;
    }

    try {
      setUploading(true);
      
      // Subir imagen primero
      const uploadResult = await SocialService.uploadImage(imageUri);
      
      setUploading(false);
      setAnalyzing(true);
      
      // Analizar con IA
      const result = await NutritionService.analyzeMeal(uploadResult.url, description);
      
      setAnalyzed({
        ...result,
        imageUrl: uploadResult.url,
      });
    } catch (error) {
      console.error('Error analyzing meal:', error);
      Alert.alert('Error', 'No se pudo analizar la comida. Intenta de nuevo.');
    } finally {
      setAnalyzing(false);
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!analyzed) return;

    try {
      await NutritionService.logMeal({
        slot: selectedSlot,
        title: analyzed.title,
        kcal: analyzed.kcal,
        protein_g: analyzed.protein_g,
        carbs_g: analyzed.carbs_g,
        fat_g: analyzed.fat_g,
        notes: analyzed.notes,
        imageUrl: analyzed.imageUrl,
      });

      // Si existe una comida planificada para este mismo slot, la eliminamos (reemplazo)
      const plannedMeal = existingMeals.find(
        meal => meal.slot === selectedSlot && meal.fromPlan
      );

      if (plannedMeal) {
        console.log('Replacing planned meal:', plannedMeal.id);
        try {
          await NutritionService.deleteMealLog(plannedMeal.id);
        } catch (err) {
          console.warn('Could not delete replaced meal:', err);
        }
      }

      // Cerrar automáticamente sin alert
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error logging meal:', error);
      Alert.alert('Error', 'No se pudo registrar la comida.');
    }
  };

  const handleClose = () => {
    setImageUri(null);
    setAnalyzed(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.container}>
              <ScrollView 
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.chapiContainer}>
                  <Image 
                    source={require('../assets/chapi-3d-foto-alimento.png')}
                    style={styles.chapiImage}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.title}>Registrar Comida</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Slot selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>¿Qué comida es?</Text>
              <View style={styles.slotsContainer}>
                {slots.map((slot) => (
                  <TouchableOpacity
                    key={slot.value}
                    style={[
                      styles.slotButton,
                      selectedSlot === slot.value && styles.slotButtonActive,
                    ]}
                    onPress={() => setSelectedSlot(slot.value as any)}
                  >
                    <Text style={styles.slotEmoji}>{slot.emoji}</Text>
                    <Text
                      style={[
                        styles.slotText,
                        selectedSlot === slot.value && styles.slotTextActive,
                      ]}
                    >
                      {slot.label.replace(slot.emoji + ' ', '')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Image picker */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Foto de la comida</Text>
              {imageUri ? (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: imageUri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setImageUri(null)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imageButtons}>
                  <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                    <Text style={styles.imageButtonIcon}>📷</Text>
                    <Text style={styles.imageButtonText}>Tomar foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                    <Text style={styles.imageButtonIcon}>🖼️</Text>
                    <Text style={styles.imageButtonText}>Galería</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Description */}
            {imageUri && !analyzed && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Descripción (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Avena con plátano y miel"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  blurOnSubmit={true}
                  selectTextOnFocus={true}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Analyze button */}
            {imageUri && !analyzed && (
              <TouchableOpacity
                style={[styles.analyzeButton, (analyzing || uploading) && styles.buttonDisabled]}
                onPress={handleAnalyze}
                disabled={analyzing || uploading}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.analyzeButtonText}>Subiendo imagen...</Text>
                  </>
                ) : analyzing ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.analyzeButtonText}>Analizando con IA...</Text>
                  </>
                ) : (
                  <Text style={styles.analyzeButtonText}>🤖 Analizar con IA</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Analysis result */}
            {analyzed && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Análisis de IA</Text>
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>{analyzed.title}</Text>
                  <View style={styles.macrosGrid}>
                    <View style={styles.macroItem}>
                      <Text style={styles.macroValue}>{analyzed.kcal}</Text>
                      <Text style={styles.macroLabel}>kcal</Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={styles.macroValue}>{analyzed.protein_g}g</Text>
                      <Text style={styles.macroLabel}>Proteína</Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={styles.macroValue}>{analyzed.carbs_g}g</Text>
                      <Text style={styles.macroLabel}>Carbos</Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={styles.macroValue}>{analyzed.fat_g}g</Text>
                      <Text style={styles.macroLabel}>Grasas</Text>
                    </View>
                  </View>
                  {analyzed.notes && (
                    <Text style={styles.analysisNotes}>{analyzed.notes}</Text>
                  )}
                  <Text style={styles.confidenceBadge}>
                    Confianza: {analyzed.confidence === 'high' ? 'Alta ✓' : analyzed.confidence === 'medium' ? 'Media' : 'Baja'}
                  </Text>
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>✓ Guardar comida</Text>
                </TouchableOpacity>
              </View>
            )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '95%',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chapiContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  chapiImage: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  slotButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  slotEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  slotText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  slotTextActive: {
    color: '#2E7D32',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  imageButton: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  imageButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  imageButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    maxHeight: 100,
    textAlignVertical: 'top',
    color: '#000',
    backgroundColor: '#fff',
  },
  analyzeButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  analysisCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  analysisNotes: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  confidenceBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
