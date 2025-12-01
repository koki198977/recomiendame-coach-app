import React from 'react';
import {
  View,
  Text,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface PlanGeneratingModalProps {
  visible: boolean;
  progress?: number; // 0-100
  type?: 'nutrition' | 'workout'; // Tipo de plan
  title?: string; // Título personalizado
  description?: string; // Descripción personalizada
}

export const PlanGeneratingModal: React.FC<PlanGeneratingModalProps> = ({
  visible,
  progress = 0,
  type = 'nutrition',
  title,
  description,
}) => {
  // Textos por defecto según el tipo
  const defaultTitle = type === 'workout' 
    ? 'Generando tu rutina personalizada'
    : 'Generando tu plan personalizado';
  
  const defaultDescription = type === 'workout'
    ? 'Nuestra IA está analizando tus objetivos y creando una rutina de ejercicios única para ti'
    : 'Nuestra IA está analizando tus preferencias y creando un plan nutricional único para ti';

  // Mensajes de estado según el tipo
  const getStatusMessage = () => {
    if (type === 'workout') {
      if (progress < 30) return '🔍 Analizando tu perfil de entrenamiento...';
      if (progress < 60) return '💪 Seleccionando ejercicios ideales...';
      if (progress < 90) return '📊 Calculando series y repeticiones...';
      return '✨ Finalizando tu rutina personalizada...';
    } else {
      if (progress < 30) return '🔍 Analizando tu perfil nutricional...';
      if (progress < 60) return '🍎 Seleccionando alimentos ideales...';
      if (progress < 90) return '📊 Calculando macronutrientes...';
      return '✨ Finalizando tu plan personalizado...';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#4CAF50', '#81C784']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          
          {/* AI Animation */}
          <View style={styles.aiContainer}>
            <View style={styles.aiIcon}>
              <Text style={styles.aiEmoji}>🤖</Text>
            </View>
            <ActivityIndicator size="large" color="#fff" style={styles.spinner} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title || defaultTitle}</Text>
          
          {/* Description */}
          <Text style={styles.description}>
            {description || defaultDescription}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>

          {/* Status Messages */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{getStatusMessage()}</Text>
          </View>

          {/* Time Estimate */}
          <Text style={styles.timeEstimate}>
            Tiempo estimado: 1-2 minutos
          </Text>
          <Text style={styles.timeNote}>
            Por favor mantén la app abierta durante el proceso
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.85,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  aiContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  aiIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  aiEmoji: {
    fontSize: 40,
  },
  spinner: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 25,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9800',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  statusContainer: {
    minHeight: 25,
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  timeEstimate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  timeNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
});