import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ChapiService from '../services/chapiService';
import { ChapiInsightsResponse, ChapiRecommendation } from '../types/nutrition';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';

interface ChapiInsightsCardProps {
  onPress?: () => void;
  refreshKey?: number;
}

export const ChapiInsightsCard: React.FC<ChapiInsightsCardProps> = ({ 
  onPress, 
  refreshKey = 0 
}) => {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<ChapiInsightsResponse | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [refreshKey]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const response = await ChapiService.getInsights();
      if (response.success) {
        setInsights(response);
      }
    } catch (error) {
      console.log('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FF9500';
      case 'low': return '#4CAF50';
      default: return COLORS.primary;
    }
  };

  const getPriorityEmoji = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '💡';
    }
  };

  const getRecommendationEmoji = (type: string) => {
    switch (type) {
      case 'NUTRITION': return '🍎';
      case 'ACTIVITY': return '🏃';
      case 'EMOTIONAL': return '💭';
      case 'MOTIVATION': return '💪';
      default: return '💡';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando insights...</Text>
      </View>
    );
  }

  if (!insights || !insights.success) {
    return null;
  }

  const { data } = insights;
  const displayInsights = showAll ? data.insights : data.insights.slice(0, 2);
  const displayRecommendations = showAll ? data.recommendations : data.recommendations.slice(0, 2);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={['#E8F5E9', '#F1F8E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.chapiImageContainer}>
              <Image 
                source={require('../assets/chapi-3d-onboarding-3.png')}
                style={styles.chapiImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.title}>Chapi recomienda</Text>
              <Text style={styles.subtitle}>Recomendaciones personalizadas</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setShowAll(!showAll)}
          >
            <Text style={styles.expandText}>
              {showAll ? 'Ver menos' : 'Ver más'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Insights principales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Análisis</Text>
          {displayInsights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <Text style={styles.insightText}>• {insight}</Text>
            </View>
          ))}
        </View>

        {/* Recomendaciones */}
        {displayRecommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Recomendaciones</Text>
            {displayRecommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <View style={styles.recommendationHeader}>
                  <Text style={styles.recommendationEmoji}>
                    {getRecommendationEmoji(rec.type)}
                  </Text>
                  <Text style={styles.recommendationTitle}>{rec.title}</Text>
                  <Text style={styles.priorityBadge}>
                    {getPriorityEmoji(rec.priority)}
                  </Text>
                </View>
                <Text style={styles.recommendationDescription}>
                  {rec.description}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Alertas predictivas */}
        {data.predictiveAlerts.length > 0 && showAll && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Alertas</Text>
            {data.predictiveAlerts.map((alert, index) => (
              <View key={index} style={styles.alertItem}>
                <Text style={styles.alertText}>{alert}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Progreso de hoy */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>📅 Progreso de Hoy</Text>
          <View style={styles.progressGrid}>
            <View style={styles.progressItem}>
              <Text style={styles.progressEmoji}>
                {data.userContext.todayProgress.checkinCompleted ? '✅' : '⭕'}
              </Text>
              <Text style={styles.progressLabel}>Check-in</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressEmoji}>
                {data.userContext.todayProgress.mealsLogged > 0 ? '✅' : '⭕'}
              </Text>
              <Text style={styles.progressLabel}>Comidas</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressEmoji}>
                {data.userContext.todayProgress.workoutCompleted ? '✅' : '⭕'}
              </Text>
              <Text style={styles.progressLabel}>Ejercicio</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressEmoji}>
                {data.userContext.todayProgress.hydrationProgress > 0 ? '✅' : '⭕'}
              </Text>
              <Text style={styles.progressLabel}>Hidratación</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chapiImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  chapiImage: {
    width: 38,
    height: 38,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  expandButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  expandText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  insightItem: {
    marginBottom: 6,
  },
  insightText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  recommendationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recommendationEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  priorityBadge: {
    fontSize: 12,
  },
  recommendationDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 16,
  },
  alertItem: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  alertText: {
    fontSize: 13,
    color: '#D32F2F',
    lineHeight: 18,
  },
  progressSection: {
    marginTop: 8,
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressItem: {
    alignItems: 'center',
  },
  progressEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});