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
      
      const status = await HydrationService.getPlanStatus();
      setPlanStatus(status);
    } catch (error) {
      console.error('Error loading hydration status:', error);
      // No mostrar error, solo log
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
        <ActivityIndicator size="small" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando hidratación...</Text>
      </View>
    );
  }

  if (!planStatus) {
    return null; // No mostrar nada si no se puede cargar
  }

  const { hasPlan, currentProgress } = planStatus;
  const progressPercentage = (currentProgress.totalMl / currentProgress.targetMl) * 100;

  if (!hasPlan) {
    // Mostrar card para configurar plan
    return (
      <TouchableOpacity style={styles.setupCard} onPress={onSetupPress}>
        <LinearGradient
          colors={['#2196F3', '#21CBF3']}
          style={styles.setupGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.setupContent}>
            <Text style={styles.setupIcon}>💧</Text>
            <View style={styles.setupTextContainer}>
              <Text style={styles.setupTitle}>Configura tu Hidratación</Text>
              <Text style={styles.setupSubtitle}>
                Crea tu plan personalizado de hidratación
              </Text>
            </View>
            <Text style={styles.setupArrow}>→</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Mostrar progreso del plan existente
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <View style={styles.progressTitleContainer}>
          <Text style={styles.progressIcon}>
            {HydrationService.getStatusEmoji(currentProgress.status)}
          </Text>
          <View>
            <Text style={styles.progressTitle}>Hidratación Diaria</Text>
            <Text style={[
              styles.progressStatus,
              { color: HydrationService.getStatusColor(currentProgress.status) }
            ]}>
              {currentProgress.status === 'POOR' && 'Necesitas hidratarte'}
              {currentProgress.status === 'FAIR' && 'Progreso moderado'}
              {currentProgress.status === 'GOOD' && 'Buen progreso'}
              {currentProgress.status === 'EXCELLENT' && '¡Excelente!'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <Text style={[styles.refreshButton, refreshing && styles.refreshing]}>
            {refreshing ? '⟳' : '↻'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Barra de progreso */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={['#2196F3', '#21CBF3']}
            style={[
              styles.progressFill,
              { width: `${Math.min(progressPercentage, 100)}%` }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        <Text style={styles.progressPercentage}>
          {Math.round(progressPercentage)}%
        </Text>
      </View>

      {/* Estadísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {HydrationService.formatMl(currentProgress.totalMl)}
          </Text>
          <Text style={styles.statLabel}>Consumido</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {HydrationService.formatMl(currentProgress.remainingMl)}
          </Text>
          <Text style={styles.statLabel}>Restante</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {HydrationService.formatMl(currentProgress.targetMl)}
          </Text>
          <Text style={styles.statLabel}>Objetivo</Text>
        </View>
      </View>

      {/* Mensaje motivacional */}
      <Text style={styles.motivationalMessage}>
        {HydrationService.getMotivationalMessage(progressPercentage)}
      </Text>

      {/* Botón para agregar agua */}
      <TouchableOpacity style={styles.addWaterButton} onPress={onLogPress}>
        <LinearGradient
          colors={['#4CAF50', '#45A049']}
          style={styles.addWaterGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.addWaterText}>+ Agregar Agua</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Insights */}
      {currentProgress.insights.length > 0 && (
        <View style={styles.insightsContainer}>
          {currentProgress.insights.slice(0, 2).map((insight, index) => (
            <Text key={index} style={styles.insightText}>{insight}</Text>
          ))}
        </View>
      )}
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
    color: '#2196F3',
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