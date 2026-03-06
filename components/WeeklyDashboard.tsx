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
import ChapiService from '../services/chapiService';
import CacheService from '../services/cacheService';
import { Checkin } from '../types/nutrition';
import { COLORS, SHADOWS } from '../theme/theme';

const { width } = Dimensions.get('window');

interface WeeklyDashboardProps {
  selectedWeek?: string;
  onWeekChange?: (week: string) => void;
  refreshKey?: number; // Para forzar refresh desde el padre
  selectedPeriod?: 'week' | 'month' | 'year'; // Nuevo: período seleccionado
}

export const WeeklyDashboard: React.FC<WeeklyDashboardProps> = ({
  selectedWeek,
  onWeekChange,
  refreshKey = 0,
  selectedPeriod = 'week',
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
  const [chapiMessage, setChapiMessage] = useState<{ message: string; emoji: string }>({
    message: 'Cargando análisis...',
    emoji: '⏳',
  });

  useEffect(() => {
    loadWeekData();
  }, [selectedWeek, refreshKey, selectedPeriod]); // Agregar selectedPeriod como dependencia

  const loadWeekData = async () => {
    console.log('🔍 loadWeekData called with:', { selectedPeriod, selectedWeek, refreshKey });
    
    // Solo cargar datos para semana y mes
    if (selectedPeriod === 'year') {
      console.log('⏭️ Skipping year period');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Intentar obtener datos desde caché
      const cachedData = await CacheService.getProgressCache(selectedPeriod);
      
      if (cachedData) {
        console.log(`📦 Usando datos cacheados para ${selectedPeriod}`);
        setWeekData(cachedData.weekData);
        setChapiMessage(cachedData.chapiMessage);
        setLoading(false);
        return;
      }

      console.log(`🔄 Cargando datos frescos para ${selectedPeriod}`);
      
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

      // Calcular métricas (ahora basadas en comidas reales)
      const weeklyCompletion = await calculateWeeklyCompletion();
      const macroCompliance = await calculateMacroComplianceFromMeals(weeklyPlan);
      const dailyAdherence = await calculateDailyAdherenceFromMeals(weeklyPlan);
      const weeklyAverage = await calculateWeeklyAverage(checkins);

      const newWeekData = {
        checkins,
        weeklyPlan,
        weeklyCompletion,
        macroCompliance,
        dailyAdherence,
        weeklyAverage,
      };

      setWeekData(newWeekData);

      // Obtener análisis de Chapi según el período
      let analysis;
      if (selectedPeriod === 'week') {
        analysis = await ChapiService.getWeeklyProgressAnalysis({
          weeklyCompletion,
          macroCompliance,
          dailyAdherence,
          weeklyAverage,
        });
      } else if (selectedPeriod === 'month') {
        analysis = await ChapiService.getMonthlyProgressAnalysis({
          monthlyCompletion: weeklyCompletion,
          macroCompliance,
          dailyAdherence,
          monthlyAverage: weeklyAverage,
        });
      }

      if (analysis) {
        setChapiMessage(analysis);
      }

      // Guardar en caché
      await CacheService.saveProgressCache(selectedPeriod, {
        weekData: newWeekData,
        chapiMessage: analysis,
      });
    } catch (error) {
      console.error('Error loading week data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDateRange = () => {
    const now = new Date();
    let from: Date;
    let to: Date;
    
    if (selectedPeriod === 'week') {
      // Inicio de la semana actual (lunes)
      const startOfWeek = new Date(now);
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(now.getDate() - daysToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      from = startOfWeek;
      
      to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
    } else if (selectedPeriod === 'month') {
      // Inicio del mes actual
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      from.setHours(0, 0, 0, 0);
      
      // Fin del mes actual
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      to.setHours(23, 59, 59, 999);
    } else {
      // Inicio del año actual
      from = new Date(now.getFullYear(), 0, 1);
      from.setHours(0, 0, 0, 0);
      
      // Fin del año actual
      to = new Date(now.getFullYear(), 11, 31);
      to.setHours(23, 59, 59, 999);
    }
    
    return { from, to };
  };

  const getTotalDaysInPeriod = () => {
    if (selectedPeriod === 'week') {
      return 7; // Semana siempre tiene 7 días
    } else if (selectedPeriod === 'month') {
      const now = new Date();
      // Obtener el último día del mes actual
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return lastDay;
    } else {
      // Año
      const now = new Date();
      const isLeapYear = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || (now.getFullYear() % 400 === 0);
      return isLeapYear ? 366 : 365;
    }
  };

  const calculateWeeklyCompletion = async (): Promise<number> => {
    try {
      const { from, to } = getWeekDateRange();
      let daysWithMeals = 0;
      
      // Calcular número de días en el período
      const totalDays = getTotalDaysInPeriod();

      console.log('📊 Calculating weekly completion:', { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0], totalDays });

      // Iterar por cada día del período
      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(from);
        currentDate.setDate(from.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        try {
          const dayMeals = await NutritionService.getTodayMeals(dateStr);
          console.log(`📅 ${dateStr}: ${dayMeals.logs?.length || 0} meals`);
          // Contar el día si tiene al menos una comida registrada
          if (dayMeals && dayMeals.logs && dayMeals.logs.length > 0) {
            daysWithMeals++;
          }
        } catch (error) {
          console.log(`❌ Error loading meals for ${dateStr}:`, error);
          continue;
        }
      }

      const completion = Math.round((daysWithMeals / totalDays) * 100);
      console.log(`✅ Weekly completion: ${daysWithMeals}/${totalDays} days = ${completion}%`);
      return completion;
    } catch (error) {
      console.error('Error calculating completion:', error);
      return 0;
    }
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

  const calculateMacroComplianceFromMeals = async (plan: any) => {
    if (!plan) {
      const totalDays = getTotalDaysInPeriod();
      return {
        calories: { days: 0, total: totalDays },
        protein: { days: 0, total: totalDays },
        fats: { days: 0, total: totalDays },
      };
    }

    try {
      const { from, to } = getWeekDateRange();
      let caloriesDaysInRange = 0;
      let proteinDaysMet = 0;
      let fatsDaysControlled = 0;

      // Calcular número de días en el período
      const totalDays = getTotalDaysInPeriod();

      console.log('🔍 Calculando cumplimiento de macros desde', from.toISOString().split('T')[0], 'hasta', to.toISOString().split('T')[0]);
      console.log(`📅 Total de días en el período: ${totalDays}`);
      console.log('🎯 Objetivos del plan:', {
        calorias: plan.macros.kcalTarget,
        proteina: plan.macros.protein_g,
        grasas: plan.macros.fat_g,
      });

      // Iterar por cada día del período
      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(from);
        currentDate.setDate(from.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        try {
          const dayMeals = await NutritionService.getTodayMeals(dateStr);
          
          if (dayMeals && dayMeals.totals && dayMeals.logs && dayMeals.logs.length > 0) {
            const consumed = dayMeals.totals;
            
            console.log(`📅 ${dateStr}: ${consumed.kcal} kcal, ${consumed.protein_g}g proteína, ${consumed.fat_g}g grasas`);
            
            // Calorías: dentro del rango ±20% (más flexible)
            const calorieTarget = plan.macros.kcalTarget;
            const calorieMin = calorieTarget * 0.8; // 80% del objetivo
            const calorieMax = calorieTarget * 1.2; // 120% del objetivo
            if (consumed.kcal >= calorieMin && consumed.kcal <= calorieMax) {
              caloriesDaysInRange++;
              console.log(`  ✅ Calorías en rango (${calorieMin.toFixed(0)}-${calorieMax.toFixed(0)})`);
            } else {
              console.log(`  ❌ Calorías fuera de rango (${calorieMin.toFixed(0)}-${calorieMax.toFixed(0)}) - Consumiste: ${consumed.kcal}`);
            }

            // Proteína: cumplió al menos el 60% del objetivo (más flexible)
            const proteinTarget = plan.macros.protein_g;
            const proteinMin = proteinTarget * 0.6; // 60% del objetivo
            if (consumed.protein_g >= proteinMin) {
              proteinDaysMet++;
              console.log(`  ✅ Proteína cumplida (>= ${proteinMin.toFixed(0)}g)`);
            } else {
              console.log(`  ❌ Proteína no cumplida (< ${proteinMin.toFixed(0)}g) - Consumiste: ${consumed.protein_g}g`);
            }

            // Grasas: no excedió el objetivo en más del 30% (más flexible)
            const fatTarget = plan.macros.fat_g;
            const fatMax = fatTarget * 1.3; // 130% del objetivo
            if (consumed.fat_g <= fatMax) {
              fatsDaysControlled++;
              console.log(`  ✅ Grasas controladas (<= ${fatMax.toFixed(0)}g)`);
            } else {
              console.log(`  ❌ Grasas excedidas (> ${fatMax.toFixed(0)}g) - Consumiste: ${consumed.fat_g}g`);
            }
          } else {
            console.log(`📅 ${dateStr}: Sin comidas registradas`);
          }
        } catch (error) {
          console.log(`� ${dateStr}: Error obteniendo comidas`, error);
          continue;
        }
      }

      console.log(`�📊 Resultado: Calorías ${caloriesDaysInRange}/7, Proteína ${proteinDaysMet}/7, Grasas ${fatsDaysControlled}/7`);

      return {
        calories: { days: caloriesDaysInRange, total: totalDays },
        protein: { days: proteinDaysMet, total: totalDays },
        fats: { days: fatsDaysControlled, total: totalDays },
      };
    } catch (error) {
      console.error('Error calculating macro compliance:', error);
      const totalDays = getTotalDaysInPeriod();
      return {
        calories: { days: 0, total: totalDays },
        protein: { days: 0, total: totalDays },
        fats: { days: 0, total: totalDays },
      };
    }
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

  const calculateDailyAdherenceFromMeals = async (plan: any): Promise<number[]> => {
    if (!plan) {
      // Retornar array vacío del tamaño correcto según el período
      const totalDays = getTotalDaysInPeriod();
      return new Array(totalDays).fill(0);
    }

    try {
      const { from, to } = getWeekDateRange();
      const totalDays = getTotalDaysInPeriod();
      const adherence = new Array(totalDays).fill(0);
      
      console.log(`📊 Calculando adherencia diaria para ${totalDays} días`);

      // Iterar por cada día del período
      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(from);
        currentDate.setDate(from.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        try {
          const dayMeals = await NutritionService.getTodayMeals(dateStr);
          if (dayMeals && dayMeals.totals) {
            const consumed = dayMeals.totals;
            const target = plan.macros.kcalTarget;
            
            // Calcular adherencia basada en calorías consumidas vs objetivo
            // 100% = cumplió exactamente el objetivo
            // >100% = excedió el objetivo
            // <100% = no llegó al objetivo
            const adherencePercent = target > 0 ? Math.min(100, (consumed.kcal / target) * 100) : 0;
            adherence[i] = Math.round(adherencePercent);
          }
        } catch (error) {
          // Si no hay datos para ese día, dejar en 0
          continue;
        }
      }

      return adherence;
    } catch (error) {
      console.error('Error calculating daily adherence:', error);
      const totalDays = getTotalDaysInPeriod();
      return new Array(totalDays).fill(0);
    }
  };

  const calculateWeeklyAverage = async (checkins: Checkin[]) => {
    try {
      // Obtener comidas de cada día del período
      const { from, to } = getWeekDateRange();
      const totalDays = getTotalDaysInPeriod();
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFats = 0;
      let daysWithData = 0;

      console.log(`📊 Calculando promedio para ${totalDays} días`);

      // Iterar por cada día del período
      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(from);
        currentDate.setDate(from.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        try {
          const dayMeals = await NutritionService.getTodayMeals(dateStr);
          if (dayMeals && dayMeals.totals && dayMeals.logs && dayMeals.logs.length > 0) {
            totalCalories += dayMeals.totals.kcal || 0;
            totalProtein += dayMeals.totals.protein_g || 0;
            totalCarbs += dayMeals.totals.carbs_g || 0;
            totalFats += dayMeals.totals.fat_g || 0;
            daysWithData++;
          }
        } catch (error) {
          // Si no hay datos para ese día, continuar
          continue;
        }
      }

      // Calcular promedios
      if (daysWithData === 0) {
        return { calories: 0, protein: 0, carbs: 0, fats: 0 };
      }

      console.log(`📊 Promedio calculado con ${daysWithData} días de datos`);

      return {
        calories: Math.round(totalCalories / daysWithData),
        protein: Math.round(totalProtein / daysWithData),
        carbs: Math.round(totalCarbs / daysWithData),
        fats: Math.round(totalFats / daysWithData),
      };
    } catch (error) {
      console.error('Error calculating average:', error);
      return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }
  };

  const renderCircularProgress = () => {
    if (!weekData) return null;

    const percentage = weekData.weeklyCompletion;
    const totalDays = getTotalDaysInPeriod();
    const daysCompleted = Math.round((percentage / 100) * totalDays);

    // Calcular el ángulo para el círculo de progreso
    const strokeDasharray = 2 * Math.PI * 60; // Circunferencia del círculo (radio 60)
    const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

    return (
      <View style={styles.circularProgressContainer}>
        <View style={styles.circularProgress}>
          {/* Círculo de fondo */}
          <View style={styles.circleBackground} />
          {/* Círculo de progreso - simulado con borde */}
          <View style={[
            styles.circleProgress,
            {
              borderColor: percentage >= 80 ? COLORS.primary : percentage >= 50 ? '#FFC107' : '#FF9800',
              borderWidth: 10,
            }
          ]} />
          <View style={styles.circleContent}>
            <Text style={styles.percentageText}>{percentage}%</Text>
            <Text style={styles.percentageLabel}>
              {selectedPeriod === 'week' ? 'Meta semanal' : 'Meta mensual'}
            </Text>
            <Text style={styles.percentageSubtext}>cumplida {daysCompleted}/{totalDays} días</Text>
          </View>
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

    // Para vista semanal, usar solo los primeros 7 días
    const weeklyAdherence = weekData.dailyAdherence.slice(0, 7);

    return (
      <View style={styles.trendContainer}>
        <Text style={styles.trendTitle}>Tendencia semanal</Text>
        <View style={styles.chartContainer}>
          {weeklyAdherence.map((adherence, index) => {
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

    // Calcular tendencias (simuladas por ahora - en producción compararías con semana anterior)
    const calorieTrend = 3; // +3%
    const proteinTrend = -8; // -8%
    const carbsTrend = 1; // +1%
    const fatsTrend = -2; // -2%

    return (
      <View style={styles.averageContainer}>
        <Text style={styles.averageTitle}>Promedio semanal</Text>
        
        {/* Grid de 2 columnas */}
        <View style={styles.averageGridTwoColumns}>
          {/* Columna 1 */}
          <View style={styles.averageColumn}>
            <View style={styles.averageItemCompact}>
              <Text style={styles.averageIconCompact}>🔥</Text>
              <View style={styles.averageItemContentCompact}>
                <Text style={styles.averageLabelCompact}>Calorías</Text>
                <Text style={styles.averageValueCompact}>{weeklyAverage.calories.toLocaleString()} kcal</Text>
                <Text style={[styles.averageTrendCompact, calorieTrend < 0 && styles.trendDown]}>
                  {calorieTrend >= 0 ? '▲' : '▼'} {Math.abs(calorieTrend)}%
                </Text>
              </View>
            </View>

            <View style={styles.averageItemCompact}>
              <Text style={styles.averageIconCompact}>🍞</Text>
              <View style={styles.averageItemContentCompact}>
                <Text style={styles.averageLabelCompact}>Carbohidratos</Text>
                <Text style={styles.averageValueCompact}>{weeklyAverage.carbs}g</Text>
                <Text style={[styles.averageTrendCompact, carbsTrend < 0 && styles.trendDown]}>
                  {carbsTrend >= 0 ? '▲' : '▼'} {Math.abs(carbsTrend)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Columna 2 */}
          <View style={styles.averageColumn}>
            <View style={styles.averageItemCompact}>
              <Text style={styles.averageIconCompact}>💪</Text>
              <View style={styles.averageItemContentCompact}>
                <Text style={styles.averageLabelCompact}>Proteína</Text>
                <Text style={styles.averageValueCompact}>{weeklyAverage.protein}g</Text>
                <Text style={[styles.averageTrendCompact, proteinTrend < 0 && styles.trendDown]}>
                  {proteinTrend >= 0 ? '▲' : '▼'} {Math.abs(proteinTrend)}%
                </Text>
              </View>
            </View>

            <View style={styles.averageItemCompact}>
              <Text style={styles.averageIconCompact}>🥑</Text>
              <View style={styles.averageItemContentCompact}>
                <Text style={styles.averageLabelCompact}>Grasas</Text>
                <Text style={styles.averageValueCompact}>{weeklyAverage.fats}g</Text>
                <Text style={[styles.averageTrendCompact, fatsTrend < 0 && styles.trendDown]}>
                  {fatsTrend >= 0 ? '▲' : '▼'} {Math.abs(fatsTrend)}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderMonthlyTrend = () => {
    if (!weekData || !weekData.weeklyPlan) return null;

    const totalDays = getTotalDaysInPeriod();
    const dailyAdherence = weekData.dailyAdherence;
    
    // Calcular adherencia por semana (dividir el mes en 4 semanas aproximadas)
    const weeksInMonth = 4;
    const daysPerWeek = Math.ceil(totalDays / weeksInMonth);
    const weeklyData: number[] = [];

    // Calcular adherencia promedio por semana basado en datos reales
    for (let week = 0; week < weeksInMonth; week++) {
      const startDay = week * daysPerWeek;
      const endDay = Math.min(startDay + daysPerWeek, totalDays);
      let weekTotal = 0;
      let daysWithData = 0;

      for (let day = startDay; day < endDay; day++) {
        if (day < dailyAdherence.length) {
          const dayAdherence = dailyAdherence[day] || 0;
          weekTotal += dayAdherence;
          daysWithData++;
        }
      }

      const weekAverage = daysWithData > 0 ? weekTotal / daysWithData : 0;
      weeklyData.push(Math.round(weekAverage));
    }

    const maxHeight = 100;
    const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];

    return (
      <View style={styles.trendContainer}>
        <Text style={styles.trendTitle}>Tendencia mensual</Text>
        <View style={styles.chartContainer}>
          {weeklyData.map((adherence, index) => {
            const height = (adherence / 100) * maxHeight;
            const color = adherence >= 80 ? '#4CAF50' : adherence >= 50 ? '#FFC107' : '#FF5252';
            
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View style={[styles.bar, { height: Math.max(height, 5), backgroundColor: color }]} />
                </View>
                <Text style={styles.dayLabel}>{weeks[index]}</Text>
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

  const renderMonthlyAverage = () => {
    if (!weekData) return null;

    const { weeklyAverage } = weekData;
    
    // Si no hay datos, no mostrar esta sección
    if (weeklyAverage.calories === 0 && weeklyAverage.protein === 0) {
      return (
        <View style={styles.averageContainer}>
          <Text style={styles.averageTitle}>Promedio mensual</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              No hay datos de comidas registradas este mes
            </Text>
            <Text style={styles.noDataSubtext}>
              Registra tus comidas para ver tu promedio mensual
            </Text>
          </View>
        </View>
      );
    }

    // Calcular tendencias (simuladas por ahora - en producción compararías con mes anterior)
    const calorieTrend = 2; // +2%
    const proteinTrend = -5; // -5%
    const carbsTrend = 3; // +3%
    const fatsTrend = -1; // -1%

    return (
      <View style={styles.averageContainer}>
        <Text style={styles.averageTitle}>Promedio mensual</Text>
        
        {/* Grid de 2 columnas */}
        <View style={styles.averageGridTwoColumns}>
          {/* Columna 1 */}
          <View style={styles.averageColumn}>
            <View style={styles.averageItemCompact}>
              <Text style={styles.averageIconCompact}>🔥</Text>
              <View style={styles.averageItemContentCompact}>
                <Text style={styles.averageLabelCompact}>Calorías</Text>
                <Text style={styles.averageValueCompact}>{weeklyAverage.calories.toLocaleString()} kcal</Text>
                <Text style={[styles.averageTrendCompact, calorieTrend < 0 && styles.trendDown]}>
                  {calorieTrend >= 0 ? '▲' : '▼'} {Math.abs(calorieTrend)}%
                </Text>
              </View>
            </View>

            <View style={styles.averageItemCompact}>
              <Text style={styles.averageIconCompact}>🍞</Text>
              <View style={styles.averageItemContentCompact}>
                <Text style={styles.averageLabelCompact}>Carbohidratos</Text>
                <Text style={styles.averageValueCompact}>{weeklyAverage.carbs}g</Text>
                <Text style={[styles.averageTrendCompact, carbsTrend < 0 && styles.trendDown]}>
                  {carbsTrend >= 0 ? '▲' : '▼'} {Math.abs(carbsTrend)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Columna 2 */}
          <View style={styles.averageColumn}>
            <View style={styles.averageItemCompact}>
              <Text style={styles.averageIconCompact}>💪</Text>
              <View style={styles.averageItemContentCompact}>
                <Text style={styles.averageLabelCompact}>Proteína</Text>
                <Text style={styles.averageValueCompact}>{weeklyAverage.protein}g</Text>
                <Text style={[styles.averageTrendCompact, proteinTrend < 0 && styles.trendDown]}>
                  {proteinTrend >= 0 ? '▲' : '▼'} {Math.abs(proteinTrend)}%
                </Text>
              </View>
            </View>

            <View style={styles.averageItemCompact}>
              <Text style={styles.averageIconCompact}>🥑</Text>
              <View style={styles.averageItemContentCompact}>
                <Text style={styles.averageLabelCompact}>Grasas</Text>
                <Text style={styles.averageValueCompact}>{weeklyAverage.fats}g</Text>
                <Text style={[styles.averageTrendCompact, fatsTrend < 0 && styles.trendDown]}>
                  {fatsTrend >= 0 ? '▲' : '▼'} {Math.abs(fatsTrend)}%
                </Text>
              </View>
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
      {/* No mostrar nada para año */}
      {selectedPeriod === 'year' ? null : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {selectedPeriod === 'week' ? 'Cumplimiento semanal' : 'Cumplimiento mensual'}
            </Text>
          </View>

          {/* Progreso circular - Mostrar siempre para semana y mes */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              {renderCircularProgress()}
              {renderMacroCompliance()}
            </View>
          </View>

          {/* Resto del dashboard - Solo para semana */}
          {selectedPeriod === 'week' && (
            <>
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
                    <Text style={styles.chapiTitle}>Análisis de tu semana</Text>
                    <Text style={styles.chapiMessage}>
                      {chapiMessage.message}
                    </Text>
                  </View>
                </View>
                <Text style={styles.chapiEmoji}>{chapiMessage.emoji}</Text>
              </View>
            </>
          )}

          {/* Gráficos para mes */}
          {selectedPeriod === 'month' && (
            <>
              {/* Tendencia mensual */}
              <View style={styles.card}>
                {renderMonthlyTrend()}
              </View>

              {/* Promedio mensual */}
              <View style={styles.card}>
                {renderMonthlyAverage()}
              </View>

              {/* Mensaje de Chapi para mes */}
              <View style={styles.chapiCard}>
                <View style={styles.chapiContent}>
                  <Text style={styles.chapiIcon}>💡</Text>
                  <View style={styles.chapiTextContainer}>
                    <Text style={styles.chapiTitle}>Análisis de tu mes</Text>
                    <Text style={styles.chapiMessage}>
                      {chapiMessage.message}
                    </Text>
                  </View>
                </View>
                <Text style={styles.chapiEmoji}>{chapiMessage.emoji}</Text>
              </View>
            </>
          )}
        </>
      )}
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
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circleBackground: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  circleProgress: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'transparent',
  },
  circleContent: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
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
  averageGridTwoColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  averageColumn: {
    flex: 1,
    gap: 12,
  },
  averageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  averageItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(67, 233, 123, 0.05)',
    borderRadius: 12,
  },
  averageItemContent: {
    flex: 1,
  },
  averageItemContentCompact: {
    flex: 1,
  },
  averageIcon: {
    fontSize: 24,
  },
  averageIconCompact: {
    fontSize: 20,
  },
  averageLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  averageLabelCompact: {
    fontSize: 10,
    color: COLORS.textLight,
    marginBottom: 2,
    fontWeight: '600',
  },
  averageValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  averageValueCompact: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  averageTrend: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  averageTrendCompact: {
    fontSize: 9,
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
