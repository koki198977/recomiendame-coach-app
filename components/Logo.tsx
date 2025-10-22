import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  variant?: 'vertical' | 'horizontal';
}

export const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true, variant = 'vertical' }) => {
  const logoSize = size === 'small' ? 40 : size === 'medium' ? 60 : 80;
  const textSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;

  if (variant === 'horizontal') {
    return (
      <View style={styles.horizontalContainer}>
        {/* Logo Icon */}
        <View style={[styles.logoContainer, { width: logoSize, height: logoSize }]}>
          <View style={[styles.backgroundCircle, { width: logoSize, height: logoSize }]} />
          <View style={styles.circuitPattern}>
            <View style={[styles.circuitLine, styles.circuitLine1]} />
            <View style={[styles.circuitLine, styles.circuitLine2]} />
            <View style={[styles.circuitDot, styles.circuitDot1]} />
            <View style={[styles.circuitDot, styles.circuitDot2]} />
            <View style={[styles.circuitDot, styles.circuitDot3]} />
          </View>
          <View style={styles.leafContainer}>
            <View style={styles.leaf} />
            <View style={styles.leafVein} />
          </View>
          <View style={styles.aiChip}>
            <View style={styles.chipCore} />
            <Text style={styles.aiText}>AI</Text>
          </View>
        </View>
        
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
      {/* Logo Icon */}
      <View style={[styles.logoContainer, { width: logoSize, height: logoSize }]}>
        {/* Background Circle with Gradient Effect */}
        <View style={[styles.backgroundCircle, { width: logoSize, height: logoSize }]} />
        
        {/* AI Circuit Pattern */}
        <View style={styles.circuitPattern}>
          <View style={[styles.circuitLine, styles.circuitLine1]} />
          <View style={[styles.circuitLine, styles.circuitLine2]} />
          <View style={[styles.circuitDot, styles.circuitDot1]} />
          <View style={[styles.circuitDot, styles.circuitDot2]} />
          <View style={[styles.circuitDot, styles.circuitDot3]} />
        </View>
        
        {/* Leaf Shape */}
        <View style={styles.leafContainer}>
          <View style={styles.leaf} />
          <View style={styles.leafVein} />
        </View>
        
        {/* AI Brain/Chip Center */}
        <View style={styles.aiChip}>
          <View style={styles.chipCore} />
          <Text style={styles.aiText}>AI</Text>
        </View>
      </View>
      
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
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  circuitPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circuitLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1,
  },
  circuitLine1: {
    width: 20,
    height: 2,
    top: '30%',
    left: '10%',
    transform: [{ rotate: '45deg' }],
  },
  circuitLine2: {
    width: 15,
    height: 2,
    bottom: '25%',
    right: '15%',
    transform: [{ rotate: '-30deg' }],
  },
  circuitDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  circuitDot1: {
    top: '20%',
    left: '20%',
  },
  circuitDot2: {
    top: '70%',
    right: '25%',
  },
  circuitDot3: {
    bottom: '30%',
    left: '70%',
  },
  leafContainer: {
    position: 'absolute',
    width: '60%',
    height: '60%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaf: {
    width: 24,
    height: 32,
    backgroundColor: '#81C784',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 20,
    transform: [{ rotate: '-15deg' }],
    shadowColor: '#2E7D32',
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  leafVein: {
    position: 'absolute',
    width: 1,
    height: 20,
    backgroundColor: '#2E7D32',
    top: 6,
    transform: [{ rotate: '-15deg' }],
  },
  aiChip: {
    position: 'absolute',
    bottom: '10%',
    right: '10%',
    width: 16,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  chipCore: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#FF9800',
    borderRadius: 2,
  },
  aiText: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
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
    color: '#81C784',
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
    color: '#81C784',
    marginTop: 2,
    letterSpacing: 1,
  },
});