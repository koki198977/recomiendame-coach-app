import React, { useState, useEffect } from 'react';
import { MealLog } from '../types/nutrition';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import api from '../services/api';
import { NutritionService } from '../services/nutritionService';
import { SocialService } from '../services/socialService';
import { FoodPhotoStreakService } from '../services/foodPhotoStreakService';
import { NotificationService } from '../services/notificationService';
import CacheService from '../services/cacheService';
import { COLORS } from '../theme/theme';

interface LogMealModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingMeals?: MealLog[];
}

export const LogMealModal: React.FC<LogMealModalProps> = ({
  visible,
  onClose,
  onSuccess,
  existingMeals = [],
}) => {
  const [selectedSlot, setSelectedSlot] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('LUNCH');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [inputMethod, setInputMethod] = useState<'photo' | 'text' | 'audio'>('photo');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [textDescription, setTextDescription] = useState<string>('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzed, setAnalyzed] = useState<any>(null);

  const scrollViewRef = React.useRef<ScrollView>(null);

  const slots = [
    { value: 'BREAKFAST', label: '🌅 Desayuno', emoji: '🌅' },
    { value: 'LUNCH', label: '☀️ Almuerzo', emoji: '☀️' },
    { value: 'DINNER', label: '🌙 Cena', emoji: '🌙' },
    { value: 'SNACK', label: '🥜 Snack', emoji: '🥜' },
  ];

  // Generar últimos 7 días (incluyendo hoy)
  const getLast7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      return `${days[date.getDay()]} ${date.getDate()}`;
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso al micrófono.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Configuración de grabación compatible con servicios de transcripción
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      
      setRecording(recording);
      setIsRecording(true);
      
      console.log('🎤 Recording started with format:', Platform.OS === 'ios' ? 'M4A (AAC)' : 'M4A');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'No se pudo iniciar la grabación');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const playAudio = async () => {
    if (!audioUri) return;

    try {
      // Si ya hay un sonido reproduciéndose, detenerlo
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);

      // Escuchar cuando termine la reproducción
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (err) {
      console.error('Failed to play audio', err);
      Alert.alert('Error', 'No se pudo reproducir el audio');
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };

  const deleteAudio = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    setAudioUri(null);
    setIsPlaying(false);
  };

  // Limpiar el sonido cuando se cierre el modal
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setAnalyzed(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setAnalyzed(null);
    }
  };

  const handleAnalyze = async () => {
    let description = '';
    let imageUrl = '';

    try {
      setUploading(true);

      // Procesar según el método de entrada
      if (inputMethod === 'photo' && imageUri) {
        // Subir imagen
        const uploadResult = await SocialService.uploadImage(imageUri);
        imageUrl = uploadResult.url;
      } else if (inputMethod === 'text' && textDescription.trim()) {
        description = textDescription.trim();
      } else if (inputMethod === 'audio' && audioUri) {
        // Subir audio y transcribir
        
        // Detectar la extensión del archivo
        const uriParts = audioUri.split('.');
        const fileExtension = uriParts[uriParts.length - 1].toLowerCase();
        
        // Mapear extensión a tipo MIME
        const mimeTypes: { [key: string]: string } = {
          'm4a': 'audio/m4a',
          'mp4': 'audio/mp4',
          'mp3': 'audio/mp3',
          'wav': 'audio/wav',
          'ogg': 'audio/ogg',
        };
        
        const mimeType = mimeTypes[fileExtension] || 'audio/m4a';
        const fileName = `audio.${fileExtension}`;
        
        console.log('📤 Preparing audio upload:', { 
          uri: audioUri, 
          type: mimeType, 
          name: fileName,
          extension: fileExtension 
        });
        
        const formData = new FormData();
        formData.append('audio', {
          uri: audioUri,
          type: mimeType,
          name: fileName,
        } as any);

        console.log('📦 FormData created, sending to backend...');

        try {
          const transcriptionResponse = await api.post('/meals/transcribe-audio', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          description = transcriptionResponse.data.transcription || transcriptionResponse.data.text || '';
          
          console.log('✅ Audio transcribed:', description);
          
          if (!description) {
            Alert.alert('Error', 'No se pudo transcribir el audio. Intenta de nuevo.');
            setUploading(false);
            return;
          }
        } catch (transcribeError: any) {
          console.error('❌ Error transcribing audio:', transcribeError);
          console.error('Error response:', transcribeError.response?.data);
          console.error('Error status:', transcribeError.response?.status);
          
          let errorMessage = 'No se pudo transcribir el audio. Intenta con texto o foto.';
          if (transcribeError.response?.data?.message) {
            errorMessage = transcribeError.response.data.message;
          }
          
          Alert.alert('Error de transcripción', errorMessage);
          setUploading(false);
          return;
        }
      } else {
        Alert.alert('Error', 'Proporciona una foto, descripción o audio primero');
        setUploading(false);
        return;
      }
      
      setUploading(false);
      setAnalyzing(true);
      
      // Analizar con IA
      const result = await NutritionService.analyzeMeal(imageUrl, description);
      
      setAnalyzed({
        ...result,
        imageUrl: imageUrl || undefined,
      });
    } catch (error) {
      console.error('Error analyzing meal:', error);
      Alert.alert('Error', 'No se pudo analizar la comida. Intenta de nuevo.');
    } finally {
      setAnalyzing(false);
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!analyzed) return;

    try {
      // Formatear fecha para el backend (YYYY-MM-DD)
      const dateStr = selectedDate.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      const isToday = dateStr === todayStr;
      
      const mealData: any = {
        slot: selectedSlot,
        title: analyzed.title,
        kcal: analyzed.kcal,
        protein_g: analyzed.protein_g,
        carbs_g: analyzed.carbs_g,
        fat_g: analyzed.fat_g,
        notes: analyzed.notes,
        imageUrl: analyzed.imageUrl,
      };

      // Solo agregar fecha si NO es hoy
      if (!isToday) {
        mealData.date = dateStr;
      }

      console.log('💾 Saving meal with data:', mealData);
      console.log('📅 Is today?', isToday, '| Selected:', dateStr, '| Today:', todayStr);
      
      const response = await NutritionService.logMeal(mealData);
      
      console.log('✅ Meal saved successfully:', response);

      // Limpiar cache de progreso para que el dashboard se actualice
      await CacheService.clearProgressCache();
      console.log('🔄 Progress cache cleared after saving meal');

      // Si existe una comida planificada para este mismo slot, la eliminamos (reemplazo)
      const plannedMeal = existingMeals.find(
        meal => meal.slot === selectedSlot && meal.fromPlan
      );

      if (plannedMeal) {
        console.log('Replacing planned meal:', plannedMeal.id);
        try {
          await NutritionService.deleteMealLog(plannedMeal.id);
        } catch (err) {
          console.warn('Could not delete replaced meal:', err);
        }
      }

      // Actualizar racha de fotos de comida solo si es hoy y tiene foto
      if (isToday && analyzed.imageUrl) {
        try {
          console.log('🔄 Updating food photo streak...');
          const { streakData, achievementsUnlocked } = await FoodPhotoStreakService.updateStreakAfterPhotoUpload();
          
          console.log('📊 Streak updated:', streakData);
          console.log('🏆 Achievements unlocked:', achievementsUnlocked);
          
          // Enviar notificación si se completó la racha del día
          if (streakData.todayPhotos >= 3) {
            await NotificationService.sendStreakNotification(streakData.currentStreak, streakData.todayPhotos);
            
            const streakAchievement = achievementsUnlocked.find(a => a.id === 'food_photo_streak_3');
            if (streakAchievement) {
              Alert.alert(
                '🔥 ¡Racha completada!',
                `Has subido 3 fotos hoy. ¡Sigue así para mantener tu racha de ${streakData.currentStreak} días!`,
                [{ text: '¡Genial!' }]
              );
            }
          }

          // Enviar notificaciones para logros desbloqueados
          for (const achievement of achievementsUnlocked) {
            await NotificationService.sendAchievementNotification(achievement);
            
            // Mostrar alert solo para logros que no sean la racha diaria
            if (achievement.id !== 'food_photo_streak_3') {
              Alert.alert(
                '🏆 ¡Logro desbloqueado!',
                `${achievement.icon} ${achievement.title}: ${achievement.description}`,
                [{ text: '¡Increíble!' }]
              );
            }
          }
        } catch (streakError) {
          console.log('Error updating food photo streak:', streakError);
          // No mostrar error al usuario, la comida se guardó correctamente
        }
      }

      // Cerrar automáticamente sin alert
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('❌ Error logging meal:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      let errorMessage = 'No se pudo registrar la comida.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const handleClose = () => {
    // Limpiar audio si existe
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
    setImageUri(null);
    setTextDescription('');
    setAudioUri(null);
    setIsPlaying(false);
    setAnalyzed(null);
    setSelectedDate(new Date());
    setInputMethod('photo');
    onClose();
  };

  const renderModalContent = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.chapiContainer}>
            <Image 
              source={require('../assets/chapi-3d-foto-alimento.png')}
              style={styles.chapiImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>Registrar Comida</Text>
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Date selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>¿Qué día?</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datesContainer}
        >
          {getLast7Days().map((date, index) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateButton,
                  isSelected && styles.dateButtonActive,
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[
                  styles.dateText,
                  isSelected && styles.dateTextActive,
                ]}>
                  {formatDateLabel(date)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Slot selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>¿Qué comida es?</Text>
        <View style={styles.slotsContainer}>
          {slots.map((slot) => (
            <TouchableOpacity
              key={slot.value}
              style={[
                styles.slotButton,
                selectedSlot === slot.value && styles.slotButtonActive,
              ]}
              onPress={() => setSelectedSlot(slot.value as any)}
            >
              <Text style={styles.slotEmoji}>{slot.emoji}</Text>
              <Text
                style={[
                  styles.slotText,
                  selectedSlot === slot.value && styles.slotTextActive,
                ]}
              >
                {slot.label.replace(slot.emoji + ' ', '')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Input method selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>¿Cómo quieres registrarla?</Text>
        <View style={styles.inputMethodContainer}>
          <TouchableOpacity
            style={[
              styles.inputMethodButton,
              inputMethod === 'photo' && styles.inputMethodButtonActive,
            ]}
            onPress={() => setInputMethod('photo')}
          >
            <Text style={styles.inputMethodIcon}>📷</Text>
            <Text style={[
              styles.inputMethodText,
              inputMethod === 'photo' && styles.inputMethodTextActive,
            ]}>
              Foto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.inputMethodButton,
              inputMethod === 'text' && styles.inputMethodButtonActive,
            ]}
            onPress={() => setInputMethod('text')}
          >
            <Text style={styles.inputMethodIcon}>✍️</Text>
            <Text style={[
              styles.inputMethodText,
              inputMethod === 'text' && styles.inputMethodTextActive,
            ]}>
              Texto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.inputMethodButton,
              inputMethod === 'audio' && styles.inputMethodButtonActive,
            ]}
            onPress={() => setInputMethod('audio')}
          >
            <Text style={styles.inputMethodIcon}>🎤</Text>
            <Text style={[
              styles.inputMethodText,
              inputMethod === 'audio' && styles.inputMethodTextActive,
            ]}>
              Audio
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Input content based on method */}
      <View style={styles.section}>
        {inputMethod === 'photo' && (
          <>
            <Text style={styles.sectionTitle}>Foto de la comida</Text>
            {imageUri ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: imageUri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                  <Text style={styles.imageButtonIcon}>📷</Text>
                  <Text style={styles.imageButtonText}>Tomar foto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                  <Text style={styles.imageButtonIcon}>🖼️</Text>
                  <Text style={styles.imageButtonText}>Galería</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {inputMethod === 'text' && (
          <>
            <Text style={styles.sectionTitle}>Describe lo que comiste</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Ensalada de pollo con aguacate, arroz integral..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={textDescription}
              onChangeText={setTextDescription}
              textAlignVertical="top"
            />
          </>
        )}

        {inputMethod === 'audio' && (
          <>
            <Text style={styles.sectionTitle}>Graba un audio</Text>
            <View style={styles.audioContainer}>
              {!audioUri ? (
                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    isRecording && styles.recordButtonActive,
                  ]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <Text style={styles.recordButtonIcon}>
                    {isRecording ? '⏹️' : '🎤'}
                  </Text>
                  <Text style={styles.recordButtonText}>
                    {isRecording ? 'Detener grabación' : 'Iniciar grabación'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.audioPreviewContainer}>
                  <View style={styles.audioPreview}>
                    <View style={styles.audioPreviewLeft}>
                      <Text style={styles.audioPreviewIcon}>🎵</Text>
                      <Text style={styles.audioPreviewText}>Audio grabado</Text>
                    </View>
                  </View>
                  
                  <View style={styles.audioControls}>
                    <TouchableOpacity
                      style={[styles.audioControlButton, styles.playButton]}
                      onPress={isPlaying ? stopAudio : playAudio}
                    >
                      <Text style={styles.audioControlIcon}>
                        {isPlaying ? '⏸️' : '▶️'}
                      </Text>
                      <Text style={styles.audioControlText}>
                        {isPlaying ? 'Pausar' : 'Escuchar'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.audioControlButton, styles.rerecordButton]}
                      onPress={deleteAudio}
                    >
                      <Text style={styles.audioControlIcon}>🔄</Text>
                      <Text style={styles.audioControlText}>Grabar de nuevo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Analyze button */}
      {((inputMethod === 'photo' && imageUri) || 
        (inputMethod === 'text' && textDescription.trim()) ||
        (inputMethod === 'audio' && audioUri)) && !analyzed && (
        <TouchableOpacity
          style={[styles.analyzeButton, (analyzing || uploading) && styles.buttonDisabled]}
          onPress={handleAnalyze}
          disabled={analyzing || uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.analyzeButtonText}>
                {inputMethod === 'audio' ? 'Transcribiendo audio...' : 'Subiendo...'}
              </Text>
            </>
          ) : analyzing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.analyzeButtonText}>Analizando con IA...</Text>
            </>
          ) : (
            <Text style={styles.analyzeButtonText}>🤖 Analizar con IA</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Analysis result */}
      {analyzed && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Análisis de IA</Text>
          <View style={styles.analysisCard}>
            <Text style={styles.analysisTitle}>{analyzed.title}</Text>
            <View style={styles.macrosGrid}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{analyzed.kcal}</Text>
                <Text style={styles.macroLabel}>kcal</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{analyzed.protein_g}g</Text>
                <Text style={styles.macroLabel}>Proteína</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{analyzed.carbs_g}g</Text>
                <Text style={styles.macroLabel}>Carbos</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{analyzed.fat_g}g</Text>
                <Text style={styles.macroLabel}>Grasas</Text>
              </View>
            </View>
            {analyzed.notes && (
              <Text style={styles.analysisNotes}>{analyzed.notes}</Text>
            )}
            <Text style={styles.confidenceBadge}>
              Confianza: {analyzed.confidence === 'high' ? 'Alta ✓' : analyzed.confidence === 'medium' ? 'Media' : 'Baja'}
            </Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>✓ Guardar comida</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent 
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            keyboardDismissMode="interactive"
          >
            {renderModalContent()}
          </ScrollView>
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
    paddingVertical: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    height: '90%',
    width: '95%',
    maxWidth: 550,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chapiContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  chapiImage: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  slotButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  slotEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  slotText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  slotTextActive: {
    color: '#2E7D32',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  imageButton: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  imageButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  imageButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  analyzeButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  analysisCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  analysisNotes: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  confidenceBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  datesContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 70,
    alignItems: 'center',
  },
  dateButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  dateTextActive: {
    color: '#2E7D32',
  },
  inputMethodContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  inputMethodButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputMethodButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  inputMethodIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  inputMethodText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  inputMethodTextActive: {
    color: '#2E7D32',
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    minHeight: 120,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  audioContainer: {
    alignItems: 'center',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    width: '100%',
  },
  recordButtonActive: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  recordButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  recordButtonText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  audioPreviewContainer: {
    width: '100%',
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 12,
  },
  audioPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioPreviewIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  audioPreviewText: {
    fontSize: 15,
    color: '#2E7D32',
    fontWeight: '600',
  },
  audioControls: {
    flexDirection: 'row',
    gap: 10,
  },
  audioControlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  rerecordButton: {
    backgroundColor: '#FF9800',
  },
  audioControlIcon: {
    fontSize: 18,
  },
  audioControlText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  removeAudioButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  removeAudioText: {
    fontSize: 13,
    color: '#F44336',
    fontWeight: '600',
  },
});
