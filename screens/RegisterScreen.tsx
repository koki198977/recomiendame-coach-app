import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from '../components/Logo';
import { useSignUp, useAuth, useSSO, useUser } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { AuthService } from '../services/authService';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';

const useWarmUpBrowser = () => {
  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

interface RegisterScreenProps {
  onRegisterSuccess: (message?: string, email?: string) => void;
  onBackToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onRegisterSuccess,
  onBackToLogin,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const { signUp, setActive, isLoaded } = useSignUp();
  const { getToken, isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Estados de foco para inputs
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  useWarmUpBrowser();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return false;
    }

    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return false;
    }

    if (!formData.password) {
      Alert.alert('Error', 'Por favor ingresa una contraseña');
      return false;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    console.log('🚀 Intento de registro iniciado...');
    
    if (!validateForm()) {
      console.log('❌ Validación de formulario fallida');
      return;
    }

    setLoading(true);
    let clerkSuccess = false;
    let backendSuccess = false;

    try {
      if (isLoaded) {
        console.log('📝 Registrando en Clerk...');
        try {
          await signUp.create({
            emailAddress: formData.email.trim().toLowerCase(),
            password: formData.password,
          });
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          clerkSuccess = true;
          console.log('✅ Registro en Clerk exitoso (esperando verificación)');
        } catch (clerkErr: any) {
          console.error('❌ Error en Clerk:', clerkErr);
          if (clerkErr.errors?.[0]?.code === 'form_identifier_exists') {
            clerkSuccess = true; 
          } else {
            throw clerkErr;
          }
        }
      } else {
        console.log('⚠️ Clerk no está listo, saltando registro en Clerk');
      }

      console.log('📝 Registrando en el Backend...');
      try {
        await AuthService.register({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        });
        backendSuccess = true;
        console.log('✅ Registro en Backend exitoso');
      } catch (backErr: any) {
        console.error('❌ Error en Backend:', backErr);
        if (backErr.response?.status === 409 || backErr.response?.status === 400) {
          backendSuccess = true;
        } else {
          throw backErr;
        }
      }

      if (clerkSuccess || backendSuccess) {
        Alert.alert(
          '¡Cuenta creada! 🎉',
          clerkSuccess 
            ? 'Hemos enviado un correo de verificación a tu email. Por favor revísalo antes de iniciar sesión.'
            : 'Tu cuenta ha sido creada exitosamente en nuestro sistema. Ya puedes iniciar sesión.',
          [
            {
              text: 'Ir a iniciar sesión',
              onPress: () => onRegisterSuccess(undefined, formData.email),
            },
          ]
        );
      }
    } catch (error: any) {
      console.log('Registration error final:', error);
      let errorMessage = 'Error al crear la cuenta. Intenta de nuevo.';
      
      const clerkErrorCode = error.errors?.[0]?.code;
      if (clerkErrorCode === 'form_identifier_exists') {
        errorMessage = 'Ya existe una cuenta con este correo electrónico.';
      } else if (error.response?.status === 409) {
        errorMessage = 'Este correo electrónico ya está registrado.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'oauth_google' | 'oauth_apple') => {
    try {
      if (isSignedIn) {
        console.log('ℹ️ Usuario ya autenticado en Clerk (Registro), esperando sincronización...');
        return;
      }
      console.log(` iniciando flujo SSO para registro con ${provider}...`);
      const redirectUrl = Linking.createURL('oauth-native-callback');
      
      const { createdSessionId, setActive: setSSOActive } = await startSSOFlow({
        strategy: provider,
        redirectUrl,
      });

      if (createdSessionId && setSSOActive) {
        console.log('✅ Sesión creada en Clerk (Registro), activando...');
        await setSSOActive({ session: createdSessionId });
      }
    } catch (err: any) {
      console.error('❌ Error SSO Registro:', err);
      if (err.cancelled || err.code === 'session_exists') return;
      
      const providerName = provider === 'oauth_google' ? 'Google' : 'Apple';
      Alert.alert(
        'Error de Registro', 
        `No se pudo completar el registro con ${providerName}. \n\n${err.message || 'Error desconocido'}`
      );
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background Gradient */}
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

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoGlow} />
            <View style={styles.logoWrapper}>
              <Logo size="large" showText={false} />
            </View>
          </View>
          <Text style={styles.brandName}>Recomiéndame Coach</Text>
        </View>

        {/* Welcome Text */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>Crear cuenta</Text>
          <Text style={styles.welcomeSubtitle}>
            Únete y comienza tu transformación nutricional hoy
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, isEmailFocused && styles.inputLabelFocused]}>
              Email
            </Text>
            <TextInput
              style={[styles.input, isEmailFocused && styles.inputFocused]}
              placeholder="tu@email.com"
              placeholderTextColor="#9CA3AF"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => {
                setIsEmailFocused(true);
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 140, animated: true });
                }, 100);
              }}
              onBlur={() => setIsEmailFocused(false)}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, isPasswordFocused && styles.inputLabelFocused]}>
              Contraseña
            </Text>
            <View style={[styles.passwordContainer, isPasswordFocused && styles.passwordContainerFocused]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#9CA3AF"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => {
                  setIsPasswordFocused(true);
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 220, animated: true });
                  }, 100);
                }}
                onBlur={() => setIsPasswordFocused(false)}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, isConfirmPasswordFocused && styles.inputLabelFocused]}>
              Confirmar contraseña
            </Text>
            <View style={[styles.passwordContainer, isConfirmPasswordFocused && styles.passwordContainerFocused]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#9CA3AF"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => {
                  setIsConfirmPasswordFocused(true);
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 300, animated: true });
                  }, 100);
                }}
                onBlur={() => setIsConfirmPasswordFocused(false)}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Register Button */}
          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={({ pressed }) => [
              styles.registerButton,
              pressed && styles.buttonPressed,
              loading && styles.registerButtonDisabled
            ]}
          >
            <LinearGradient
              colors={loading ? ['#D1D5DB', '#9CA3AF'] : ['#74B796', '#5FA381']}
              style={styles.registerButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Crear cuenta</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* Back to Login */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBackToLogin}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>
              ¿Ya tienes cuenta? <Text style={styles.backButtonLink}>Iniciar sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Social Registration */}
        <View style={styles.socialSection}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o regístrate con</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.socialButton,
              pressed && styles.buttonPressed
            ]}
            onPress={() => handleSocialLogin('oauth_google')}
          >
            <Text style={styles.socialButtonText}>Continuar con Google</Text>
          </Pressable>

          {Platform.OS === 'ios' && (
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                styles.appleButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => handleSocialLogin('oauth_apple')}
            >
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>Continuar con Apple</Text>
            </Pressable>
          )}
        </View>

        {/* Terms and Privacy */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            Al crear una cuenta, aceptas nuestros{' '}
            <Text 
              style={styles.termsLink}
              onPress={() => Linking.openURL('https://coach.recomiendameapp.cl/terms')}
            >
              Términos de Servicio
            </Text>
            {' '}y{' '}
            <Text 
              style={styles.termsLink}
              onPress={() => Linking.openURL('https://coach.recomiendameapp.cl/privacy')}
            >
              Política de Privacidad
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 50,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 16,
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
    letterSpacing: 0.5,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginVertical: 12,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F5F4',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  passwordContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  eyeButton: {
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  eyeText: {
    fontSize: 18,
  },
  registerButton: {
    marginTop: 10,
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
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  backButtonLink: {
    color: COLORS.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  termsContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  termsText: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  socialSection: {
    width: '100%',
    marginVertical: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  socialButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.card,
    shadowOpacity: 0.03,
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
});