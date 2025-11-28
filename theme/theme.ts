import { StyleSheet } from 'react-native';

export const COLORS = {
  // Primary (Neon Green Gradient)
  primaryStart: '#43E97B',
  primaryEnd: '#38F9D7',
  primary: '#00E676', // Fallback solid

  // Secondary (AI/Tech)
  secondary: '#6C63FF',
  secondaryLight: '#E0E0FF',

  // Backgrounds
  background: '#F5F7FA', // Light cool gray
  card: '#FFFFFF',
  
  // Text
  text: '#1A202C',
  textLight: '#718096',
  textWhite: '#FFFFFF',

  // Status
  success: '#00E676',
  warning: '#FFB300',
  error: '#FF5252',
  info: '#2979FF',

  // UI Elements
  border: '#E2E8F0',
  divider: '#EDF2F7',
};

export const SHADOWS = {
  // Soft shadow for cards
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  // Colored glow for primary elements
  glow: {
    shadowColor: '#43E97B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  // Floating elements
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const GRADIENTS = {
  primary: ['#43E97B', '#38F9D7'] as const,
  header: ['#43E97B', '#38F9D7'] as const,
  ai: ['#6C63FF', '#38F9D7'] as const, // Purple to Green for AI
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
