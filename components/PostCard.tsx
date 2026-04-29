import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types/nutrition';
import { SocialService } from '../services/socialService';
import { useStoryShare } from '../hooks/useStoryShare';
import { StoryImageView } from './StoryImageView';

interface PostCardProps {
  post: Post;
  onPostUpdate?: (updatedPost: Post) => void;
  onCommentPress?: (post: Post) => void;
  isMyPost?: boolean; // Indica si es del feed "Míos"
  showFollowButton?: boolean; // Mostrar botón seguir
  isFollowingAuthor?: boolean; // Si ya sigo al autor
  onFollowChange?: (authorId: string, isFollowing: boolean) => void; // Callback cuando cambia el seguimiento
  onShare?: (post: Post) => void; // Callback opcional para override externo
  onDelete?: (postId: string) => void; // Callback cuando se elimina un post
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onPostUpdate,
  onCommentPress,
  isMyPost = false,
  showFollowButton = false,
  isFollowingAuthor = false,
  onFollowChange,
  onShare,
  onDelete,
}) => {
  const [isLiking, setIsLiking] = useState(false);
  const [currentPost, setCurrentPost] = useState(post);
  const [isFollowing, setIsFollowing] = useState(isFollowingAuthor);
  const [followingUser, setFollowingUser] = useState(false);
  const { isSharing, handleShare } = useStoryShare();
  const storyViewRef = useRef<View>(null);

  // Sincronizar el estado local cuando el prop cambie
  useEffect(() => {
    setCurrentPost(post);
    console.log('PostCard - Full post data:', post);
  }, [post]);

  // Sincronizar el estado de seguimiento
  useEffect(() => {
    setIsFollowing(isFollowingAuthor);
  }, [isFollowingAuthor]);

  const handleLike = async () => {
    if (isLiking) return;

    try {
      setIsLiking(true);
      
      // Actualizar UI inmediatamente (optimistic update)
      const currentLikedState = isPostLiked(currentPost);
      const newLikedState = !currentLikedState;
      const newLikesCount = newLikedState 
        ? currentPost.likesCount + 1 
        : Math.max(0, currentPost.likesCount - 1);

      const optimisticPost = {
        ...currentPost,
        // Actualizar ambos campos para compatibilidad
        isLikedByMe: newLikedState,
        likedByMe: newLikedState,
        likesCount: newLikesCount,
      };

      setCurrentPost(optimisticPost);
      onPostUpdate?.(optimisticPost);

      // Hacer la llamada a la API
      if (currentLikedState) {
        await SocialService.unlikePost(currentPost.id);
      } else {
        await SocialService.likePost(currentPost.id);
      }

    } catch (error) {
      console.log('Error toggling like:', error);
      
      // Revertir cambios en caso de error
      setCurrentPost(currentPost);
      onPostUpdate?.(currentPost);
      
      Alert.alert('Error', 'No se pudo procesar el like');
    } finally {
      setIsLiking(false);
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

  const getUserDisplayName = (post: Post): string => {
    // Si es mi post, mostrar "Tú"
    if (isMyPost) {
      return 'Tú';
    }
    
    // Formato 1: authorName (de /posts/me y /posts)
    if (post.authorName && post.authorName.trim()) {
      // Verificar si es un email válido
      if (post.authorName.includes('@')) {
        const emailPart = post.authorName.split('@')[0];
        return emailPart
          .replace(/[._-]/g, ' ')
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
      // Si no es email (como el ID), usar fallback
    }
    
    // Formato 2: author.email (de /posts/following)
    if (post.author?.email && post.author.email.trim()) {
      const emailPart = post.author.email.split('@')[0];
      return emailPart
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    return 'Usuario';
  };

  const getUserInitial = (post: Post): string => {
    // Si es mi post, mostrar "T" de "Tú"
    if (isMyPost) {
      return 'T';
    }
    
    // Formato 1: authorName
    if (post.authorName && post.authorName.trim() && post.authorName.includes('@')) {
      return post.authorName.charAt(0).toUpperCase();
    }
    
    // Formato 2: author.email
    if (post.author?.email && post.author.email.trim()) {
      return post.author.email.charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  const getMediaUrl = (post: Post): string | null => {
    // Formato 1: mediaUrl directo
    if (post.mediaUrl) {
      return post.mediaUrl;
    }
    
    // Formato 2: media.url
    if (post.media?.url) {
      return post.media.url;
    }
    
    return null;
  };

  const isPostLiked = (post: Post): boolean => {
    // Formato 1: isLikedByMe
    if (post.isLikedByMe !== undefined) {
      return post.isLikedByMe;
    }
    
    // Formato 2: likedByMe
    if (post.likedByMe !== undefined) {
      return post.likedByMe;
    }
    
    return false;
  };

  const handleFollowUser = async () => {
    if (followingUser || !currentPost.authorId) return;

    try {
      setFollowingUser(true);
      
      if (isFollowing) {
        await SocialService.unfollowUser(currentPost.authorId);
        setIsFollowing(false);
        onFollowChange?.(currentPost.authorId, false);
      } else {
        await SocialService.followUser(currentPost.authorId);
        setIsFollowing(true);
        onFollowChange?.(currentPost.authorId, true);
      }
    } catch (error) {
      console.log('Error following/unfollowing user:', error);
      Alert.alert('Error', 'No se pudo procesar la acción');
    } finally {
      setFollowingUser(false);
    }
  };

  const handleDeletePost = async () => {
    Alert.alert(
      'Eliminar post',
      '¿Estás seguro de que quieres eliminar este post?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await SocialService.deletePost(currentPost.id);
              onDelete?.(currentPost.id);
              Alert.alert('Post eliminado', 'Tu post ha sido eliminado exitosamente');
            } catch (error) {
              console.log('Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar el post');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Off-screen StoryImageView for capture — no opacity:0, it prevents native rendering */}
      <View style={styles.offScreenContainer}>
        <View
          ref={storyViewRef}
          collapsable={false}
          pointerEvents="none"
        >
          <StoryImageView post={currentPost} />
        </View>
      </View>

      {/* Header del post */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getUserInitial(currentPost)}
          </Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
            {getUserDisplayName(currentPost)}
          </Text>
          <Text style={styles.postTime}>
            {formatDate(currentPost.createdAt)}
          </Text>
        </View>
        
        {/* Botón seguir */}
        {showFollowButton && !isMyPost && (
          <TouchableOpacity 
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={handleFollowUser}
            disabled={followingUser}
          >
            {followingUser ? (
              <ActivityIndicator size="small" color={isFollowing ? "#4CAF50" : "#fff"} />
            ) : (
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Siguiendo' : 'Seguir'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Contenido del post */}
      <Text style={styles.caption}>{currentPost.caption}</Text>

      {/* Imagen del post */}
      {getMediaUrl(currentPost) && (
        <Image source={{ uri: getMediaUrl(currentPost)! }} style={styles.postImage} />
      )}

      {/* Acciones del post */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleLike}
          disabled={isLiking}
        >
          <Text style={[styles.actionIcon, isPostLiked(currentPost) && styles.likedIcon]}>
            {isPostLiked(currentPost) ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionText}>
            {currentPost.likesCount > 0 ? currentPost.likesCount : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onCommentPress?.(currentPost)}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>
            {currentPost.commentsCount > 0 ? currentPost.commentsCount : ''}
          </Text>
        </TouchableOpacity>

        {/* Botones de compartir y eliminar solo para mis posts */}
        {isMyPost && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleShare(currentPost, storyViewRef)}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <Ionicons name="share-outline" size={22} color="#666" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDeletePost}
            >
              <Ionicons name="trash-outline" size={22} color="#666" />
            </TouchableOpacity>
          </>
        )}


      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  offScreenContainer: {
    position: 'absolute',
    top: -10000,
    left: -10000,
    width: 1080,
    height: 1920,
    overflow: 'hidden',
  },
  container: {
    backgroundColor: '#fff',
    marginBottom: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
    marginRight: 8,
    minWidth: 0, // Permite que el texto se trunque si es necesario
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  postTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  caption: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 5,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 5,
  },
  likedIcon: {
    // El emoji ❤️ ya tiene color, no necesita estilo adicional
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  followButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    maxWidth: 80,
  },
  followingButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#4CAF50',
  },
});