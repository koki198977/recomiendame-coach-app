import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HydrationService from '../services/hydrationService';
import { HydrationLogRequest } from '../types/nutrition';

interface LogWaterModalProps {
  visible: boolean;
  onClose: () => void;
  onLogSuccess: () => void;
}

export const LogWaterModal: React.FC<LogWaterModalProps> = ({
  visible,
  onClose,
  onLogSuccess,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [description, setDescription] = useState('');
  const [logging, setLogging] = useState(false);

  const quickAmounts = [
    { ml: 250, label: 'Vaso', icon: '🥤' },
    { ml: 350, label: 'Botella pequeña', icon: '🚰' },
    { ml: 500, label: 'Botella', icon: '🧴' },
    { ml: 750, label: 'Botella grande', icon: '🍶' },
    { ml: 1000, label: 'Litro', icon: '🥛' },
  ];

  const handleQuickSelect = (ml: number) => {
    setSelectedAmount(ml);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (text: string) => {
    setCustomAmount(text);
    const amount = parseInt(text);
    if (!isNaN(amount) && amount > 0) {
      setSelectedAmount(amount);
    } else {
      setSelectedAmount(null);
    }
  };

  const handleLogWater = async () => {
    if (!selectedAmount || selectedAmount <= 0) {
      Alert.alert('Error', 'Por favor selecciona o ingresa una cantidad válida');
      return;
    }

    try {
      setLogging(true);
      
      const logData: HydrationLogRequest = {
        ml: selectedAmount,
        description: description.trim() || undefined,
        time: new Date().toISOString(),
      };

      const response = await HydrationService.logCustomIntake(logData);
      
      // Cerrar modal y actualizar sin mostrar alert
      onLogSuccess();
      onClose();
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el consumo de agua');
    } finally {
      setLogging(false);
    }
  };

  const resetForm = () => {
    setSelectedAmount(null);
    setCustomAmount('');
    setDescription('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <LinearGradient
            colors={['#00BCD4', '#4CAF50']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>💧</Text>
          </View>
          <Text style={styles.title}>Registrar Agua</Text>
          <Text style={styles.subtitle}>¿Cuánta agua tomaste?</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Cantidades rápidas */}
          <View style={styles.quickAmountsContainer}>
            <Text style={styles.sectionTitle}>Cantidades comunes:</Text>
            <View style={styles.quickAmountsList}>
              {quickAmounts.map((item) => (
                <TouchableOpacity
                  key={item.ml}
                  style={[
                    styles.quickAmountButton,
                    selectedAmount === item.ml && styles.quickAmountButtonSelected
                  ]}
                  onPress={() => handleQuickSelect(item.ml)}
                >
                  <Text style={styles.quickAmountIcon}>{item.icon}</Text>
                  <Text style={[
                    styles.quickAmountLabel,
                    selectedAmount === item.ml && styles.quickAmountLabelSelected
                  ]}>
                    {item.label}
                  </Text>
                  <Text style={[
                    styles.quickAmountMl,
                    selectedAmount === item.ml && styles.quickAmountMlSelected
                  ]}>
                    {item.ml}ml
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cantidad personalizada */}
          <View style={styles.customAmountContainer}>
            <Text style={styles.sectionTitle}>O ingresa una cantidad personalizada:</Text>
            <View style={styles.customInputContainer}>
              <TextInput
                style={styles.customInput}
                placeholder="Ej: 300"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={customAmount}
                onChangeText={handleCustomAmountChange}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                blurOnSubmit={true}
                autoCorrect={false}
                selectTextOnFocus={true}
              />
              <Text style={styles.customInputUnit}>ml</Text>
            </View>
          </View>

          {/* Descripción opcional */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Descripción (opcional):</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Ej: Vaso después del ejercicio"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              blurOnSubmit={true}
              textAlignVertical="top"
            />
          </View>

          {/* Resumen */}
          {selectedAmount && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Resumen:</Text>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryAmount}>
                  {HydrationService.formatMl(selectedAmount)}
                </Text>
                {description.trim() && (
                  <Text style={styles.summaryDescription}>"{description.trim()}"</Text>
                )}
                <Text style={styles.summaryTime}>
                  Ahora • {new Date().toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.logButton, 
              (!selectedAmount || logging) && styles.logButtonDisabled
            ]}
            onPress={handleLogWater}
            disabled={!selectedAmount || logging}
          >
            <LinearGradient
              colors={(!selectedAmount || logging) ? ['#ccc', '#999'] : ['#4CAF50', '#45A049']}
              style={styles.logButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {logging ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.logButtonText}>
                  Registrar {selectedAmount ? HydrationService.formatMl(selectedAmount) : ''}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
          </LinearGradient>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  quickAmountsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  quickAmountsList: {
    gap: 12,
  },
  quickAmountButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  quickAmountButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: '#fff',
    borderWidth: 3,
  },
  quickAmountIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  quickAmountLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  quickAmountLabelSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  quickAmountMl: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  quickAmountMlSelected: {
    color: '#fff',
  },
  customAmountContainer: {
    marginBottom: 30,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  customInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  customInputUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 10,
  },
  descriptionContainer: {
    marginBottom: 30,
  },
  descriptionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    textAlignVertical: 'top',
    minHeight: 60,
  },
  summaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  summaryContent: {
    alignItems: 'center',
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  summaryDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  summaryTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  logButton: {
    borderRadius: 16,
  },
  logButtonDisabled: {
    opacity: 0.7,
  },
  logButtonGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  logButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});