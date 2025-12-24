import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { NutritionService } from '../services/nutritionService';
import { Condition } from '../types/nutrition';

interface MedicalConditionsSelectorProps {
  conditions: Condition[];
  selectedConditions: number[];
  customConditions: string[];
  onToggleCondition: (conditionId: number) => void;
  onAddCustomCondition: (condition: string) => void;
  onRemoveCustomCondition: (condition: string) => void;
  onUpdateConditions: (conditions: Condition[]) => void;
  compact?: boolean; // Nueva prop para modo compacto
}

export const MedicalConditionsSelector: React.FC<MedicalConditionsSelectorProps> = ({
  conditions,
  selectedConditions,
  customConditions,
  onToggleCondition,
  onAddCustomCondition,
  onRemoveCustomCondition,
  onUpdateConditions,
  compact = false,
}) => {
  const [searchText, setSearchText] = useState('');
  const [newConditionText, setNewConditionText] = useState('');
  const [searching, setSearching] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const searchConditions = async (text: string) => {
    setSearchText(text);
    
    if (text.trim().length > 0) {
      try {
        setSearching(true);
        const response = await NutritionService.getConditions(text, 20, 0);
        onUpdateConditions(response.items);
      } catch (error) {
        console.log('Error searching conditions:', error);
      } finally {
        setSearching(false);
      }
    } else {
      // Volver a cargar las comunes
      try {
        const response = await NutritionService.getConditions('', 8, 0);
        onUpdateConditions(response.items);
      } catch (error) {
        console.log('Error loading common conditions:', error);
      }
    }
  };

  const handleAddCustomCondition = async () => {
    if (!newConditionText.trim()) return;

    const conditionLabel = newConditionText.trim().toLowerCase();

    // Verificar si ya existe en las condiciones oficiales
    const existingCondition = conditions.find(c => c.label.toLowerCase() === conditionLabel);
    if (existingCondition) {
      if (!selectedConditions.includes(existingCondition.id)) {
        onToggleCondition(existingCondition.id);
        Alert.alert('Condición encontrada', `"${existingCondition.label}" se ha seleccionado.`);
      } else {
        Alert.alert('Ya seleccionada', `"${existingCondition.label}" ya está seleccionada.`);
      }
      setNewConditionText('');
      setShowAddForm(false);
      return;
    }

    // Verificar si ya existe en las personalizadas
    const existingCustom = customConditions.find(c => c.toLowerCase() === conditionLabel);
    if (existingCustom) {
      Alert.alert('Ya agregada', `"${existingCustom}" ya está en tu lista.`);
      setNewConditionText('');
      setShowAddForm(false);
      return;
    }

    try {
      // Intentar crear en la base de datos
      const newCondition = await NutritionService.createCondition(newConditionText.trim());
      onUpdateConditions([...conditions, newCondition]);
      onToggleCondition(newCondition.id);
      Alert.alert('¡Éxito!', `Se agregó "${newCondition.label}" a la lista.`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        Alert.alert('Condición ya existe', 'Intenta buscarla en la lista.');
      } else {
        // Agregar como personalizada
        onAddCustomCondition(newConditionText.trim());
        Alert.alert('Condición agregada', 'Se guardó tu condición personalizada.');
      }
    }
    
    setNewConditionText('');
    setShowAddForm(false);
  };

  const getSuggestion = () => {
    if (newConditionText.trim().length < 2) return null;
    
    const searchTerm = newConditionText.trim().toLowerCase();
    return conditions.find(c => 
      c.label.toLowerCase().includes(searchTerm) && 
      !selectedConditions.includes(c.id)
    );
  };

  const suggestion = getSuggestion();

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Text style={[styles.title, compact && styles.titleCompact]}>🏥 Condiciones médicas</Text>
        {!compact && (
          <Text style={styles.subtitle}>Para personalizar tu plan nutricional</Text>
        )}
      </View>

      {/* Condiciones personalizadas seleccionadas */}
      {customConditions.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.selectedLabel}>Mis condiciones ({customConditions.length}):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {customConditions.map((condition, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.chip}
                  onPress={() => onRemoveCustomCondition(condition)}
                >
                  <Text style={styles.chipText}>{condition}</Text>
                  <Text style={styles.chipRemove}>✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Buscador */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar condiciones..."
            value={searchText}
            onChangeText={searchConditions}
            placeholderTextColor="#999"
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => searchConditions('')}>
              <Text style={styles.clearButton}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Botón para agregar nueva */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Text style={styles.addButtonText}>
            {showAddForm ? '✕' : '+'} {showAddForm ? 'Cancelar' : 'Nueva'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Formulario para agregar nueva condición */}
      {showAddForm && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.addInput}
            placeholder="Nombre de la condición..."
            value={newConditionText}
            onChangeText={setNewConditionText}
            returnKeyType="done"
            onSubmitEditing={handleAddCustomCondition}
            autoFocus
          />
          
          {/* Sugerencia */}
          {suggestion && (
            <TouchableOpacity 
              style={styles.suggestionContainer}
              onPress={() => {
                onToggleCondition(suggestion.id);
                setNewConditionText('');
                setShowAddForm(false);
              }}
            >
              <Text style={styles.suggestionText}>
                💡 ¿Te refieres a "{suggestion.label}"? Toca para seleccionar
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[
              styles.confirmButton,
              !newConditionText.trim() && styles.confirmButtonDisabled
            ]}
            onPress={handleAddCustomCondition}
            disabled={!newConditionText.trim()}
          >
            <Text style={styles.confirmButtonText}>Agregar condición</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de condiciones */}
      <View style={styles.listSection}>
        <Text style={[
          styles.listTitle,
          compact && styles.listTitleCompact
        ]}>
          {searchText ? `Resultados (${conditions.length})` : 'Condiciones comunes'}
        </Text>
        
        {searching ? (
          <ActivityIndicator color="#4CAF50" style={styles.loader} />
        ) : (
          <View style={[
            styles.conditionsList,
            compact && styles.conditionsListCompact
          ]}>
            {conditions.map((condition) => {
              const isSelected = selectedConditions.includes(condition.id);
              return (
                <TouchableOpacity
                  key={condition.id}
                  style={[
                    styles.conditionItem,
                    compact && styles.conditionItemCompact,
                    isSelected && styles.conditionItemSelected
                  ]}
                  onPress={() => onToggleCondition(condition.id)}
                >
                  <View style={[
                    styles.conditionContent,
                    compact && styles.conditionContentCompact
                  ]}>
                    <Text style={[
                      styles.conditionText,
                      compact && styles.conditionTextCompact,
                      isSelected && styles.conditionTextSelected
                    ]}>
                      {condition.label}
                    </Text>
                    {isSelected && (
                      <View style={[
                        styles.checkmark,
                        compact && styles.checkmarkCompact
                      ]}>
                        <Text style={[
                          styles.checkmarkText,
                          compact && styles.checkmarkTextCompact
                        ]}>✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Nota informativa - solo mostrar si no está en modo compacto */}
      {!compact && (
        <View style={styles.infoNote}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Esta información nos ayuda a personalizar tus recomendaciones nutricionales. 
            Siempre consulta con tu médico antes de hacer cambios significativos en tu dieta.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  containerCompact: {
    padding: 15,
    marginBottom: 15,
  },
  header: {
    marginBottom: 20,
  },
  headerCompact: {
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 5,
  },
  titleCompact: {
    fontSize: 16,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  selectedSection: {
    marginBottom: 20,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  chipText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  chipRemove: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  clearButton: {
    fontSize: 16,
    color: '#666',
    paddingHorizontal: 5,
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 36,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  addForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  addInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
    minHeight: 36,
  },
  suggestionContainer: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  suggestionText: {
    color: '#2196F3',
    fontSize: 13,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 36,
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(33, 150, 243, 0.5)',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listSection: {
    flex: 1,
    marginBottom: 15,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  listTitleCompact: {
    fontSize: 14,
    marginBottom: 10,
  },
  loader: {
    marginVertical: 20,
  },
  conditionsList: {
    gap: 8,
  },
  conditionsListCompact: {
    gap: 6,
  },
  conditionItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  conditionItemCompact: {
    borderRadius: 8,
  },
  conditionItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#fff',
    borderWidth: 2,
  },
  conditionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  conditionContentCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  conditionText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    fontWeight: '500',
  },
  conditionTextCompact: {
    fontSize: 14,
  },
  conditionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  checkmark: {
    backgroundColor: '#2196F3',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkCompact: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkmarkTextCompact: {
    fontSize: 10,
  },
  infoNote: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    lineHeight: 16,
  },
});