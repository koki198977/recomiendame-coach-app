/**
 * Pure utility functions for story image generation.
 * Kept separate from StoryImageGenerator to avoid importing native modules
 * (react-native-view-shot, expo-image-manipulator) in components that only
 * need text processing helpers.
 */

export const CAPTION_MAX_LENGTH = 200;

/**
 * Truncates a caption to maxLength characters and appends "..." if needed.
 * Captions at or below maxLength are returned unchanged.
 */
export function truncateCaption(caption: string | undefined | null, maxLength: number = CAPTION_MAX_LENGTH): string {
  if (!caption) {
    return '';
  }
  if (caption.length <= maxLength) {
    return caption;
  }
  return caption.slice(0, maxLength) + '...';
}
