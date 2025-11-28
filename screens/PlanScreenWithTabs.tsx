import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { PlanScreen as NutritionTab } from './PlanScreen';
import { WorkoutsTab } from './WorkoutsTab';

export const PlanScreenWithTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'nutrition' | 'workouts'>('nutrition');

  return (
    <View style={styles.container}>
      {/* Tabs Header */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'nutrition' && styles.tabActive]}
          onPress={() => setActiveTab('nutrition')}
        >
          <Text style={[styles.tabText, activeTab === 'nutrition' && styles.tabTextActive]}>
            🍎 Nutrición
          </Text>
          {activeTab === 'nutrition' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'workouts' && styles.tabActive]}
          onPress={() => setActiveTab('workouts')}
        >
          <Text style={[styles.tabText, activeTab === 'workouts' && styles.tabTextActive]}>
            💪 Rutinas
          </Text>
          {activeTab === 'workouts' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'nutrition' ? <NutritionTab /> : <WorkoutsTab />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    // Active state handled by indicator
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#333',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#4CAF50',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tabContent: {
    flex: 1,
  },
});
