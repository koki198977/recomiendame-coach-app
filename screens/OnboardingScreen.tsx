import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logo } from '../components/Logo';
import { NutritionService } from '../services/nutritionService';

interface OnboardingProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    weight: '',
    height: '',
    age: '',
    gender: '',
    goal: '',
    allergies: '',
    activityLevel: '',
  });
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [allergySearch, setAllergySearch] = useState('');
  const [availableAllergies, setAvailableAllergies] = useState<string[]>([]);
  const [loadingAllergies, setLoadingAllergies] = useState(false);



  const activityLevels = [
    { key: 'sedentary', emoji: '🪑', label: 'Sedentario', description: 'Poco o nada de ejercicio' },
    { key: 'light', emoji: '🚶', label: 'Ligero', description: 'Ejercicio ligero 1-3 días/semana' },
    { key: 'moderate', emoji: '🏃', label: 'Moderado', description: 'Ejercicio moderado 3-5 días/semana' },
    { key: 'active', emoji: '💪', label: 'Activo', description: 'Ejercicio intenso 6-7 días/semana' },
  ];

  const goals = [
    { key: 'lose', emoji: '📉', label: 'Perder peso', description: 'Reducir grasa corporal' },
    { key: 'maintain', emoji: '⚖️', label: 'Mantener', description: 'Mantener peso actual' },
    { key: 'gain', emoji: '📈', label: 'Ganar músculo', description: 'Aumentar masa muscular' },
  ];

  const steps = [
    {
      title: '¡Bienvenido! 👋',
      subtitle: 'Vamos a crear tu perfil nutricional personalizado',
      type: 'welcome',
      fields: []
    },
    {
      title: '¡Hola! Para conocerte mejor...',
      subtitle: 'Cuéntame un poco sobre ti',
      type: 'input',
      fields: [
        { key: 'weight', label: '¿Cuánto pesas?', placeholder: 'Ej: 70 kg', keyboardType: 'numeric' },
        { key: 'height', label: '¿Cuál es tu estatura?', placeholder: 'Ej: 175 cm', keyboardType: 'numeric' },
        { key: 'age', label: '¿Cuántos años tienes?', placeholder: 'Ej: 25', keyboardType: 'numeric' },
      ]
    },
    {
      title: '¿Cómo te identificas?',
      subtitle: 'Esto me ayuda a personalizar mejor tu plan',
      type: 'select',
      key: 'gender',
      options: [
        { key: 'male', emoji: '👨', label: 'Masculino' },
        { key: 'female', emoji: '👩', label: 'Femenino' },
        { key: 'other', emoji: '🧑', label: 'Otro' },
      ]
    },
    {
      title: '¿Qué quieres lograr?',
      subtitle: 'Tu meta es mi prioridad',
      type: 'select',
      key: 'goal',
      options: goals
    },
    {
      title: '¿Cuánto te mueves en tu día a día?',
      subtitle: 'Esto me ayuda a calcular tu energía perfecta',
      type: 'select',
      key: 'activityLevel',
      options: activityLevels
    },
    {
      title: 'Alergias y condiciones',
      subtitle: 'Información médica importante',
      type: 'allergies',
      key: 'allergies'
    }
  ];

  // Cargar alergias desde la DB cuando se llega al paso de alergias
  useEffect(() => {
    if (currentStepData.type === 'allergies') {
      loadAllergies();
    }
  }, [currentStep]);

  const loadAllergies = async () => {
    try {
      setLoadingAllergies(true);
      // Cargar solo las primeras 12 más comunes
      const response = await NutritionService.getAllergies('', 12, 0);
      const allergyNames = response.items.map(item => item.name);
      setAvailableAllergies(allergyNames);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las alergias. Intenta de nuevo.');
      setAvailableAllergies([]);
    } finally {
      setLoadingAllergies(false);
    }
  };

  // Buscar alergias cuando el usuario escribe
  const searchAllergies = async (searchText: string) => {
    setAllergySearch(searchText);
    
    if (searchText.trim().length > 0) {
      try {
        setLoadingAllergies(true);
        const response = await NutritionService.getAllergies(searchText, 20, 0);
        const allergyNames = response.items.map(item => item.name);
        setAvailableAllergies(allergyNames);
      } catch (error) {
        // Error silencioso en búsqueda
      } finally {
        setLoadingAllergies(false);
      }
    } else {
      // Si borra el texto, volver a cargar las comunes
      loadAllergies();
    }
  };

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies(prev => {
      if (prev.includes(allergy)) {
        return prev.filter(a => a !== allergy);
      } else {
        return [...prev, allergy];
      }
    });
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      // Si estamos en el paso de alergias, guardar las seleccionadas
      if (currentStepData.type === 'allergies') {
        updateFormData('allergies', selectedAllergies.join(', '));
      }
      setCurrentStep(currentStep + 1);
    } else {
      // Guardar datos y completar onboarding
      try {
        // Asegurar que las alergias estén actualizadas
        const finalData = {
          ...formData,
          allergies: selectedAllergies.join(', ')
        };
        await AsyncStorage.setItem('userProfile', JSON.stringify(finalData));
        await AsyncStorage.setItem('onboardingCompleted', 'true');
        onComplete();
      } catch (error) {
        Alert.alert('Error', 'No se pudieron guardar los datos');
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Seleccionar imagen de Chapi según el paso
  const getChapiImage = () => {
    if (currentStep === 0) return require('../assets/chapi-3d-onboarding.png');
    if (currentStep <= 2) return require('../assets/chapi-3d-onboarding-1.png');
    if (currentStep <= 4) return require('../assets/chapi-3d-onboarding-2.png');
    return require('../assets/chapi-3d-onboarding-3.png');
  };

  return (
    <ScrollView style={styles.container}>
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

      <View style={styles.content}>
        {/* Campos de texto */}
        {currentStepData.type === 'input' && currentStepData.fields?.map((field) => (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <TextInput
              style={styles.input}
              placeholder={field.placeholder}
              value={formData[field.key as keyof typeof formData]}
              onChangeText={(value) => updateFormData(field.key, value)}
              keyboardType={field.keyboardType as any || 'default'}
            />
          </View>
        ))}

        {/* Opciones de selección */}
        {currentStepData.type === 'select' && currentStepData.options && (
          <View style={styles.optionsContainer}>
            {currentStepData.options.map((option) => {
              const isSelected = formData[currentStepData.key as keyof typeof formData] === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected
                  ]}
                  onPress={() => updateFormData(currentStepData.key, option.key)}
                >
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  <View style={styles.optionTextContainer}>
                    <Text style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected
                    ]}>
                      {option.label}
                    </Text>
                    {'description' in option && option.description && (
                      <Text style={[
                        styles.optionDescription,
                        isSelected && styles.optionDescriptionSelected
                      ]}>
                        {option.description}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Selector de alergias con buscador */}
        {currentStepData.type === 'allergies' && (
          <View style={styles.allergiesContainer}>
            {/* Buscador */}
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar otras alergias..."
                value={allergySearch}
                onChangeText={searchAllergies}
                placeholderTextColor="#999"
              />
              {allergySearch.length > 0 && (
                <TouchableOpacity onPress={() => searchAllergies('')}>
                  <Text style={styles.clearSearch}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Chips seleccionados */}
            {selectedAllergies.length > 0 && (
              <View style={styles.selectedContainer}>
                <Text style={styles.selectedLabel}>Seleccionadas ({selectedAllergies.length}):</Text>
                <View style={styles.selectedChips}>
                  {selectedAllergies.map((allergy) => (
                    <TouchableOpacity
                      key={allergy}
                      style={styles.selectedChip}
                      onPress={() => toggleAllergy(allergy)}
                    >
                      <Text style={styles.selectedChipText}>{allergy}</Text>
                      <Text style={styles.selectedChipRemove}>✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Título de sección */}
            {!allergySearch && (
              <Text style={styles.sectionSubtitle}>
                Alergias más comunes:
              </Text>
            )}

            {/* Lista de opciones */}
            <ScrollView style={styles.allergiesList} showsVerticalScrollIndicator={false}>
              {loadingAllergies ? (
                <View style={styles.searchingContainer}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={styles.searchingText}>Buscando...</Text>
                </View>
              ) : (
                    <>
                      <View style={styles.allergiesGrid}>
                        {availableAllergies.map((allergy) => {
                          const isSelected = selectedAllergies.includes(allergy);
                          return (
                            <TouchableOpacity
                              key={allergy}
                              style={[
                                styles.allergyChip,
                                isSelected && styles.allergyChipSelected
                              ]}
                              onPress={() => toggleAllergy(allergy)}
                            >
                              <Text style={[
                                styles.allergyChipText,
                                isSelected && styles.allergyChipTextSelected
                              ]}>
                                {allergy}
                              </Text>
                              {isSelected && (
                                <Text style={styles.allergyCheckmark}>✓</Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {availableAllergies.length === 0 && allergySearch && (
                        <Text style={styles.noResults}>
                          No se encontraron resultados para "{allergySearch}"
                        </Text>
                      )}
                    </>
                  )}
            </ScrollView>

            <Text style={styles.allergyHint}>
              💡 Puedes seleccionar múltiples opciones o ninguna si no aplica
            </Text>
          </View>
        )}

        {/* Pantalla de bienvenida */}
        {currentStepData.type === 'welcome' && (
          <View style={styles.welcomeContent}>
            <Text style={styles.sectionTitle}>
              ¿Qué incluye Recomiéndame Coach?
            </Text>
            <Text style={styles.welcomeText}>
              Para brindarte la mejor experiencia personalizada, necesitamos conocer un poco más sobre ti.
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>🎯 Planes nutricionales personalizados</Text>
              <Text style={styles.featureItem}>📊 Seguimiento de progreso</Text>
              <Text style={styles.featureItem}>🤖 Recomendaciones con IA</Text>
              <Text style={styles.featureItem}>🍎 Recetas adaptadas a ti</Text>
              <Text style={styles.featureItem}>📸 Reconocimiento de comidas con IA</Text>
              <Text style={styles.featureItem}>💪 Entrenamientos personalizados</Text>
            </View>
            <Text style={styles.swipeHint}>
              👆 Desliza para continuar
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {!isFirstStep && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Atrás</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {isLastStep ? 'Completar' : 'Siguiente'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    color: '#E8F5E8',
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
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#000',
  },
  welcomeContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  featureList: {
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: 20,
  },
  featureItem: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    lineHeight: 24,
  },
  swipeHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 25,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  backButton: {
    backgroundColor: '#ccc',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flex: 1,
    marginLeft: 10,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionCardSelected: {
    backgroundColor: '#fff',
    borderColor: '#74B796',
    borderWidth: 4,
    shadowColor: '#74B796',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    transform: [{ scale: 1.02 }],
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#2C3E36',
    fontWeight: '800',
  },
  optionDescription: {
    fontSize: 14,
    color: '#bbb',
  },
  optionDescriptionSelected: {
    color: '#74B796',
    fontWeight: '600',
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#74B796',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#74B796',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  allergiesContainer: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  searchingText: {
    fontSize: 14,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  clearSearch: {
    fontSize: 18,
    color: '#999',
    paddingHorizontal: 5,
  },
  selectedContainer: {
    marginBottom: 15,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
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
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  selectedChipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedChipRemove: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  allergiesList: {
    maxHeight: 350,
  },
  allergiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  allergyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    gap: 6,
  },
  allergyChipSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  allergyChipText: {
    fontSize: 14,
    color: '#666',
  },
  allergyChipTextSelected: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  allergyCheckmark: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noResults: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 20,
    fontStyle: 'italic',
  },
  allergyHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
});