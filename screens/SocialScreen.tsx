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
} from "react-native";
import { SocialService } from "../services/socialService";
import { Post } from "../types/nutrition";
import { PostCard } from "../components/PostCard";
import { CreatePostModal } from "../components/CreatePostModal";
import { CommentsModal } from "../components/CommentsModal";
import { UsersScreen } from "./UsersScreen";
import { getCurrentUserId, getCurrentUserEmail } from "../utils/userUtils";

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
        console.log("SocialScreen - User ID from profile:", profileData.userId);

        // También obtener email desde AsyncStorage
        const userEmail = await getCurrentUserEmail();
        setCurrentUserEmail(userEmail);
      } catch (error) {
        console.log("Error loading profile from API:", error);

        // Fallback: obtener desde AsyncStorage
        const userId = await getCurrentUserId();
        const userEmail = await getCurrentUserEmail();

        setCurrentUserId(userId);
        setCurrentUserEmail(userEmail);
        console.log("SocialScreen - Fallback user:", { userId, userEmail });
      }
    } catch (error) {
      console.log("Error in loadCurrentUser:", error);
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
      console.log("Following users loaded:", followingIds);
    } catch (error) {
      console.log("Error loading following users:", error);
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

      console.log(
        `Loaded ${response.items?.length || 0} posts for ${feedType} feed`
      );
    } catch (error) {
      console.log("Error loading feed:", error);
      setPosts([]); // Asegurar que siempre sea un array
    } finally {
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
      console.log("Error loading more posts:", error);
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
    console.log("Checking if my post:", {
      currentUserId,
      currentUserEmail,
      postAuthorId: post.authorId,
      postAuthorName: post.authorName,
      postAuthor: post.author,
    });

    // Verificar por ID
    if (currentUserId) {
      if (
        post.authorId === currentUserId ||
        post.author?.id === currentUserId
      ) {
        console.log("✅ My post by ID match");
        return true;
      }
    }

    // Verificar por email como fallback
    if (currentUserEmail) {
      if (
        post.authorName === currentUserEmail ||
        post.author?.email === currentUserEmail
      ) {
        console.log("✅ My post by email match");
        return true;
      }
    }

    console.log("❌ Not my post");
    return false;
  };

  const isFollowingAuthor = (post: Post): boolean => {
    const authorId = post.authorId || post.author?.id;
    if (!authorId) return false;

    const following = followingUsers.has(authorId);
    console.log(`Following ${authorId}:`, following);
    return following;
  };

  const handleCommentAdded = (postId: string, newCommentsCount: number) => {
    // Actualizar el contador de comentarios del post específico
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, commentsCount: newCommentsCount } : post
      )
    );
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comunidad</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setShowUsersModal(true)}
          >
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.createButtonText}>✨ Crear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed Type Selector */}
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
            🌍 Todos
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
                isMyPost={feedType === "mine" || isMyPost(post)}
                showFollowButton={false}
                isFollowingAuthor={isFollowingAuthor(post)}
                onFollowChange={(authorId, isFollowing) => {
                  // Actualizar el caché local
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

            {/* Indicador de carga para más posts */}
            {loadingMore && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.loadingMoreText}>
                  Cargando más posts...
                </Text>
              </View>
            )}

            {/* Mensaje cuando no hay más posts */}
            {!hasMorePosts && posts.length > 5 && (
              <View style={styles.endOfFeed}>
                <Text style={styles.endOfFeedText}>
                  ¡Has visto todos los posts! 🎉
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>
              ¡Sé el primero en compartir!
            </Text>
            <Text style={styles.emptyStateDescription}>
              Comparte tu progreso, recetas o motivación con la comunidad
            </Text>
            <TouchableOpacity
              style={styles.firstPostButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.firstPostButtonText}>
                ✨ Crear mi primer post
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal para crear post */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Modal de comentarios */}
      <CommentsModal
        visible={showCommentsModal}
        onClose={closeCommentsModal}
        post={selectedPost}
        onCommentAdded={handleCommentAdded}
      />

      {/* Modal de búsqueda de usuarios */}
      <Modal
        visible={showUsersModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowUsersModal(false)}
            >
              <Text style={styles.closeModalButtonText}>✕ Cerrar</Text>
            </TouchableOpacity>
          </View>
          <UsersScreen />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 40,
    alignItems: "center",
  },
  searchButtonText: {
    fontSize: 16,
  },
  createButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  feed: {
    flex: 1,
  },
  postsContainer: {
    padding: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  firstPostButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#666",
  },
  endOfFeed: {
    alignItems: "center",
    paddingVertical: 30,
  },
  endOfFeedText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
  feedSelector: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 25,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 18,
    alignItems: "center",
  },
  feedTabActive: {
    backgroundColor: "#4CAF50",
  },
  feedTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  feedTabTextActive: {
    color: "#fff",
  },
});
