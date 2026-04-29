import * as fc from 'fast-check';
import { Post } from '../../types/nutrition';

/**
 * Generates arbitrary valid Post objects for property-based testing.
 */
export const arbitraryPost = (): fc.Arbitrary<Post> =>
  fc.record({
    id: fc.uuid(),
    caption: fc.string({ minLength: 0, maxLength: 500 }),
    createdAt: fc.date().map((d) => d.toISOString()),
    likesCount: fc.nat(),
    commentsCount: fc.nat(),
    mediaUrl: fc.option(fc.webUrl(), { nil: null }),
    authorName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    isLikedByMe: fc.boolean(),
  }) as fc.Arbitrary<Post>;

/**
 * Generates arbitrary Post objects that always have a mediaUrl (image).
 */
export const arbitraryPostWithImage = (): fc.Arbitrary<Post> =>
  arbitraryPost().map((post) => ({
    ...post,
    mediaUrl: 'https://example.com/image.jpg',
  }));
