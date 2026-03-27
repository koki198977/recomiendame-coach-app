import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import { TooltipProps } from 'rn-tourguide';

export const CustomTooltip = ({
  isFirstStep,
  isLastStep,
  handleNext,
  handlePrev,
  handleStop,
  currentStep,
  labels,
}: TooltipProps) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const onNext = () => {
    setIsLoading(true);
    const nextStepNum = parseInt(currentStep.name, 10) + 1;
    
    // Emit scroll intent so HomeScreen can scroll BEFORE the tour guide transitions
    DeviceEventEmitter.emit('tourPreScroll', nextStepNum);

    setTimeout(() => {
      setIsLoading(false);
      if (handleNext) handleNext();
    }, 450);
  };

  const onPrev = () => {
    setIsLoading(true);
    const prevStepNum = parseInt(currentStep.name, 10) - 1;
    
    DeviceEventEmitter.emit('tourPreScroll', prevStepNum);

    setTimeout(() => {
      setIsLoading(false);
      if (handlePrev) handlePrev();
    }, 450);
  };

  return (
    <View style={styles.tooltipContainer}>
      <View style={styles.tooltipContent}>
        <Text testID="stepDescription" style={styles.tooltipText}>
          {currentStep && currentStep.text}
        </Text>
      </View>
      <View style={styles.bottomBar}>
        {!isLastStep ? (
          <TouchableOpacity onPress={handleStop} style={styles.buttonSkip} disabled={isLoading}>
            <Text style={styles.buttonSkipText}>{labels?.skip || 'Omitir'}</Text>
          </TouchableOpacity>
        ) : <View style={styles.spacer} />}
        
        <View style={styles.rightButtons}>
          {!isFirstStep && (
            <TouchableOpacity onPress={onPrev} style={styles.buttonPrev} disabled={isLoading}>
              <Text style={styles.buttonPrevText}>{labels?.previous || 'Anterior'}</Text>
            </TouchableOpacity>
          )}
          
          {!isLastStep ? (
            <TouchableOpacity onPress={onNext} style={styles.buttonNext} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonNextText}>{labels?.next || 'Siguiente'}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleStop} style={styles.buttonFinish}>
              <Text style={styles.buttonNextText}>{labels?.finish || 'Entendido'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tooltipContainer: {
    borderRadius: 16,
    paddingTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    width: '100%',
    backgroundColor: '#ffffff',
  },
  tooltipContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tooltipText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  spacer: {
    width: 60,
  },
  rightButtons: {
    flexDirection: 'row',
  },
  buttonSkip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  buttonSkipText: {
    color: '#999',
    fontSize: 14,
  },
  buttonPrev: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  buttonPrevText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonNext: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  buttonFinish: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonNextText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
