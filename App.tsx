import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TourGuideProvider, TourGuideZone } from 'rn-tourguide';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';

import { HomeScreen } from './screens/HomeScreen';
import { PlanScreenWithTabs } from './screens/PlanScreenWithTabs';
import { ProgressScreen } from './screens/ProgressScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SocialScreen } from './screens/SocialScreen';
import { Logo } from './components/Logo';
import { CompleteProfileModal } from './components/CompleteProfileModal';
import { ChapiBubble } from './components/ChapiBubble';
import { ChapiChatModal } from './components/ChapiChatModal';
import { CustomTooltip } from './components/CustomTooltip';
import { NutritionService } from './services/nutritionService';
import { UserProfile } from './types/nutrition';
import { setupErrorHandlers } from './utils/errorLogger';
import { setUnauthorizedCallback } from './services/api';
import { PushNotificationService } from './services/pushNotificationService';
import { NotificationReminderService } from './services/notificationReminderService';
import { useTour } from './hooks/useTour';
import { PlanProvider, usePlan } from './hooks/usePlan';
import { PaywallModal } from './components/PaywallModal';

// Configurar handlers de errores al inicio
setupErrorHandlers();

// Componente global para el PaywallModal
const GlobalPaywall: React.FC = () => {
  const plan = usePlan();
  return (
    <PaywallModal
      visible={plan.paywallVisible}
      onClose={plan.hidePaywall}
      onUpgradeSuccess={plan.refreshPlan}
    />
  );
};

// Componente principal con tabs manuales
const MainApp: React.FC<{ onLogout: () => void; refreshKey: number; tourProfile: { onboardingCompleted: boolean } | null }> = ({ onLogout, refreshKey, tourProfile }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [planInitialTab, setPlanInitialTab] = useState<'nutrition' | 'workouts'>('nutrition');
  const [chapiModalVisible, setChapiModalVisible] = useState(false);
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  const [hasForcedTour, setHasForcedTour] = useState(false);

  const { isTourActive, currentStep, nextStep, skipTour, initTour } = useTour(activeTab);

  useEffect(() => {
    if (!hasForcedTour) {
      console.log('🎯 Evaluando lanzar tour de onboarding al montar MainApp');
      initTour({ onboardingCompleted: tourProfile?.onboardingCompleted ?? false });
      setHasForcedTour(true);
    }
  }, [hasForcedTour, initTour, tourProfile]);

  // Incrementar el refresh key cuando se activa el tab de progreso
  const handleTabChange = (tab: string) => {
    if (tab === 'progress') {
      setProgressRefreshKey(prev => prev + 1);
    }
    setActiveTab(tab);
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen key={refreshKey} onNavigateToWorkout={() => {
          setPlanInitialTab('workouts');
          handleTabChange('plan');
        }} isTourActive={isTourActive} currentStep={currentStep} nextStep={nextStep} skipTour={skipTour} />;
      case 'plan':
        return <PlanScreenWithTabs initialTab={planInitialTab} isTourActive={isTourActive} currentStep={currentStep} nextStep={nextStep} skipTour={skipTour} />;
      case 'social':
        return <SocialScreen />;
      case 'progress':
        return <ProgressScreen key={progressRefreshKey} />;
      case 'profile':
        return <ProfileScreen onLogout={onLogout} />;
      default:
        return <HomeScreen key={refreshKey} onNavigateToWorkout={() => {
          setPlanInitialTab('workouts');
          handleTabChange('plan');
        }} isTourActive={isTourActive} currentStep={currentStep} nextStep={nextStep} skipTour={skipTour} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Modern Bottom Tabs */}
      <SafeAreaView style={styles.tabBarContainer} edges={['bottom']}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange('home')}
          >
            <View style={[styles.tabIconContainer, activeTab === 'home' && styles.activeTabIconContainer]}>
              <Text style={[styles.tabIcon, activeTab === 'home' && styles.activeTabIcon]}>🏠</Text>
            </View>
            <Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>
              Inicio
            </Text>
          </TouchableOpacity>

          <TourGuideZone zone={7} text="Aquí encontrarás tu plan nutricional y tu rutina de ejercicios personalizados, generados con IA para ti. 🍎💪" style={{ flex: 1 }} borderRadius={12}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => handleTabChange('plan')}
            >
              <View style={[styles.tabIconContainer, activeTab === 'plan' && styles.activeTabIconContainer]}>
                <Text style={[styles.tabIcon, activeTab === 'plan' && styles.activeTabIcon]}>🍎</Text>
              </View>
              <Text style={[styles.tabText, activeTab === 'plan' && styles.activeTabText]}>
                Mi Programa
              </Text>
            </TouchableOpacity>
          </TourGuideZone>

          <TourGuideZone zone={8} text="Comparte tu progreso, descubre historias inspiradoras y apóyate en personas con objetivos similares a los tuyos. 👥" style={{ flex: 1 }} borderRadius={12}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => handleTabChange('social')}
            >
              <View style={[styles.tabIconContainer, activeTab === 'social' && styles.activeTabIconContainer]}>
                <Text style={[styles.tabIcon, activeTab === 'social' && styles.activeTabIcon]}>👥</Text>
              </View>
              <Text style={[styles.tabText, activeTab === 'social' && styles.activeTabText]}>
                Social
              </Text>
            </TouchableOpacity>
          </TourGuideZone>

          <TourGuideZone zone={9} text="Revisa tu historial, tendencias de peso y evolución a lo largo del tiempo. ¡Celebra cada logro! 📊" style={{ flex: 1 }} borderRadius={12}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => handleTabChange('progress')}
            >
              <View style={[styles.tabIconContainer, activeTab === 'progress' && styles.activeTabIconContainer]}>
                <Text style={[styles.tabIcon, activeTab === 'progress' && styles.activeTabIcon]}>📊</Text>
              </View>
              <Text style={[styles.tabText, activeTab === 'progress' && styles.activeTabText]}>
                Progreso
              </Text>
            </TouchableOpacity>
          </TourGuideZone>

          <TourGuideZone zone={10} text="Ajusta tus datos, metas, restricciones alimenticias y preferencias en cualquier momento. 👤" style={{ flex: 1 }} borderRadius={12}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => handleTabChange('profile')}
            >
              <View style={[styles.tabIconContainer, activeTab === 'profile' && styles.activeTabIconContainer]}>
                <Text style={[styles.tabIcon, activeTab === 'profile' && styles.activeTabIcon]}>👤</Text>
              </View>
              <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
                Perfil
              </Text>
            </TouchableOpacity>
          </TourGuideZone>
        </View>
      </SafeAreaView>

      {/* Chapi - Asistente Virtual */}
      <ChapiBubble onPress={() => setChapiModalVisible(true)} />
      <ChapiChatModal
        visible={chapiModalVisible}
        onClose={() => setChapiModalVisible(false)}
      />

      {/* Paywall global */}
      <GlobalPaywall />

      <StatusBar style="dark" />
    </SafeAreaView>
  );
};

