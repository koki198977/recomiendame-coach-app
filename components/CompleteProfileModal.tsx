import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from './Logo';
import { NutritionService } from '../services/nutritionService';
import { Cuisine, Allergy, Condition, NutritionGoal, TimeFrame, NutritionGoalDetails } from '../types/nutrition';
import AsyncStorage from '@react-native-async-storage/async-storage';


const { width, height } = Dimensions.get('window');

interface CompleteProfileModalProps {
  visible: boolean;
  onComplete: (profileData: any) => void;
  onSkip?: () => void; // Opcional
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const [formData, setFormData] = useState({
    sex: '',
    heightCm: '',
    weightKg: '',
    activityLevel: '',
    country: 'CL',
    allergies: [] as number[],
    customAllergies: [] as string[], // Alergias personalizadas (texto libre)
    conditions: [] as number[],
    customConditions: [] as string[], // Condiciones personalizadas (texto libre)
    cuisinesLike: [] as number[],
    cuisinesDislike: [] as number[],
    // Nuevos campos para objetivos
    nutritionGoal: '' as NutritionGoal | '',
    targetWeightKg: '',
    timeFrame: '' as TimeFrame | '',
    intensity: '' as 'GENTLE' | 'MODERATE' | 'AGGRESSIVE' | '',
    currentMotivation: '',
    cookTimePerMeal: '',
  });

  const [currentStep, setCurrentStep] = useState(0);

  // Estados para las listas de opciones
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Referencia al ScrollView para controlar el scroll
  const scrollViewRef = React.useRef<ScrollView>(null);
  
