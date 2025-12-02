import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { WorkoutGoal } from '../types/nutrition';

interface GenerateWorkoutModalProps {
  visible: boolean;
  onGenerate: (daysAvailable: number, goal: WorkoutGoal, equipmentImages?: string[]) => void;
  onClose: () => void;
}

export const GenerateWorkoutModal: React.FC<GenerateWorkoutModalProps> = ({
  visible,
  onGenerate,
  onClose,
}) => {
  const [selectedDays, setSelectedDays] = useState<number>(3);
  const [selectedGoal, setSelectedGoal] = useState<WorkoutGoal>('HYPERTROPHY');
  const [equipmentImages, setEquipmentImages] = useState<string[]>([]);

  const goals: { value: WorkoutGoal; label: string; emoji: string; description: string }[] = [
    {
      value: 'HYPERTROPHY',
      label: 'Hipertrofia',
      emoji: '💪',
      description: 'Aumentar masa muscular',
    },
    {
      value: 'STRENGTH',
      label: 'Fuerza',
      emoji: '🏋️',
      description: 'Aumentar fuerza máxima',
    },
    {
      value: 'ENDURANCE',
      label: 'Resistencia',
      emoji: '🏃',
      description: 'Mejorar resistencia cardiovascular',
    },
    {
      value: 'WEIGHT_LOSS',
      label: 'Pérdida de peso',
      emoji: '🔥',
      description: 'Quemar grasa y tonificar',
    },
  ];

  const pickImage = async () => {
    try {
      // Lazy load para evitar crash al inicio
      const ImagePicker = await import('expo-image-picker');
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para subir fotos de tus máquinas.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.3,
        allowsEditing: false,
        aspect: undefined,
      });

      if (!result.canceled && result.assets) {
        const maxImages = 5;
        const currentTotal = equipmentImages.length;
        const availableSlots = maxImages - currentTotal;
        
        if (availableSlots <= 0) {
          Alert.alert(
            'Límite alcanzado',
            `Solo puedes subir hasta ${maxImages} imágenes de equipamiento.`
          );
          return;
        }
        
        const newImages = result.assets.slice(0, availableSlots).map(asset => asset.uri);
        setEquipmentImages([...equipmentImages, ...newImages]);
        
        if (result.assets.length > availableSlots) {
          Alert.alert(
            'Límite de imágenes',
            `Solo se agregaron ${availableSlots} de ${result.assets.length} imágenes seleccionadas.`
          );
        }
        
        console.log(`📸 Added ${newImages.length} images (total: ${equipmentImages.length + newImages.length})`);
      }
    } catch (error) {
      console.error('Error loading ImagePicker:', error);
      Alert.alert('Error', 'No se pudo cargar el selector de imágenes');
    }
  };

  const removeImage = (index: number) => {
    setEquipmentImages(equipmentImages.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    onGenerate(selectedDays, selectedGoal, equipmentImages.length > 0 ? equipmentImages : undefined);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Generar Rutina</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Días disponibles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>¿Cuántos días puedes entrenar?</Text>
              <View style={styles.daysContainer}>
                {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.dayButton,
                      selectedDays === days && styles.dayButtonActive,
                    ]}
                    onPress={() => setSelectedDays(days)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        selectedDays === days && styles.dayButtonTextActive,
                      ]}
                    >
                      {days}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Objetivo */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>¿Cuál es tu objetivo?</Text>
              {goals.map((goal) => (
                <TouchableOpacity
                  key={goal.value}
                  style={[
                    styles.goalCard,
                    selectedGoal === goal.value && styles.goalCardActive,
                  ]}
                  onPress={() => setSelectedGoal(goal.value)}
                >
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                    <View style={styles.goalInfo}>
                      <Text
                        style={[
                          styles.goalLabel,
                          selectedGoal === goal.value && styles.goalLabelActive,
                        ]}
                      >
                        {goal.label}
                      </Text>
                      <Text style={styles.goalDescription}>{goal.description}</Text>
                    </View>
                  </View>
                  {selectedGoal === goal.value && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Equipamiento disponible */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Equipamiento disponible (opcional)</Text>
              <Text style={styles.sectionDescription}>
                Sube fotos de tus máquinas y equipos para una rutina más personalizada
              </Text>
              
              {/* Botón para agregar fotos */}
              <TouchableOpacity 
                style={styles.addPhotoButton} 
                onPress={pickImage}
              >
                <Text style={styles.addPhotoIcon}>📸</Text>
                <Text style={styles.addPhotoText}>Agregar fotos de equipamiento</Text>
              </TouchableOpacity>

              {/* Galería de fotos */}
              {equipmentImages.length > 0 && (
                <View style={styles.imageGallery}>
                  {equipmentImages.map((uri, index) => (
                    <View key={index} style={styles.imageContainer}>
                      <Image source={{ uri }} style={styles.equipmentImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Text style={styles.removeImageText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Botón generar */}
            <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
              <Text style={styles.generateButtonText}>🤖 Generar rutina con IA</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
  },
  dayButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  goalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  goalLabelActive: {
    color: '#2E7D32',
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  addPhotoIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  addPhotoText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  imageGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 15,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  equipmentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