// App sin React Navigation para evitar el error
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | undefined>(undefined);
  const [registeredEmail, setRegisteredEmail] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  // Debug: Log cuando cambia el estado del modal
  React.useEffect(() => {
    console.log('🔍 showCompleteProfile changed to:', showCompleteProfile);
  }, [showCompleteProfile]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');

        if (token) {
          // Verificar si hay perfil guardado localmente primero
          const localProfile = await AsyncStorage.getItem('userProfile');
          if (localProfile) {
            try {
              const profile = JSON.parse(localProfile);
              const hasRequiredData = profile.heightCm && profile.weightKg && profile.activityLevel && profile.country;
              
              if (hasRequiredData) {
                console.log('✅ Perfil completo encontrado localmente, ir directo a home');
                setUserProfile(profile);
                setShowCompleteProfile(false);
                setCurrentScreen('home');
                // Still fetch from API to get onboardingCompleted status
                handleLoginSuccess();
                return;
              }
            } catch (error) {
              console.log('Error parsing local profile:', error);
            }
          }

          // Si no hay perfil local completo, verificar con la API
          console.log('🔍 Token encontrado, verificando perfil con API...');
          await handleLoginSuccess();
        } else {
          setCurrentScreen('login');
        }
      } catch (error) {
        console.log('Error checking status:', error);
        setCurrentScreen('login');
      }
    };

    checkStatus();
  }, []);

  const handleLoginSuccess = async () => {
    // Limpiar mensaje de verificación al hacer login exitoso
    setVerificationMessage(undefined);
    
    // Verificar si el usuario tiene perfil completo
    try {
      console.log('Verificando perfil del usuario...');
      const profile = await NutritionService.getUserProfile();
      console.log('Perfil obtenido:', profile);

      // Verificar si tiene los datos básicos requeridos
      const hasRequiredData = profile.heightCm && profile.weightKg && profile.activityLevel && profile.country;

      if (hasRequiredData) {
        console.log('✅ Usuario tiene perfil completo, ir a home');
        setUserProfile(profile);
        setShowCompleteProfile(false); // Asegurar que el modal esté cerrado
        setCurrentScreen('home');
        
        // Registrar push notifications después de login exitoso
        PushNotificationService.registerForPushNotificationsAsync();
        
        // Configurar recordatorios locales de Chapi
        NotificationReminderService.setupReminders();
      } else {
        console.log('⚠️ Usuario necesita completar perfil');
        setUserProfile(profile);
        setShowCompleteProfile(true);
        setCurrentScreen('home'); // Ir a home pero mostrar modal
      }
    } catch (error: any) {
      console.log('❌ Error obteniendo perfil:', error.response?.status);
      if (error.response?.status === 404) {
        // No tiene perfil, mostrar modal para completar
        console.log('Usuario no tiene perfil, mostrar modal');
        setShowCompleteProfile(true);
        setCurrentScreen('home');
      } else {
        // Otro error, ir directamente a home sin modal
        console.log('Error desconocido, ir a home sin modal');
        setShowCompleteProfile(false);
        setCurrentScreen('home');
      }
    }
  };



  const handleCompleteProfile = async (profileData: any) => {
    try {
      console.log('✅ Perfil completado exitosamente:', profileData);
      const profileWithOnboarding = { ...profileData, onboardingCompleted: false };
      setUserProfile(profileWithOnboarding);
      
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileWithOnboarding));
      console.log('💾 Perfil guardado localmente');
      
      setShowCompleteProfile(false);
      console.log('🔒 Modal cerrado después de completar perfil');
      
      // NO incrementar refreshKey aquí — evita desmontar HomeScreen
      // cuando el tour está a punto de activarse
    } catch (error) {
      console.log('❌ Error completando perfil:', error);
    }
  };

  const handleRegisterSuccess = async (message?: string, email?: string) => {
    // Después del registro exitoso, ir al login con mensaje de verificación y email
    setVerificationMessage(message);
    setRegisteredEmail(email);
    setCurrentScreen('login');
  };

  const handleShowRegister = () => {
    setCurrentScreen('register');
  };

  const handleBackToLogin = () => {
    setVerificationMessage(undefined); // Limpiar mensaje al volver al login manualmente
    setRegisteredEmail(undefined); // Limpiar email también
    setCurrentScreen('login');
  };

  const handleLogout = async () => {
    try {
      // Eliminar push token del backend antes de limpiar sesión
      await PushNotificationService.unregisterPushToken();
      
      await AsyncStorage.multiRemove(['authToken', 'userData', 'userProfile']);
      setCurrentScreen('login');
      setShowCompleteProfile(false);
      setUserProfile(null);
      setVerificationMessage(undefined);
      setRegisteredEmail(undefined);
    } catch (error) {
      console.log('Error during logout:', error);
    }
  };

  // Registrar callback para manejar 401 (token inválido/expirado)
  React.useEffect(() => {
    setUnauthorizedCallback(() => {
      console.log('🔒 Sesión expirada - Redirigiendo al login');
      handleLogout();
    });
  }, []);

  if (currentScreen === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (currentScreen === 'login') {
    return (
      <>
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          onShowRegister={handleShowRegister}
          verificationMessage={verificationMessage}
          initialEmail={registeredEmail}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (currentScreen === 'register') {
    return (
      <>
        <RegisterScreen 
          onRegisterSuccess={handleRegisterSuccess}
          onBackToLogin={handleBackToLogin}
        />
        <StatusBar style="dark" />
      </>
    );
  }



  // App principal con navegación manual
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <PlanProvider>
          <TourGuideProvider
            borderRadius={8}
            backdropColor="rgba(0,0,0,0.7)"
            tooltipComponent={CustomTooltip}
          >
            <MainApp onLogout={handleLogout} refreshKey={refreshKey} tourProfile={userProfile} />
          </TourGuideProvider>
          <CompleteProfileModal
            visible={showCompleteProfile}
            onComplete={handleCompleteProfile}
            onLogout={handleLogout}
          />
        </PlanProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  content: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  activeTabIconContainer: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabIcon: {
    fontSize: 20,
  },
  activeTabIcon: {
    fontSize: 22,
  },
  tabText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});