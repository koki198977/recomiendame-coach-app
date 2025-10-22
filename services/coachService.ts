import api from './api';
import { Coach, PaginatedResponse, Recommendation } from '../types';

export class CoachService {
  static async getAllCoaches(page = 1, limit = 10): Promise<PaginatedResponse<Coach>> {
    const response = await api.get<PaginatedResponse<Coach>>('/coaches', {
      params: { page, limit }
    });
    return response.data;
  }

  static async getCoachById(id: string): Promise<Coach> {
    const response = await api.get<Coach>(`/coaches/${id}`);
    return response.data;
  }

  static async searchCoaches(query: {
    specialties?: string[];
    minRating?: number;
    maxHourlyRate?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Coach>> {
    const response = await api.get<PaginatedResponse<Coach>>('/coaches/search', {
      params: query
    });
    return response.data;
  }

  static async getRecommendations(): Promise<Recommendation[]> {
    const response = await api.get<Recommendation[]>('/coaches/recommendations');
    return response.data;
  }

  static async createCoachProfile(coachData: {
    specialties: string[];
    experience: number;
    bio: string;
    hourlyRate: number;
    availability: string[];
  }): Promise<Coach> {
    const response = await api.post<Coach>('/coaches', coachData);
    return response.data;
  }

  static async updateCoachProfile(id: string, coachData: Partial<{
    specialties: string[];
    experience: number;
    bio: string;
    hourlyRate: number;
    availability: string[];
  }>): Promise<Coach> {
    const response = await api.put<Coach>(`/coaches/${id}`, coachData);
    return response.data;
  }
}