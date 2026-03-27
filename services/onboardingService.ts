import api from './api';

export const OnboardingService = {
  syncProgress: async (stepNumber: number): Promise<void> => {
    try {
      await api.patch('/users/me/onboarding', { onboardingStep: stepNumber });
    } catch (error) {
      console.warn('[OnboardingService] syncProgress failed (offline?):', error);
    }
  },

  syncCompleted: async (): Promise<void> => {
    try {
      await api.patch('/users/me/onboarding', { onboardingCompleted: true });
    } catch (error) {
      console.warn('[OnboardingService] syncCompleted failed (offline?):', error);
    }
  },
};
