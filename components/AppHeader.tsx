import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from './Logo';
import { COLORS, GRADIENTS, SHADOWS } from '../theme/theme';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  rightComponent?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showLogo = true,
  rightComponent,
}) => {
  return (
    <View style={styles.container}>
      {/* Background with Gradient */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      
      {/* Decorative Circles for "Futuristic" feel */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {showLogo && (
            <View style={styles.logoContainer}>
              {/* Glow effect */}
              <View style={styles.logoGlow} />
              <View style={styles.logoWrapper}>
                <Logo size="small" showText={false} />
              </View>
            </View>
          )}
          <View style={styles.textContainer}>
            {title && (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {rightComponent && (
          <View style={styles.rightSection}>
            {rightComponent}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 60, // More space for status bar
    paddingBottom: 25,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    ...SHADOWS.glow, // Green glow at the bottom
    shadowColor: COLORS.primaryStart,
    shadowOpacity: 0.2,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  // Decorative background elements
  circle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    position: 'relative',
    marginRight: 16,
  },
  logoGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: '#4CAF50',
    borderRadius: 22,
    opacity: 0.4,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  logoWrapper: {
    backgroundColor: '#FFFFFF', // Fondo blanco sólido
    padding: 10,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800', // Extra bold
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  rightSection: {
    marginLeft: 16,
  },
});
