import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { FadeSlide, Stagger } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { StatusBadge } from '../../src/ui/StatusBadge';
import { TextField } from '../../src/ui/TextField';
import { colors, layout, spacing, typography } from '../../src/ui/theme';

interface MedicalReport {
  report_id: string;
  patient_id: string;
  doctor_diagnosis: string;
  created_at: string;
  symptoms?: string[];
  is_fake?: boolean;
}

interface ReportForm {
  patientId: string;
  appointmentId: string;
  symptoms: string;
  clinicalObservations: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  followUp: string;
}

const EMPTY_FORM: ReportForm = {
  patientId: '',
  appointmentId: '',
  symptoms: '',
  clinicalObservations: '',
  diagnosis: '',
  treatment: '',
  prescription: '',
  followUp: '',
};

export default function DoctorReportsScreen() {
  const router = useRouter();
  const { testMode, theme, fakeReports, addFakeReport } = useSettings();
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ReportForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const visibleReports = testMode ? fakeReports as MedicalReport[] : reports;

  const loadReports = useCallback(async () => {
    if (testMode) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<MedicalReport[]>('/api/reports/doctor');
      setReports((res.data as MedicalReport[]) ?? []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [testMode]);

  useFocusEffect(useCallback(() => {
    void loadReports();
  }, [loadReports]));

  const updateForm = (key: keyof ReportForm, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setFormError('');
  };

  const handleCreateReport = async () => {
    const patientId = form.patientId.trim();
    const appointmentId = form.appointmentId.trim();
    const diagnosis = form.diagnosis.trim();
    if (!patientId || !appointmentId || !diagnosis) {
      setFormError('Patient ID, appointment ID, and diagnosis are required.');
      return;
    }

    const symptoms = form.symptoms.split(',').map((item) => item.trim()).filter(Boolean);
    setSaving(true);
    try {
      if (testMode) {
        addFakeReport({
          report_id: `FAKE-REPORT-${Date.now()}`,
          patient_id: patientId,
          doctor_diagnosis: diagnosis,
          created_at: new Date().toISOString(),
          symptoms,
          is_fake: true,
        });
        Alert.alert('Fake report added', 'Test report was saved locally.');
      } else {
        await api.post('/api/reports', {
          patient_id: patientId,
          appointment_id: appointmentId,
          symptoms,
          clinical_observations: form.clinicalObservations.trim(),
          doctor_diagnosis: diagnosis,
          treatment: form.treatment.trim(),
          prescription: form.prescription.trim(),
          follow_up: form.followUp.trim(),
        });
        Alert.alert('Report saved', 'Medical report was added successfully.');
        await loadReports();
      }
      setForm(EMPTY_FORM);
      setFormVisible(false);
    } catch (error) {
      setFormError((error as Error).message || 'Could not save report.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
      <FadeSlide>
      <View style={styles.titleRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>My Reports</Text>
          {testMode && <StatusBadge label="Fake test data" tone="warning" />}
        </View>
        <Button title="Add report" icon="add-outline" style={styles.addButton} onPress={() => { setForm(EMPTY_FORM); setFormError(''); setFormVisible(true); }} />
      </View>
      </FadeSlide>
      {visibleReports.length === 0 ? (
        <FadeSlide delay={80}>
        <View style={styles.emptyWrap}>
          <Ionicons name="document-text-outline" size={40} color={colors.inkSubtle} />
          <Text style={styles.emptyText}>No reports yet.</Text>
        </View>
        </FadeSlide>
      ) : (
        visibleReports.map((report, index) => (
          <Stagger key={report.report_id} index={index}>
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => report.is_fake ? Alert.alert('Fake test data', 'This report is local demo data.') : router.push(`/reports/${report.report_id}`)}
          >
            <Text style={styles.reportId}>Report #{report.report_id}</Text>
            <Text style={styles.diagnosis}>{report.doctor_diagnosis}</Text>
            <Text style={styles.date}>{new Date(report.created_at).toLocaleDateString()}</Text>
            {report.symptoms && report.symptoms.length > 0 && (
              <Text style={styles.symptoms}>Symptoms: {report.symptoms.join(', ')}</Text>
            )}
          </Pressable>
          </Stagger>
        ))
      )}
    </ScrollView>
    <Modal visible={formVisible} transparent animationType="slide" onRequestClose={() => !saving && setFormVisible(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.modalTitle, { color: theme.ink }]}>Add Medical Report</Text>
            <Text style={[styles.modalHint, { color: theme.inkMuted }]}>Use patient and appointment IDs from this consultation.</Text>
            <TextField label="Patient ID" value={form.patientId} onChangeText={(value) => updateForm('patientId', value)} placeholder="e.g. P001" autoCapitalize="characters" containerStyle={styles.field} />
            <TextField label="Appointment ID" value={form.appointmentId} onChangeText={(value) => updateForm('appointmentId', value)} placeholder="e.g. A001" autoCapitalize="characters" containerStyle={styles.field} />
            <TextField label="Symptoms" value={form.symptoms} onChangeText={(value) => updateForm('symptoms', value)} placeholder="Comma-separated symptoms" containerStyle={styles.field} />
            <TextField label="Clinical observations" value={form.clinicalObservations} onChangeText={(value) => updateForm('clinicalObservations', value)} placeholder="Findings from consultation" multiline containerStyle={styles.field} />
            <TextField label="Diagnosis" value={form.diagnosis} onChangeText={(value) => updateForm('diagnosis', value)} placeholder="Required" multiline containerStyle={styles.field} />
            <TextField label="Treatment" value={form.treatment} onChangeText={(value) => updateForm('treatment', value)} placeholder="Treatment plan" multiline containerStyle={styles.field} />
            <TextField label="Prescription" value={form.prescription} onChangeText={(value) => updateForm('prescription', value)} placeholder="Medication and dosage" multiline containerStyle={styles.field} />
            <TextField label="Follow-up" value={form.followUp} onChangeText={(value) => updateForm('followUp', value)} placeholder="Follow-up instructions" multiline containerStyle={styles.field} />
            {formError ? <Text style={[styles.formError, { color: theme.danger }]}>{formError}</Text> : null}
            <Button title="Save report" icon="save-outline" size="lg" onPress={handleCreateReport} loading={saving} disabled={saving} />
            <Button title="Cancel" variant="ghost" onPress={() => setFormVisible(false)} disabled={saving} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  title: { ...typography.title, color: colors.ink, marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.lg },
  titleGroup: { flex: 1, gap: spacing.xs },
  addButton: { minWidth: 132 },
  emptyText: { ...typography.body, color: colors.inkSubtle, textAlign: 'center', marginTop: spacing.md },
  emptyWrap: { alignItems: 'center', gap: spacing.md, marginTop: 48 },
  card: { marginBottom: spacing.md },
  reportId: { ...typography.caption, color: colors.inkSubtle, fontWeight: '600' },
  diagnosis: { ...typography.heading, color: colors.ink, marginTop: spacing.xs },
  date: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.xs },
  symptoms: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.xs },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 42, 67, 0.46)' },
  modalCard: { maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContent: { padding: layout.horizontalPadding, paddingBottom: 32 },
  modalTitle: { ...typography.title, marginBottom: spacing.xs },
  modalHint: { ...typography.caption, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  formError: { ...typography.caption, marginBottom: spacing.md },
});
