import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingListItem } from '../types/nutrition';
import { NutritionService } from '../services/nutritionService';


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
  const [exportingCSV, setExportingCSV] = useState(false);
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

  const handleShareText = async () => {
    try {
      // Crear texto de la lista de compras
      let shoppingText = '🛒 Lista de Compras\n\n';
      
      Object.entries(groupedItems).forEach(([category, categoryItems]) => {
        shoppingText += `${getCategoryIcon(category)} ${category.toUpperCase()}\n`;
        categoryItems.forEach(item => {
          shoppingText += `• ${item.name} - ${formatQuantity(item)}\n`;
        });
        shoppingText += '\n';
      });

      await Share.share({
        message: shoppingText,
        title: 'Lista de Compras',
      });
    } catch (error) {
      console.log('Error sharing text:', error);
    }
  };

  const handleExportCSV = async () => {
    if (!planId) {
      Alert.alert('Error', 'No se puede exportar sin un plan válido');
      return;
    }

    try {
      setExportingCSV(true);
      
      // Obtener CSV del servidor
      const csvData = await NutritionService.exportShoppingListCSV(planId);
      
      if (Platform.OS === 'web') {
        // En web, descargar directamente
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'lista-compras.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // En móvil, usar Share API como fallback
        await Share.share({
          message: csvData,
          title: 'Lista de Compras CSV',
        });
      }
    } catch (error) {
      console.log('Error exporting CSV:', error);
      Alert.alert('Error', 'No se pudo exportar la lista de compras');
    } finally {
      setExportingCSV(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <LinearGradient
            colors={['#FF9800', '#F57C00']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <Text style={styles.title}>🛒 Lista de Compras</Text>
              <Text style={styles.subtitle}>
                {total} ingredientes para tu plan semanal
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF9800" />
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
                        <View style={styles.checkbox} />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.shareButton} 
              onPress={handleShareText}
            >
              <Text style={styles.shareButtonText}>📤 Compartir</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.csvButton, exportingCSV && styles.buttonDisabled]} 
              onPress={handleExportCSV}
              disabled={exportingCSV}
            >
              {exportingCSV ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.csvButtonText}>📊 CSV</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
              <Text style={styles.closeFooterButtonText}>Cerrar</Text>
            </TouchableOpacity>
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
    borderBottomColor: '#FF9800',
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  shareButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: '#4CAF50',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  csvButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: '#FF9800',
  },
  csvButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  closeFooterButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  closeFooterButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});