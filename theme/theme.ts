import { StyleSheet } from 'react-native';

export const COLORS = {
  // Primary - Sage Green (Naturaleza Moderna)
  primaryStart: '#74B796',
  primaryEnd: '#8BC9A8',
  primary: '#74B796', // Sage Green - Calma, crecimiento, salud orgánica

  // Secondary - Warm Clay
  secondary: '#E88D72', // Warm Clay - Energía, calidez, acción
  secondaryLight: '#F5C4B3',

  // Backgrounds
  background: '#FAFAF6', // Off-White - Reduce fatiga visual
  card: '#FFFFFF',
  
  // Text
  text: '#2C3E36', // Deep Forest - Legibilidad alta pero menos dura
  textLight: '#6B7F73',
  textWhite: '#FFFFFF',

  // Status
  success: '#74B796', // Sage Green
  warning: '#E88D72', // Warm Clay
  error: '#D97066',
  info: '#7BA3BC',

  // UI Elements
  border: '#E5E8E3',
  divider: '#F0F2EE',
};

export const SHADOWS = {
  // Soft shadow for cards
  card: {
    shadowColor: '#2C3E36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  // Colored glow for primary elements (más suave)
  glow: {
    shadowColor: '#74B796',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  // Floating elements
  floating: {
    shadowColor: '#2C3E36',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const GRADIENTS = {
  primary: ['#74B796', '#8BC9A8'] as const, // Sage Green gradient
  header: ['#74B796', '#8BC9A8'] as const,
  warm: ['#E88D72', '#F5A88E'] as const, // Warm Clay gradient
  ai: ['#7BA3BC', '#8BC9A8'] as const, // Soft blue to sage green for AI
};

export const COMMON_STYLES = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    ...SHADOWS.card,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    // Note: backdropFilter is web-only or requires Expo BlurView
  },
});
