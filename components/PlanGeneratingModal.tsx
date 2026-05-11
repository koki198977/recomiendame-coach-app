import React from 'react';
import {
  View,
  Text,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface PlanGeneratingModalProps {
  visible: boolean;
  progress?: number; // 0-100
  type?: 'nutrition' | 'workout'; // Tipo de plan
  title?: string; // Título personalizado
  description?: string; // Descripción personalizada
  onRunInBackground?: () => void; // Callback para cerrar el modal y seguir en background
}

export const PlanGeneratingModal: React.FC<PlanGeneratingModalProps> = ({
  visible,
  progress = 0,
  type = 'nutrition',
  title,
  description,
  onRunInBackground,
}) => {
  // Textos por defecto según el tipo
  const defaultTitle = type === 'workout' 
    ? 'Chapi está diseñando tu rutina perfecta...'
    : 'Chapi está diseñando tu menú perfecto...';
  
  const defaultDescription = type === 'workout'
    ? 'Estoy analizando tus objetivos y seleccionando los mejores ejercicios para ti'
    : 'Estoy eligiendo recetas deliciosas que te van a encantar';

  // Mensajes de estado según el tipo
  const getStatusMessage = () => {
    if (type === 'workout') {
      if (progress < 15) return '🔍 Revisando tus objetivos...';
      if (progress < 30) return '💪 Viendo qué ejercicios te van mejor...';
      if (progress < 45) return '🎯 Eligiendo los movimientos perfectos...';
      if (progress < 60) return '📊 Ajustando las repeticiones ideales...';
      if (progress < 75) return '⚡ Balanceando intensidad y descanso...';
      if (progress < 90) return '🏋️ Armando tu semana de entrenamiento...';
      return '✨ ¡Ya casi está listo!';
    } else {
      if (progress < 15) return '🔍 Conociendo tus gustos...';
      if (progress < 30) return '🍎 Buscando recetas que te encantarán...';
      if (progress < 45) return '🥗 Eligiendo ingredientes frescos...';
      if (progress < 60) return '📊 Balanceando tus nutrientes...';
      if (progress < 75) return '⚖️ Organizando tu semana...';
      if (progress < 90) return '🍽️ Preparando tus comidas diarias...';
      return '✨ ¡Ya casi está listo!';
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
          
          {/* Chapi 3D Character */}
          <View style={styles.aiContainer}>
            <View style={styles.chapiCircle}>
              <Image 
                source={
                  type === 'workout' 
                    ? require('../assets/chapi-3d-ejercicio.png')
                    : require('../assets/chapi-3d-alimento.png')
                }
                style={styles.chapiImage}
                resizeMode="contain"
              />
            </View>
            <ActivityIndicator size="large" color="#fff" style={styles.spinner} />
          </View>

          {/* Title */}
          <Text style={styles.title}>🚀 {title || defaultTitle}</Text>
          
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

          {/* Mensaje de Segundo Plano */}
          {onRunInBackground && (
            <View style={styles.backgroundInfoContainer}>
              <Text style={styles.backgroundInfoText}>
                🚀 No necesitas esperar aquí. Presiona abajo para seguir usando la app y te notificaremos al terminar.
              </Text>
            </View>
          )}

          {/* Status Messages */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{getStatusMessage()}</Text>
          </View>

          {/* Time Estimate */}
          <Text style={styles.timeEstimate}>
            Esto tomará de 30 segundos a 1 minuto ⏱️
          </Text>
          
          {onRunInBackground !== undefined && onRunInBackground !== null ? (
            <TouchableOpacity 
              style={styles.backgroundButton} 
              onPress={onRunInBackground}
              activeOpacity={0.8}
            >
              <Text style={styles.backgroundButtonText}>Entendido, avísame cuando termine 🚀</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timeNote}>
              Mantén la app abierta mientras trabajo en esto
            </Text>
          )}
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
    alignItems: 'center',
  },
  chapiCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Fondo semi-transparente que se mezcla con el verde
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  chapiImage: {
    width: 110,
    height: 110,
  },
  spinner: {
    position: 'absolute',
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
  backgroundButton: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  backgroundButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  backgroundInfoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backgroundInfoText: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
});