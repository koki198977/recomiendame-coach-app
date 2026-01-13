import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChapiService from '../services/chapiService';
import { ChapiMessage, ChapiAction } from '../types/nutrition';

interface ChapiChatModalProps {
  visible: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'chapiMessages';

export const ChapiChatModal: React.FC<ChapiChatModalProps> = ({ visible, onClose }) => {
  const [messages, setMessages] = useState<ChapiMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Cargar mensajes al abrir el modal
  useEffect(() => {
    if (visible) {
      loadMessages();
    }
  }, [visible]);

  // Scroll automático cuando hay nuevos mensajes
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      setIsSyncing(true);
      
      // Cargar mensajes locales primero
      const localMessages = await AsyncStorage.getItem(STORAGE_KEY);
      if (localMessages) {
        setMessages(JSON.parse(localMessages));
      }

      // Intentar sincronizar con el backend
      try {
        const backendMessages = await ChapiService.getConversationHistory();
        if (backendMessages.length > 0) {
          setMessages(backendMessages);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(backendMessages));
        }
      } catch (error) {
        console.log('No se pudo sincronizar con el backend, usando mensajes locales');
      }

      // Si no hay mensajes, mostrar mensaje de bienvenida
      if (!localMessages || JSON.parse(localMessages).length === 0) {
        const welcomeMessage: ChapiMessage = {
          id: ChapiService.generateMessageId(),
          sender: 'chapi',
          content: '¡Hola! Soy Chapi, tu asistente de acompañamiento emocional 🧠\n\nEstoy aquí para ayudarte a entender y mejorar tu bienestar. Cuéntame, ¿cómo te sientes hoy?',
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([welcomeMessage]));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const saveMessages = async (newMessages: ChapiMessage[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChapiMessage = {
      id: ChapiService.generateMessageId(),
      sender: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
      emotionalState: ChapiService.classifyEmotionalState(inputText),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    // Guardar mensaje del usuario
    await saveMessages(updatedMessages);

    try {
      // Enviar mensaje a Chapi
      const response = await ChapiService.sendMessage(userMessage.content);
      
      console.log('📨 Respuesta recibida:', response);

      // Convertir acciones del backend a formato ChapiAction
      const actions = ChapiService.convertBackendActions(response.actions);

      // Construir el contenido del mensaje solo con el advice (sin mostrar el estado emocional)
      let messageContent = response.advice;

      const chapiMessage: ChapiMessage = {
        id: ChapiService.generateMessageId(),
        sender: 'chapi',
        content: messageContent,
        timestamp: new Date().toISOString(),
        emotionalState: response.emotion?.toLowerCase() as any,
        suggestedActions: actions,
      };

      console.log('💬 Mensaje de Chapi creado:', chapiMessage);

      const finalMessages = [...updatedMessages, chapiMessage];
      setMessages(finalMessages);
      await saveMessages(finalMessages);

    } catch (error) {
      console.error('❌ Error sending message to Chapi:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje. Verifica tu conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  const openYouTubeUrl = async (url: string) => {
    try {
      console.log('🎬 Intentando abrir YouTube URL:', url);
      
      // Diferentes formatos de URL para probar
      const urlsToTry = [
        url, // URL original
        url.replace('https://www.youtube.com/watch?v=', 'youtube://watch?v='), // App de YouTube
        url.replace('https://www.youtube.com/watch?v=', 'vnd.youtube://watch?v='), // Esquema alternativo
        url, // Fallback al original
      ];
      
      for (const testUrl of urlsToTry) {
        try {
          console.log('🧪 Probando URL:', testUrl);
          const canOpen = await Linking.canOpenURL(testUrl);
          console.log('🧪 ¿Se puede abrir?', canOpen);
          
          if (canOpen) {
            await Linking.openURL(testUrl);
            console.log('✅ URL abierta exitosamente:', testUrl);
            return true;
          }
        } catch (error) {
          console.log('❌ Error con URL:', testUrl, error);
          continue;
        }
      }
      
      // Si ninguna funcionó, mostrar error
      throw new Error('No se pudo abrir ningún formato de URL');
      
    } catch (error) {
      console.error('❌ Error general abriendo YouTube:', error);
      Alert.alert(
        'Error',
        'No se pudo abrir el video de YouTube. Verifica que tengas la app instalada o conexión a internet.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };
  const handleActionPress = (action: ChapiAction) => {
    console.log('🎯 Acción presionada:', action);
    
    const buttons: Array<{
      text: string;
      style?: 'cancel' | 'destructive' | 'default';
      onPress?: () => void;
    }> = [
      { text: 'Ahora no', style: 'cancel' },
    ];

    // Si tiene URL de YouTube, agregar botón para ver video
    if (action.youtubeUrl) {
      buttons.push({
        text: '📺 Ver video',
        onPress: () => openYouTubeUrl(action.youtubeUrl!),
      });
    }

    // Botón para ayuda con texto
    buttons.push({
      text: 'Sí, ayúdame',
      onPress: () => {
        setInputText(`Ayúdame con: ${action.label}`);
      },
    });

    Alert.alert(
      action.label,
      `${action.description}${action.duration ? `\n\nDuración: ${action.duration} minutos` : ''}\n\n¿Cómo te gustaría proceder?`,
      buttons
    );
  };

  const renderMessage = (message: ChapiMessage) => {
    const isUser = message.sender === 'user';

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.chapiBubble,
        ]}
      >
        {!isUser && <Text style={styles.chapiName}>Chapi</Text>}
        
        <Text style={[styles.messageText, isUser && styles.userText]}>
          {message.content}
        </Text>

        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>Acciones sugeridas:</Text>
            {message.suggestedActions.map((action) => {
              // Log para debug
              console.log('Renderizando acción:', {
                id: action.id,
                label: action.label,
                youtubeUrl: action.youtubeUrl,
                hasYouTubeUrl: !!action.youtubeUrl
              });
              
              return (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.actionButton,
                    action.youtubeUrl && styles.actionButtonWithVideo
                  ]}
                  onPress={() => handleActionPress(action)}
                >
                  <Text style={[
                    styles.actionButtonText,
                    action.youtubeUrl && styles.actionButtonTextWithVideo
                  ]}>
                    {action.youtubeUrl && '📺 '}
                    {action.label}
                    {action.duration && ` (${action.duration} min)`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
          {new Date(message.timestamp).toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.bottom}
      >
        <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.chapiAvatar}>
              <Image 
                source={require('../assets/chapi-3d.png')}
                style={styles.chapiAvatarImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.headerTitle}>Chapi</Text>
              <Text style={styles.headerSubtitle}>
                {isSyncing ? 'Sincronizando...' : 'Tu asistente emocional'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <React.Fragment key={message.id}>
              {renderMessage(message)}
            </React.Fragment>
          ))}

          {isLoading && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.loadingText}>Chapi está escribiendo...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input - Fixed at bottom */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe cómo te sientes..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  modalContainer: {
    height: '80%',
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 40,
  },
  chapiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
  },
  chapiAvatarImage: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
    borderBottomRightRadius: 4,
  },
  chapiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chapiName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },
  userText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  actionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  actionButtonWithVideo: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  actionButtonTextWithVideo: {
    color: '#1565C0',
    fontWeight: '600',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 90,
    marginRight: 8,
    color: '#000',
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#fff',
  },
});
