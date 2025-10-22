import { useState, useEffect } from 'react';
import { NutritionService } from '../services/nutritionService';
import { UserProfile, NutritionPlan, Progress } from '../types/nutrition';

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await NutritionService.getUserProfile();
      setProfile(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setProfile(null); // Usuario no tiene perfil aún
      } else {
        setError(err.response?.data?.message || 'Error al cargar perfil');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedProfile = profile 
        ? await NutritionService.updateUserProfile(profileData)
        : await NutritionService.createUserProfile(profileData);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar perfil');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return {
    profile,
    isLoading,
    error,
    loadProfile,
    updateProfile,
    hasProfile: !!profile,
  };
};

export const useCurrentPlan = () => {
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCurrentPlan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await NutritionService.getCurrentPlan();
      setPlan(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar plan');
    } finally {
      setIsLoading(false);
    }
  };

  const activatePlan = async (planId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const activatedPlan = await NutritionService.activatePlan(planId);
      setPlan(activatedPlan);
      return activatedPlan;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al activar plan');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  return {
    plan,
    isLoading,
    error,
    loadCurrentPlan,
    activatePlan,
    hasPlan: !!plan,
  };
};

export const useTodayProgress = () => {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTodayProgress = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await NutritionService.getTodayProgress();
      setProgress(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar progreso');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProgress = async (progressData: Partial<Progress>) => {
    setIsLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const updatedProgress = progress
        ? await NutritionService.updateProgress(today, progressData)
        : await NutritionService.logProgress({ ...progressData, date: today });
      setProgress(updatedProgress);
      return updatedProgress;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar progreso');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTodayProgress();
  }, []);

  return {
    progress,
    isLoading,
    error,
    loadTodayProgress,
    updateProgress,
    hasProgress: !!progress,
  };
};