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
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SocialService } from '../services/socialService';
import { Post, CreatePostRequest } from '../types/nutrition';

const { width, height } = Dimensions.get('window');

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!caption.trim()) {
      Alert.alert('¡Ups!', 'Escribe algo interesante para compartir ✍️');
      return;
    }

    try {
      setSubmitting(true);
      let finalMediaUrl = '';

      if (selectedImage) {
        setUploading(true);
        try {
          const uploadResult = await SocialService.uploadImage(selectedImage);
          finalMediaUrl = uploadResult.url;
        } catch (uploadError) {
          Alert.alert('Error', 'No pudimos subir tu foto. Inténtalo de nuevo.');
          return;
        } finally {
          setUploading(false);
        }
      }

      const postData: CreatePostRequest = {
        caption: caption.trim(),
        challengeId: null,
        mediaUrl: finalMediaUrl || undefined,
      };

      const newPost = await SocialService.createPost(postData);
      onPostCreated?.(newPost);
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', 'No pudimos publicar tu post.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleClose = () => {
    setCaption('');
    setSelectedImage(null);
    onClose();
  };

  const selectImage = async (useCamera: boolean) => {
    const permission = useCamera 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert('Permisos', 'Necesitamos acceso para poder subir tu foto 📸');
      return;
    }

    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 5], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 5], quality: 0.8 });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la imagen');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            {/* Header con Imagen o Gradiente (Estilo Recetas) */}
            <View style={styles.headerWrapper}>
              <LinearGradient
                colors={['#74B796', '#8BC9A8']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image 
                  source={require('../assets/chapi-3d-post.png')} 
                  style={styles.headerDecoration}
                  resizeMode="contain"
                />
              </LinearGradient>
              
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.headerTitleOverlay}
              />

              <View style={styles.headerContent}>
                <View style={styles.topActions}>
                  <TouchableOpacity style={styles.backButton} onPress={handleClose}>
                    <Ionicons name="chevron-down" size={28} color="#fff" />
                  </TouchableOpacity>
                  
                  <View style={styles.rightActions}>
                    <TouchableOpacity style={styles.headerActionButton} onPress={handleClose}>
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.titleContainer}>
                  <Text style={styles.title}>Comunidad</Text>
                  <Text style={styles.subtitle}>Comparte tu progreso con otros</Text>
                </View>
              </View>
            </View>

            {/* Contenido (Estilo Recetas) */}
            <ScrollView 
              style={styles.content} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.contentInner}
            >
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Tu mensaje</Text>
                <View style={styles.inputCard}>
                  <TextInput
                    style={styles.textInput}
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="¿Qué estás cocinando o entrenando hoy?"
                    multiline
                    placeholderTextColor="#999"
                    maxLength={500}
                  />
                  <Text style={styles.charCount}>{caption.length}/500</Text>
                </View>

                <Text style={styles.sectionLabel}>Imagen (opcional)</Text>
                {!selectedImage ? (
                  <View style={styles.mediaOptions}>
                    <TouchableOpacity style={styles.mediaButton} onPress={() => selectImage(true)}>
                      <Ionicons name="camera" size={28} color="#74B796" />
                      <Text style={styles.mediaButtonText}>Cámara</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.mediaButton} onPress={() => selectImage(false)}>
                      <Ionicons name="images" size={28} color="#8BC9A8" />
                      <Text style={styles.mediaButtonText}>Galería</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.previewCard}>
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removePreview} onPress={() => setSelectedImage(null)}>
                      <Ionicons name="close-circle" size={32} color="#FF5252" />
                    </TouchableOpacity>
                    {uploading && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.uploadingText}>Subiendo...</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.tipsBox}>
                  <Ionicons name="bulb-outline" size={20} color="#74B796" />
                  <Text style={styles.tipsText}>
                    Las publicaciones con fotos inspiran un 40% más a la comunidad.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer fijo (Estilo Recetas) */}
            <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? 34 : 20 }]}>
              <TouchableOpacity 
                style={[styles.publishButton, (!caption.trim() || submitting) && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={submitting || !caption.trim()}
              >
                <LinearGradient
                  colors={caption.trim() ? ['#74B796', '#8BC9A8'] : ['#F5F5F5', '#F5F5F5']}
                  style={styles.publishGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.publishText, !caption.trim() && { color: '#999' }]}>
                      Publicar ahora
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
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
    backgroundColor: '#74B796',
  },
  headerGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDecoration: {
    width: 150,
    height: 150,
    opacity: 0.5,
    position: 'absolute',
    right: -20,
    bottom: 20,
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
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentInner: {
    padding: 20,
    paddingBottom: 40,
  },
  formSection: {
    gap: 15,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E36',
    marginLeft: 5,
  },
  inputCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minHeight: 150,
  },
  textInput: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlignVertical: 'top',
    height: 100,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
  mediaOptions: {
    flexDirection: 'row',
    gap: 15,
  },
  mediaButton: {
    flex: 1,
    height: 90,
    backgroundColor: '#F9F9F9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
    gap: 8,
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  previewCard: {
    width: '100%',
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removePreview: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    marginTop: 10,
    fontWeight: 'bold',
  },
  tipsBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  publishButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#74B796',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  publishGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  disabledButton: {
    elevation: 0,
    shadowOpacity: 0,
  }
});