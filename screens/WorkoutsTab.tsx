import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import WorkoutService from '../services/workoutService';
import { WorkoutPlan, WorkoutGoal, WorkoutDay, Exercise } from '../types/nutrition';
import { GenerateWorkoutModal } from '../components/GenerateWorkoutModal';
import { PlanGeneratingModal } from '../components/PlanGeneratingModal';

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
      setShowGenerateModal(false);
      setIsGenerating(true);
      setGenerationProgress(10);

      const response = await WorkoutService.generateWorkoutPlan(daysAvailable, goal);

      if (response.created) {
        setGenerationProgress(50);
        // Esperar un momento y recargar
        setTimeout(async () => {
          setGenerationProgress(90);
          await loadWorkoutPlan();
          setGenerationProgress(100);
          setTimeout(() => {
            setIsGenerating(false);
            setGenerationProgress(0);
            Alert.alert('¡Listo! 🎉', 'Tu rutina de entrenamiento ha sido generada exitosamente.');
          }, 500);
        }, 2000);
      }
    } catch (error) {
      console.log('Error generating workout plan:', error);
      setIsGenerating(false);
      setGenerationProgress(0);
      Alert.alert('Error', 'No se pudo generar la rutina. Intenta de nuevo.');
    }
  };

  const getTodayWorkout = (): WorkoutDay | null => {
    if (!workoutPlan || !workoutPlan.days) return null;

    const today = new Date().getDay();
    const todayDayIndex = today === 0 ? 7 : today;

    return workoutPlan.days.find(day => day.dayIndex === todayDayIndex) || null;
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
          <Text style={styles.detailValue}>{exercise.rest}</Text>
        </View>
      </View>

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
              <Text style={styles.generateButtonText}>🤖 Generar rutina con IA</Text>
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
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  planInfo: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#45a049',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planGoal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  planWeek: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  planDays: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  daySelector: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 15,
    minWidth: 50,
    position: 'relative',
  },
  dayButtonActive: {
    backgroundColor: '#4CAF50',
  },
  dayButtonToday: {
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  dayButtonDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  dayTextActive: {
    color: '#fff',
  },
  dayTextDisabled: {
    color: '#ccc',
  },
  dayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4CAF50',
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
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  workoutMeta: {
    flexDirection: 'row',
  },
  workoutMetaText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  exercisesList: {
    flex: 1,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  muscleGroup: {
    fontSize: 13,
    color: '#666',
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  exerciseDetail: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  exerciseNotes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
    color: '#666',
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
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  noPlanText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
