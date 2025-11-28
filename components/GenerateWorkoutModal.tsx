import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { WorkoutGoal } from '../types/nutrition';

interface GenerateWorkoutModalProps {
  visible: boolean;
  onGenerate: (daysAvailable: number, goal: WorkoutGoal) => void;
  onClose: () => void;
}

export const GenerateWorkoutModal: React.FC<GenerateWorkoutModalProps> = ({
  visible,
  onGenerate,
  onClose,
}) => {
  const [selectedDays, setSelectedDays] = useState<number>(3);
  const [selectedGoal, setSelectedGoal] = useState<WorkoutGoal>('HYPERTROPHY');

  const goals: { value: WorkoutGoal; label: string; emoji: string; description: string }[] = [
    {
      value: 'HYPERTROPHY',
      label: 'Hipertrofia',
      emoji: '💪',
      description: 'Aumentar masa muscular',
    },
    {
      value: 'STRENGTH',
      label: 'Fuerza',
      emoji: '🏋️',
      description: 'Aumentar fuerza máxima',
    },
    {
      value: 'ENDURANCE',
      label: 'Resistencia',
      emoji: '🏃',
      description: 'Mejorar resistencia cardiovascular',
    },
    {
      value: 'WEIGHT_LOSS',
      label: 'Pérdida de peso',
      emoji: '🔥',
      description: 'Quemar grasa y tonificar',
    },
  ];

  const handleGenerate = () => {
    onGenerate(selectedDays, selectedGoal);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Generar Rutina</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Días disponibles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>¿Cuántos días puedes entrenar?</Text>
              <View style={styles.daysContainer}>
                {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.dayButton,
                      selectedDays === days && styles.dayButtonActive,
                    ]}
                    onPress={() => setSelectedDays(days)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        selectedDays === days && styles.dayButtonTextActive,
                      ]}
                    >
                      {days}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Objetivo */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>¿Cuál es tu objetivo?</Text>
              {goals.map((goal) => (
                <TouchableOpacity
                  key={goal.value}
                  style={[
                    styles.goalCard,
                    selectedGoal === goal.value && styles.goalCardActive,
                  ]}
                  onPress={() => setSelectedGoal(goal.value)}
                >
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                    <View style={styles.goalInfo}>
                      <Text
                        style={[
                          styles.goalLabel,
                          selectedGoal === goal.value && styles.goalLabelActive,
                        ]}
                      >
                        {goal.label}
                      </Text>
                      <Text style={styles.goalDescription}>{goal.description}</Text>
                    </View>
                  </View>
                  {selectedGoal === goal.value && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Botón generar */}
            <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
              <Text style={styles.generateButtonText}>🤖 Generar rutina con IA</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
  },
  dayButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  goalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  goalLabelActive: {
    color: '#2E7D32',
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
