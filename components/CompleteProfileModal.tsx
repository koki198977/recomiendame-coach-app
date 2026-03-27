import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from './Logo';
import { AllergiesSelector } from './AllergiesSelector';
import { MedicalConditionsSelector } from './MedicalConditionsSelector';
import { MedicalInfoSummary } from './MedicalInfoSummary';
import { NutritionService } from '../services/nutritionService';
import { AuthService } from '../services/authService';
import { Cuisine, Allergy, Condition, NutritionGoal, TimeFrame, NutritionGoalDetails } from '../types/nutrition';
import AsyncStorage from '@react-native-async-storage/async-storage';


const { width, height } = Dimensions.get('window');

interface CompleteProfileModalProps {
  visible: boolean;
  onComplete: (profileData: any) => void;
  onSkip?: () => void; // Opcional
  onLogout?: () => void; // Callback para cerrar sesión
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  visible,
  onComplete,
  onSkip,
  onLogout,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [cuisineSearch, setCuisineSearch] = useState('');

  // Referencia al ScrollView para controlar el scroll
  const scrollViewRef = useRef<ScrollView>(null);

  // Estados para las listas de opciones
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estado para detectar si el teclado está visible
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Derivados para el resumen — siempre en sync con el estado actual
  const allSelectedAllergies = allergies.filter(a => formData.allergies.includes(a.id));
  const allSelectedConditions = conditions.filter(c => formData.conditions.includes(c.id));

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
        { key: 'name', label: 'Nombre', placeholder: 'Nombre', keyboardType: 'default' },
        { key: 'lastName', label: 'Apellido', placeholder: 'Apellido', keyboardType: 'default' },
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
      title: 'Alergias alimentarias',
      subtitle: 'Información importante para tu seguridad',
      fields: []
    },
    {
      title: 'Condiciones médicas',
      subtitle: 'Para personalizar tu plan nutricional',
      fields: []
    },
    {
      title: 'Preferencias culinarias',
      subtitle: 'Tipos de cocina que te gustan',
      fields: []
    },
    {
      title: '¡Perfil completado! 🎉',
      subtitle: 'Revisa tu información antes de continuar',
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

  const LOCAL_CUISINES = [
    { id: 1,  name: 'Mediterránea',   emoji: '🫒' },
    { id: 2,  name: 'Italiana',       emoji: '🍝' },
    { id: 3,  name: 'Mexicana',       emoji: '🌮' },
    { id: 4,  name: 'India',          emoji: '🍛' },
    { id: 5,  name: 'China',          emoji: '🥡' },
    { id: 6,  name: 'Japonesa',       emoji: '🍣' },
    { id: 7,  name: 'Tailandesa',     emoji: '🍜' },
    { id: 8,  name: 'Chilena',        emoji: '🫕' },
    { id: 9,  name: 'Peruana',        emoji: '🐟' },
    { id: 10, name: 'Vegetariana',    emoji: '🥗' },
    { id: 11, name: 'Vegana',         emoji: '🌱' },
    { id: 23, name: 'Griega',         emoji: '🫙' },
    { id: 24, name: 'Francesa',       emoji: '🥐' },
    { id: 25, name: 'Española',       emoji: '🥘' },
    { id: 26, name: 'Árabe',          emoji: '🫔' },
    { id: 27, name: 'Americana',      emoji: '🍔' },
    { id: 28, name: 'Coreana',        emoji: '🍱' },
    { id: 29, name: 'Vietnamita',     emoji: '🍲' },
    { id: 30, name: 'Brasileña',      emoji: '🥩' },
    { id: 31, name: 'Parrilla / BBQ', emoji: '🔥' },
  ];

  // Cargar listas cuando se abre el modal
  React.useEffect(() => {
    if (visible) {
      loadTaxonomies();
      // Resetear al paso inicial y scroll al inicio cuando se abre el modal
      setCurrentStep(0);
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
      }, 100);
    }
  }, [visible]);

  // Resetear scroll cuando cambia el paso
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [currentStep]);

  // Detectar cuando el teclado se muestra/oculta
  useEffect(() => {
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
    const fallbackCuisines = [
      { id: 1, name: 'Mediterránea' },
      { id: 2, name: 'Asiática' },
      { id: 3, name: 'Mexicana' },
      { id: 4, name: 'Italiana' },
      { id: 5, name: 'Vegetariana' },
      { id: 6, name: 'Vegana' },
    ];
    
    const fallbackAllergies = [
      { id: 1, name: 'Maní (cacahuate)' },
      { id: 2, name: 'Frutos secos' },
      { id: 3, name: 'Mariscos' },
      { id: 4, name: 'Huevos' },
      { id: 5, name: 'Soja' },
      { id: 6, name: 'Gluten' },
      { id: 7, name: 'Lactosa' },
    ];
    
    const fallbackConditions = [
      { id: 1, code: 'DIABETES', label: 'Diabetes' },
      { id: 2, code: 'HYPERTENSION', label: 'Hipertensión' },
      { id: 3, code: 'CELIAC', label: 'Celiaquía' },
      { id: 4, code: 'LACTOSE_INTOLERANT', label: 'Intolerancia a la lactosa' },
    ];

    setCuisines(fallbackCuisines);
    setAllergies(fallbackAllergies);
    setConditions(fallbackConditions);
  };

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
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

  // Remover alergia personalizada
  const removeCustomAllergy = (allergy: string) => {
    setFormData(prev => ({
      ...prev,
      customAllergies: prev.customAllergies.filter(a => a !== allergy)
    }));
  };

  // Remover condición personalizada
  const removeCustomCondition = (condition: string) => {
    setFormData(prev => ({
      ...prev,
      customConditions: prev.customConditions.filter(c => c !== condition)
    }));
  };

  const validateStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.name.trim()) errors.name = 'Ingresa tu nombre';
      if (!formData.lastName.trim()) errors.lastName = 'Ingresa tu apellido';
      if (!formData.sex) errors.sex = 'Selecciona tu género';
      const height = parseFloat(formData.heightCm);
      if (!formData.heightCm) errors.heightCm = 'Ingresa tu estatura';
      else if (isNaN(height) || height < 100 || height > 250) errors.heightCm = 'Estatura debe estar entre 100 y 250 cm';
      const weight = parseFloat(formData.weightKg);
      if (!formData.weightKg) errors.weightKg = 'Ingresa tu peso';
      else if (isNaN(weight) || weight < 45 || weight > 200) errors.weightKg = 'Peso debe estar entre 45 y 200 kg';
    }

    if (currentStep === 2) {
      if (!formData.activityLevel) errors.activityLevel = 'Selecciona tu nivel de actividad';
      if (!formData.cookTimePerMeal) errors.cookTimePerMeal = 'Selecciona tu tiempo disponible para cocinar';
    }

    if (currentStep === 3) {
      if (!formData.nutritionGoal) errors.nutritionGoal = 'Selecciona tu objetivo principal';
      if ((formData.nutritionGoal === 'LOSE_WEIGHT' || formData.nutritionGoal === 'GAIN_WEIGHT') && !formData.targetWeightKg) {
        errors.targetWeightKg = 'Ingresa tu peso objetivo';
      } else if (formData.targetWeightKg) {
        const target = parseFloat(formData.targetWeightKg);
        if (isNaN(target) || target < 45 || target > 200) errors.targetWeightKg = 'Peso objetivo debe estar entre 45 y 200 kg';
      }
    }

    if (currentStep === 4) {
      if (!formData.timeFrame) errors.timeFrame = 'Selecciona un plazo de tiempo';
      if (!formData.intensity) errors.intensity = 'Selecciona la intensidad de tu plan';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    // Primero hacer scroll al inicio
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
    
    // Pequeño delay para que se complete la animación del scroll
    setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleComplete();
      }
    }, 100);
  };

  const handleBack = () => {
    setFieldErrors({});
    // Primero hacer scroll al inicio
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
    
    // Pequeño delay para que se complete la animación del scroll
    setTimeout(() => {
      setCurrentStep(currentStep - 1);
    }, 100);
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

  const handleTemporaryLogout = async () => {
    Alert.alert(
      'Cerrar sesión temporal',
      '¿Estás seguro que quieres cerrar sesión? Podrás volver a iniciar sesión más tarde para completar tu perfil.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
              if (onLogout) {
                onLogout();
              }
            } catch (error) {
              console.log('Error during logout:', error);
              // Aún así ejecutar el callback para cerrar sesión en la UI
              if (onLogout) {
                onLogout();
              }
            }
          },
        },
      ]
    );
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
        name: formData.name.trim() || undefined,
        lastName: formData.lastName.trim() || undefined,
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
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.modalContainer}>
            {/* Background Gradient */}
            <LinearGradient
              colors={['#4CAF50', '#81C784']}
              style={styles.backgroundGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            {/* Header */}
            <View style={[styles.header, keyboardVisible && styles.headerCompact]}>
              {/* Chapi Avatar - más pequeño cuando hay teclado */}
              {!keyboardVisible && (
                <View style={styles.chapiContainer}>
                  <View style={styles.chapiCircle}>
                    <Image 
                      source={getChapiImage()}
                      style={styles.chapiImage}
                      resizeMode="cover"
                    />
                  </View>
                </View>
              )}

              <Text style={[styles.title, keyboardVisible && styles.titleCompact]}>{currentStepData.title}</Text>
              {!keyboardVisible && (
                <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
              )}

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
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
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
                        formData.sex === option.key && styles.optionButtonActive,
                        fieldErrors.sex ? styles.inputError : null,
                      ]}
                      onPress={() => { updateFormData('sex', option.key); }}
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
                {fieldErrors.sex ? <Text style={styles.errorText}>{fieldErrors.sex}</Text> : null}
              </View>

              {/* Height and Weight */}
              {currentStepData.fields.map((field) => (
                <View key={field.key} style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={[styles.input, fieldErrors[field.key] ? styles.inputError : null]}
                    placeholder={field.placeholder}
                    placeholderTextColor="rgba(0, 0, 0, 0.4)"
                    value={formData[field.key as keyof typeof formData] as string}
                    onChangeText={(value) => updateFormData(field.key, value)}
                    keyboardType={field.keyboardType as any || 'default'}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                  {fieldErrors[field.key] ? <Text style={styles.errorText}>{fieldErrors[field.key]}</Text> : null}
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
                {fieldErrors.activityLevel ? <Text style={styles.errorText}>{fieldErrors.activityLevel}</Text> : null}
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
                {fieldErrors.cookTimePerMeal ? <Text style={styles.errorText}>{fieldErrors.cookTimePerMeal}</Text> : null}
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
                {fieldErrors.nutritionGoal ? <Text style={styles.errorText}>{fieldErrors.nutritionGoal}</Text> : null}
              </View>

              {/* Peso objetivo si aplica */}
              {(formData.nutritionGoal === 'LOSE_WEIGHT' || formData.nutritionGoal === 'GAIN_WEIGHT') && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>
                    {formData.nutritionGoal === 'LOSE_WEIGHT' ? '¿Cuál es tu peso objetivo?' : '¿Cuánto quieres pesar?'}
                  </Text>
                  <TextInput
                    style={[styles.input, fieldErrors.targetWeightKg ? styles.inputError : null]}
                    placeholder="Ej: 65"
                    placeholderTextColor="rgba(0, 0, 0, 0.4)"
                    value={formData.targetWeightKg}
                    onChangeText={(value) => updateFormData('targetWeightKg', value)}
                    keyboardType="numeric"
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                  {fieldErrors.targetWeightKg ? <Text style={styles.errorText}>{fieldErrors.targetWeightKg}</Text> : null}
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
                  blurOnSubmit={true}
                  textAlignVertical="top"
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
                {fieldErrors.timeFrame ? <Text style={styles.errorText}>{fieldErrors.timeFrame}</Text> : null}
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
                {fieldErrors.intensity ? <Text style={styles.errorText}>{fieldErrors.intensity}</Text> : null}
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

          {/* Step 6: Allergies */}
          {currentStep === 5 && (
            <View style={[styles.formSection, keyboardVisible && styles.formSectionCompact]}>
              <AllergiesSelector
                allergies={allergies}
                selectedAllergies={formData.allergies}
                customAllergies={formData.customAllergies}
                onToggleAllergy={(allergyId) => toggleArrayItem('allergies', allergyId)}
                onAddCustomAllergy={(allergy) => {
                  setFormData(prev => ({
                    ...prev,
                    customAllergies: [...prev.customAllergies, allergy]
                  }));
                }}
                onRemoveCustomAllergy={removeCustomAllergy}
                onUpdateAllergies={(newAllergies) => {
                  setAllergies(newAllergies);
                }}
                compact={keyboardVisible}
              />
            </View>
          )}

          {/* Step 7: Medical Conditions */}
          {currentStep === 6 && (
            <View style={[styles.formSection, keyboardVisible && styles.formSectionCompact]}>
              <MedicalConditionsSelector
                conditions={conditions}
                selectedConditions={formData.conditions}
                customConditions={formData.customConditions}
                onToggleCondition={(conditionId) => toggleArrayItem('conditions', conditionId)}
                onAddCustomCondition={(condition) => {
                  setFormData(prev => ({
                    ...prev,
                    customConditions: [...prev.customConditions, condition]
                  }));
                }}
                onRemoveCustomCondition={removeCustomCondition}
                onUpdateConditions={(newConditions) => {
                  setConditions(newConditions);
                }}
                compact={keyboardVisible}
              />
            </View>
          )}

          {/* Step 8: Cuisine Preferences */}
          {currentStep === 7 && (
            <View style={styles.formSection}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Tipos de cocina que te gustan</Text>
                <Text style={styles.fieldSubtitle}>
                  {formData.cuisinesLike.length > 0
                    ? `${formData.cuisinesLike.length} seleccionada${formData.cuisinesLike.length > 1 ? 's' : ''}`
                    : 'Selecciona tus favoritas (opcional)'}
                </Text>

                {/* Buscador */}
                <View style={styles.cuisineSearchContainer}>
                  <Text style={styles.cuisineSearchIcon}>🔍</Text>
                  <TextInput
                    style={styles.cuisineSearchInput}
                    placeholder="Buscar cocina..."
                    placeholderTextColor="rgba(0,0,0,0.35)"
                    value={cuisineSearch}
                    onChangeText={setCuisineSearch}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                  />
                </View>

                {/* Grid de chips */}
                <View style={styles.cuisineGrid}>
                  {LOCAL_CUISINES.filter(c =>
                    c.name.toLowerCase().includes(cuisineSearch.toLowerCase())
                  ).map((cuisine) => {
                    const selected = formData.cuisinesLike.includes(cuisine.id);
                    return (
                      <TouchableOpacity
                        key={cuisine.id}
                        style={[styles.cuisineChipBtn, selected && styles.cuisineChipBtnActive]}
                        onPress={() => toggleArrayItem('cuisinesLike', cuisine.id)}
                      >
                        <Text style={styles.cuisineChipEmoji}>{cuisine.emoji}</Text>
                        <Text style={[styles.cuisineChipLabel, selected && styles.cuisineChipLabelActive]}>
                          {cuisine.name}
                        </Text>
                        {selected && <Text style={styles.cuisineChipCheck}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                  {LOCAL_CUISINES.filter(c =>
                    c.name.toLowerCase().includes(cuisineSearch.toLowerCase())
                  ).length === 0 && (
                    <Text style={styles.cuisineNoResults}>Sin resultados para "{cuisineSearch}"</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Step 9: Summary */}
          {currentStep === 8 && (
            <View style={styles.formSection}>
              {/* Resumen de información médica */}
              <MedicalInfoSummary
                selectedAllergies={allSelectedAllergies.map(a => a.name)}
                selectedConditions={allSelectedConditions.map(c => c.label)}
                customAllergies={formData.customAllergies}
                customConditions={formData.customConditions}
                onEditAllergies={() => {
                  if (scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({ y: 0, animated: true });
                  }
                  setTimeout(() => setCurrentStep(5), 100);
                }}
                onEditConditions={() => {
                  if (scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({ y: 0, animated: true });
                  }
                  setTimeout(() => setCurrentStep(6), 100);
                }}
              />

              {/* Resumen de preferencias culinarias */}
              {formData.cuisinesLike.length > 0 && (
                <View style={styles.summarySection}>
                  <View style={styles.summarySectionHeader}>
                    <Text style={styles.summarySectionTitle}>🍽️ Cocinas favoritas ({formData.cuisinesLike.length})</Text>
                    <TouchableOpacity style={styles.editButton} onPress={() => {
                      if (scrollViewRef.current) {
                        scrollViewRef.current.scrollTo({ y: 0, animated: true });
                      }
                      setTimeout(() => setCurrentStep(7), 100);
                    }}>
                      <Text style={styles.editButtonText}>Editar</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.cuisineChips}>
                      {cuisines.filter(c => formData.cuisinesLike.includes(c.id)).map((cuisine) => (
                        <View key={cuisine.id} style={styles.cuisineChip}>
                          <Text style={styles.cuisineChipText}>{cuisine.name}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Mensaje de confirmación */}
              <View style={styles.confirmationContainer}>
                <Text style={styles.confirmationIcon}>🎯</Text>
                <Text style={styles.confirmationTitle}>¡Todo listo!</Text>
                <Text style={styles.confirmationText}>
                  Tu perfil está completo. Ahora podremos ofrecerte recomendaciones personalizadas 
                  basadas en tus objetivos, preferencias y necesidades médicas.
                </Text>
              </View>
            </View>
          )}
            </ScrollView>

            {/* Bottom Buttons */}
            <View style={styles.buttonContainer}>
              {!isFirstStep && (
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={handleBack}
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
          </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContainer: {
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
  headerCompact: {
    paddingTop: 30,
    paddingBottom: 10,
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
  titleCompact: {
    fontSize: 20,
    marginBottom: 3,
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
  scrollContent: {
    paddingBottom: 20,
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
  formSectionCompact: {
    paddingVertical: 10,
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
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minHeight: 44,
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
    marginBottom: 15,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minHeight: 44,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  clearSearch: {
    fontSize: 18,
    color: '#666',
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

  // Separador entre secciones
  sectionSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 25,
    marginHorizontal: 20,
  },

  // Estilos para el resumen final
  summarySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summarySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  summarySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cuisineChips: {
    flexDirection: 'row',
    gap: 8,
  },
  cuisineChip: {
    backgroundColor: 'rgba(156, 39, 176, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(156, 39, 176, 0.4)',
  },
  cuisineChipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmationContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  confirmationIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Estilos para el botón de cerrar sesión temporal
  temporaryLogoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  temporaryLogoutText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Validation error styles
  inputError: {
    borderColor: '#FF5252',
    borderWidth: 2,
  },
  errorText: {
    color: '#FFCDD2',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },

  // Cuisine selector
  cuisineSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  cuisineSearchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  cuisineSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cuisineChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    gap: 6,
  },
  cuisineChipBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderColor: '#fff',
    borderWidth: 2,
  },
  cuisineChipEmoji: {
    fontSize: 16,
  },
  cuisineChipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  cuisineChipLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  cuisineChipCheck: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '800',
  },
  cuisineNoResults: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },

});