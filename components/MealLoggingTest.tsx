import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NutritionService } from '../services/nutritionService';
import { LogMealRequest } from '../types/nutrition';

export default function MealLoggingTest() {
  const [isLogging, setIsLogging] = useState(false);

  const testMealData: LogMealRequest = {
    slot: 'SNACK',
    title: 'Test Product (100g)',
    kcal: 75, // Entero
    protein_g: 7, // Entero (redondeado de 6.6)
    carbs_g: 9, // Entero (redondeado de 8.5)
    fat_g: 2, // Entero (redondeado de 1.6)
    notes: 'Producto de prueba escaneado con código de barras',
    imageUrl: 'https://images.openfoodfacts.org/images/products/780/290/000/1926/front_fr.23.400.jpg'
  };

  const handleTestLogging = async () => {
    setIsLogging(true);
    
    try {
      console.log('🧪 Testing meal logging with data:', testMealData);
      
      const response = await NutritionService.logMeal(testMealData);
      
      console.log('✅ Test successful:', response);
      
      Alert.alert(
        '✅ Test Exitoso',
        `Comida registrada correctamente:\n\nID: ${response.id}\nMensaje: ${response.message}`,
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      console.error('❌ Test failed:', error);
      
      let errorMessage = 'Error desconocido';
      
      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join('\n');
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        '❌ Test Fallido',
        `Error: ${errorMessage}\n\nStatus: ${error.response?.status || 'N/A'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="flask" size={48} color="#4CAF50" />
        <Text style={styles.title}>Test de Logging</Text>
        <Text style={styles.description}>
          Prueba el registro de comidas con datos validados
        </Text>
        
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>Datos de prueba:</Text>
          <Text style={styles.dataText}>• Calorías: {testMealData.kcal} kcal</Text>
          <Text style={styles.dataText}>• Proteína: {testMealData.protein_g}g</Text>
          <Text style={styles.dataText}>• Carbohidratos: {testMealData.carbs_g}g</Text>
          <Text style={styles.dataText}>• Grasas: {testMealData.fat_g}g</Text>
          <Text style={styles.dataText}>• Slot: {testMealData.slot}</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.testButton, isLogging && styles.testButtonDisabled]}
          onPress={handleTestLogging}
          disabled={isLogging}
        >
          {isLogging ? (
            <>
              <Ionicons name="hourglass" size={20} color="white" />
              <Text style={styles.testButtonText}>Probando...</Text>
            </>
          ) : (
            <>
              <Ionicons name="play" size={20} color="white" />
              <Text style={styles.testButtonText}>Probar Logging</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  dataContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  dataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dataText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});