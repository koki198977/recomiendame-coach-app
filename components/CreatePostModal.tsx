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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!caption.trim()) {
      Alert.alert('Error', 'Por favor escribe algo para compartir');
      return;
    }

    try {
      setSubmitting(true);

      let finalMediaUrl = mediaUrl.trim();

      // Si hay una imagen seleccionada, subirla primero
      if (selectedImage) {
        console.log('Uploading selected image...');
        setUploading(true);
        try {
          const uploadResult = await SocialService.uploadImage(selectedImage);
          finalMediaUrl = uploadResult.url;
          console.log('Image uploaded successfully:', finalMediaUrl);
        } catch (uploadError) {
          console.log('Error uploading image:', uploadError);
          Alert.alert('Error', 'No se pudo subir la imagen. Intenta de nuevo.');
          return;
        } finally {
          setUploading(false);
        }
      }

      const postData: CreatePostRequest = {
        caption: caption.trim(),
        challengeId: null,
      };

      if (finalMediaUrl) {
        postData.mediaUrl = finalMediaUrl;
      }

      const newPost = await SocialService.createPost(postData);
      
      // Cerrar modal inmediatamente y actualizar feed (sin alert)
      onPostCreated?.(newPost);
      handleClose();
    } catch (error: any) {
      console.log('Error creating post:', error);
      Alert.alert('Error', 'No se pudo crear el post. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleClose = () => {
    setCaption('');
    setMediaUrl('');
    setSelectedImage(null);
    onClose();
  };

  const addSampleImage = () => {
    // Agregar una imagen de ejemplo de Picsum
    const randomId = Math.floor(Math.random() * 1000);
    setMediaUrl(`https://picsum.photos/1080/1350?random=${randomId}`);
    setSelectedImage(null); // Limpiar imagen seleccionada si se usa URL
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos requeridos',
        'Necesitamos acceso a tu galería para seleccionar imágenes.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const selectImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setMediaUrl('');
      }
    } catch (error) {
      console.log('Error selecting image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos requeridos',
        'Necesitamos acceso a tu cámara para tomar fotos.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setMediaUrl('');
      }
    } catch (error) {
      console.log('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Seleccionar imagen',
      'Elige una opción para agregar una imagen a tu post',
      [
        { text: 'Galería', onPress: selectImageFromGallery },
        { text: 'Cámara', onPress: takePhoto },
        { text: 'Imagen de ejemplo', onPress: addSampleImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const removeImage = () => {
    setSelectedImage(null);
    setMediaUrl('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
                
                {/* Botones de selección de imagen */}
                <View style={styles.imageButtonsContainer}>
                  <TouchableOpacity style={styles.imageButton} onPress={showImageOptions}>
                    <Text style={styles.imageButtonText}>📷 Seleccionar imagen</Text>
                  </TouchableOpacity>
                  
                  {(selectedImage || mediaUrl.trim()) && (
                    <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                      <Text style={styles.removeImageButtonText}>🗑️ Quitar</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Input manual de URL (alternativo) */}
                {!selectedImage && (
                  <View style={styles.urlInputContainer}>
                    <Text style={styles.urlInputLabel}>O ingresa una URL:</Text>
                    <TextInput
                      style={styles.textInput}
                      value={mediaUrl}
                      onChangeText={(text) => {
                        setMediaUrl(text);
                        if (text.trim()) setSelectedImage(null);
                      }}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      placeholderTextColor="#999"
                    />
                  </View>
                )}
              </View>

              {/* Preview de imagen */}
              {(selectedImage || mediaUrl.trim()) && (
                <View style={styles.imagePreview}>
                  <Text style={styles.previewLabel}>Vista previa:</Text>
                  <Image 
                    source={{ uri: selectedImage || mediaUrl }} 
                    style={styles.previewImage}
                    onError={() => {
                      Alert.alert('Error', 'No se pudo cargar la imagen.');
                      if (selectedImage) {
                        setSelectedImage(null);
                      } else {
                        setMediaUrl('');
                      }
                    }}
                  />
                  {uploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="large" color="#4CAF50" />
                      <Text style={styles.uploadingText}>Subiendo imagen...</Text>
                    </View>
                  )}
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
              style={[styles.submitButton, (submitting || uploading) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || uploading || !caption.trim()}
            >
              {submitting || uploading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.loadingText}>
                    {uploading ? 'Subiendo...' : 'Publicando...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Publicar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    color: '#000',
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
    color: '#000',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  imageButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  removeImageButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  removeImageButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  urlInputContainer: {
    marginTop: 10,
  },
  urlInputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
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
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});