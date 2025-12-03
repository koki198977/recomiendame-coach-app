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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from './Logo';
import { NutritionService } from '../services/nutritionService';
import { Cuisine, Allergy, Condition } from '../types/nutrition';
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
    conditions: [] as number[],
    cuisinesLike: [] as number[],
    cuisinesDislike: [] as number[],
  });

  const [currentStep, setCurrentStep] = useState(0);

  // Estados para las listas de opciones
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(false);

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
        NutritionService.getAllergies('', 50, 0).catch(() => ({ items: [], total: 0 })),
        NutritionService.getConditions('', 50, 0).catch(() => ({ items: [], total: 0 })),
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
      { id: 1, name: 'Gluten' },
      { id: 2, name: 'Lactosa' },
      { id: 3, name: 'Frutos secos' },
      { id: 4, name: 'Mariscos' },
      { id: 5, name: 'Huevos' },
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

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    // Validar datos básicos requeridos
    if (!formData.heightCm || !formData.weightKg || !formData.activityLevel || !formData.sex) {
      Alert.alert('Datos incompletos', 'Por favor completa todos los campos requeridos (género, altura, peso y nivel de actividad)');
      return;
    }

    setLoading(true);
    try {
      // 1. Crear/actualizar perfil básico
      const profileData = {
        sex: formData.sex,
        heightCm: parseInt(formData.heightCm),
        weightKg: parseInt(formData.weightKg),
        activityLevel: formData.activityLevel,
        country: formData.country,
        budgetLevel: 1, // Valor por defecto
        cookTimePerMeal: 25, // Valor por defecto
      };

      await NutritionService.createUserProfile(profileData);

      // 2. Actualizar preferencias si hay datos
      const hasPreferences = 
        formData.allergies.length > 0 || 
        formData.conditions.length > 0 || 
        formData.cuisinesLike.length > 0 || 
        formData.cuisinesDislike.length > 0;

      if (hasPreferences) {
        const preferences = {
          allergyIds: formData.allergies.length > 0 ? formData.allergies : undefined,
          conditionIds: formData.conditions.length > 0 ? formData.conditions : undefined,
          cuisinesLike: formData.cuisinesLike.length > 0 ? formData.cuisinesLike : undefined,
          cuisinesDislike: formData.cuisinesDislike.length > 0 ? formData.cuisinesDislike : undefined,
        };

        await NutritionService.updateUserPreferences(preferences);
      }

      // 3. Guardar datos localmente
      const completeProfileData = {
        ...profileData,
        allergies: formData.allergies,
        conditions: formData.conditions,
        cuisinesLike: formData.cuisinesLike,
        cuisinesDislike: formData.cuisinesDislike,
      };

      await AsyncStorage.setItem('userProfile', JSON.stringify(completeProfileData));

      // Completar automáticamente sin alert
      onComplete(completeProfileData);
    } catch (error) {
      console.log('Error guardando perfil:', error);
      Alert.alert('Error', 'No se pudo guardar tu perfil. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Background Gradient */}
        <LinearGradient
          colors={['#4CAF50', '#81C784']}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Header */}
        <View style={styles.header}>
          {isFirstStep && (
            <View style={styles.logoContainer}>
              <Logo size="medium" showText={false} />
            </View>
          )}
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
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Step 1: Welcome */}
          {currentStep === 0 && (
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeText}>
                Para brindarte la mejor experiencia personalizada, necesitamos conocer un poco más sobre ti.
              </Text>
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
                    placeholderTextColor="rgba(255, 255, 255, 0.7)"
                    value={formData[field.key as keyof typeof formData] as string}
                    onChangeText={(value) => updateFormData(field.key, value)}
                    keyboardType={field.keyboardType as any || 'default'}
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
            </View>
          )}

          {/* Step 4: Allergies and Conditions */}
          {currentStep === 3 && (
            <View style={styles.formSection}>
              {/* Allergies */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Alergias alimentarias</Text>
                <Text style={styles.fieldSubtitle}>Selecciona las que apliquen (opcional)</Text>
                {loading ? (
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

              {/* Conditions */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Condiciones médicas</Text>
                <Text style={styles.fieldSubtitle}>Información para personalizar tu plan (opcional)</Text>
                {loading ? (
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

          {/* Step 5: Cuisine Preferences */}
          {currentStep === 4 && (
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
          <TouchableOpacity 
            style={[styles.nextButtonFull, loading && styles.nextButtonDisabled]} 
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
    marginBottom: 25,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    fontSize: 16,
    color: '#fff',
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: '#fff',
  },
  optionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#fff',
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
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  nextButtonFull: {
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
});