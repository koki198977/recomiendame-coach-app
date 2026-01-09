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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NutritionService } from '../services/nutritionService';
import { WeeklyPlan, WeeklyPlanMeal, WeeklyPlanIngredient, ShoppingListItem } from '../types/nutrition';
import { IngredientsModal } from '../components/IngredientsModal';
import { ShoppingListModal } from '../components/ShoppingListModal';
import { PlanGeneratingModal } from '../components/PlanGeneratingModal';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';
import { LinearGradient } from 'expo-linear-gradient';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface DayInfo {
  dayIndex: number;
  dayName: string;
  date: Date;
  dateNumber: number;
  isToday: boolean;
}

export const PlanScreen: React.FC = () => {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [weekDays, setWeekDays] = useState<DayInfo[]>([]);
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<WeeklyPlanMeal | null>(null);
  const [regeneratingDay, setRegeneratingDay] = useState(false);
  const [swappingMeal, setSwappingMeal] = useState<string | null>(null); // "dayIndex-mealIndex"
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [shoppingListItems, setShoppingListItems] = useState<ShoppingListItem[]>([]);
  const [loadingShoppingList, setLoadingShoppingList] = useState(false);
  const [shoppingListTotal, setShoppingListTotal] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [markingMeal, setMarkingMeal] = useState<string | null>(null); // "dayIndex-mealIndex"
  const [consumedMeals, setConsumedMeals] = useState<Set<string>>(new Set()); // Set de "dayIndex-mealIndex"
  const [todayMealsConsumed, setTodayMealsConsumed] = useState<any>(null);

  useEffect(() => {
    loadWeeklyPlan();
    loadTodayMeals();
    loadConsumedMealsState();
  }, []);

  // Cargar estado de comidas consumidas cuando cambie la semana
  useEffect(() => {
    if (currentWeek) {
      loadConsumedMealsState();
    }
  }, [currentWeek]);

  // Cargar estado de comidas consumidas desde AsyncStorage
  const loadConsumedMealsState = async () => {
    try {
      const weekKey = currentWeek || NutritionService.getCurrentWeek();
      const stored = await AsyncStorage.getItem(`consumedMeals_${weekKey}`);
      if (stored) {
        setConsumedMeals(new Set(JSON.parse(stored)));
      } else {
        setConsumedMeals(new Set());
      }
    } catch (error) {
      console.log('Error loading consumed meals state:', error);
      setConsumedMeals(new Set());
    }
  };

  // Guardar estado de comidas consumidas en AsyncStorage
  const saveConsumedMealsState = async (newConsumedMeals: Set<string>) => {
    try {
      const weekKey = currentWeek || NutritionService.getCurrentWeek();
      await AsyncStorage.setItem(
        `consumedMeals_${weekKey}`, 
        JSON.stringify([...newConsumedMeals])
      );
    } catch (error) {
      console.log('Error saving consumed meals state:', error);
    }
  };

  const loadTodayMeals = async () => {
    try {
      const mealsConsumed = await NutritionService.getTodayMeals();
      setTodayMealsConsumed(mealsConsumed);
    } catch (error) {
      // Error silencioso
    }
  };

  // Función para determinar si una semana es pasada
  const isWeekInPast = (weekString: string): boolean => {
    const currentWeekString = NutritionService.getCurrentWeek();
    return weekString < currentWeekString;
  };

  // Función para determinar si una semana es actual o futura
  const canModifyWeek = (weekString: string): boolean => {
    const currentWeekString = NutritionService.getCurrentWeek();
    return weekString >= currentWeekString;
  };

  // Función para determinar si se puede navegar hacia adelante
  const canNavigateNext = (): boolean => {
    const currentWeekString = NutritionService.getCurrentWeek();
    return currentWeek < currentWeekString;
  };

  useEffect(() => {
    if (currentWeek) {
      generateWeekDays(currentWeek);
    }
  }, [currentWeek]);

  const loadWeeklyPlan = async (week?: string) => {
    try {
      setLoading(true);
      const targetWeek = week || NutritionService.getCurrentWeek();
      setCurrentWeek(targetWeek);
      
      const plan = await NutritionService.getWeeklyPlan(targetWeek);
      setWeeklyPlan(plan);
      
      if (!plan) {
        if (canModifyWeek(targetWeek)) {
          Alert.alert(
            'Sin plan semanal',
            'No tienes un plan para esta semana. ¿Quieres generar uno?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Generar', onPress: () => generatePlan(targetWeek) }
            ]
          );
        }
        // Si es semana pasada, no mostrar alert, solo mostrar que no hay plan
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el plan semanal');
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async (week: string) => {
    try {
      setLoading(false); // Quitar el loading general
      setIsGenerating(true); // Activar modal de generación
      setGenerationProgress(10);

      const generateResponse = await NutritionService.generatePlanWithAI(week);
      
      if (generateResponse.created) {
        // Iniciar polling para verificar si el plan está listo
        pollForPlan(generateResponse.planId, week);
      }
    } catch (error: any) {
      // Detectar 504 Gateway Timeout o cualquier timeout
      const is504 = error.response?.status === 504;
      const isNetworkError = error.message?.toLowerCase().includes('network');
      const isTimeout = error.code === 'ECONNABORTED' || 
                       error.code === 'ETIMEDOUT' ||
                       error.message?.toLowerCase().includes('timeout') || 
                       error.message?.includes('504');
      
      if (is504 || isTimeout || isNetworkError) {
        setGenerationProgress(20);
        // Iniciar polling inmediatamente - el plan se está creando en el backend
        pollForPlan(`temp-${week}`, week);
        return;
      }

      // Si es otro tipo de error, cerrar el modal y mostrar error
      setIsGenerating(false);
      setGenerationProgress(0);
      Alert.alert('Error', 'No se pudo generar el plan. Intenta de nuevo.');
    }
  };

  const pollForPlan = async (planId: string, week: string, attempts: number = 0) => {
    const maxAttempts = 30; // 30 intentos = ~2.5 minutos con intervalos de 5s
    const pollInterval = 5000; // 5 segundos entre cada intento

    // Actualizar progreso basado en intentos
    const progress = Math.min(20 + (attempts / maxAttempts) * 75, 95);
    setGenerationProgress(progress);

    try {
      // Intentar obtener el plan actualizado
      const plan = await NutritionService.getWeeklyPlan(week);

      // Verificar si el plan existe y tiene contenido
      const isPlanReady = plan && plan.days && plan.days.length > 0;
      
      if (isPlanReady) {
        // El plan está listo
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
        setTimeout(() => {
          pollForPlan(planId, week, attempts + 1);
        }, pollInterval);
      } else {
        // Timeout - el plan tardó demasiado
        setIsGenerating(false);
        setGenerationProgress(0);
        Alert.alert(
          'Plan en proceso',
          'Tu plan se está generando y estará listo pronto. Puedes refrescar la pantalla en unos minutos.',
          [
            {
              text: 'Refrescar ahora',
              onPress: () => {
                loadWeeklyPlan(week);
              }
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error: any) {
      // Si no hemos alcanzado el máximo de intentos, continuar intentando
      if (attempts < maxAttempts) {
        setTimeout(() => {
          pollForPlan(planId, week, attempts + 1);
        }, pollInterval);
      } else {
        setIsGenerating(false);
        setGenerationProgress(0);
        Alert.alert('Error', 'Hubo un problema verificando tu plan. Intenta refrescar la pantalla.');
      }
    }
  };

  const generateWeekDays = (weekString: string) => {
    // Parsear semana ISO (YYYY-WXX)
    const [year, weekNum] = weekString.split('-W');
    const weekNumber = parseInt(weekNum);
    
    // Calcular el primer día de la semana (lunes) usando cálculo ISO correcto
    const jan4 = new Date(parseInt(year), 0, 4);
    const firstThursday = new Date(jan4.getTime());
    firstThursday.setDate(jan4.getDate() + 3 - (jan4.getDay() + 6) % 7);
    
    // El lunes de la semana objetivo
    const targetMonday = new Date(firstThursday.getTime());
    targetMonday.setDate(firstThursday.getDate() - 3 + (weekNumber - 1) * 7);
    
    const today = new Date();
    const todayDayIndex = today.getDay() === 0 ? 7 : today.getDay(); // Convertir domingo (0) a 7
    
    const days: DayInfo[] = [];
    let todayIndex = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(targetMonday);
      date.setDate(targetMonday.getDate() + i);
      
      const dayIndex = i + 1; // 1 = lunes, 7 = domingo
      const isToday = 
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
      
      if (isToday) {
        todayIndex = i;
      }
      
      days.push({
        dayIndex,
        dayName: DAYS[i],
        date,
        dateNumber: date.getDate(),
        isToday
      });
    }
    
    setWeekDays(days);
    setSelectedDay(todayIndex); // Seleccionar el día actual por defecto
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentWeekString = NutritionService.getCurrentWeek();
    
    // Solo permitir navegación hacia atrás (semanas pasadas)
    if (direction === 'next') {
      // No permitir ir más allá de la semana actual
      if (currentWeek >= currentWeekString) {
        return; // Ya estamos en la semana actual, no avanzar más
      }
    }
    
    const [year, weekNum] = currentWeek.split('-W');
    let newWeek = parseInt(weekNum) + (direction === 'next' ? 1 : -1);
    let newYear = parseInt(year);
    
    // Manejar cambio de año
    if (newWeek > 52) {
      newWeek = 1;
      newYear++;
    } else if (newWeek < 1) {
      newWeek = 52;
      newYear--;
    }
    
    const newWeekString = `${newYear}-W${newWeek.toString().padStart(2, '0')}`;
    
    // Verificar que no vayamos más allá de la semana actual
    if (direction === 'next' && newWeekString > currentWeekString) {
      return; // No permitir ir al futuro
    }
    
    loadWeeklyPlan(newWeekString);
  };



  const getSelectedDayMeals = (): WeeklyPlanMeal[] => {
    if (!weeklyPlan || !weekDays[selectedDay]) return [];
    
    const selectedDayInfo = weekDays[selectedDay];
    const dayPlan = weeklyPlan.days.find(day => day.dayIndex === selectedDayInfo.dayIndex);
    return dayPlan?.meals || [];
  };

  // Calcular progreso nutricional del día seleccionado
  const getDailyProgress = () => {
    // Si es el día de hoy, usar los datos del backend
    const selectedDayInfo = weekDays[selectedDay];
    if (selectedDayInfo?.isToday && todayMealsConsumed?.totals) {
      return {
        kcal: todayMealsConsumed.totals.kcal || 0,
        protein_g: todayMealsConsumed.totals.protein_g || 0,
        carbs_g: todayMealsConsumed.totals.carbs_g || 0,
        fat_g: todayMealsConsumed.totals.fat_g || 0,
      };
    }

    // Para otros días, usar el tracking local (marcas de consumo)
    const meals = getSelectedDayMeals();
    const dayIndex = weekDays[selectedDay]?.dayIndex || 1;
    
    let consumed = {
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    };

    meals.forEach((meal, mealIndex) => {
      const markKey = `${dayIndex}-${mealIndex}`;
      if (consumedMeals.has(markKey)) {
        consumed.kcal += meal.kcal || 0;
        consumed.protein_g += meal.protein_g || 0;
        consumed.carbs_g += meal.carbs_g || 0;
        consumed.fat_g += meal.fat_g || 0;
      }
    });

    return consumed;
  };

  const getMealTypeLabel = (slot: string): string => {
    const labels: { [key: string]: string } = {
      'BREAKFAST': '🌅 Desayuno',
      'LUNCH': '☀️ Almuerzo', 
      'DINNER': '🌙 Cena',
      'SNACK': '🥜 Snack'
    };
    return labels[slot] || slot;
  };

  const openIngredientsModal = (meal: WeeklyPlanMeal) => {
    setSelectedMeal(meal);
    setShowIngredientsModal(true);
  };

  const closeIngredientsModal = () => {
    setShowIngredientsModal(false);
    setSelectedMeal(null);
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

  const handleRegenerateDay = async () => {
    if (!weeklyPlan || !weekDays[selectedDay]) {
      return;
    }

    // Verificar si se puede modificar esta semana
    const canModify = canModifyWeek(currentWeek);
    
    if (!canModify) {
      Alert.alert(
        'Semana pasada',
        'No puedes modificar planes de semanas anteriores. Solo puedes ver el contenido.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }
    
    // Usar setTimeout para asegurar que el Alert se muestre después del render
    setTimeout(() => {
      Alert.alert(
        'Regenerar día completo',
        '¿Estás seguro? Esto cambiará todas las comidas de este día.',
        [
          { 
            text: 'Cancelar', 
            style: 'cancel'
          },
          {
            text: 'Regenerar',
            style: 'destructive',
            onPress: async () => {
              try {
                setRegeneratingDay(true);
                const dayIndex = weekDays[selectedDay].dayIndex;
                
                const regeneratedDay = await NutritionService.regenerateDay(weeklyPlan.id, dayIndex);
                
                // Actualizar el plan existente con el día regenerado
                const updatedPlan = {
                  ...weeklyPlan,
                  days: weeklyPlan.days.map(day => 
                    day.dayIndex === regeneratedDay.dayIndex 
                      ? { ...day, meals: regeneratedDay.meals }
                      : day
                  )
                };
                
                setWeeklyPlan(updatedPlan);
                Alert.alert('¡Listo!', 'El día ha sido regenerado exitosamente');
              } catch (error: any) {
                Alert.alert('Error', 'No se pudo regenerar el día. Intenta de nuevo.');
              } finally {
                setRegeneratingDay(false);
              }
            }
          }
        ]
      );
    }, 100);
  };

  const handleMarkMealAsConsumed = async (meal: WeeklyPlanMeal, dayIndex: number, mealIndex: number) => {
    if (!weeklyPlan) return;

    const markKey = `${dayIndex}-${mealIndex}`;
    
    // Verificar si ya fue marcada
    if (consumedMeals.has(markKey)) {
      Alert.alert('Ya registrada', 'Esta comida ya fue marcada como consumida.');
      return;
    }
    
    try {
      setMarkingMeal(markKey);
      
      // Registrar la comida directamente usando logMeal
      await NutritionService.logMeal({
        slot: meal.slot,
        title: meal.title,
        kcal: meal.kcal,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fat_g: meal.fat_g,
        notes: `Del plan semanal - ${weekDays[selectedDay]?.dayName}`,
      });
      
      // Agregar al set de comidas consumidas
      const newConsumedMeals = new Set(consumedMeals).add(markKey);
      setConsumedMeals(newConsumedMeals);
      
      // Guardar estado en AsyncStorage
      await saveConsumedMealsState(newConsumedMeals);
      
      // Recargar comidas del día para actualizar el progreso
      await loadTodayMeals();
      
      Alert.alert('¡Registrado! ✅', `"${meal.title}" ha sido marcada como consumida.`);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo marcar la comida. Intenta de nuevo.');
    } finally {
      setMarkingMeal(null);
    }
  };

  const handleSwapMeal = async (mealIndex: number, mealTitle: string) => {
    if (!weeklyPlan || !weekDays[selectedDay]) return;

    // Verificar si se puede modificar esta semana
    if (!canModifyWeek(currentWeek)) {
      Alert.alert(
        'Semana pasada',
        'No puedes modificar comidas de semanas anteriores. Solo puedes ver el contenido.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Cambiar comida',
      `¿Quieres cambiar "${mealTitle}" por otra opción?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar',
          onPress: async () => {
            try {
              const dayIndex = weekDays[selectedDay].dayIndex;
              const swapKey = `${dayIndex}-${mealIndex}`;
              setSwappingMeal(swapKey);
              
              const swappedMeal = await NutritionService.swapMeal(weeklyPlan.id, dayIndex, mealIndex);
              
              // Actualizar el plan existente reemplazando solo la comida específica
              const updatedPlan = {
                ...weeklyPlan,
                days: weeklyPlan.days.map(day => {
                  if (day.dayIndex === swappedMeal.dayIndex) {
                    // Reemplazar la comida específica en el índice correcto
                    const updatedMeals = [...day.meals];
                    updatedMeals[swappedMeal.mealIndex] = swappedMeal.meal;
                    return { ...day, meals: updatedMeals };
                  }
                  return day;
                })
              };
              
              setWeeklyPlan(updatedPlan);
              Alert.alert('¡Cambiado!', 'La comida ha sido cambiada exitosamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo cambiar la comida. Intenta de nuevo.');
            } finally {
              setSwappingMeal(null);
            }
          }
        }
      ]
    );
  };

  const renderPlanHeader = () => (
    <View style={styles.planInfo}>
      <View style={styles.planHeaderRow}>
        {/* Week Navigation */}
        <View style={styles.weekNavigationContainer}>
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => navigateWeek('prev')}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          
          <View style={styles.weekInfo}>
            <Text style={styles.weekTitle}>Semana {currentWeek}</Text>
            {isWeekInPast(currentWeek) && (
              <Text style={styles.readOnlyTag}>🔒 Solo lectura</Text>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.navButton, !canNavigateNext() && styles.navButtonDisabled]} 
            onPress={() => navigateWeek('next')}
            disabled={!canNavigateNext()}
          >
            <Text style={[styles.navButtonText, !canNavigateNext() && styles.navButtonTextDisabled]}>
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        {weeklyPlan && (
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleGenerateShoppingList}
            >
              <Text style={styles.actionButtonIcon}>📋</Text>
            </TouchableOpacity>
            {/* Share button commented out for now as in original
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonIcon}>📤</Text>
            </TouchableOpacity>
            */}
          </View>
        )}
      </View>
    </View>
  );

  const renderDaySelector = () => (
    <View style={styles.daySelector}>
      {weekDays.map((dayInfo, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.dayButton,
            selectedDay === index && styles.dayButtonActive,
            dayInfo.isToday && styles.dayButtonToday
          ]}
          onPress={() => setSelectedDay(index)}
        >
          <Text style={[
            styles.dayText,
            selectedDay === index && styles.dayTextActive,
            dayInfo.isToday && styles.dayTextToday
          ]}>
            {dayInfo.dayName}
          </Text>
          <Text style={[
            styles.dayNumber,
            selectedDay === index && styles.dayNumberActive,
            dayInfo.isToday && styles.dayNumberToday
          ]}>
            {dayInfo.dateNumber}
          </Text>
          {dayInfo.isToday && <View style={styles.todayIndicator} />}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMealPlan = () => {
    const meals = getSelectedDayMeals();
    
    if (meals.length === 0) {
      return (
        <View style={styles.noMealsContainer}>
          <Text style={styles.noMealsText}>
            No hay comidas planificadas para este día
          </Text>
          {weeklyPlan && (
            <TouchableOpacity 
              style={styles.generateButton}
              onPress={() => generatePlan(currentWeek)}
            >
              <Text style={styles.generateButtonText}>Regenerar plan</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Agrupar comidas por tipo
    const mealsByType: { [key: string]: WeeklyPlanMeal[] } = {};
    meals.forEach(meal => {
      if (!mealsByType[meal.slot]) {
        mealsByType[meal.slot] = [];
      }
      mealsByType[meal.slot].push(meal);
    });

    const canModify = canModifyWeek(currentWeek);
    const isButtonDisabled = regeneratingDay || !canModify;

    return (
      <View style={styles.mealPlan}>
        {/* Botón para regenerar día completo */}
        <View style={styles.dayActions}>
          <TouchableOpacity 
            style={[
              styles.regenerateDayButton, 
              isButtonDisabled && styles.buttonDisabled
            ]}
            onPress={handleRegenerateDay}
            disabled={isButtonDisabled}
          >
            {regeneratingDay ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.regenerateDayButtonText}>
                {!canModify ? '🔒 Semana pasada' : '🔄 Regenerar día completo'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {Object.entries(mealsByType).map(([slot, slotMeals]) => (
          <View key={slot} style={styles.mealSection}>
            <Text style={styles.mealTitle}>{getMealTypeLabel(slot)}</Text>
            {slotMeals.map((meal, slotMealIndex) => {
              const dayIndex = weekDays[selectedDay]?.dayIndex || 1;
              
              // Calcular el índice global de la comida en el día
              const allDayMeals = getSelectedDayMeals();
              const globalMealIndex = allDayMeals.findIndex(m => 
                m.title === meal.title && m.slot === meal.slot && m.kcal === meal.kcal
              );
              
              const swapKey = `${dayIndex}-${globalMealIndex}`;
              const isSwapping = swappingMeal === swapKey;
              
              return (
                <View key={`${slot}-${slotMealIndex}`} style={styles.mealItem}>
                  <View style={styles.mealHeader}>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName}>{meal.title}</Text>
                      <Text style={styles.mealDetails}>
                        {meal.kcal} kcal • P: {meal.protein_g}g • C: {meal.carbs_g}g • G: {meal.fat_g}g
                      </Text>
                    </View>
                    
                    {/* Botones de acción */}
                    <View style={styles.mealActions}>
                      {/* Botón para marcar como consumida */}
                      <TouchableOpacity 
                        style={[
                          styles.consumedButton,
                          consumedMeals.has(`${dayIndex}-${globalMealIndex}`) && styles.consumedButtonMarked,
                          markingMeal === `${dayIndex}-${globalMealIndex}` && styles.buttonDisabled
                        ]}
                        onPress={() => handleMarkMealAsConsumed(meal, dayIndex, globalMealIndex)}
                        disabled={markingMeal === `${dayIndex}-${globalMealIndex}` || consumedMeals.has(`${dayIndex}-${globalMealIndex}`)}
                      >
                        {markingMeal === `${dayIndex}-${globalMealIndex}` ? (
                          <ActivityIndicator size="small" color="#4CAF50" />
                        ) : (
                          <Text style={[
                            styles.consumedButtonText,
                            consumedMeals.has(`${dayIndex}-${globalMealIndex}`) && styles.consumedButtonTextMarked
                          ]}>
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>

                      {/* Botón para cambiar comida individual */}
                      <TouchableOpacity 
                        style={[
                          styles.swapMealButton, 
                          (isSwapping || !canModifyWeek(currentWeek)) && styles.buttonDisabled
                        ]}
                        onPress={() => handleSwapMeal(globalMealIndex, meal.title)}
                        disabled={isSwapping || !canModifyWeek(currentWeek)}
                      >
                        {isSwapping ? (
                          <ActivityIndicator size="small" color="#4CAF50" />
                        ) : (
                          <Text style={styles.swapMealButtonText}>
                            {!canModifyWeek(currentWeek) ? '🔒' : '🔄'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {meal.ingredients.length > 0 && (
                    <TouchableOpacity 
                      style={styles.ingredientsContainer}
                      onPress={() => openIngredientsModal(meal)}
                    >
                      <Text style={styles.mealIngredients}>
                        Ingredientes: {meal.ingredients.slice(0, 3).map(ingredient => {
                          if (typeof ingredient === 'string') {
                            return ingredient;
                          } else {
                            // Si es objeto, mostrar nombre y cantidad si está disponible
                            let display = ingredient.name;
                            const quantity = ingredient.qty || ingredient.quantity;
                            if (quantity && ingredient.unit) {
                              display += ` (${quantity} ${ingredient.unit})`;
                            }
                            return display;
                          }
                        }).join(', ')}
                        {meal.ingredients.length > 3 && '...'}
                      </Text>
                      <Text style={styles.viewAllText}>
                        {meal.ingredients.length > 3 ? 'Ver todos' : 'Ver detalles'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando plan semanal...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* New Header */}
      {renderPlanHeader()}

      {/* Day Selector */}
      {renderDaySelector()}

      {/* Content */}
      <ScrollView style={styles.content}>
        {weeklyPlan ? (
          <>


            {/* Meal Plan */}
            {renderMealPlan()}

            {/* Plan Notes */}
            {weeklyPlan.notes && (
              <View style={styles.notesSection}>
                <Text style={styles.notesTitle}>💡 Nota del plan</Text>
                <Text style={styles.notesText}>{weeklyPlan.notes}</Text>
              </View>
            )}

            {/* Macros Summary con barra de progreso */}
            <View style={styles.macrosSection}>
              <Text style={styles.macrosTitle}>📊 Objetivos nutricionales</Text>
              
              {(() => {
                const progress = getDailyProgress();
                const kcalPercent = Math.min(100, (progress.kcal / weeklyPlan.macros.kcalTarget) * 100);
                const proteinPercent = Math.min(100, (progress.protein_g / weeklyPlan.macros.protein_g) * 100);
                const carbsPercent = Math.min(100, (progress.carbs_g / weeklyPlan.macros.carbs_g) * 100);
                const fatPercent = Math.min(100, (progress.fat_g / weeklyPlan.macros.fat_g) * 100);

                return (
                  <>
                    {/* Calorías con barra de progreso */}
                    <View style={styles.macroWithProgress}>
                      <View style={styles.macroHeader}>
                        <Text style={styles.macroLabelLarge}>Calorías</Text>
                        <Text style={styles.macroNumberLarge}>
                          {Math.round(progress.kcal)} / {weeklyPlan.macros.kcalTarget} kcal
                        </Text>
                      </View>
                      <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${kcalPercent}%` }]} />
                      </View>
                      {progress.kcal === 0 && (
                        <Text style={styles.progressHint}>Marca las comidas que consumas para ver tu progreso</Text>
                      )}
                    </View>

                    {/* Macros con barras de progreso */}
                    <View style={styles.macrosColumn}>
                      {/* Proteína */}
                      <View style={styles.macroWithProgressSmall}>
                        <View style={styles.macroHeaderSmall}>
                          <Text style={styles.macroLabel}>Proteína</Text>
                          <Text style={styles.macroNumber}>
                            {Math.round(progress.protein_g)} / {weeklyPlan.macros.protein_g}g
                          </Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBar, styles.progressBarProtein, { width: `${proteinPercent}%` }]} />
                        </View>
                      </View>

                      {/* Carbohidratos */}
                      <View style={styles.macroWithProgressSmall}>
                        <View style={styles.macroHeaderSmall}>
                          <Text style={styles.macroLabel}>Carbohidratos</Text>
                          <Text style={styles.macroNumber}>
                            {Math.round(progress.carbs_g)} / {weeklyPlan.macros.carbs_g}g
                          </Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBar, styles.progressBarCarbs, { width: `${carbsPercent}%` }]} />
                        </View>
                      </View>

                      {/* Grasas */}
                      <View style={styles.macroWithProgressSmall}>
                        <View style={styles.macroHeaderSmall}>
                          <Text style={styles.macroLabel}>Grasas</Text>
                          <Text style={styles.macroNumber}>
                            {Math.round(progress.fat_g)} / {weeklyPlan.macros.fat_g}g
                          </Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBar, styles.progressBarFat, { width: `${fatPercent}%` }]} />
                        </View>
                      </View>
                    </View>
                  </>
                );
              })()}
            </View>
          </>
        ) : (
          <View style={styles.noPlanContainer}>
            <Text style={styles.noPlanTitle}>Sin plan semanal</Text>
            <Text style={styles.noPlanDescription}>
              {isWeekInPast(currentWeek) 
                ? 'No tienes un plan nutricional registrado para esta semana pasada.'
                : 'No tienes un plan nutricional para esta semana.'
              }
            </Text>
            {canModifyWeek(currentWeek) && (
              <TouchableOpacity 
                style={styles.generateButton}
                onPress={() => generatePlan(currentWeek)}
              >
                <LinearGradient
                  colors={GRADIENTS.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 16, paddingHorizontal: 30, borderRadius: 24 }}
                >
                  <Text style={styles.generateButtonText}>🤖 Generar plan con IA</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {isWeekInPast(currentWeek) && (
              <View style={styles.pastWeekInfo}>
                <Text style={styles.pastWeekInfoText}>
                  🔒 Las semanas pasadas son solo de consulta
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal de ingredientes */}
      <IngredientsModal
        visible={showIngredientsModal}
        onClose={closeIngredientsModal}
        ingredients={selectedMeal?.ingredients || []}
        mealTitle={selectedMeal?.title || ''}
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

      {/* Modal de generación de plan */}
      <PlanGeneratingModal
        visible={isGenerating}
        progress={generationProgress}
        type="nutrition"
      />
    </View>
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
  // Estilos del nuevo header
  planInfo: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16, // Reducido de 20 a 16
    paddingTop: 16, // Reducido de 60 a 16
    paddingBottom: 12, // Reducido de 20 a 12
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekNavigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weekInfo: {
    marginHorizontal: 12, // Reducido de 15 a 12
  },
  weekTitle: {
    fontSize: 18, // Reducido de 20 a 18
    fontWeight: 'bold',
    color: '#fff',
  },
  readOnlyTag: {
    fontSize: 11, // Reducido de 12 a 11
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 3, // Reducido de 4 a 3
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonIcon: {
    fontSize: 20,
  },
  weekNavigation: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  navButtonDisabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.5,
  },
  navButtonTextDisabled: {
    color: '#ccc',
  },
  daySelector: {
    backgroundColor: '#fff',
    paddingVertical: 8,
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
  },
  dayButtonActive: {
    backgroundColor: '#4CAF50',
  },
  dayButtonToday: {
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  dayText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
    marginBottom: 2,
  },
  dayTextActive: {
    color: '#fff',
  },
  dayTextToday: {
    color: '#E88D72',
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E36',
  },
  dayNumberActive: {
    color: '#fff',
  },
  dayNumberToday: {
    color: '#E88D72',
    fontWeight: 'bold',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 3,
    width: 6,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#E88D72',
  },
  content: {
    flex: 1,
  },
  mealPlan: {
    padding: 20,
  },
  mealSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  mealItem: {
    marginBottom: 15,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  mealDetails: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#81C784',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  shoppingButton: {
    backgroundColor: '#FF9800',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  shoppingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Nuevos estilos
  dayInfo: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  dayInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  noMealsContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  noMealsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  ingredientsContainer: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  mealIngredients: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  viewAllText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right',
  },
  notesSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 15,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  macrosSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 15,
  },
  macrosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macrosColumn: {
    gap: 16,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroWithProgressSmall: {
    marginBottom: 8,
  },
  macroHeaderSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBarProtein: {
    backgroundColor: '#FF6B6B',
  },
  progressBarCarbs: {
    backgroundColor: '#4ECDC4',
  },
  progressBarFat: {
    backgroundColor: '#FFE66D',
  },
  macroNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  macroWithProgress: {
    marginBottom: 20,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  macroLabelLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  macroNumberLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  progressHint: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  noPlanContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  noPlanTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  noPlanDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Nuevos estilos para regenerar y cambiar comidas
  dayActions: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  regenerateDayButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  regenerateDayButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mealInfo: {
    flex: 1,
    marginRight: 10,
  },
  mealActions: {
    flexDirection: 'row',
    gap: 8,
  },
  consumedButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  consumedButtonMarked: {
    backgroundColor: '#4CAF50',
    opacity: 0.7,
  },
  consumedButtonText: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  consumedButtonTextMarked: {
    color: '#fff',
  },
  swapMealButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  swapMealButtonText: {
    fontSize: 16,
    color: '#4CAF50',
  },
  pastWeekInfo: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  pastWeekInfoText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
    textAlign: 'center',
  },
});