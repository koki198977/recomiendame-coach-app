import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NutritionService } from "../services/nutritionService";
import { SocialService } from "../services/socialService";
import { UserProfile, SocialUserProfile } from "../types/nutrition";
import { EditPreferencesModal } from "../components/EditPreferencesModal";
import { FollowersModal } from "../components/FollowersModal";
import { EditFieldModal } from "../components/EditFieldModal";
import { PlanGeneratingModal } from "../components/PlanGeneratingModal";
import { getCurrentUserId } from "../utils/userUtils";

import { AppHeader } from '../components/AppHeader';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface ProfileScreenProps {
  onLogout?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const [user, setUser] = React.useState<any>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(
    null
  );
  const [socialProfile, setSocialProfile] =
    React.useState<SocialUserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showPreferencesModalState, setShowPreferencesModalState] =
    React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [preferencesType, setPreferencesType] = React.useState<
    "cuisinesLike" | "cuisinesDislike" | "allergies" | "conditions" | null
  >(null);
  const [currentWeight, setCurrentWeight] = React.useState<number | null>(null);
  const [editField, setEditField] = React.useState<{
    type: 'nutritionGoal' | 'targetWeight' | 'timeFrame' | 'intensity' | 'motivation' | null;
    value: any;
  }>({ type: null, value: null });
  const [isGeneratingPlan, setIsGeneratingPlan] = React.useState(false);
  const [generationProgress, setGenerationProgress] = React.useState(0);
  const [showEditNameModal, setShowEditNameModal] = React.useState(false);
  const [editingName, setEditingName] = React.useState({ name: '', lastName: '' });

  React.useEffect(() => {
    loadUserData();
  }, []);

  const loadCurrentWeight = async () => {
    try {
      // Obtener el último checkin con peso
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const today = new Date();
      
      const recentCheckins = await NutritionService.getCheckinHistory(
        oneMonthAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );

      const weightsWithDates = recentCheckins
        .filter(c => c.weightKg)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (weightsWithDates.length > 0) {
        setCurrentWeight(weightsWithDates[0].weightKg!);
      }
    } catch (error) {
      // Si falla, no hacer nada (se mostrará el peso del perfil)
    }
  };

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Cargar datos del usuario desde AsyncStorage
      const userData = await AsyncStorage.getItem("userData");
      if (userData) setUser(JSON.parse(userData));

      // Cargar perfil desde la API
      try {
        const profile = await NutritionService.getUserProfile();
        setUserProfile(profile);

        // Actualizar también en AsyncStorage
        await AsyncStorage.setItem("userProfile", JSON.stringify(profile));
      } catch (profileError) {
        console.log(
          "Error loading profile from API, trying local storage:",
          profileError
        );
      }

      // Cargar perfil del usuario (que incluye el userId correcto)
      try {
        const profileData = await SocialService.getCurrentUser();
        setCurrentUserId(profileData.userId);
        console.log(
          "ProfileScreen - Profile loaded with userId:",
          profileData.userId
        );

        // Cargar estadísticas sociales
        try {
          const socialStats = await SocialService.getMySocialProfile();
          setSocialProfile(socialStats);
          console.log("ProfileScreen - Social stats loaded:", socialStats);
        } catch (socialStatsError) {
          console.log("Error loading social stats:", socialStatsError);
        }
      } catch (socialError) {
        console.log("Error loading profile:", socialError);

        // Fallback: obtener desde AsyncStorage
        const userId = await getCurrentUserId();
        setCurrentUserId(userId);
        console.log("ProfileScreen - Fallback user ID:", userId);

        // Si falla la API, intentar cargar desde AsyncStorage
        const localProfile = await AsyncStorage.getItem("userProfile");
        if (localProfile) {
          setUserProfile(JSON.parse(localProfile));
        }
      }
      // Cargar peso actual del último checkin
      await loadCurrentWeight();
    } catch (error) {
      console.log("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        "authToken",
        "userData",
        "userProfile",
      ]);
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.log("Error during logout:", error);
    }
  };

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: logout },
    ]);
  };

  const renderProfileInfo = () => (
    <View style={styles.profileCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {userProfile?.name?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || "U"}
        </Text>
      </View>
      <Text style={styles.userName}>
        {userProfile?.name && userProfile?.lastName 
          ? `${userProfile.name} ${userProfile.lastName}`
          : userProfile?.name || user?.name || "Usuario"}
      </Text>
      <Text style={styles.userEmail}>{user?.email}</Text>
      
      <TouchableOpacity style={styles.editNameButton} onPress={handleEditName}>
        <Text style={styles.editNameButtonText}>✏️ Editar nombre</Text>
      </TouchableOpacity>
    </View>
  );

  const showPreferencesModal = (
    type: "cuisinesLike" | "cuisinesDislike" | "allergies" | "conditions"
  ) => {
    setPreferencesType(type);
    setShowPreferencesModalState(true);
  };

  const closePreferencesModal = () => {
    setShowPreferencesModalState(false);
    setPreferencesType(null);
  };

  const showEditPreferencesModal = (
    type: "cuisinesLike" | "cuisinesDislike" | "allergies" | "conditions"
  ) => {
    setPreferencesType(type);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setPreferencesType(null);
  };

  const pollForPlan = async (planId: string, week: string, attempts: number = 0) => {
    const maxAttempts = 20;
    const is504Timeout = planId.includes(week);
    const pollInterval = is504Timeout ? 10000 : 6000;
    const progress = Math.min(20 + (attempts / maxAttempts) * 75, 95);
    setGenerationProgress(progress);

    console.log(`🔄 Polling attempt ${attempts + 1}/${maxAttempts} for nutrition plan`);

    try {
      const plan = await NutritionService.getWeeklyPlan(week);
      const isPlanReady = plan && (plan.id === planId || planId.includes(week));

      if (isPlanReady) {
        console.log('✅ Nutrition plan is ready!');
        setGenerationProgress(100);
        setTimeout(() => {
          setIsGeneratingPlan(false);
          setGenerationProgress(0);
          Alert.alert('¡Listo! 🎉', 'Tu plan nutricional ha sido regenerado con tus nuevas preferencias.');
          loadUserData();
        }, 1000);
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(() => {
          pollForPlan(planId, week, attempts + 1);
        }, pollInterval);
      } else {
        setIsGeneratingPlan(false);
        setGenerationProgress(0);
        Alert.alert(
          'Plan en proceso',
          'Tu plan se está generando. Regresa en unos minutos para ver tu nuevo plan.'
        );
      }
    } catch (error) {
      if (attempts < maxAttempts) {
        setTimeout(() => {
          pollForPlan(planId, week, attempts + 1);
        }, pollInterval);
      } else {
        setIsGeneratingPlan(false);
        setGenerationProgress(0);
        Alert.alert('Error', 'Hubo un problema verificando tu plan.');
      }
    }
  };

  const handleSavePreferences = async (updatedPreferences: {
    cuisinesLike?: number[];
    cuisinesDislike?: number[];
    allergyIds?: number[];
    conditionIds?: number[];
  }) => {
    try {
      // Recargar el perfil para obtener los datos actualizados
      await loadUserData();

      // Si se actualizaron preferencias que afectan el plan, preguntar si desea regenerarlo
      const hasRelevantChanges = 
        updatedPreferences.allergyIds || 
        updatedPreferences.conditionIds || 
        updatedPreferences.cuisinesLike || 
        updatedPreferences.cuisinesDislike;

      if (hasRelevantChanges) {
        // Determinar el mensaje según qué se cambió
        let changeMessage = "Has actualizado tus ";
        const changes = [];
        if (updatedPreferences.allergyIds) changes.push("alergias");
        if (updatedPreferences.conditionIds) changes.push("condiciones médicas");
        if (updatedPreferences.cuisinesLike) changes.push("cocinas favoritas");
        if (updatedPreferences.cuisinesDislike) changes.push("cocinas a evitar");
        
        changeMessage += changes.join(", ").replace(/, ([^,]*)$/, " y $1");

        Alert.alert(
          "Plan Nutricional",
          `${changeMessage}. ¿Deseas regenerar tu plan nutricional para reflejar estos cambios?`,
          [
            {
              text: "No por ahora",
              style: "cancel"
            },
            {
              text: "Sí, regenerar plan",
              onPress: async () => {
                try {
                  setIsGeneratingPlan(true);
                  setGenerationProgress(10);
                  const currentWeek = NutritionService.getCurrentWeek();
                  
                  // Obtener el plan actual
                  const existingPlan = await NutritionService.getWeeklyPlan(currentWeek);
                  
                  // Si existe un plan, eliminarlo primero
                  if (existingPlan) {
                    console.log('Deleting existing plan:', existingPlan.id);
                    await NutritionService.deletePlan(existingPlan.id);
                  }
                  
                  // Intentar generar nuevo plan
                  try {
                    const generateResponse = await NutritionService.generatePlanWithAI(currentWeek);
                    if (generateResponse.created) {
                      pollForPlan(generateResponse.planId, currentWeek);
                    }
                  } catch (error: any) {
                    // Si es un 504, iniciar polling de todas formas
                    if (error.response?.status === 504) {
                      console.log('⏰ 504 Gateway Timeout - Starting polling...');
                      setGenerationProgress(20);
                      const tempPlanId = `${currentWeek}-${Date.now()}`;
                      pollForPlan(tempPlanId, currentWeek);
                      return;
                    }
                    throw error;
                  }
                } catch (error) {
                  console.log("Error generating plan:", error);
                  setIsGeneratingPlan(false);
                  setGenerationProgress(0);
                  Alert.alert("Error", "No se pudo regenerar el plan. Intenta nuevamente más tarde.");
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.log("Error reloading profile:", error);
    }
  };

  const handleSaveField = async (updatedProfile: UserProfile) => {
    try {
      setUserProfile(updatedProfile);
      setEditField({ type: null, value: null });
      // También recargar datos para asegurar sincronización
      await loadUserData();
    } catch (error) {
      console.log("Error updating field:", error);
    }
  };

  const openEditField = (type: 'nutritionGoal' | 'targetWeight' | 'timeFrame' | 'intensity' | 'motivation', currentValue: any) => {
    setEditField({ type, value: currentValue });
  };

  const handleEditName = () => {
    setEditingName({
      name: userProfile?.name || '',
      lastName: userProfile?.lastName || ''
    });
    setShowEditNameModal(true);
  };

  const handleSaveName = async () => {
    try {
      if (!editingName.name.trim()) {
        Alert.alert('Error', 'El nombre no puede estar vacío');
        return;
      }

      const updatedProfile = await NutritionService.updateUserProfile({
        name: editingName.name.trim(),
        lastName: editingName.lastName.trim()
      });

      setUserProfile(updatedProfile);
      
      // Actualizar también en AsyncStorage
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      setShowEditNameModal(false);
      Alert.alert('¡Listo!', 'Tu nombre ha sido actualizado');
      
      // Recargar datos para asegurar sincronización
      await loadUserData();
    } catch (error) {
      console.log('Error updating name:', error);
      Alert.alert('Error', 'No se pudo actualizar el nombre. Intenta nuevamente.');
    }
  };

  const getActivityLevelLabel = (level?: string): string => {
    const labels: { [key: string]: string } = {
      SEDENTARY: "Sedentario",
      LIGHT: "Ligero",
      MODERATE: "Moderado",
      ACTIVE: "Activo",
      VERY_ACTIVE: "Muy activo",
    };
    return labels[level || ""] || "No especificado";
  };

  const getGenderLabel = (sex?: string): string => {
    const labels: { [key: string]: string } = {
      MALE: "Masculino",
      FEMALE: "Femenino",
    };
    return labels[sex || ""] || "No especificado";
  };

  const getNutritionGoalLabel = (goal?: string): string => {
    console.log('🔍 NutritionGoal recibido:', goal); // Debug
    
    const labels: { [key: string]: string } = {
      MAINTAIN_WEIGHT: "Mantener peso",
      LOSE_WEIGHT: "Bajar de peso",
      GAIN_WEIGHT: "Subir de peso",
      GAIN_MUSCLE: "Ganar masa muscular",
      BUILD_MUSCLE: "Ganar masa muscular",
      IMPROVE_HEALTH: "Salud general",
      ATHLETIC_PERFORMANCE: "Salud general",
      GENERAL_HEALTH: "Salud general",
    };
    return labels[goal || ""] || "No especificado";
  };

  const getTimeFrameLabel = (timeFrame?: string): string => {
    console.log('🔍 TimeFrame recibido:', timeFrame); // Debug
    
    const labels: { [key: string]: string } = {
      "1_MONTH": "1 mes",
      "ONE_MONTH": "1 mes",
      "3_MONTHS": "3 meses", 
      "THREE_MONTHS": "3 meses",
      "6_MONTHS": "6 meses",
      "SIX_MONTHS": "6 meses",
      "1_YEAR": "1 año",
      "ONE_YEAR": "1 año",
      "LONG_TERM": "Largo plazo",
    };
    
    const result = labels[timeFrame || ""] || `No especificado`;
    console.log('🔍 TimeFrame mapeado:', result); // Debug
    return result;
  };

  const getIntensityLabel = (intensity?: string): string => {
    const labels: { [key: string]: string } = {
      LOW: "Suave",
      MODERATE: "Moderado",
      HIGH: "Intensivo",
      // Mantener compatibilidad con valores anteriores
      GENTLE: "Suave",
      AGGRESSIVE: "Intensivo",
    };
    return labels[intensity || ""] || "No especificado";
  };

  const renderHealthData = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Datos de Salud</Text>

      <TouchableOpacity style={styles.dataItem}>
        <View style={styles.dataLeft}>
          <Text style={styles.dataIcon}>⚖️</Text>
          <Text style={styles.dataLabel}>Peso actual</Text>
        </View>
        <Text style={styles.dataValue}>
          {currentWeight
            ? `${currentWeight} kg`
            : userProfile?.weightKg
            ? `${userProfile.weightKg} kg`
            : "No especificado"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.dataItem}>
        <View style={styles.dataLeft}>
          <Text style={styles.dataIcon}>📏</Text>
          <Text style={styles.dataLabel}>Estatura</Text>
        </View>
        <Text style={styles.dataValue}>
          {userProfile?.heightCm
            ? `${userProfile.heightCm} cm`
            : "No especificado"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.dataItem}>
        <View style={styles.dataLeft}>
          <Text style={styles.dataIcon}>👤</Text>
          <Text style={styles.dataLabel}>Género</Text>
        </View>
        <Text style={styles.dataValue}>{getGenderLabel(userProfile?.sex)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.dataItem}>
        <View style={styles.dataLeft}>
          <Text style={styles.dataIcon}>🏃</Text>
          <Text style={styles.dataLabel}>Actividad física</Text>
        </View>
        <Text style={styles.dataValue}>
          {getActivityLevelLabel(userProfile?.activityLevel)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dataItem}
        onPress={() => showPreferencesModal("allergies")}
      >
        <View style={styles.dataLeft}>
          <Text style={styles.dataIcon}>🚫</Text>
          <Text style={styles.dataLabel}>Alergias</Text>
        </View>
        <View style={styles.dataRight}>
          <Text style={styles.dataValue}>
            {userProfile?.allergies && userProfile.allergies.length > 0
              ? `${userProfile.allergies.length} registradas`
              : "Ninguna"}
          </Text>
          <Text style={styles.menuArrow}>›</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dataItem}
        onPress={() => showPreferencesModal("conditions")}
      >
        <View style={styles.dataLeft}>
          <Text style={styles.dataIcon}>🏥</Text>
          <Text style={styles.dataLabel}>Condiciones médicas</Text>
        </View>
        <View style={styles.dataRight}>
          <Text style={styles.dataValue}>
            {userProfile?.conditions && userProfile.conditions.length > 0
              ? `${userProfile.conditions.length} registradas`
              : "Ninguna"}
          </Text>
          <Text style={styles.menuArrow}>›</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const [showFollowersModal, setShowFollowersModal] = React.useState(false);
  const [showFollowingModal, setShowFollowingModal] = React.useState(false);

  const renderSocialStats = () => {
    console.log("Rendering social stats with profile:", socialProfile);
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Red Social</Text>

        <TouchableOpacity style={styles.dataItem}>
          <View style={styles.dataLeft}>
            <Text style={styles.dataIcon}>📝</Text>
            <Text style={styles.dataLabel}>Mis posts</Text>
          </View>
          <Text style={styles.dataValue}>{socialProfile?.postsCount || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dataItem}
          onPress={() => {
            if (currentUserId || socialProfile?.id) {
              setShowFollowersModal(true);
            } else {
              console.log("No user ID available for followers");
            }
          }}
        >
          <View style={styles.dataLeft}>
            <Text style={styles.dataIcon}>👥</Text>
            <Text style={styles.dataLabel}>Seguidores</Text>
          </View>
          <View style={styles.dataRight}>
            <Text style={styles.dataValue}>
              {socialProfile?.followersCount || 0}
            </Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dataItem}
          onPress={() => {
            if (currentUserId || socialProfile?.id) {
              setShowFollowingModal(true);
            } else {
              console.log("No user ID available for following");
            }
          }}
        >
          <View style={styles.dataLeft}>
            <Text style={styles.dataIcon}>👤</Text>
            <Text style={styles.dataLabel}>Siguiendo</Text>
          </View>
          <View style={styles.dataRight}>
            <Text style={styles.dataValue}>
              {socialProfile?.followingCount || 0}
            </Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderNutritionGoals = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Objetivos Nutricionales</Text>

      <TouchableOpacity 
        style={styles.dataItem}
        onPress={() => openEditField('nutritionGoal', userProfile?.nutritionGoal)}
      >
        <View style={styles.dataLeft}>
          <Text style={styles.dataIcon}>🎯</Text>
          <Text style={styles.dataLabel}>Objetivo principal</Text>
        </View>
        <View style={styles.dataRight}>
          <Text style={styles.dataValue}>
            {getNutritionGoalLabel(userProfile?.nutritionGoal)}
          </Text>
          <Text style={styles.menuArrow}>›</Text>
        </View>
      </TouchableOpacity>

      {(userProfile?.nutritionGoal === 'LOSE_WEIGHT' || userProfile?.nutritionGoal === 'GAIN_WEIGHT') && (
        <TouchableOpacity 
          style={styles.dataItem}
          onPress={() => openEditField('targetWeight', userProfile?.targetWeightKg)}
        >
          <View style={styles.dataLeft}>
            <Text style={styles.dataIcon}>🎯</Text>
            <Text style={styles.dataLabel}>Peso objetivo</Text>
          </View>
          <View style={styles.dataRight}>
            <Text style={styles.dataValue}>
              {userProfile?.targetWeightKg ? `${userProfile.targetWeightKg} kg` : 'No especificado'}
            </Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.dataItem}
        onPress={() => openEditField('timeFrame', userProfile?.timeFrame)}
      >
        <View style={styles.dataLeft}>
          <Text style={styles.dataIcon}>⏰</Text>
          <Text style={styles.dataLabel}>Marco temporal</Text>
        </View>
        <View style={styles.dataRight}>
          <Text style={styles.dataValue}>
            {getTimeFrameLabel(userProfile?.timeFrame)}
          </Text>
          <Text style={styles.menuArrow}>›</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.dataItem}
        onPress={() => openEditField('intensity', userProfile?.intensity)}
      >
        <View style={styles.dataLeft}>
          <Text style={styles.dataIcon}>🔥</Text>
          <Text style={styles.dataLabel}>Intensidad</Text>
        </View>
        <View style={styles.dataRight}>
          <Text style={styles.dataValue}>
            {getIntensityLabel(userProfile?.intensity)}
          </Text>
          <Text style={styles.menuArrow}>›</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.dataItem}
        onPress={() => openEditField('motivation', userProfile?.currentMotivation)}
      >
        <View style={styles.dataLeft}>
          <Text style={styles.dataIcon}>💪</Text>
          <Text style={styles.dataLabel}>Motivación</Text>
        </View>
        <View style={styles.dataRight}>
          <Text style={[styles.dataValue, styles.motivationText]} numberOfLines={2}>
            {userProfile?.currentMotivation ? `"${userProfile.currentMotivation}"` : 'No especificada'}
          </Text>
          <Text style={styles.menuArrow}>›</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderCulinaryPreferences = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Preferencias Culinarias</Text>

      <TouchableOpacity
        style={styles.dataItem}
        onPress={() => showPreferencesModal("cuisinesLike")}
      >
        <View style={styles.dataLeft}>
          <Text style={styles.dataIcon}>❤️</Text>
          <Text style={styles.dataLabel}>Cocinas favoritas</Text>
        </View>
        <View style={styles.dataRight}>
          <Text style={styles.dataValue}>
            {userProfile?.cuisinesLike && userProfile.cuisinesLike.length > 0
              ? `${userProfile.cuisinesLike.length} seleccionadas`
              : "No especificadas"}
          </Text>
          <Text style={styles.menuArrow}>›</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dataItem}
        onPress={() => showPreferencesModal("cuisinesDislike")}
      >
        <View style={styles.dataLeft}>
          <Text style={styles.dataIcon}>❌</Text>
          <Text style={styles.dataLabel}>Cocinas evitadas</Text>
        </View>
        <View style={styles.dataRight}>
          <Text style={styles.dataValue}>
            {userProfile?.cuisinesDislike &&
            userProfile.cuisinesDislike.length > 0
              ? `${userProfile.cuisinesDislike.length} seleccionadas`
              : "Ninguna"}
          </Text>
          <Text style={styles.menuArrow}>›</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* App Header */}
      <AppHeader 
        title="Mi Perfil" 
        subtitle="Gestiona tu cuenta"
        showLogo={true}
        rightComponent={
          <TouchableOpacity style={styles.editButton} onPress={loadUserData}>
            <Text style={styles.editButtonText}>🔄</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content}>
        {renderProfileInfo()}
        {renderSocialStats()}
        {renderHealthData()}
        {renderNutritionGoals()}
        {renderCulinaryPreferences()}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LinearGradient
            colors={['#FF5252', '#D32F2F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutButtonGradient}
          >
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Versión 1.0.0 (17)</Text>
      </ScrollView>

      {/* Modal de preferencias */}
      <Modal
        visible={showPreferencesModalState}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {preferencesType === "cuisinesLike" && "❤️ Cocinas Favoritas"}
                {preferencesType === "cuisinesDislike" && "❌ Cocinas Evitadas"}
                {preferencesType === "allergies" && "🚫 Alergias"}
                {preferencesType === "conditions" && "🏥 Condiciones Médicas"}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closePreferencesModal}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {preferencesType === "cuisinesLike" &&
              userProfile?.cuisinesLike ? (
                userProfile.cuisinesLike.length > 0 ? (
                  userProfile.cuisinesLike.map((cuisine, index) => (
                    <View key={index} style={styles.preferenceItem}>
                      <Text style={styles.preferenceText}>{cuisine.name}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noPreferencesText}>
                    No has seleccionado cocinas favoritas
                  </Text>
                )
              ) : preferencesType === "cuisinesDislike" &&
                userProfile?.cuisinesDislike ? (
                userProfile.cuisinesDislike.length > 0 ? (
                  userProfile.cuisinesDislike.map((cuisine, index) => (
                    <View key={index} style={styles.preferenceItem}>
                      <Text style={styles.preferenceText}>{cuisine.name}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noPreferencesText}>
                    No has seleccionado cocinas a evitar
                  </Text>
                )
              ) : preferencesType === "allergies" && userProfile?.allergies ? (
                userProfile.allergies.length > 0 ? (
                  userProfile.allergies.map((allergy, index) => (
                    <View key={index} style={styles.preferenceItem}>
                      <Text style={styles.preferenceText}>{allergy.name}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noPreferencesText}>
                    No tienes alergias registradas
                  </Text>
                )
              ) : preferencesType === "conditions" &&
                userProfile?.conditions ? (
                userProfile.conditions.length > 0 ? (
                  userProfile.conditions.map((condition, index) => (
                    <View key={index} style={styles.preferenceItem}>
                      <Text style={styles.preferenceText}>
                        {condition.label}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noPreferencesText}>
                    No tienes condiciones médicas registradas
                  </Text>
                )
              ) : (
                <Text style={styles.noPreferencesText}>
                  No hay información disponible
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalEditButton}
                onPress={() => {
                  closePreferencesModal();
                  if (preferencesType) {
                    showEditPreferencesModal(preferencesType);
                  }
                }}
              >
                <Text style={styles.modalEditButtonText}>✏️ Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={closePreferencesModal}
              >
                <Text style={styles.modalButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de edición de preferencias */}
      <EditPreferencesModal
        visible={showEditModal}
        onClose={closeEditModal}
        onSave={handleSavePreferences}
        type={preferencesType || "cuisinesLike"}
        currentPreferences={
          preferencesType === "cuisinesLike"
            ? userProfile?.cuisinesLike || []
            : preferencesType === "cuisinesDislike"
            ? userProfile?.cuisinesDislike || []
            : preferencesType === "allergies"
            ? userProfile?.allergies || []
            : preferencesType === "conditions"
            ? userProfile?.conditions || []
            : []
        }
        title={
          preferencesType === "cuisinesLike"
            ? "❤️ Editar Cocinas Favoritas"
            : preferencesType === "cuisinesDislike"
            ? "❌ Editar Cocinas Evitadas"
            : preferencesType === "allergies"
            ? "🚫 Editar Alergias"
            : preferencesType === "conditions"
            ? "🏥 Editar Condiciones Médicas"
            : "Editar"
        }
      />

      {/* Modal de seguidores */}
      <FollowersModal
        visible={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        userId={currentUserId || socialProfile?.id || ""}
        type="followers"
      />

      {/* Modal de siguiendo */}
      <FollowersModal
        visible={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        userId={currentUserId || socialProfile?.id || ""}
        type="following"
      />

      {/* Modal de edición de campo específico */}
      <EditFieldModal
        visible={editField.type !== null}
        onClose={() => setEditField({ type: null, value: null })}
        fieldType={editField.type!}
        currentValue={editField.value}
        userProfile={userProfile}
        onSave={handleSaveField}
      />

      {/* Modal de generación de plan */}
      <PlanGeneratingModal
        visible={isGeneratingPlan}
        progress={generationProgress}
      />

      {/* Modal de edición de nombre */}
      <Modal
        visible={showEditNameModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Editar Nombre</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowEditNameModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    value={editingName.name}
                    onChangeText={(text) => setEditingName({ ...editingName, name: text })}
                    placeholder="Ingresa tu nombre"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Apellido</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    value={editingName.lastName}
                    onChangeText={(text) => setEditingName({ ...editingName, lastName: text })}
                    placeholder="Ingresa tu apellido"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowEditNameModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalEditButton}
                onPress={handleSaveName}
              >
                <Text style={styles.modalEditButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textLight,
  },
  editButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: COLORS.card,
    margin: 20,
    padding: 30,
    borderRadius: 24,
    alignItems: "center",
    ...SHADOWS.glow,
    shadowColor: COLORS.primaryStart,
    shadowOpacity: 0.15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    ...SHADOWS.glow,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  section: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.2)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    padding: 20,
    paddingBottom: 10,
  },

  dataItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  dataLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  dataIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  dataLabel: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  dataValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  motivationText: {
    fontStyle: 'italic',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 200,
  },
  dataRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuArrow: {
    fontSize: 20,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  logoutButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  version: {
    textAlign: "center",
    color: COLORS.textLight,
    fontSize: 12,
    marginBottom: 30,
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    width: "100%",
    maxHeight: "80%",
    minHeight: 400,
    ...SHADOWS.floating,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: "bold",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  preferenceItem: {
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  preferenceText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  noPreferencesText: {
    textAlign: "center",
    color: COLORS.textLight,
    marginTop: 20,
    fontStyle: "italic",
  },
  modalButtons: {
    flexDirection: "row",
    padding: 20,
    gap: 10,
  },
  modalEditButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    ...SHADOWS.glow,
  },
  modalEditButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  modalButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonText: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 16,
  },
  editNameButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    ...SHADOWS.glow,
  },
  editNameButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 15,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
});
