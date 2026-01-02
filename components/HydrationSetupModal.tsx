import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HydrationService from '../services/hydrationService';
import { HydrationRecommendation } from '../types/nutrition';

interface HydrationSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onPlanCreated: () => void;
}

export const HydrationSetupModal: React.FC<HydrationSetupModalProps> = ({
  visible,
  onClose,
  onPlanCreated,
}) => {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<HydrationRecommendation | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [reminderInterval, setReminderInterval] = useState(120); // 2 horas por defecto
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('22:00');
  const [enableReminders, setEnableReminders] = useState(true);

  useEffect(() => {
    if (visible) {
      loadRecommendation();
    }
  }, [visible]);

  const loadRecommendation = async () => {
    try {
      setLoading(true);
      const rec = await HydrationService.calculateRecommended();
      setRecommendation(rec);
      setSelectedTarget(rec.recommendedMl); // Seleccionar la recomendación por defecto
    } catch (error) {
      Alert.alert('Error', 'No se pudo calcular tu recomendación personalizada');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!selectedTarget) {
      Alert.alert('Error', 'Por favor selecciona un objetivo');
      return;
    }

    try {
      setCreating(true);
      
      const goalData = {
        dailyTargetMl: selectedTarget,
        reminderIntervalMinutes: enableReminders ? reminderInterval : 0,
        startTime: "07:00",
        endTime: "22:00", 
        isActive: true,
      };
      
      await HydrationService.setHydrationGoal(goalData);
      
      // Cerrar modal y actualizar sin mostrar alert
      onPlanCreated();
      onClose();
    } catch (error) {
      console.error('Error creating hydration plan:', error);
      Alert.alert('Error', 'No se pudo crear tu plan de hidratación. Intenta de nuevo.');
    } finally {
      setCreating(false);
    }
  };

  const getTargetOptions = () => {
    if (!recommendation) return [];
    
    return [
      {
        value: recommendation.ranges.minimum,
        label: 'Mínimo',
        description: 'Para mantenimiento básico',
        color: '#FF9800'
      },
      {
        value: recommendation.ranges.optimal,
        label: 'Recomendado',
        description: 'Óptimo para tu perfil',
        color: '#4CAF50',
        recommended: true
      },
      {
        value: recommendation.ranges.maximum,
        label: 'Máximo',
        description: 'Para alta actividad',
        color: '#00BCD4'
      }
    ];
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <LinearGradient
        colors={['#00BCD4', '#4CAF50']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>💧</Text>
          </View>
          <Text style={styles.title}>Plan de Hidratación</Text>
          <Text style={styles.subtitle}>Personalizado para ti</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Calculando tu recomendación...</Text>
            </View>
          ) : recommendation ? (
            <>
              {/* Explicación */}
              <View style={styles.explanationContainer}>
                <Text style={styles.explanationTitle}>Tu recomendación personalizada</Text>
                <Text style={styles.explanationText}>{recommendation.explanation}</Text>
              </View>

              {/* Factores */}
              <View style={styles.factorsContainer}>
                <Text style={styles.factorsTitle}>Basado en:</Text>
                <View style={styles.factorsList}>
                  <Text style={styles.factorItem}>⚖️ Peso: {recommendation.factors.weight}kg</Text>
                  <Text style={styles.factorItem}>
                    🏃 Actividad: {
                      recommendation.factors.activityLevel === 'SEDENTARY' ? 'Sedentario' :
                      recommendation.factors.activityLevel === 'LIGHT' ? 'Ligero' :
                      recommendation.factors.activityLevel === 'MODERATE' ? 'Moderado' :
                      recommendation.factors.activityLevel === 'ACTIVE' ? 'Activo' :
                      recommendation.factors.activityLevel === 'VERY_ACTIVE' ? 'Muy activo' :
                      recommendation.factors.activityLevel
                    }
                  </Text>
                  <Text style={styles.factorItem}>
                    👤 Género: {
                      recommendation.factors.sex === 'MALE' ? 'Masculino' :
                      recommendation.factors.sex === 'FEMALE' ? 'Femenino' :
                      recommendation.factors.sex
                    }
                  </Text>
                  {recommendation.factors.conditions.length > 0 && (
                    <Text style={styles.factorItem}>
                      🩺 Condiciones: {recommendation.factors.conditions.join(', ')}
                    </Text>
                  )}
                </View>
              </View>

              {/* Opciones de objetivo */}
              <View style={styles.targetsContainer}>
                <Text style={styles.targetsTitle}>Elige tu objetivo diario:</Text>
                <View style={styles.targetsList}>
                  {getTargetOptions().map((option) => {
                    const isSelected = selectedTarget === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.targetOption,
                          isSelected && styles.targetOptionSelected,
                          { borderColor: option.color }
                        ]}
                        onPress={() => setSelectedTarget(option.value)}
                      >
                        <View style={styles.targetHeader}>
                          <Text style={[styles.targetLabel, { color: option.color }]}>
                            {option.label}
                            {option.recommended && ' ⭐'}
                          </Text>
                          <Text style={[
                            styles.targetValue,
                            isSelected && styles.targetValueSelected,
                            isSelected && { color: option.color }
                          ]}>
                            {HydrationService.formatMl(option.value)}
                          </Text>
                        </View>
                        <Text style={[
                          styles.targetDescription,
                          isSelected && styles.targetDescriptionSelected
                        ]}>
                          {option.description}
                        </Text>
                        {isSelected && (
                          <View style={[styles.selectedIndicator, { backgroundColor: option.color }]}>
                            <Text style={styles.selectedText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Configuración de recordatorios */}
              <View style={styles.remindersContainer}>
                <Text style={styles.remindersTitle}>⏰ Configuración de recordatorios:</Text>
                
                {/* Toggle de recordatorios */}
                <TouchableOpacity 
                  style={styles.reminderToggle}
                  onPress={() => setEnableReminders(!enableReminders)}
                >
                  <Text style={styles.reminderToggleText}>
                    {enableReminders ? '✅' : '⬜'} Activar recordatorios
                  </Text>
                </TouchableOpacity>

                {enableReminders && (
                  <>
                    {/* Intervalo de recordatorios */}
                    <View style={styles.reminderOption}>
                      <Text style={styles.reminderLabel}>Frecuencia:</Text>
                      <View style={styles.intervalButtons}>
                        {[60, 90, 120, 180].map((interval) => (
                          <TouchableOpacity
                            key={interval}
                            style={[
                              styles.intervalButton,
                              reminderInterval === interval && styles.intervalButtonSelected
                            ]}
                            onPress={() => setReminderInterval(interval)}
                          >
                            <Text style={[
                              styles.intervalButtonText,
                              reminderInterval === interval && styles.intervalButtonTextSelected
                            ]}>
                              {interval === 60 ? '1h' : 
                               interval === 90 ? '1.5h' : 
                               interval === 120 ? '2h' : '3h'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>


                  </>
                )}
              </View>

              {/* Tips */}
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>💡 Consejos para mantenerte hidratado:</Text>
                <View style={styles.tipsList}>
                  {recommendation.tips.map((tip, index) => (
                    <Text key={index} style={styles.tipItem}>{tip}</Text>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>No se pudo cargar la recomendación</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadRecommendation}>
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        {recommendation && (
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.createButton, creating && styles.createButtonDisabled]}
              onPress={handleCreatePlan}
              disabled={creating || !selectedTarget}
            >
              <LinearGradient
                colors={creating ? ['#ccc', '#999'] : ['#4CAF50', '#45A049']}
                style={styles.createButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Crear Mi Plan 💧</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
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
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  explanationContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  explanationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  factorsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  factorsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  factorsList: {
    gap: 6,
  },
  factorItem: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  targetsContainer: {
    marginBottom: 20,
  },
  targetsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  targetsList: {
    gap: 12,
  },
  targetOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
  },
  targetOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  targetLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  targetValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  targetValueSelected: {
    color: '#333',
  },
  targetDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  targetDescriptionSelected: {
    color: '#666',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tipsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  createButton: {
    borderRadius: 16,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  remindersContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  remindersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  reminderToggle: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  reminderToggleText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  reminderOption: {
    marginBottom: 15,
  },
  reminderLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    fontWeight: '600',
  },
  intervalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  intervalButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  intervalButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: '#fff',
  },
  intervalButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  intervalButtonTextSelected: {
    color: '#fff',
  },
});