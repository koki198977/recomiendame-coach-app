import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { NutritionService } from '../services/nutritionService';
import { SocialService } from '../services/socialService';
import { AchievementsService } from '../services/achievementsService';
import { FoodPhotoStreakService } from '../services/foodPhotoStreakService';
import StorageService from '../services/storage';
import WorkoutService from '../services/workoutService';
import { Checkin, Achievement, ActivityStat } from '../types/nutrition';
import { TrophyModal } from '../components/TrophyModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader } from '../components/AppHeader';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export const ProgressScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showTrophyModal, setShowTrophyModal] = useState(false);
  const [selectedTrophy, setSelectedTrophy] = useState<Achievement | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStat[]>([]);
  const [historicalInitialWeight, setHistoricalInitialWeight] = useState<number | null>(null);

  useEffect(() => {
    const loadAllData = async () => {
      await loadCheckinHistory();
      await loadActivityStats();
      await loadHistoricalInitialWeight();
      // Cargar logros después de que todo esté listo
      await loadAchievements();
    };
    
    loadAllData();
  }, [selectedPeriod]);

  const getDateRange = () => {
    const now = new Date();
    let from: Date;
    
    if (selectedPeriod === 'week') {
      // Inicio de la semana actual (lunes)
      const startOfWeek = new Date(now);
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(now.getDate() - daysToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      from = startOfWeek;
    } else if (selectedPeriod === 'month') {
      // Inicio del mes actual
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      from.setHours(0, 0, 0, 0);
    } else {
      // Inicio del año actual
      from = new Date(now.getFullYear(), 0, 1);
      from.setHours(0, 0, 0, 0);
    }
    
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    
    return { from, to };
  };

  const loadCheckinHistory = async () => {
    try {
      setLoading(true);
      const { from, to } = getDateRange();
      
      const history = await NutritionService.getCheckinHistory(
        from.toISOString().split('T')[0],
        to.toISOString().split('T')[0]
      );
      
      setCheckins(history);
    } catch (error) {
      console.log('Error loading checkin history:', error);
      setCheckins([]);
    } finally {
      setLoading(false);
    }
  };

  const loadActivityStats = async () => {
    try {
      const { from, to } = getDateRange();
      
      const stats = await WorkoutService.getActivityStats(
        from.toISOString(),
        to.toISOString()
      );
      
      setActivityStats(stats);
    } catch (error) {
      console.log('Error loading activity stats:', error);
      setActivityStats([]);
    }
  };

  const loadHistoricalInitialWeight = async () => {
    try {
      // Primero intentar obtener el peso del perfil (peso inicial del usuario)
      let initialWeight: number | null = null;

      try {
        const profile = await NutritionService.getUserProfile();
        if (profile.weightKg) {
          initialWeight = profile.weightKg;

        }
      } catch (error) {

      }

      // Si no hay peso en el perfil, buscar el primer checkin histórico
      if (!initialWeight) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 2);
        const today = new Date();
        
        const allCheckins = await NutritionService.getCheckinHistory(
          oneYearAgo.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        );

        const weightsWithDates = allCheckins
          .filter(c => c.weightKg)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (weightsWithDates.length > 0) {
          initialWeight = weightsWithDates[0].weightKg!;
        }
      }

      if (initialWeight) {
        setHistoricalInitialWeight(initialWeight);
      }
    } catch (error) {
      console.log('❌ Error loading historical initial weight:', error);
    }
  };

  const loadAchievements = async () => {
    try {
      // Para logros necesitamos TODOS los checkins históricos, no solo del período seleccionado
      let allCheckins: Checkin[] = [];
      
      try {
        // Cargar todos los checkins desde hace un año
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const today = new Date();
        
        allCheckins = await NutritionService.getCheckinHistory(
          oneYearAgo.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        );
        

      } catch (error) {
        console.log('Error loading all checkins for achievements:', error);
        // Fallback: usar los checkins del período actual
        allCheckins = Array.isArray(checkins) ? checkins : [];
      }
      
      // Calcular estadísticas de checkins
      const totalCheckins = allCheckins.length;
      const streakDays = await getStreakDays();
      const weightLoss = await calculateWeightLoss(allCheckins);
      const { maxAdherence, avgAdherence } = calculateAdherenceStats(allCheckins);

      // Calcular estadísticas de entrenamiento
      let workoutStats = {
        totalWorkouts: 0,
        maxCaloriesInWorkout: 0,
        totalCaloriesBurned: 0,
        workoutStreakDays: 0,
        workoutsThisWeek: 0,
      };

      try {
        // Cargar estadísticas de los últimos 3 meses (más que suficiente)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        threeMonthsAgo.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        const allActivityStats = await WorkoutService.getActivityStats(
          threeMonthsAgo.toISOString(),
          today.toISOString()
        );

        workoutStats = calculateWorkoutStats(allActivityStats);
      } catch (error) {
        console.log('Error loading workout stats for achievements:', error);
      }
      
      // Datos sociales (simulados por ahora)
      let socialStats = {
        postsCount: 0,
        likesReceived: 0,
        commentsGiven: 0,
      };
      
      try {
        const socialProfile = await SocialService.getMySocialProfile();
        socialStats.postsCount = socialProfile.postsCount || 0;
      } catch (error) {
        console.log('Error loading social stats:', error);
      }

      // Verificar si tiene perfil y planes
      let hasProfile = false;
      let hasPlans = false;
      
      try {
        const profile = await NutritionService.getUserProfile();
        hasProfile = !!(profile.heightCm && profile.weightKg && profile.activityLevel);
        
        const currentWeek = NutritionService.getCurrentWeek();
        const plan = await NutritionService.getWeeklyPlan(currentWeek);
        hasPlans = !!plan;
      } catch (error) {
        console.log('Error checking profile/plans:', error);
      }

      // Obtener datos de racha de fotos de comida
      const foodPhotoStreakData = await FoodPhotoStreakService.getStreakData();

      // Cargar logros ya desbloqueados
      let unlockedAchievementIds: string[] = [];
      try {
        const existingAchievements = await StorageService.getItem('unlocked_achievements');
        unlockedAchievementIds = existingAchievements ? JSON.parse(existingAchievements) : [];
      } catch (error) {
        console.log('Error loading unlocked achievements:', error);
      }

      // Calcular logros
      const calculatedAchievements = AchievementsService.calculateAchievements({
        streakDays,
        totalCheckins,
        weightLoss,
        maxAdherence,
        avgAdherence,
        postsCount: socialStats.postsCount,
        likesReceived: socialStats.likesReceived,
        commentsGiven: socialStats.commentsGiven,
        hasProfile,
        hasPlans,
        // Estadísticas de entrenamiento
        totalWorkouts: workoutStats.totalWorkouts,
        maxCaloriesInWorkout: workoutStats.maxCaloriesInWorkout,
        totalCaloriesBurned: workoutStats.totalCaloriesBurned,
        workoutStreakDays: workoutStats.workoutStreakDays,
        workoutsThisWeek: workoutStats.workoutsThisWeek,
        // Datos de fotos de comida
        foodPhotoStreak: foodPhotoStreakData.currentStreak,
        foodPhotoLongestStreak: foodPhotoStreakData.longestStreak,
        foodPhotoTotalPhotos: foodPhotoStreakData.totalPhotos,
        foodPhotoTodayPhotos: foodPhotoStreakData.todayPhotos,
        // Logros ya desbloqueados
        unlockedAchievementIds,
      });

      // Cargar estado de trofeos compartidos
      const sharedTrophies = await loadSharedTrophies();
      
      // Marcar cuáles ya fueron compartidos
      const achievementsWithSharedStatus = calculatedAchievements.map(achievement => ({
        ...achievement,
        isShared: sharedTrophies.has(achievement.id)
      }));

      setAchievements(achievementsWithSharedStatus);
    } catch (error) {
      console.log('Error loading achievements:', error);
      setAchievements(AchievementsService.getAllAchievements());
    }
  };

  const getStreakDays = async (): Promise<number> => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const recentCheckins = await NutritionService.getCheckinHistory(
        thirtyDaysAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );
      
      // Calcular racha actual
      let streak = 0;
      const sortedCheckins = recentCheckins.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      for (let i = 0; i < sortedCheckins.length; i++) {
        const checkinDate = new Date(sortedCheckins[i].date);
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        
        if (checkinDate.toDateString() === expectedDate.toDateString()) {
          streak++;
        } else {
          break;
        }
      }
      
      return streak;
    } catch (error) {
      console.log('Error calculating streak:', error);
      return 0;
    }
  };

  const calculateWeightLoss = async (checkinsArray: Checkin[]): Promise<number> => {
    const weightsWithDates = checkinsArray
      .filter(c => c.weightKg)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (weightsWithDates.length === 0) return 0;
    
    // Obtener peso inicial del perfil
    let initialWeight = weightsWithDates[0].weightKg!;
    try {
      const profile = await NutritionService.getUserProfile();
      if (profile.weightKg) {
        initialWeight = profile.weightKg;
      }
    } catch (error) {

    }
    
    const currentWeight = weightsWithDates[weightsWithDates.length - 1].weightKg!;
    
    const loss = initialWeight - currentWeight;
    return Math.max(0, loss);
  };

  const calculateAdherenceStats = (checkinsArray: Checkin[]): { maxAdherence: number; avgAdherence: number } => {
    const adherenceData = checkinsArray.filter(c => c.adherencePct !== undefined);
    
    if (adherenceData.length === 0) {
      return { maxAdherence: 0, avgAdherence: 0 };
    }
    
    const maxAdherence = Math.max(...adherenceData.map(c => c.adherencePct!));
    const avgAdherence = adherenceData.reduce((sum, c) => sum + c.adherencePct!, 0) / adherenceData.length;
    
    return { maxAdherence, avgAdherence };
  };

  const calculateWorkoutStats = (activityStatsArray: ActivityStat[]) => {
    const workoutsWithCalories = activityStatsArray.filter(stat => stat.kcal > 0);
    
    const totalWorkouts = workoutsWithCalories.length;
    const maxCaloriesInWorkout = workoutsWithCalories.length > 0 
      ? Math.max(...workoutsWithCalories.map(s => s.kcal))
      : 0;
    const totalCaloriesBurned = workoutsWithCalories.reduce((sum, s) => sum + s.kcal, 0);

    // Calcular racha de entrenamientos
    let workoutStreakDays = 0;
    const sortedWorkouts = workoutsWithCalories.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const today = new Date();
    for (let i = 0; i < sortedWorkouts.length; i++) {
      const workoutDate = new Date(sortedWorkouts[i].date);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      if (workoutDate.toDateString() === expectedDate.toDateString()) {
        workoutStreakDays++;
      } else {
        break;
      }
    }

    // Calcular entrenamientos de esta semana
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const workoutsThisWeek = workoutsWithCalories.filter(stat => {
      const statDate = new Date(stat.date);
      return statDate >= startOfWeek;
    }).length;

    const result = {
      totalWorkouts,
      maxCaloriesInWorkout,
      totalCaloriesBurned,
      workoutStreakDays,
      workoutsThisWeek,
    };

    return result;
  };

  // Cargar estado de trofeos compartidos
  const loadSharedTrophies = async (): Promise<Set<string>> => {
    try {
      const sharedTrophies = await AsyncStorage.getItem('sharedTrophies');
      return sharedTrophies ? new Set(JSON.parse(sharedTrophies)) : new Set();
    } catch (error) {
      console.log('Error loading shared trophies:', error);
      return new Set();
    }
  };

  // Guardar que un trofeo fue compartido
  const markTrophyAsShared = async (achievementId: string) => {
    try {
      const sharedTrophies = await loadSharedTrophies();
      sharedTrophies.add(achievementId);
      await AsyncStorage.setItem('sharedTrophies', JSON.stringify([...sharedTrophies]));
      
      // Actualizar el estado local de achievements
      setAchievements(prev => prev.map(a => 
        a.id === achievementId ? { ...a, isShared: true } : a
      ));
    } catch (error) {
      console.log('Error marking trophy as shared:', error);
    }
  };

  const handleTrophyPress = (achievement: Achievement) => {
    setSelectedTrophy(achievement);
    setShowTrophyModal(true);
  };

  const handleShareTrophy = async (achievement: Achievement) => {
    try {
      const message = AchievementsService.generateTrophyShareMessage(achievement);
      
      // Crear post con el trofeo
      await SocialService.createPost({
        caption: message,
        challengeId: null,
      });
      
      // Marcar como compartido
      await markTrophyAsShared(achievement.id);
      
      Alert.alert(
        '¡Trofeo compartido! 🎉',
        'Tu logro ha sido publicado en la comunidad',
        [{ text: 'OK' }]
      );
      
      setShowTrophyModal(false);
    } catch (error) {
      console.log('Error sharing trophy:', error);
      Alert.alert('Error', 'No se pudo compartir el trofeo. Intenta de nuevo.');
    }
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['week', 'month', 'year'].map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodText,
            selectedPeriod === period && styles.periodTextActive
          ]}>
            {period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Año'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderWeightProgress = () => {
    // Validar que checkins sea un array
    const checkinsArray = Array.isArray(checkins) ? checkins : [];
    const weightsWithDates = checkinsArray
      .filter(c => c.weightKg)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const currentWeight = weightsWithDates.length > 0 ? weightsWithDates[weightsWithDates.length - 1].weightKg : null;
    // Usar el peso inicial histórico si está disponible, sino usar el del período
    const initialWeight = historicalInitialWeight || (weightsWithDates.length > 0 ? weightsWithDates[0].weightKg : null);
    const weightLoss = currentWeight && initialWeight ? initialWeight - currentWeight : 0;

    return (
      <View style={styles.progressCard}>
        <Text style={styles.cardTitle}>Progreso de Peso</Text>
        {weightsWithDates.length > 0 ? (
          <>
            <View style={styles.weightStats}>
              <View style={styles.weightItem}>
                <Text style={styles.weightNumber}>{currentWeight?.toFixed(1)}</Text>
                <Text style={styles.weightLabel}>Actual</Text>
              </View>
              <View style={styles.weightItem}>
                <Text style={styles.weightNumber}>{initialWeight?.toFixed(1)}</Text>
                <Text style={styles.weightLabel}>Inicial</Text>
              </View>
              <View style={styles.weightItem}>
                <Text style={[
                  styles.weightNumber, 
                  weightLoss > 0 ? styles.weightLoss : styles.weightGain
                ]}>
                  {weightLoss > 0 ? '-' : '+'}{Math.abs(weightLoss).toFixed(1)}
                </Text>
                <Text style={styles.weightLabel}>
                  {weightLoss > 0 ? 'Perdidos' : 'Ganados'}
                </Text>
              </View>
            </View>
            
            {/* Lista de pesos recientes */}
            <View style={styles.weightHistory}>
              <Text style={styles.weightHistoryTitle}>Historial reciente</Text>
              {weightsWithDates.slice(-5).reverse().map((checkin, index) => (
                <View key={checkin.id} style={styles.weightHistoryItem}>
                  <Text style={styles.weightHistoryDate}>
                    {new Date(checkin.date).toLocaleDateString('es-ES')}
                  </Text>
                  <Text style={styles.weightHistoryValue}>
                    {checkin.weightKg?.toFixed(1)} kg
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              No hay registros de peso aún
            </Text>
            <Text style={styles.noDataSubtext}>
              Registra tu peso en el checkin diario
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderWorkoutProgress = () => {
    const totalMinutes = activityStats.reduce((sum, stat) => sum + stat.minutes, 0);
    const totalKcal = activityStats.reduce((sum, stat) => sum + stat.kcal, 0);
    // Contar días con calorías quemadas (kcal > 0) en lugar de minutos
    const workoutDays = activityStats.filter(stat => stat.kcal > 0).length;
    const avgMinutes = workoutDays > 0 && totalMinutes > 0 ? Math.round(totalMinutes / workoutDays) : 0;

    return (
      <View style={styles.progressCard}>
        <Text style={styles.cardTitle}>Progreso de Entrenamiento</Text>
        {activityStats.length > 0 ? (
          <>
            <View style={styles.workoutStats}>
              <View style={styles.workoutItem}>
                <Text style={styles.workoutNumber}>{workoutDays}</Text>
                <Text style={styles.workoutLabel}>Días entrenados</Text>
              </View>
              <View style={styles.workoutItem}>
                <Text style={styles.workoutNumber}>{totalMinutes}</Text>
                <Text style={styles.workoutLabel}>Minutos totales</Text>
              </View>
              <View style={styles.workoutItem}>
                <Text style={styles.workoutNumber}>{totalKcal}</Text>
                <Text style={styles.workoutLabel}>Kcal quemadas</Text>
              </View>
            </View>
            
            {totalMinutes > 0 && avgMinutes > 0 && (
              <View style={styles.avgContainer}>
                <Text style={styles.avgLabel}>Promedio por sesión:</Text>
                <Text style={styles.avgValue}>{avgMinutes} minutos</Text>
              </View>
            )}
            
            {/* Lista de entrenamientos recientes */}
            <View style={styles.workoutHistory}>
              <Text style={styles.workoutHistoryTitle}>Entrenamientos recientes</Text>
              {activityStats
                .filter(stat => stat.kcal > 0)
                .slice(-5)
                .reverse()
                .map((stat) => (
                  <View key={stat.id} style={styles.workoutHistoryItem}>
                    <Text style={styles.workoutHistoryDate}>
                      {new Date(stat.date).toLocaleDateString('es-ES')}
                    </Text>
                    <View style={styles.workoutHistoryStats}>
                      {stat.minutes > 0 && (
                        <Text style={styles.workoutHistoryValue}>
                          ⏱️ {stat.minutes} min
                        </Text>
                      )}
                      <Text style={styles.workoutHistoryValue}>
                        🔥 {stat.kcal} kcal
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              No hay entrenamientos registrados aún
            </Text>
            <Text style={styles.noDataSubtext}>
              Completa una rutina para ver tus estadísticas
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderAdherenceProgress = () => {
    // Validar que checkins sea un array
    const checkinsArray = Array.isArray(checkins) ? checkins : [];
    const adherenceData = checkinsArray
      .filter(c => c.adherencePct !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const averageAdherence = adherenceData.length > 0 
      ? adherenceData.reduce((sum, c) => sum + (c.adherencePct || 0), 0) / adherenceData.length
      : 0;

    return (
      <View style={styles.progressCard}>
        <Text style={styles.cardTitle}>Adherencia al Plan</Text>
        {adherenceData.length > 0 ? (
          <>
            <View style={styles.adherenceStats}>
              <View style={styles.adherenceItem}>
                <Text style={styles.adherenceNumber}>{averageAdherence.toFixed(0)}%</Text>
                <Text style={styles.adherenceLabel}>Promedio</Text>
              </View>
              <View style={styles.adherenceItem}>
                <Text style={styles.adherenceNumber}>{adherenceData.length}</Text>
                <Text style={styles.adherenceLabel}>Días registrados</Text>
              </View>
            </View>
            
            {/* Lista de adherencia reciente */}
            <View style={styles.adherenceHistory}>
              <Text style={styles.adherenceHistoryTitle}>Últimos registros</Text>
              {adherenceData.slice(-5).reverse().map((checkin, index) => (
                <View key={checkin.id} style={styles.adherenceHistoryItem}>
                  <Text style={styles.adherenceHistoryDate}>
                    {new Date(checkin.date).toLocaleDateString('es-ES')}
                  </Text>
                  <View style={styles.adherenceBar}>
                    <View 
                      style={[
                        styles.adherenceBarFill, 
                        { width: `${checkin.adherencePct || 0}%` }
                      ]} 
                    />
                    <Text style={styles.adherenceHistoryValue}>
                      {checkin.adherencePct}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              No hay registros de adherencia aún
            </Text>
            <Text style={styles.noDataSubtext}>
              Registra tu adherencia en el checkin diario
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderAchievements = () => {
    // Mostrar logros desbloqueados primero, luego los bloqueados
    const sortedAchievements = [...achievements].sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;
      return b.progress - a.progress; // Por progreso descendente
    });

    return (
      <View style={styles.progressCard}>
        <View style={styles.achievementsHeader}>
          <Text style={styles.cardTitle}>Trofeos</Text>
          <Text style={styles.achievementsCount}>
            {achievements.filter(a => a.isUnlocked).length}/{achievements.length}
          </Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementsScroll}
        >
          {sortedAchievements.map((achievement) => (
            <TouchableOpacity
              key={achievement.id}
              style={[
                styles.achievementCard,
                achievement.isUnlocked ? styles.achievementUnlocked : styles.achievementLocked
              ]}
              onPress={() => handleTrophyPress(achievement)}
            >
              <View style={styles.achievementIconContainer}>
                <Text style={[
                  styles.achievementIcon,
                  !achievement.isUnlocked && styles.achievementIconLocked
                ]}>
                  {achievement.isUnlocked ? achievement.icon : '🔒'}
                </Text>
              </View>
              
              <Text style={[
                styles.achievementTitle,
                !achievement.isUnlocked && styles.achievementTitleLocked
              ]}>
                {achievement.title}
              </Text>
              
              {!achievement.isUnlocked && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarSmall}>
                    <View 
                      style={[
                        styles.progressFillSmall, 
                        { width: `${(achievement.progress / achievement.maxProgress) * 100}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressTextSmall}>
                    {achievement.progress}/{achievement.maxProgress}
                  </Text>
                </View>
              )}
              
              {achievement.isUnlocked && (
                <Text style={styles.unlockedText}>¡Desbloqueado!</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Custom Header with Chapi */}
      <View style={styles.customHeader}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Mi Progreso</Text>
            <Text style={styles.headerSubtitle}>Seguimiento detallado</Text>
          </View>
          <View style={styles.chapiContainer}>
            <Image 
              source={require('../assets/chapi-3d-progreso.png')}
              style={styles.chapiImage}
              resizeMode="cover"
            />
          </View>
        </View>
      </View>

      {/* Period Selector */}
      {renderPeriodSelector()}

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando progreso...</Text>
          </View>
        ) : (
          <>
            {renderWeightProgress()}
            {renderWorkoutProgress()}
            {renderAdherenceProgress()}
            {renderAchievements()}
          </>
        )}
      </ScrollView>

      {/* Trophy Modal */}
      <TrophyModal
        visible={showTrophyModal}
        achievement={selectedTrophy}
        onClose={() => setShowTrophyModal(false)}
        onShare={handleShareTrophy}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  customHeader: {
    backgroundColor: COLORS.card,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...SHADOWS.glow,
    shadowColor: COLORS.primaryStart,
    shadowOpacity: 0.1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  chapiContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.glow,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  chapiImage: {
    width: 80,
    height: 80,
  },

  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    gap: 10,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'transparent',
    ...SHADOWS.card,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.glow,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  periodTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  progressCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 24,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.2)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },
  weightStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  weightItem: {
    alignItems: 'center',
  },
  weightNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  weightLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    fontWeight: '500',
  },
  weightLoss: {
    color: COLORS.primary,
  },
  weightGain: {
    color: COLORS.warning,
  },
  weightHistory: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  weightHistoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  weightHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  weightHistoryDate: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  weightHistoryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  workoutItem: {
    alignItems: 'center',
  },
  workoutNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  workoutLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  avgContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(67, 233, 123, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  avgLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  avgValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  workoutHistory: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  workoutHistoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  workoutHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  workoutHistoryDate: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  workoutHistoryStats: {
    flexDirection: 'row',
    gap: 12,
  },
  workoutHistoryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  adherenceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  adherenceItem: {
    alignItems: 'center',
  },
  adherenceNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  adherenceLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    fontWeight: '500',
  },
  adherenceHistory: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  adherenceHistoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  adherenceHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  adherenceHistoryDate: {
    fontSize: 14,
    color: COLORS.textLight,
    width: 80,
  },
  adherenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    marginLeft: 12,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  adherenceBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  adherenceHistoryValue: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    position: 'absolute',
    right: 0,
    top: -14,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noDataText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    fontWeight: '600',
  },
  noDataSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textLight,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementsCount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: 'rgba(67, 233, 123, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  achievementsScroll: {
    paddingRight: 20,
  },
  achievementCard: {
    width: 140,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  achievementUnlocked: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(67, 233, 123, 0.05)',
  },
  achievementLocked: {
    opacity: 0.7,
    borderColor: COLORS.border,
  },
  achievementIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.card,
  },
  achievementIcon: {
    fontSize: 30,
  },
  achievementIconLocked: {
    opacity: 0.5,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
    height: 40,
  },
  achievementTitleLocked: {
    color: COLORS.textLight,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarSmall: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFillSmall: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressTextSmall: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  unlockedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
});