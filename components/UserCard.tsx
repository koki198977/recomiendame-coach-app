import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SocialUserProfile } from '../types/nutrition';
import { SocialService } from '../services/socialService';

interface UserCardProps {
  user: SocialUserProfile;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  onFollowChange,
}) => {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  const [loading, setLoading] = useState(false);

  // Sincronizar el estado cuando el prop cambie
  useEffect(() => {
    setIsFollowing(user.isFollowing);
  }, [user.isFollowing]);

  const getUserDisplayName = (user: SocialUserProfile): string => {
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

  const getUserInitial = (user: SocialUserProfile): string => {
    if (user.name) {
      return user.name.charAt(0).toUpperCase();
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  const handleFollow = async () => {
    if (loading) return;

    try {
      setLoading(true);
      
      if (isFollowing) {
        await SocialService.unfollowUser(user.id);
        setIsFollowing(false);
        onFollowChange?.(user.id, false);
      } else {
        await SocialService.followUser(user.id);
        setIsFollowing(true);
        onFollowChange?.(user.id, true);
      }
    } catch (error) {
      console.log('Error following/unfollowing user:', error);
      Alert.alert('Error', 'No se pudo procesar la acción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getUserInitial(user)}
          </Text>
        </View>
        
        <View style={styles.userDetails}>
          <Text style={styles.userName}>
            {getUserDisplayName(user)}
          </Text>
          <Text style={styles.userStats}>
            {user.postsCount} posts • {user.followersCount} seguidores
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.followButton, isFollowing && styles.followingButton]}
        onPress={handleFollow}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={isFollowing ? "#4CAF50" : "#fff"} />
        ) : (
          <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
            {isFollowing ? 'Siguiendo' : 'Seguir'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userStats: {
    fontSize: 14,
    color: '#666',
  },
  followButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#4CAF50',
  },
});