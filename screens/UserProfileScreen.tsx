import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SocialService } from '../services/socialService';
import { UserProfile, Post } from '../types/nutrition';
import { PostCard } from '../components/PostCard';
import { UserCard } from '../components/UserCard';

interface UserProfileScreenProps {
  userId: string;
  onBack?: () => void;
}

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  userId,
  onBack,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts');
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'followers') {
      loadFollowers();
    } else if (activeTab === 'following') {
      loadFollowing();
    }
  }, [activeTab]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Cargar perfil del usuario
      const userProfile = await SocialService.getUserProfile(userId);
      setUser(userProfile);
      
      // Cargar posts del usuario (usando el endpoint general con filtro por autor)
      // Como no tenemos un endpoint específico para posts de un usuario,
      // usaremos getMyPosts si es el usuario actual, o getAllPosts y filtraremos
      try {
        const postsResponse = await SocialService.getAllPosts(0, 50);
        const userPosts = postsResponse.items.filter(post => 
          post.authorId === userId || post.author?.id === userId
        );
        setPosts(userPosts);
      } catch (error) {
        console.log('Error loading user posts:', error);
        setPosts([]);
      }
      
    } catch (error) {
      console.log('Error loading user profile:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil del usuario');
    } finally {
      setLoading(false);
    }
  };

  const loadFollowers = async () => {
    try {
      const response = await SocialService.getFollowers(userId, 0, 50);
      setFollowers(response.items || []);
    } catch (error) {
      console.log('Error loading followers:', error);
      setFollowers([]);
    }
  };

  const loadFollowing = async () => {
    try {
      const response = await SocialService.getFollowing(userId, 0, 50);
      setFollowing(response.items || []);
    } catch (error) {
      console.log('Error loading following:', error);
      setFollowing([]);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadUserProfile().finally(() => setRefreshing(false));
  };

  const handleFollow = async () => {
    if (!user || followLoading) return;

    try {
      setFollowLoading(true);
      
      if (user.isFollowing) {
        await SocialService.unfollowUser(userId);
        setUser(prev => prev ? {
          ...prev,
          isFollowing: false,
          followersCount: Math.max(0, prev.followersCount - 1)
        } : null);
      } else {
        await SocialService.followUser(userId);
        setUser(prev => prev ? {
          ...prev,
          isFollowing: true,
          followersCount: prev.followersCount + 1
        } : null);
      }
    } catch (error) {
      console.log('Error following/unfollowing user:', error);
      Alert.alert('Error', 'No se pudo procesar la acción');
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePostUpdate = (updatedPost: Post) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      )
    );
  };

  const getUserDisplayName = (user: UserProfile): string => {
    if (user.name) {
      return user.name;
    }
    
    if (user.email) {
      const emailPart = user.email.split('@')[0];
      return emailPart
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    return 'Usuario';
  };

  const getUserInitial = (user: UserProfile): string => {
    if (user.name) {
      return user.name.charAt(0).toUpperCase();
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>No se pudo cargar el perfil</Text>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getUserInitial(user)}
            </Text>
          </View>
          
          <Text style={styles.userName}>
            {getUserDisplayName(user)}
          </Text>
          
          <Text style={styles.userEmail}>
            {user.email}
          </Text>
          
          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.postsCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followersCount}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followingCount}</Text>
              <Text style={styles.statLabel}>Siguiendo</Text>
            </View>
          </View>
          
          {/* Follow Button */}
          <TouchableOpacity 
            style={[styles.followButton, user.isFollowing && styles.followingButton]}
            onPress={handleFollow}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={user.isFollowing ? "#4CAF50" : "#fff"} />
            ) : (
              <Text style={[styles.followButtonText, user.isFollowing && styles.followingButtonText]}>
                {user.isFollowing ? 'Siguiendo' : 'Seguir'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
              Posts ({user.postsCount})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
            onPress={() => setActiveTab('followers')}
          >
            <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
              Seguidores ({user.followersCount})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'following' && styles.activeTab]}
            onPress={() => setActiveTab('following')}
          >
            <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
              Siguiendo ({user.followingCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'posts' && (
            <View style={styles.postsContainer}>
              {posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPostUpdate={handlePostUpdate}
                    onCommentPress={() => {}}
                    isMyPost={false}
                    showFollowButton={false}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>📝 Sin posts aún</Text>
                  <Text style={styles.emptyStateDescription}>
                    Este usuario aún no ha compartido ningún post
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'followers' && (
            <View style={styles.usersContainer}>
              {followers.length > 0 ? (
                followers.map((follower) => (
                  <UserCard
                    key={follower.id}
                    user={follower}
                    onFollowChange={() => {}}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>👥 Sin seguidores</Text>
                  <Text style={styles.emptyStateDescription}>
                    Este usuario aún no tiene seguidores
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'following' && (
            <View style={styles.usersContainer}>
              {following.length > 0 ? (
                following.map((followedUser) => (
                  <UserCard
                    key={followedUser.id}
                    user={followedUser}
                    onFollowChange={() => {}}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>👤 No sigue a nadie</Text>
                  <Text style={styles.emptyStateDescription}>
                    Este usuario aún no sigue a otros usuarios
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  userInfo: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 25,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  followButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#4CAF50',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
  },
  tabContent: {
    flex: 1,
  },
  postsContainer: {
    padding: 20,
  },
  usersContainer: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});