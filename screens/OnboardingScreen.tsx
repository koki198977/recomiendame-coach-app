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

  const steps = [
    {
      title: '¡Bienvenido! 👋',
      subtitle: 'Vamos a crear tu perfil nutricional personalizado',
      fields: []
    },
    {
      title: 'Datos básicos',
      subtitle: 'Cuéntanos sobre ti',
      fields: [
        { key: 'weight', label: 'Peso (kg)', placeholder: '70', keyboardType: 'numeric' },
        { key: 'height', label: 'Estatura (cm)', placeholder: '175', keyboardType: 'numeric' },
        { key: 'age', label: 'Edad', placeholder: '25', keyboardType: 'numeric' },
      ]
    },
    {
      title: 'Más información',
      subtitle: 'Para personalizar tu plan',
      fields: [
        { key: 'goal', label: 'Objetivo principal', placeholder: 'Perder peso, ganar músculo, mantener...' },
        { key: 'activityLevel', label: 'Nivel de actividad', placeholder: 'Sedentario, activo, muy activo...' },
        { key: 'allergies', label: 'Alergias o restricciones', placeholder: 'Ninguna, gluten, lactosa...' },
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
        {currentStepData.fields.map((field) => (
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

        {isFirstStep && (
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeText}>
              Con IA crearemos un plan nutricional personalizado basado en:
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>🎯 Tus objetivos personales</Text>
              <Text style={styles.featureItem}>⚖️ Tu peso y estatura</Text>
              <Text style={styles.featureItem}>🚫 Tus alergias y restricciones</Text>
              <Text style={styles.featureItem}>💪 Tu nivel de actividad</Text>
            </View>
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
  },
  welcomeContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  featureList: {
    alignItems: 'flex-start',
  },
  featureItem: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
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
});