import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingContextType {
  isOnboardingCompleted: boolean;
  isLoading: boolean;
  completeOnboarding: () => void;
  userProfile: any;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem('onboardingCompleted');
      const profile = await AsyncStorage.getItem('userProfile');
      
      setIsOnboardingCompleted(completed === 'true');
      if (profile) {
        setUserProfile(JSON.parse(profile));
      }
    } catch (error) {
      console.log('Error checking onboarding status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = () => {
    setIsOnboardingCompleted(true);
    checkOnboardingStatus(); // Reload profile data
  };

  const value: OnboardingContextType = {
    isOnboardingCompleted,
    isLoading,
    completeOnboarding,
    userProfile,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};