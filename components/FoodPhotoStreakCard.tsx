import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FoodPhotoStreakService } from '../services/foodPhotoStreakService';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';

interface FoodPhotoStreakCardProps {
  onPress?: () => void;
  refreshKey?: number; // Para forzar refresh cuando se sube una foto
}

export const FoodPhotoStreakCard: React.FC<FoodPhotoStreakCardProps> = ({ 
  onPress, 
  refreshKey = 0 
}) => {
  const [loading, setLoading] = useState(true);
  const [streakProgress, setStreakProgress] = useState({
    todayPhotos: 0,
    photosNeeded: 3,
    currentStreak: 0,
    longestStreak: 0,
    progressPercentage: 0,
  });

  useEffect(() => {
    loadStreakProgress();
  }, [refreshKey]);

  const loadStreakProgress = async () => {
    try {
      setLoading(true);
      const progress = await FoodPhotoStreakService.getStreakProgress();
      setStreakProgress(progress);
    } catch (error) {
      console.log('Error loading streak progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStreakEmoji = () => {
    if (streakProgress.currentStreak >= 30) return '👑';
    if (streakProgress.currentStreak >= 7) return '🏆';
    if (streakProgress.currentStreak >= 3) return '🔥';
    return '📸';
  };

  const getMotivationalMessage = () => {
    if (streakProgress.photosNeeded === 0) {
      return '¡Racha completada hoy! 🎉';
    }
    if (streakProgress.todayPhotos === 0) {
      return 'Sube 3 fotos para iniciar tu racha';
    }
    return `${streakProgress.photosNeeded} foto${streakProgress.photosNeeded > 1 ? 's' : ''} más para completar tu racha`;
  };

  const getProgressColor = () => {
    if (streakProgress.progressPercentage === 100) return COLORS.primary;
    if (streakProgress.progressPercentage >= 66) return '#FF9500';
    return '#FF6B6B';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={streakProgress.progressPercentage === 100 ? GRADIENTS.primary : ['#fff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.emoji}>{getStreakEmoji()}</Text>
            <View>
              <Text style={[
                styles.title,
                streakProgress.progressPercentage === 100 && styles.titleCompleted
              ]}>
                Racha Fotográfica
              </Text>
              <Text style={[
                styles.subtitle,
                streakProgress.progressPercentage === 100 && styles.subtitleCompleted
              ]}>
                {getMotivationalMessage()}
              </Text>
            </View>
          </View>
          
          <View style={styles.streakInfo}>
            <Text style={[
              styles.streakNumber,
              streakProgress.progressPercentage === 100 && styles.streakNumberCompleted
            ]}>
              {streakProgress.currentStreak}
            </Text>
            <Text style={[
              styles.streakLabel,
              streakProgress.progressPercentage === 100 && styles.streakLabelCompleted
            ]}>
              días
            </Text>
          </View>
        </View>

        {/* Barra de progreso del día */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${streakProgress.progressPercentage}%`,
                  backgroundColor: getProgressColor()
                }
              ]} 
            />
          </View>
          <Text style={[
            styles.progressText,
            streakProgress.progressPercentage === 100 && styles.progressTextCompleted
          ]}>
            {streakProgress.todayPhotos}/3 fotos hoy
          </Text>
        </View>

        {/* Estadísticas adicionales */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[
              styles.statValue,
              streakProgress.progressPercentage === 100 && styles.statValueCompleted
            ]}>
              {streakProgress.longestStreak}
            </Text>
            <Text style={[
              styles.statLabel,
              streakProgress.progressPercentage === 100 && styles.statLabelCompleted
            ]}>
              Mejor racha
            </Text>
          </View>
          
          <View style={styles.stat}>
            <Text style={[
              styles.statValue,
              streakProgress.progressPercentage === 100 && styles.statValueCompleted
            ]}>
              {streakProgress.todayPhotos}
            </Text>
            <Text style={[
              styles.statLabel,
              streakProgress.progressPercentage === 100 && styles.statLabelCompleted
            ]}>
              Hoy
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  titleCompleted: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  subtitleCompleted: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  streakInfo: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  streakNumberCompleted: {
    color: '#fff',
  },
  streakLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  streakLabelCompleted: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressTextCompleted: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 2,
  },
  statValueCompleted: {
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  statLabelCompleted: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});