import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

interface MedicalInfoSummaryProps {
  selectedAllergies: string[];
  selectedConditions: string[];
  customAllergies: string[];
  customConditions: string[];
  onEditAllergies: () => void;
  onEditConditions: () => void;
}

export const MedicalInfoSummary: React.FC<MedicalInfoSummaryProps> = ({
  selectedAllergies,
  selectedConditions,
  customAllergies,
  customConditions,
  onEditAllergies,
  onEditConditions,
}) => {
  const totalAllergies = selectedAllergies.length + customAllergies.length;
  const totalConditions = selectedConditions.length + customConditions.length;

  if (totalAllergies === 0 && totalConditions === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>✅</Text>
        <Text style={styles.emptyTitle}>Sin restricciones médicas</Text>
        <Text style={styles.emptySubtitle}>
          No has registrado alergias ni condiciones médicas
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 Resumen médico</Text>
      
      {/* Alergias */}
      {totalAllergies > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🚫 Alergias ({totalAllergies})</Text>
            <TouchableOpacity style={styles.editButton} onPress={onEditAllergies}>
              <Text style={styles.editButtonText}>Editar</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.itemsContainer}>
              {selectedAllergies.map((allergy, index) => (
                <View key={`official-${index}`} style={[styles.item, styles.officialItem]}>
                  <Text style={styles.itemText}>{allergy}</Text>
                </View>
              ))}
              {customAllergies.map((allergy, index) => (
                <View key={`custom-${index}`} style={[styles.item, styles.customItem]}>
                  <Text style={styles.itemText}>{allergy}</Text>
                  <Text style={styles.customBadge}>Personal</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Condiciones */}
      {totalConditions > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏥 Condiciones ({totalConditions})</Text>
            <TouchableOpacity style={styles.editButton} onPress={onEditConditions}>
              <Text style={styles.editButtonText}>Editar</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.itemsContainer}>
              {selectedConditions.map((condition, index) => (
                <View key={`official-${index}`} style={[styles.item, styles.officialItem]}>
                  <Text style={styles.itemText}>{condition}</Text>
                </View>
              ))}
              {customConditions.map((condition, index) => (
                <View key={`custom-${index}`} style={[styles.item, styles.customItem]}>
                  <Text style={styles.itemText}>{condition}</Text>
                  <Text style={styles.customBadge}>Personal</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Nota informativa */}
      <View style={styles.infoNote}>
        <Text style={styles.infoIcon}>💡</Text>
        <Text style={styles.infoText}>
          Esta información se usa para personalizar tus recomendaciones nutricionales y garantizar tu seguridad.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  itemsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  officialItem: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  customItem: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.4)',
  },
  itemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  customBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emptyContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoNote: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    lineHeight: 16,
  },
});