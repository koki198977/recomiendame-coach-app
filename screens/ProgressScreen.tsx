import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

export const ProgressScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');

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

  const renderWeightProgress = () => (
    <View style={styles.progressCard}>
      <Text style={styles.cardTitle}>Progreso de Peso</Text>
      <View style={styles.weightStats}>
        <View style={styles.weightItem}>
          <Text style={styles.weightNumber}>72.5</Text>
          <Text style={styles.weightLabel}>Actual</Text>
        </View>
        <View style={styles.weightItem}>
          <Text style={styles.weightNumber}>75.0</Text>
          <Text style={styles.weightLabel}>Inicial</Text>
        </View>
        <View style={styles.weightItem}>
          <Text style={[styles.weightNumber, styles.weightLoss]}>-2.5</Text>
          <Text style={styles.weightLabel}>Perdidos</Text>
        </View>
      </View>
      
      {/* Simulación de gráfico */}
      <View style={styles.chartPlaceholder}>
        <Text style={styles.chartText}>📈 Gráfico de peso</Text>
        <Text style={styles.chartSubtext}>Tendencia descendente</Text>
      </View>
    </View>
  );

  const renderCaloriesProgress = () => (
    <View style={styles.progressCard}>
      <Text style={styles.cardTitle}>Calorías esta semana</Text>
      <View style={styles.caloriesGrid}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
          <View key={index} style={styles.calorieDay}>
            <View style={[
              styles.calorieBar,
              { height: Math.random() * 60 + 20 }
            ]} />
            <Text style={styles.calorieDayText}>{day}</Text>
          </View>
        ))}
      </View>
      <View style={styles.caloriesStats}>
        <Text style={styles.caloriesAverage}>Promedio: 1,650 kcal/día</Text>
        <Text style={styles.caloriesTarget}>Objetivo: 1,800 kcal/día</Text>
      </View>
    </View>
  );

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
        {renderWeightProgress()}
        {renderCaloriesProgress()}
        {renderAchievements()}
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
    color: '#FF9800',
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