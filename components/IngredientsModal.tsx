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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WeeklyPlanIngredient } from '../types/nutrition';

const { width } = Dimensions.get('window');

interface IngredientsModalProps {
  visible: boolean;
  onClose: () => void;
  ingredients: (WeeklyPlanIngredient | string)[];
  mealTitle: string;
  instructions?: string; // Instrucciones de preparación
  videoUrl?: string; // URL de YouTube
}

type TabType = 'ingredients' | 'preparation';

export const IngredientsModal: React.FC<IngredientsModalProps> = ({
  visible,
  onClose,
  ingredients,
  mealTitle,
  instructions,
  videoUrl,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ingredients');

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

  // Parsear las instrucciones (asumiendo que vienen numeradas como "1. ... 2. ...")
  const parseInstructions = (instructionsText?: string): string[] => {
    if (!instructionsText) return [];
    
    // Dividir por números seguidos de punto y espacio
    const steps = instructionsText.split(/\d+\.\s+/).filter(step => step.trim().length > 0);
    return steps;
  };

  const instructionSteps = parseInstructions(instructions);

  // Extraer ID del video de YouTube y duración estimada
  const getYouTubeVideoId = (url?: string): string | null => {
    if (!url) return null;
    
    // Soportar varios formatos de URL de YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // ID directo
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  };

  const videoId = getYouTubeVideoId(videoUrl);

  const handleOpenVideo = async () => {
    // Si hay videoUrl específica, usarla
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
      // Si no hay videoUrl, buscar en YouTube usando el título
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
          {/* Header con gradiente */}
          <LinearGradient
            colors={['#4CAF50', '#81C784']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <Text style={styles.title}>🥘 {mealTitle}</Text>
              <Text style={styles.subtitle}>Detalles de la receta</Text>
            </View>
            
            <View style={styles.headerActions}>
              {/* Botón de YouTube */}
              <TouchableOpacity 
                style={styles.youtubeButton} 
                onPress={handleOpenVideo}
              >
                <Text style={styles.youtubeIcon}>▶️</Text>
              </TouchableOpacity>
              
              {/* Botón de cerrar */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'ingredients' && styles.tabActive]}
              onPress={() => setActiveTab('ingredients')}
            >
              <Text style={[styles.tabText, activeTab === 'ingredients' && styles.tabTextActive]}>
                🥬 Ingredientes
              </Text>
              {activeTab === 'ingredients' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'preparation' && styles.tabActive]}
              onPress={() => setActiveTab('preparation')}
            >
              <Text style={[styles.tabText, activeTab === 'preparation' && styles.tabTextActive]}>
                👨‍🍳 Preparación
              </Text>
              {activeTab === 'preparation' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'ingredients' ? (
              // Tab de Ingredientes
              ingredients && ingredients.length > 0 ? (
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
                <View style={styles.noContentContainer}>
                  <Text style={styles.noContentText}>
                    No hay ingredientes especificados para esta comida
                  </Text>
                </View>
              )
            ) : activeTab === 'preparation' ? (
              // Tab de Preparación
              instructionSteps.length > 0 ? (
                <View style={styles.instructionsList}>
                  {instructionSteps.map((step, index) => (
                    <View key={index} style={styles.instructionItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.instructionText}>{step.trim()}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noContentContainer}>
                  <Text style={styles.noContentText}>
                    No hay instrucciones de preparación disponibles
                  </Text>
                </View>
              )
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.actionButton} onPress={onClose}>
              <LinearGradient
                colors={['#4CAF50', '#45A049']}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.actionButtonText}>Cerrar</Text>
              </LinearGradient>
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
    minHeight: 400,
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
  },
  headerContent: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  youtubeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  youtubeIcon: {
    fontSize: 18,
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
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
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#4CAF50',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  
  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  
  // Ingredientes
  ingredientsList: {
    paddingVertical: 20,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
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
  
  // Instrucciones
  instructionsList: {
    paddingVertical: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  
  // Empty states
  noContentContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  noContentText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});