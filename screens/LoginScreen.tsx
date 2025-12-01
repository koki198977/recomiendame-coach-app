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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthService } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logo } from '../components/Logo';

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onShowRegister: () => void;
  verificationMessage?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onShowRegister, verificationMessage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(!!verificationMessage);
  const [isResending, setIsResending] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);

  const handleLogin = async () => {
    console.log('🔐 Login button pressed');
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    console.log('📧 Attempting login with email:', email);
    setIsLoading(true);
    try {
      console.log('📡 Calling AuthService.login...');
      await AuthService.login({ email, password });
      
      // Crear datos de usuario simples
      const userData = {
        id: 'user-' + Date.now(),
        email: email,
        name: email.split('@')[0],
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      onLoginSuccess();
    } catch (error: any) {
      console.log('Login error:', error);
      
      let errorMessage = 'Error al iniciar sesión. Verifica tus credenciales.';
      
      // Manejar diferentes códigos de estado
      if (error.response?.status === 401) {
        errorMessage = 'Email o contraseña incorrectos.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Tu cuenta no ha sido verificada. Por favor revisa tu correo electrónico y haz clic en el enlace de verificación.';
      } else if (error.response?.status === 423) {
        errorMessage = 'Tu cuenta está temporalmente bloqueada. Contacta al soporte.';
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

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background Gradient */}
      <LinearGradient
        colors={['#4CAF50', '#81C784', '#A5D6A7']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative Circles */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          {/* Logo con efecto mejorado */}
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

        {/* Login Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient
              colors={isLoading ? ['#ccc', '#999'] : ['#FF9800', '#F57C00']}
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
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.forgotPassword, isRequestingReset && styles.forgotPasswordDisabled]}
            onPress={handleForgotPassword}
            disabled={isRequestingReset}
          >
            <Text style={[styles.forgotPasswordText, isRequestingReset && styles.forgotPasswordTextDisabled]}>
              {isRequestingReset ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <Text style={styles.signupText}>¿No tienes cuenta?</Text>
          <TouchableOpacity style={styles.signupButton} onPress={onShowRegister}>
            <Text style={styles.signupButtonText}>Regístrate gratis</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -50,
    right: -50,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: 100,
    left: -30,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: height * 0.3,
    right: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logoGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    backgroundColor: '#4CAF50',
    borderRadius: 50,
    opacity: 0.4,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  logoWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  formContainer: {
    marginTop: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButton: {
    marginTop: 20,
    borderRadius: 16,
    shadowColor: '#FF9800',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonDisabled: {
    shadowOpacity: 0.1,
  },
  loginButtonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotPasswordDisabled: {
    opacity: 0.6,
  },
  forgotPasswordText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPasswordTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  signupText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 12,
  },
  signupButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  verificationMessageContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  verificationMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  verificationIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  verificationContent: {
    flex: 1,
  },
  verificationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 8,
  },
  resendButton: {
    alignSelf: 'flex-start',
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  resendButtonTextDisabled: {
    color: '#999',
  },
  closeMessageButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeMessageText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
});