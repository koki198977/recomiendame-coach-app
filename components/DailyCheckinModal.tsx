import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NutritionService } from '../services/nutritionService';
import { CheckinRequest, CheckinResponse, Checkin } from '../types/nutrition';

interface DailyCheckinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (response: CheckinResponse) => void;
}

export const DailyCheckinModal: React.FC<DailyCheckinModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingCheckin, setExistingCheckin] = useState<Checkin | null>(null);
  
  // Form state
  const [weightKg, setWeightKg] = useState('');
  const [adherencePct, setAdherencePct] = useState('');
  const [hungerLvl, setHungerLvl] = useState(5);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      loadTodayCheckin();
    }
  }, [visible]);

  const loadTodayCheckin = async () => {
    try {
      setLoading(true);
      const checkin = await NutritionService.getTodayCheckin();
      
      if (checkin) {
        setExistingCheckin(checkin);
        setWeightKg(checkin.weightKg?.toString() || '');
        setAdherencePct(checkin.adherencePct?.toString() || '');
        setHungerLvl(checkin.hungerLvl || 5);
        setNotes(checkin.notes || '');
      } else {
        // Reset form for new checkin
        setExistingCheckin(null);
        setWeightKg('');
        setAdherencePct('');
        setHungerLvl(5);
        setNotes('');
      }
    } catch (error) {
      console.log('Error loading today checkin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      const checkinData: CheckinRequest = {};
      
      if (weightKg.trim()) {
        const weight = parseFloat(weightKg);
        if (isNaN(weight) || weight <= 0) {
          Alert.alert('Error', 'Por favor ingresa un peso válido');
          return;
        }
        checkinData.weightKg = weight;
      }
      
      if (adherencePct.trim()) {
        const adherence = parseInt(adherencePct);
        if (isNaN(adherence) || adherence < 0 || adherence > 100) {
          Alert.alert('Error', 'La adherencia debe ser un porcentaje entre 0 y 100');
          return;
        }
        checkinData.adherencePct = adherence;
      }
      
      checkinData.hungerLvl = hungerLvl;
      
      if (notes.trim()) {
        checkinData.notes = notes.trim();
      }

      // Validar que al menos un campo esté lleno
      if (!checkinData.weightKg && !checkinData.adherencePct && !checkinData.notes) {
        Alert.alert('Error', 'Por favor completa al menos un campo');
        return;
      }

      const response = await NutritionService.createCheckin(checkinData);
      
      if (response.ok) {
        // Llamar onSuccess inmediatamente para actualizar los datos
        onSuccess?.(response);
        
        // Mostrar el alert de éxito
        Alert.alert(
          '¡Excelente! 🎉',
          `Checkin registrado exitosamente.\n\n` +
          `🔥 Racha: ${response.gamification.streakDays} días\n` +
          `⭐ Puntos ganados: ${response.gamification.pointsAdded}\n` +
          `🏆 Total de puntos: ${response.gamification.totalPoints}` +
          (response.gamification.unlocked.length > 0 ? 
            `\n🎖️ Logros desbloqueados: ${response.gamification.unlocked.join(', ')}` : ''),
          [
            {
              text: 'Genial!',
              onPress: () => {
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Hubo un problema al registrar el checkin');
      }
    } catch (error: any) {
      console.log('Error submitting checkin:', error);
      Alert.alert('Error', 'No se pudo registrar el checkin. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderHungerScale = () => (
    <View style={styles.hungerScale}>
      <Text style={styles.fieldLabel}>Nivel de hambre (1-10)</Text>
      <View style={styles.scaleContainer}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.scaleButton,
              hungerLvl === level && styles.scaleButtonActive
            ]}
            onPress={() => setHungerLvl(level)}
          >
            <Text style={[
              styles.scaleButtonText,
              hungerLvl === level && styles.scaleButtonTextActive
            ]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleLabel}>Muy lleno</Text>
        <Text style={styles.scaleLabel}>Muy hambriento</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <LinearGradient
            colors={['#4CAF50', '#45A049']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {existingCheckin ? '📝 Actualizar Checkin' : '📝 Checkin Diario'}
              </Text>
              <Text style={styles.subtitle}>
                {new Date().toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Cargando datos...</Text>
              </View>
            ) : (
              <View style={styles.form}>
                {/* Peso */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Peso (kg) - Opcional</Text>
                  <TextInput
                    style={styles.textInput}
                    value={weightKg}
                    onChangeText={setWeightKg}
                    placeholder="Ej: 75.5"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Adherencia */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Adherencia al plan (%) - Opcional</Text>
                  <TextInput
                    style={styles.textInput}
                    value={adherencePct}
                    onChangeText={setAdherencePct}
                    placeholder="Ej: 85"
                    keyboardType="number-pad"
                    placeholderTextColor="#999"
                  />
                  <Text style={styles.fieldHint}>
                    ¿Qué tan bien seguiste tu plan nutricional hoy?
                  </Text>
                </View>

                {/* Nivel de hambre */}
                {renderHungerScale()}

                {/* Notas */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Notas del día - Opcional</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Ej: Día sólido, 10k pasos, me sentí con energía..."
                    multiline
                    numberOfLines={4}
                    placeholderTextColor="#999"
                  />
                </View>

                {existingCheckin && (
                  <View style={styles.existingCheckinInfo}>
                    <Text style={styles.existingCheckinText}>
                      ✅ Ya tienes un checkin registrado para hoy. Los cambios actualizarán tu registro.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.submitButton, (submitting || loading) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || loading}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {existingCheckin ? 'Actualizar' : 'Registrar'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    minHeight: 600,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'capitalize',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  form: {
    paddingBottom: 20,
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hungerScale: {
    marginBottom: 20,
  },
  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scaleButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  scaleButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  scaleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  scaleButtonTextActive: {
    color: '#fff',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  existingCheckinInfo: {
    backgroundColor: '#E8F5E8',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  existingCheckinText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: '#4CAF50',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});