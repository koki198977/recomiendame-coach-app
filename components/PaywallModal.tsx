import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import api from '../services/api';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgradeSuccess: () => Promise<void>;
}

export interface SubscriptionPlan {
  id: string;
  label: string;
  price: string;
  period: string;
  badge?: string | null;
  saving?: string | null;
}

const PRO_FEATURES = [
  { icon: '🧠', label: 'Chapi 2.0 (IA avanzada)' },
  { icon: '📖', label: 'Ver recetas completas' },
  { icon: '🔄', label: 'Regenerar comidas' },
  { icon: '📊', label: 'Análisis semanal' },
  { icon: '🎥', label: 'Videos de ejercicios' },
];

const FREE_FEATURES = [
  { icon: '📸', label: '1 foto de comida por día' },
  { icon: '📋', label: '1 plan nutricional por mes' },
  { icon: '💪', label: '1 rutina por mes' },
  { icon: '💬', label: '3 mensajes a Chapi por día' },
];

export const PaywallModal: React.FC<PaywallModalProps> = ({
  visible,
  onClose,
  onUpgradeSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      if (!visible) return;
      try {
        setLoadingPlans(true);
        const response = await api.get<SubscriptionPlan[]>('/subscriptions/plans');
        setPlans(response.data);
        if (response.data.length > 0) {
          // Pre-seleccionar el que tenga badge o el primero
          const popularPlan = response.data.find(p => p.badge);
          setSelectedPlan(popularPlan ? popularPlan.id : response.data[0].id);
        }
      } catch (error) {
        console.log('Error fetching plans:', error);
      } finally {
        setLoadingPlans(false);
      }
    };
    
    fetchPlans();
  }, [visible]);

  // Listener para capturar el regreso desde el navegador de pago
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { path, queryParams } = Linking.parse(event.url);
      console.log('🔗 Deep Link recibido:', path, queryParams);

      if (path === 'payment-success') {
        console.log('✅ Pago detectado vía Deep Link');
        WebBrowser.dismissBrowser();
        await onUpgradeSuccess();
        onClose();
        Alert.alert('¡Suscripción activada! 🎉', 'Tu plan PRO ya está activo. ¡Disfrútalo!');
      } else if (path === 'payment-failure') {
        console.log('❌ Pago fallido vía Deep Link');
        WebBrowser.dismissBrowser();
        Alert.alert('Pago cancelado', 'No se pudo procesar el pago. Puedes intentarlo de nuevo.');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [onUpgradeSuccess, onClose]);

  const pollForSubscription = async (maxAttempts = 10, interval = 2000): Promise<boolean> => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await api.get('/subscriptions/status');
        if (res.data.plan === 'PRO') return true;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    try {
      setLoading(true);
      const response = await api.post('/subscriptions/checkout', {
        planType: selectedPlan,
      });
      const { checkoutUrl } = response.data;
      const result = await WebBrowser.openBrowserAsync(checkoutUrl);

      // Después de cerrar el browser, hacer polling para confirmar el pago
      const activated = await pollForSubscription();
      if (activated) {
        await onUpgradeSuccess();
        onClose();
        Alert.alert('¡Suscripción activada! 🎉', 'Tu plan PRO ya está activo. ¡Disfrútalo!');
      } else {
        // El pago puede estar pendiente o el usuario canceló
        await onUpgradeSuccess(); // Refrescar de todas formas
        Alert.alert(
          'Pago en proceso',
          'Si completaste el pago, puede tardar unos minutos en activarse. Si no, puedes intentar de nuevo.',
          [{ text: 'Entendido' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo iniciar el proceso de pago. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Image
            source={require('../assets/chapi-3d.png')}
            style={styles.chapiImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>Desbloquea Recomiéndame Pro</Text>
          <View style={styles.trialBadge}>
            <Text style={styles.trialBadgeText}>3 días gratis — sin cobro si cancelas antes</Text>
          </View>
        </View>

        {/* Plan selector */}
        <View style={styles.planSelector}>
          {loadingPlans ? (
            <View style={styles.loadingPlansContainer}>
              <ActivityIndicator color="#2E7D32" size="small" />
              <Text style={styles.loadingPlansText}>Cargando planes...</Text>
            </View>
          ) : plans.length === 0 ? (
            <Text style={styles.noPlansText}>No hay planes disponibles en este momento.</Text>
          ) : (
            plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan(plan.id)}
              >
                {plan.badge && (
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}
                <Text style={[styles.planLabel, selectedPlan === plan.id && styles.planLabelSelected]}>
                  {plan.label}
                </Text>
                <Text style={[styles.planPrice, selectedPlan === plan.id && styles.planPriceSelected]}>
                  {plan.price}
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </Text>
                {plan.saving && (
                  <Text style={styles.planSaving}>{plan.saving}</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* PRO features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresSectionTitle}>Con PRO tienes:</Text>
          {PRO_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✅</Text>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* FREE features */}
        <View style={styles.featuresSection}>
          <Text style={[styles.featuresSectionTitle, styles.freeSectionTitle]}>Con FREE tienes:</Text>
          {FREE_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureCheckGray}>•</Text>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureLabel, styles.featureLabelGray]}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaPrimary, (!selectedPlan || loading) && styles.ctaDisabled]}
          onPress={handleSubscribe}
          disabled={!selectedPlan || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaPrimaryText}>Empezar 3 días gratis</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.ctaSecondary} onPress={onClose}>
          <Text style={styles.ctaSecondaryText}>Continuar con Free</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Sin cobro si cancelas antes de los 3 días. Renovación automática. Cancela cuando quieras.
        </Text>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 20 },
  header: {
    backgroundColor: '#2E7D32',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chapiImage: { width: 90, height: 90, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 10 },
  trialBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  trialBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  planSelector: { flexDirection: 'row', gap: 12, marginBottom: 24, minHeight: 120 },
  loadingPlansContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingPlansText: { color: '#666', marginTop: 8, fontSize: 14 },
  noPlansText: { color: '#666', textAlign: 'center', paddingVertical: 20, fontSize: 14, flex: 1 },
  planCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    position: 'relative',
  },
  planCardSelected: { borderColor: '#2E7D32', backgroundColor: '#F1F8E9' },
  planBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  planBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  planLabel: { fontSize: 14, color: '#666', marginBottom: 4, marginTop: 6 },
  planLabelSelected: { color: '#2E7D32', fontWeight: '600' },
  planPrice: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  planPriceSelected: { color: '#2E7D32' },
  planPeriod: { fontSize: 13, fontWeight: '400', color: '#666' },
  planSaving: { fontSize: 12, color: '#2E7D32', fontWeight: '600', marginTop: 2 },
  featuresSection: { marginBottom: 16 },
  featuresSectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
  freeSectionTitle: { color: '#888' },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureCheck: { fontSize: 16, marginRight: 6 },
  featureCheckGray: { fontSize: 18, marginRight: 8, color: '#bbb' },
  featureIcon: { fontSize: 16, marginRight: 8 },
  featureLabel: { fontSize: 14, color: '#333' },
  featureLabelGray: { color: '#999' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  ctaPrimary: {
    backgroundColor: '#2E7D32',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaPrimaryText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  ctaSecondary: { alignItems: 'center', paddingVertical: 10, marginBottom: 12 },
  ctaSecondaryText: { color: '#999', fontSize: 15 },
  legal: { fontSize: 11, color: '#bbb', textAlign: 'center', lineHeight: 16 },
});
