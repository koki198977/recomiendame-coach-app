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
} from 'react-native';
import { NutritionService } from '../services/nutritionService';
import { SocialService } from '../services/socialService';
import { AchievementsService } from '../services/achievementsService';
import { Checkin, Achievement } from '../types/nutrition';
import { TrophyModal } from '../components/TrophyModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export const ProgressScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showTrophyModal, setShowTrophyModal] = useState(false);
  const [selectedTrophy, setSelectedTrophy] = useState<Achievement | null>(null);

  useEffect(() => {
    loadCheckinHistory();
  }, [selectedPeriod]);

  // Cargar logros cuando cambien los checkins
  useEffect(() => {
    if (checkins.length >= 0) { // Ejecutar incluso si no hay checkins (array vacío)
      loadAchievements();
    }
  }, [checkins]);

  const loadCheckinHistory = async () => {
    try {
      setLoading(true);
      const now = new Date();
      let from: string;
      
      if (selectedPeriod === 'week') {
        // Inicio de la semana actual (lunes)
        const startOfWeek = new Date(now);
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si es domingo (0), retroceder 6 días
        startOfWeek.setDate(now.getDate() - daysToMonday);
        from = startOfWeek.toISOString().split('T')[0];
      } else if (selectedPeriod === 'month') {
        // Inicio del mes actual
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        from = startOfMonth.toISOString().split('T')[0];
      } else {
        // Inicio del año actual
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        from = startOfYear.toISOString().split('T')[0];
      }
      
      const to = now.toISOString().split('T')[0];
      const history = await NutritionService.getCheckinHistory(from, to);
      
      // La función ya devuelve un array validado
      setCheckins(history);
    } catch (error) {
      console.log('Error loading checkin history:', error);
      setCheckins([]); // Asegurar que siempre sea un array
    } finally {
      setLoading(false);
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
        
        console.log('🏆 Calculando logros con TODOS los checkins:', {
          totalCheckins: allCheckins.length,
          checkins: allCheckins.map(c => ({ id: c.id, date: c.date }))
        });
      } catch (error) {
        console.log('Error loading all checkins for achievements:', error);
        // Fallback: usar los checkins del período actual
        allCheckins = Array.isArray(checkins) ? checkins : [];
      }
      
      // Calcular estadísticas
      const totalCheckins = allCheckins.length;
      const streakDays = await getStreakDays();
      const weightLoss = calculateWeightLoss(allCheckins);
      const { maxAdherence, avgAdherence } = calculateAdherenceStats(allCheckins);
      
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
      });

      // Cargar estado de trofeos compartidos
      const sharedTrophies = await loadSharedTrophies();
      
      // Marcar cuáles ya fueron compartidos
      const achievementsWithSharedStatus = calculatedAchievements.map(achievement => ({
        ...achievement,
        isShared: sharedTrophies.has(achievement.id)
      }));

      console.log('🏆 Logros calculados:', achievementsWithSharedStatus.map(a => ({
        id: a.id,
        title: a.title,
        isUnlocked: a.isUnlocked,
        isShared: a.isShared,
        progress: a.progress,
        maxProgress: a.maxProgress
      })));

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

  const calculateWeightLoss = (checkinsArray: Checkin[]): number => {
    const weightsWithDates = checkinsArray
      .filter(c => c.weightKg)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (weightsWithDates.length < 2) return 0;
    
    const initialWeight = weightsWithDates[0].weightKg!;
    const currentWeight = weightsWithDates[weightsWithDates.length - 1].weightKg!;
    
    return Math.max(0, initialWeight - currentWeight);
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
      console.log('🏆 Trofeo marcado como compartido:', achievementId);
      
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
    const initialWeight = weightsWithDates.length > 0 ? weightsWithDates[0].weightKg : null;
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Progreso</Text>
        <TouchableOpacity style={styles.photoButton}>
          <Text style={styles.photoButtonText}>📸 Foto</Text>
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      {renderPeriodSelector()}

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Cargando progreso...</Text>
          </View>
        ) : (
          <>
            {renderWeightProgress()}
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  photoButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 25,
    padding: 5,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  progressCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
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
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  weightLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  weightLoss: {
    color: '#4CAF50',
  },
  weightGain: {
    color: '#FF9800',
  },
  weightHistory: {
    marginTop: 15,
  },
  weightHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  weightHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weightHistoryDate: {
    fontSize: 14,
    color: '#666',
  },
  weightHistoryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  adherenceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  adherenceHistory: {
    marginTop: 15,
  },
  adherenceHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  adherenceHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  adherenceHistoryDate: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  adherenceBar: {
    flex: 1,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginLeft: 10,
    position: 'relative',
    justifyContent: 'center',
  },
  adherenceBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  adherenceHistoryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  chartPlaceholder: {
    backgroundColor: '#f8f8f8',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  chartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chartSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  caloriesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    marginBottom: 15,
  },
  calorieDay: {
    alignItems: 'center',
    flex: 1,
  },
  calorieBar: {
    backgroundColor: '#4CAF50',
    width: 20,
    borderRadius: 10,
    marginBottom: 5,
  },
  calorieDayText: {
    fontSize: 12,
    color: '#666',
  },
  caloriesStats: {
    alignItems: 'center',
  },
  caloriesAverage: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  caloriesTarget: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  achievementsCount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  achievementsScroll: {
    paddingRight: 20,
  },
  achievementCard: {
    width: 120,
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  achievementUnlocked: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  achievementLocked: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  achievementIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  achievementIcon: {
    fontSize: 24,
  },
  achievementIconLocked: {
    opacity: 0.5,
  },
  achievementTitle: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  achievementTitleLocked: {
    color: '#666',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarSmall: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFillSmall: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressTextSmall: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  unlockedText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
  },
});