import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  Image,
  Keyboard,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChapiBubbleProps {
  onPress: () => void;
  unreadCount?: number;
}

export const ChapiBubble: React.FC<ChapiBubbleProps> = ({ onPress, unreadCount = 0 }) => {
  const insets = useSafeAreaInsets();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const blinkAnim = React.useRef(new Animated.Value(1)).current;
  const glowAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardDidShowListener = Keyboard.addListener(keyboardShowEvent, () => {
      setIsKeyboardVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });

    const keyboardDidHideListener = Keyboard.addListener(keyboardHideEvent, () => {
      setIsKeyboardVisible(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  React.useEffect(() => {
    // Animación de pulso suave
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Animación de parpadeo de ojos
    const blink = Animated.loop(
      Animated.sequence([
        Animated.delay(3000),
        Animated.timing(blinkAnim, {
          toValue: 0.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ])
    );

    // Animación de brillo
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    blink.start();
    glow.start();

    return () => {
      pulse.stop();
      blink.stop();
      glow.stop();
    };
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  // Si el teclado está visible, renderizamos null o una vista transparente para evitar toques
  // Pero usamos opacity animada para que sea suave
  
  return (
    <Animated.View style={[
      styles.container, 
      { 
        bottom: 100 + insets.bottom,
        opacity: fadeAnim,
        // Deshabilitar interacción cuando está invisible
        transform: [{ scale: fadeAnim }] 
      }
    ]}>
      {/* Halo de fondo animado */}
      <Animated.View
        style={[
          styles.halo,

          {
            transform: [{ scale: pulseAnim }],
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Burbuja principal */}
      <TouchableOpacity
        style={styles.bubble}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* Imagen de Chapi 3D */}
        <Image 
          source={require('../assets/chapi-3d.png')}
          style={styles.chapiImage}
          resizeMode="contain"
        />
        
        {/* Badge de mensajes no leídos */}
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Texto descriptivo */}
      <Text style={styles.label}>Chapi</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  halo: {
    position: 'absolute',
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: 'rgba(116, 183, 150, 0.2)', // Sage green suave
  },
  bubble: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#74B796',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
    overflow: 'hidden', // Esto hace que la imagen se recorte en forma circular
  },
  chapiImage: {
    width: 70,
    height: 70,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF5252',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#FF5252',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  label: {
    marginTop: 8,
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '700',
    textShadowColor: 'rgba(76, 175, 80, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
