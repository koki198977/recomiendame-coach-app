import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Linking,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WeeklyPlanIngredient } from '../types/nutrition';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface IngredientsModalProps {
  visible: boolean;
  onClose: () => void;
  ingredients: (WeeklyPlanIngredient | string)[];
  mealTitle: string;
  instructions?: string;
  videoUrl?: string;
  loading?: boolean;
  // Nuevos props nutricionales
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  imageUrl?: string;
}

type TabType = 'ingredients' | 'preparation';

export const IngredientsModal: React.FC<IngredientsModalProps> = ({
  visible,
  onClose,
  ingredients,
  mealTitle,
  instructions,
  videoUrl,
  loading = false,
  kcal,
  protein_g,
  carbs_g,
  fat_g,
  imageUrl,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ingredients');

  const formatIngredient = (ingredient: WeeklyPlanIngredient | string): string => {
    if (typeof ingredient === 'string') {
      return ingredient;
    } else {
      let display = ingredient.name;
      const quantity = ingredient.qty || ingredient.quantity;
      if (quantity && ingredient.unit) {
        display += ` (${quantity} ${ingredient.unit})`;
      }
      return display;
    }
  };

  const parseInstructions = (instructionsText?: string): string[] => {
    if (!instructionsText) return [];
    const steps = instructionsText.split(/\d+\.\s+/).filter(step => step.trim().length > 0);
    return steps;
  };

  const instructionSteps = parseInstructions(instructions);

  // Prioridad a la imagen del backend. Si no existe, el componente mostrará el gradiente de respaldo definido en el render.
  const finalImageUrl = imageUrl && imageUrl.length > 0 ? imageUrl : null;

  const handleOpenVideo = async () => {
    if (videoUrl) {
      try {
        const canOpen = await Linking.canOpenURL(videoUrl);
        if (canOpen) {
          await Linking.openURL(videoUrl);
        } else {
          Alert.alert('Error', 'No se puede abrir el video');
        }
      } catch (error) {
        Alert.alert('Error', 'No se pudo abrir el video');
      }
    } else {
      const searchQuery = encodeURIComponent(`${mealTitle} receta como preparar`);
      const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
      try {
        const canOpen = await Linking.canOpenURL(youtubeSearchUrl);
        if (canOpen) {
          await Linking.openURL(youtubeSearchUrl);
        } else {
          Alert.alert('Error', 'No se puede abrir YouTube');
        }
      } catch (error) {
        Alert.alert('Error', 'No se pudo abrir YouTube');
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header con Imagen o Gradiente */}
          <View style={styles.headerWrapper}>
            {finalImageUrl ? (
              <Image source={{ uri: finalImageUrl }} style={styles.headerImage} />
            ) : (
              <LinearGradient
                colors={['#4CAF50', '#81C784']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}
            
            {/* Overlay para legibilidad del título */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.headerTitleOverlay}
            />

            <View style={styles.headerContent}>
              <View style={styles.topActions}>
                <TouchableOpacity style={styles.backButton} onPress={onClose}>
                  <Ionicons name="chevron-down" size={28} color="#fff" />
                </TouchableOpacity>
                
                <View style={styles.rightActions}>
                  <TouchableOpacity style={styles.headerActionButton} onPress={handleOpenVideo}>
                    <Ionicons name="play-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.headerActionButton} onPress={onClose}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.titleContainer}>
                <Text style={styles.title}>{mealTitle}</Text>
                <Text style={styles.subtitle}>Receta personalizada para ti</Text>
              </View>
            </View>
          </View>

          {/* Sección de Macros Nutricionales */}
          <View style={styles.macrosSection}>
            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{kcal || 0}</Text>
              <Text style={styles.macroLabel}>Kcal</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{protein_g || 0}g</Text>
              <Text style={styles.macroLabel}>Prot</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{carbs_g || 0}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{fat_g || 0}g</Text>
              <Text style={styles.macroLabel}>Grasas</Text>
            </View>
          </View>

          {/* Tabs con diseño moderno */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'ingredients' && styles.tabActive]}
              onPress={() => setActiveTab('ingredients')}
            >
              <Text style={[styles.tabText, activeTab === 'ingredients' && styles.tabTextActive]}>
                Ingredientes
              </Text>
              {activeTab === 'ingredients' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'preparation' && styles.tabActive]}
              onPress={() => setActiveTab('preparation')}
            >
              <Text style={[styles.tabText, activeTab === 'preparation' && styles.tabTextActive]}>
                Preparación
              </Text>
              {activeTab === 'preparation' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentInner}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Optimizando receta con IA...</Text>
              </View>
            ) : activeTab === 'ingredients' ? (
              <View style={styles.ingredientsList}>
                {ingredients && ingredients.length > 0 ? (
                  ingredients.map((ingredient, index) => (
                    <View key={index} style={styles.ingredientItem}>
                      <View style={styles.checkContainer}>
                        <Ionicons name="checkmark-circle-outline" size={22} color="#4CAF50" />
                      </View>
                      <Text style={styles.ingredientText}>
                        {formatIngredient(ingredient)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.noContentContainer}>
                    <Ionicons name="nutrition-outline" size={48} color="#E0E0E0" />
                    <Text style={styles.noContentText}>No hay ingredientes especificados</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.instructionsList}>
                {instructionSteps.length > 0 ? (
                  instructionSteps.map((step, index) => (
                    <View key={index} style={styles.instructionItem}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{index + 1}</Text>
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={styles.instructionText}>{step.trim()}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.noContentContainer}>
                    <Ionicons name="list-outline" size={48} color="#E0E0E0" />
                    <Text style={styles.noContentText}>No hay instrucciones disponibles</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer fijo con botón de acción */}
          <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? 34 : 20 }]}>
            <TouchableOpacity style={styles.closeButtonFull} onPress={onClose}>
              <Text style={styles.closeButtonFullText}>Cerrar Detalle</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: height * 0.92,
    width: '100%',
    overflow: 'hidden',
  },
  headerWrapper: {
    height: 220,
    width: '100%',
    position: 'relative',
    backgroundColor: '#4CAF50', // Fondo verde mientras carga la imagen
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    width: '100%',
    height: '100%',
  },
  headerTitleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  headerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  
  // Macros
  macrosSection: {
    flexDirection: 'row',
    backgroundColor: '#F8FBF8',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  macroCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  macroLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroDivider: {
    width: 1,
    height: 25,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    // backgroundColor: '#F1F8E9',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '40%',
    height: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentInner: {
    paddingBottom: 40,
  },
  
  // Ingredientes
  ingredientsList: {
    padding: 20,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  checkContainer: {
    marginRight: 12,
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  
  // Instrucciones
  instructionsList: {
    padding: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    marginTop: 2,
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  instructionText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  
  // Empty states
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#666',
    marginTop: 15,
    fontStyle: 'italic',
  },
  noContentContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 15,
  },
  noContentText: {
    fontSize: 16,
    color: '#CCC',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  closeButtonFull: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeButtonFullText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
});