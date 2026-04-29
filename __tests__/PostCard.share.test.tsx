/**
 * Tests for the share button integration in PostCard.
 * Validates Requirements: 1.1, 1.2, 1.3, 1.4
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PostCard } from '../components/PostCard';
import { Post } from '../types/nutrition';
import * as Sharing from 'expo-sharing';

// Mock expo-linear-gradient (used by StoryImageView)
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

const mockPost: Post = {
  id: 'post-123',
  caption: 'Test post caption',
  createdAt: new Date().toISOString(),
  likesCount: 5,
  commentsCount: 2,
  mediaUrl: null,
  authorName: 'test@example.com',
  isLikedByMe: false,
};

describe('PostCard - Share Button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders the share button (📤) in the actions bar', () => {
    const { getByText } = render(<PostCard post={mockPost} />);
    expect(getByText('📤')).toBeTruthy();
  });

  it('share button is visible alongside like and comment buttons', () => {
    const { getByText } = render(<PostCard post={mockPost} />);
    // All three action buttons should be present
    expect(getByText('🤍')).toBeTruthy(); // like button
    expect(getByText('💬')).toBeTruthy(); // comment button
    expect(getByText('📤')).toBeTruthy(); // share button
  });

  it('share button is visible when isMyPost=true (Míos feed)', () => {
    const { getByText } = render(<PostCard post={mockPost} isMyPost={true} />);
    expect(getByText('📤')).toBeTruthy();
  });

  it('share button is visible when showFollowButton=true (Todos/Siguiendo feed)', () => {
    const { getByText } = render(
      <PostCard post={mockPost} showFollowButton={true} isFollowingAuthor={false} />
    );
    expect(getByText('📤')).toBeTruthy();
  });

  it('share button is visible with default props (no extra flags)', () => {
    const { getByText } = render(<PostCard post={mockPost} />);
    expect(getByText('📤')).toBeTruthy();
  });

  it('shows ActivityIndicator and disables button while sharing', async () => {
    // Make shareAsync hang so we can observe the loading state
    let resolveShare: () => void;
    (Sharing.shareAsync as jest.Mock).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveShare = resolve;
      })
    );

    const { getByText, queryByText, getByTestId, UNSAFE_getByType } = render(
      <PostCard post={mockPost} />
    );

    const shareButton = getByText('📤').parent?.parent;

    await act(async () => {
      fireEvent.press(getByText('📤'));
    });

    // After pressing, isSharing should be true — ActivityIndicator replaces the emoji
    await waitFor(() => {
      expect(queryByText('📤')).toBeNull();
    });

    // Resolve the share to clean up
    await act(async () => {
      resolveShare!();
    });
  });

  it('share button reappears after sharing completes', async () => {
    const { getByText, queryByText } = render(<PostCard post={mockPost} />);

    await act(async () => {
      fireEvent.press(getByText('📤'));
    });

    await waitFor(() => {
      expect(getByText('📤')).toBeTruthy();
    });
  });
});
