import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NutritionService } from '../services/nutritionService';
import { WeeklyPlan, WeeklyPlanMeal, ShoppingListItem, CheckinResponse, Checkin } from '../types/nutrition';
import { PlanGeneratingModal } from '../components/PlanGeneratingModal';
import { ShoppingListModal } from '../components/ShoppingListModal';
import { DailyCheckinModal } from '../components/DailyCheckinModal';
import { LogMealModal } from '../components/LogMealModal';
import { AppHeader } from '../components/AppHeader';
import { NotificationBadge } from '../components/NotificationBadge';
import { HydrationCard } from '../components/HydrationCard';
import { HydrationSetupModal } from '../components/HydrationSetupModal';
import { LogWaterModal } from '../components/LogWaterModal';
import WorkoutService from '../services/workoutService';
import type { WorkoutPlan, WorkoutDay, Exercise } from '../types/nutrition';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface HomeScreenProps {
  onNavigateToWorkout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToWorkout }) => {
  const [user, setUser] = React.useState<any>(null);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [weeklyPlan, setWeeklyPlan] = React.useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [currentWeek, setCurrentWeek] = React.useState<string>('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generationProgress, setGenerationProgress] = React.useState(0);
  const [showShoppingListModal, setShowShoppingListModal] = React.useState(false);
  const [shoppingListItems, setShoppingListItems] = React.useState<ShoppingListItem[]>([]);
  const [loadingShoppingList, setLoadingShoppingList] = React.useState(false);
  const [shoppingListTotal, setShoppingListTotal] = React.useState(0);
  const [showCheckinModal, setShowCheckinModal] = React.useState(false);
  const [todayCheckin, setTodayCheckin] = React.useState<Checkin | null>(null);
  const [gamificationData, setGamificationData] = React.useState<CheckinResponse['gamification'] | null>(null);
  const [todayWorkout, setTodayWorkout] = React.useState<WorkoutDay | null>(null);
  const [hasWorkoutPlan, setHasWorkoutPlan] = React.useState(false);
  const [loadingWorkout, setLoadingWorkout] = React.useState(false);
  const [todayMealsConsumed, setTodayMealsConsumed] = React.useState<any>(null);
  const [showLogMealModal, setShowLogMealModal] = React.useState(false);
  const [showHydrationSetup, setShowHydrationSetup] = React.useState(false);
  const [showLogWater, setShowLogWater] = React.useState(false);
  const [hydrationKey, setHydrationKey] = React.useState(0); // Para forzar refresh

  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('userData');
      const profileData = await AsyncStorage.getItem('userProfile');

      if (userData) setUser(JSON.parse(userData));
      if (profileData) setUserProfile(JSON.parse(profileData));

      // Obtener semana actual y plan semanal
      const week = NutritionService.getCurrentWeek();
      setCurrentWeek(week);

      const plan = await NutritionService.getWeeklyPlan(week);
      setWeeklyPlan(plan);

      // Cargar checkin del día
      const checkin = await NutritionService.getTodayCheckin();
      setTodayCheckin(checkin);

      // Cargar comidas consumidas del día
      const mealsConsumed = await NutritionService.getTodayMeals();
      setTodayMealsConsumed(mealsConsumed);

      // Cargar workout del día
      loadWorkoutPlan();
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkoutPlan = async () => {
    try {
      setLoadingWorkout(true);
      const week = WorkoutService.getCurrentISOWeek();
      const workoutPlan = await WorkoutService.getWorkoutPlan(week);
      
      if (workoutPlan) {
        setHasWorkoutPlan(true);
        // Obtener workout del día actual
        const today = new Date().getDay();
        const todayDayIndex = today === 0 ? 7 : today;
        const todayWorkoutDay = workoutPlan.days.find(day => day.dayIndex === todayDayIndex);
        setTodayWorkout(todayWorkoutDay || null);
      } else {
        setHasWorkoutPlan(false);
        setTodayWorkout(null);
      }
    } catch (error) {
      console.log('Error loading workout:', error);
      setHasWorkoutPlan(false);
    } finally {
      setLoadingWorkout(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleGeneratePlan = async () => {
    try {
      setIsGenerating(true);
      setGenerationProgress(10);

      // Iniciar la generación del plan
      const generateResponse = await NutritionService.generatePlanWithAI(currentWeek);

      if (generateResponse.created) {
        // Iniciar polling para verificar si el plan está listo
        pollForPlan(generateResponse.planId);
      }
    } catch (error: any) {
      console.log('Error generating plan:', error);
      
      // Si es un 504 Gateway Timeout, el plan se está creando en background
      if (error.response?.status === 504) {
        console.log('⏰ 504 Gateway Timeout - Plan creating in background, starting polling...');
        setGenerationProgress(20);
        // Generar un planId temporal basado en la semana
        const tempPlanId = `${currentWeek}-${Date.now()}`;
        // Iniciar polling de todas formas
        pollForPlan(tempPlanId);
        return;
      }

      setIsGenerating(false);
      setGenerationProgress(0);

      let errorMessage = 'No se pudo generar el plan. Intenta de nuevo.';

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'La generación del plan está tardando más de lo esperado. El plan se está creando en segundo plano, puedes refrescar en unos minutos.';
      }

      Alert.alert('Error', errorMessage);
    }
  };

  const pollForPlan = async (planId: string, attempts: number = 0) => {
    const maxAttempts = 20; // 20 intentos = ~2 minutos
    
    // Si el planId contiene la semana, es un ID temporal (viene de 504)
    const is504Timeout = planId.includes(currentWeek);
    
    // Intervalo adaptativo: 10s para 504, 6s para normal
    const pollInterval = is504Timeout ? 10000 : 6000;

    // Actualizar progreso basado en intentos
    const progress = Math.min(20 + (attempts / maxAttempts) * 75, 95);
    setGenerationProgress(progress);

    console.log(`🔄 Polling attempt ${attempts + 1}/${maxAttempts} for nutrition plan`);

    try {
      // Intentar obtener el plan actualizado
      const plan = await NutritionService.getWeeklyPlan(currentWeek);

      console.log('📋 Plan received:', plan ? `ID: ${plan.id}, Days: ${plan.days?.length}` : 'null');

      // Verificar si el plan existe (sin importar el ID si fue un 504)
      const isPlanReady = plan && (plan.id === planId || planId.includes(currentWeek));
      
      if (isPlanReady) {
        // El plan está listo
        console.log('✅ Nutrition plan is ready!');
        setGenerationProgress(100);
        setTimeout(() => {
          setWeeklyPlan(plan);
          setIsGenerating(false);
          setGenerationProgress(0);
          Alert.alert('¡Listo! 🎉', 'Tu plan nutricional personalizado ha sido creado exitosamente.');
        }, 1000); // Pequeña pausa para mostrar 100%
        return;
      }

      // Si no está listo y no hemos alcanzado el máximo de intentos
      if (attempts < maxAttempts) {
        console.log(`⏳ Plan not ready yet, will retry in ${pollInterval/1000} seconds...`);
        setTimeout(() => {
          pollForPlan(planId, attempts + 1);
        }, pollInterval);
      } else {
        // Timeout - el plan tardó demasiado
        console.log('⏰ Polling timeout reached');
        setIsGenerating(false);
        setGenerationProgress(0);
        Alert.alert(
          'Plan en proceso',
          'Tu plan se está generando y estará listo pronto. Puedes refrescar la pantalla en unos minutos.',
          [
            {
              text: 'Refrescar ahora',
              onPress: () => {
                loadData();
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
      console.log('❌ Error polling for plan:', error);

      // Si no hemos alcanzado el máximo de intentos, continuar
      if (attempts < maxAttempts) {
        setTimeout(() => {
          pollForPlan(planId, attempts + 1);
        }, pollInterval);
      } else {
        setIsGenerating(false);
        setGenerationProgress(0);
        Alert.alert('Error', 'Hubo un problema verificando tu plan. Intenta refrescar la pantalla.');
      }
    }
  };

  // Obtener las comidas del día actual
  const getTodayMeals = (): WeeklyPlanMeal[] => {
    if (!weeklyPlan) return [];

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, etc.
    const dayIndex = dayOfWeek === 0 ? 7 : dayOfWeek; // Convertir a formato ISO (1 = lunes, 7 = domingo)

    const todayPlan = weeklyPlan.days.find(day => day.dayIndex === dayIndex);
    return todayPlan?.meals || [];
  };

  const todayMeals = getTodayMeals();
  const totalPlannedToday = todayMeals.reduce((sum, meal) => sum + meal.kcal, 0);
  const totalConsumedToday = todayMealsConsumed?.totals?.kcal || 0;
  const caloriesTarget = weeklyPlan?.macros.kcalTarget || 2000;
  const remainingCalories = Math.max(0, caloriesTarget - totalConsumedToday);

  // Macros consumidos con valores por defecto
  const consumedProtein = todayMealsConsumed?.totals?.protein_g || 0;
  const consumedCarbs = todayMealsConsumed?.totals?.carbs_g || 0;
  const consumedFat = todayMealsConsumed?.totals?.fat_g || 0;

  const getMealTypeLabel = (slot: string): string => {
    const labels: { [key: string]: string } = {
      'BREAKFAST': 'Desayuno',
      'LUNCH': 'Almuerzo',
      'DINNER': 'Cena',
      'SNACK': 'Snack'
    };
    return labels[slot] || slot;
  };

  const handleGenerateShoppingList = async () => {
    if (!weeklyPlan) return;

    try {
      setLoadingShoppingList(true);
      setShowShoppingListModal(true);

      const response = await NutritionService.getShoppingList(weeklyPlan.id, 500);
      setShoppingListItems(response.items);
      setShoppingListTotal(response.total);
    } catch (error) {
      console.log('Error generating shopping list:', error);
      Alert.alert('Error', 'No se pudo generar la lista de compras');
      setShowShoppingListModal(false);
    } finally {
      setLoadingShoppingList(false);
    }
  };

  const closeShoppingListModal = () => {
    setShowShoppingListModal(false);
    setShoppingListItems([]);
    setShoppingListTotal(0);
  };

  const handleCheckinSuccess = async (response: CheckinResponse) => {
    setGamificationData(response.gamification);
    
    // Recargar el checkin del día inmediatamente
    try {
      const checkin = await NutritionService.getTodayCheckin();
      setTodayCheckin(checkin);
    } catch (error) {
      console.log('Error reloading checkin:', error);
    }
  };

  const openCheckinModal = () => {
    setShowCheckinModal(true);
  };

  const closeCheckinModal = () => {
    setShowCheckinModal(false);
  };

  const handleLogMealSuccess = async () => {
    // Recargar comidas consumidas
    try {
      const mealsConsumed = await NutritionService.getTodayMeals();
      setTodayMealsConsumed(mealsConsumed);
    } catch (error) {
      console.log('Error reloading meals:', error);
    }
  };

  const handleDeleteMeal = async (logId: string) => {
    Alert.alert(
      "Eliminar comida",
      "¿Estás seguro de que quieres eliminar esta comida?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await NutritionService.deleteMealLog(logId);
              // Recargar comidas consumidas
              const mealsConsumed = await NutritionService.getTodayMeals();
              setTodayMealsConsumed(mealsConsumed);
              Alert.alert("Éxito", "Comida eliminada correctamente");
            } catch (error) {
              console.log('Error deleting meal:', error);
              Alert.alert("Error", "No se pudo eliminar la comida");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando tu plan...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Modern Header with Logo */}
        <AppHeader
          title={`¡Hola, ${user?.name || 'Usuario'}! 👋`}
          subtitle={weeklyPlan ? `Hoy vamos por esa energía 💪` : 'Vamos a crear tu plan nutricional'}
          showLogo={true}
          rightComponent={<NotificationBadge count={0} />}
        />

        {weeklyPlan ? (
          <>
            {/* Checkin diario */}
            <View style={styles.checkinCard}>
              <View style={styles.checkinHeader}>
                <Text style={styles.cardTitle}>Checkin diario</Text>
                {todayCheckin && (
                  <View style={styles.checkinBadge}>
                    <Text style={styles.checkinBadgeText}>✅ Completado</Text>
                  </View>
                )}
              </View>
              
              {todayCheckin ? (
                <View style={styles.checkinSummary}>
                  <View style={styles.checkinRow}>
                    {todayCheckin.weightKg && (
                      <View style={styles.checkinItem}>
                        <Text style={styles.checkinValue}>{todayCheckin.weightKg} kg</Text>
                        <Text style={styles.checkinLabel}>Peso</Text>
                      </View>
                    )}
                    {todayCheckin.adherencePct !== undefined && (
                      <View style={styles.checkinItem}>
                        <Text style={styles.checkinValue}>{todayCheckin.adherencePct}%</Text>
                        <Text style={styles.checkinLabel}>Adherencia</Text>
                      </View>
                    )}
                    {todayCheckin.hungerLvl && (
                      <View style={styles.checkinItem}>
                        <Text style={styles.checkinValue}>{todayCheckin.hungerLvl}/10</Text>
                        <Text style={styles.checkinLabel}>Hambre</Text>
                      </View>
                    )}
                  </View>
                  {todayCheckin.notes && (
                    <Text style={styles.checkinNotes}>"{todayCheckin.notes}"</Text>
                  )}
                  <TouchableOpacity style={styles.updateCheckinButton} onPress={openCheckinModal}>
                    <Text style={styles.updateCheckinButtonText}>Actualizar checkin</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.noCheckinContainer}>
                  <Text style={styles.noCheckinText}>
                    ¿Cómo te sientes hoy? Registra tu progreso diario
                  </Text>
                  <TouchableOpacity style={styles.checkinButton} onPress={openCheckinModal}>
                    <Text style={styles.checkinButtonText}>📝 Hacer checkin</Text>
                  </TouchableOpacity>
                </View>
              )}

              {gamificationData && (
                <View style={styles.gamificationInfo}>
                  <Text style={styles.gamificationTitle}>🎉 ¡Logros recientes!</Text>
                  <View style={styles.gamificationRow}>
                    <Text style={styles.gamificationText}>🔥 {gamificationData.streakDays} días</Text>
                    <Text style={styles.gamificationText}>⭐ {gamificationData.totalPoints} puntos</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Progreso Nutricional Futurista */}
            <View style={styles.nutritionProgressCard}>
              <LinearGradient
                colors={['rgba(76, 175, 80, 0.1)', 'rgba(76, 175, 80, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.nutritionProgressGradient}
              >
                <View style={styles.nutritionHeader}>
                  <View>
                    <Text style={styles.nutritionTitle}>Progreso Nutricional</Text>
                    <Text style={styles.nutritionSubtitle}>Objetivos de hoy</Text>
                  </View>
                  <View style={styles.caloriesCircle}>
                    <Text style={styles.caloriesNumber}>
                      {caloriesTarget > 0 ? Math.round((totalConsumedToday / caloriesTarget) * 100) : 0}%
                    </Text>
                    <Text style={styles.caloriesLabel}>Completado</Text>
                  </View>
                </View>

                {/* Barra de progreso principal de calorías */}
                <View style={styles.mainProgressContainer}>
                  <View style={styles.mainProgressHeader}>
                    <Text style={styles.mainProgressLabel}>Calorías</Text>
                    <Text style={styles.mainProgressNumbers}>
                      {totalConsumedToday} / {caloriesTarget} kcal
                    </Text>
                  </View>
                  <View style={styles.mainProgressBar}>
                    <LinearGradient
                      colors={GRADIENTS.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.mainProgressFill,
                        { width: `${caloriesTarget > 0 ? Math.min(100, (totalConsumedToday / caloriesTarget) * 100) : 0}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.remainingText}>
                    {remainingCalories > 0 ? `${remainingCalories} kcal restantes` : '¡Objetivo alcanzado! 🎉'}
                  </Text>
                </View>

                {/* Macronutrientes con barras de progreso */}
                <View style={styles.macrosProgressContainer}>
                  <Text style={styles.macrosProgressTitle}>Macronutrientes</Text>
                  
                  {/* Proteína */}
                  <View style={styles.macroProgressItem}>
                    <View style={styles.macroProgressHeader}>
                      <View style={styles.macroIconContainer}>
                        <Text style={styles.macroIcon}>🥩</Text>
                        <Text style={styles.macroName}>Proteína</Text>
                      </View>
                      <Text style={styles.macroNumbers}>
                        {consumedProtein}g / {weeklyPlan.macros.protein_g}g
                      </Text>
                    </View>
                    <View style={styles.macroProgressBar}>
                      <View 
                        style={[
                          styles.macroProgressFill,
                          styles.proteinFill,
                          { width: `${weeklyPlan.macros.protein_g > 0 ? Math.min(100, (consumedProtein / weeklyPlan.macros.protein_g) * 100) : 0}%` }
                        ]} 
                      />
                    </View>
                  </View>

                  {/* Carbohidratos */}
                  <View style={styles.macroProgressItem}>
                    <View style={styles.macroProgressHeader}>
                      <View style={styles.macroIconContainer}>
                        <Text style={styles.macroIcon}>🍞</Text>
                        <Text style={styles.macroName}>Carbohidratos</Text>
                      </View>
                      <Text style={styles.macroNumbers}>
                        {consumedCarbs}g / {weeklyPlan.macros.carbs_g}g
                      </Text>
                    </View>
                    <View style={styles.macroProgressBar}>
                      <View 
                        style={[
                          styles.macroProgressFill,
                          styles.carbsFill,
                          { width: `${weeklyPlan.macros.carbs_g > 0 ? Math.min(100, (consumedCarbs / weeklyPlan.macros.carbs_g) * 100) : 0}%` }
                        ]} 
                      />
                    </View>
                  </View>

                  {/* Grasas */}
                  <View style={styles.macroProgressItem}>
                    <View style={styles.macroProgressHeader}>
                      <View style={styles.macroIconContainer}>
                        <Text style={styles.macroIcon}>🥑</Text>
                        <Text style={styles.macroName}>Grasas</Text>
                      </View>
                      <Text style={styles.macroNumbers}>
                        {consumedFat}g / {weeklyPlan.macros.fat_g}g
                      </Text>
                    </View>
                    <View style={styles.macroProgressBar}>
                      <View 
                        style={[
                          styles.macroProgressFill,
                          styles.fatFill,
                          { width: `${weeklyPlan.macros.fat_g > 0 ? Math.min(100, (consumedFat / weeklyPlan.macros.fat_g) * 100) : 0}%` }
                        ]} 
                      />
                    </View>
                  </View>
                </View>

                {totalConsumedToday === 0 && (
                  <View style={styles.hintContainer}>
                    <Text style={styles.hintIcon}>💡</Text>
                    <Text style={styles.hintText}>
                      Registra tus comidas para ver tu progreso en tiempo real
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* Hidratación */}
            <HydrationCard
              key={hydrationKey}
              onSetupPress={() => setShowHydrationSetup(true)}
              onLogPress={() => setShowLogWater(true)}
            />

            {/* Workout Card */}
            <View style={styles.workoutSection}>
              <Text style={styles.sectionTitle}>Entrenamiento de hoy</Text>
              
              {!hasWorkoutPlan ? (
                <View style={styles.createPlanCard}>
                  <Image 
                    source={require('../assets/chapi-3d-ejercicio-2.png')}
                    style={styles.createPlanImage}
                    resizeMode="contain"
                  />
                  <View style={styles.createPlanContent}>
                    <Text style={styles.createPlanTitle}>Sin rutina activa</Text>
                    <Text style={styles.createPlanText}>Genera tu plan personalizado con IA</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.createPlanButton}
                    onPress={onNavigateToWorkout}
                  >
                    <Text style={styles.createPlanButtonText}>Crear</Text>
                  </TouchableOpacity>
                </View>
              ) : todayWorkout ? (
                <View style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <Text style={styles.workoutTitle}>
                      💪 {todayWorkout.exercises.length} ejercicios
                    </Text>
                    {todayWorkout.duration && (
                      <Text style={styles.workoutDuration}>⏱️ {todayWorkout.duration} min</Text>
                    )}
                  </View>
                  
                  <View style={styles.workoutPreview}>
                    {todayWorkout.exercises.slice(0, 2).map((ex, idx) => (
                      <Text key={idx} style={styles.workoutPreviewText}>
                        • {ex.name} ({ex.sets}x{ex.reps})
                      </Text>
                    ))}
                    {todayWorkout.exercises.length > 2 && (
                      <Text style={styles.workoutMoreText}>
                        + {todayWorkout.exercises.length - 2} ejercicios más
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity 
                    style={styles.viewWorkoutButton}
                    onPress={onNavigateToWorkout}
                  >
                    <LinearGradient
                      colors={GRADIENTS.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.viewWorkoutButtonGradient}
                    >
                      <Text style={styles.viewWorkoutButtonText}>Ver rutina completa</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.restDayCard}>
                  <Image 
                    source={require('../assets/chapi-3d-descansando.png')}
                    style={styles.restDayImage}
                    resizeMode="contain"
                  />
                  <View>
                    <Text style={styles.restDayTitle}>Día de descanso</Text>
                    <Text style={styles.restDayText}>¡Recupérate para mañana!</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Comidas consumidas del día */}
            <View style={styles.mealsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Comidas consumidas hoy</Text>
                {todayMealsConsumed?.logs?.length > 0 && (
                  <Text style={styles.sectionCount}>{todayMealsConsumed.logs.length}</Text>
                )}
              </View>

              {todayMealsConsumed?.logs && todayMealsConsumed.logs.length > 0 ? (
                todayMealsConsumed.logs.map((log: any, index: number) => (
                  <View key={index} style={styles.mealCard}>
                    <View style={styles.mealHeader}>
                      <View style={styles.mealHeaderLeft}>
                        <Text style={styles.mealTime}>{getMealTypeLabel(log.slot)}</Text>
                        {log.fromPlan && (
                          <View style={styles.fromPlanBadge}>
                            <Text style={styles.fromPlanText}>Plan</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.mealHeaderRight}>
                        <Text style={styles.mealCalories}>{log.kcal} kcal</Text>
                        <TouchableOpacity 
                          onPress={() => handleDeleteMeal(log.id)}
                          style={styles.deleteMealButton}
                        >
                          <Text style={styles.deleteMealIcon}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.mealDescription}>{log.title}</Text>
                    <View style={styles.mealMacros}>
                      <Text style={styles.mealMacroText}>P: {log.protein_g}g</Text>
                      <Text style={styles.mealMacroText}>C: {log.carbs_g}g</Text>
                      <Text style={styles.mealMacroText}>G: {log.fat_g}g</Text>
                    </View>
                    {log.imageUrl && (
                      <View style={styles.mealImageContainer}>
                        <Text style={styles.mealImageIcon}>📸</Text>
                        <Text style={styles.mealImageText}>Con foto</Text>
                      </View>
                    )}
                    {log.notes && (
                      <Text style={styles.mealNotes}>💡 {log.notes}</Text>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.noMealsCard}>
                  <View style={styles.chapiMealContainer}>
                    <Image 
                      source={require('../assets/chapi-3d-foto-alimento.png')}
                      style={styles.chapiMealImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.noMealsText}>
                    No has registrado comidas hoy
                  </Text>
                  <Text style={styles.noMealsHint}>
                    Usa el botón flotante para registrar tus comidas
                  </Text>
                </View>
              )}
            </View>

            {/* Notas del plan */}
            {weeklyPlan.notes && (
              <View style={styles.notesCard}>
                <Text style={styles.cardTitle}>Motivación</Text>
                <Text style={styles.notesText}>{weeklyPlan.notes}</Text>
              </View>
            )}

            {/* Botón de lista de compras */}
            <TouchableOpacity style={styles.shoppingButtonFull} onPress={handleGenerateShoppingList}>
              <LinearGradient
                colors={GRADIENTS.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shoppingButtonGradient}
              >
                <Text style={styles.shoppingButtonText}>📋 Lista de compras</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          /* No hay plan - Mostrar opción para crear */
          <View style={styles.noPlanContainer}>
            <View style={styles.noPlanCard}>
              <Text style={styles.noPlanTitle}>¡Crea tu primer plan!</Text>
              <Text style={styles.noPlanDescription}>
                No tienes un plan nutricional para esta semana. Genera uno personalizado con IA.
              </Text>
              <TouchableOpacity style={styles.createPlanButton} onPress={handleGeneratePlan}>
                <Text style={styles.createPlanButtonText}>🤖 Crear plan con IA</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal de generación de plan */}
      <PlanGeneratingModal
        visible={isGenerating}
        progress={generationProgress}
      />

      {/* Modal de lista de compras */}
      <ShoppingListModal
        visible={showShoppingListModal}
        onClose={closeShoppingListModal}
        items={shoppingListItems}
        loading={loadingShoppingList}
        total={shoppingListTotal}
        planId={weeklyPlan?.id}
      />

      {/* Modal de checkin diario */}
      <DailyCheckinModal
        visible={showCheckinModal}
        onClose={closeCheckinModal}
        onSuccess={handleCheckinSuccess}
      />

      {/* Modal de registrar comida */}
      <LogMealModal
        visible={showLogMealModal}
        onClose={() => setShowLogMealModal(false)}
        onSuccess={handleLogMealSuccess}
      />

      {/* Modal de configuración de hidratación */}
      <HydrationSetupModal
        visible={showHydrationSetup}
        onClose={() => setShowHydrationSetup(false)}
        onPlanCreated={() => {
          setHydrationKey(prev => prev + 1); // Forzar refresh de HydrationCard
        }}
      />

      {/* Modal de registrar agua */}
      <LogWaterModal
        visible={showLogWater}
        onClose={() => setShowLogWater(false)}
        onLogSuccess={() => {
          setHydrationKey(prev => prev + 1); // Forzar refresh de HydrationCard
        }}
      />

      {/* Botón flotante para agregar comida */}
      {weeklyPlan && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setShowLogMealModal(true)}
        >
          <Image 
            source={require('../assets/chapi-3d-foto-alimento.png')}
            style={styles.floatingButtonImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}
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
  // Cards
  checkinCard: {
    backgroundColor: COLORS.card,
    margin: 20,
    padding: 24,
    borderRadius: 24,
    ...SHADOWS.card,
    borderLeftWidth: 0, // Remove old border
    // New futuristic border
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.2)',
  },
  progressCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 24,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.2)',
  },
  macrosCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 24,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.2)',
  },
  workoutSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  workoutCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    ...SHADOWS.glow, // Glow for workout
    shadowColor: COLORS.primaryStart,
    shadowOpacity: 0.15,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.3)',
  },
  mealsSection: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for bottom tabs
  },
  mealCard: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    ...SHADOWS.card,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryStart,
  },
  
  // Text Styles
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  
  // Checkin Specific
  checkinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkinBadge: {
    backgroundColor: 'rgba(67, 233, 123, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.3)',
  },
  checkinBadgeText: {
    color: '#00C853',
    fontSize: 12,
    fontWeight: '700',
  },
  checkinSummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    padding: 16,
  },
  checkinRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  checkinItem: {
    alignItems: 'center',
  },
  checkinValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryStart,
    marginBottom: 4,
  },
  checkinLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  checkinNotes: {
    fontSize: 14,
    color: COLORS.text,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  updateCheckinButton: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(67, 233, 123, 0.1)',
  },
  updateCheckinButtonText: {
    color: COLORS.primaryStart,
    fontSize: 14,
    fontWeight: '600',
  },

  
  // Progress Specific
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    fontWeight: '600',
  },
  progressHint: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  floatingButtonImage: {
    width: 60,
    height: 60,
  },
  floatingButtonText: {
    fontSize: 28,
  },
  progressDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.divider,
  },
  remaining: {
    color: COLORS.warning,
  },

  // Macros Specific
  macrosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dailyBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  dailyBadgeText: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '700',
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  macroLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },

  // Workout Specific
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  workoutDuration: {
    fontSize: 13,
    color: COLORS.textLight,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontWeight: '600',
  },
  workoutPreview: {
    marginBottom: 20,
  },
  workoutPreviewText: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  workoutMoreText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 4,
  },
  viewWorkoutButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  viewWorkoutButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  viewWorkoutButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },

  // Create Plan Card
  createPlanCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  createPlanImage: {
    width: 60,
    height: 60,
    marginRight: 16,
  },
  createPlanContent: {
    flex: 1,
  },
  createPlanTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  createPlanText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  createPlanButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginLeft: 12,
    ...SHADOWS.glow,
    shadowOpacity: 0.2,
  },
  createPlanButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // Rest Day
  restDayCard: {
    backgroundColor: 'rgba(67, 233, 123, 0.1)',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.2)',
  },
  restDayImage: {
    width: 70,
    height: 70,
    marginRight: 20,
  },
  restDayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  restDayText: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
  },

  // Meal Specific
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTime: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: 'rgba(67, 233, 123, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealDescription: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 22,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: 16,
  },
  mealMacroText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: 'rgba(67, 233, 123, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteMealButton: {
    padding: 4,
    marginLeft: 4,
  },
  deleteMealIcon: {
    fontSize: 18,
  },
  fromPlanBadge: {
    backgroundColor: 'rgba(67, 233, 123, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  fromPlanText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '700',
  },
  mealImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  mealImageIcon: {
    fontSize: 14,
  },
  mealImageText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  mealNotes: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  
  // Empty States
  noMealsCard: {
    backgroundColor: COLORS.card,
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  chapiMealContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.glow,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  chapiMealImage: {
    width: 100,
    height: 100,
  },
  noMealsEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  noMealsText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  noMealsHint: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  noCheckinContainer: {
    alignItems: 'center',
  },
  noCheckinText: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  checkinButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    ...SHADOWS.glow,
  },
  checkinButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // Gamification
  gamificationInfo: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  gamificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  gamificationRow: {
    flexDirection: 'row',
    gap: 16,
  },
  gamificationText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },

  // Notes
  notesCard: {
    backgroundColor: '#FFF9C4', // Soft yellow
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  notesText: {
    fontSize: 15,
    color: '#F57F17',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },

  // No Plan
  noPlanContainer: {
    padding: 20,
  },
  noPlanCard: {
    backgroundColor: COLORS.card,
    padding: 32,
    borderRadius: 32,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  noPlanTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  noPlanDescription: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  shoppingButtonFull: {
    marginHorizontal: 20,
    marginVertical: 24,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.glow,
  },
  shoppingButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  shoppingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Nutrition Progress Card - Futuristic Design
  nutritionProgressCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.glow,
    shadowColor: COLORS.primaryStart,
    shadowOpacity: 0.1,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.2)',
  },
  nutritionProgressGradient: {
    padding: 24,
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  nutritionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  nutritionSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 2,
  },
  caloriesCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 3,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caloriesNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  caloriesLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 2,
  },

  // Main Progress Bar (Calories)
  mainProgressContainer: {
    marginBottom: 24,
  },
  mainProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mainProgressLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  mainProgressNumbers: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  mainProgressBar: {
    height: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  mainProgressFill: {
    height: '100%',
    borderRadius: 6,
  },
  remainingText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Macros Progress
  macrosProgressContainer: {
    marginBottom: 16,
  },
  macrosProgressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  macroProgressItem: {
    marginBottom: 16,
  },
  macroProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  macroIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  macroName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  macroNumbers: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  macroProgressBar: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  proteinFill: {
    backgroundColor: '#FF6B6B', // Rojo para proteína
  },
  carbsFill: {
    backgroundColor: '#4ECDC4', // Turquesa para carbohidratos
  },
  fatFill: {
    backgroundColor: '#45B7D1', // Azul para grasas
  },

  // Hint Container
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  hintIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  hintText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
    flex: 1,
  },
});