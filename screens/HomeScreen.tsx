import React from 'react';
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
import { WeeklyPlan, WeeklyPlanMeal, ShoppingListItem } from '../types/nutrition';
import { PlanGeneratingModal } from '../components/PlanGeneratingModal';
import { ShoppingListModal } from '../components/ShoppingListModal';

export const HomeScreen: React.FC = () => {
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
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleGeneratePlan = async () => {
    try {
      setIsGenerating(true);
      setGenerationProgress(0);

      // Iniciar la generación del plan
      const generateResponse = await NutritionService.generatePlanWithAI(currentWeek);

      if (generateResponse.created) {
        // Iniciar polling para verificar si el plan está listo
        pollForPlan(generateResponse.planId);
      }
    } catch (error: any) {
      console.log('Error generating plan:', error);
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
    const pollInterval = 6000; // 6 segundos entre intentos

    // Actualizar progreso basado en intentos
    const progress = Math.min((attempts / maxAttempts) * 100, 95);
    setGenerationProgress(progress);

    try {
      // Intentar obtener el plan actualizado
      const plan = await NutritionService.getWeeklyPlan(currentWeek);

      if (plan && plan.id === planId) {
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
          pollForPlan(planId, attempts + 1);
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
      console.log('Error polling for plan:', error);

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
  const totalConsumedToday = todayMeals.reduce((sum, meal) => sum + meal.kcal, 0);
  const caloriesTarget = weeklyPlan?.macros.kcalTarget || 2000;
  const remainingCalories = Math.max(0, caloriesTarget - totalConsumedToday);

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>¡Hola, {user?.name || 'Usuario'}!</Text>
          <Text style={styles.subtitle}>
            {weeklyPlan ? 'Tu plan nutricional de hoy' : 'Crea tu plan nutricional'}
          </Text>
          <Text style={styles.weekInfo}>Semana {currentWeek}</Text>
        </View>

        {weeklyPlan ? (
          <>
            {/* Progreso del día */}
            <View style={styles.progressCard}>
              <Text style={styles.cardTitle}>Progreso de hoy</Text>
              <View style={styles.progressRow}>
                <View style={styles.progressItem}>
                  <Text style={styles.progressNumber}>{totalConsumedToday}</Text>
                  <Text style={styles.progressLabel}>Planificadas</Text>
                </View>
                <View style={styles.progressDivider} />
                <View style={styles.progressItem}>
                  <Text style={styles.progressNumber}>{caloriesTarget}</Text>
                  <Text style={styles.progressLabel}>Objetivo</Text>
                </View>
                <View style={styles.progressDivider} />
                <View style={styles.progressItem}>
                  <Text style={[styles.progressNumber, styles.remaining]}>{remainingCalories}</Text>
                  <Text style={styles.progressLabel}>Restantes</Text>
                </View>
              </View>
            </View>

            {/* Macros del plan */}
            <View style={styles.macrosCard}>
              <Text style={styles.cardTitle}>Objetivos nutricionales</Text>
              <View style={styles.macrosRow}>
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

            {/* Comidas del día */}
            <View style={styles.mealsSection}>
              <Text style={styles.sectionTitle}>Comidas de hoy</Text>

              {todayMeals.length > 0 ? (
                todayMeals.map((meal, index) => (
                  <TouchableOpacity key={index} style={styles.mealCard}>
                    <View style={styles.mealHeader}>
                      <Text style={styles.mealTime}>{getMealTypeLabel(meal.slot)}</Text>
                      <Text style={styles.mealCalories}>{meal.kcal} kcal</Text>
                    </View>
                    <Text style={styles.mealDescription}>{meal.title}</Text>
                    <View style={styles.mealMacros}>
                      <Text style={styles.mealMacroText}>P: {meal.protein_g}g</Text>
                      <Text style={styles.mealMacroText}>C: {meal.carbs_g}g</Text>
                      <Text style={styles.mealMacroText}>G: {meal.fat_g}g</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noMealsCard}>
                  <Text style={styles.noMealsText}>No hay comidas planificadas para hoy</Text>
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

            {/* Botones de acción */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.shoppingButton} onPress={handleGenerateShoppingList}>
                <Text style={styles.shoppingButtonText}>🛒 Lista de compras</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.aiButton} onPress={handleGeneratePlan}>
                <Text style={styles.aiButtonText}>🤖 Regenerar plan</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F5E8',
    marginBottom: 5,
  },
  weekInfo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  progressCard: {
    backgroundColor: '#fff',
    margin: 20,
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
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  remaining: {
    color: '#FF9800',
  },
  progressDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 10,
  },
  mealsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  mealCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  mealDescription: {
    fontSize: 14,
    color: '#666',
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  profileText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 20,
    gap: 10,
  },
  shoppingButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
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
  aiButton: {
    backgroundColor: '#FF9800',
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Nuevos estilos
  macrosCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
    fontWeight: 'bold',
    color: '#FF9800',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  mealMacros: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 15,
  },
  mealMacroText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  noMealsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  noMealsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  notesCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  notesText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  noPlanContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  noPlanCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  noPlanTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  noPlanDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  createPlanButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  createPlanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});