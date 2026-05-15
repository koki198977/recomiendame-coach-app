import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HydrationService from '../services/hydrationService';
import { HydrationPlanStatus } from '../types/nutrition';

interface HydrationCardProps {
  onSetupPress: () => void;
  onLogPress: () => void;
}

export const HydrationCard: React.FC<HydrationCardProps> = ({
  onSetupPress,
  onLogPress,
}) => {
  const [planStatus, setPlanStatus] = useState<HydrationPlanStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    loadPlanStatus();
  }, []);

  const loadPlanStatus = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await HydrationService.getPlanStatus();
      setPlanStatus(response);
      
      // Detectar si estamos usando el estado por defecto del fallback
      setIsOffline(!response.hasPlan && response.recommendedDailyMl === 2500 && response.currentProgress.totalMl === 0);
      
    } catch (error) {
      console.log('ℹ️ HydrationCard - Usando modo offline');
      setIsOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadPlanStatus(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="small" color="#00BCD4" />
        <Text style={styles.loadingText}>Sincronizando hidratación...</Text>
      </View>
    );
  }

  const { hasPlan, currentProgress } = planStatus || { hasPlan: false, currentProgress: { totalMl: 0, targetMl: 2500, percentage: 0, status: 'POOR', insights: [] } };
  const progressPercentage = (currentProgress.totalMl / (currentProgress.targetMl || 2500)) * 100;

  if (!hasPlan) {
    return (
      <TouchableOpacity style={styles.setupCard} onPress={onSetupPress} activeOpacity={0.9}>
        <LinearGradient
          colors={['#00C6FF', '#0072FF']}
          style={styles.setupGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.setupContent}>
            <View style={styles.setupIconContainer}>
              <Text style={styles.setupIcon}>💧</Text>
            </View>
            <View style={styles.setupTextContainer}>
              <Text style={styles.setupTitle}>Plan de Hidratación</Text>
              <Text style={styles.setupSubtitle}>
                Configura tu meta diaria para hoy
              </Text>
            </View>
            <View style={styles.setupAction}>
              <Text style={styles.setupActionText}>Configurar</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.progressCard}>
      <LinearGradient
        colors={['#ffffff', '#f0faff']}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.progressHeader}>
          <View style={styles.progressTitleContainer}>
            <View style={[styles.iconBadge, { backgroundColor: HydrationService.getStatusColor(currentProgress.status) + '20' }]}>
              <Text style={styles.progressIcon}>
                {HydrationService.getStatusEmoji(currentProgress.status)}
              </Text>
            </View>
            <View>
              <Text style={styles.progressTitle}>Hidratación</Text>
              <Text style={[
                styles.progressStatus,
                { color: HydrationService.getStatusColor(currentProgress.status) }
              ]}>
                {currentProgress.status === 'POOR' && 'Nivel bajo'}
                {currentProgress.status === 'FAIR' && 'Progreso medio'}
                {currentProgress.status === 'GOOD' && '¡Buen ritmo!'}
                {currentProgress.status === 'EXCELLENT' && '¡Excelente!'}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.refreshIconContainer} 
            onPress={handleRefresh} 
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#999" />
            ) : (
              <Text style={styles.refreshIcon}>↻</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.mainProgressSection}>
          <View style={styles.percentageContainer}>
            <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
            <Text style={styles.percentageLabel}>completado</Text>
          </View>
          
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['#00C6FF', '#0072FF']}
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progressPercentage, 100)}%` }
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <View style={styles.mlLabels}>
              <Text style={styles.mlCurrent}>{HydrationService.formatMl(currentProgress.totalMl)}</Text>
              <Text style={styles.mlTarget}>Meta: {HydrationService.formatMl(currentProgress.targetMl)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.motivationalMessage}>
            {HydrationService.getMotivationalMessage(progressPercentage)}
          </Text>
          
          <TouchableOpacity 
            style={styles.fabButton} 
            onPress={onLogPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#00C6FF', '#0072FF']}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.fabIcon}>+</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {isOffline && (
          <View style={styles.offlineHint}>
            <Text style={styles.offlineText}>Ajustes locales activados</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  setupCard: {
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  setupGradient: {
    borderRadius: 16,
    padding: 20,
  },
  setupContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setupIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  setupTextContainer: {
    flex: 1,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  setupSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  setupArrow: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  progressTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  refreshButton: {
    fontSize: 20,
    color: '#666',
    padding: 5,
  },
  refreshing: {
    opacity: 0.5,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00BCD4',
    minWidth: 35,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
  },
  motivationalMessage: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 15,
  },
  addWaterButton: {
    borderRadius: 12,
    marginBottom: 15,
  },
  addWaterGradient: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  addWaterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  insightsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  insightText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});