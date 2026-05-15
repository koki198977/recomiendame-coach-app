import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SocialService } from '../services/socialService';
import { SocialUserProfile } from '../types/nutrition';
import { UserCard } from '../components/UserCard';

export const UsersScreen: React.FC = () => {
  const [users, setUsers] = useState<SocialUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [viewType, setViewType] = useState<'suggested' | 'search'>('suggested');
  const [followingCache, setFollowingCache] = useState<{[userId: string]: boolean}>({});

  const USERS_PER_PAGE = 20;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 500); // Debounce de 500ms

      return () => clearTimeout(timeoutId);
    } else if (viewType === 'search') {
      // Si se borra la búsqueda, volver a usuarios sugeridos
      setViewType('suggested');
      loadUsers();
    }
  }, [searchQuery]);

  const loadUsers = async (isRefresh: boolean = false) => {
    try {
      if (!isRefresh) setLoading(true);
      
      const response = await SocialService.getSuggestedUsers(0, USERS_PER_PAGE);
      
      // Aplicar caché de seguimiento
      const usersWithCache = (response.items || []).map(user => ({
        ...user,
        isFollowing: followingCache[user.id] !== undefined ? followingCache[user.id] : user.isFollowing
      }));
      
      setUsers(usersWithCache);
      setCurrentPage(0);
      setHasMoreUsers((response.items?.length || 0) >= USERS_PER_PAGE);
      setViewType('suggested');
      
      setViewType('suggested');
    } catch (error) {
      setUsers([]);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearchLoading(true);
      setViewType('search');
      
      const response = await SocialService.searchUsers(searchQuery.trim(), 0, USERS_PER_PAGE);
      
      // Aplicar caché de seguimiento
      const usersWithCache = (response.items || []).map(user => ({
        ...user,
        isFollowing: followingCache[user.id] !== undefined ? followingCache[user.id] : user.isFollowing
      }));
      
      setUsers(usersWithCache);
      setCurrentPage(0);
      setHasMoreUsers((response.items?.length || 0) >= USERS_PER_PAGE);
      
    } catch (error) {
      Alert.alert('Error', 'No se pudo realizar la búsqueda');
      setUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadMoreUsers = async () => {
    if (loadingMore || !hasMoreUsers) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const skip = nextPage * USERS_PER_PAGE;
      
      let response;
      if (viewType === 'search' && searchQuery.trim()) {
        response = await SocialService.searchUsers(searchQuery.trim(), skip, USERS_PER_PAGE);
      } else {
        response = await SocialService.getSuggestedUsers(skip, USERS_PER_PAGE);
      }
      
      const newUsers = response.items || [];
      
      if (newUsers.length > 0) {
        // Aplicar caché de seguimiento a los nuevos usuarios
        const newUsersWithCache = newUsers.map(user => ({
          ...user,
          isFollowing: followingCache[user.id] !== undefined ? followingCache[user.id] : user.isFollowing
        }));
        
        setUsers(prevUsers => [...prevUsers, ...newUsersWithCache]);
        setCurrentPage(nextPage);
        setHasMoreUsers(newUsers.length >= USERS_PER_PAGE);
      } else {
        setHasMoreUsers(false);
      }
    } catch (error) {
      // Error silencioso
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (viewType === 'search' && searchQuery.trim()) {
      handleSearch();
    } else {
      loadUsers(true);
    }
  };

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    // Actualizar el caché de seguimiento
    setFollowingCache(prev => ({
      ...prev,
      [userId]: isFollowing
    }));
    
    // Actualizar el estado local del usuario
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              isFollowing,
              followersCount: isFollowing 
                ? user.followersCount + 1 
                : Math.max(0, user.followersCount - 1)
            }
          : user
      )
    );
  };

  const clearSearch = () => {
    setSearchQuery('');
    setViewType('suggested');
    loadUsers();
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      loadMoreUsers();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuarios..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {searchLoading && (
          <ActivityIndicator size="small" color="#4CAF50" style={styles.searchLoader} />
        )}
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {viewType === 'search' 
            ? `Resultados para "${searchQuery}"` 
            : '👥 Usuarios Sugeridos'
          }
        </Text>
        <Text style={styles.sectionSubtitle}>
          {users.length} {users.length === 1 ? 'usuario' : 'usuarios'}
        </Text>
      </View>

      {/* Users List */}
      <ScrollView 
        style={styles.usersList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        {users.length > 0 ? (
          <View style={styles.usersContainer}>
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onFollowChange={handleFollowChange}
              />
            ))}
            
            {/* Indicador de carga para más usuarios */}
            {loadingMore && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.loadingMoreText}>Cargando más usuarios...</Text>
              </View>
            )}
            
            {/* Mensaje cuando no hay más usuarios */}
            {!hasMoreUsers && users.length > 10 && (
              <View style={styles.endOfList}>
                <Text style={styles.endOfListText}>¡Has visto todos los usuarios! 🎉</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            {viewType === 'search' ? (
              <>
                <Text style={styles.emptyStateTitle}>🔍 Sin resultados</Text>
                <Text style={styles.emptyStateDescription}>
                  No encontramos usuarios que coincidan con "{searchQuery}"
                </Text>
                <TouchableOpacity 
                  style={styles.tryAgainButton}
                  onPress={clearSearch}
                >
                  <Text style={styles.tryAgainButtonText}>Ver usuarios sugeridos</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.emptyStateTitle}>👥 ¡Conecta con otros!</Text>
                <Text style={styles.emptyStateDescription}>
                  Descubre usuarios con intereses similares y comparte tu experiencia
                </Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
  },
  searchLoader: {
    marginTop: 10,
    alignSelf: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  usersList: {
    flex: 1,
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
    fontSize: 24,
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
    marginBottom: 30,
  },
  tryAgainButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  tryAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  endOfList: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  endOfListText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});