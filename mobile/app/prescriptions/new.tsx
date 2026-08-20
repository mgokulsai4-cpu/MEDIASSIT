import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { colors, layout, radii, spacing, typography } from '../../src/ui/theme';

interface MedRow {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export default function NewPrescriptionScreen() {
  const { appointmentId, patientId } = useLocalSearchParams<{ appointmentId: string; patientId: string }>();
  const router = useRouter();
  const [medications, setMedications] = useState<MedRow[]>([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [instructions, setInstructions] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const updateMed = (index: number, field: keyof MedRow, value: string) => {
    setMedications((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const addMed = () => setMedications((prev) => [...prev, { name: '', dosage: '', frequency: '', duration: '' }]);
  const removeMed = (index: number) => setMedications((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    const validMeds = medications.filter((m) => m.name.trim());
    if (validMeds.length === 0) {
      Alert.alert('No medications', 'Add at least one medication with a name.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/api/prescriptions', {
        patient_id: patientId,
        appointment_id: appointmentId,
        medications: validMeds,
        instructions,
        follow_up_date: followUpDate,
        follow_up_notes: followUpNotes,
      });
      const prescriptionId = (res.data as { prescription_id?: string })?.prescription_id;
      Alert.alert('Prescription saved', prescriptionId ? `Prescription ${prescriptionId} shared with the patient.` : 'Prescription shared with the patient.');
      router.back();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Write Prescription</Text>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Medications</Text>
            <Pressable onPress={addMed} accessibilityRole="button" style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
              <Ionicons name="add" size={16} color={colors.onPrimary} />
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
          {medications.map((med, i) => (
            <View key={i} style={styles.medBlock}>
              <View style={styles.medRow}>
                <TextInput
                  style={[styles.input, styles.medNameInput]}
                  placeholder="Medication name"
                  placeholderTextColor={colors.inkSubtle}
                  value={med.name}
                  onChangeText={(v) => updateMed(i, 'name', v)}
                />
                {medications.length > 1 && (
                  <Pressable onPress={() => removeMed(i)} accessibilityRole="button" style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Pressable>
                )}
              </View>
              <View style={styles.medFields}>
                <TextInput
                  style={[styles.input, styles.fieldHalf]}
                  placeholder="Dosage (e.g. 500mg)"
                  placeholderTextColor={colors.inkSubtle}
                  value={med.dosage}
                  onChangeText={(v) => updateMed(i, 'dosage', v)}
                />
                <TextInput
                  style={[styles.input, styles.fieldHalf]}
                  placeholder="Frequency (e.g. 2x daily)"
                  placeholderTextColor={colors.inkSubtle}
                  value={med.frequency}
                  onChangeText={(v) => updateMed(i, 'frequency', v)}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Duration (e.g. 7 days)"
                placeholderTextColor={colors.inkSubtle}
                value={med.duration}
                onChangeText={(v) => updateMed(i, 'duration', v)}
              />
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Diet, rest, precautions..."
            placeholderTextColor={colors.inkSubtle}
            value={instructions}
            onChangeText={setInstructions}
            multiline
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Follow-up</Text>
          <TextInput
            style={styles.input}
            placeholder="Follow-up date (YYYY-MM-DD)"
            placeholderTextColor={colors.inkSubtle}
            value={followUpDate}
            onChangeText={setFollowUpDate}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.multiline, { marginTop: spacing.sm }]}
            placeholder="Follow-up notes"
            placeholderTextColor={colors.inkSubtle}
            value={followUpNotes}
            onChangeText={setFollowUpNotes}
            multiline
          />
        </Card>

        <Button title="Save & Share with Patient" loading={saving} style={styles.saveBtn} onPress={() => void handleSave()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  title: { ...typography.title, color: colors.ink, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.heading, color: colors.ink },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  addBtnText: { ...typography.label, color: colors.onPrimary, fontSize: 13 },
  medBlock: { marginBottom: spacing.lg, borderBottomWidth: 1, borderColor: colors.surfaceMuted, paddingBottom: spacing.md },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  medNameInput: { flex: 1 },
  medFields: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  fieldHalf: { flex: 1 },
  removeBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: colors.surfaceMuted, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 15, color: colors.ink, marginTop: spacing.sm },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { marginTop: spacing.sm },
  pressed: { opacity: 0.8 },
});