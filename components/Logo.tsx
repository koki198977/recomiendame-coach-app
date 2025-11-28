import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  variant?: 'vertical' | 'horizontal';
}

export const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true, variant = 'vertical' }) => {
  const logoSize = size === 'small' ? 60 : size === 'medium' ? 80 : 100;
  const textSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;

  if (variant === 'horizontal') {
    return (
      <View style={styles.horizontalContainer}>
        {/* Logo Image */}
        <Image 
          source={require('../assets/logo.png')} 
          style={[styles.logoImage, { width: logoSize, height: logoSize }]}
          resizeMode="contain"
        />
        
        {/* Logo Text Horizontal */}
        {showText && (
          <View style={styles.horizontalTextContainer}>
            <Text style={[styles.horizontalLogoText, { fontSize: textSize }]}>
              Recomiéndame
            </Text>
            <Text style={[styles.horizontalLogoSubtext, { fontSize: textSize * 0.7 }]}>
              Coach
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Logo Image */}
      <Image 
        source={require('../assets/logo.png')} 
        style={[styles.logoImage, { width: logoSize, height: logoSize }]}
        resizeMode="contain"
      />
      
      {/* Logo Text */}
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.logoText, { fontSize: textSize }]}>
            Recomiéndame
          </Text>
          <Text style={[styles.logoSubtext, { fontSize: textSize * 0.7 }]}>
            Coach
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    // Sin sombra para que se integre mejor con el fondo
  },
  textContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  logoText: {
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  logoSubtext: {
    fontWeight: '600',
    color: '#2E7D32', // Verde más oscuro para mejor contraste
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 1,
  },
  horizontalTextContainer: {
    marginLeft: 16,
    alignItems: 'flex-start',
  },
  horizontalLogoText: {
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 0.5,
  },
  horizontalLogoSubtext: {
    fontWeight: '600',
    color: '#2E7D32', // Verde más oscuro para mejor contraste
    marginTop: 2,
    letterSpacing: 1,
  },
});