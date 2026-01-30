import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ProductScannerModal from './ProductScannerModal';
import ProductToMealModal from './ProductToMealModal';
import { NutritionalAnalysis } from '../types/openFoodFacts';
import { UserProfile } from '../types/nutrition';

interface NutritionScannerCardProps {
  userProfile?: UserProfile;
  onProductScanned?: (analysis: NutritionalAnalysis) => void;
  onMealAdded?: () => void; // Nuevo callback para refresh
}

export default function NutritionScannerCard({ 
  userProfile, 
  onProductScanned,
  onMealAdded
}: NutritionScannerCardProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [lastScannedProduct, setLastScannedProduct] = useState<NutritionalAnalysis | null>(null);

  const handleProductAnalyzed = (analysis: NutritionalAnalysis) => {
    setLastScannedProduct(analysis);
    onProductScanned?.(analysis);
    
    // No mostrar popup, solo actualizar el estado para mostrar los botones en el modal
    console.log('✅ Producto analizado:', analysis.productName);
  };

  const getRatingColor = (rating?: string) => {
    switch (rating) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'moderate': return '#FF9800';
      case 'poor': return '#FF5722';
      case 'avoid': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <>
      <View style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="barcode-outline" size={28} color="white" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Análisis Nutricional</Text>
                <Text style={styles.subtitle}>
                  Escanea productos y obtén recomendaciones personalizadas
                </Text>
              </View>
            </View>

            {lastScannedProduct && (
              <View style={styles.lastProductContainer}>
                <Text style={styles.lastProductLabel}>Último producto:</Text>
                <View style={styles.lastProductInfo}>
                  <Text style={styles.lastProductName} numberOfLines={1}>
                    {lastScannedProduct.productName}
                  </Text>
                  {lastScannedProduct.personalizedAnalysis && (
                    <View style={[
                      styles.ratingBadge,
                      { backgroundColor: getRatingColor(lastScannedProduct.personalizedAnalysis.overallRating) }
                    ]}>
                      <Text style={styles.ratingText}>
                        {lastScannedProduct.personalizedAnalysis.overallScore}/100
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setShowScanner(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={20} color="#667eea" />
              <Text style={styles.scanButtonText}>Escanear con Cámara</Text>
            </TouchableOpacity>

            <Text style={styles.orText}>o</Text>

            <TouchableOpacity
              style={styles.manualButton}
              onPress={() => setShowScanner(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="keypad" size={20} color="#667eea" />
              <Text style={styles.manualButtonText}>Ingresar Código Manual</Text>
            </TouchableOpacity>

            <View style={styles.featuresContainer}>
              <View style={styles.feature}>
                <Ionicons name="checkmark-circle" size={18} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.featureText}>Análisis{'\n'}personalizado</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="warning" size={18} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.featureText}>Detecta{'\n'}alérgenos</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="fitness" size={18} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.featureText}>Compatible con tus{'\n'}objetivos</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ProductScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        userProfile={userProfile}
        onProductAnalyzed={handleProductAnalyzed}
        onMealAdded={onMealAdded}
      />

      <ProductToMealModal
        visible={showMealModal}
        onClose={() => setShowMealModal(false)}
        product={lastScannedProduct}
        onMealLogged={(meal) => {
          console.log('Comida registrada:', meal);
          setShowMealModal(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    padding: 20,
  },
  content: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  lastProductContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  lastProductLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
  },
  lastProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  orText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginVertical: 8,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 8,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
    gap: 6,
  },
  featureText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
    minHeight: 28,
  },
});