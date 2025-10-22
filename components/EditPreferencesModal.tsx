import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NutritionService } from '../services/nutritionService';
import { Cuisine, Allergy, Condition } from '../types/nutrition';

type PreferenceItem = Cuisine | Allergy | Condition;
type PreferenceType = 'cuisinesLike' | 'cuisinesDislike' | 'allergies' | 'conditions';

interface EditPreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (updatedPreferences: { 
    cuisinesLike?: number[]; 
    cuisinesDislike?: number[];
    allergyIds?: number[];
    conditionIds?: number[];
  }) => void;
  type: PreferenceType;
  currentPreferences: PreferenceItem[];
  title: string;
}

export const EditPreferencesModal: React.FC<EditPreferencesModalProps> = ({
  visible,
  onClose,
  onSave,
  type,
  currentPreferences,
  title,
}) => {
  const [allItems, setAllItems] = useState<PreferenceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadItems();
      // Inicializar con las preferencias actuales
      setSelectedIds(currentPreferences.map(c => c.id));
    }
  }, [visible, currentPreferences, type]);

  const loadItems = async () => {
    try {
      setLoading(true);
      let itemsData;
      
      switch (type) {
        case 'cuisinesLike':
        case 'cuisinesDislike':
          itemsData = await NutritionService.getCuisines('', 100, 0);
          setAllItems(itemsData.items);
          break;
        case 'allergies':
          itemsData = await NutritionService.getAllergies('', 100, 0);
          setAllItems(itemsData.items);
          break;
        case 'conditions':
          itemsData = await NutritionService.getConditions('', 100, 0);
          setAllItems(itemsData.items);
          break;
      }
    } catch (error) {
      console.log(`Error loading ${type}:`, error);
      // Usar datos de fallback si falla la API
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackData = () => {
    switch (type) {
      case 'cuisinesLike':
      case 'cuisinesDislike':
        setAllItems([
          { id: 1, name: 'Mediterránea' },
          { id: 2, name: 'Asiática' },
          { id: 3, name: 'Mexicana' },
          { id: 4, name: 'Italiana' },
          { id: 5, name: 'Vegetariana' },
          { id: 6, name: 'Vegana' },
        ]);
        break;
      case 'allergies':
        setAllItems([
          { id: 1, name: 'Gluten' },
          { id: 2, name: 'Lactosa' },
          { id: 3, name: 'Frutos secos' },
          { id: 4, name: 'Mariscos' },
          { id: 5, name: 'Huevos' },
        ]);
        break;
      case 'conditions':
        setAllItems([
          { id: 1, code: 'DIABETES', label: 'Diabetes' },
          { id: 2, code: 'HYPERTENSION', label: 'Hipertensión' },
          { id: 3, code: 'CELIAC', label: 'Celiaquía' },
          { id: 4, code: 'LACTOSE_INTOLERANT', label: 'Intolerancia a la lactosa' },
        ]);
        break;
    }
  };

  const toggleItem = (itemId: number) => {
    setSelectedIds(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Preparar los datos para enviar según el tipo
      let preferences: any = {};
      
      switch (type) {
        case 'cuisinesLike':
          preferences.cuisinesLike = selectedIds.length > 0 ? selectedIds : undefined;
          break;
        case 'cuisinesDislike':
          preferences.cuisinesDislike = selectedIds.length > 0 ? selectedIds : undefined;
          break;
        case 'allergies':
          preferences.allergyIds = selectedIds.length > 0 ? selectedIds : undefined;
          break;
        case 'conditions':
          preferences.conditionIds = selectedIds.length > 0 ? selectedIds : undefined;
          break;
      }

      await NutritionService.updateUserPreferences(preferences);
      onSave(preferences);
      onClose();
      Alert.alert('¡Guardado!', 'Tus preferencias han sido actualizadas');
    } catch (error) {
      console.log('Error saving preferences:', error);
      Alert.alert('Error', 'No se pudieron guardar las preferencias');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Restaurar selección original
    setSelectedIds(currentPreferences.map(c => c.id));
    onClose();
  };

  const getItemName = (item: PreferenceItem): string => {
    if ('name' in item) {
      return item.name;
    } else if ('label' in item) {
      return item.label;
    }
    return 'Item';
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
            <View style={styles.headerContent}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                {selectedIds.length} seleccionadas
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Cargando opciones...</Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {allItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.itemContainer,
                        isSelected && styles.itemContainerSelected
                      ]}
                      onPress={() => toggleItem(item.id)}
                    >
                      <View style={styles.itemContent}>
                        <Text style={[
                          styles.itemName,
                          isSelected && styles.itemNameSelected
                        ]}>
                          {getItemName(item)}
                        </Text>
                        {isSelected && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
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
    maxHeight: '85%',
    minHeight: 400,
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
    fontSize: 20,
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
  itemContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemContainerSelected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  itemNameSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: '#4CAF50',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});