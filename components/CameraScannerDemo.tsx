import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SimpleBarcodeScanner from './SimpleBarcodeScanner';
import nutritionAnalysisService from '../services/nutritionAnalysisService';
import { NutritionalAnalysis } from '../types/openFoodFacts';
import { UserProfile } from '../types/nutrition';

interface CameraScannerDemoProps {
  userProfile?: UserProfile;
  onProductScanned?: (analysis: NutritionalAnalysis) => void;
}

export default function CameraScannerDemo({ 
  userProfile, 
  onProductScanned 
}: CameraScannerDemoProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');

  const handleBarcodeScanned = async (barcode: string) => {
    console.log('📷 Código escaneado:', barcode);
    setLastScanned(barcode);
    setShowCamera(false);
    setIsAnalyzing(true);

    try {
      const result = await nutritionAnalysisService.analyzeScannedProduct(
        barcode,
        userProfile,
        {
          dailyProgress: {
            caloriesConsumed: 800,
            caloriesTarget: 2000,
          },
          recentMeals: []
        }
      );

      if (result.success && result.product) {
        const analysis = result.product.personalizedAnalysis;
        const rating = analysis?.overallRating || 'moderate';
        const score = analysis?.overallScore || 50;

        Alert.alert(
          '✅ Producto Escaneado',
          `${result.product.productName}\n\nCalificación: ${getRatingText(rating)}\nPuntuación: ${score}/100\n\n¿Qué quieres hacer?`,
          [
            { text: 'Ver detalles', onPress: () => console.log('Ver detalles') },
            { text: 'Agregar a comida', onPress: () => console.log('Agregar a comida') },
            { text: 'Escanear otro', onPress: () => setShowCamera(true) }
          ]
        );

        onProductScanned?.(result.product);
      } else {
        Alert.alert(
          'Producto no encontrado',
          `No se encontró información para el código ${barcode}.\n\n¿Quieres intentar con otro producto?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Escanear otro', onPress: () => setShowCamera(true) }
          ]
        );
      }
    } catch (error) {
      console.error('Error analizando producto:', error);
      Alert.alert(
        'Error de análisis',
        'Hubo un problema al analizar el producto. ¿Quieres intentar de nuevo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reintentar', onPress: () => handleBarcodeScanned(barcode) }
        ]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRatingText = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'Excelente ⭐⭐⭐⭐⭐';
      case 'good': return 'Bueno ⭐⭐⭐⭐';
      case 'moderate': return 'Moderado ⭐⭐⭐';
      case 'poor': return 'Pobre ⭐⭐';
      case 'avoid': return 'Evitar ⭐';
      default: return 'Sin calificar';
    }
  };

  return (
    <>
      <View style={styles.container}>
        <LinearGradient
          colors={['#FF6B6B', '#FF8E53']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="camera" size={32} color="white" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Escáner de Cámara</Text>
                <Text style={styles.subtitle}>
                  Escanea códigos de barras con tu cámara
                </Text>
              </View>
            </View>

            {lastScanned && (
              <View style={styles.lastScannedContainer}>
                <Text style={styles.lastScannedLabel}>Último código escaneado:</Text>
                <Text style={styles.lastScannedCode}>{lastScanned}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setShowCamera(true)}
              disabled={isAnalyzing}
              activeOpacity={0.8}
            >
              {isAnalyzing ? (
                <>
                  <Ionicons name="hourglass" size={20} color="#FF6B6B" />
                  <Text style={styles.scanButtonText}>Analizando...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="camera" size={20} color="#FF6B6B" />
                  <Text style={styles.scanButtonText}>Abrir Cámara</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Ionicons name="flash" size={16} color="#FF6B6B" />
            <Text style={styles.featureText}>Flash automático</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="scan" size={16} color="#FF6B6B" />
            <Text style={styles.featureText}>Detección rápida</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={16} color="#FF6B6B" />
            <Text style={styles.featureText}>Análisis instantáneo</Text>
          </View>
        </View>
      </View>

      <Modal visible={showCamera} animationType="slide">
        <SimpleBarcodeScanner
          onBarcodeScanned={handleBarcodeScanned}
          onClose={() => setShowCamera(false)}
          isActive={showCamera}
        />
      </Modal>
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  lastScannedContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  lastScannedLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  lastScannedCode: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'monospace',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});