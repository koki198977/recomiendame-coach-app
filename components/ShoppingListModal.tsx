import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingListItem } from '../types/nutrition';


interface ShoppingListModalProps {
  visible: boolean;
  onClose: () => void;
  items: ShoppingListItem[];
  loading: boolean;
  total: number;
  planId?: string;
}

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  visible,
  onClose,
  items,
  loading,
  total,
  planId,
}) => {
  const [isExporting, setIsExporting] = React.useState(false);

  // Agrupar items por categoría
  const groupedItems = items.reduce((groups, item) => {
    const category = item.category || 'Otros';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as { [key: string]: ShoppingListItem[] });

  const formatQuantity = (item: ShoppingListItem): string => {
    return `${item.qty} ${item.unit}`;
  };

  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      'proteína': '🥩',
      'carbohidrato': '🍞',
      'verdura': '🥬',
      'fruta': '🍎',
      'lácteo': '🥛',
      'legumbre': '🫘',
      'hierba': '🌿',
      'salsa': '🥄',
      'Otros': '🛒',
    };
    return icons[category] || '📦';
  };

  const handleExport = async () => {
    if (!planId) {
      Alert.alert('Error', 'No se puede exportar: ID del plan no disponible');
      return;
    }

    try {
      setIsExporting(true);

      // Obtener token de autenticación
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'No se encontró token de autenticación');
        return;
      }

      // Generar URL del CSV
      const csvUrl = `https://api-coach.recomiendameapp.cl/plans/${planId}/shopping-list.csv`;
      
      console.log('Descargando CSV desde:', csvUrl);

      // Hacer petición al endpoint CSV
      const response = await fetch(csvUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/csv',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      // Obtener el contenido CSV
      const csvContent = await response.text();
      
      console.log('CSV descargado exitosamente');

      // Compartir el contenido CSV
      const result = await Share.share({
        message: csvContent,
        title: 'Lista de Compras - Recomiéndame Coach (CSV)',
      });

      if (result.action === Share.sharedAction) {
        console.log('CSV compartido exitosamente');
      }

    } catch (error) {
      console.error('Error exporting CSV:', error);
      
      // Fallback: exportar como texto si el CSV falla
      Alert.alert(
        'Error descargando CSV',
        'No se pudo descargar el archivo CSV. ¿Quieres exportar como texto?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sí', onPress: handleTextExport }
        ]
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleTextExport = async () => {
    try {
      // Generar contenido de texto para la lista
      let content = '📋 LISTA DE COMPRAS - RECOMIÉNDAME COACH\n';
      content += '=' .repeat(50) + '\n\n';
      
      // Agregar fecha
      const today = new Date();
      content += `📅 Fecha: ${today.toLocaleDateString('es-ES')}\n`;
      content += `🛍️ Total de ingredientes: ${total}\n\n`;
      
      // Agregar items por categoría
      Object.entries(groupedItems).forEach(([category, categoryItems]) => {
        content += `${getCategoryIcon(category)} ${category.toUpperCase()}\n`;
        content += '-'.repeat(30) + '\n';
        
        categoryItems.forEach((item) => {
          content += `• ${item.name} - ${formatQuantity(item)}\n`;
        });
        
        content += '\n';
      });
      
      content += '\n' + '='.repeat(50) + '\n';
      content += '✨ Generado por Recomiéndame Coach\n';
      content += '💚 ¡Que disfrutes tus compras saludables!';

      // Compartir usando Share nativo
      await Share.share({
        message: content,
        title: 'Lista de Compras - Recomiéndame Coach',
      });
    } catch (error) {
      console.error('Error exporting text:', error);
      Alert.alert('Error', 'No se pudo exportar la lista.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <LinearGradient
            colors={['#4CAF50', '#81C784']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerLeft}>
              <View style={styles.chapiContainer}>
                <Image 
                  source={require('../assets/chapi-3d-compras.png')}
                  style={styles.chapiImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.headerContent}>
                <Text style={styles.title}>Lista de Compras</Text>
                <Text style={styles.subtitle}>
                  {total} ingredientes para tu plan semanal
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Generando lista de compras...</Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                  <View key={category} style={styles.categorySection}>
                    <Text style={styles.categoryTitle}>
                      {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                    
                    {categoryItems.map((item, index) => (
                      <View key={`${category}-${index}`} style={styles.shoppingItem}>
                        <View style={styles.itemContent}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemQuantity}>{formatQuantity(item)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerButtons}>
              <TouchableOpacity 
                style={[
                  styles.footerButton, 
                  styles.exportButton,
                  (loading || items.length === 0 || isExporting || !planId) && styles.exportButtonDisabled
                ]} 
                onPress={handleExport}
                disabled={loading || items.length === 0 || isExporting || !planId}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[
                    styles.exportButtonText,
                    (loading || items.length === 0 || !planId) && styles.exportButtonTextDisabled
                  ]}>
                    📊 CSV
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.footerButton, styles.closeFooterButton]} 
                onPress={onClose}
              >
                <Text style={styles.closeFooterButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    minHeight: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chapiContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  chapiImage: {
    width: 50,
    height: 50,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  itemsList: {
    paddingBottom: 10,
  },
  categorySection: {
    marginBottom: 25,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  shoppingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 8,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  exportButton: {
    backgroundColor: '#2196F3',
  },
  exportButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  exportButtonTextDisabled: {
    color: '#757575',
  },
  closeFooterButton: {
    backgroundColor: '#4CAF50',
  },
  closeFooterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});