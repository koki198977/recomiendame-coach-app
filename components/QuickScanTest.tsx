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
import SimpleBarcodeScanner from './SimpleBarcodeScanner';

export default function QuickScanTest() {
  const [showScanner, setShowScanner] = useState(false);

  const handleBarcodeScanned = (barcode: string) => {
    console.log('📷 Código escaneado en test:', barcode);
    setShowScanner(false);
    
    Alert.alert(
      '✅ Código Escaneado',
      `Código: ${barcode}\n\nEste es solo un test del escáner. El análisis nutricional se ejecutará en el componente principal.`,
      [
        { text: 'OK' },
        { text: 'Escanear otro', onPress: () => setShowScanner(true) }
      ]
    );
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="qr-code" size={48} color="#007AFF" />
          <Text style={styles.title}>Test del Escáner</Text>
          <Text style={styles.description}>
            Prueba rápida del escáner de códigos de barras
          </Text>
          
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => setShowScanner(true)}
          >
            <Ionicons name="camera" size={20} color="white" />
            <Text style={styles.testButtonText}>Probar Escáner</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showScanner} animationType="slide">
        <SimpleBarcodeScanner
          onBarcodeScanned={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
          isActive={showScanner}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});