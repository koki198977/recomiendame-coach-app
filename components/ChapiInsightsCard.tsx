import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import ChapiService from '../services/chapiService';
import WorkoutService from '../services/workoutService';
import FreeExerciseService from '../services/freeExerciseService';
import { ChapiInsightsResponse, ChapiRecommendation } from '../types/nutrition';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';

interface ChapiInsightsCardProps {
  onPress?: () => void;
  refreshKey?: number;
}

// Cache configuration
const CACHE_KEY = 'chapi_insights_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos en millisegundos
const CACHE_VERSION = '1.0'; // Para invalidar cache cuando cambie la estructura

interface CachedInsights {
  data: ChapiInsightsResponse;
  timestamp: number;
  version: string;
  hash: string; // Hash del contexto del usuario para detectar cambios
}

interface ChapiInsightsCardProps {
  onPress?: () => void;
  refreshKey?: number;
}

export const ChapiInsightsCard: React.FC<ChapiInsightsCardProps> = ({ 
  onPress, 
  refreshKey = 0 
}) => {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<ChapiInsightsResponse | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [actualWorkoutCompleted, setActualWorkoutCompleted] = useState(false);

  useEffect(() => {
    loadInsights();
    validateWorkoutStatus();
  }, [refreshKey]);

  // Verificar si realmente hay un plan de ejercicio y si se completó hoy
  const validateWorkoutStatus = async () => {
    try {
      // Primero verificar si hay actividades libres registradas hoy
      const today = new Date().toISOString().split('T')[0];
      const freeLogs = await FreeExerciseService.getFreeExerciseLogs(today, today);
      if (freeLogs.length > 0) {
        console.log(`✅ Hay ${freeLogs.length} actividad(es) libre(s) hoy`);
        setActualWorkoutCompleted(true);
        return;
      }

      const week = WorkoutService.getCurrentISOWeek();
      const workoutPlan = await WorkoutService.getWorkoutPlan(week);
      
      if (!workoutPlan || !workoutPlan.days || workoutPlan.days.length === 0) {
        console.log('✅ No hay plan de ejercicio activo');
        setActualWorkoutCompleted(false);
        return;
      }
      
      const todayDayIndex = new Date().getDay();
      const todayIndex = todayDayIndex === 0 ? 7 : todayDayIndex;
      const todayWorkout = workoutPlan.days.find(day => day.dayIndex === todayIndex);
      
      if (!todayWorkout || todayWorkout.exercises.length === 0) {
        console.log('✅ No hay ejercicios programados para hoy');
        setActualWorkoutCompleted(false);
        return;
      }
      
      const isCompleted = todayWorkout.completed || false;
      console.log(`✅ Workout de hoy completado: ${isCompleted}`);
      setActualWorkoutCompleted(isCompleted);
    } catch (error) {
      console.log('❌ Error validando estado de ejercicio:', error);
      setActualWorkoutCompleted(false);
    }
  };

  // Generar hash simple del contexto del usuario para detectar cambios
  const generateContextHash = (data: ChapiInsightsResponse): string => {
    const context = data.data.userContext;
    const contextString = JSON.stringify({
      checkinCompleted: context.todayProgress.checkinCompleted,
      mealsLogged: context.todayProgress.mealsLogged,
      workoutCompleted: context.todayProgress.workoutCompleted,
      hydrationProgress: context.todayProgress.hydrationProgress,
      date: new Date().toDateString() // Incluir fecha para cache diario
    });
    
    // Hash simple (no criptográfico, solo para detectar cambios)
    let hash = 0;
    for (let i = 0; i < contextString.length; i++) {
      const char = contextString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    return hash.toString();
  };

  // Cargar desde cache
  const loadFromCache = async (): Promise<ChapiInsightsResponse | null> => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (!cachedData) return null;

      const parsed: CachedInsights = JSON.parse(cachedData);
      
      // Verificar versión del cache
      if (parsed.version !== CACHE_VERSION) {
        console.log('🗑️ Cache version mismatch, invalidating');
        await AsyncStorage.removeItem(CACHE_KEY);
        return null;
      }

      // Verificar si el cache ha expirado
      const now = Date.now();
      if (now - parsed.timestamp > CACHE_DURATION) {
        console.log('⏰ Cache expired, will refresh');
        await AsyncStorage.removeItem(CACHE_KEY);
        return null;
      }

      console.log('📦 Loading insights from cache');
      setIsFromCache(true);
      return parsed.data;
    } catch (error) {
      console.error('❌ Error loading cache:', error);
      return null;
    }
  };

  // Guardar en cache
  const saveToCache = async (data: ChapiInsightsResponse) => {
    try {
      const contextHash = generateContextHash(data);
      const cacheData: CachedInsights = {
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION,
        hash: contextHash
      };
      
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 Insights saved to cache');
    } catch (error) {
      console.error('❌ Error saving cache:', error);
    }
  };

  // Verificar si el contexto ha cambiado
  const hasContextChanged = async (newData: ChapiInsightsResponse): Promise<boolean> => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (!cachedData) return true;

      const parsed: CachedInsights = JSON.parse(cachedData);
      const newHash = generateContextHash(newData);
      
      const changed = parsed.hash !== newHash;
      if (changed) {
        console.log('🔄 User context changed, cache will be updated');
      }
      
      return changed;
    } catch (error) {
      console.error('❌ Error checking context change:', error);
      return true;
    }
  };

  const loadInsights = async () => {
    try {
      setLoading(true);
      setIsFromCache(false);

      // Si refreshKey cambió, forzar carga desde API (sin cache)
      if (refreshKey > 0) {
        console.log('🔄 RefreshKey changed, forcing API load');
        await loadFromAPI();
        return;
      }

      // Intentar cargar desde cache primero solo si no hay refreshKey
      const cachedInsights = await loadFromCache();
      if (cachedInsights) {
        setInsights(cachedInsights);
        setLoading(false);
        
        // Verificar en background si necesita actualización
        checkForUpdatesInBackground();
        return;
      }

      // Si no hay cache, cargar desde API
      await loadFromAPI();
    } catch (error) {
      console.log('❌ Error loading insights:', error);
      setLoading(false);
    }
  };

  const loadFromAPI = async () => {
    try {
      console.log('🌐 Loading insights from API');
      const response = await ChapiService.getInsights();
      
      if (response.success) {
        setInsights(response);
        setIsFromCache(false);
        
        // Guardar en cache
        await saveToCache(response);
      }
    } catch (error) {
      console.log('❌ Error loading from API:', error);
    } finally {
      setLoading(false);
    }
  };

  // Verificar actualizaciones en background (sin mostrar loading)
  const checkForUpdatesInBackground = async () => {
    try {
      console.log('🔍 Checking for updates in background');
      const response = await ChapiService.getInsights();
      
      if (response.success) {
        const contextChanged = await hasContextChanged(response);
        
        if (contextChanged) {
          console.log('🔄 Context changed, updating insights');
          setInsights(response);
          setIsFromCache(false);
          await saveToCache(response);
        } else {
          console.log('✅ No changes detected, keeping cache');
        }
      }
    } catch (error) {
      console.log('⚠️ Background update failed (using cache):', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FF9500';
      case 'low': return '#4CAF50';
      default: return COLORS.primary;
    }
  };

  const getPriorityEmoji = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '💡';
    }
  };

  const getRecommendationEmoji = (type: string) => {
    switch (type) {
      case 'NUTRITION': return '🍎';
      case 'ACTIVITY': return '🏃';
      case 'EMOTIONAL': return '💭';
      case 'MOTIVATION': return '💪';
      default: return '💡';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando insights...</Text>
      </View>
    );
  }

  if (!insights || !insights.success) {
    return null;
  }

  const { data } = insights;
  const displayInsights = showAll ? data.insights : data.insights.slice(0, 1);
  const displayRecommendations = showAll ? data.recommendations : data.recommendations.slice(0, 1);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={['#E8F5E9', '#F1F8E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.chapiImageContainer}>
              <Image 
                source={require('../assets/chapi-3d-onboarding-3.png')}
                style={styles.chapiImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.title}>Chapi recomienda</Text>
              <Text style={styles.subtitle}>
                Recomendaciones personalizadas
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setShowAll(!showAll)}
          >
            <Text style={styles.expandText}>
              {showAll ? 'Ver menos' : 'Ver más'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Insights principales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Análisis</Text>
          {displayInsights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <Text style={styles.insightText}>• {insight}</Text>
            </View>
          ))}
        </View>

        {/* Recomendaciones */}
        {displayRecommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Recomendaciones</Text>
            {displayRecommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <View style={styles.recommendationHeader}>
                  <Text style={styles.recommendationEmoji}>
                    {getRecommendationEmoji(rec.type)}
                  </Text>
                  <Text style={styles.recommendationTitle}>{rec.title}</Text>
                  <Text style={styles.priorityBadge}>
                    {getPriorityEmoji(rec.priority)}
                  </Text>
                </View>
                <Text style={styles.recommendationDescription}>
                  {rec.description}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Alertas predictivas */}
        {data.predictiveAlerts.length > 0 && showAll && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Alertas</Text>
            {data.predictiveAlerts.map((alert, index) => (
              <View key={index} style={styles.alertItem}>
                <Text style={styles.alertText}>{alert}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Progreso de hoy */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>📅 Progreso de Hoy</Text>
          <View style={styles.progressGrid}>
            <View style={styles.progressItem}>
              <Text style={styles.progressEmoji}>
                {data.userContext.todayProgress.checkinCompleted ? '✅' : '⭕'}
              </Text>
              <Text style={styles.progressLabel}>Check-in</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressEmoji}>
                {data.userContext.todayProgress.mealsLogged > 0 ? '✅' : '⭕'}
              </Text>
              <Text style={styles.progressLabel}>Comidas</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressEmoji}>
                {actualWorkoutCompleted ? '✅' : '⭕'}
              </Text>
              <Text style={styles.progressLabel}>Ejercicio</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressEmoji}>
                {data.userContext.todayProgress.hydrationProgress > 0 ? '✅' : '⭕'}
              </Text>
              <Text style={styles.progressLabel}>Hidratación</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  gradient: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chapiImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  chapiImage: {
    width: 38,
    height: 38,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  expandButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  expandText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  insightItem: {
    marginBottom: 6,
  },
  insightText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  recommendationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recommendationEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  priorityBadge: {
    fontSize: 12,
  },
  recommendationDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 16,
  },
  alertItem: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  alertText: {
    fontSize: 13,
    color: '#D32F2F',
    lineHeight: 18,
  },
  progressSection: {
    marginTop: 6,
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressItem: {
    alignItems: 'center',
  },
  progressEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});