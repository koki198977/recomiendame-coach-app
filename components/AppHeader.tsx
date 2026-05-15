import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from './Logo';
import { COLORS, GRADIENTS, SHADOWS } from '../theme/theme';
import { Image } from 'react-native';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  avatarUrl?: string | null;
  userName?: string;
  avatarSize?: number;
  rightComponent?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showLogo = true,
  avatarUrl,
  userName,
  avatarSize = 44,
  rightComponent,
}) => {
  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const renderAvatar = () => {
    if (avatarUrl) {
      return (
        <View style={[styles.avatarContainer, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        </View>
      );
    }

    if (userName) {
      return (
        <View style={[styles.avatarContainer, styles.initialsContainer, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
          <Text style={[styles.initialsText, { fontSize: avatarSize * 0.4 }]}>{getInitials(userName)}</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <View style={styles.content}>
        <View style={styles.leftSection}>
          {showLogo && (
            <View style={styles.logoContainer}>
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

        <View style={styles.rightSection}>
          {renderAvatar()}
          {rightComponent}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    zIndex: 0,
    ...SHADOWS.glow,
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
    marginRight: 12, // Reducido de 16 a 12
  },
  logoGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    backgroundColor: '#4CAF50',
    borderRadius: 18,
    opacity: 0.4,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  logoWrapper: {
    backgroundColor: '#FFFFFF', // Fondo blanco sólido
    padding: 8, // Reducido de 10 a 8
    borderRadius: 16, // Reducido de 18 a 16
    borderWidth: 2.5, // Reducido de 3 a 2.5
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20, // Reducido de 22 a 20
    fontWeight: '800', // Extra bold
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12, // Reducido de 13 a 12
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  avatarContainer: {
    width: 44, // Reducido un poco para que no compita tanto con el logo
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    ...SHADOWS.card,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  initialsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
