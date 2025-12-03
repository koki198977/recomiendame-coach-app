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
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from '../components/Logo';
import { AuthService } from '../services/authService';

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
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

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
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Crear usuario
      const response = await AuthService.register({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      // Verificar que el registro fue exitoso (status 201)
      console.log('Registration successful with status 201');
      
      // Registro exitoso - redirigir al login con mensaje de verificación
      Alert.alert(
        '¡Cuenta creada exitosamente! 🎉',
        'Hemos enviado un correo de verificación a tu email. Por favor verifica tu correo antes de iniciar sesión.',
        [
          { 
            text: 'Ir a iniciar sesión', 
            onPress: () => onRegisterSuccess('Por favor verifica tu correo electrónico antes de iniciar sesión.', formData.email.trim().toLowerCase())
          }
        ]
      );
    } catch (error: any) {
      console.log('Registration error:', error);
      console.log('Error status:', error.response?.status);
      
      let errorMessage = 'Error al crear la cuenta. Intenta de nuevo.';
      
      // Manejar diferentes códigos de estado
      if (error.response?.status === 400) {
        errorMessage = 'Email ya registrado o datos inválidos';
      } else if (error.response?.status === 422) {
        errorMessage = 'Por favor verifica que todos los datos sean correctos';
      } else if (error.response?.status === 500) {
        errorMessage = 'Este correo electrónico ya se encuentra registrado. Intenta iniciar sesión o usa otro email.';
      } else if (error.response?.status === 409) {
        errorMessage = 'Este correo electrónico ya está en uso. Por favor usa otro email.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background Gradient */}
      <LinearGradient
        colors={['#4CAF50', '#81C784']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          {/* Logo con efecto mejorado */}
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
            Únete y comienza tu transformación nutricional
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor="rgba(0, 0, 0, 0.4)"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ y: 150, animated: true });
                }, 100);
              }}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 250, animated: true });
                  }, 100);
                }}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirmar contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Repite tu contraseña"
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 350, animated: true });
                  }, 100);
                }}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#ccc', '#999'] : ['#FF9800', '#F57C00']}
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
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity style={styles.backButton} onPress={onBackToLogin}>
            <Text style={styles.backButtonText}>
              ¿Ya tienes cuenta? <Text style={styles.backButtonLink}>Iniciar sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
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
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
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
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    paddingHorizontal: 15,
    paddingVertical: 16,
  },
  eyeText: {
    fontSize: 18,
  },
  registerButton: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  backButtonLink: {
    color: '#fff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  termsContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#fff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});