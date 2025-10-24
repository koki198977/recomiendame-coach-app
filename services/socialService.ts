import api from './api';
import { 
  Post, 
  PostsResponse,
  CreatePostRequest, 
  Comment, 
  CreateCommentRequest, 
  CommentsResponse, 
  LikeResponse 
} from '../types/nutrition';

export class SocialService {
  // Posts
  static async createPost(postData: CreatePostRequest): Promise<Post> {
    const response = await api.post<Post>('/posts', postData);
    return response.data;
  }

  static async getAllPosts(skip: number = 0, take: number = 20): Promise<PostsResponse> {
    // Todos los posts públicos de la comunidad
    const response = await api.get<PostsResponse>('/posts', {
      params: { skip, take }
    });
    console.log('All posts response:', response.data);
    return response.data;
  }

  static async getFollowingPosts(skip: number = 0, take: number = 20): Promise<PostsResponse> {
    // Posts de personas que sigo
    const response = await api.get<PostsResponse>('/posts/following', {
      params: { skip, take }
    });
    console.log('Following posts response:', response.data);
    return response.data;
  }

  static async getMyPosts(skip: number = 0, take: number = 20, date?: string): Promise<PostsResponse> {
    const params: any = { skip, take };
    if (date) params.date = date;
    
    const response = await api.get<PostsResponse>('/posts/me', { params });
    return response.data;
  }

  static async getPostById(postId: string): Promise<Post> {
    const response = await api.get<Post>(`/posts/${postId}`);
    return response.data;
  }

  static async deletePost(postId: string): Promise<void> {
    await api.delete(`/posts/${postId}`);
  }

  // Likes
  static async likePost(postId: string): Promise<LikeResponse> {
    const response = await api.post(`/posts/${postId}/like`);
    // Si la API no devuelve datos específicos, asumir que fue exitoso
    return {
      liked: true,
      likesCount: response.data?.likesCount || 0
    };
  }

  static async unlikePost(postId: string): Promise<LikeResponse> {
    const response = await api.delete(`/posts/${postId}/like`);
    // Si la API no devuelve datos específicos, asumir que fue exitoso
    return {
      liked: false,
      likesCount: response.data?.likesCount || 0
    };
  }

  // Comments
  static async getComments(postId: string, skip: number = 0, take: number = 20): Promise<CommentsResponse> {
    const response = await api.get<CommentsResponse>(`/posts/${postId}/comments`, {
      params: { skip, take }
    });
    return response.data;
  }

  static async createComment(postId: string, commentData: CreateCommentRequest): Promise<Comment> {
    const response = await api.post<Comment>(`/posts/${postId}/comments`, commentData);
    return response.data;
  }

  static async deleteComment(postId: string, commentId: string): Promise<void> {
    await api.delete(`/posts/${postId}/comments/${commentId}`);
  }
}