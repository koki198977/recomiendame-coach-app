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
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WorkoutService from '../services/workoutService';
import { WorkoutPlan, WorkoutGoal, WorkoutDay, Exercise } from '../types/nutrition';
import { GenerateWorkoutModal } from '../components/GenerateWorkoutModal';
import { PlanGeneratingModal } from '../components/PlanGeneratingModal';
import { RestTimerModal } from '../components/RestTimerModal';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';

export const WorkoutsTab: React.FC = () => {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Estados para rutina activa
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [exerciseEdits, setExerciseEdits] = useState<{[key: number]: Partial<Exercise>}>({});
  const [showWorkoutSummary, setShowWorkoutSummary] = useState(false);
  const [workoutSummary, setWorkoutSummary] = useState<any>(null);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [currentRestSeconds, setCurrentRestSeconds] = useState(60);

  useEffect(() => {
    loadWorkoutPlan();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorkoutActive && workoutStartTime) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const start = workoutStartTime.getTime();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutActive, workoutStartTime]);

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
      // Error silencioso
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async (daysAvailable: number, goal: WorkoutGoal, equipmentImages?: string[]) => {
    try {
      setShowGenerateModal(false);
      setIsGenerating(true);
      setGenerationProgress(10);

      // Iniciar la generación del plan (con imágenes si las hay)
      const response = await WorkoutService.generateWorkoutPlan(
        daysAvailable, 
        goal, 
        undefined, // isoWeek (usa la actual por defecto)
        equipmentImages
      );
      
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
      console.error('Error status:', error.response?.status);
      
      // Si es un 504 Gateway Timeout, el plan se está creando en background
      if (error.response?.status === 504) {
        console.warn('⏰ 504 Gateway Timeout - Plan creating in background, starting polling immediately...');
        setGenerationProgress(20);
        // Generar un planId temporal basado en la semana
        const tempPlanId = `${currentWeek}-${Date.now()}`;
        // Iniciar polling inmediatamente (sin esperar 30 segundos)
        console.warn('🔍 Starting polling immediately for 504...');
        pollForWorkoutPlan(tempPlanId, 0);
        return;
      }

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
    
    // Si el planId contiene la semana actual, es un ID temporal (viene de 504)
    const is504Timeout = planId.includes(currentWeek);
    
    // Estrategia de polling adaptativa:
    // - Si es 504: polling cada 10 segundos desde el inicio
    // - Si es normal: primer intento a los 30s, luego cada 5s
    const getPollingInterval = (attempt: number) => {
      if (is504Timeout) return 10000; // 10 segundos para 504
      if (attempt === 0) return 30000; // 30 segundos para el primer intento normal
      return 5000; // 5 segundos para los siguientes
    };

    // Actualizar progreso basado en intentos
    const progress = Math.min(20 + (attempts / maxAttempts) * 75, 95);
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
      // Si no hemos alcanzado el máximo de intentos, continuar
      if (attempts < maxAttempts) {
        const nextInterval = getPollingInterval(attempts);
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

  const startWorkout = () => {
    setIsWorkoutActive(true);
    setWorkoutStartTime(new Date());
    setCompletedExercises(new Set());
    setExerciseEdits({});
    Alert.alert(
      '¡Rutina iniciada! 💪', 
      'Presiona el botón "Marcar" en cada ejercicio cuando lo completes. El cronómetro está corriendo. ¡A entrenar!',
      [{ text: 'Entendido' }]
    );
  };

  const toggleExerciseComplete = (index: number, restSeconds?: number) => {
    setCompletedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
        // Iniciar temporizador de descanso si hay tiempo definido
        if (restSeconds && restSeconds > 0) {
          setCurrentRestSeconds(restSeconds);
          setShowRestTimer(true);
        }
      }
      return newSet;
    });
  };

  const updateExerciseValue = (index: number, field: keyof Exercise, value: any) => {
    setExerciseEdits(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
  };

  const calculateCaloriesBurned = (exercises: Exercise[]): number => {
    // Estimación simple: ~5 calorías por serie completada
    let totalCalories = 0;
    exercises.forEach((exercise, idx) => {
      if (completedExercises.has(idx)) {
        const sets = exerciseEdits[idx]?.sets || exercise.sets;
        totalCalories += sets * 5;
      }
    });
    return totalCalories;
  };

  const finishWorkout = async () => {
    if (!workoutPlan) return;

    const dayIndex = selectedDay + 1;
    const dayWorkout = workoutPlan.days.find(d => d.dayIndex === dayIndex);
    if (!dayWorkout) return;

    const totalExercises = dayWorkout.exercises.length;
    const completedCount = completedExercises.size;
    const caloriesBurned = calculateCaloriesBurned(dayWorkout.exercises);
    const durationMinutes = Math.floor(elapsedTime / 60);

    // Preparar ejercicios con modificaciones
    const exercisesWithEdits = dayWorkout.exercises.map((exercise, idx) => ({
      ...exercise,
      ...(exerciseEdits[idx] || {}),
      completed: completedExercises.has(idx)
    }));

    const summary = {
      totalExercises,
      completedCount,
      caloriesBurned,
      durationMinutes,
      completionRate: Math.round((completedCount / totalExercises) * 100),
      exercises: exercisesWithEdits,
      dayIndex
    };

    setWorkoutSummary(summary);
    setShowWorkoutSummary(true);
    setIsWorkoutActive(false);
  };

  const saveWorkoutProgress = async () => {
    if (!workoutSummary) return;

    try {
      await WorkoutService.saveWorkoutCompletion({
        isoWeek: currentWeek,
        dayIndex: workoutSummary.dayIndex,
        durationMinutes: workoutSummary.durationMinutes,
        caloriesBurned: workoutSummary.caloriesBurned,
        completedExercises: workoutSummary.completedCount,
        totalExercises: workoutSummary.totalExercises,
        exercises: workoutSummary.exercises
      });

      Alert.alert('¡Guardado! 💾', 'Tu progreso ha sido guardado exitosamente.');
      setShowWorkoutSummary(false);
      setWorkoutSummary(null);
      
      // Recargar el plan para ver los datos actualizados
      await loadWorkoutPlan();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el progreso. Intenta de nuevo.');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenVideo = async (query: string) => {
    try {
      // Usar directamente el enlace web para mayor compatibilidad
      const searchQuery = encodeURIComponent(query);
      const webUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
      
      await Linking.openURL(webUrl);
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir YouTube');
    }
  };

  // Función para formatear instrucciones con saltos de línea
  const formatInstructions = (text: string): string[] => {
    // Dividir por números seguidos de punto (1. 2. 3. etc.)
    const steps = text.split(/(?=\d+\.\s)/);
    return steps
      .map(step => step.trim())
      .filter(step => step.length > 0);
  };

  const renderExercise = (exercise: Exercise, index: number) => {
    const isCompleted = completedExercises.has(index);
    const edits = exerciseEdits[index] || {};
    const currentSets = edits.sets ?? exercise.sets;
    const currentReps = edits.reps ?? exercise.reps;
    const currentWeight = edits.weight ?? exercise.weight;

    return (
      <View key={index} style={[
        styles.exerciseCard,
        isCompleted && styles.exerciseCardCompleted
      ]}>
        {/* Check button */}
        {isWorkoutActive && (
          <TouchableOpacity
            style={[styles.checkButton, isCompleted && styles.checkButtonCompleted]}
            onPress={() => toggleExerciseComplete(index, exercise.restSeconds || 60)}
            activeOpacity={0.7}
          >
            {isCompleted ? (
              <View style={styles.checkButtonContent}>
                <Text style={styles.checkButtonIcon}>✓</Text>
              </View>
            ) : (
              <View style={styles.checkButtonContent}>
                <View style={styles.checkButtonInner} />
                <Text style={styles.checkButtonLabel}>Marcar</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.exerciseHeader}>
          <Text style={[styles.exerciseNumber, isCompleted && styles.exerciseNumberCompleted]}>
            {index + 1}
          </Text>
          <View style={styles.exerciseInfo}>
            <Text style={[styles.exerciseName, isCompleted && styles.exerciseNameCompleted]}>
              {exercise.name}
            </Text>
            {exercise.muscleGroup && (
              <Text style={styles.muscleGroup}>🎯 {exercise.muscleGroup}</Text>
            )}
          </View>
          {exercise.videoQuery && (
            <TouchableOpacity 
              style={styles.videoButton}
              onPress={() => handleOpenVideo(exercise.videoQuery!)}
            >
              <Text style={styles.videoButtonText}>📺</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Editable details */}
        <View style={styles.exerciseDetails}>
          <View style={styles.exerciseDetail}>
            <Text style={styles.detailLabel}>Series</Text>
            {isWorkoutActive ? (
              <View style={styles.editableValue}>
                <TouchableOpacity onPress={() => updateExerciseValue(index, 'sets', Math.max(1, currentSets - 1))}>
                  <Text style={styles.editButton}>−</Text>
                </TouchableOpacity>
                <Text style={styles.detailValue}>{currentSets}</Text>
                <TouchableOpacity onPress={() => updateExerciseValue(index, 'sets', currentSets + 1)}>
                  <Text style={styles.editButton}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.detailValue}>{currentSets}</Text>
            )}
          </View>
          <View style={styles.exerciseDetail}>
            <Text style={styles.detailLabel}>Reps</Text>
            <Text style={styles.detailValue}>{currentReps}</Text>
          </View>
          {currentWeight !== null && currentWeight !== undefined && (
            <View style={styles.exerciseDetail}>
              <Text style={styles.detailLabel}>Peso (kg)</Text>
              {isWorkoutActive ? (
                <View style={styles.editableValue}>
                  <TouchableOpacity onPress={() => updateExerciseValue(index, 'weight', Math.max(0, (currentWeight || 0) - 2.5))}>
                    <Text style={styles.editButton}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.detailValue}>{currentWeight || 0}</Text>
                  <TouchableOpacity onPress={() => updateExerciseValue(index, 'weight', (currentWeight || 0) + 2.5)}>
                    <Text style={styles.editButton}>+</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.detailValue}>{currentWeight}</Text>
              )}
            </View>
          )}
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
            {formatInstructions(exercise.instructions).map((instruction, idx) => (
              <Text key={idx} style={styles.instructionsText}>
                {instruction}
              </Text>
            ))}
          </View>
        )}

        {exercise.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.exerciseNotes}>💡 Notas:</Text>
            {formatInstructions(exercise.notes).map((note, idx) => (
              <Text key={idx} style={styles.noteText}>
                {note}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderDaySelector = () => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    return (
      <View style={styles.daySelector}>
        {days.map((day, index) => {
          const dayIndex = index + 1;
          const dayWorkout = workoutPlan?.days.find(d => d.dayIndex === dayIndex);
          const hasWorkout = !!dayWorkout;
          const isCompleted = dayWorkout?.completed || false;
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
                isCompleted && styles.dayButtonCompleted,
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
              {isCompleted && <Text style={styles.dayCompletedIcon}>✓</Text>}
              {hasWorkout && !isCompleted && <View style={styles.dayIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
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
        {/* Completed workout banner */}
        {dayWorkout.completed && !isWorkoutActive && (
          <View style={styles.completedBanner}>
            <View style={styles.completedHeader}>
              <Text style={styles.completedTitle}>✓ Rutina Completada</Text>
              <Text style={styles.completedDate}>
                {dayWorkout.completedAt ? new Date(dayWorkout.completedAt).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : ''}
              </Text>
            </View>
            <View style={styles.completedStats}>
              <View style={styles.completedStat}>
                <Text style={styles.completedStatValue}>
                  {dayWorkout.durationMinutes || 0}
                </Text>
                <Text style={styles.completedStatLabel}>minutos</Text>
              </View>
              <View style={styles.completedStat}>
                <Text style={styles.completedStatValue}>
                  {dayWorkout.caloriesBurned || 0}
                </Text>
                <Text style={styles.completedStatLabel}>kcal</Text>
              </View>
            </View>
          </View>
        )}

        {/* Timer and controls */}
        {isWorkoutActive && (
          <>
            {/* Hint banner */}
            {completedExercises.size === 0 && (
              <View style={styles.hintBanner}>
                <Text style={styles.hintBannerText}>
                  👉 Presiona "Marcar" en cada ejercicio al completarlo
                </Text>
              </View>
            )}
            
            <View style={styles.timerContainer}>
              <View style={styles.timerContent}>
                <Text style={styles.timerLabel}>⏱️ Tiempo</Text>
                <Text style={styles.timerValue}>{formatTime(elapsedTime)}</Text>
              </View>
              <View style={styles.timerStats}>
                <Text style={styles.timerStat}>
                  ✓ {completedExercises.size}/{dayWorkout.exercises.length}
                </Text>
                <Text style={styles.timerStat}>
                  🔥 ~{calculateCaloriesBurned(dayWorkout.exercises)} kcal
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Start/Finish buttons */}
        <View style={styles.workoutControls}>
          {!isWorkoutActive ? (
            <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
              <LinearGradient
                colors={GRADIENTS.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButtonGradient}
              >
                <Text style={styles.startButtonText}>
                  {dayWorkout.completed ? '🔄 Repetir Rutina' : '▶️ Iniciar Rutina'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.finishButton} onPress={finishWorkout}>
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.finishButtonGradient}
              >
                <Text style={styles.finishButtonText}>✓ Finalizar y Guardar</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
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
            {/* Day Selector */}
            {renderDaySelector()}

            {/* Workout Content */}
            {renderWorkoutDay()}
          </>
        ) : (
          <View style={styles.noPlanContainer}>
            <View style={styles.chapiEmptyContainer}>
              <Image 
                source={require('../assets/chapi-3d-ejercicio-3.png')}
                style={styles.chapiEmptyImage}
                resizeMode="cover"
              />
            </View>
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
        type="workout"
      />

      {/* Workout Summary Modal */}
      {showWorkoutSummary && workoutSummary && (
        <Modal
          visible={showWorkoutSummary}
          transparent
          animationType="fade"
          onRequestClose={() => setShowWorkoutSummary(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.summaryModal}>
              <Text style={styles.summaryTitle}>¡Rutina Completada! 🎉</Text>
              
              <View style={styles.summaryStats}>
                <View style={styles.summaryStatCard}>
                  <Text style={styles.summaryStatValue}>{workoutSummary.durationMinutes}</Text>
                  <Text style={styles.summaryStatLabel}>minutos</Text>
                </View>
                <View style={styles.summaryStatCard}>
                  <Text style={styles.summaryStatValue}>{workoutSummary.caloriesBurned}</Text>
                  <Text style={styles.summaryStatLabel}>kcal quemadas</Text>
                </View>
              </View>

              <View style={styles.summaryProgress}>
                <Text style={styles.summaryProgressText}>
                  Completaste {workoutSummary.completedCount} de {workoutSummary.totalExercises} ejercicios
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${workoutSummary.completionRate}%` }]} />
                </View>
                <Text style={styles.summaryProgressPercent}>{workoutSummary.completionRate}%</Text>
              </View>

              {/* Action buttons */}
              <View style={styles.summaryActions}>
                <TouchableOpacity
                  style={styles.summarySaveButton}
                  onPress={saveWorkoutProgress}
                >
                  <LinearGradient
                    colors={GRADIENTS.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.summaryButtonGradient}
                  >
                    <Text style={styles.summaryButtonText}>💾 Guardar Progreso</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.summaryDiscardButton}
                  onPress={() => {
                    setShowWorkoutSummary(false);
                    setWorkoutSummary(null);
                  }}
                >
                  <Text style={styles.summaryDiscardText}>Descartar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Rest Timer Modal */}
      <RestTimerModal
        visible={showRestTimer}
        restSeconds={currentRestSeconds}
        onClose={() => setShowRestTimer(false)}
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
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textLight,
  },
  daySelector: {
    backgroundColor: 'transparent',
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: 12,
    height: 50,
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
  dayButtonCompleted: {
    backgroundColor: 'rgba(67, 233, 123, 0.2)',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  dayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  dayTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  dayTextDisabled: {
    color: '#ccc',
  },
  dayIndicator: {
    position: 'absolute',
    bottom: 3,
    width: 6,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#fff',
  },
  dayCompletedIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '800',
  },
  workoutContainer: {
    flex: 1,
    padding: 12, // Reducido de 20 a 12
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
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 249, 196, 0.3)', // Very light yellow
    borderRadius: 12,
  },
  exerciseNotes: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 8,
  },
  noWorkoutContainer: {
    alignItems: 'center',
    padding: 40,
    minHeight: 200,
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
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  chapiEmptyContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  chapiEmptyImage: {
    width: 120,
    height: 120,
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
    lineHeight: 22,
    marginBottom: 8,
    paddingLeft: 4,
  },
  // Workout active styles
  completedBanner: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.glow,
  },
  completedHeader: {
    marginBottom: 12,
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  completedDate: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  completedStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  completedStat: {
    alignItems: 'center',
  },
  completedStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  completedStatLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  hintBanner: {
    backgroundColor: 'rgba(67, 233, 123, 0.15)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  hintBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  timerContainer: {
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  timerContent: {
    alignItems: 'center',
    marginBottom: 8,
  },
  timerLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
    marginBottom: 2,
  },
  timerValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  timerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  timerStat: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  workoutControls: {
    marginBottom: 10,
  },
  startButton: {
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.glow,
  },
  startButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  finishButton: {
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.glow,
  },
  finishButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  exerciseCardCompleted: {
    opacity: 0.7,
    backgroundColor: 'rgba(67, 233, 123, 0.1)',
  },
  checkButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    minWidth: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...SHADOWS.card,
  },
  checkButtonCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkButtonInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: '#fff',
  },
  checkButtonIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  checkButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  exerciseNumberCompleted: {
    backgroundColor: 'rgba(67, 233, 123, 0.3)',
  },
  exerciseNameCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  editableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    paddingHorizontal: 8,
  },
  // Summary modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  summaryModal: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.glow,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  summaryStatCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 16,
    flex: 1,
    marginHorizontal: 6,
  },
  summaryStatValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  summaryProgress: {
    marginBottom: 24,
  },
  summaryProgressText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 12,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  summaryProgressPercent: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
  },
  summaryActions: {
    gap: 12,
    width: '100%',
  },
  summarySaveButton: {
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.glow,
  },
  summaryButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  summaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryDiscardButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  summaryDiscardText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
});