  // Estado para detectar si el teclado está visible
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Detectar cuando el teclado se muestra/oculta
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);
  
  // Estados para búsqueda
  const [allergySearch, setAllergySearch] = useState('');
  const [conditionSearch, setConditionSearch] = useState('');
  const [searchingAllergies, setSearchingAllergies] = useState(false);
  const [searchingConditions, setSearchingConditions] = useState(false);
  
  // Estados para agregar elementos personalizados
  const [newAllergyText, setNewAllergyText] = useState('');
  const [newConditionText, setNewConditionText] = useState('');

  const steps = [
    {
      title: '¡Completemos tu perfil! 🎯',
      subtitle: 'Necesitamos algunos datos para personalizar tu experiencia',
      fields: []
    },
    {
      title: 'Datos básicos',
      subtitle: 'Información personal',
      fields: [
        { key: 'heightCm', label: 'Estatura (cm)', placeholder: '173', keyboardType: 'numeric' },
        { key: 'weightKg', label: 'Peso (kg)', placeholder: '70', keyboardType: 'numeric' },
      ]
    },
    {
      title: 'Estilo de vida',
      subtitle: 'Tu nivel de actividad',
      fields: []
    },
    {
      title: '¿Cuál es tu objetivo? 🎯',
      subtitle: 'Define tu meta nutricional',
      fields: []
    },
    {
      title: 'Tu plan personalizado ⏰',
      subtitle: 'Tiempo y intensidad',
      fields: []
    },
    {
      title: 'Alergias y condiciones',
      subtitle: 'Información médica importante',
      fields: []
    },
    {
      title: 'Preferencias culinarias',
      subtitle: 'Tipos de cocina que te gustan',
      fields: []
    }
  ];

  const activityLevels = [
    { key: 'SEDENTARY', label: '🪑 Sedentario', desc: 'Poco o nada de ejercicio' },
    { key: 'LIGHT', label: '🚶 Ligero', desc: 'Ejercicio ligero 1-3 días/semana' },
    { key: 'MODERATE', label: '🏃 Moderado', desc: 'Ejercicio moderado 3-5 días/semana' },
    { key: 'ACTIVE', label: '💪 Activo', desc: 'Ejercicio intenso 6-7 días/semana' },
  ];

  const genderOptions = [
    { key: 'MALE', label: '👨 Masculino' },
    { key: 'FEMALE', label: '👩 Femenino' },
  ];

  const nutritionGoalOptions = [
    { 
      key: 'MAINTAIN_WEIGHT', 
      label: 'Mantener peso', 
      desc: 'Mantener mi peso actual y mejorar composición corporal',
      emoji: '⚖️'
    },
    { 
      key: 'LOSE_WEIGHT', 
      label: 'Bajar de peso', 
      desc: 'Reducir peso corporal de forma saludable',
      emoji: '📉'
    },
    { 
      key: 'GAIN_WEIGHT', 
      label: 'Subir de peso', 
      desc: 'Aumentar peso de forma saludable',
      emoji: '📈'
    },
    { 
      key: 'BUILD_MUSCLE', 
      label: 'Ganar masa muscular', 
      desc: 'Aumentar músculo y mejorar fuerza',
      emoji: '💪'
    },
    { 
      key: 'ATHLETIC_PERFORMANCE', 
      label: 'Rendimiento deportivo', 
      desc: 'Optimizar nutrición para entrenamientos',
      emoji: '🏃'
    },
    { 
      key: 'GENERAL_HEALTH', 
      label: 'Salud general', 
      desc: 'Mejorar hábitos alimentarios y bienestar',
      emoji: '🌱'
    },
  ];

  const timeFrameOptions = [
    { key: '1_MONTH', label: '1 mes', desc: 'Resultados rápidos' },
    { key: '3_MONTHS', label: '3 meses', desc: 'Cambios sostenibles' },
    { key: '6_MONTHS', label: '6 meses', desc: 'Transformación gradual' },
    { key: '1_YEAR', label: '1 año', desc: 'Cambio de estilo de vida' },
    { key: 'LONG_TERM', label: 'Largo plazo', desc: 'Sin prisa, enfoque en hábitos' },
  ];

  const intensityOptions = [
    { 
      key: 'GENTLE', 
      label: '🌸 Suave', 
      desc: 'Cambios graduales, fácil de mantener',
      color: '#81C784'
    },
    { 
      key: 'MODERATE', 
      label: '🎯 Moderado', 
      desc: 'Balance entre resultados y sostenibilidad',
      color: '#FF9800'
    },
    { 
      key: 'AGGRESSIVE', 
      label: '🔥 Intensivo', 
      desc: 'Cambios más rápidos, requiere disciplina',
      color: '#F44336'
    },
  ];

  const cookTimeOptions = [
    { 
      key: '15', 
      label: 'Rápido (15 min)', 
      desc: 'Comidas simples y rápidas',
      emoji: '🚀'
    },
    { 
      key: '25', 
      label: 'Moderado (25 min)', 
      desc: 'Balance entre tiempo y variedad',
      emoji: '⏰'
    },
    { 
      key: '35', 
      label: 'Elaborado (35 min)', 
      desc: 'Recetas más detalladas',
      emoji: '👨‍🍳'
    },
    { 
      key: '45', 
      label: 'Gourmet (45+ min)', 
      desc: 'Disfruto cocinar sin prisa',
      emoji: '🍽️'
    },
  ];

  // Cargar listas cuando se abre el modal
  React.useEffect(() => {
    if (visible) {
      loadTaxonomies();
    }
  }, [visible]);

  const loadTaxonomies = async () => {
    setLoading(true);
    try {
      const [cuisinesData, allergiesData, conditionsData] = await Promise.all([
        NutritionService.getCuisines('', 50, 0).catch(() => ({ items: [], total: 0 })),
        NutritionService.getAllergies('', 5, 0).catch(() => ({ items: [], total: 0 })),
        NutritionService.getConditions('', 5, 0).catch(() => ({ items: [], total: 0 })),
      ]);
      
      setCuisines(cuisinesData.items);
      setAllergies(allergiesData.items);
      setConditions(conditionsData.items);
      
      // Solo mostrar error si todas las taxonomías fallaron
      if (cuisinesData.items.length === 0 && allergiesData.items.length === 0 && conditionsData.items.length === 0) {
        console.log('No se pudieron cargar las taxonomías, usando datos básicos');
        // Cargar datos básicos como fallback
        loadFallbackData();
      }
    } catch (error) {
      console.log('Error cargando taxonomías:', error);
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackData = () => {
    // Datos básicos como fallback si la API no está disponible
    setCuisines([
      { id: 1, name: 'Mediterránea' },
      { id: 2, name: 'Asiática' },
      { id: 3, name: 'Mexicana' },
      { id: 4, name: 'Italiana' },
      { id: 5, name: 'Vegetariana' },
      { id: 6, name: 'Vegana' },
    ]);
    
    setAllergies([
      { id: 1, name: 'Maní (cacahuate)' },
      { id: 2, name: 'Frutos secos' },
      { id: 3, name: 'Mariscos' },
      { id: 4, name: 'Huevos' },
      { id: 5, name: 'Soja' },
      { id: 6, name: 'Gluten' },
      { id: 7, name: 'Lactosa' },
    ]);
    
    setConditions([
      { id: 1, code: 'DIABETES', label: 'Diabetes' },
      { id: 2, code: 'HYPERTENSION', label: 'Hipertensión' },
      { id: 3, code: 'CELIAC', label: 'Celiaquía' },
      { id: 4, code: 'LACTOSE_INTOLERANT', label: 'Intolerancia a la lactosa' },
    ]);
  };

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: string, itemId: number) => {
    setFormData(prev => {
      const currentArray = prev[key as keyof typeof prev] as number[];
      const newArray = currentArray.includes(itemId)
        ? currentArray.filter(id => id !== itemId)
        : [...currentArray, itemId];
      return { ...prev, [key]: newArray };
    });
  };

  // Agregar alergia personalizada
  const addCustomAllergy = async () => {
    if (!newAllergyText.trim()) return;

    const allergyName = newAllergyText.trim().toLowerCase();

    // 1. Verificar si ya existe en las alergias oficiales
    const existingAllergy = allergies.find(a => a.name.toLowerCase() === allergyName);
    if (existingAllergy) {
      // Si ya existe, simplemente seleccionarla
      if (!formData.allergies.includes(existingAllergy.id)) {
        setFormData(prev => ({
          ...prev,
          allergies: [...prev.allergies, existingAllergy.id]
        }));
        Alert.alert('Alergia encontrada', `"${existingAllergy.name}" ya estaba en la lista y se ha seleccionado.`);
      } else {
        Alert.alert('Ya seleccionada', `"${existingAllergy.name}" ya está seleccionada en tu perfil.`);
      }
      setNewAllergyText('');
      return;
    }

    // 2. Verificar si ya existe en las alergias personalizadas
    const existingCustom = formData.customAllergies.find(a => a.toLowerCase() === allergyName);
    if (existingCustom) {
      Alert.alert('Ya agregada', `"${existingCustom}" ya está en tu lista de alergias personalizadas.`);
      setNewAllergyText('');
      return;
    }

    try {
      // 3. Intentar crear la alergia en la base de datos
      const newAllergy = await NutritionService.createAllergy(newAllergyText.trim());
      
      // Agregar a la lista local de alergias disponibles
      setAllergies(prev => [...prev, newAllergy]);
      
      // Seleccionar automáticamente la nueva alergia
      setFormData(prev => ({
        ...prev,
        allergies: [...prev.allergies, newAllergy.id]
      }));
      
      // Limpiar el campo de texto
      setNewAllergyText('');
      
      // Mostrar mensaje de éxito
      Alert.alert('¡Éxito!', `Se agregó "${newAllergy.name}" a la lista de alergias disponibles.`);
      
    } catch (error: any) {
      console.log('Error creando alergia:', error);
      
      // Si el error es por duplicado (409 Conflict)
      if (error.response?.status === 409) {
        Alert.alert(
          'Alergia ya existe', 
          'Esta alergia ya existe en la base de datos. Intenta buscarla en la lista o usa el buscador.'
        );
        setNewAllergyText('');
        return;
      }
      
      // Si es otro error, agregar como alergia personalizada
      setFormData(prev => ({
        ...prev,
        customAllergies: [...prev.customAllergies, newAllergyText.trim()]
      }));
      setNewAllergyText('');
      
      // Mostrar mensaje informativo
      Alert.alert(
        'Alergia agregada localmente', 
        'Se guardó tu alergia personalizada. Se sincronizará cuando sea posible.'
      );
    }
  };

  // Remover alergia personalizada
  const removeCustomAllergy = (allergy: string) => {
    setFormData(prev => ({
      ...prev,
      customAllergies: prev.customAllergies.filter(a => a !== allergy)
    }));
  };

  // Agregar condición personalizada
  const addCustomCondition = async () => {
    if (!newConditionText.trim()) return;

    const conditionLabel = newConditionText.trim().toLowerCase();

    // 1. Verificar si ya existe en las condiciones oficiales
    const existingCondition = conditions.find(c => c.label.toLowerCase() === conditionLabel);
    if (existingCondition) {
      // Si ya existe, simplemente seleccionarla
      if (!formData.conditions.includes(existingCondition.id)) {
        setFormData(prev => ({
          ...prev,
          conditions: [...prev.conditions, existingCondition.id]
        }));
        Alert.alert('Condición encontrada', `"${existingCondition.label}" ya estaba en la lista y se ha seleccionado.`);
      } else {
        Alert.alert('Ya seleccionada', `"${existingCondition.label}" ya está seleccionada en tu perfil.`);
      }
      setNewConditionText('');
      return;
    }

    // 2. Verificar si ya existe en las condiciones personalizadas
    const existingCustom = formData.customConditions.find(c => c.toLowerCase() === conditionLabel);
    if (existingCustom) {
      Alert.alert('Ya agregada', `"${existingCustom}" ya está en tu lista de condiciones personalizadas.`);
      setNewConditionText('');
      return;
    }

    try {
      // 3. Intentar crear la condición en la base de datos
      const newCondition = await NutritionService.createCondition(newConditionText.trim());
      
      // Agregar a la lista local de condiciones disponibles
      setConditions(prev => [...prev, newCondition]);
      
      // Seleccionar automáticamente la nueva condición
      setFormData(prev => ({
        ...prev,
        conditions: [...prev.conditions, newCondition.id]
      }));
      
      // Limpiar el campo de texto
      setNewConditionText('');
      
      // Mostrar mensaje de éxito
      Alert.alert('¡Éxito!', `Se agregó "${newCondition.label}" a la lista de condiciones disponibles.`);
      
    } catch (error: any) {
      console.log('Error creando condición:', error);
      
      // Si el error es por duplicado (409 Conflict)
      if (error.response?.status === 409) {
        Alert.alert(
          'Condición ya existe', 
          'Esta condición ya existe en la base de datos. Intenta buscarla en la lista o usa el buscador.'
        );
        setNewConditionText('');
        return;
      }
      
      // Si es otro error, agregar como condición personalizada
      setFormData(prev => ({
        ...prev,
        customConditions: [...prev.customConditions, newConditionText.trim()]
      }));
      setNewConditionText('');
      
      // Mostrar mensaje informativo
      Alert.alert(
        'Condición agregada localmente', 
        'Se guardó tu condición personalizada. Se sincronizará cuando sea posible.'
      );
    }
  };

  // Remover condición personalizada
  const removeCustomCondition = (condition: string) => {
    setFormData(prev => ({
      ...prev,
      customConditions: prev.customConditions.filter(c => c !== condition)
    }));
  };

  // Búsqueda de alergias
  const searchAllergies = async (searchText: string) => {
    setAllergySearch(searchText);
    
    if (searchText.trim().length > 0) {
      try {
        setSearchingAllergies(true);
        const response = await NutritionService.getAllergies(searchText, 20, 0);
        setAllergies(response.items);
      } catch (error) {
        // Error silencioso
      } finally {
        setSearchingAllergies(false);
      }
    } else {
      // Si borra el texto, volver a cargar las comunes
      try {
        const response = await NutritionService.getAllergies('', 5, 0);
        setAllergies(response.items);
      } catch (error) {
        // Error silencioso
      }
    }
  };

  // Búsqueda de condiciones
  const searchConditions = async (searchText: string) => {
    setConditionSearch(searchText);
    
    if (searchText.trim().length > 0) {
      try {
        setSearchingConditions(true);
        const response = await NutritionService.getConditions(searchText, 20, 0);
        setConditions(response.items);
      } catch (error) {
        // Error silencioso
      } finally {
        setSearchingConditions(false);
      }
    } else {
      // Si borra el texto, volver a cargar las comunes
      try {
        const response = await NutritionService.getConditions('', 5, 0);
        setConditions(response.items);
      } catch (error) {
        // Error silencioso
      }
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      // Scroll automático hacia arriba al cambiar de paso
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } else {
      handleComplete();
    }
  };

  // Seleccionar imagen de Chapi según el paso
  const getChapiImage = () => {
    if (currentStep === 0) return require('../assets/chapi-3d-onboarding.png');
    if (currentStep <= 2) return require('../assets/chapi-3d-onboarding-1.png');
    if (currentStep <= 4) return require('../assets/chapi-3d-onboarding-2.png');
    return require('../assets/chapi-3d-onboarding-3.png');
  };

  // Calcular IMC y diagnóstico
  const calculateBMI = () => {
    const height = parseFloat(formData.heightCm);
    const weight = parseFloat(formData.weightKg);
    if (!height || !weight) return null;
    
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Bajo peso', color: '#2196F3', emoji: '📉' };
    if (bmi < 25) return { category: 'Peso normal', color: '#4CAF50', emoji: '✅' };
    if (bmi < 30) return { category: 'Sobrepeso', color: '#FF9800', emoji: '⚠️' };
    return { category: 'Obesidad', color: '#F44336', emoji: '🚨' };
  };

  const getCurrentDiagnosis = () => {
    const bmi = calculateBMI();
    if (!bmi) return null;

    const bmiInfo = getBMICategory(bmi);
    const weight = parseFloat(formData.weightKg);
    const height = parseFloat(formData.heightCm);
    
    // Calcular peso ideal (fórmula de Devine)
    const baseWeight = formData.sex === 'MALE' ? 50 : 45.5;
    const heightFactor = formData.sex === 'MALE' ? 2.3 : 2.3;
    const idealWeight = baseWeight + (heightFactor * ((height - 152.4) / 2.54));
    
    const weightDifference = weight - idealWeight;
    
    return {
      bmi: bmi.toFixed(1),
      category: bmiInfo.category,
      color: bmiInfo.color,
      emoji: bmiInfo.emoji,
      idealWeight: idealWeight.toFixed(1),
      weightDifference: weightDifference.toFixed(1),
      recommendations: getRecommendations(bmi, formData.nutritionGoal as NutritionGoal)
    };
  };

  const getRecommendations = (bmi: number, goal: NutritionGoal) => {
    const recommendations = [];
    
    if (bmi < 18.5) {
      recommendations.push('Considera aumentar tu ingesta calórica de forma saludable');
      recommendations.push('Incluye proteínas de calidad en cada comida');
    } else if (bmi > 25) {
      recommendations.push('Un déficit calórico moderado te ayudará a alcanzar tu objetivo');
      recommendations.push('Prioriza alimentos ricos en nutrientes y fibra');
    } else {
      recommendations.push('Tu peso está en rango saludable');
      recommendations.push('Enfócate en la composición corporal y hábitos');
    }

    if (goal === 'BUILD_MUSCLE') {
      recommendations.push('Aumenta tu consumo de proteína (1.6-2.2g por kg de peso)');
      recommendations.push('Combina con entrenamiento de fuerza regular');
    } else if (goal === 'ATHLETIC_PERFORMANCE') {
      recommendations.push('Sincroniza tu nutrición con tus entrenamientos');
      recommendations.push('Mantén una hidratación óptima');
    }

    return recommendations;
  };

  const handleComplete = async () => {
    // Validar datos básicos requeridos
    if (!formData.heightCm || !formData.weightKg || !formData.activityLevel || !formData.sex || !formData.cookTimePerMeal) {
      Alert.alert('Datos incompletos', 'Por favor completa todos los campos requeridos (género, altura, peso, nivel de actividad y tiempo de cocina)');
      return;
    }

    // Validar objetivo nutricional
    if (!formData.nutritionGoal || !formData.timeFrame || !formData.intensity) {
      Alert.alert('Objetivo incompleto', 'Por favor define tu objetivo nutricional, tiempo e intensidad');
      return;
    }

    // Validar peso objetivo si es necesario
    if ((formData.nutritionGoal === 'LOSE_WEIGHT' || formData.nutritionGoal === 'GAIN_WEIGHT') && !formData.targetWeightKg) {
      Alert.alert('Peso objetivo requerido', 'Por favor indica tu peso objetivo');
      return;
    }

    setLoading(true);
    try {
      // 1. Crear/actualizar perfil básico
      const profileData = {
        sex: formData.sex as "MALE" | "FEMALE",
        heightCm: parseInt(formData.heightCm),
        weightKg: parseInt(formData.weightKg),
        activityLevel: formData.activityLevel as "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE",
        country: formData.country,
        budgetLevel: 1, // Valor por defecto
        cookTimePerMeal: parseInt(formData.cookTimePerMeal),
        // Campos de objetivo nutricional como campos planos
        nutritionGoal: formData.nutritionGoal as NutritionGoal,
        targetWeightKg: formData.targetWeightKg ? parseInt(formData.targetWeightKg) : undefined,
        timeFrame: formData.timeFrame as TimeFrame,
        intensity: formData.intensity as 'GENTLE' | 'MODERATE' | 'AGGRESSIVE',
        currentMotivation: formData.currentMotivation || undefined,
      };

      await NutritionService.createUserProfile(profileData);

      // 2. Actualizar preferencias si hay datos
      const hasPreferences = 
        formData.allergies.length > 0 || 
        formData.customAllergies.length > 0 ||
        formData.conditions.length > 0 || 
        formData.customConditions.length > 0 ||
        formData.cuisinesLike.length > 0 || 
        formData.cuisinesDislike.length > 0;

      if (hasPreferences) {
        const preferences = {
          allergyIds: formData.allergies.length > 0 ? formData.allergies : undefined,
          customAllergies: formData.customAllergies.length > 0 ? formData.customAllergies : undefined,
          conditionIds: formData.conditions.length > 0 ? formData.conditions : undefined,
          customConditions: formData.customConditions.length > 0 ? formData.customConditions : undefined,
          cuisinesLike: formData.cuisinesLike.length > 0 ? formData.cuisinesLike : undefined,
          cuisinesDislike: formData.cuisinesDislike.length > 0 ? formData.cuisinesDislike : undefined,
        };

        await NutritionService.updateUserPreferences(preferences);
      }

      // 3. Guardar datos localmente
      const completeProfileData = {
        ...profileData,
        allergies: formData.allergies,
        customAllergies: formData.customAllergies,
        conditions: formData.conditions,
        customConditions: formData.customConditions,
        cuisinesLike: formData.cuisinesLike,
        cuisinesDislike: formData.cuisinesDislike,
      };

      await AsyncStorage.setItem('userProfile', JSON.stringify(completeProfileData));

      // Completar automáticamente sin alert
      onComplete(completeProfileData);
    } catch (error: any) {
      console.log('Error guardando perfil:', error);
      console.log('Error response:', error.response?.data);
      console.log('Error status:', error.response?.status);
      
      let errorMessage = 'No se pudo guardar tu perfil. Intenta de nuevo.';
      
      if (error.response?.status === 500) {
        errorMessage = 'Error del servidor. Por favor intenta más tarde o contacta a soporte.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        {/* Background Gradient */}
        <LinearGradient
          colors={['#4CAF50', '#81C784']}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Header */}
        <View style={styles.header}>
          {/* Chapi Avatar */}
          <View style={styles.chapiContainer}>
            <View style={styles.chapiCircle}>
              <Image 
                source={getChapiImage()}
                style={styles.chapiImage}
                resizeMode="cover"
              />
            </View>
          </View>

          <Text style={styles.title}>{currentStepData.title}</Text>
          <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index <= currentStep && styles.progressDotActive
                ]}
              />
            ))}
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1: Welcome */}
          {currentStep === 0 && (
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeText}>
                Para brindarte la mejor experiencia personalizada, necesitamos conocer un poco más sobre ti.
              </Text>
              <Text style={styles.featuresTitle}>¿Qué incluye Recomiéndame Coach?</Text>
              <View style={styles.featureList}>
                <Text style={styles.featureItem}>🎯 Planes nutricionales personalizados</Text>
                <Text style={styles.featureItem}>📊 Seguimiento de progreso</Text>
                <Text style={styles.featureItem}>🤖 Recomendaciones con IA</Text>
                <Text style={styles.featureItem}>🍎 Recetas adaptadas a ti</Text>
              </View>
            </View>
          )}

          {/* Step 2: Basic Data */}
          {currentStep === 1 && (
            <View style={styles.formSection}>
              {/* Gender Selection */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Género</Text>
                <View style={styles.optionsContainer}>
                  {genderOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.optionButton,
                        formData.sex === option.key && styles.optionButtonActive
                      ]}
                      onPress={() => updateFormData('sex', option.key)}
                    >
                      <Text style={[
                        styles.optionText,
                        formData.sex === option.key && styles.optionTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Height and Weight */}
              {currentStepData.fields.map((field) => (
                <View key={field.key} style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={field.placeholder}
                    placeholderTextColor="rgba(0, 0, 0, 0.4)"
                    value={formData[field.key as keyof typeof formData] as string}
                    onChangeText={(value) => updateFormData(field.key, value)}
                    keyboardType={field.keyboardType as any || 'default'}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    blurOnSubmit={true}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Step 3: Activity Level */}
          {currentStep === 2 && (
            <View style={styles.formSection}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Nivel de actividad física</Text>
                <View style={styles.activityContainer}>
                  {activityLevels.map((level) => (
                    <TouchableOpacity
                      key={level.key}
                      style={[
                        styles.activityOption,
                        formData.activityLevel === level.key && styles.activityOptionActive
                      ]}
                      onPress={() => updateFormData('activityLevel', level.key)}
                    >
                      <Text style={[
                        styles.activityLabel,
                        formData.activityLevel === level.key && styles.activityLabelActive
                      ]}>
                        {level.label}
                      </Text>
                      <Text style={[
                        styles.activityDesc,
                        formData.activityLevel === level.key && styles.activityDescActive
                      ]}>
                        {level.desc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>¿Cuánto tiempo puedes dedicar a cocinar?</Text>
                <View style={styles.cookTimeContainer}>
                  {cookTimeOptions.map((cookTime) => (
                    <TouchableOpacity
                      key={cookTime.key}
                      style={[
                        styles.cookTimeOption,
                        formData.cookTimePerMeal === cookTime.key && styles.cookTimeOptionActive
                      ]}
                      onPress={() => updateFormData('cookTimePerMeal', cookTime.key)}
                    >
                      <Text style={styles.cookTimeEmoji}>{cookTime.emoji}</Text>
                      <View style={styles.cookTimeContent}>
                        <Text style={[
                          styles.cookTimeLabel,
                          formData.cookTimePerMeal === cookTime.key && styles.cookTimeLabelActive
                        ]}>
                          {cookTime.label}
                        </Text>
                        <Text style={[
                          styles.cookTimeDesc,
                          formData.cookTimePerMeal === cookTime.key && styles.cookTimeDescActive
                        ]}>
                          {cookTime.desc}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Step 4: Nutrition Goals */}
          {currentStep === 3 && (
            <View style={styles.formSection}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>¿Cuál es tu objetivo principal?</Text>
                <View style={styles.goalContainer}>
                  {nutritionGoalOptions.map((goal) => (
                    <TouchableOpacity
                      key={goal.key}
                      style={[
                        styles.goalOption,
                        formData.nutritionGoal === goal.key && styles.goalOptionActive
                      ]}
                      onPress={() => updateFormData('nutritionGoal', goal.key)}
                    >
                      <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                      <View style={styles.goalContent}>
                        <Text style={[
                          styles.goalLabel,
                          formData.nutritionGoal === goal.key && styles.goalLabelActive
                        ]}>
                          {goal.label}
                        </Text>
                        <Text style={[
                          styles.goalDesc,
                          formData.nutritionGoal === goal.key && styles.goalDescActive
                        ]}>
                          {goal.desc}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Peso objetivo si aplica */}
              {(formData.nutritionGoal === 'LOSE_WEIGHT' || formData.nutritionGoal === 'GAIN_WEIGHT') && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>
                    {formData.nutritionGoal === 'LOSE_WEIGHT' ? '¿Cuál es tu peso objetivo?' : '¿Cuánto quieres pesar?'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 65"
                    placeholderTextColor="rgba(0, 0, 0, 0.4)"
                    value={formData.targetWeightKg}
                    onChangeText={(value) => updateFormData('targetWeightKg', value)}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    blurOnSubmit={true}
                  />
                </View>
              )}

              {/* Motivación */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>¿Qué te motiva a lograr este objetivo? (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ej: Quiero sentirme más saludable y con energía..."
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={formData.currentMotivation}
                  onChangeText={(value) => updateFormData('currentMotivation', value)}
                  multiline
                  numberOfLines={3}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  blurOnSubmit={true}
                />
              </View>
            </View>
          )}

          {/* Step 5: Time Frame and Intensity */}
          {currentStep === 4 && (
            <View style={styles.formSection}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>¿En cuánto tiempo quieres lograrlo?</Text>
                <View style={styles.timeFrameContainer}>
                  {timeFrameOptions.map((timeFrame) => (
                    <TouchableOpacity
                      key={timeFrame.key}
                      style={[
                        styles.timeFrameOption,
                        formData.timeFrame === timeFrame.key && styles.timeFrameOptionActive
                      ]}
                      onPress={() => updateFormData('timeFrame', timeFrame.key)}
                    >
                      <Text style={[
                        styles.timeFrameLabel,
                        formData.timeFrame === timeFrame.key && styles.timeFrameLabelActive
                      ]}>
                        {timeFrame.label}
                      </Text>
                      <Text style={[
                        styles.timeFrameDesc,
                        formData.timeFrame === timeFrame.key && styles.timeFrameDescActive
                      ]}>
                        {timeFrame.desc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>¿Qué tan intensivo quieres que sea tu plan?</Text>
                <View style={styles.intensityContainer}>
                  {intensityOptions.map((intensity) => (
                    <TouchableOpacity
                      key={intensity.key}
                      style={[
                        styles.intensityOption,
                        formData.intensity === intensity.key && styles.intensityOptionActive,
                        formData.intensity === intensity.key && { borderColor: intensity.color }
                      ]}
                      onPress={() => updateFormData('intensity', intensity.key)}
                    >
                      <Text style={[
                        styles.intensityLabel,
                        formData.intensity === intensity.key && styles.intensityLabelActive,
                        formData.intensity === intensity.key && { color: intensity.color }
                      ]}>
                        {intensity.label}
                      </Text>
                      <Text style={[
                        styles.intensityDesc,
                        formData.intensity === intensity.key && styles.intensityDescActive
                      ]}>
                        {intensity.desc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Diagnóstico actual */}
              {formData.heightCm && formData.weightKg && (
                <View style={styles.diagnosisContainer}>
                  <Text style={styles.diagnosisTitle}>📊 Tu estado actual</Text>
                  {(() => {
                    const diagnosis = getCurrentDiagnosis();
                    if (!diagnosis) return null;
                    
                    return (
                      <View style={styles.diagnosisContent}>
                        <View style={styles.bmiContainer}>
                          <Text style={styles.bmiLabel}>IMC: </Text>
                          <Text style={[styles.bmiValue, { color: diagnosis.color }]}>
                            {diagnosis.bmi} {diagnosis.emoji}
                          </Text>
                          <Text style={[styles.bmiCategory, { color: diagnosis.color }]}>
                            ({diagnosis.category})
                          </Text>
                        </View>
                        
                        <View style={styles.weightAnalysis}>
                          <Text style={styles.weightAnalysisText}>
                            Peso ideal aproximado: {diagnosis.idealWeight} kg
                          </Text>
                          <Text style={styles.weightAnalysisText}>
                            Diferencia: {parseFloat(diagnosis.weightDifference) > 0 ? '+' : ''}{diagnosis.weightDifference} kg
                          </Text>
                        </View>

                        <View style={styles.recommendationsContainer}>
                          <Text style={styles.recommendationsTitle}>💡 Recomendaciones:</Text>
                          {diagnosis.recommendations.map((rec, index) => (
                            <Text key={index} style={styles.recommendationItem}>
                              • {rec}
                            </Text>
                          ))}
                        </View>
                      </View>
                    );
                  })()}
                </View>
              )}
            </View>
          )}

          {/* Step 6: Allergies and Conditions */}
          {currentStep === 5 && (
            <View style={styles.formSection}>
              {/* Alergias */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Alergias alimentarias</Text>
                <Text style={styles.fieldSubtitle}>Selecciona las que apliquen (opcional)</Text>
                
                {/* Mostrar alergias personalizadas agregadas */}
                {formData.customAllergies.length > 0 && (
                  <View style={styles.selectedContainer}>
                    <Text style={styles.selectedLabel}>Mis alergias ({formData.customAllergies.length}):</Text>
                    <View style={styles.selectedChips}>
                      {formData.customAllergies.map((allergy, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.selectedChip}
                          onPress={() => removeCustomAllergy(allergy)}
                        >
                          <Text style={styles.selectedChipText}>{allergy}</Text>
                          <Text style={styles.selectedChipRemove}>✕</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Campo para agregar nueva alergia */}
                <View style={styles.addFoodContainer}>
                  <TextInput
                    style={styles.addFoodInput}
                    placeholder="Agregar nueva alergia..."
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={newAllergyText}
                    onChangeText={setNewAllergyText}
                    returnKeyType="done"
                    onSubmitEditing={addCustomAllergy}
                    blurOnSubmit={true}
                  />
                  <TouchableOpacity 
                    style={[
                      styles.addFoodButton,
                      !newAllergyText.trim() && styles.addFoodButtonDisabled
                    ]}
                    onPress={addCustomAllergy}
                    disabled={!newAllergyText.trim()}
                  >
                    <Text style={styles.addFoodButtonText}>+ Agregar</Text>
                  </TouchableOpacity>
                </View>

                {/* Sugerencia si hay texto similar */}
                {newAllergyText.trim().length > 2 && (
                  (() => {
                    const searchTerm = newAllergyText.trim().toLowerCase();
                    const similarAllergy = allergies.find(a => 
                      a.name.toLowerCase().includes(searchTerm) || 
                      searchTerm.includes(a.name.toLowerCase())
                    );
                    
                    if (similarAllergy && !formData.allergies.includes(similarAllergy.id)) {
                      return (
                        <TouchableOpacity 
                          style={styles.suggestionContainer}
                          onPress={() => {
                            setFormData(prev => ({
                              ...prev,
                              allergies: [...prev.allergies, similarAllergy.id]
                            }));
                            setNewAllergyText('');
                          }}
                        >
                          <Text style={styles.suggestionText}>
                            💡 ¿Te refieres a "{similarAllergy.name}"? Toca para seleccionar
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                    return null;
                  })()
                )}

                {/* Buscador de alergias */}
                <View style={styles.searchContainer}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar otras alergias..."
                    value={allergySearch}
                    onChangeText={searchAllergies}
                    placeholderTextColor="#999"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    blurOnSubmit={true}
                  />
                  {allergySearch.length > 0 && (
                    <TouchableOpacity onPress={() => searchAllergies('')}>
                      <Text style={styles.clearSearch}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {loading || searchingAllergies ? (
                  <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} />
                ) : (
                  <View style={styles.checkboxContainer}>
                    {allergies.map((allergy) => (
                      <TouchableOpacity
                        key={allergy.id}
                        style={[
                          styles.checkboxOption,
                          formData.allergies.includes(allergy.id) && styles.checkboxOptionActive
                        ]}
                        onPress={() => toggleArrayItem('allergies', allergy.id)}
                      >
                        <Text style={[
                          styles.checkboxText,
                          formData.allergies.includes(allergy.id) && styles.checkboxTextActive
                        ]}>
                          {formData.allergies.includes(allergy.id) ? '✓ ' : ''}{allergy.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Separador visual */}
              <View style={styles.sectionSeparator} />

              {/* Condiciones */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Condiciones médicas</Text>
                <Text style={styles.fieldSubtitle}>Información para personalizar tu plan (opcional)</Text>
                
                {/* Mostrar condiciones personalizadas agregadas */}
                {formData.customConditions.length > 0 && (
                  <View style={styles.selectedContainer}>
                    <Text style={styles.selectedLabel}>Mis condiciones ({formData.customConditions.length}):</Text>
                    <View style={styles.selectedChips}>
                      {formData.customConditions.map((condition, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.selectedChip}
                          onPress={() => removeCustomCondition(condition)}
                        >
                          <Text style={styles.selectedChipText}>{condition}</Text>
                          <Text style={styles.selectedChipRemove}>✕</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Campo para agregar nueva condición */}
                <View style={styles.addFoodContainer}>
                  <TextInput
                    style={styles.addFoodInput}
                    placeholder="Agregar nueva condición..."
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={newConditionText}
                    onChangeText={setNewConditionText}
                    returnKeyType="done"
                    onSubmitEditing={addCustomCondition}
                    blurOnSubmit={true}
                  />
                  <TouchableOpacity 
                    style={[
                      styles.addFoodButton,
                      !newConditionText.trim() && styles.addFoodButtonDisabled
                    ]}
                    onPress={addCustomCondition}
                    disabled={!newConditionText.trim()}
                  >
                    <Text style={styles.addFoodButtonText}>+ Agregar</Text>
                  </TouchableOpacity>
                </View>

                {/* Sugerencia si hay texto similar */}
                {newConditionText.trim().length > 2 && (
                  (() => {
                    const searchTerm = newConditionText.trim().toLowerCase();
                    const similarCondition = conditions.find(c => 
                      c.label.toLowerCase().includes(searchTerm) || 
                      searchTerm.includes(c.label.toLowerCase())
                    );
                    
                    if (similarCondition && !formData.conditions.includes(similarCondition.id)) {
                      return (
                        <TouchableOpacity 
                          style={styles.suggestionContainer}
                          onPress={() => {
                            setFormData(prev => ({
                              ...prev,
                              conditions: [...prev.conditions, similarCondition.id]
                            }));
                            setNewConditionText('');
                          }}
                        >
                          <Text style={styles.suggestionText}>
                            💡 ¿Te refieres a "{similarCondition.label}"? Toca para seleccionar
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                    return null;
                  })()
                )}

                {/* Buscador de condiciones */}
                <View style={styles.searchContainer}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar otras condiciones..."
                    value={conditionSearch}
                    onChangeText={searchConditions}
                    placeholderTextColor="#999"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    blurOnSubmit={true}
                  />
                  {conditionSearch.length > 0 && (
                    <TouchableOpacity onPress={() => searchConditions('')}>
                      <Text style={styles.clearSearch}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {loading || searchingConditions ? (
                  <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} />
                ) : (
                  <View style={styles.checkboxContainer}>
                    {conditions.map((condition) => (
                      <TouchableOpacity
                        key={condition.id}
                        style={[
                          styles.checkboxOption,
                          formData.conditions.includes(condition.id) && styles.checkboxOptionActive
                        ]}
                        onPress={() => toggleArrayItem('conditions', condition.id)}
                      >
                        <Text style={[
                          styles.checkboxText,
                          formData.conditions.includes(condition.id) && styles.checkboxTextActive
                        ]}>
                          {formData.conditions.includes(condition.id) ? '✓ ' : ''}{condition.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Step 7: Cuisine Preferences */}
          {currentStep === 6 && (
            <View style={styles.formSection}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Tipos de cocina que te gustan</Text>
                <Text style={styles.fieldSubtitle}>Selecciona tus favoritas (opcional)</Text>
                {loading ? (
                  <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} />
                ) : (
                  <View style={styles.checkboxContainer}>
                    {cuisines.map((cuisine) => (
                      <TouchableOpacity
                        key={cuisine.id}
                        style={[
                          styles.checkboxOption,
                          formData.cuisinesLike.includes(cuisine.id) && styles.checkboxOptionActive
                        ]}
                        onPress={() => toggleArrayItem('cuisinesLike', cuisine.id)}
                      >
                        <Text style={[
                          styles.checkboxText,
                          formData.cuisinesLike.includes(cuisine.id) && styles.checkboxTextActive
                        ]}>
                          {formData.cuisinesLike.includes(cuisine.id) ? '✓ ' : ''}{cuisine.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.buttonContainer}>
          {!isFirstStep && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => {
                setCurrentStep(currentStep - 1);
                // Scroll automático hacia arriba al ir hacia atrás
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                }, 100);
              }}
            >
              <Text style={styles.backButtonText}>← Atrás</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.nextButtonFull, loading && styles.nextButtonDisabled, !isFirstStep && styles.nextButtonHalf]} 
            onPress={handleNext}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#ccc', '#999'] : ['#FF9800', '#F57C00']}
              style={styles.nextButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading && isLastStep ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.nextButtonText}>
                  {isLastStep ? 'Completar' : 'Siguiente'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Botón flotante para ocultar teclado */}
        {keyboardVisible && (
          <TouchableOpacity 
            style={styles.hideKeyboardButton}
            onPress={Keyboard.dismiss}
          >
            <Text style={styles.hideKeyboardText}>⌨️ Ocultar teclado</Text>
          </TouchableOpacity>
        )}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  chapiContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  chapiCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  chapiImage: {
    width: 100,
    height: 100,
  },
  logoContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 5,
  },
  progressDotActive: {
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  featureList: {
    alignItems: 'flex-start',
  },
  featureItem: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
  },
  formSection: {
    paddingVertical: 20,
  },
  fieldContainer: {
    marginBottom: 30,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    borderRadius: 16,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionButtonActive: {
    backgroundColor: '#fff',
    borderColor: '#FF9800',
    borderWidth: 3,
  },
  optionText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#FF9800',
    fontWeight: '700',
  },
  activityContainer: {
    gap: 12,
  },
  activityOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  activityOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: '#fff',
  },
  activityLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityLabelActive: {
    color: '#fff',
  },
  activityDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  activityDescActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  nextButtonFull: {
    flex: 1,
    borderRadius: 16,
  },
  nextButton: {
    flex: 2,
    borderRadius: 16,
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButtonHalf: {
    flex: 1,
  },
  backButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
  },

  fieldSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
  },
  checkboxContainer: {
    gap: 8,
  },
  checkboxOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  checkboxOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: '#fff',
  },
  checkboxText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    fontWeight: '500',
  },
  checkboxTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  clearSearch: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 5,
  },
  selectedContainer: {
    marginBottom: 15,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  selectedChipText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedChipRemove: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Estilos para objetivos nutricionales
  goalContainer: {
    gap: 12,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  goalOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: '#fff',
    borderWidth: 2,
  },
  goalEmoji: {
    fontSize: 24,
    marginRight: 15,
  },
  goalContent: {
    flex: 1,
  },
  goalLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  goalLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  goalDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  goalDescActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Estilos para marco temporal
  timeFrameContainer: {
    gap: 10,
  },
  timeFrameOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  timeFrameOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: '#fff',
  },
  timeFrameLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  timeFrameLabelActive: {
    color: '#fff',
  },
  timeFrameDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
  },
  timeFrameDescActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Estilos para intensidad
  intensityContainer: {
    gap: 12,
  },
  intensityOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  intensityOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 3,
  },
  intensityLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  intensityLabelActive: {
    fontWeight: '700',
  },
  intensityDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  intensityDescActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Estilos para diagnóstico
  diagnosisContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  diagnosisTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
  diagnosisContent: {
    gap: 12,
  },
  bmiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bmiLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bmiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 5,
  },
  bmiCategory: {
    fontSize: 14,
    fontWeight: '600',
  },
  weightAnalysis: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  weightAnalysisText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  recommendationsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
  },
  recommendationsTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  recommendationItem: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },

  // Estilo para textarea
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 16,
  },

  // Estilos para tiempo de cocina
  cookTimeContainer: {
    gap: 12,
  },
  cookTimeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cookTimeOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: '#fff',
    borderWidth: 2,
  },
  cookTimeEmoji: {
    fontSize: 24,
    marginRight: 15,
  },
  cookTimeContent: {
    flex: 1,
  },
  cookTimeLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cookTimeLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  cookTimeDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  cookTimeDescActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Botón flotante para ocultar teclado
  hideKeyboardButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  hideKeyboardText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Estilos para agregar elementos personalizados
  addFoodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 15,
    marginBottom: 20,
  },
  addFoodInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addFoodButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#FF9800',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addFoodButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addFoodButtonDisabled: {
    backgroundColor: 'rgba(255, 152, 0, 0.5)',
    shadowOpacity: 0,
    elevation: 0,
  },

  // Estilos para sugerencias
  suggestionContainer: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.4)',
  },
  suggestionText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Separador entre secciones
  sectionSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 25,
    marginHorizontal: 20,
  },
});