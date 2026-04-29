import { useState } from 'react';
import { Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { StoryImageGenerator } from '../services/storyImageGenerator';
import { Post } from '../types/nutrition';

interface UseStoryShareResult {
  isSharing: boolean;
  handleShare: (post: Post, viewRef: React.RefObject<any>) => Promise<void>;
}

export function useStoryShare(): UseStoryShareResult {
  const [isSharing, setIsSharing] = useState(false);

  async function handleShare(post: Post, viewRef: React.RefObject<any>) {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Tu dispositivo no soporta esta función');
      return;
    }

    setIsSharing(true);
    let tempUri: string | null = null;

    try {
      const result = await StoryImageGenerator.generate({ post, viewRef });
      tempUri = result.uri;
      
      // Compartir la imagen con expo-sharing
      await Sharing.shareAsync(tempUri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Compartir en redes sociales',
        UTI: 'public.jpeg',
      });
    } catch (error) {
      Alert.alert('No se pudo generar la imagen para compartir');
    } finally {
      if (tempUri) {
        try {
          await FileSystem.deleteAsync(tempUri, { idempotent: true });
        } catch (cleanupError) {
          console.error('Error al eliminar archivo temporal:', cleanupError);
        }
      }
      setIsSharing(false);
    }
  }

  return { isSharing, handleShare };
}
