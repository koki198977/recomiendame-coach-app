import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SocialService } from '../services/socialService';
import { SocialUserProfile } from '../types/nutrition';
import { UserCard } from './UserCard';

interface FollowersModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
}

export const FollowersModal: React.FC<FollowersModalProps> = ({
  visible,
  onClose,
  userId,
  type,
}) => {
  const [users, setUsers] = useState<SocialUserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUsers();
    }
  }, [visible, type]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log(`Loading ${type} for user ID:`, userId);
      
      if (!userId) {
        console.log('No user ID provided, cannot load', type);
        setUsers([]);
        return;
      }
      
      let response;
      if (type === 'followers') {
        response = await SocialService.getFollowers(userId, 0, 50);
      } else {
        response = await SocialService.getFollowing(userId, 0, 50);
      }
      
      // Procesar los usuarios según el tipo
      let processedUsers = response.items || [];
      
      if (type === 'following') {
        // Si estoy viendo "Siguiendo", todos los usuarios deberían tener isFollowing: true
        processedUsers = processedUsers.map(user => ({
          ...user,
          isFollowing: true
        }));
      } else if (type === 'followers') {
        // Si estoy viendo "Seguidores", mantener el estado original
        // (algunos me siguen de vuelta, otros no)
      }
      
      setUsers(processedUsers);
      console.log(`Loaded ${processedUsers.length} ${type}`);
    } catch (error) {
      console.log(`Error loading ${type}:`, error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowChange = (targetUserId: string, isFollowing: boolean) => {
    // Actualizar el estado local del usuario
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === targetUserId 
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

  const getTitle = () => {
    return type === 'followers' ? 'Seguidores' : 'Siguiendo';
  };

  const getEmptyMessage = () => {
    return type === 'followers' 
      ? 'Aún no tienes seguidores' 
      : 'Aún no sigues a nadie';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{getTitle()}</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>✕ Cerrar</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Cargando {type}...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {users.length > 0 ? (
              <View style={styles.usersContainer}>
                {users.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onFollowChange={handleFollowChange}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>
                  {type === 'followers' ? '👥' : '👤'} {getEmptyMessage()}
                </Text>
                <Text style={styles.emptyStateDescription}>
                  {type === 'followers' 
                    ? 'Comparte contenido interesante para atraer seguidores'
                    : 'Explora usuarios y sigue a quienes te interesen'
                  }
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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