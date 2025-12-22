import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SocialService } from '../services/socialService';
import { Post, Comment } from '../types/nutrition';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post | null;
  onCommentAdded?: (postId: string, newCommentsCount: number) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  onClose,
  post,
  onCommentAdded,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [totalComments, setTotalComments] = useState(0);

  const COMMENTS_PER_PAGE = 20;

  useEffect(() => {
    if (visible && post) {
      loadComments();
    }
  }, [visible, post]);

  const loadComments = async () => {
    if (!post) return;

    try {
      setLoading(true);
      const response = await SocialService.getComments(post.id, 0, COMMENTS_PER_PAGE);
      setComments(response.items || []);
      setCurrentPage(0);
      setTotalComments(response.total || 0);
      setHasMoreComments((response.items?.length || 0) >= COMMENTS_PER_PAGE);
    } catch (error) {
      console.log('Error loading comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreComments = async () => {
    if (!post || loadingMore || !hasMoreComments) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const skip = nextPage * COMMENTS_PER_PAGE;
      
      const response = await SocialService.getComments(post.id, skip, COMMENTS_PER_PAGE);
      const newComments = response.items || [];
      
      if (newComments.length > 0) {
        setComments(prevComments => [...prevComments, ...newComments]);
        setCurrentPage(nextPage);
        setHasMoreComments(newComments.length >= COMMENTS_PER_PAGE);
        // Actualizar total si es necesario
        if (response.total && response.total > totalComments) {
          setTotalComments(response.total);
        }
      } else {
        setHasMoreComments(false);
      }
    } catch (error) {
      console.log('Error loading more comments:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCommentsScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      loadMoreComments();
    }
  };

  const handleSubmitComment = async () => {
    if (!post || !newComment.trim()) return;

    try {
      setSubmitting(true);
      
      // Optimistic update - agregar comentario inmediatamente
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        body: newComment.trim(),
        createdAt: new Date().toISOString(),
        author: {
          id: 'current-user',
          email: 'Tú'
        }
      };

      setComments(prevComments => [...prevComments, optimisticComment]);
      const commentText = newComment.trim();
      setNewComment('');

      // Crear comentario en el servidor
      await SocialService.createComment(post.id, {
        body: commentText
      });

      // Notificar al componente padre que se agregó un comentario
      const newTotal = totalComments + 1;
      setTotalComments(newTotal);
      onCommentAdded?.(post.id, newTotal);

      // Recargar comentarios para obtener datos correctos del servidor
      setTimeout(() => {
        loadComments();
      }, 500);
      
    } catch (error) {
      console.log('Error creating comment:', error);
      Alert.alert('Error', 'No se pudo enviar el comentario');
      // Recargar comentarios en caso de error
      loadComments();
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Hace unos minutos';
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Hace ${diffInDays}d`;
    }
  };

  const getUserDisplayName = (author: any): string => {
    if (author?.email && author.email.trim()) {
      // Extraer la parte antes del @ y capitalizarla
      const emailPart = author.email.split('@')[0];
      // Capitalizar primera letra y reemplazar puntos/guiones con espacios
      const displayName = emailPart
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      return displayName;
    }
    
    return 'Usuario Anónimo';
  };

  const getUserInitial = (author: any): string => {
    if (author?.email && author.email.trim()) {
      return author.email.charAt(0).toUpperCase();
    }
    
    return '?';
  };

  const handleClose = () => {
    setComments([]);
    setNewComment('');
    setTotalComments(0);
    setCurrentPage(0);
    setHasMoreComments(true);
    onClose();
  };

  if (!post) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
              <Text style={styles.title}>💬 Comentarios</Text>
              <Text style={styles.subtitle}>
                {totalComments} comentario{totalComments !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Post info */}
          <View style={styles.postInfo}>
            <Text style={styles.postCaption} numberOfLines={2}>
              {post.caption}
            </Text>
            <Text style={styles.postAuthor}>
              Por {post.authorName 
                ? getUserDisplayName({email: post.authorName})
                : getUserDisplayName(post.author)
              }
            </Text>
          </View>

          {/* Comments list */}
          <ScrollView 
            style={styles.commentsList} 
            showsVerticalScrollIndicator={false}
            onScroll={handleCommentsScroll}
            scrollEventThrottle={400}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Cargando comentarios...</Text>
              </View>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {getUserInitial(comment.author)}
                      </Text>
                    </View>
                    <View style={styles.commentContent}>
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentAuthor}>
                          {getUserDisplayName(comment.author)}
                        </Text>
                        <Text style={styles.commentTime}>
                          {formatDate(comment.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.commentBody}>{comment.body}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>
                  Sé el primero en comentar 💬
                </Text>
              </View>
            )}
            
            {/* Indicador de carga para más comentarios */}
            {loadingMore && (
              <View style={styles.loadingMoreComments}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.loadingMoreText}>Cargando más comentarios...</Text>
              </View>
            )}
            
            {/* Mensaje cuando no hay más comentarios */}
            {!hasMoreComments && comments.length > 10 && (
              <View style={styles.endOfComments}>
                <Text style={styles.endOfCommentsText}>No hay más comentarios</Text>
              </View>
            )}
          </ScrollView>

          {/* Comment input */}
          <View style={styles.commentInput}>
            <TextInput
              style={styles.textInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Escribe un comentario..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSubmitComment}
              blurOnSubmit={false}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newComment.trim() || submitting) && styles.sendButtonDisabled]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>📤</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
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
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  postInfo: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  postCaption: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  postAuthor: {
    fontSize: 12,
    color: '#666',
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  commentItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  commentHeader: {
    flexDirection: 'row',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentContent: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  commentTime: {
    fontSize: 12,
    color: '#666',
  },
  commentBody: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  commentInput: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    maxHeight: 100,
    marginRight: 10,
    color: '#000',
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
    fontSize: 16,
  },
  loadingMoreComments: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  endOfComments: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  endOfCommentsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});