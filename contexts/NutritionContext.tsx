import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserProfile, NutritionPlan, Progress } from '../types/nutrition';
import { NutritionService } from '../services/nutritionService';

interface NutritionContextType {
  // User Profile
  userProfile: UserProfile | null;
  hasProfile: boolean;
  isLoadingProfile: boolean;
  profileError: string | null;
  
  // Current Plan
  currentPlan: NutritionPlan | null;
  hasPlan: boolean;
  isLoadingPlan: boolean;
  planError: string | null;
  
  // Today's Progress
  todayProgress: Progress | null;
  isLoadingProgress: boolean;
  progressError: string | null;
  
  // Actions
  loadUserProfile: () => Promise<void>;
  updateUserProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  loadCurrentPlan: () => Promise<void>;
  generateNewPlan: () => Promise<void>;
  loadTodayProgress: () => Promise<void>;
  updateTodayProgress: (progressData: Partial<Progress>) => Promise<void>;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

interface NutritionProviderProps {
  children: ReactNode;
}

export const NutritionProvider: React.FC<NutritionProviderProps> = ({ children }) => {
  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Current Plan State
  const [currentPlan, setCurrentPlan] = useState<NutritionPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Today's Progress State
  const [todayProgress, setTodayProgress] = useState<Progress | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  // Load User Profile
  const loadUserProfile = async () => {
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      console.log('Cargando perfil de usuario...');
      const profile = await NutritionService.getUserProfile();
      console.log('Perfil cargado:', profile);
      setUserProfile(profile);
    } catch (error: any) {
      console.log('Error cargando perfil:', error.response?.status, error.response?.data);
      if (error.response?.status === 404) {
        setUserProfile(null); // No profile exists yet
      } else {
        setProfileError(error.response?.data?.message || 'Error al cargar perfil');
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Update User Profile
  const updateUserProfile = async (profileData: Partial<UserProfile>) => {
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      const updatedProfile = userProfile
        ? await NutritionService.updateUserProfile(profileData)
        : await NutritionService.createUserProfile(profileData);
      setUserProfile(updatedProfile);
    } catch (error: any) {
      setProfileError(error.response?.data?.message || 'Error al actualizar perfil');
      throw error;
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Load Current Plan
  const loadCurrentPlan = async () => {
    setIsLoadingPlan(true);
    setPlanError(null);
    try {
      console.log('Cargando plan actual...');
      const plan = await NutritionService.getCurrentPlan();
      console.log('Plan cargado:', plan);
      setCurrentPlan(plan);
    } catch (error: any) {
      console.log('Error cargando plan:', error.response?.status, error.response?.data);
      if (error.response?.status === 404) {
        setCurrentPlan(null); // No hay plan activo
      } else {
        setPlanError(error.response?.data?.message || 'Error al cargar plan');
      }
    } finally {
      setIsLoadingPlan(false);
    }
  };

  // Generate New Plan with AI
  const generateNewPlan = async (week?: string) => {
    setIsLoadingPlan(true);
    setPlanError(null);
    try {
      const newPlan = await NutritionService.generatePlanWithAI(week);
      setCurrentPlan(newPlan);
      return newPlan;
    } catch (error: any) {
      setPlanError(error.response?.data?.message || 'Error al generar plan');
      throw error;
    } finally {
      setIsLoadingPlan(false);
    }
  };

  // Load Today's Progress
  const loadTodayProgress = async () => {
    setIsLoadingProgress(true);
    setProgressError(null);
    try {
      const progress = await NutritionService.getTodayProgress();
      setTodayProgress(progress);
    } catch (error: any) {
      setProgressError(error.response?.data?.message || 'Error al cargar progreso');
    } finally {
      setIsLoadingProgress(false);
    }
  };

  // Update Today's Progress
  const updateTodayProgress = async (progressData: Partial<Progress>) => {
    setIsLoadingProgress(true);
    setProgressError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const updatedProgress = todayProgress
        ? await NutritionService.updateProgress(today, progressData)
        : await NutritionService.logProgress({ ...progressData, date: today });
      setTodayProgress(updatedProgress);
    } catch (error: any) {
      setProgressError(error.response?.data?.message || 'Error al actualizar progreso');
      throw error;
    } finally {
      setIsLoadingProgress(false);
    }
  };

  // Load initial data - DESACTIVADO TEMPORALMENTE PARA DEBUG
  useEffect(() => {
    // No cargar datos automáticamente por ahora
    console.log('NutritionContext inicializado - carga manual de datos');
  }, []);

  const value: NutritionContextType = {
    // User Profile
    userProfile,
    hasProfile: !!userProfile,
    isLoadingProfile,
    profileError,
    
    // Current Plan
    currentPlan,
    hasPlan: !!currentPlan,
    isLoadingPlan,
    planError,
    
    // Today's Progress
    todayProgress,
    isLoadingProgress,
    progressError,
    
    // Actions
    loadUserProfile,
    updateUserProfile,
    loadCurrentPlan,
    generateNewPlan,
    loadTodayProgress,
    updateTodayProgress,
  };

  return (
    <NutritionContext.Provider value={value}>
      {children}
    </NutritionContext.Provider>
  );
};

export const useNutrition = (): NutritionContextType => {
  const context = useContext(NutritionContext);
  if (context === undefined) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
};