import { captureRef } from 'react-native-view-shot';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Post } from '../types/nutrition';
import { truncateCaption, CAPTION_MAX_LENGTH } from './storyUtils';

// Configuration constants
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const JPEG_QUALITY = 0.85;
const APP_BUNDLE_ID = 'https://coach.recomiendameapp.cl/download';
const APP_NAME = 'Recomiéndame Coach';
const PROMO_TEXT = 'Prueba gratis 30 días';

export interface StoryGenerationOptions {
  post: Post;
  viewRef: React.RefObject<any>;
}

export interface StoryGenerationResult {
  uri: string;
  width: number;  // Always 1080
  height: number; // Always 1920
}

export class StoryImageGenerator {
  /**
   * Generates a unique temp file name for the story image.
   * Format: story_{postId}_{timestamp}.jpg
   */
  static getTempFileName(postId: string): string {
    return `story_${postId}_${Date.now()}.jpg`;
  }

  /**
   * Truncates a caption to maxLength characters and appends "..." if needed.
   * Captions at or below maxLength are returned unchanged.
   */
  static truncateCaption(caption: string, maxLength: number = CAPTION_MAX_LENGTH): string {
    return truncateCaption(caption, maxLength);
  }

  /**
   * Generates a Story Image from a post.
   * Captures the StoryImageView off-screen via react-native-view-shot,
   * processes with expo-image-manipulator (resize + JPEG compression),
   * and saves as a temporary JPEG in the cache directory.
   *
   * The caller is responsible for rendering StoryImageView off-screen and
   * passing its ref via options.viewRef.
   */
  static async generate(options: StoryGenerationOptions): Promise<StoryGenerationResult> {
    const { post, viewRef } = options;

    // Wait for the off-screen view to finish layout and paint before capturing.
    // react-native-view-shot captures whatever is currently painted — without this
    // delay the view may not have completed its first render pass.
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    // Capture the off-screen StoryImageView as a PNG
    const capturedUri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      width: STORY_WIDTH,
      height: STORY_HEIGHT,
    });

    // Resize to 1080px wide and compress as JPEG at 0.85 quality
    const result = await manipulateAsync(
      capturedUri,
      [{ resize: { width: STORY_WIDTH } }],
      { compress: JPEG_QUALITY, format: SaveFormat.JPEG }
    );

    // Move the processed file to the cache directory with a unique name
    const fileName = StoryImageGenerator.getTempFileName(post.id);
    const destUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.moveAsync({ from: result.uri, to: destUri });

    return {
      uri: destUri,
      width: STORY_WIDTH,
      height: STORY_HEIGHT,
    };
  }
}

export {
  STORY_WIDTH,
  STORY_HEIGHT,
  JPEG_QUALITY,
  CAPTION_MAX_LENGTH,
  APP_BUNDLE_ID,
  APP_NAME,
  PROMO_TEXT,
};
