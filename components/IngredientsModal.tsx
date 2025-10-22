import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WeeklyPlanIngredient } from '../types/nutrition';

const { width } = Dimensions.get('window');

interface IngredientsModalProps {
  visible: boolean;
  onClose: () => void;
  ingredients: (WeeklyPlanIngredient | string)[];
  mealTitle: string;
}

export const IngredientsModal: React.FC<IngredientsModalProps> = ({
  visible,
  onClose,
  ingredients,
  mealTitle,
}) => {


  const formatIngredient = (ingredient: WeeklyPlanIngredient | string): string => {
    if (typeof ingredient === 'string') {
      return ingredient;
    } else {
      let display = ingredient.name;
      // Manejar tanto 'qty' como 'quantity' y ambos con 'unit'
      const quantity = ingredient.qty || ingredient.quantity;
      if (quantity && ingredient.unit) {
        display += ` (${quantity} ${ingredient.unit})`;
      }
      return display;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header con gradiente */}
          <LinearGradient
            colors={['#4CAF50', '#81C784']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <Text style={styles.title}>🥘 Ingredientes</Text>
              <Text style={styles.subtitle}>{mealTitle}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Ingredients List */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Información de debug temporal */}
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                Ingredientes: {ingredients?.length || 0}
              </Text>
            </View>

            {ingredients && ingredients.length > 0 ? (
              <View style={styles.ingredientsList}>
                {ingredients.map((ingredient, index) => (
                  <View key={index} style={styles.ingredientItem}>
                    <View style={styles.ingredientBullet} />
                    <Text style={styles.ingredientText}>
                      {formatIngredient(ingredient)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noIngredientsContainer}>
                <Text style={styles.noIngredientsText}>
                  No hay ingredientes especificados para esta comida
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.actionButton} onPress={onClose}>
              <Text style={styles.actionButtonText}>Cerrar</Text>
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
    maxHeight: '80%',
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
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
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  ingredientsList: {
    paddingVertical: 20,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  ingredientBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginTop: 6,
    marginRight: 15,
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  noIngredientsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noIngredientsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Debug temporal
  debugInfo: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    margin: 10,
    borderRadius: 5,
  },
  debugText: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
});