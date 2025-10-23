import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { NutritionService } from '../services/nutritionService';
import { Checkin } from '../types/nutrition';

const { width } = Dimensions.get('window');

export const ProgressScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCheckinHistory();
  }, [selectedPeriod]);

  const loadCheckinHistory = async () => {
    try {
      setLoading(true);
      const now = new Date();
      let from: string;
      
      if (selectedPeriod === 'week') {
        // Inicio de la semana actual (lunes)
        const startOfWeek = new Date(now);
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si es domingo (0), retroceder 6 días
        startOfWeek.setDate(now.getDate() - daysToMonday);
        from = startOfWeek.toISOString().split('T')[0];
      } else if (selectedPeriod === 'month') {
        // Inicio del mes actual
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        from = startOfMonth.toISOString().split('T')[0];
      } else {
        // Inicio del año actual
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        from = startOfYear.toISOString().split('T')[0];
      }
      
      const to = now.toISOString().split('T')[0];
      const history = await NutritionService.getCheckinHistory(from, to);
      
      // La función ya devuelve un array validado
      setCheckins(history);
    } catch (error) {
      console.log('Error loading checkin history:', error);
      setCheckins([]); // Asegurar que siempre sea un array
    } finally {
      setLoading(false);
    }
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['week', 'month', 'year'].map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodText,
            selectedPeriod === period && styles.periodTextActive
          ]}>
            {period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Año'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderWeightProgress = () => {
    // Validar que checkins sea un array
    const checkinsArray = Array.isArray(checkins) ? checkins : [];
    const weightsWithDates = checkinsArray
      .filter(c => c.weightKg)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const currentWeight = weightsWithDates.length > 0 ? weightsWithDates[weightsWithDates.length - 1].weightKg : null;
    const initialWeight = weightsWithDates.length > 0 ? weightsWithDates[0].weightKg : null;
    const weightLoss = currentWeight && initialWeight ? initialWeight - currentWeight : 0;

    return (
      <View style={styles.progressCard}>
        <Text style={styles.cardTitle}>Progreso de Peso</Text>
        {weightsWithDates.length > 0 ? (
          <>
            <View style={styles.weightStats}>
              <View style={styles.weightItem}>
                <Text style={styles.weightNumber}>{currentWeight?.toFixed(1)}</Text>
                <Text style={styles.weightLabel}>Actual</Text>
              </View>
              <View style={styles.weightItem}>
                <Text style={styles.weightNumber}>{initialWeight?.toFixed(1)}</Text>
                <Text style={styles.weightLabel}>Inicial</Text>
              </View>
              <View style={styles.weightItem}>
                <Text style={[
                  styles.weightNumber, 
                  weightLoss > 0 ? styles.weightLoss : styles.weightGain
                ]}>
                  {weightLoss > 0 ? '-' : '+'}{Math.abs(weightLoss).toFixed(1)}
                </Text>
                <Text style={styles.weightLabel}>
                  {weightLoss > 0 ? 'Perdidos' : 'Ganados'}
                </Text>
              </View>
            </View>
            
            {/* Lista de pesos recientes */}
            <View style={styles.weightHistory}>
              <Text style={styles.weightHistoryTitle}>Historial reciente</Text>
              {weightsWithDates.slice(-5).reverse().map((checkin, index) => (
                <View key={checkin.id} style={styles.weightHistoryItem}>
                  <Text style={styles.weightHistoryDate}>
                    {new Date(checkin.date).toLocaleDateString('es-ES')}
                  </Text>
                  <Text style={styles.weightHistoryValue}>
                    {checkin.weightKg?.toFixed(1)} kg
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              No hay registros de peso aún
            </Text>
            <Text style={styles.noDataSubtext}>
              Registra tu peso en el checkin diario
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderAdherenceProgress = () => {
    // Validar que checkins sea un array
    const checkinsArray = Array.isArray(checkins) ? checkins : [];
    const adherenceData = checkinsArray
      .filter(c => c.adherencePct !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const averageAdherence = adherenceData.length > 0 
      ? adherenceData.reduce((sum, c) => sum + (c.adherencePct || 0), 0) / adherenceData.length
      : 0;

    return (
      <View style={styles.progressCard}>
        <Text style={styles.cardTitle}>Adherencia al Plan</Text>
        {adherenceData.length > 0 ? (
          <>
            <View style={styles.adherenceStats}>
              <View style={styles.adherenceItem}>
                <Text style={styles.adherenceNumber}>{averageAdherence.toFixed(0)}%</Text>
                <Text style={styles.adherenceLabel}>Promedio</Text>
              </View>
              <View style={styles.adherenceItem}>
                <Text style={styles.adherenceNumber}>{adherenceData.length}</Text>
                <Text style={styles.adherenceLabel}>Días registrados</Text>
              </View>
            </View>
            
            {/* Lista de adherencia reciente */}
            <View style={styles.adherenceHistory}>
              <Text style={styles.adherenceHistoryTitle}>Últimos registros</Text>
              {adherenceData.slice(-5).reverse().map((checkin, index) => (
                <View key={checkin.id} style={styles.adherenceHistoryItem}>
                  <Text style={styles.adherenceHistoryDate}>
                    {new Date(checkin.date).toLocaleDateString('es-ES')}
                  </Text>
                  <View style={styles.adherenceBar}>
                    <View 
                      style={[
                        styles.adherenceBarFill, 
                        { width: `${checkin.adherencePct || 0}%` }
                      ]} 
                    />
                    <Text style={styles.adherenceHistoryValue}>
                      {checkin.adherencePct}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              No hay registros de adherencia aún
            </Text>
            <Text style={styles.noDataSubtext}>
              Registra tu adherencia en el checkin diario
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderAchievements = () => (
    <View style={styles.progressCard}>
      <Text style={styles.cardTitle}>Logros</Text>
      <View style={styles.achievementsGrid}>
        <View style={styles.achievement}>
          <Text style={styles.achievementIcon}>🏆</Text>
          <Text style={styles.achievementText}>Primera semana</Text>
        </View>
        <View style={styles.achievement}>
          <Text style={styles.achievementIcon}>🥗</Text>
          <Text style={styles.achievementText}>5 días seguidos</Text>
        </View>
        <View style={styles.achievement}>
          <Text style={styles.achievementIcon}>💪</Text>
          <Text style={styles.achievementText}>Meta de peso</Text>
        </View>
        <View style={[styles.achievement, styles.achievementLocked]}>
          <Text style={styles.achievementIcon}>🔒</Text>
          <Text style={styles.achievementText}>Próximo logro</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Progreso</Text>
        <TouchableOpacity style={styles.photoButton}>
          <Text style={styles.photoButtonText}>📸 Foto</Text>
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      {renderPeriodSelector()}

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Cargando progreso...</Text>
          </View>
        ) : (
          <>
            {renderWeightProgress()}
            {renderAdherenceProgress()}
            {renderAchievements()}
          </>
        )}
      </ScrollView>
    </View>
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
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  photoButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 25,
    padding: 5,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  progressCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  weightStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  weightItem: {
    alignItems: 'center',
  },
  weightNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  weightLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  weightLoss: {
    color: '#4CAF50',
  },
  weightGain: {
    color: '#FF9800',
  },
  weightHistory: {
    marginTop: 15,
  },
  weightHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  weightHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weightHistoryDate: {
    fontSize: 14,
    color: '#666',
  },
  weightHistoryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  adherenceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  adherenceItem: {
    alignItems: 'center',
  },
  adherenceNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  adherenceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  adherenceHistory: {
    marginTop: 15,
  },
  adherenceHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  adherenceHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  adherenceHistoryDate: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  adherenceBar: {
    flex: 1,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginLeft: 10,
    position: 'relative',
    justifyContent: 'center',
  },
  adherenceBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  adherenceHistoryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  chartPlaceholder: {
    backgroundColor: '#f8f8f8',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  chartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chartSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  caloriesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    marginBottom: 15,
  },
  calorieDay: {
    alignItems: 'center',
    flex: 1,
  },
  calorieBar: {
    backgroundColor: '#4CAF50',
    width: 20,
    borderRadius: 10,
    marginBottom: 5,
  },
  calorieDayText: {
    fontSize: 12,
    color: '#666',
  },
  caloriesStats: {
    alignItems: 'center',
  },
  caloriesAverage: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  caloriesTarget: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievement: {
    width: '48%',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  achievementText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
});