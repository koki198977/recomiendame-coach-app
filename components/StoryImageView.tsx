import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types/nutrition';
import { truncateCaption } from '../services/storyUtils';

interface StoryImageViewProps {
  post: Post;
  width?: number;   // Default: 1080
  height?: number;  // Default: 1920
}

export const StoryImageView: React.FC<StoryImageViewProps> = ({
  post,
  width = 1080,
  height = 1920,
}) => {
  const [imageError, setImageError] = useState(false);

  const imageUrl = post?.mediaUrl || post?.media?.url;
  const showImage = !!imageUrl && !imageError;

  const truncatedCaption = truncateCaption(post?.caption);

  // Mejor distribución: 75% imagen/caption, 25% branding
  const contentAreaHeight = Math.round(height * 0.75);
  const brandingAreaHeight = height - contentAreaHeight;

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Background: post image or gradient fallback */}
      <View style={[styles.backgroundContainer, { height: contentAreaHeight }]}>
        {showImage ? (
          <Image
            source={{ uri: imageUrl! }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <LinearGradient
            colors={['#FF6B35', '#F7931E']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}

        {/* Gradient overlay for better text readability */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradientOverlay}
        />

        {/* Caption overlay — positioned at bottom with better spacing */}
        <View style={styles.captionOverlay}>
          <Text style={styles.captionText} numberOfLines={4}>
            {truncatedCaption}
          </Text>
        </View>
      </View>

      {/* Branding layer — header style con gradiente verde + blancos */}
      <LinearGradient
        colors={['#4CAF50', '#66BB6A', '#81C784']}
        style={[styles.brandingLayer, { height: brandingAreaHeight }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Círculos decorativos blancos semi-transparentes (estilo header) */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        
        {/* Header con logo y título (estilo app) */}
        <View style={styles.header}>
          <Image
            source={require('../assets/adaptive-icon.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Recomiéndame Coach</Text>
            <Text style={styles.headerSubtitle}>Descarga la app</Text>
          </View>
        </View>

        {/* Chapi centrado con fondo circular */}
        <View style={styles.chapiContainer}>
          <Image
            source={require('../assets/chapi-3d-progreso.png')}
            style={styles.chapiHero}
            resizeMode="cover"
          />
        </View>
        
        {/* URL y badges de descarga */}
        <View style={styles.footer}>
          <Text style={styles.urlText}>https://coach.recomiendameapp.cl/download</Text>
          
          {/* Badges de App Store y Google Play */}
          <View style={styles.storeBadgesContainer}>
            <View style={styles.storeBadge}>
              <Ionicons name="logo-apple" size={40} color="#fff" />
              <View style={styles.storeBadgeText}>
                <Text style={styles.storeBadgeLabel}>Descargar en</Text>
                <Text style={styles.storeBadgeName}>App Store</Text>
              </View>
            </View>
            
            <View style={styles.storeBadge}>
              <Ionicons name="logo-google-playstore" size={40} color="#fff" />
              <View style={styles.storeBadgeText}>
                <Text style={styles.storeBadgeLabel}>Disponible en</Text>
                <Text style={styles.storeBadgeName}>Google Play</Text>
              </View>
            </View>
          </View>
          
          {/* Promo badge */}
          <View style={styles.promoBadge}>
            <Text style={styles.promoText}>🎁 Prueba gratis 30 días</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  backgroundContainer: {
    width: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  captionOverlay: {
    width: '100%',
    paddingHorizontal: 48,
    paddingVertical: 40,
    paddingBottom: 60,
  },
  captionText: {
    color: '#fff',
    fontSize: 42,
    lineHeight: 56,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  brandingLayer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 36,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -100,
    right: -80,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -50,
    left: -60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 20,
    paddingHorizontal: 8,
    zIndex: 1,
  },
  headerLogo: {
    width: 120,
    height: 120,
    backgroundColor: '#fff',
    borderRadius: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 46,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginTop: 4,
  },
  chapiContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    overflow: 'hidden',
  },
  chapiHero: {
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    zIndex: 1,
  },
  urlText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  storeBadgesContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  storeBadgeText: {
    gap: 2,
  },
  storeBadgeLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '400',
  },
  storeBadgeName: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  promoBadge: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 4,
  },
  promoText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
