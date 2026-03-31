import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
import { ActivityType, SaveFreeExerciseRequest } from '../types/nutrition';
import FreeExerciseService, { estimateCalories } from '../services/freeExerciseService';
import { COLORS } from '../theme/theme';

// ─── Props ────────────────────────────────────────────────────────────────────

interface FreeExerciseLoggerProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Activity type definitions ────────────────────────────────────────────────

interface ActivityOption {
  type: ActivityType;
  emoji: string;
  label: string;
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
  { type: 'RUNNING',   emoji: '🏃', label: 'Running' },
  { type: 'WALKING',   emoji: '🚶', label: 'Caminata' },
  { type: 'CYCLING',   emoji: '🚴', label: 'Ciclismo' },
  { type: 'SWIMMING',  emoji: '🏊', label: 'Natación' },
  { type: 'ELLIPTICAL',emoji: '🔄', label: 'Elíptica' },
  { type: 'ROWING',    emoji: '🚣', label: 'Remo' },
  { type: 'JUMP_ROPE', emoji: '🪢', label: 'Saltar la cuerda' },
  { type: 'OTHER',     emoji: '✏️', label: 'Otro' },
];

// ─── Validation helpers ───────────────────────────────────────────────────────

/** Returns parsed positive integer or null. Sets error message if invalid. */
function parsePositiveInt(raw: string): { value: number | null; error: string | null } {
  if (raw.trim() === '') return { value: null, error: null };
  const n = Number(raw);
  if (isNaN(n) || !Number.isFinite(n)) return { value: null, error: 'Debe ser un número válido' };
  if (n < 0) return { value: null, error: 'No puede ser negativo' };
  if (!Number.isInteger(n)) return { value: null, error: 'Debe ser un número entero' };
  return { value: n, error: null };
}

