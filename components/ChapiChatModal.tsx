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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  StatusBar,
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // Cargar mensajes al abrir el modal
  useEffect(() => {
    if (visible) {
      loadMessages();
      // Sistema más robusto para builds de producción
      const focusInput = () => {
        // Múltiples intentos con diferentes delays - más agresivo para builds
        const delays = [50, 100, 200, 400, 600, 1000, 1500, 2000];
        delays.forEach(delay => {
          setTimeout(() => {
            if (inputRef.current && visible) {
              inputRef.current.focus();
            }
          }, delay);
        });
      };
      focusInput();
    } else {
      // Desenfocar cuando se cierra el modal
      inputRef.current?.blur();
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

  // Scroll cuando aparece el teclado y forzar focus adicional
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        // Si el modal está visible y el teclado se oculta, volver a enfocarlo
        if (visible) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [visible]);

  // Verificar periódicamente si el teclado debería estar visible
  useEffect(() => {
    if (!visible) return;

    const checkKeyboard = setInterval(() => {
      // Si el modal está visible pero el teclado no, intentar enfocarlo
      if (visible && !keyboardVisible && !isLoading) {
        inputRef.current?.focus();
      }
    }, 1000); // Verificar cada 1 segundo (más frecuente para builds)

    return () => clearInterval(checkKeyboard);
  }, [visible, keyboardVisible, isLoading]);

  // Efecto adicional para builds de producción - focus cuando el componente esté completamente montado
  useEffect(() => {
    if (visible) {
      // Esperar a que el layout esté completo y luego enfocar
      const layoutTimeout = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);

      return () => clearTimeout(layoutTimeout);
    }
  }, [visible]);

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
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      onShow={() => {
        // Cuando el modal termine de aparecer, enfocar el input de manera más agresiva para builds
        const focusAttempts = [50, 100, 200, 400, 600, 800, 1200, 1600, 2000];
        focusAttempts.forEach(delay => {
          setTimeout(() => {
            if (inputRef.current && visible) {
              inputRef.current.focus();
            }
          }, delay);
        });
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      <KeyboardAvoidingView
        style={styles.fullScreenContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
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
          keyboardShouldPersistTaps="handled"
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

        {/* Input - Fixed at bottom like Messenger */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {/* Botón de respaldo si el teclado no aparece */}
          {!keyboardVisible && (
            <TouchableOpacity 
              style={styles.keyboardButton}
              onPress={() => inputRef.current?.focus()}
            >
              <Text style={styles.keyboardButtonText}>⌨️ Toca para escribir</Text>
            </TouchableOpacity>
          )}
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Escribe cómo te sientes..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading}
            textAlignVertical="top"
            autoFocus={true}
            blurOnSubmit={false}
            keyboardType="default"
            returnKeyType="default"
            onBlur={() => {
              // Si el modal está visible y el input pierde el foco, volver a enfocarlo más agresivamente
              if (visible && !isLoading) {
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 50);
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 200);
              }
            }}
            onFocus={() => {
              setKeyboardVisible(true);
            }}
            onLayout={() => {
              // Cuando el TextInput termine de renderizarse, enfocarlo
              if (visible && inputRef.current) {
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 100);
              }
            }}
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
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
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
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  keyboardButton: {
    width: '100%',
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
  },
  keyboardButtonText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 90,
    marginRight: 8,
    color: '#000',
    minHeight: 38,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
