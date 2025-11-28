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
import { NutritionService } from '../services/nutritionService';
import { WeeklyPlan, WeeklyPlanMeal, WeeklyPlanIngredient, ShoppingListItem } from '../types/nutrition';
import { IngredientsModal } from '../components/IngredientsModal';
import { ShoppingListModal } from '../components/ShoppingListModal';
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

  useEffect(() => {
    loadWeeklyPlan();
  }, []);

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
      console.log('Error loading weekly plan:', error);
      Alert.alert('Error', 'No se pudo cargar el plan semanal');
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async (week: string) => {
    try {
      setLoading(true);
      await NutritionService.generatePlanWithAI(week);
      // Recargar después de generar
      setTimeout(() => {
        loadWeeklyPlan(week);
      }, 2000);
    } catch (error) {
      console.log('Error generating plan:', error);
      Alert.alert('Error', 'No se pudo generar el plan');
      setLoading(false);
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

  const handleRegenerateDay = async () => {
    if (!weeklyPlan || !weekDays[selectedDay]) return;

    // Verificar si se puede modificar esta semana
    if (!canModifyWeek(currentWeek)) {
      Alert.alert(
        'Semana pasada',
        'No puedes modificar planes de semanas anteriores. Solo puedes ver el contenido.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Regenerar día completo',
      '¿Estás seguro? Esto cambiará todas las comidas de este día.',
      [
        { text: 'Cancelar', style: 'cancel' },
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
            } catch (error) {
              console.log('Error regenerating day:', error);
              Alert.alert('Error', 'No se pudo regenerar el día. Intenta de nuevo.');
            } finally {
              setRegeneratingDay(false);
            }
          }
        }
      ]
    );
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
              console.log('Error swapping meal:', error);
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
              <Text style={styles.actionButtonIcon}>🛒</Text>
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
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.daySelector}
    >
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
    </ScrollView>
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

    return (
      <View style={styles.mealPlan}>
        {/* Botón para regenerar día completo */}
        <View style={styles.dayActions}>
          <TouchableOpacity 
            style={[
              styles.regenerateDayButton, 
              (regeneratingDay || !canModifyWeek(currentWeek)) && styles.buttonDisabled
            ]}
            onPress={handleRegenerateDay}
            disabled={regeneratingDay || !canModifyWeek(currentWeek)}
          >
            {regeneratingDay ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.regenerateDayButtonText}>
                {!canModifyWeek(currentWeek) ? '🔒 Semana pasada' : '🔄 Regenerar día completo'}
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
            {/* Selected Day Info */}
            <View style={styles.dayInfo}>
              <Text style={styles.dayInfoText}>
                {weekDays[selectedDay]?.dayName} {weekDays[selectedDay]?.dateNumber}
                {weekDays[selectedDay]?.isToday && ' (Hoy)'}
              </Text>
            </View>

            {/* Meal Plan */}
            {renderMealPlan()}

            {/* Plan Notes */}
            {weeklyPlan.notes && (
              <View style={styles.notesSection}>
                <Text style={styles.notesTitle}>💡 Nota del plan</Text>
                <Text style={styles.notesText}>{weeklyPlan.notes}</Text>
              </View>
            )}

            {/* Macros Summary */}
            <View style={styles.macrosSection}>
              <Text style={styles.macrosTitle}>📊 Objetivos nutricionales</Text>
              <View style={styles.macrosRow}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroNumber}>{weeklyPlan.macros.kcalTarget}</Text>
                  <Text style={styles.macroLabel}>kcal/día</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroNumber}>{weeklyPlan.macros.protein_g}g</Text>
                  <Text style={styles.macroLabel}>Proteína</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroNumber}>{weeklyPlan.macros.carbs_g}g</Text>
                  <Text style={styles.macroLabel}>Carbos</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroNumber}>{weeklyPlan.macros.fat_g}g</Text>
                  <Text style={styles.macroLabel}>Grasas</Text>
                </View>
              </View>
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
  header: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  pastWeekBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  pastWeekBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  shoppingListButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shoppingListButtonText: {
    fontSize: 18,
  },
  shareButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 16,
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
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  daySelector: {
    backgroundColor: '#fff',
    paddingVertical: 15,
  },
  dayButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 15,
    minWidth: 60,
  },
  dayButtonActive: {
    backgroundColor: '#4CAF50',
  },
  dayButtonToday: {
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  dayText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dayTextActive: {
    color: '#fff',
  },
  dayTextToday: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  dayNumberActive: {
    color: '#fff',
  },
  dayNumberToday: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9800',
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
  macroItem: {
    alignItems: 'center',
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