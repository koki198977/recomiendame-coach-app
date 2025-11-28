import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WorkoutService from '../services/workoutService';
import { WorkoutPlan, WorkoutGoal, WorkoutDay, Exercise } from '../types/nutrition';
import { GenerateWorkoutModal } from '../components/GenerateWorkoutModal';
import { PlanGeneratingModal } from '../components/PlanGeneratingModal';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';

export const WorkoutsTab: React.FC = () => {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  useEffect(() => {
    loadWorkoutPlan();
  }, []);

  const loadWorkoutPlan = async () => {
    try {
      setLoading(true);
      const week = WorkoutService.getCurrentISOWeek();
      setCurrentWeek(week);

      const plan = await WorkoutService.getWorkoutPlan(week);
      setWorkoutPlan(plan);

      // Seleccionar día actual por defecto
      const today = new Date().getDay();
      const todayIndex = today === 0 ? 6 : today - 1; // Lunes = 0, Domingo = 6
      setSelectedDay(todayIndex);

    } catch (error) {
      console.log('Error loading workout plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async (daysAvailable: number, goal: WorkoutGoal) => {
    try {
      console.warn('🏋️ Starting workout plan generation...');
      setShowGenerateModal(false);
      setIsGenerating(true);
      setGenerationProgress(10);

      // Iniciar la generación del plan
      const response = await WorkoutService.generateWorkoutPlan(daysAvailable, goal);
      
      console.warn('📋 Generation response:', JSON.stringify(response));

      if (response.created && response.planId) {
        console.warn(`✅ Plan creation initiated with ID: ${response.planId}`);
        setGenerationProgress(30);
        
        // Iniciar polling para verificar si el plan está listo
        // Esperar 30 segundos antes del primer intento (la API tarda ~35 segundos)
        console.warn('⏰ Waiting 30 seconds before first check...');
        setTimeout(() => {
          console.warn('🔍 Starting polling now...');
          pollForWorkoutPlan(response.planId, 0);
        }, 30000);
      } else {
        console.warn('❌ Invalid response from API:', response);
        throw new Error('Invalid response from API');
      }
    } catch (error: any) {
      console.error('❌ Error generating workout plan:', error);
      setIsGenerating(false);
      setGenerationProgress(0);

      let errorMessage = 'No se pudo generar la rutina. Intenta de nuevo.';

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'La generación de la rutina está tardando más de lo esperado. La rutina se está creando en segundo plano, puedes refrescar en unos minutos.';
      }

      Alert.alert('Error', errorMessage);
    }
  };

  const pollForWorkoutPlan = async (planId: string, attempts: number = 0) => {
    const maxAttempts = 15; // 15 intentos
    
    // Estrategia de polling adaptativa:
    // - Primer intento: esperar 30 segundos (la API tarda ~35 segundos)
    // - Siguientes intentos: cada 5 segundos
    const getPollingInterval = (attempt: number) => {
      if (attempt === 0) return 30000; // 30 segundos para el primer intento
      return 5000; // 5 segundos para los siguientes
    };

    // Actualizar progreso basado en intentos
    const progress = Math.min((attempts / maxAttempts) * 100, 95);
    setGenerationProgress(progress);

    console.warn(`🔄 Polling attempt ${attempts + 1}/${maxAttempts} for workout plan ${planId}`);

    try {
      // Intentar obtener el plan actualizado
      const plan = await WorkoutService.getWorkoutPlan(currentWeek);

      console.warn('📋 Plan received:', plan ? `ID: ${plan.id}, Days: ${plan.days?.length}` : 'null');

      // Verificar si el plan existe y tiene datos válidos
      if (plan && plan.days && plan.days.length > 0) {
        // El plan está listo (verificamos que tenga días, no solo el ID)
        console.warn('✅ Workout plan is ready!');
        setGenerationProgress(100);
        setTimeout(() => {
          setWorkoutPlan(plan);
          setIsGenerating(false);
          setGenerationProgress(0);
          Alert.alert('¡Listo! 🎉', 'Tu rutina de entrenamiento ha sido generada exitosamente.');
        }, 1000); // Pequeña pausa para mostrar 100%
        return;
      }

      // Si no está listo y no hemos alcanzado el máximo de intentos
      if (attempts < maxAttempts) {
        const nextInterval = getPollingInterval(attempts);
        console.warn(`⏳ Plan not ready yet, will retry in ${nextInterval/1000} seconds...`);
        setTimeout(() => {
          pollForWorkoutPlan(planId, attempts + 1);
        }, nextInterval);
      } else {
        // Timeout - el plan tardó demasiado
        console.warn('⏰ Polling timeout reached');
        setIsGenerating(false);
        setGenerationProgress(0);
        Alert.alert(
          'Rutina en proceso',
          'Tu rutina se está generando y estará lista pronto. Puedes refrescar la pantalla en unos minutos.',
          [
            {
              text: 'Refrescar ahora',
              onPress: () => {
                loadWorkoutPlan();
              }
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.log('❌ Error polling for workout plan:', error);

      // Si no hemos alcanzado el máximo de intentos, continuar
      if (attempts < maxAttempts) {
        const nextInterval = getPollingInterval(attempts);
        console.log(`🔄 Retrying after error in ${nextInterval/1000} seconds...`);
        setTimeout(() => {
          pollForWorkoutPlan(planId, attempts + 1);
        }, nextInterval);
      } else {
        setIsGenerating(false);
        setGenerationProgress(0);
        Alert.alert('Error', 'Hubo un problema verificando tu rutina. Intenta refrescar la pantalla.');
      }
    }
  };

  const getTodayWorkout = (): WorkoutDay | null => {
    if (!workoutPlan || !workoutPlan.days) return null;

    const today = new Date().getDay();
    const todayDayIndex = today === 0 ? 7 : today;

    return workoutPlan.days.find(day => day.dayIndex === todayDayIndex) || null;
  };

  const handleOpenVideo = async (query: string) => {
    try {
      // Usar directamente el enlace web para mayor compatibilidad
      const searchQuery = encodeURIComponent(query);
      const webUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
      
      console.log('Opening video URL:', webUrl);
      await Linking.openURL(webUrl);
    } catch (error) {
      console.log('Error opening video:', error);
      Alert.alert('Error', 'No se pudo abrir YouTube');
    }
  };

  const renderExercise = (exercise: Exercise, index: number) => (
    <View key={index} style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseNumber}>{index + 1}</Text>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          {exercise.muscleGroup && (
            <Text style={styles.muscleGroup}>🎯 {exercise.muscleGroup}</Text>
          )}
        </View>
        {exercise.videoQuery && (
          <TouchableOpacity 
            style={styles.videoButton}
            onPress={() => handleOpenVideo(exercise.videoQuery!)}
          >
            <Text style={styles.videoButtonText}>📺 Ver video</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.exerciseDetails}>
        <View style={styles.exerciseDetail}>
          <Text style={styles.detailLabel}>Series</Text>
          <Text style={styles.detailValue}>{exercise.sets}</Text>
        </View>
        <View style={styles.exerciseDetail}>
          <Text style={styles.detailLabel}>Reps</Text>
          <Text style={styles.detailValue}>{exercise.reps}</Text>
        </View>
        <View style={styles.exerciseDetail}>
          <Text style={styles.detailLabel}>Descanso</Text>
          <Text style={styles.detailValue}>
            {exercise.restSeconds ? `${exercise.restSeconds}s` : exercise.rest}
          </Text>
        </View>
      </View>

      {exercise.instructions && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Instrucciones:</Text>
          <Text style={styles.instructionsText}>{exercise.instructions}</Text>
        </View>
      )}

      {exercise.notes && (
        <Text style={styles.exerciseNotes}>💡 {exercise.notes}</Text>
      )}
    </View>
  );

  const renderDaySelector = () => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
        {days.map((day, index) => {
          const dayIndex = index + 1;
          const hasWorkout = workoutPlan?.days.some(d => d.dayIndex === dayIndex);
          const today = new Date().getDay();
          const todayIndex = today === 0 ? 6 : today - 1;
          const isToday = index === todayIndex;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayButton,
                selectedDay === index && styles.dayButtonActive,
                isToday && styles.dayButtonToday,
                !hasWorkout && styles.dayButtonDisabled,
              ]}
              onPress={() => hasWorkout && setSelectedDay(index)}
              disabled={!hasWorkout}
            >
              <Text style={[
                styles.dayText,
                selectedDay === index && styles.dayTextActive,
                !hasWorkout && styles.dayTextDisabled,
              ]}>
                {day}
              </Text>
              {hasWorkout && <View style={styles.dayIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderWorkoutDay = () => {
    if (!workoutPlan || !workoutPlan.days) {
      return (
        <View style={styles.noWorkoutContainer}>
          <Text style={styles.noWorkoutText}>No hay rutina para este día</Text>
        </View>
      );
    }

    const dayIndex = selectedDay + 1;
    const dayWorkout = workoutPlan.days.find(d => d.dayIndex === dayIndex);

    if (!dayWorkout || dayWorkout.exercises.length === 0) {
      return (
        <View style={styles.noWorkoutContainer}>
          <Text style={styles.noWorkoutEmoji}>😴</Text>
          <Text style={styles.noWorkoutText}>Día de descanso</Text>
        </View>
      );
    }

    return (
      <View style={styles.workoutContainer}>
        <View style={styles.workoutHeader}>
          <Text style={styles.workoutTitle}>
            {WorkoutService.getDayName(dayIndex)}
          </Text>
          <View style={styles.workoutMeta}>
            <Text style={styles.workoutMetaText}>
              {dayWorkout.exercises.length} ejercicios
            </Text>
            {dayWorkout.duration && (
              <Text style={styles.workoutMetaText}>
                • {dayWorkout.duration} min
              </Text>
            )}
          </View>
        </View>

        <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
          {dayWorkout.exercises.map((exercise, index) =>
            renderExercise(exercise, index)
          )}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando rutina...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {workoutPlan ? (
          <>
            {/* Plan Info */}
            <View style={styles.planInfo}>
              <View style={styles.planHeader}>
                <Text style={styles.planGoal}>
                  {WorkoutService.getGoalEmoji(workoutPlan.goal)}{' '}
                  {WorkoutService.getGoalLabel(workoutPlan.goal)}
                </Text>
                <Text style={styles.planWeek}>Semana {currentWeek}</Text>
              </View>
              <Text style={styles.planDays}>
                {workoutPlan.daysAvailable} días de entrenamiento
              </Text>
            </View>

            {/* Day Selector */}
            {renderDaySelector()}

            {/* Workout Content */}
            {renderWorkoutDay()}
          </>
        ) : (
          <View style={styles.noPlanContainer}>
            <Text style={styles.noPlanEmoji}>🏋️</Text>
            <Text style={styles.noPlanTitle}>¡Crea tu rutina!</Text>
            <Text style={styles.noPlanText}>
              No tienes una rutina de entrenamiento para esta semana.
              Genera una personalizada con IA.
            </Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => setShowGenerateModal(true)}
            >
              <LinearGradient
                colors={GRADIENTS.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, paddingHorizontal: 30, borderRadius: 24 }}
              >
                <Text style={styles.generateButtonText}>🤖 Generar rutina con IA</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Modals */}
      <GenerateWorkoutModal
        visible={showGenerateModal}
        onGenerate={handleGeneratePlan}
        onClose={() => setShowGenerateModal(false)}
      />

      <PlanGeneratingModal
        visible={isGenerating}
        progress={generationProgress}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textLight,
  },
  planInfo: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...SHADOWS.glow,
    shadowColor: COLORS.primaryStart,
    shadowOpacity: 0.1,
    zIndex: 10,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planGoal: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  planWeek: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  planDays: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  daySelector: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
  },
  dayButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    minWidth: 50,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'transparent',
    ...SHADOWS.card,
  },
  dayButtonActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.glow,
  },
  dayButtonToday: {
    borderColor: COLORS.warning,
    borderWidth: 2,
  },
  dayButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  dayTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: '#ccc',
  },
  dayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  workoutContainer: {
    flex: 1,
    padding: 20,
  },
  workoutHeader: {
    marginBottom: 20,
  },
  workoutTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  workoutMeta: {
    flexDirection: 'row',
  },
  workoutMetaText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginRight: 8,
    fontWeight: '500',
  },
  exercisesList: {
    flex: 1,
  },
  exerciseCard: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.2)',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(67, 233, 123, 0.15)',
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 12,
    overflow: 'hidden',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  muscleGroup: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    marginBottom: 12,
  },
  exerciseDetail: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  exerciseNotes: {
    fontSize: 14,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 249, 196, 0.3)', // Very light yellow
    borderRadius: 12,
  },
  noWorkoutContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noWorkoutEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  noWorkoutText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  noPlanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noPlanEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  noPlanTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  noPlanText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  generateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 24,
    ...SHADOWS.glow,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  videoButton: {
    backgroundColor: '#FF0000', // YouTube red
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 10,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  videoButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  instructionsContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
});
