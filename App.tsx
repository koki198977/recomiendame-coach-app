import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PlanScreenWithTabs } from './screens/PlanScreenWithTabs';
import { ProgressScreen } from './screens/ProgressScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SocialScreen } from './screens/SocialScreen';
import { Logo } from './components/Logo';
import { CompleteProfileModal } from './components/CompleteProfileModal';
import { ChapiBubble } from './components/ChapiBubble';
import { ChapiChatModal } from './components/ChapiChatModal';
import { NutritionService } from './services/nutritionService';
import { UserProfile } from './types/nutrition';

// Componente principal con tabs manuales
const MainApp: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [planInitialTab, setPlanInitialTab] = useState<'nutrition' | 'workouts'>('nutrition');
  const [chapiModalVisible, setChapiModalVisible] = useState(false);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigateToWorkout={() => {
          setPlanInitialTab('workouts');
          setActiveTab('plan');
        }} />;
      case 'plan':
        return <PlanScreenWithTabs initialTab={planInitialTab} />;
      case 'social':
        return <SocialScreen />;
      case 'progress':
        return <ProgressScreen />;
      case 'profile':
        return <ProfileScreen onLogout={onLogout} />;
      default:
        return <HomeScreen onNavigateToWorkout={() => {
          setPlanInitialTab('workouts');
          setActiveTab('plan');
        }} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Modern Bottom Tabs */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('home')}
          >
            <View style={[styles.tabIconContainer, activeTab === 'home' && styles.activeTabIconContainer]}>
              <Text style={[styles.tabIcon, activeTab === 'home' && styles.activeTabIcon]}>🏠</Text>
            </View>
            <Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>
              Inicio
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('plan')}
          >
            <View style={[styles.tabIconContainer, activeTab === 'plan' && styles.activeTabIconContainer]}>
              <Text style={[styles.tabIcon, activeTab === 'plan' && styles.activeTabIcon]}>🍎</Text>
            </View>
            <Text style={[styles.tabText, activeTab === 'plan' && styles.activeTabText]}>
              Mi Programa
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('social')}
          >
            <View style={[styles.tabIconContainer, activeTab === 'social' && styles.activeTabIconContainer]}>
              <Text style={[styles.tabIcon, activeTab === 'social' && styles.activeTabIcon]}>👥</Text>
            </View>
            <Text style={[styles.tabText, activeTab === 'social' && styles.activeTabText]}>
              Social
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('progress')}
          >
            <View style={[styles.tabIconContainer, activeTab === 'progress' && styles.activeTabIconContainer]}>
              <Text style={[styles.tabIcon, activeTab === 'progress' && styles.activeTabIcon]}>📊</Text>
            </View>
            <Text style={[styles.tabText, activeTab === 'progress' && styles.activeTabText]}>
              Progreso
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('profile')}
          >
            <View style={[styles.tabIconContainer, activeTab === 'profile' && styles.activeTabIconContainer]}>
              <Text style={[styles.tabIcon, activeTab === 'profile' && styles.activeTabIcon]}>👤</Text>
            </View>
            <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
              Perfil
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chapi - Asistente Virtual */}
      <ChapiBubble onPress={() => setChapiModalVisible(true)} />
      <ChapiChatModal
        visible={chapiModalVisible}
        onClose={() => setChapiModalVisible(false)}
      />

      <StatusBar style="dark" />
    </View>
  );
};

// App sin React Navigation para evitar el error
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | undefined>(undefined);

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

  const handleOnboardingComplete = () => {
    setCurrentScreen('home');
  };

  const handleCompleteProfile = async (profileData: any) => {
    try {
      console.log('✅ Perfil completado exitosamente:', profileData);
      // Los datos ya fueron guardados en la API por el modal
      setUserProfile(profileData);
      
      // Guardar también localmente para evitar mostrar el modal de nuevo
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileData));
      console.log('💾 Perfil guardado localmente');
      
      setShowCompleteProfile(false);
      console.log('🔒 Modal cerrado después de completar perfil');
    } catch (error) {
      console.log('❌ Error completando perfil:', error);
    }
  };

  const handleSkipProfile = () => {
    console.log('⏭️ Usuario omitió completar perfil');
    setShowCompleteProfile(false);
    console.log('🔒 Modal cerrado después de omitir perfil');
  };

  const handleRegisterSuccess = async (message?: string) => {
    // Después del registro exitoso, ir al login con mensaje de verificación
    setVerificationMessage(message);
    setCurrentScreen('login');
  };

  const handleShowRegister = () => {
    setCurrentScreen('register');
  };

  const handleBackToLogin = () => {
    setVerificationMessage(undefined); // Limpiar mensaje al volver al login manualmente
    setCurrentScreen('login');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userData', 'onboardingCompleted', 'userProfile']);
      setCurrentScreen('login');
      setShowCompleteProfile(false);
      setUserProfile(null);
    } catch (error) {
      console.log('Error during logout:', error);
    }
  };

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

  if (currentScreen === 'onboarding') {
    return (
      <>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style="dark" />
      </>
    );
  }

  // App principal con navegación manual
  return (
    <>
      <MainApp onLogout={handleLogout} />
      <CompleteProfileModal
        visible={showCompleteProfile}
        onComplete={handleCompleteProfile}
        onSkip={handleSkipProfile}
      />
    </>
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
    paddingBottom: 20,
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