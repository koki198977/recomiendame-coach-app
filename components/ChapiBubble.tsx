import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
} from 'react-native';

interface ChapiBubbleProps {
  onPress: () => void;
  unreadCount?: number;
}

export const ChapiBubble: React.FC<ChapiBubbleProps> = ({ onPress, unreadCount = 0 }) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Animación de pulso continuo
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.container}>
      {/* Halo de fondo animado */}
      <Animated.View
        style={[
          styles.halo,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Burbuja principal */}
      <TouchableOpacity
        style={styles.bubble}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* Icono de Chapi - emoji de cerebro/asistente */}
        <Text style={styles.icon}>🧠</Text>
        
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 100, // Sobre el tab bar
    alignItems: 'center',
    zIndex: 1000,
  },
  halo: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  bubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  icon: {
    fontSize: 30,
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
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
});
