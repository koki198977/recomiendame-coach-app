import { useState, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_STEPS, OnboardingStep } from '../config/onboardingSteps';
import { OnboardingService } from '../services/onboardingService';
import { useTourGuideController } from 'rn-tourguide';

interface UseTourReturn {
  currentStep: OnboardingStep | null;
  totalSteps: number;
  nextStep: () => void;
  skipTour: () => void;
  isTourActive: boolean;
  initTour: (profile: { onboardingCompleted: boolean }) => Promise<void>;
}

export const useTour = (currentScreen: string): UseTourReturn => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const tourGuide = useTourGuideController();
  const hasStartedVisualTourRef = useRef(false);
  const isStartingVisualTourRef = useRef(false);

  const screenSteps = useMemo(
    () =>
      ONBOARDING_STEPS.filter(
        (s) => s.isActive && s.screen === currentScreen
      ).sort((a, b) => a.stepNumber - b.stepNumber),
    [currentScreen]
  );

  const totalSteps = useMemo(
    () => ONBOARDING_STEPS.filter((s) => s.isActive).length,
    []
  );

  const isTourActive = isActive && screenSteps.length > 0;
  const currentStep = screenSteps[currentStepIndex] ?? null;

  // Keep internal started flag synced with rn-tourguide lifecycle.
  useEffect(() => {
    const emitter = (tourGuide as any)?.eventEmitter;
    if (!emitter?.on) return;

    const handleStart = () => {
      hasStartedVisualTourRef.current = true;
      isStartingVisualTourRef.current = false;
      console.log('✅ Evento start recibido de rn-tourguide');
    };

    const handleStop = () => {
      hasStartedVisualTourRef.current = false;
      isStartingVisualTourRef.current = false;
      if (isActive) {
        console.log('🛑 Tour stop detectado, completando onboarding');
        completeOnboarding();
      }
    };

    const handleStepChange = (step: any) => {
      console.log('🔄 Tour step changed to:', step?.name);
      if (step?.name) {
        const stepNum = parseInt(step.name, 10);
        setCurrentStepIndex(prevIndex => {
          const index = screenSteps.findIndex(s => s.stepNumber === stepNum);
          return index !== -1 ? index : prevIndex;
        });
      }
    };

    emitter.on('start', handleStart);
    emitter.on('stop', handleStop);
    emitter.on('stepChange', handleStepChange);

    return () => {
      emitter.off?.('start', handleStart);
      emitter.off?.('stop', handleStop);
      emitter.off?.('stepChange', handleStepChange);
    };
  }, [tourGuide, isActive, screenSteps]);

  // Start the rn-tourguide visual tour when activated.
  // Retry until we receive the real `start` event.
  useEffect(() => {
    if (!isActive || screenSteps.length === 0) return;
    if (hasStartedVisualTourRef.current) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;

    const tryStart = () => {
      if (cancelled) return;

      const canStart = Boolean((tourGuide as any).canStart);
      if (canStart) {
        if (isStartingVisualTourRef.current) return;
        isStartingVisualTourRef.current = true;
        console.log('🚀 Tour listo, llamando tourGuide.start(1)');
        tourGuide.start(1);

        // If start event doesn't arrive, allow another retry.
        setTimeout(() => {
          if (!hasStartedVisualTourRef.current) {
            isStartingVisualTourRef.current = false;
          }
        }, 700);
        return;
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        console.log('⚠️ Tour no pudo iniciar: canStart=false');
        return;
      }

      setTimeout(tryStart, 250);
    };

    // Small initial delay to let first layout settle.
    const timer = setTimeout(tryStart, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isActive, screenSteps.length, tourGuide]);

  const completeOnboarding = async () => {
    await AsyncStorage.removeItem('onboardingStep');
    await AsyncStorage.setItem('onboardingCompleted', 'true');
    OnboardingService.syncCompleted(); // fire-and-forget
    hasStartedVisualTourRef.current = false;
    isStartingVisualTourRef.current = false;
    setIsActive(false);
  };

  const nextStep = () => {
    const isLastStep = currentStepIndex >= screenSteps.length - 1;
    if (isLastStep) {
      completeOnboarding();
    } else {
      const newIndex = currentStepIndex + 1;
      const newStepNumber = screenSteps[newIndex].stepNumber;
      setCurrentStepIndex(newIndex);
      AsyncStorage.setItem('onboardingStep', String(newStepNumber)); // fire-and-forget
      OnboardingService.syncProgress(newStepNumber); // fire-and-forget
    }
  };

  const skipTour = () => {
    completeOnboarding();
  };

  const initTour = async (profile: { onboardingCompleted: boolean }): Promise<void> => {
    console.log('🎯 initTour llamado con:', profile);
    
    const localCompleted = await AsyncStorage.getItem('onboardingCompleted');

    if (profile.onboardingCompleted || localCompleted === 'true') {
      console.log('✅ El usuario ya completó el onboarding, saltando tour visual.');
      setIsActive(false);
      return;
    }

    hasStartedVisualTourRef.current = false;
    isStartingVisualTourRef.current = false;
    setCurrentStepIndex(0);

    setIsActive(true);
    console.log('✅ isActive seteado a true, screenSteps:', screenSteps.length);
  };

  return {
    currentStep,
    totalSteps,
    nextStep,
    skipTour,
    isTourActive,
    initTour,
  };
};
