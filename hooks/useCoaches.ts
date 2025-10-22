import { useState, useEffect } from 'react';
import { CoachService } from '../services/coachService';
import { Coach, Recommendation } from '../types';

export const useCoaches = () => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCoaches = async (page = 1, limit = 10) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await CoachService.getAllCoaches(page, limit);
      setCoaches(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar coaches');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const data = await CoachService.getRecommendations();
      setRecommendations(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar recomendaciones');
    }
  };

  const searchCoaches = async (query: {
    specialties?: string[];
    minRating?: number;
    maxHourlyRate?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await CoachService.searchCoaches(query);
      setCoaches(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error en la búsqueda');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoaches();
  }, []);

  return {
    coaches,
    recommendations,
    isLoading,
    error,
    loadCoaches,
    loadRecommendations,
    searchCoaches,
    refetch: () => loadCoaches(),
  };
};