import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';

interface RestTimerModalProps {
  visible: boolean;
  restSeconds: number;
  onClose: () => void;
}

export const RestTimerModal: React.FC<RestTimerModalProps> = ({
  visible,
  restSeconds,
  onClose,
}) => {
  const [timeLeft, setTimeLeft] = useState(restSeconds);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (visible) {
      setTimeLeft(restSeconds);
      setIsPaused(false);
    }
  }, [visible, restSeconds]);

  useEffect(() => {
    if (!visible || isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Vibrar cuando termine
          Vibration.vibrate([0, 200, 100, 200]);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, isPaused]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    return ((restSeconds - timeLeft) / restSeconds) * 100;
  };

  const addTime = (seconds: number) => {
    setTimeLeft((prev) => prev + seconds);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>⏱️ Descanso</Text>

          <View style={styles.timerCircle}>
            <Text style={[
              styles.timerText,
              timeLeft === 0 && styles.timerTextDone
            ]}>
              {formatTime(timeLeft)}
            </Text>
            {timeLeft === 0 && (
              <Text style={styles.doneText}>¡Listo!</Text>
            )}
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getProgressPercentage()}%` }]} />
          </View>

          {/* Quick time adjustments */}
          <View style={styles.timeControls}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => addTime(-10)}
              disabled={timeLeft <= 10}
            >
              <Text style={styles.timeButtonText}>-10s</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={() => setIsPaused(!isPaused)}
            >
              <Text style={styles.pauseButtonText}>
                {isPaused ? '▶️' : '⏸️'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => addTime(10)}
            >
              <Text style={styles.timeButtonText}>+10s</Text>
            </TouchableOpacity>
          </View>

          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <LinearGradient
              colors={GRADIENTS.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.closeButtonGradient}
            >
              <Text style={styles.closeButtonText}>
                {timeLeft === 0 ? '¡Siguiente serie! 💪' : 'Saltar descanso'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...SHADOWS.glow,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 24,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 8,
    borderColor: COLORS.primary,
  },
  timerText: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.primary,
  },
  timerTextDone: {
    color: COLORS.success,
  },
  doneText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
    marginTop: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  timeControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  timeButton: {
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    ...SHADOWS.card,
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  pauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.glow,
  },
  pauseButtonText: {
    fontSize: 24,
  },
  closeButton: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
