import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NutritionService } from '../services/nutritionService';
import { NutritionGoal, TimeFrame, UserProfile } from '../types/nutrition';

interface EditFieldModalProps {
  visible: boolean;
  onClose: () => void;
  fieldType: 'nutritionGoal' | 'targetWeight' | 'timeFrame' | 'intensity' | 'motivation';
  currentValue: any;
  userProfile: UserProfile | null;
  onSave: (updatedProfile: UserProfile) => void;
}

export const EditFieldModal: React.FC<EditFieldModalProps> = ({
  visible,
  onClose,
  fieldType,
  currentValue,
  userProfile,
  onSave,
}) => {
  const [value, setValue] = useState(currentValue?.toString() || '');
  const [loading, setLoading] = useState(false);

  // Configuración por tipo de campo
  const getFieldConfig = () => {
    switch (fieldType) {
      case 'nutritionGoal':
        return {
          title: 'Objetivo Principal',
          icon: '🎯',
          type: 'select',
          options: [
            { key: 'MAINTAIN_WEIGHT', label: 'Mantener peso', emoji: '⚖️' },
            { key: 'LOSE_WEIGHT', label: 'Bajar de peso', emoji: '📉' },
            { key: 'GAIN_WEIGHT', label: 'Subir de peso', emoji: '📈' },
            { key: 'BUILD_MUSCLE', label: 'Ganar masa muscular', emoji: '💪' },
            { key: 'GENERAL_HEALTH', label: 'Salud general', emoji: '🌱' },
          ] as Array<{ key: string; label: string; emoji?: string; color?: string }>
        };
      case 'targetWeight':
        return {
          title: 'Peso Objetivo',
          icon: '🎯',
          type: 'input',
          placeholder: 'Ej: 65',
          keyboardType: 'numeric' as const,
        };
      case 'timeFrame':
        return {
          title: 'Marco Temporal',
          icon: '⏰',
          type: 'select',
          options: [
            { key: '1_MONTH', label: '1 mes' },
            { key: '3_MONTHS', label: '3 meses' },
            { key: '6_MONTHS', label: '6 meses' },
            { key: '1_YEAR', label: '1 año' },
            { key: 'LONG_TERM', label: 'Largo plazo' },
          ] as Array<{ key: string; label: string; emoji?: string; color?: string }>
        };
      case 'intensity':
        return {
          title: 'Intensidad',
          icon: '🔥',
          type: 'select',
          options: [
            { key: 'GENTLE', label: 'Suave', color: '#81C784' },
            { key: 'MODERATE', label: 'Moderado', color: '#FF9800' },
            { key: 'AGGRESSIVE', label: 'Intensivo', color: '#F44336' },
          ] as Array<{ key: string; label: string; emoji?: string; color?: string }>
        };
      case 'motivation':
        return {
          title: 'Motivación',
          icon: '💪',
          type: 'textarea',
          placeholder: '¿Qué te motiva a lograr este objetivo?',
        };
      default:
        return { title: '', icon: '', type: 'input' };
    }
  };

  const config = getFieldConfig();

  const handleSave = async () => {
    if (!value && fieldType !== 'motivation') {
      Alert.alert('Campo requerido', 'Por favor completa este campo');
      return;
    }

    setLoading(true);
    try {
      let updateData: any = {};
      
      switch (fieldType) {
        case 'nutritionGoal':
          updateData.nutritionGoal = value as NutritionGoal;
          break;
        case 'targetWeight':
          updateData.targetWeightKg = value ? parseInt(value) : undefined;
          break;
        case 'timeFrame':
          updateData.timeFrame = value as TimeFrame;
          break;
        case 'intensity':
          updateData.intensity = value as 'GENTLE' | 'MODERATE' | 'AGGRESSIVE';
          break;
        case 'motivation':
          updateData.currentMotivation = value || undefined;
          break;
      }

      const updatedProfile = await NutritionService.updateUserProfile(updateData);
      onSave(updatedProfile);
      onClose();
      Alert.alert('¡Éxito!', 'Campo actualizado correctamente');
    } catch (error) {
      console.log('Error actualizando campo:', error);
      Alert.alert('Error', 'No se pudo actualizar el campo. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar valor cuando cambie currentValue
  React.useEffect(() => {
    let displayValue = currentValue?.toString() || '';
    
    // Convertir valores del backend a valores del frontend para mostrar
    if (fieldType === 'intensity' && currentValue) {
      const backendToFrontend: { [key: string]: string } = {
        'LOW': 'GENTLE',
        'MODERATE': 'MODERATE',
        'HIGH': 'AGGRESSIVE'
      };
      displayValue = backendToFrontend[currentValue] || currentValue;
    }
    
    // Convertir timeFrame del backend al frontend
    if (fieldType === 'timeFrame' && currentValue) {
      const backendToFrontend: { [key: string]: string } = {
        '1_MONTH': '1_MONTH',
        '3_MONTHS': '3_MONTHS',
        '6_MONTHS': '6_MONTHS',
        '1_YEAR': '1_YEAR',
        'LONG_TERM': 'LONG_TERM'
      };
      displayValue = backendToFrontend[currentValue] || currentValue;
    }
    
    setValue(displayValue);
  }, [currentValue, fieldType]);

  const getFieldDescription = () => {
    switch (fieldType) {
      case 'nutritionGoal':
        return 'Selecciona tu objetivo principal para personalizar tu plan nutricional';
      case 'targetWeight':
        return 'Ingresa tu peso objetivo en kilogramos. Este será tu meta a alcanzar.';
      case 'timeFrame':
        return 'Define en cuánto tiempo quieres alcanzar tu objetivo';
      case 'intensity':
        return 'Elige qué tan intensivo quieres que sea tu plan';
      case 'motivation':
        return 'Comparte qué te motiva a lograr este objetivo. Esto te ayudará a mantenerte enfocado.';
      default:
        return '';
    }
  };

  const getCurrentValueDisplay = () => {
    if (!userProfile) return null;
    
    switch (fieldType) {
      case 'nutritionGoal':
        const goalLabels: { [key: string]: string } = {
          MAINTAIN_WEIGHT: "Mantener peso",
          LOSE_WEIGHT: "Bajar de peso", 
          GAIN_WEIGHT: "Subir de peso",
          GAIN_MUSCLE: "Ganar masa muscular",
          IMPROVE_HEALTH: "Salud general",
          // Mantener compatibilidad con valores anteriores
          BUILD_MUSCLE: "Ganar masa muscular",
          ATHLETIC_PERFORMANCE: "Salud general",
          GENERAL_HEALTH: "Salud general",
        };
        return userProfile.nutritionGoal ? goalLabels[userProfile.nutritionGoal] : 'No definido';
      case 'targetWeight':
        return userProfile.targetWeightKg ? `${userProfile.targetWeightKg} kg` : 'No definido';
      case 'timeFrame':
        const timeLabels: { [key: string]: string } = {
          "1_MONTH": "1 mes",
          "3_MONTHS": "3 meses", 
          "6_MONTHS": "6 meses",
          "1_YEAR": "1 año",
          "LONG_TERM": "Largo plazo",
          // Mantener compatibilidad con valores anteriores
          "ONE_MONTH": "1 mes",
          "THREE_MONTHS": "3 meses",
          "SIX_MONTHS": "6 meses",
          "ONE_YEAR": "1 año",
        };
        return userProfile.timeFrame ? timeLabels[userProfile.timeFrame] : 'No definido';
      case 'intensity':
        const intensityLabels: { [key: string]: string } = {
          LOW: "Suave",
          MODERATE: "Moderado",
          HIGH: "Intensivo",
          // Mantener compatibilidad con valores anteriores
          GENTLE: "Suave",
          AGGRESSIVE: "Intensivo",
        };
        return userProfile.intensity ? intensityLabels[userProfile.intensity] : 'No definido';
      case 'motivation':
        return userProfile.currentMotivation || 'No definida';
      default:
        return null;
    }
  };

  const renderContent = () => {
    return (
      <View style={styles.contentWrapper}>
        {/* Descripción del campo */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>{getFieldDescription()}</Text>
        </View>

        {/* Valor actual */}
        <View style={styles.currentValueContainer}>
          <Text style={styles.currentValueLabel}>Valor actual:</Text>
          <Text style={styles.currentValue}>{getCurrentValueDisplay()}</Text>
        </View>

        {/* Campo de edición */}
        <View style={styles.editContainer}>
          <Text style={styles.editLabel}>Nuevo valor:</Text>
          {config.type === 'select' ? (
            <View style={styles.optionsContainer}>
              {config.options?.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.option,
                    value === option.key && styles.optionActive,
                    fieldType === 'intensity' && value === option.key && { borderColor: option.color }
                  ]}
                  onPress={() => setValue(option.key)}
                >
                  {option.emoji && <Text style={styles.optionEmoji}>{option.emoji}</Text>}
                  <Text style={[
                    styles.optionText,
                    value === option.key && styles.optionTextActive,
                    fieldType === 'intensity' && value === option.key && { color: option.color }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : config.type === 'textarea' ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={config.placeholder}
              placeholderTextColor="rgba(0, 0, 0, 0.4)"
              value={value}
              onChangeText={setValue}
              multiline
              numberOfLines={4}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          ) : (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={config.placeholder}
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={value}
                onChangeText={setValue}
                keyboardType={config.keyboardType}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              {fieldType === 'targetWeight' && (
                <Text style={styles.inputSuffix}>kg</Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

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
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.titleIcon}>{config.icon}</Text>
              <Text style={styles.title}>{config.title}</Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {renderContent()}
          </View>

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#ccc', '#999'] : ['#FF9800', '#F57C00']}
                style={styles.saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  contentWrapper: {
    flex: 1,
  },
  descriptionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  description: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  currentValueContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#fff',
  },
  currentValueLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  currentValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  editContainer: {
    flex: 1,
  },
  editLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: '#fff',
    borderWidth: 2,
  },
  optionEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  optionText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  input: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  inputSuffix: {
    paddingRight: 20,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    height: 120,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  saveButton: {
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});