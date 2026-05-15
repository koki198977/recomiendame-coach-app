import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import { SocialService } from "../services/socialService";
import { NutritionService } from "../services/nutritionService";
import { Post } from "../types/nutrition";
import { PostCard } from "../components/PostCard";
import { CreatePostModal } from "../components/CreatePostModal";
import { CommentsModal } from "../components/CommentsModal";
import { UsersScreen } from "./UsersScreen";
import { getCurrentUserId, getCurrentUserEmail } from "../utils/userUtils";
import { AppHeader } from "../components/AppHeader";

const { width, height } = Dimensions.get('window');

export const SocialScreen: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [feedType, setFeedType] = useState<"all" | "following" | "mine">("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  const POSTS_PER_PAGE = 10;

  useEffect(() => {
    loadCurrentUser();
    loadFeed();
    loadFollowingUsers();
  }, []);

  useEffect(() => {
    loadFeed();
  }, [feedType]);

  const loadCurrentUser = async () => {
    try {
      // Intentar obtener del endpoint /me/profile (que tiene el userId correcto)
      try {
        const profileData = await SocialService.getCurrentUser();
        setCurrentUserId(profileData.userId);

        // Cargar perfil completo de nutrición para tener nombre y avatar
        const nutritionProfile = await NutritionService.getUserProfile();
        setCurrentUserProfile(nutritionProfile);

        // También obtener email desde AsyncStorage
        const userEmail = await getCurrentUserEmail();
        setCurrentUserEmail(userEmail);
      } catch (error) {
        // Fallback: obtener desde AsyncStorage
        const userId = await getCurrentUserId();
        const userEmail = await getCurrentUserEmail();

        setCurrentUserId(userId);
        setCurrentUserEmail(userEmail);
      }
    } catch (error) {
      // Error silencioso
    }
  };

  const loadFollowingUsers = async () => {
    try {
      // Obtener mi ID de usuario
      const userId = await getCurrentUserId();
      if (!userId) return;

      // Cargar la lista de usuarios que sigo
      const response = await SocialService.getFollowing(userId, 0, 100); // Cargar más usuarios
      const followingIds = new Set(response.items.map((user) => user.id));
      setFollowingUsers(followingIds);
    } catch (error) {
      // Error silencioso
    }
  };

  const loadFeed = async (isRefresh: boolean = false) => {
    try {
      if (!isRefresh) setLoading(true);

      let response;
      if (feedType === "all") {
        // Todos los posts públicos
        response = await SocialService.getAllPosts(0, POSTS_PER_PAGE);
      } else if (feedType === "following") {
        // Posts de personas que sigo
        response = await SocialService.getFollowingPosts(0, POSTS_PER_PAGE);

        // Filtrar posts propios del feed de "Siguiendo"
        if (response.items && currentUserId) {
          response.items = response.items.filter((post) => {
            const isMyPost =
              post.authorId === currentUserId ||
              post.author?.id === currentUserId ||
              (currentUserEmail &&
                (post.authorName === currentUserEmail ||
                  post.author?.email === currentUserEmail));
            return !isMyPost; // Excluir posts propios
          });
        }
      } else {
        // Mis posts
        response = await SocialService.getMyPosts(0, POSTS_PER_PAGE);
      }

      setPosts(response.items || []);
      setCurrentPage(0);
      setHasMorePosts((response.items?.length || 0) >= POSTS_PER_PAGE);
    } catch (error) {
      setPosts([]); // Asegurar que siempre sea un array
    } finally{
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMorePosts) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const skip = nextPage * POSTS_PER_PAGE;

      let response;
      if (feedType === "all") {
        response = await SocialService.getAllPosts(skip, POSTS_PER_PAGE);
      } else if (feedType === "following") {
        response = await SocialService.getFollowingPosts(skip, POSTS_PER_PAGE);

        // Filtrar posts propios del feed de "Siguiendo"
        if (response.items && currentUserId) {
          response.items = response.items.filter((post) => {
            const isMyPost =
              post.authorId === currentUserId ||
              post.author?.id === currentUserId ||
              (currentUserEmail &&
                (post.authorName === currentUserEmail ||
                  post.author?.email === currentUserEmail));
            return !isMyPost; // Excluir posts propios
          });
        }
      } else {
        response = await SocialService.getMyPosts(skip, POSTS_PER_PAGE);
      }

      const newPosts = response.items || [];

      if (newPosts.length > 0) {
        setPosts((prevPosts) => [...prevPosts, ...newPosts]);
        setCurrentPage(nextPage);
        setHasMorePosts(newPosts.length >= POSTS_PER_PAGE);
      } else {
        setHasMorePosts(false);
      }
    } catch (error) {
      // Error silencioso
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadFeed(true);
  };

  const handlePostUpdate = (updatedPost: Post) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    );
  };

  const handlePostCreated = (newPost: Post) => {
    // Agregar el nuevo post al inicio de la lista
    setPosts((prevPosts) => [newPost, ...prevPosts]);

    // También recargar el feed para asegurar sincronización
    setTimeout(() => {
      loadFeed(true);
    }, 1000);
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;

    if (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    ) {
      loadMorePosts();
    }
  };

  const handleCommentPress = (post: Post) => {
    setSelectedPost(post);
    setShowCommentsModal(true);
  };

  const closeCommentsModal = () => {
    setShowCommentsModal(false);
    setSelectedPost(null);
  };

  const isMyPost = (post: Post): boolean => {
    // Verificar por ID
    if (currentUserId) {
      if (
        post.authorId === currentUserId ||
        post.author?.id === currentUserId
      ) {
        return true;
      }
    }

    // Verificar por email como fallback
    if (currentUserEmail) {
      if (
        post.authorName === currentUserEmail ||
        post.author?.email === currentUserEmail
      ) {
        return true;
      }
    }

    return false;
  };

  const isFollowingAuthor = (post: Post): boolean => {
    const authorId = post.authorId || post.author?.id;
    if (!authorId) return false;
    return followingUsers.has(authorId);
  };

  const handleCommentAdded = (postId: string, newCommentsCount: number) => {
    // Actualizar el contador de comentarios del post específico
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, commentsCount: newCommentsCount } : post
      )
    );
  };

  const handlePostDeleted = (postId: string) => {
    // Eliminar el post del estado local
    setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Modern Header with Logo */}
      <AppHeader
        title="Comunidad"
        subtitle="Comparte tu progreso"
        showLogo={true}
        rightComponent={
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setShowUsersModal(true)}
            >
              <Ionicons name="search-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add-circle" size={28} color="#fff" />
              <Text style={styles.createButtonLabel}>Crear</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Feed Type Selector - Premium Segmented Control */}
      <View style={styles.feedSelectorContainer}>
        <View style={styles.feedSelector}>
          <TouchableOpacity
            style={[styles.feedTab, feedType === "all" && styles.feedTabActive]}
            onPress={() => setFeedType("all")}
          >
            <Text
              style={[
                styles.feedTabText,
                feedType === "all" && styles.feedTabTextActive,
              ]}
            >
              🌎 Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.feedTab,
              feedType === "following" && styles.feedTabActive,
            ]}
            onPress={() => setFeedType("following")}
          >
            <Text
              style={[
                styles.feedTabText,
                feedType === "following" && styles.feedTabTextActive,
              ]}
            >
              👥 Siguiendo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.feedTab, feedType === "mine" && styles.feedTabActive]}
            onPress={() => setFeedType("mine")}
          >
            <Text
              style={[
                styles.feedTabText,
                feedType === "mine" && styles.feedTabTextActive,
              ]}
            >
              👤 Míos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed */}
      <ScrollView
        style={styles.feed}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#4CAF50"]}
            tintColor="#4CAF50"
          />
        }
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        {posts.length > 0 ? (
          <View style={styles.postsContainer}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPostUpdate={handlePostUpdate}
                onCommentPress={handleCommentPress}
                onDelete={handlePostDeleted}
                isMyPost={feedType === "mine" || isMyPost(post)}
                currentUserAvatar={currentUserProfile?.avatarUrl}
                currentUserName={`${currentUserProfile?.name || ''} ${currentUserProfile?.lastName || ''}`.trim()}
                showFollowButton={false}
                isFollowingAuthor={isFollowingAuthor(post)}
                onFollowChange={(authorId, isFollowing) => {
                  setFollowingUsers((prev) => {
                    const newSet = new Set(prev);
                    if (isFollowing) {
                      newSet.add(authorId);
                    } else {
                      newSet.delete(authorId);
                    }
                    return newSet;
                  });
                }}
              />
            ))}

            {loadingMore && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.loadingMoreText}>Cargando más...</Text>
              </View>
            )}

            {!hasMorePosts && posts.length > 5 && (
              <View style={styles.endOfFeed}>
                <Text style={styles.endOfFeedText}>✨ Has llegado al final 🎉</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="people-outline" size={80} color="#E0E0E0" />
            </View>
            <Text style={styles.emptyStateTitle}>¡Sé el primero en compartir!</Text>
            <Text style={styles.emptyStateDescription}>
              Comparte tu progreso, recetas o motivación con la comunidad
            </Text>
            <TouchableOpacity
              style={styles.firstPostButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.firstPostButtonText}>✨ Crear mi primer post</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={handlePostCreated}
      />

      <CommentsModal
        visible={showCommentsModal}
        onClose={closeCommentsModal}
        post={selectedPost}
        onCommentAdded={handleCommentAdded}
      />

      <Modal 
        visible={showUsersModal} 
        animationType="slide" 
        transparent
        onRequestClose={() => setShowUsersModal(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContainer}>
            {/* Header con Gradiente (Estilo Recetas) */}
            <View style={styles.premiumHeaderWrapper}>
              <LinearGradient
                colors={['#4CAF50', '#8BC34A']}
                style={styles.premiumHeaderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons 
                  name="people" 
                  size={120} 
                  color="rgba(255,255,255,0.2)" 
                  style={{ position: 'absolute', right: -20, bottom: -20 }} 
                />
              </LinearGradient>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.premiumHeaderTitleOverlay}
              />
              <View style={styles.premiumHeaderContent}>
                <View style={styles.premiumTopActions}>
                  <TouchableOpacity 
                    style={styles.premiumBackButton} 
                    onPress={() => setShowUsersModal(false)}
                  >
                    <Ionicons name="chevron-down" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.premiumTitleContainer}>
                  <Text style={styles.premiumTitle}>Descubrir Usuarios</Text>
                  <Text style={styles.premiumSubtitle}>Conecta con la comunidad</Text>
                </View>
              </View>
            </View>

            {/* Contenido (UsersScreen se encarga del ScrollView interno) */}
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              <UsersScreen />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FBF8", // Color de fondo más suave
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  createButtonLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  feedSelectorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  feedSelector: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 14,
    padding: 4,
  },
  feedTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  feedTabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  feedTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  feedTabTextActive: {
    color: "#4CAF50",
    fontWeight: "700",
  },
  feed: {
    flex: 1,
  },
  postsContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  firstPostButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 25,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  firstPostButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingMore: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#999",
  },
  endOfFeed: {
    alignItems: "center",
    paddingVertical: 40,
  },
  endOfFeedText: {
    fontSize: 15,
    color: "#BBB",
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  premiumModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: height * 0.92,
    width: '100%',
    overflow: 'hidden',
  },
  premiumHeaderWrapper: {
    height: 220,
    width: '100%',
    position: 'relative',
  },
  premiumHeaderGradient: {
    width: '100%',
    height: '100%',
  },
  premiumHeaderTitleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  premiumHeaderContent: {
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
  premiumTopActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  premiumBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumTitleContainer: {
    gap: 4,
  },
  premiumTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  modalHeader: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    alignItems: "flex-end",
  },
  closeModalButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeModalButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

