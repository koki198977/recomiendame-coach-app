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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from '../components/Logo';
import { AuthService } from '../services/authService';

interface RegisterScreenProps {
  onRegisterSuccess: () => void;
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
      await AuthService.register({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      // Después del registro exitoso, hacer login automáticamente
      await AuthService.login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      Alert.alert(
        '¡Bienvenido!',
        'Tu cuenta ha sido creada exitosamente',
        [{ text: 'Continuar', onPress: onRegisterSuccess }]
      );
    } catch (error: any) {
      console.log('Registration error:', error);
      
      let errorMessage = 'Error al crear la cuenta. Intenta de nuevo.';
      
      if (error.response?.status === 400) {
        errorMessage = 'Email ya registrado o datos inválidos';
      } else if (error.response?.status === 422) {
        errorMessage = 'Por favor verifica que todos los datos sean correctos';
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Logo size="large" showText={true} />
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
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
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
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
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
            <Text style={styles.termsLink}>Términos de Servicio</Text>
            {' '}y{' '}
            <Text style={styles.termsLink}>Política de Privacidad</Text>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#fff',
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