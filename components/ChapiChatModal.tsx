import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
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

  // Manejar apertura del teclado
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

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

      // Construir el contenido del mensaje combinando advice y emotion
      let messageContent = response.advice;
      if (response.emotion && response.emotion !== 'neutral') {
        messageContent = `**Estado emocional detectado: ${response.emotion}**\n\n${response.advice}`;
      }

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

  const handleActionPress = (action: ChapiAction) => {
    Alert.alert(
      action.label,
      `${action.description}\n\n¿Quieres que te ayude a hacer este ejercicio?`,
      [
        { text: 'Ahora no', style: 'cancel' },
        {
          text: 'Sí, ayúdame',
          onPress: () => {
            // En el futuro, esto podría abrir una rutina guiada
            setInputText(`Ayúdame con: ${action.label}`);
          },
        },
      ]
    );
  };

  const renderMessage = (message: ChapiMessage) => {
    const isUser = message.sender === 'user';

    return (
      <View
        key={message.id}
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
            {message.suggestedActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionButton}
                onPress={() => handleActionPress(action)}
              >
                <Text style={styles.actionButtonText}>
                  {action.label}
                  {action.duration && ` (${action.duration} min)`}
                </Text>
              </TouchableOpacity>
            ))}
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
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.chapiAvatar}>
              <Text style={styles.chapiAvatarIcon}>🧠</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Chapi</Text>
              <Text style={styles.headerSubtitle}>
                {isSyncing ? 'Sincronizando...' : 'Tu asistente emocional'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map(renderMessage)}

          {isLoading && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.loadingText}>Chapi está escribiendo...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe cómo te sientes..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading}
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
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    ...Platform.select({
      android: {
        // En Android, dejamos que adjustResize maneje el teclado
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#4CAF50',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chapiAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chapiAvatarIcon: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
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
  actionButtonText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
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
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    fontSize: 24,
    color: '#fff',
  },
});
