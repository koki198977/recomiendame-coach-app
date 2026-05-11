import { DeviceEventEmitter } from 'react-native';

/**
 * Script para simular la llegada de una notificación de "Plan Listo"
 * Puedes ejecutar esto desde la consola de desarrollador o inyectarlo temporalmente
 */
export const simulatePlanReady = () => {
  console.log('🧪 Simulando notificación de PLAN_READY...');
  DeviceEventEmitter.emit('planReady', {
    type: 'PLAN_READY',
    week: '2024-W12',
    planId: 'simulated-plan-id'
  });
};
