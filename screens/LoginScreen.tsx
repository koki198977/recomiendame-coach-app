import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useSSO, useUser } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { AuthService } from '../services/authService';
import { Logo } from '../components/Logo';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';

export const useWarmUpBrowser = () => {
  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onShowRegister: () => void;
  verificationMessage?: string;
  initialEmail?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onShowRegister,
  verificationMessage,
  initialEmail,
}) => {
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(!!verificationMessage);
  const [isResending, setIsResending] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);

  // Estados de foco para inputs
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Estados de Biometría
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  useWarmUpBrowser();

  const { getToken, isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const { user } = useUser();

  React.useEffect(() => {
    checkBiometricSupportAndAutoLogin();
  }, []);

  const checkBiometricSupportAndAutoLogin = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const supported = compatible && enrolled;
      setIsBiometricSupported(supported);

      if (supported) {
        const isBiometricEnabled = await AsyncStorage.getItem('biometricEnabled');
        if (isBiometricEnabled === 'true') {
          handleBiometricLogin();
        }
      }
    } catch (error) {
      console.log('Error checking biometrics:', error);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Inicia sesión con Biometría',
        fallbackLabel: 'Usar contraseña',
      });

      if (result.success) {
        const savedEmail = await SecureStore.getItemAsync('savedEmail');
        const savedPassword = await SecureStore.getItemAsync('savedPassword');
        
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setIsLoading(true);
          try {
            await AuthService.login({ email: savedEmail, password: savedPassword });
            onLoginSuccess();
          } catch (error: any) {
            Alert.alert('Error', 'No se pudo iniciar sesión. Por favor ingresa tu contraseña manualmente.');
            setIsLoading(false);
          }
        }
      }
    } catch (error) {
      console.log('Biometric login error:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    console.log('🔐 Intentando login con:', email);
    setIsLoading(true);
    try {
      await AuthService.login({ email, password });
      
      // Guardar credenciales para futuro inicio de sesión biométrico
      await SecureStore.setItemAsync('savedEmail', email);
      await SecureStore.setItemAsync('savedPassword', password);

      const promptSeen = await AsyncStorage.getItem('biometricPromptSeen');
      const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');

      if (isBiometricSupported && biometricEnabled !== 'true' && promptSeen !== 'true') {
        setShowBiometricModal(true);
      } else {
        onLoginSuccess();
      }
    } catch (error: any) {
      console.log('Login error:', error);

      let errorMessage = 'Error al iniciar sesión. Verifica tus credenciales.';
      if (error.response?.status === 401) {
        errorMessage = 'Email o contraseña incorrectos.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Tu cuenta no ha sido verificada. Por favor revisa tu correo electrónico.';
      } else if (error.response?.status === 404) {
        errorMessage = 'No existe una cuenta con este correo electrónico.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableBiometrics = async () => {
    await AsyncStorage.setItem('biometricPromptSeen', 'true');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirma para activar Biometría',
      });
      if (result.success) {
        await AsyncStorage.setItem('biometricEnabled', 'true');
        Alert.alert('¡Activado!', 'Biometría activada con éxito.');
        setShowBiometricModal(false);
        onLoginSuccess();
      } else {
        setShowBiometricModal(false);
        onLoginSuccess();
      }
    } catch (error) {
      setShowBiometricModal(false);
      onLoginSuccess();
    }
  };

  const handleSkipBiometrics = async () => {
    await AsyncStorage.setItem('biometricPromptSeen', 'true');
    setShowBiometricModal(false);
    onLoginSuccess();
  };

  const handleResendVerification = async () => {
    if (!email) {
      Alert.alert('Email requerido', 'Por favor ingresa tu email para reenviar la verificación.');
      return;
    }

    setIsResending(true);
    try {
      await AuthService.resendVerification(email);
      
      Alert.alert(
        'Correo reenviado ✅',
        'Se ha enviado un nuevo correo de verificación a tu email. Por favor revisa tu bandeja de entrada y spam.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.log('Resend verification error:', error);
      
      let errorMessage = 'No se pudo reenviar el correo de verificación. Intenta de nuevo.';
      
      if (error.response?.status === 404) {
        errorMessage = 'No existe una cuenta con este correo electrónico.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Has solicitado demasiados correos. Espera unos minutos antes de intentar de nuevo.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email requerido', 'Por favor ingresa tu email para restablecer tu contraseña.');
      return;
    }

    setIsRequestingReset(true);
    try {
      await AuthService.requestPasswordReset(email);
      
      Alert.alert(
        'Correo enviado ✅',
        'Se ha enviado un enlace para restablecer tu contraseña a tu email. Por favor revisa tu bandeja de entrada y spam.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.log('Password reset request error:', error);
      
      let errorMessage = 'No se pudo enviar el correo de restablecimiento. Intenta de nuevo.';
      
      if (error.response?.status === 404) {
        errorMessage = 'No existe una cuenta con este correo electrónico.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Has solicitado demasiados correos. Espera unos minutos antes de intentar de nuevo.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsRequestingReset(false);
    }
  };

  const handleSocialLogin = async (provider: 'oauth_google' | 'oauth_apple') => {
    try {
      if (isSignedIn) {
        console.log('ℹ️ Usuario ya autenticado en Clerk, esperando sincronización...');
        return;
      }
      console.log(` iniciando flujo SSO para ${provider}...`);
      
      const redirectUrl = Linking.createURL('oauth-native-callback');
      
      console.log('Redirect URL configurada:', redirectUrl);

      const { createdSessionId, setActive: setSSOActive } = await startSSOFlow({
        strategy: provider,
        redirectUrl,
      });

      console.log('Resultado startSSOFlow:', { createdSessionId, hasSetActive: !!setSSOActive });

      if (createdSessionId && setSSOActive) {
        console.log('✅ Sesión creada en Clerk, activando...');
        await setSSOActive({ session: createdSessionId });
      } else {
        console.log('⚠️ No se creó Session ID o no hay setActive');
      }
    } catch (err: any) {
      console.error('❌ Error SSO Detallado:', err);
      if (err.cancelled || err.code === 'session_exists') {
        console.log('SSO cancelado o sesión ya existe');
        return;
      }
      
      const providerName = provider === 'oauth_google' ? 'Google' : 'Apple';
      Alert.alert(
        'Error de Autenticación', 
        `No se pudo completar el inicio de sesión con ${providerName}. \n\n${err.message || 'Error desconocido'}`
      );
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background soft clean gradient */}
      <LinearGradient
        colors={['#EBF1EE', '#F2F6F4', '#FAFAF6']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative Circles */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

      {/* Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoGlow} />
            <View style={styles.logoWrapper}>
              <Logo size="large" showText={false} variant="vertical" />
            </View>
          </View>
          <Text style={styles.brandName}>Recomiéndame Coach</Text>
          <Text style={styles.welcomeText}>Bienvenido de vuelta</Text>
          <Text style={styles.subtitleText}>Tu salud, nuestra prioridad</Text>
        </View>

        {/* Verification Message */}
        {showVerificationMessage && verificationMessage && (
          <View style={styles.verificationMessageContainer}>
            <View style={styles.verificationMessage}>
              <Text style={styles.verificationIcon}>📧</Text>
              <View style={styles.verificationContent}>
                <Text style={styles.verificationText}>{verificationMessage}</Text>
                <TouchableOpacity 
                  style={[styles.resendButton, isResending && styles.resendButtonDisabled]}
                  onPress={handleResendVerification}
                  disabled={isResending}
                >
                  <Text style={[styles.resendButtonText, isResending && styles.resendButtonTextDisabled]}>
                    {isResending ? 'Enviando...' : 'Reenviar correo de verificación'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={styles.closeMessageButton}
                onPress={() => setShowVerificationMessage(false)}
              >
                <Text style={styles.closeMessageText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!showEmailForm ? (
          <>
            <View style={styles.socialButtonsContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  styles.socialButtonVertical,
                  pressed && styles.buttonPressed
                ]}
                onPress={() => handleSocialLogin('oauth_google')}
              >
                <FontAwesome5 name="google" size={20} color="#DB4437" style={styles.socialIcon} />
                <Text style={styles.socialButtonText}>Continuar con Google</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  styles.socialButtonVertical,
                  pressed && styles.buttonPressed
                ]}
                onPress={() => setShowEmailForm(true)}
              >
                <MaterialCommunityIcons name="email-outline" size={22} color={COLORS.text} style={styles.socialIcon} />
                <Text style={styles.socialButtonText}>Continuar con email/username</Text>
              </Pressable>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Side by side buttons */}
            <View style={styles.horizontalSocialContainer}>
              {Platform.OS === 'ios' && (
                <Pressable
                  style={({ pressed }) => [
                    styles.socialButton,
                    styles.socialButtonHorizontal,
                    styles.appleButton,
                    pressed && styles.buttonPressed
                  ]}
                  onPress={() => handleSocialLogin('oauth_apple')}
                >
                  <FontAwesome5 name="apple" size={20} color="#FFFFFF" style={styles.socialIconHorizontal} />
                  <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                    Apple
                  </Text>
                </Pressable>
              )}
              
              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  styles.socialButtonHorizontal,
                  styles.facebookButton,
                  pressed && styles.buttonPressed,
                  Platform.OS !== 'ios' && { width: '100%' }
                ]}
                onPress={() => {
                  Alert.alert("Próximamente", "Inicio de sesión con Facebook estará disponible pronto.");
                }}
              >
                <FontAwesome5 name="facebook" size={20} color="#1877F2" style={styles.socialIconHorizontal} />
                <Text style={[styles.socialButtonText, styles.facebookButtonText]}>
                  Facebook
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => setShowEmailForm(false)} style={styles.backButton}>
               <Text style={styles.backButtonText}>← Volver a opciones</Text>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isEmailFocused && styles.inputLabelFocused]}>
                Email
              </Text>
              <TextInput
                style={[styles.input, isEmailFocused && styles.inputFocused]}
                placeholder="tu@email.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => {
                  setIsEmailFocused(true);
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 180, animated: true });
                  }, 100);
                }}
                onBlur={() => setIsEmailFocused(false)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isPasswordFocused && styles.inputLabelFocused]}>
                Contraseña
              </Text>
              <TextInput
                style={[styles.input, isPasswordFocused && styles.inputFocused]}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => {
                  setIsPasswordFocused(true);
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 260, animated: true });
                  }, 100);
                }}
                onBlur={() => setIsPasswordFocused(false)}
              />
            </View>

            {/* Interactive Login Button */}
            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.buttonPressed,
                isLoading && styles.loginButtonDisabled
              ]}
            >
              <LinearGradient
                colors={isLoading ? ['#D1D5DB', '#9CA3AF'] : ['#74B796', '#5FA381']}
                style={styles.loginButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                )}
              </LinearGradient>
            </Pressable>

            <TouchableOpacity 
              style={[styles.forgotPassword, isRequestingReset && styles.forgotPasswordDisabled]}
              onPress={handleForgotPassword}
              disabled={isRequestingReset}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotPasswordText, isRequestingReset && styles.forgotPasswordTextDisabled]}>
                {isRequestingReset ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Navigation Link */}
        <View style={styles.bottomSection}>
          <Text style={styles.signupText}>¿No tienes cuenta?</Text>
          <TouchableOpacity 
            style={styles.signupButton} 
            onPress={onShowRegister}
            activeOpacity={0.8}
          >
            <Text style={styles.signupButtonText}>Regístrate gratis</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Biometric Prompt Modal */}
      <Modal
        visible={showBiometricModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Activar Biometría?</Text>
            <Text style={styles.modalText}>Activa Face ID o Huella Digital para iniciar sesión más rápido la próxima vez.</Text>
            
            <TouchableOpacity 
              style={styles.modalButtonPrimary}
              onPress={handleEnableBiometrics}
            >
              <Text style={styles.modalButtonPrimaryText}>Sí, activar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalButtonSecondary}
              onPress={handleSkipBiometrics}
            >
              <Text style={styles.modalButtonSecondaryText}>No por ahora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(116, 183, 150, 0.12)',
    top: -50,
    right: -50,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(116, 183, 150, 0.08)',
    bottom: 120,
    left: -30,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(116, 183, 150, 0.05)',
    top: height * 0.35,
    right: -20,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 60,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  logoGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    backgroundColor: COLORS.primary,
    borderRadius: 36,
    opacity: 0.15,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },
  logoWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    ...SHADOWS.card,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Form card styling
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginVertical: 16,
    ...SHADOWS.card,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputLabelFocused: {
    color: COLORS.primary,
  },
  input: {
    backgroundColor: '#F3F5F4',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFFFFF',
  },
  loginButton: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordDisabled: {
    opacity: 0.6,
  },
  forgotPasswordText: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '600',
  },
  forgotPasswordTextDisabled: {
    color: '#9CA3AF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(44, 62, 54, 0.12)',
  },
  dividerText: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '500',
    marginHorizontal: 12,
  },
  socialButtonsContainer: {
    width: '100%',
  },
  socialButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.card,
    shadowOpacity: 0.03,
  },
  socialButtonVertical: {
    justifyContent: 'center',
  },
  socialIcon: {
    position: 'absolute',
    left: 20,
  },
  socialIconHorizontal: {
    marginRight: 10,
  },
  horizontalSocialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  socialButtonHorizontal: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  socialButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  appleButtonText: {
    color: '#FFFFFF',
  },
  facebookButton: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.border,
  },
  facebookButtonText: {
    color: COLORS.text,
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  signupText: {
    color: COLORS.textLight,
    fontSize: 14,
    marginBottom: 10,
  },
  signupButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  signupButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  verificationMessageContainer: {
    marginBottom: 12,
  },
  verificationMessage: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...SHADOWS.card,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  verificationIcon: {
    fontSize: 20,
    marginRight: 10,
    marginTop: 2,
  },
  verificationContent: {
    flex: 1,
  },
  verificationText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 6,
  },
  resendButton: {
    alignSelf: 'flex-start',
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  resendButtonTextDisabled: {
    color: '#9CA3AF',
  },
  closeMessageButton: {
    padding: 4,
    marginLeft: 6,
  },
  closeMessageText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  modalText: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSecondary: {
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});