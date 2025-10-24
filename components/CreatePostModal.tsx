import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SocialService } from '../services/socialService';
import { Post, CreatePostRequest } from '../types/nutrition';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated?: (post: Post) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onPostCreated,
}) => {
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!caption.trim()) {
      Alert.alert('Error', 'Por favor escribe algo para compartir');
      return;
    }

    try {
      setSubmitting(true);

      const postData: CreatePostRequest = {
        caption: caption.trim(),
        challengeId: null,
      };

      if (mediaUrl.trim()) {
        postData.mediaUrl = mediaUrl.trim();
      }

      const newPost = await SocialService.createPost(postData);
      
      // Cerrar modal inmediatamente y actualizar feed
      onPostCreated?.(newPost);
      handleClose();
      
      // Mostrar toast de éxito (opcional, sin bloquear el flujo)
      setTimeout(() => {
        Alert.alert('¡Éxito! 🎉', 'Tu post ha sido publicado exitosamente');
      }, 300);
    } catch (error: any) {
      console.log('Error creating post:', error);
      Alert.alert('Error', 'No se pudo crear el post. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCaption('');
    setMediaUrl('');
    onClose();
  };

  const addSampleImage = () => {
    // Agregar una imagen de ejemplo de Picsum
    const randomId = Math.floor(Math.random() * 1000);
    setMediaUrl(`https://picsum.photos/1080/1350?random=${randomId}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <LinearGradient
            colors={['#4CAF50', '#45A049']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <Text style={styles.title}>✨ Crear Post</Text>
              <Text style={styles.subtitle}>Comparte tu progreso con la comunidad</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              {/* Caption */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>¿Qué quieres compartir?</Text>
                <TextInput
                  style={styles.textArea}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Comparte tu progreso, logros, recetas o motivación..."
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#999"
                  maxLength={500}
                />
                <Text style={styles.characterCount}>
                  {caption.length}/500 caracteres
                </Text>
              </View>

              {/* Imagen */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Imagen (opcional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={mediaUrl}
                  onChangeText={setMediaUrl}
                  placeholder="URL de la imagen"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity style={styles.sampleButton} onPress={addSampleImage}>
                  <Text style={styles.sampleButtonText}>📷 Agregar imagen de ejemplo</Text>
                </TouchableOpacity>
              </View>

              {/* Preview de imagen */}
              {mediaUrl.trim() && (
                <View style={styles.imagePreview}>
                  <Text style={styles.previewLabel}>Vista previa:</Text>
                  <Image 
                    source={{ uri: mediaUrl }} 
                    style={styles.previewImage}
                    onError={() => {
                      Alert.alert('Error', 'No se pudo cargar la imagen. Verifica la URL.');
                      setMediaUrl('');
                    }}
                  />
                </View>
              )}

              {/* Sugerencias */}
              <View style={styles.suggestions}>
                <Text style={styles.suggestionsTitle}>💡 Ideas para tu post:</Text>
                <TouchableOpacity 
                  style={styles.suggestionItem}
                  onPress={() => setCaption('¡Día 3 del desafío, a full! 💪 #VidasSaludable #Motivación')}
                >
                  <Text style={styles.suggestionText}>💪 Progreso de desafío</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.suggestionItem}
                  onPress={() => setCaption('¡Meta alcanzada! 🎯 Cada pequeño paso cuenta 🌟')}
                >
                  <Text style={styles.suggestionText}>🎯 Logro personal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.suggestionItem}
                  onPress={() => setCaption('Receta saludable del día 🥗 ¡Deliciosa y nutritiva!')}
                >
                  <Text style={styles.suggestionText}>🥗 Receta saludable</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.submitButton, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !caption.trim()}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Publicar</Text>
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
    maxHeight: '90%',
    minHeight: 600,
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
  form: {
    paddingBottom: 20,
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    height: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  sampleButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  sampleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  imagePreview: {
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  suggestions: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  suggestionItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
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
  submitButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: '#4CAF50',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});