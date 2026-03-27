import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { TourGuideZone } from 'rn-tourguide';
import { PlanScreen as NutritionTab } from './PlanScreen';
import { WorkoutsTab } from './WorkoutsTab';
import { AppHeader } from '../components/AppHeader';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface PlanScreenWithTabsProps {
  initialTab?: 'nutrition' | 'workouts';
  isTourActive?: boolean;
  currentStep?: import('../config/onboardingSteps').OnboardingStep | null;
  nextStep?: () => void;
  skipTour?: () => void;
}

export const PlanScreenWithTabs: React.FC<PlanScreenWithTabsProps> = ({ initialTab = 'nutrition', isTourActive, currentStep, nextStep, skipTour }) => {
  const [activeTab, setActiveTab] = useState<'nutrition' | 'workouts'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <View style={styles.container}>
      <AppHeader 
        title="Mi Plan" 
        subtitle="Nutrición y Entrenamiento"
        showLogo={true}
      />

      {/* Tabs Header */}
      <View style={styles.tabsContainer}>
        <TourGuideZone zone={5} text='Aquí está tu plan de comidas personalizado para toda la semana. Lo generé con IA basándome en tus objetivos. ¡Está hecho a tu medida! ✨' borderRadius={8}>
          <TouchableOpacity
            style={styles.tabWrapper}
            onPress={() => setActiveTab('nutrition')}
          >
            <View style={[styles.tab, activeTab === 'nutrition' && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === 'nutrition' && styles.tabTextActive]}>
                🍎 Nutrición
              </Text>
            </View>
          </TouchableOpacity>
        </TourGuideZone>

        <TourGuideZone zone={6} text='También tengo una rutina de entrenamiento personalizada para ti. ¡Nutrición y ejercicio juntos para mejores resultados! 🏋️' borderRadius={8}>
          <TouchableOpacity
            style={styles.tabWrapper}
            onPress={() => setActiveTab('workouts')}
          >
            <View style={[styles.tab, activeTab === 'workouts' && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === 'workouts' && styles.tabTextActive]}>
                💪 Rutinas
              </Text>
            </View>
          </TouchableOpacity>
        </TourGuideZone>
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
    backgroundColor: COLORS.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  tabWrapper: {
    flex: 1,
  },
  tab: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'transparent',
    ...SHADOWS.card,
  },
  tabActive: {
    backgroundColor: COLORS.primary, // Fallback
    borderColor: 'rgba(255,255,255,0.2)',
    ...SHADOWS.glow,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
});
