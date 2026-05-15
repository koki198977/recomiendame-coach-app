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
  Image,
  Platform,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NutritionService } from "../services/nutritionService";
import { SocialService } from "../services/socialService";
import { UserProfile, SocialUserProfile } from "../types/nutrition";
import { EditPreferencesModal } from "../components/EditPreferencesModal";
import { FollowersModal } from "../components/FollowersModal";
import { EditFieldModal } from "../components/EditFieldModal";
import { PlanGeneratingModal } from "../components/PlanGeneratingModal";
import { getCurrentUserId } from "../utils/userUtils";
import { usePlan } from '../hooks/usePlan';
import api from '../services/api';

import { AppHeader } from '../components/AppHeader';
import { COLORS, SHADOWS, GRADIENTS } from '../theme/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface ProfileScreenProps {
  onLogout?: () => void;
  userProfile?: UserProfile | null;
}

export const ProfileScreen = ({ onLogout, userProfile: userProfileProp }: ProfileScreenProps) => {
  const [user, setUser] = React.useState<any>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(
    userProfileProp || null
  );
  const [socialStats, setSocialStats] =
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
  const [generationProgress, setGenerationProgress] = React.useState(0);
  const [showEditNameModal, setShowEditNameModal] = React.useState(false);
  const [editingName, setEditingName] = React.useState({ name: '', lastName: '' });
  const [subscriptionInfo, setSubscriptionInfo] = React.useState<any>(null);
  const [loadingSub, setLoadingSub] = React.useState(false);
  const [showGeneratingModal, setShowGeneratingModal] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = React.useState(false);
  const { isPro, isFree, showPaywall, refreshPlan, isGeneratingNutrition: isGeneratingPlan, setIsGeneratingNutrition: setIsGeneratingPlan } = usePlan();

  React.useEffect(() => {
    loadUserData();
    loadSubscriptionInfo();
  }, []);

  // Sincronizar si la prop cambia
  React.useEffect(() => {
    if (userProfileProp) {
      setUserProfile(userProfileProp);
    }
  }, [userProfileProp]);

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

  const loadSubscriptionInfo = async () => {
    try {
      setLoadingSub(true);
      const res = await api.get('/subscriptions/status');
      setSubscriptionInfo(res.data);
    } catch (error) {
      console.log('Error loading subscription info:', error);
    } finally {
      setLoadingSub(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancelar suscripción',
      '¿Estás seguro que quieres cancelar tu suscripción PRO? Seguirás teniendo acceso hasta el final de tu período de facturación actual.',
      [
        { text: 'No, mantener PRO', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/subscriptions/cancel');
              Alert.alert('Suscripción cancelada', 'Tu suscripción ha sido cancelada. Tendrás acceso PRO hasta el fin del período actual.');
              await loadSubscriptionInfo();
              await refreshPlan();
            } catch (error) {
              Alert.alert('Error', 'No se pudo cancelar la suscripción. Intenta de nuevo.');
            }
          },
        },
      ]
    );
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
          const stats = await SocialService.getMySocialProfile();
          setSocialStats(stats);
        } catch (socialStatsError) {
          // Error silencioso
        }
      } catch (socialError) {
        // Fallback: obtener desde AsyncStorage
        const userId = await getCurrentUserId();
        setCurrentUserId(userId);

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

  const handleSelectImage = async (useCamera: boolean) => {
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert("Permiso denegado", `Se requiere permiso para acceder a la ${useCamera ? 'cámara' : 'galería'}.`);
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo seleccionar la imagen.");
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setUploadingImage(true);
      const uploadResult = await SocialService.uploadImage(uri);
      await handleSaveAvatar(uploadResult.url);
    } catch (error) {
      console.log("Error uploading avatar:", error);
      Alert.alert("Error", "No se pudo subir la imagen.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveAvatar = async (newAvatarUrl: string | null) => {
    try {
      const updatedProfile = await NutritionService.updateUserProfile({
        avatarUrl: newAvatarUrl
      });
      setUserProfile(updatedProfile);
      
      // Actualizar también en AsyncStorage
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      Alert.alert("¡Listo!", "Tu foto de perfil ha sido actualizada.");
      await loadUserData();
    } catch (error) {
      console.log("Error saving avatar:", error);
      Alert.alert("Error", "No se pudo actualizar la foto de perfil.");
    }
  };

  const generateRandomAvatar = async () => {
    // Usar robohash para generar un avatar de robot divertido
    const randomId = Math.random().toString(36).substring(7);
    const avatarUrl = `https://robohash.org/${randomId}.png?set=set1&bgset=bg1`;
    handleSaveAvatar(avatarUrl);
  };

  const handleChangeAvatar = () => {
    setShowAvatarMenu(true);
  };

  const renderProfileInfo = () => (
    <View style={styles.profileCard}>
      <TouchableOpacity 
        style={styles.avatarContainer} 
        onPress={handleChangeAvatar} 
        disabled={uploadingImage}
        activeOpacity={0.8}
      >
        <View style={styles.avatarWrapper}>
          {uploadingImage ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : userProfile?.avatarUrl ? (
            <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {userProfile?.name?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || "U"}
            </Text>
          )}
        </View>
        <LinearGradient
          colors={GRADIENTS.primary}
          style={styles.editAvatarBadge}
        >
          <Text style={{ fontSize: 10, color: '#fff' }}>✏️</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.userName}>
        {userProfile?.name && userProfile?.lastName 
          ? `${userProfile.name} ${userProfile.lastName}`
          : userProfile?.name || user?.name || "Usuario"}
      </Text>
      
      <Text style={styles.userEmail}>{userProfile?.email || user?.email}</Text>

      {/* Stats Bar elegante */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{socialStats?.postsCount || 0}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{socialStats?.followersCount || 0}</Text>
          <Text style={styles.statLabel}>Seguidores</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{socialStats?.followingCount || 0}</Text>
          <Text style={styles.statLabel}>Siguiendo</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.editNameButton}
        onPress={() => {
          setEditingName({
            name: userProfile?.name || "",
            lastName: userProfile?.lastName || ""
          });
          setShowEditNameModal(true);
        }}
      >
        <Text style={styles.editNameButtonText}>Editar Perfil</Text>
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

    try {
      const plan = await NutritionService.getWeeklyPlan(week);
      const isPlanReady = plan && (plan.id === planId || planId.includes(week));

      if (isPlanReady) {
        setGenerationProgress(100);
        setTimeout(() => {
          setIsGeneratingPlan(false);
          setShowGeneratingModal(false);
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
        setShowGeneratingModal(false);
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
        setShowGeneratingModal(false);
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
                  setShowGeneratingModal(true);
                  setGenerationProgress(10);
                  const currentWeek = NutritionService.getCurrentWeek();
                  
                  // Obtener el plan actual
                  const existingPlan = await NutritionService.getWeeklyPlan(currentWeek);
                  
                  // Si existe un plan, eliminarlo primero
                  if (existingPlan) {
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
                      setGenerationProgress(20);
                      const tempPlanId = `${currentWeek}-${Date.now()}`;
                      pollForPlan(tempPlanId, currentWeek);
                      return;
                    }
                    throw error;
                  }
                } catch (error) {
                  setIsGeneratingPlan(false);
                  setShowGeneratingModal(false);
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
    if (!goal) return "No especificado";
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
    if (!timeFrame) return "No especificado";
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
    
    const result = labels[timeFrame] || timeFrame;
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
    if (!socialStats) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Red Social</Text>

        <TouchableOpacity style={styles.dataItem}>
          <View style={styles.dataLeft}>
            <Text style={styles.dataIcon}>📝</Text>
            <Text style={styles.dataLabel}>Mis posts</Text>
          </View>
          <Text style={styles.dataValue}>{socialStats?.postsCount || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dataItem}
          onPress={() => {
            if (currentUserId || socialStats?.id) {
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
              {socialStats?.followersCount || 0}
            </Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dataItem}
          onPress={() => {
            if (currentUserId || socialStats?.id) {
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
              {socialStats?.followingCount || 0}
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

        {/* Sección Mi Suscripción */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Suscripción</Text>

          {/* Badge del plan actual */}
          <View style={subStyles.planBadgeRow}>
            <LinearGradient
              colors={isPro ? ['#2E7D32', '#43A047'] : ['#757575', '#9E9E9E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={subStyles.planBadge}
            >
              <Text style={subStyles.planBadgeText}>{isPro ? '⭐ PRO' : 'FREE'}</Text>
            </LinearGradient>
            {subscriptionInfo?.status === 'TRIAL' && (
              <View style={subStyles.trialBadge}>
                <Text style={subStyles.trialBadgeText}>Período de prueba</Text>
              </View>
            )}
          </View>

          {isPro && subscriptionInfo ? (
            <>
              <TouchableOpacity style={styles.dataItem}>
                <View style={styles.dataLeft}>
                  <Text style={styles.dataIcon}>📋</Text>
                  <Text style={styles.dataLabel}>Plan</Text>
                </View>
                <Text style={styles.dataValue}>
                  {subscriptionInfo.planType === 'annual' ? 'Anual' : 'Mensual'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dataItem}>
                <View style={styles.dataLeft}>
                  <Text style={styles.dataIcon}>📅</Text>
                  <Text style={styles.dataLabel}>Estado</Text>
                </View>
                <Text style={[styles.dataValue, { color: subscriptionInfo.status === 'CANCELLED' ? COLORS.error : COLORS.primary }]}>
                  {subscriptionInfo.status === 'ACTIVE' ? 'Activo' :
                   subscriptionInfo.status === 'TRIAL' ? 'Prueba gratis' :
                   subscriptionInfo.status === 'CANCELLED' ? 'Cancelado' :
                   subscriptionInfo.status === 'PENDING' ? 'Pendiente' : subscriptionInfo.status}
                </Text>
              </TouchableOpacity>

              {subscriptionInfo.currentPeriodEnd && (
                <TouchableOpacity style={styles.dataItem}>
                  <View style={styles.dataLeft}>
                    <Text style={styles.dataIcon}>🔄</Text>
                    <Text style={styles.dataLabel}>
                      {subscriptionInfo.status === 'CANCELLED' ? 'Acceso hasta' : 'Próximo cobro'}
                    </Text>
                  </View>
                  <Text style={styles.dataValue}>
                    {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
              )}

              {subscriptionInfo.status !== 'CANCELLED' && (
                <TouchableOpacity
                  style={subStyles.cancelBtn}
                  onPress={handleCancelSubscription}
                >
                  <Text style={subStyles.cancelBtnText}>Cancelar suscripción</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={subStyles.freeDescription}>
                Desbloquea Chapi 2.0, recetas completas, análisis semanal y mucho más.
              </Text>
              <TouchableOpacity
                style={subStyles.upgradeBtn}
                onPress={() => showPaywall()}
              >
                <LinearGradient
                  colors={['#2E7D32', '#43A047']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={subStyles.upgradeBtnGradient}
                >
                  <Text style={subStyles.upgradeBtnText}>⭐ Mejorar a PRO</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* Restaurar compra */}
          <TouchableOpacity
            style={subStyles.restoreBtn}
            onPress={async () => {
              try {
                await refreshPlan();
                await loadSubscriptionInfo();
                Alert.alert('Listo', isPro ? 'Tu suscripción PRO está activa.' : 'No se encontró una suscripción activa asociada a tu cuenta.');
              } catch {
                Alert.alert('Error', 'No se pudo verificar tu suscripción.');
              }
            }}
          >
            <Text style={subStyles.restoreBtnText}>🔄 Restaurar compra</Text>
          </TouchableOpacity>
        </View>

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

      {/* Modal de selección de Avatar (Action Sheet Premium) */}
      <Modal 
        visible={showAvatarMenu} 
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAvatarMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.premiumModalContainer}>
            {/* Header con Gradiente (Estilo Recetas) */}
            <View style={styles.premiumHeaderWrapper}>
              <LinearGradient
                colors={['#74B796', '#8BC9A8']}
                style={styles.premiumHeaderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons 
                  name="person-circle" 
                  size={120} 
                  color="rgba(255,255,255,0.2)" 
                  style={{ position: 'absolute', right: -20, bottom: -20 }} 
                />
              </LinearGradient>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.premiumHeaderTitleOverlay}
              />
              <View style={styles.premiumHeaderContent}>
                <View style={styles.premiumTopActions}>
                  <TouchableOpacity 
                    style={styles.premiumBackButton} 
                    onPress={() => setShowAvatarMenu(false)}
                  >
                    <Ionicons name="chevron-down" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.premiumTitleContainer}>
                  <Text style={styles.premiumTitle}>Personalizar Perfil</Text>
                  <Text style={styles.premiumSubtitle}>Elige cómo quieres actualizar tu foto</Text>
                </View>
              </View>
            </View>

            {/* Contenido (Estilo Recetas) */}
            <View style={styles.premiumContent}>
              <View style={styles.avatarOptionsList}>
                <TouchableOpacity 
                  style={styles.avatarOptionCard} 
                  onPress={async () => { 
                    await handleSelectImage(true);
                    setShowAvatarMenu(false); 
                  }}
                >
                  <View style={[styles.avatarOptionIcon, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="camera" size={24} color="#2196F3" />
                  </View>
                  <View style={styles.avatarOptionText}>
                    <Text style={styles.avatarOptionTitle}>Tomar Foto</Text>
                    <Text style={styles.avatarOptionDesc}>Usa la cámara para una nueva foto</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.avatarOptionCard} 
                  onPress={async () => { 
                    await handleSelectImage(false);
                    setShowAvatarMenu(false); 
                  }}
                >
                  <View style={[styles.avatarOptionIcon, { backgroundColor: '#F3E5F5' }]}>
                    <Ionicons name="images" size={24} color="#9C27B0" />
                  </View>
                  <View style={styles.avatarOptionText}>
                    <Text style={styles.avatarOptionTitle}>Elegir de Galería</Text>
                    <Text style={styles.avatarOptionDesc}>Busca una foto en tus archivos</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.avatarOptionCard} 
                  onPress={() => { setShowAvatarMenu(false); generateRandomAvatar(); }}
                >
                  <View style={[styles.avatarOptionIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="ribbon" size={24} color="#4CAF50" />
                  </View>
                  <View style={styles.avatarOptionText}>
                    <Text style={styles.avatarOptionTitle}>Crear Avatar AI</Text>
                    <Text style={styles.avatarOptionDesc}>Genera un avatar único para ti</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.avatarOptionCard, { borderBottomWidth: 0 }]} 
                  onPress={() => { setShowAvatarMenu(false); handleSaveAvatar(null); }}
                >
                  <View style={[styles.avatarOptionIcon, { backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="trash" size={24} color="#F44336" />
                  </View>
                  <View style={styles.avatarOptionText}>
                    <Text style={[styles.avatarOptionTitle, { color: '#F44336' }]}>Eliminar Foto</Text>
                    <Text style={styles.avatarOptionDesc}>Volver al avatar por defecto</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.premiumCancelButton} 
                onPress={() => setShowAvatarMenu(false)}
              >
                <Text style={styles.premiumCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
        userId={currentUserId || socialStats?.id || ""}
        type="followers"
      />

      {/* Modal de siguiendo */}
      <FollowersModal
        visible={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        userId={currentUserId || socialStats?.id || ""}
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
        visible={showGeneratingModal}
        progress={generationProgress}
        onRunInBackground={() => {
          setShowGeneratingModal(false);
          Alert.alert(
            '¡Excelente elección! 🚀', 
            'Chapi seguirá trabajando duro en tu plan. Puedes seguir explorando la app o hacer otras cosas; te enviaremos una notificación en cuanto todo esté listo.',
            [{ text: 'Entendido' }]
          );
        }}
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
    marginHorizontal: 20,
    marginTop: -30, // Traslape con el header para elegancia
    marginBottom: 20,
    padding: 25,
    borderRadius: 30,
    alignItems: "center",
    ...SHADOWS.floating,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: '#fff',
    ...SHADOWS.glow,
    overflow: 'hidden',
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...SHADOWS.card,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 20,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.divider,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.divider,
  },
  editNameButton: {
    paddingHorizontal: 25,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editNameButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  actionSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  actionSheetHeaderGradient: {
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  actionSheetContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
  },
  actionSheetIndicator: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
    marginBottom: 20,
  },
  actionSheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  actionSheetSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  actionSheetOptions: {
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D3436',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D3436',
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
  // Estilos Premium (Clonados de Recetas)
  premiumModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: height * 0.92,
    width: '100%',
    overflow: 'hidden',
  },
  premiumHeaderWrapper: {
    height: 220,
    width: '100%',
    position: 'relative',
    backgroundColor: '#74B796',
  },
  premiumHeaderGradient: {
    width: '100%',
    height: '100%',
  },
  premiumHeaderTitleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  premiumHeaderContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  premiumTopActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  premiumBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumTitleContainer: {
    gap: 4,
  },
  premiumTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  premiumContent: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  avatarOptionsList: {
    gap: 12,
  },
  avatarOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  avatarOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarOptionText: {
    flex: 1,
  },
  avatarOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E36',
    marginBottom: 2,
  },
  avatarOptionDesc: {
    fontSize: 13,
    color: '#999',
  },
  premiumCancelButton: {
    marginTop: 20,
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  premiumCancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  version: {
    textAlign: "center",
    color: COLORS.textLight,
    fontSize: 12,
    marginBottom: 30,
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

// Estilos para la sección de suscripción
const subStyles = StyleSheet.create({
  planBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  planBadge: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  trialBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  trialBadgeText: {
    color: '#E65100',
    fontSize: 12,
    fontWeight: '700',
  },
  freeDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    paddingHorizontal: 20,
    paddingBottom: 16,
    lineHeight: 20,
  },
  upgradeBtn: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.glow,
    shadowColor: '#2E7D32',
  },
  upgradeBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  cancelBtnText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  restoreBtnText: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '600',
  },
});
