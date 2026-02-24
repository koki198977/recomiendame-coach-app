import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NutritionService } from '../services/nutritionService';
import { Checkin } from '../types/nutrition';
import { COLORS, SHADOWS } from '../theme/theme';

const { width } = Dimensions.get('window');

interface WeeklyDashboardProps {
  selectedWeek?: string;
  onWeekChange?: (week: string) => void;
}

export const WeeklyDashboard: React.FC<WeeklyDashboardProps> = ({
  selectedWeek,
  onWeekChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState<{
    checkins: Checkin[];
    weeklyPlan: any;
    weeklyCompletion: number;
    macroCompliance: {
      calories: { days: number; total: number };
      protein: { days: number; total: number };
      fats: { days: number; total: number };
    };
    dailyAdherence: number[];
    weeklyAverage: {
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    };
  } | null>(null);

  useEffect(() => {
    loadWeekData();
  }, [selectedWeek]);

  const loadWeekData = async () => {
    try {
      setLoading(true);
      
      // Obtener rango de fechas de la semana
      const { from, to } = getWeekDateRange();
      
      // Cargar checkins de la semana
      const checkins = await NutritionService.getCheckinHistory(
        from.toISOString().split('T')[0],
        to.toISOString().split('T')[0]
      );

      // Cargar plan semanal
      const currentWeek = selectedWeek || NutritionService.getCurrentWeek();
      const weeklyPlan = await NutritionService.getWeeklyPlan(currentWeek);

      // Calcular métricas
      const weeklyCompletion = calculateWeeklyCompletion(checkins);
      const macroCompliance = calculateMacroCompliance(checkins, weeklyPlan);
      const dailyAdherence = calculateDailyAdherence(checkins);
      const weeklyAverage = calculateWeeklyAverage(checkins);

      setWeekData({
        checkins,
        weeklyPlan,
        weeklyCompletion,
        macroCompliance,
        dailyAdherence,
        weeklyAverage,
      });
    } catch (error) {
      console.error('Error loading week data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDateRange = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(now.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return { from: startOfWeek, to: endOfWeek };
  };

  const calculateWeeklyCompletion = (checkins: Checkin[]): number => {
    const daysWithCheckin = checkins.filter(c => 
      c.adherencePct !== undefined || c.weightKg !== undefined
    ).length;
    return Math.round((daysWithCheckin / 7) * 100);
  };

  const calculateMacroCompliance = (checkins: Checkin[], plan: any) => {
    if (!plan) {
      return {
        calories: { days: 0, total: 7 },
        protein: { days: 0, total: 7 },
        fats: { days: 0, total: 7 },
      };
    }

    // Contar días con check-in que tengan adherencia registrada
    const daysWithData = checkins.filter(c => c.adherencePct !== undefined).length;
    
    // Por ahora usamos la adherencia como proxy para el cumplimiento
    // TODO: Cuando tengamos datos de comidas por día, calcular cumplimiento real
    const highAdherenceDays = checkins.filter(c => 
      c.adherencePct !== undefined && c.adherencePct >= 80
    ).length;

    return {
      calories: { days: highAdherenceDays, total: 7 },
      protein: { days: Math.max(0, highAdherenceDays - 2), total: 7 }, // Aproximación
      fats: { days: Math.max(0, highAdherenceDays - 1), total: 7 }, // Aproximación
    };
  };

  const calculateDailyAdherence = (checkins: Checkin[]): number[] => {
    const adherence = [0, 0, 0, 0, 0, 0, 0]; // L, M, M, J, V, S, D
    
    checkins.forEach(checkin => {
      const date = new Date(checkin.date);
      const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1; // Convertir a índice L-D
      adherence[dayIndex] = checkin.adherencePct || 0;
    });
    
    return adherence;
  };

  const calculateWeeklyAverage = (checkins: Checkin[]) => {
    // Si no hay checkins, retornar ceros
    if (checkins.length === 0) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      };
    }

    // Por ahora retornamos datos basados en si hay checkins
    // TODO: Implementar lógica real cuando tengamos datos de comidas
    // Esto es solo un placeholder hasta que tengamos la API de comidas por día
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
    };
  };

  const renderCircularProgress = () => {
    if (!weekData) return null;

    const percentage = weekData.weeklyCompletion;
    const daysCompleted = Math.round((percentage / 100) * 7);

    return (
      <View style={styles.circularProgressContainer}>
        <View style={styles.circularProgress}>
          <Text style={styles.percentageText}>{percentage}%</Text>
          <Text style={styles.percentageLabel}>Meta semanal</Text>
          <Text style={styles.percentageSubtext}>cumplida {daysCompleted}/7 días</Text>
        </View>
      </View>
    );
  };

  const renderMacroCompliance = () => {
    if (!weekData) return null;

    const { macroCompliance } = weekData;

    return (
      <View style={styles.macroComplianceContainer}>
        <View style={styles.macroComplianceItem}>
          <Text style={styles.macroIcon}>🔥</Text>
          <View style={styles.macroInfo}>
            <Text style={styles.macroLabel}>Calorías</Text>
            <Text style={styles.macroValue}>
              ✅ {macroCompliance.calories.days}/{macroCompliance.calories.total} días dentro del rango
            </Text>
          </View>
        </View>

        <View style={styles.macroComplianceItem}>
          <Text style={styles.macroIcon}>💪</Text>
          <View style={styles.macroInfo}>
            <Text style={styles.macroLabel}>Proteína</Text>
            <Text style={styles.macroValue}>
              ✅ {macroCompliance.protein.days}/{macroCompliance.protein.total} días cumplidos
            </Text>
          </View>
        </View>

        <View style={styles.macroComplianceItem}>
          <Text style={styles.macroIcon}>🥑</Text>
          <View style={styles.macroInfo}>
            <Text style={styles.macroLabel}>Grasas</Text>
            <Text style={styles.macroValue}>
              ✅ {macroCompliance.fats.days}/{macroCompliance.fats.total} días controladas
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderWeeklyTrend = () => {
    if (!weekData) return null;

    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const maxHeight = 100;

    return (
      <View style={styles.trendContainer}>
        <Text style={styles.trendTitle}>Tendencia semanal</Text>
        <View style={styles.chartContainer}>
          {weekData.dailyAdherence.map((adherence, index) => {
            const height = (adherence / 100) * maxHeight;
            const color = adherence >= 80 ? '#4CAF50' : adherence >= 50 ? '#FFC107' : '#FF5252';
            
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View style={[styles.bar, { height, backgroundColor: color }]} />
                </View>
                <Text style={styles.dayLabel}>{days[index]}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.chartLegend}>
          <Text style={styles.chartLegendText}>100%</Text>
          <Text style={styles.chartLegendText}>80%</Text>
        </View>
      </View>
    );
  };

  const renderWeeklyAverage = () => {
    if (!weekData) return null;

    const { weeklyAverage } = weekData;
    
    // Si no hay datos, no mostrar esta sección
    if (weeklyAverage.calories === 0 && weeklyAverage.protein === 0) {
      return (
        <View style={styles.averageContainer}>
          <Text style={styles.averageTitle}>Promedio semanal</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              No hay datos de comidas registradas esta semana
            </Text>
            <Text style={styles.noDataSubtext}>
              Registra tus comidas para ver tu promedio semanal
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.averageContainer}>
        <Text style={styles.averageTitle}>Promedio semanal</Text>
        
        <View style={styles.averageGrid}>
          <View style={styles.averageItem}>
            <Text style={styles.averageIcon}>🔥</Text>
            <View>
              <Text style={styles.averageLabel}>Calorías</Text>
              <Text style={styles.averageValue}>{weeklyAverage.calories} kcal</Text>
              <Text style={styles.averageTrend}>▲ +3% vs semana anterior</Text>
            </View>
          </View>

          <View style={styles.averageItem}>
            <Text style={styles.averageIcon}>💪</Text>
            <View>
              <Text style={styles.averageLabel}>Proteína</Text>
              <Text style={styles.averageValue}>{weeklyAverage.protein}g</Text>
              <Text style={[styles.averageTrend, styles.trendDown]}>▼ -8% vs semana anterior</Text>
            </View>
          </View>

          <View style={styles.averageItem}>
            <Text style={styles.averageIcon}>🍞</Text>
            <View>
              <Text style={styles.averageLabel}>Carbohidratos</Text>
              <Text style={styles.averageValue}>{weeklyAverage.carbs}g</Text>
              <Text style={styles.averageTrend}>▲ +1% vs semana anterior</Text>
            </View>
          </View>

          <View style={styles.averageItem}>
            <Text style={styles.averageIcon}>🥑</Text>
            <View>
              <Text style={styles.averageLabel}>Grasas</Text>
              <Text style={styles.averageValue}>{weeklyAverage.fats}g</Text>
              <Text style={[styles.averageTrend, styles.trendDown]}>▼ -2% vs semana anterior</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con selector de semana */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cumplimiento semanal</Text>
        <TouchableOpacity style={styles.weekSelector}>
          <Text style={styles.weekSelectorText}>Semana ▼</Text>
        </TouchableOpacity>
      </View>

      {/* Progreso circular */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          {renderCircularProgress()}
          {renderMacroCompliance()}
        </View>
      </View>

      {/* Tendencia semanal */}
      <View style={styles.card}>
        {renderWeeklyTrend()}
      </View>

      {/* Promedio semanal */}
      <View style={styles.card}>
        {renderWeeklyAverage()}
      </View>

      {/* Mensaje de Chapi */}
      <View style={styles.chapiCard}>
        <View style={styles.chapiContent}>
          <Text style={styles.chapiIcon}>💡</Text>
          <View style={styles.chapiTextContainer}>
            <Text style={styles.chapiTitle}>Tuviste una semana constante.</Text>
            <Text style={styles.chapiMessage}>
              Sigue así y notarás grandes cambios en tu salud. 🥗🍎
            </Text>
          </View>
        </View>
        <Text style={styles.chapiEmoji}>🚀</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  weekSelector: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weekSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.card,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 20,
  },
  
  // Circular Progress
  circularProgressContainer: {
    alignItems: 'center',
  },
  circularProgress: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 8,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
  },
  percentageLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  percentageSubtext: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
  },
  
  // Macro Compliance
  macroComplianceContainer: {
    flex: 1,
    gap: 12,
  },
  macroComplianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  macroIcon: {
    fontSize: 20,
  },
  macroInfo: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  macroValue: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  
  // Weekly Trend
  trendContainer: {
    paddingVertical: 8,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barWrapper: {
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 24,
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  chartLegend: {
    position: 'absolute',
    left: 0,
    top: 40,
    gap: 40,
  },
  chartLegendText: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  
  // Weekly Average
  averageContainer: {
    paddingVertical: 8,
  },
  averageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  averageGrid: {
    gap: 16,
  },
  averageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  averageIcon: {
    fontSize: 24,
  },
  averageLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  averageValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  averageTrend: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  trendDown: {
    color: '#FF5252',
  },
  
  // Chapi Card
  chapiCard: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  chapiContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  chapiIcon: {
    fontSize: 24,
  },
  chapiTextContainer: {
    flex: 1,
  },
  chapiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  chapiMessage: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  chapiEmoji: {
    fontSize: 32,
  },
  
  // No Data Styles
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    fontWeight: '600',
  },
  noDataSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 6,
    opacity: 0.7,
  },
});
