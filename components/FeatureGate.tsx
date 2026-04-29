import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FeatureKey, UsePlanResult } from '../hooks/usePlan';

interface FeatureGateProps {
  feature: FeatureKey;
  plan: UsePlanResult;
  children: React.ReactNode;
  /** Renderiza un placeholder en lugar de null cuando está bloqueado */
  fallback?: React.ReactNode;
}

/**
 * Wrapper que bloquea el contenido si el usuario no tiene acceso al feature.
 * Requiere pasar el resultado de usePlan() como prop para evitar múltiples instancias del hook.
 *
 * Uso:
 *   <FeatureGate feature="view_recipe" plan={plan}>
 *     <RecipeDetail />
 *   </FeatureGate>
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  plan,
  children,
  fallback,
}) => {
  const status = plan.checkFeature(feature);

  if (status.allowed) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return null;
};

/**
 * Botón con lock que abre el paywall al presionar.
 * Útil para reemplazar botones PRO en pantallas.
 */
interface LockedButtonProps {
  label: string;
  plan: UsePlanResult;
  feature: FeatureKey;
  style?: object;
}

export const LockedButton: React.FC<LockedButtonProps> = ({
  label,
  plan,
  feature,
  style,
}) => (
  <TouchableOpacity
    style={[styles.lockedBtn, style]}
    onPress={() => plan.showPaywall(feature)}
  >
    <Text style={styles.lockIcon}>🔒</Text>
    <Text style={styles.lockedBtnText}>{label}</Text>
    <View style={styles.proBadge}>
      <Text style={styles.proBadgeText}>PRO</Text>
    </View>
  </TouchableOpacity>
);

/**
 * Badge PRO pequeño para mostrar junto a features bloqueadas.
 */
export const ProBadge: React.FC = () => (
  <View style={styles.proBadgeInline}>
    <Text style={styles.proBadgeText}>PRO</Text>
  </View>
);

const styles = StyleSheet.create({
  lockedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  lockIcon: { fontSize: 16 },
  lockedBtnText: { flex: 1, fontSize: 15, color: '#999', fontWeight: '500' },
  proBadge: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proBadgeInline: {
    backgroundColor: '#2E7D32',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 4,
  },
  proBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
