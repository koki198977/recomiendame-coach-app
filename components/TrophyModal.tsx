import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Achievement } from '../types/nutrition';

interface TrophyModalProps {
  visible: boolean;
  achievement: Achievement | null;
  onClose: () => void;
  onShare?: (achievement: Achievement) => void;
}

const { width } = Dimensions.get('window');

export const TrophyModal: React.FC<TrophyModalProps> = ({
  visible,
  achievement,
  onClose,
  onShare,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible && achievement) {
      // Animación de entrada
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset para próxima vez
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, achievement]);

  const handleClose = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleShare = () => {
    if (achievement && onShare) {
      onShare(achievement);
    }
  };

  if (!achievement) return null;

  const getCategoryColor = (category: string): [string, string] => {
    const colors: Record<string, [string, string]> = {
      streak: ['#FF6B6B', '#FF8E53'],
      weight: ['#4ECDC4', '#44A08D'],
      adherence: ['#45B7D1', '#96C93D'],
      social: ['#F093FB', '#F5576C'],
      milestone: ['#FFC371', '#FF5F6D'],
    };
    return colors[category] || ['#4CAF50', '#45A049'];
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <LinearGradient
            colors={getCategoryColor(achievement.category)}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Confetti Effect */}
            <View style={styles.confetti}>
              <Text style={[styles.confettiItem, { top: 20, left: 30 }]}>🎉</Text>
              <Text style={[styles.confettiItem, { top: 40, right: 40 }]}>✨</Text>
              <Text style={[styles.confettiItem, { top: 60, left: 60 }]}>🎊</Text>
              <Text style={[styles.confettiItem, { bottom: 80, right: 30 }]}>⭐</Text>
              <Text style={[styles.confettiItem, { bottom: 100, left: 40 }]}>🌟</Text>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.congratsText}>¡Felicitaciones!</Text>
              
              <View style={styles.trophyContainer}>
                <Text style={styles.trophyIcon}>{achievement.icon}</Text>
              </View>
              
              <Text style={styles.achievementTitle}>{achievement.title}</Text>
              <Text style={styles.achievementDescription}>
                {achievement.description}
              </Text>

              {/* Progress Bar (siempre completa para logros desbloqueados) */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '100%' }]} />
                </View>
                <Text style={styles.progressText}>
                  {achievement.maxProgress}/{achievement.maxProgress}
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.buttonsContainer}>
                {achievement.isShared ? (
                  <View style={styles.sharedButton}>
                    <Text style={styles.sharedButtonText}>✅ Ya compartido</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Text style={styles.shareButtonText}>📤 Compartir</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Text style={styles.closeButtonText}>Continuar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width * 0.85,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  gradient: {
    padding: 30,
    alignItems: 'center',
    position: 'relative',
  },
  confetti: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confettiItem: {
    position: 'absolute',
    fontSize: 20,
    opacity: 0.8,
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  congratsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  trophyContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  trophyIcon: {
    fontSize: 50,
  },
  achievementTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  achievementDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  shareButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sharedButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.7,
  },
  sharedButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});