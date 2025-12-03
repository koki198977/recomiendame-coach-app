import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logo } from '../components/Logo';

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
      title: '¿Hay algún alimento que no te caiga bien?',
      subtitle: 'Cuéntame sobre alergias o preferencias',
      type: 'input',
      fields: [
        { key: 'allergies', label: 'Alimentos que prefieres evitar (opcional)', placeholder: 'Ej: Lactosa, gluten, soy vegetariano...' },
      ]
    }
  ];

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Guardar datos y completar onboarding
      try {
        await AsyncStorage.setItem('userProfile', JSON.stringify(formData));
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

  return (
    <ScrollView style={styles.container}>
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

      <View style={styles.content}>
        {/* Campos de texto */}
        {currentStepData.type === 'input' && currentStepData.fields.map((field) => (
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
                    {option.description && (
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionCardSelected: {
    backgroundColor: '#fff',
    borderColor: '#4CAF50',
    borderWidth: 3,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    color: '#666',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 14,
    color: '#999',
  },
  optionDescriptionSelected: {
    color: '#4CAF50',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});