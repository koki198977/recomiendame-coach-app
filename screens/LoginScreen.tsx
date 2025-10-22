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
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onShowRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      Alert.alert('Error', error.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
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
          <Logo size="large" showText={true} variant="vertical" />
          <Text style={styles.welcomeText}>Bienvenido de vuelta</Text>
          <Text style={styles.subtitleText}>Tu salud, nuestra prioridad</Text>
        </View>

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

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
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
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
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
  forgotPasswordText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
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
});