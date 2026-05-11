import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ClerkProvider, useAuth, useSession, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, Text, TouchableOpacity, Alert, Animated, LayoutChangeEvent, DeviceEventEmitter } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
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
import { AuthService } from './services/authService';
import { PushNotificationService } from './services/pushNotificationService';
import { NotificationReminderService } from './services/notificationReminderService';
import { useTour } from './hooks/useTour';
import { PlanProvider, usePlan } from './hooks/usePlan';
import { PaywallModal } from './components/PaywallModal';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error(
    'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY no está definida. ' +
    'Agrega esta variable a tu archivo .env'
  );
}

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

// Tabs con flex fijo — la pill se superpone sin mover nada
const TABS = [
  { key: 'home',     label: 'Inicio',   icon: '🏠' },
  { key: 'plan',     label: 'Plan',     icon: '🍎' },
  { key: 'social',   label: 'Social',   icon: '👥' },
  { key: 'progress', label: 'Progreso', icon: '📊' },
  { key: 'profile',  label: 'Perfil',   icon: '👤' },
];

// Tab bar animado con pill deslizante
// Ancho de pill por label (ícono 18px + gap 5px + texto + padding 20px)
const PILL_WIDTHS: Record<string, number> = {
  home:     105,
  plan:      90,
  social:   105,
  progress: 118,
  profile:   98,
};

const AnimatedTabBar: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  onHeightChange?: (h: number) => void;
  tourZones?: Record<string, React.ReactNode>;
}> = ({ activeTab, onTabChange, onHeightChange, tourZones }) => {
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const tabBarRef = useRef<View>(null);
  const tabRefs = useRef<Record<string, View | null>>({});
  const [ready, setReady] = useState(false);
  const measuredCount = useRef(0);

  // Centra la pill dentro del tab medido
  const calcPill = (tabX: number, tabWidth: number, key: string) => {
    const pw = PILL_WIDTHS[key] ?? 105;
    const px = tabX + (tabWidth - pw) / 2;
    return { px, pw };
  };

  const tryInit = useCallback(() => {
    const bar = tabBarRef.current;
    if (!bar) return;
    let done = 0;
    const results: Record<string, { x: number; width: number }> = {};
    TABS.forEach(tab => {
      const node = tabRefs.current[tab.key];
      if (!node) return;
      node.measureLayout(bar as any, (x, _y, width) => {
        results[tab.key] = { x, width };
        done++;
        if (done === TABS.length) {
          const t = results[activeTab];
          if (t) {
            const { px, pw } = calcPill(t.x, t.width, activeTab);
            pillX.setValue(px);
            pillW.setValue(pw);
            setReady(true);
          }
        }
      }, () => {});
    });
  }, [activeTab, pillX, pillW]);

  const animateTo = useCallback((key: string) => {
    const bar = tabBarRef.current;
    const node = tabRefs.current[key];
    if (!bar || !node) return;
    node.measureLayout(bar as any, (x, _y, width) => {
      const { px, pw } = calcPill(x, width, key);
      Animated.parallel([
        Animated.spring(pillX, { toValue: px, useNativeDriver: false, tension: 70, friction: 12 }),
        Animated.spring(pillW, { toValue: pw, useNativeDriver: false, tension: 70, friction: 12 }),
      ]).start();
    }, () => {});
  }, [pillX, pillW]);

  const handlePress = (key: string) => {
    onTabChange(key);
    setTimeout(() => animateTo(key), 20);
  };

  return (
    <SafeAreaView
      style={styles.tabBarContainer}
      edges={['bottom']}
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
    >
      <View ref={tabBarRef} style={styles.tabBar}>
        {ready && (
          <Animated.View style={[styles.pill, { left: pillX, width: pillW }]} />
        )}
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const button = (
            <TouchableOpacity
              ref={(r) => {
                tabRefs.current[tab.key] = r as View | null;
                if (!ready) {
                  measuredCount.current++;
                  if (measuredCount.current >= TABS.length) tryInit();
                }
              }}
              style={styles.tab}
              onPress={() => handlePress(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              {isActive && (
                <Text style={styles.activeTabLabel} numberOfLines={1}>
                  {tab.label}
                </Text>
              )}
            </TouchableOpacity>
          );

          const zone = tourZones?.[tab.key];
          if (zone) {
            return React.cloneElement(zone as React.ReactElement<any>, { key: tab.key }, button);
          }
          return <React.Fragment key={tab.key}>{button}</React.Fragment>;
        })}
      </View>
    </SafeAreaView>
  );
};

