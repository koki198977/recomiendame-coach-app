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
import { Allergy } from '../types/nutrition';

interface AllergiesSelectorProps {
  allergies: Allergy[];
  selectedAllergies: number[];
  customAllergies: string[];
  onToggleAllergy: (allergyId: number) => void;
  onAddCustomAllergy: (allergy: string) => void;
  onRemoveCustomAllergy: (allergy: string) => void;
  onUpdateAllergies: (allergies: Allergy[]) => void;
  compact?: boolean; // Nueva prop para modo compacto
}

export const AllergiesSelector: React.FC<AllergiesSelectorProps> = ({
  allergies,
  selectedAllergies,
  customAllergies,
  onToggleAllergy,
  onAddCustomAllergy,
  onRemoveCustomAllergy,
  onUpdateAllergies,
  compact = false,
}) => {
  const [searchText, setSearchText] = useState('');
  const [newAllergyText, setNewAllergyText] = useState('');
  const [searching, setSearching] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const searchAllergies = async (text: string) => {
    setSearchText(text);
    
    if (text.trim().length > 0) {
      try {
        setSearching(true);
        const response = await NutritionService.getAllergies(text, 20, 0);
        onUpdateAllergies(response.items);
      } catch (error) {
        console.log('Error searching allergies:', error);
      } finally {
        setSearching(false);
      }
    } else {
      // Volver a cargar las comunes
      try {
        const response = await NutritionService.getAllergies('', 8, 0);
        onUpdateAllergies(response.items);
      } catch (error) {
        console.log('Error loading common allergies:', error);
      }
    }
  };

  const handleAddCustomAllergy = async () => {
    if (!newAllergyText.trim()) return;

    const allergyName = newAllergyText.trim().toLowerCase();

    // Verificar si ya existe en las alergias oficiales
    const existingAllergy = allergies.find(a => a.name.toLowerCase() === allergyName);
    if (existingAllergy) {
      if (!selectedAllergies.includes(existingAllergy.id)) {
        onToggleAllergy(existingAllergy.id);
        Alert.alert('Alergia encontrada', `"${existingAllergy.name}" se ha seleccionado.`);
      } else {
        Alert.alert('Ya seleccionada', `"${existingAllergy.name}" ya está seleccionada.`);
      }
      setNewAllergyText('');
      setShowAddForm(false);
      return;
    }

    // Verificar si ya existe en las personalizadas
    const existingCustom = customAllergies.find(a => a.toLowerCase() === allergyName);
    if (existingCustom) {
      Alert.alert('Ya agregada', `"${existingCustom}" ya está en tu lista.`);
      setNewAllergyText('');
      setShowAddForm(false);
      return;
    }

    try {
      // Intentar crear en la base de datos
      const newAllergy = await NutritionService.createAllergy(newAllergyText.trim());
      onUpdateAllergies([...allergies, newAllergy]);
      onToggleAllergy(newAllergy.id);
      Alert.alert('¡Éxito!', `Se agregó "${newAllergy.name}" a la lista.`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        Alert.alert('Alergia ya existe', 'Intenta buscarla en la lista.');
      } else {
        // Agregar como personalizada
        onAddCustomAllergy(newAllergyText.trim());
        Alert.alert('Alergia agregada', 'Se guardó tu alergia personalizada.');
      }
    }
    
    setNewAllergyText('');
    setShowAddForm(false);
  };

  const getSuggestion = () => {
    if (newAllergyText.trim().length < 2) return null;
    
    const searchTerm = newAllergyText.trim().toLowerCase();
    return allergies.find(a => 
      a.name.toLowerCase().includes(searchTerm) && 
      !selectedAllergies.includes(a.id)
    );
  };

  const suggestion = getSuggestion();

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Text style={[styles.title, compact && styles.titleCompact]}>🚫 Alergias alimentarias</Text>
        {!compact && (
          <Text style={styles.subtitle}>Información importante para tu seguridad</Text>
        )}
      </View>

      {/* Alergias personalizadas seleccionadas */}
      {customAllergies.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.selectedLabel}>Mis alergias ({customAllergies.length}):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {customAllergies.map((allergy, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.chip}
                  onPress={() => onRemoveCustomAllergy(allergy)}
                >
                  <Text style={styles.chipText}>{allergy}</Text>
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
            placeholder="Buscar alergias..."
            value={searchText}
            onChangeText={searchAllergies}
            placeholderTextColor="#999"
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => searchAllergies('')}>
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

      {/* Formulario para agregar nueva alergia */}
      {showAddForm && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.addInput}
            placeholder="Nombre de la alergia..."
            value={newAllergyText}
            onChangeText={setNewAllergyText}
            returnKeyType="done"
            onSubmitEditing={handleAddCustomAllergy}
            autoFocus
          />
          
          {/* Sugerencia */}
          {suggestion && (
            <TouchableOpacity 
              style={styles.suggestionContainer}
              onPress={() => {
                onToggleAllergy(suggestion.id);
                setNewAllergyText('');
                setShowAddForm(false);
              }}
            >
              <Text style={styles.suggestionText}>
                💡 ¿Te refieres a "{suggestion.name}"? Toca para seleccionar
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[
              styles.confirmButton,
              !newAllergyText.trim() && styles.confirmButtonDisabled
            ]}
            onPress={handleAddCustomAllergy}
            disabled={!newAllergyText.trim()}
          >
            <Text style={styles.confirmButtonText}>Agregar alergia</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de alergias */}
      <View style={styles.listSection}>
        <Text style={[
          styles.listTitle,
          compact && styles.listTitleCompact
        ]}>
          {searchText ? `Resultados (${allergies.length})` : 'Alergias comunes'}
        </Text>
        
        {searching ? (
          <ActivityIndicator color="#4CAF50" style={styles.loader} />
        ) : (
          <View style={[
            styles.allergiesList,
            compact && styles.allergiesListCompact
          ]}>
            {allergies.map((allergy) => {
              const isSelected = selectedAllergies.includes(allergy.id);
              return (
                <TouchableOpacity
                  key={allergy.id}
                  style={[
                    styles.allergyItem,
                    compact && styles.allergyItemCompact,
                    isSelected && styles.allergyItemSelected
                  ]}
                  onPress={() => onToggleAllergy(allergy.id)}
                >
                  <View style={[
                    styles.allergyContent,
                    compact && styles.allergyContentCompact
                  ]}>
                    <Text style={[
                      styles.allergyText,
                      compact && styles.allergyTextCompact,
                      isSelected && styles.allergyTextSelected
                    ]}>
                      {allergy.name}
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
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  chipRemove: {
    color: '#4CAF50',
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
    backgroundColor: '#FF9800',
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
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 36,
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listSection: {
    flex: 1,
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
  allergiesList: {
    gap: 8,
  },
  allergiesListCompact: {
    gap: 6,
  },
  allergyItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  allergyItemCompact: {
    borderRadius: 8,
  },
  allergyItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#fff',
    borderWidth: 2,
  },
  allergyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  allergyContentCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  allergyText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    fontWeight: '500',
  },
  allergyTextCompact: {
    fontSize: 14,
  },
  allergyTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  checkmark: {
    backgroundColor: '#4CAF50',
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
});