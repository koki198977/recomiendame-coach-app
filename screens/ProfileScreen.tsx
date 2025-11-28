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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NutritionService } from "../services/nutritionService";
import { SocialService } from "../services/socialService";
import { UserProfile, SocialUserProfile } from "../types/nutrition";
import { EditPreferencesModal } from "../components/EditPreferencesModal";
import { FollowersModal } from "../components/FollowersModal";
import { getCurrentUserId } from "../utils/userUtils";

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

  React.useEffect(() => {
    loadUserData();
  }, []);

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
        "onboardingCompleted",
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
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </Text>
      </View>
      <Text style={styles.userName}>{user?.name || "Usuario"}</Text>
      <Text style={styles.userEmail}>{user?.email}</Text>
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

  const handleSavePreferences = async (updatedPreferences: {
    cuisinesLike?: number[];
    cuisinesDislike?: number[];
    allergyIds?: number[];
    conditionIds?: number[];
  }) => {
    try {
      // Recargar el perfil para obtener los datos actualizados
      await loadUserData();
    } catch (error) {
      console.log("Error reloading profile:", error);
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

  const renderHealthData = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Datos de Salud</Text>

      <TouchableOpacity style={styles.dataItem}>
        <View style={styles.dataLeft}>
          <Text style={styles.dataIcon}>⚖️</Text>
          <Text style={styles.dataLabel}>Peso actual</Text>
        </View>
        <Text style={styles.dataValue}>
          {userProfile?.weightKg
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
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <TouchableOpacity style={styles.editButton} onPress={loadUserData}>
          <Text style={styles.editButtonText}>🔄 Actualizar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {renderProfileInfo()}
        {renderSocialStats()}
        {renderHealthData()}
        {renderCulinaryPreferences()}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Versión 1.0.0</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  editButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 30,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: "#666",
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    padding: 20,
    paddingBottom: 10,
  },
  dataItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
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
    color: "#333",
  },
  dataValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
  },
  dataRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 25,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  menuArrow: {
    fontSize: 20,
    color: "#ccc",
  },
  logoutButton: {
    backgroundColor: "#ff4444",
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  version: {
    textAlign: "center",
    color: "#999",
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
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxHeight: "80%",
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "bold",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  preferenceItem: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  preferenceText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  noPreferencesText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
  },
  modalButtons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
  },
  modalEditButton: {
    flex: 1,
    backgroundColor: "#FF9800",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  modalEditButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