// Componente principal con tabs manuales
const MainApp: React.FC<{ onLogout: () => void; refreshKey: number; userProfile: any; tourProfile: { onboardingCompleted?: boolean } | null }> = ({ onLogout, refreshKey, userProfile, tourProfile }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [planInitialTab, setPlanInitialTab] = useState<'nutrition' | 'workouts'>('nutrition');
  const [chapiModalVisible, setChapiModalVisible] = useState(false);
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  const [hasForcedTour, setHasForcedTour] = useState(false);
  const [tabBarHeight, setTabBarHeight] = useState(90);

  const { isTourActive, currentStep, nextStep, skipTour, initTour } = useTour(activeTab);

  useEffect(() => {
    if (!hasForcedTour) {
      console.log('🎯 Evaluando lanzar tour de onboarding al montar MainApp');
      initTour({ onboardingCompleted: tourProfile?.onboardingCompleted ?? false });
      setHasForcedTour(true);
    }
  }, [hasForcedTour, initTour, tourProfile]);

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
        }} isTourActive={isTourActive} currentStep={currentStep} nextStep={nextStep} skipTour={skipTour} userProfile={userProfile} />;
      case 'plan':
        return <PlanScreenWithTabs initialTab={planInitialTab} isTourActive={isTourActive} currentStep={currentStep} nextStep={nextStep} skipTour={skipTour} />;
      case 'social':
        return <SocialScreen />;
      case 'progress':
        return <ProgressScreen key={progressRefreshKey} />;
      case 'profile':
        return <ProfileScreen onLogout={onLogout} userProfile={userProfile} />;
      default:
        return <HomeScreen key={refreshKey} onNavigateToWorkout={() => {
          setPlanInitialTab('workouts');
          handleTabChange('plan');
        }} isTourActive={isTourActive} currentStep={currentStep} nextStep={nextStep} skipTour={skipTour} />;
    }
  };

  // TourGuideZones para los tabs que lo necesitan
  const tourZones: Record<string, React.ReactNode> = {
    plan: (
      <TourGuideZone zone={7} text="Aquí encontrarás tu plan nutricional y tu rutina de ejercicios personalizados, generados con IA para ti. 🍎💪" style={{ flex: 1 }} borderRadius={12}>
        {null}
      </TourGuideZone>
    ),
    social: (
      <TourGuideZone zone={8} text="Comparte tu progreso, descubre historias inspiradoras y apóyate en personas con objetivos similares a los tuyos. 👥" style={{ flex: 1 }} borderRadius={12}>
        {null}
      </TourGuideZone>
    ),
    progress: (
      <TourGuideZone zone={9} text="Revisa tu historial, tendencias de peso y evolución a lo largo del tiempo. ¡Celebra cada logro! 📊" style={{ flex: 1 }} borderRadius={12}>
        {null}
      </TourGuideZone>
    ),
    profile: (
      <TourGuideZone zone={10} text="Ajusta tus datos, metas, restricciones alimenticias y preferencias en cualquier momento. 👤" style={{ flex: 1 }} borderRadius={12}>
        {null}
      </TourGuideZone>
    ),
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Animated Pill Tab Bar */}
      <AnimatedTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onHeightChange={setTabBarHeight}
        tourZones={tourZones}
      />

      {/* Chapi - Asistente Virtual */}
      <ChapiBubble onPress={() => setChapiModalVisible(true)} tabBarHeight={tabBarHeight} />
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
function AppContent() {
  const { getToken, isSignedIn, signOut } = useAuth();
  const { isLoaded: isSessionLoaded } = useSession();
  const { user, isLoaded: isUserLoaded } = useUser();

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

  // Timeout de seguridad: si Clerk no carga en 10s, mostrar login de todas formas
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (currentScreen === 'loading') {
        console.log('⚠️ Clerk timeout (10s) — mostrando login por seguridad');
        setCurrentScreen('login');
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [currentScreen]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Wait for Clerk session to be loaded
        if (!isSessionLoaded) return;

        const token = await AsyncStorage.getItem('authToken');

        if (token) {
          // Case 1: Backend JWT exists → go to home (existing behavior)
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
          return;
        } else if (isSignedIn) {
          // Si estamos firmados pero Clerk aún no carga el objeto User, esperamos
          if (!isUserLoaded) {
            console.log('⏳ Sesión de Clerk detectada, esperando a que carguen los datos del usuario...');
            return;
          }

          // Case 2: No Backend JWT but Clerk has active session → exchange for Backend JWT
          console.log('🔄 Sesión de Clerk detectada sin token local. Intercambiando...');
          try {
            // Reintentar obtener token si falla la primera vez (race condition)
            let clerkToken = await getToken();
            if (!clerkToken) {
              console.log('⏳ Token de Clerk no disponible aún, reintentando en 1s...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              clerkToken = await getToken();
            }

            if (clerkToken) {
              const clerkUserData: any = {};
              if (user?.primaryEmailAddress?.emailAddress) clerkUserData.email = user.primaryEmailAddress.emailAddress;
              if (user?.firstName) clerkUserData.firstName = user.firstName;
              if (user?.lastName) clerkUserData.lastName = user.lastName;

              await AuthService.loginWithClerkToken(clerkToken, clerkUserData);
              await handleLoginSuccess();
              return;
            } else {
              console.log('❌ No se pudo obtener token de Clerk después de reintentar');
            }
          } catch (error) {
            console.log('Error exchanging Clerk token:', error);
          }
          setCurrentScreen('login');
        } else {
          // Case 3: No session at all → show login
          console.log('ℹ️ No hay sesión activa, mostrando login');
          setCurrentScreen('login');
        }
      } catch (error) {
        console.log('Error checking status:', error);
        setCurrentScreen('login');
      }
    };

    checkStatus();
  }, [isSessionLoaded, isSignedIn, isUserLoaded]);

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
      
      // Usar AuthService.logout con clerkSignOut para limpieza resiliente
      await AuthService.logout(signOut);
      
      setCurrentScreen('login');
      setShowCompleteProfile(false);
      setUserProfile(null);
      setVerificationMessage(undefined);
      setRegisteredEmail(undefined);
    } catch (error) {
      console.log('Error during logout:', error);
      // Incluso si hay error, limpiar el estado de la UI
      setCurrentScreen('login');
      setShowCompleteProfile(false);
      setUserProfile(null);
    }
  };

  // Manejar deep links de pago (coachapp://subscription/success|failure|pending)
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (url.includes('subscription/success')) {
        Alert.alert('¡Suscripción activada! 🎉', 'Tu plan PRO ya está activo. ¡Disfrútalo!');
        setRefreshKey(prev => prev + 1);
      } else if (url.includes('subscription/failure')) {
        Alert.alert(
          'Pago no completado',
          'El pago no pudo ser procesado. Puedes intentar de nuevo desde tu perfil.',
          [{ text: 'Entendido' }]
        );
      } else if (url.includes('subscription/pending')) {
        Alert.alert(
          'Pago pendiente ⏳',
          'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
          [{ text: 'Entendido' }]
        );
        setRefreshKey(prev => prev + 1);
      }
    };

    // URL inicial si la app fue abierta desde el deep link
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url);
    });

    // Escuchar deep links mientras la app está abierta
    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => subscription.remove();
  }, []);

  // Registrar callback para manejar 401 (token inválido/expirado)
  React.useEffect(() => {
    setUnauthorizedCallback(() => {
      handleLogout();
    });
  }, []);

  // Configurar listeners de Notificaciones Push
  React.useEffect(() => {
    const cleanup = PushNotificationService.setupNotificationListeners(
      (notification) => {
        // Notificación recibida en primer plano
        const data = notification.request.content.data;
        console.log('📬 Notificación Push recibida (foreground):', data);
        
        if (data?.type === 'PLAN_READY' || data?.type === 'WORKOUT_READY' || data?.type === 'WORKOUT_PLAN_READY' || data?.planId) {
          const isWorkout = data?.type === 'WORKOUT_READY' || data?.type === 'WORKOUT_PLAN_READY' || (data?.body && data.body.toLowerCase().includes('rutina'));
          console.log(`🚀 Notificación de ${isWorkout ? 'Rutina' : 'Plan'} detectada`);
          
          DeviceEventEmitter.emit('planReady', data);
          
          Alert.alert(
            isWorkout ? '¡Rutina lista! 💪' : '¡Plan listo! 🎉', 
            isWorkout 
              ? 'Chapi ha terminado de generar tu rutina personalizada. Se ha actualizado automáticamente.'
              : 'Chapi ha terminado de generar tu plan nutricional. Se ha actualizado automáticamente.',
            [{ text: '¡Genial!' }]
          );
        }
      },
      (response) => {
        // Notificación tocada por el usuario (app abierta desde la notificación)
        const data = response.notification.request.content.data;
        console.log('👆 Notificación Push tocada:', data);
        
        if (data?.type === 'PLAN_READY' || data?.type === 'WORKOUT_READY' || data?.type === 'WORKOUT_PLAN_READY') {
          // Esperar un momento a que la app cargue el home si estaba cerrada
          setTimeout(() => {
            DeviceEventEmitter.emit('planReady', data);
          }, 1000);
        }
      }
    );
    return () => cleanup();
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
            <MainApp onLogout={handleLogout} refreshKey={refreshKey} userProfile={userProfile} tourProfile={userProfile} />
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

export default function App() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AppContent />
    </ClerkProvider>
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
    paddingBottom: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    height: 44,
    backgroundColor: '#4CAF50',
    borderRadius: 22,
    top: 6,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: 2,
    zIndex: 1,
  },
  activeTab: {},
  tabIcon: {
    fontSize: 18,
  },
  activeTabIcon: {
    fontSize: 18,
  },
  activeTabLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    marginLeft: 5,
  },
  // Legacy styles kept to avoid TS errors
  tabIconContainer: {},
  activeTabIconContainer: {},
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