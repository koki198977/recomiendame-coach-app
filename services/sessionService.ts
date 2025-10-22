import api from './api';
import { Session, PaginatedResponse } from '../types';

export class SessionService {
  static async getUserSessions(page = 1, limit = 10): Promise<PaginatedResponse<Session>> {
    const response = await api.get<PaginatedResponse<Session>>('/sessions', {
      params: { page, limit }
    });
    return response.data;
  }

  static async getSessionById(id: string): Promise<Session> {
    const response = await api.get<Session>(`/sessions/${id}`);
    return response.data;
  }

  static async bookSession(sessionData: {
    coachId: string;
    scheduledAt: string;
    duration: number;
  }): Promise<Session> {
    const response = await api.post<Session>('/sessions', sessionData);
    return response.data;
  }

  static async cancelSession(id: string): Promise<Session> {
    const response = await api.patch<Session>(`/sessions/${id}/cancel`);
    return response.data;
  }

  static async completeSession(id: string, notes?: string): Promise<Session> {
    const response = await api.patch<Session>(`/sessions/${id}/complete`, {
      notes
    });
    return response.data;
  }

  static async getCoachSessions(page = 1, limit = 10): Promise<PaginatedResponse<Session>> {
    const response = await api.get<PaginatedResponse<Session>>('/sessions/coach', {
      params: { page, limit }
    });
    return response.data;
  }
}