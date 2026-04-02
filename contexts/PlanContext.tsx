import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export type PlanType = 'FREE' | 'PRO';
export type FeatureKey =
  | 'photo_meal_log'
  | 'plan_generate'
  | 'workout_generate'
  | 'chapi_basic'
  | 'chapi_v2'
  | 'view_recipe'
  | 'regenerate_meal'
  | 'weekly_analysis'
  | 'exercise_video';

export interface FeatureStatus {
  allowed: boolean;
  current?: number;
  limit?: number;
  resetsAt?: Date;
}

interface UsageData {
  features: {
    [key: string]: { current: number; limit: number | null; resetsAt: string };
  };
}

interface PlanContextType {
  isPro: boolean;
  isFree: boolean;
  plan: PlanType;
  checkFeature: (feature: FeatureKey) => FeatureStatus;
  showPaywall: (feature?: FeatureKey) => void;
  hidePaywall: () => void;
  refreshPlan: () => Promise<void>;
  paywallVisible: boolean;
  paywallFeature: FeatureKey | undefined;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const PLAN_STORAGE_KEY = '@user_plan';

export const PlanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [plan, setPlan] = useState<PlanType>('FREE');
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<FeatureKey | undefined>();

  const isPro = plan === 'PRO';
  const isFree = plan === 'FREE';

  // Cargar plan desde storage al iniciar
  useEffect(() => {
    const loadStoredPlan = async () => {
      try {
        const stored = await AsyncStorage.getItem(PLAN_STORAGE_KEY);
        if (stored) setPlan(stored as PlanType);
      } catch {}
    };
    loadStoredPlan();
  }, []);

  const refreshPlan = useCallback(async () => {
    try {
      const [statusRes, usageRes] = await Promise.all([
        api.get('/subscriptions/status'),
        api.get('/users/me/usage'),
      ]);
      const newPlan: PlanType = statusRes.data.plan ?? 'FREE';
      setPlan(newPlan);
      setUsageData(usageRes.data);
      await AsyncStorage.setItem(PLAN_STORAGE_KEY, newPlan);
    } catch {
      try {
        const stored = await AsyncStorage.getItem(PLAN_STORAGE_KEY);
        if (stored) setPlan(stored as PlanType);
      } catch {}
    }
  }, []);

  // Refrescar al montar
  useEffect(() => {
    refreshPlan();
  }, []);

  const checkFeature = useCallback(
    (feature: FeatureKey): FeatureStatus => {
      if (isPro) return { allowed: true };

      const proOnly: FeatureKey[] = [
        'chapi_v2', 'view_recipe', 'regenerate_meal', 'weekly_analysis', 'exercise_video',
      ];
      if (proOnly.includes(feature)) return { allowed: false };

      const usage = usageData?.features[feature];
      if (usage && usage.limit !== null) {
        return {
          allowed: usage.current < usage.limit,
          current: usage.current,
          limit: usage.limit,
          resetsAt: usage.resetsAt ? new Date(usage.resetsAt) : undefined,
        };
      }
      return { allowed: true };
    },
    [isPro, usageData]
  );

  const showPaywall = useCallback((feature?: FeatureKey) => {
    setPaywallFeature(feature);
    setPaywallVisible(true);
  }, []);

  const hidePaywall = useCallback(() => {
    setPaywallVisible(false);
    setPaywallFeature(undefined);
  }, []);

  return (
    <PlanContext.Provider value={{
      isPro, isFree, plan,
      checkFeature, showPaywall, hidePaywall,
      refreshPlan, paywallVisible, paywallFeature,
    }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = (): PlanContextType => {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
};