/** Returns parsed positive float or null. Sets error message if invalid. */
function parsePositiveFloat(raw: string): { value: number | null; error: string | null } {
  if (raw.trim() === '') return { value: null, error: null };
  const n = Number(raw);
  if (isNaN(n) || !Number.isFinite(n)) return { value: null, error: 'Debe ser un número válido' };
  if (n < 0) return { value: null, error: 'No puede ser negativo' };
  return { value: n, error: null };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const FreeExerciseLogger: React.FC<FreeExerciseLoggerProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  // Form state
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [customName, setCustomName] = useState('');
  const [durationRaw, setDurationRaw] = useState('');
  const [distanceRaw, setDistanceRaw] = useState('');
  const [caloriesRaw, setCaloriesRaw] = useState('');

  // Error / warning state
  const [activityError, setActivityError] = useState('');
  const [customNameError, setCustomNameError] = useState('');
  const [durationError, setDurationError] = useState('');
  const [distanceError, setDistanceError] = useState('');
  const [caloriesError, setCaloriesError] = useState('');
  const [durationWarning, setDurationWarning] = useState('');
  const [metricsError, setMetricsError] = useState('');

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // ── Derived values ──────────────────────────────────────────────────────────

  const parsedDuration = parsePositiveInt(durationRaw);
  const parsedCalories = parsePositiveInt(caloriesRaw);

  const durationValue = parsedDuration.error === null ? parsedDuration.value : null;
  const caloriesValue = parsedCalories.error === null ? parsedCalories.value : null;

  // Show calorie estimate when duration > 0 and no calories entered
  const showCalorieEstimate =
    selectedActivity !== null &&
    durationValue !== null &&
    durationValue > 0 &&
    caloriesRaw.trim() === '';

  const calorieEstimate =
    showCalorieEstimate && selectedActivity
      ? estimateCalories(selectedActivity, durationValue!)
      : 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelectActivity = useCallback((type: ActivityType) => {
    setSelectedActivity(type);
    setActivityError('');
    if (type !== 'OTHER') {
      setCustomName('');
      setCustomNameError('');
    }
  }, []);

  const handleDurationChange = useCallback((text: string) => {
    setDurationRaw(text);
    setDurationError('');
    setDurationWarning('');
    setMetricsError('');
    const parsed = parsePositiveInt(text);
    if (parsed.error) {
      setDurationError(parsed.error);
    } else if (parsed.value !== null && parsed.value > 600) {
      setDurationWarning('El valor parece inusualmente alto (>600 min)');
    }
  }, []);

  const handleDistanceChange = useCallback((text: string) => {
    setDistanceRaw(text);
    setDistanceError('');
    setMetricsError('');
    const parsed = parsePositiveFloat(text);
    if (parsed.error) setDistanceError(parsed.error);
  }, []);

  const handleCaloriesChange = useCallback((text: string) => {
    setCaloriesRaw(text);
    setCaloriesError('');
    setMetricsError('');
    const parsed = parsePositiveInt(text);
    if (parsed.error) setCaloriesError(parsed.error);
  }, []);

  const handleCustomNameChange = useCallback((text: string) => {
    if (text.length <= 50) {
      setCustomName(text);
      setCustomNameError('');
    }
  }, []);

  const validate = (): boolean => {
    let valid = true;

    if (!selectedActivity) {
      setActivityError('Debes seleccionar un tipo de actividad');
      valid = false;
    }

    if (selectedActivity === 'OTHER' && customName.trim() === '') {
      setCustomNameError('El nombre de la actividad no puede estar vacío');
      valid = false;
    }

    const dur = parsePositiveInt(durationRaw);
    if (dur.error) { setDurationError(dur.error); valid = false; }

    const dist = parsePositiveFloat(distanceRaw);
    if (dist.error) { setDistanceError(dist.error); valid = false; }

    const cal = parsePositiveInt(caloriesRaw);
    if (cal.error) { setCaloriesError(cal.error); valid = false; }

    // At least one metric must have a positive value
    const hasMetric =
      (dur.value !== null && dur.value > 0) ||
      (dist.value !== null && dist.value > 0) ||
      (cal.value !== null && cal.value > 0);

    if (!hasMetric && valid) {
      setMetricsError('Ingresa al menos una métrica con valor positivo para guardar');
      valid = false;
    }

    return valid;
  };

  const handleSave = async () => {
    setSaveError('');
    if (!validate()) return;

    const dur = parsePositiveInt(durationRaw);
    const dist = parsePositiveFloat(distanceRaw);
    const cal = parsePositiveInt(caloriesRaw);

    // Determine calories to send: explicit entry or estimate
    let finalCalories: number | undefined;
    let isEstimated = false;

    if (cal.value !== null && cal.value > 0) {
      finalCalories = cal.value;
    } else if (dur.value !== null && dur.value > 0 && selectedActivity) {
      finalCalories = estimateCalories(selectedActivity, dur.value);
      isEstimated = true;
    }

    const payload: SaveFreeExerciseRequest = {
      activityType: selectedActivity!,
      ...(selectedActivity === 'OTHER' && { customActivityName: customName.trim() }),
      ...(dur.value !== null && dur.value > 0 && { durationMinutes: dur.value }),
      ...(dist.value !== null && dist.value > 0 && { distanceKm: dist.value }),
      ...(finalCalories !== undefined && { caloriesBurned: finalCalories }),
      caloriesEstimated: isEstimated,
    };

    try {
      setSaving(true);
      await FreeExerciseService.saveFreeExercise(payload);
      resetForm();
      onSaved();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Error al guardar. Intenta de nuevo.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedActivity(null);
    setCustomName('');
    setDurationRaw('');
    setDistanceRaw('');
    setCaloriesRaw('');
    setActivityError('');
    setCustomNameError('');
    setDurationError('');
    setDistanceError('');
    setCaloriesError('');
    setDurationWarning('');
    setMetricsError('');
    setSaveError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
        <View style={styles.container}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Registrar actividad</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} accessibilityLabel="Cerrar">
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Activity type selector ── */}
            <Text style={styles.sectionLabel}>Tipo de actividad *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
            >
              {ACTIVITY_OPTIONS.map((opt) => {
                const isSelected = selectedActivity === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => handleSelectActivity(opt.type)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {activityError ? <Text style={styles.errorText}>{activityError}</Text> : null}

            {/* ── Custom activity name (OTHER) ── */}
            {selectedActivity === 'OTHER' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.sectionLabel}>Nombre de la actividad *</Text>
                <TextInput
                  style={[styles.textInput, customNameError ? styles.inputError : null]}
                  placeholder="Ej: Yoga, Boxeo, Baile..."
                  placeholderTextColor={COLORS.textLight}
                  value={customName}
                  onChangeText={handleCustomNameChange}
                  maxLength={50}
                  returnKeyType="done"
                />
                <Text style={styles.charCount}>{customName.length}/50</Text>
                {customNameError ? <Text style={styles.errorText}>{customNameError}</Text> : null}
              </View>
            )}

            {/* ── Metrics ── */}
            <Text style={styles.sectionLabel}>Métricas (opcionales)</Text>

            {/* Duration */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Duración (min)</Text>
              <TextInput
                style={[styles.textInput, durationError ? styles.inputError : null]}
                placeholder="Ej: 45"
                placeholderTextColor={COLORS.textLight}
                value={durationRaw}
                onChangeText={handleDurationChange}
                keyboardType="numeric"
                returnKeyType="done"
              />
              {durationError ? <Text style={styles.errorText}>{durationError}</Text> : null}
              {durationWarning && !durationError ? (
                <Text style={styles.warningText}>⚠️ {durationWarning}</Text>
              ) : null}
            </View>

            {/* Distance */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Distancia (km)</Text>
              <TextInput
                style={[styles.textInput, distanceError ? styles.inputError : null]}
                placeholder="Ej: 5.2"
                placeholderTextColor={COLORS.textLight}
                value={distanceRaw}
                onChangeText={handleDistanceChange}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              {distanceError ? <Text style={styles.errorText}>{distanceError}</Text> : null}
            </View>

            {/* Calories */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Calorías quemadas</Text>
              <TextInput
                style={[styles.textInput, caloriesError ? styles.inputError : null]}
                placeholder="Ej: 350"
                placeholderTextColor={COLORS.textLight}
                value={caloriesRaw}
                onChangeText={handleCaloriesChange}
                keyboardType="numeric"
                returnKeyType="done"
              />
              {caloriesError ? <Text style={styles.errorText}>{caloriesError}</Text> : null}
            </View>

            {/* Calorie estimate */}
            {showCalorieEstimate && (
              <View style={styles.estimateBox}>
                <Text style={styles.estimateText}>
                  🔥 Estimación: ~{calorieEstimate} kcal
                </Text>
                <Text style={styles.estimateSubtext}>
                  Basado en la duración y tipo de actividad
                </Text>
              </View>
            )}

            {/* Metrics error */}
            {metricsError ? (
              <Text style={[styles.errorText, styles.metricsError]}>{metricsError}</Text>
            ) : null}

            {/* Save error */}
            {saveError ? (
              <View style={styles.saveErrorBox}>
                <Text style={styles.saveErrorText}>⚠️ {saveError}</Text>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const MODAL_BG = '#1a1a2e';
const MODAL_SURFACE = '#16213e';
const TEXT_PRIMARY = '#e0e0e0';
const TEXT_SECONDARY = '#9e9e9e';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: MODAL_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: SCREEN_HEIGHT * 0.65,
    maxHeight: SCREEN_HEIGHT * 0.92,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 10,
    marginTop: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: MODAL_SURFACE,
    gap: 6,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
  chipLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: MODAL_SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  charCount: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  warningText: {
    fontSize: 12,
    color: COLORS.warning,
    marginTop: 4,
  },
  metricsError: {
    marginBottom: 8,
    textAlign: 'center',
  },
  estimateBox: {
    backgroundColor: 'rgba(116, 183, 150, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(116, 183, 150, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  estimateText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  estimateSubtext: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  saveErrorBox: {
    backgroundColor: 'rgba(217, 112, 102, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 112, 102, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  saveErrorText: {
    fontSize: 13,
    color: COLORS.error,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default FreeExerciseLogger;
