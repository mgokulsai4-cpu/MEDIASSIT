import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { fakePatientSummary } from '../../src/data/testData';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { FadeSlide, Stagger } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { StatusBadge } from '../../src/ui/StatusBadge';
import { TextField } from '../../src/ui/TextField';
import { colors, layout, spacing, typography } from '../../src/ui/theme';

interface PatientSummary {
  patient: {
    patient_id: string;
    name: string;
    age?: number;
    gender?: string;
    blood_group?: string;
    existing_conditions?: string[];
    allergies?: string[];
    medical_history?: string;
  };
  preconsult_summary?: Record<string, unknown> | null;
  triage_result?: Record<string, unknown> | null;
  urgency?: string;
  recent_reports?: { report_id: string; diagnosis: string; date: string; is_fake?: boolean }[];
}

interface PatientHistoryItem {
  patient_id: string;
  name: string;
  age?: number;
  gender?: string;
  last_visit?: string;
  last_time?: string;
  visit_count: number;
  last_status?: string;
  is_fake?: boolean;
}

const FAKE_PATIENT_HISTORY: PatientHistoryItem[] = [
  { patient_id: 'FAKE-P001', name: 'Riya Sharma', age: 29, gender: 'female', last_visit: new Date().toISOString(), last_time: '09:30 AM', visit_count: 3, last_status: 'completed', is_fake: true },
  { patient_id: 'FAKE-P003', name: 'Maya Patel', age: 44, gender: 'female', last_visit: new Date(Date.now() - 86400000 * 3).toISOString(), last_time: '11:00 AM', visit_count: 2, last_status: 'confirmed', is_fake: true },
];

export default function PatientsScreen() {
  const router = useRouter();
  const { testMode } = useSettings();
  const [patientId, setPatientId] = useState('');
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<PatientHistoryItem[]>([]);

  const loadPatient = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setSearched(true);
    if (testMode && id.trim().toUpperCase().startsWith('FAKE')) {
      setPatient(fakePatientSummary as PatientSummary);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<PatientSummary>(`/api/doctor-dashboard/patient-summary/${id.trim()}`);
      setPatient(res.data as unknown as PatientSummary);
    } catch {
      setPatient(null);
    } finally {
      setLoading(false);
    }
  }, [testMode]);

  const searchPatient = () => { void loadPatient(patientId); };

  useFocusEffect(useCallback(() => {
    async function loadHistory() {
      if (testMode) {
        setHistory(FAKE_PATIENT_HISTORY);
        return;
      }
      try {
        const res = await api.get<PatientHistoryItem[]>('/api/doctor-dashboard/patients');
        setHistory((res.data as PatientHistoryItem[]) ?? []);
      } catch {
        setHistory([]);
      }
    }
    void loadHistory();
  }, [testMode]));

  return (
    <Screen padded={false}>
    <ScrollView contentContainerStyle={styles.content}>
      <FadeSlide>
        <Text style={styles.title}>Patients</Text>
        <Text style={styles.sectionTitle}>Patient History</Text>
      </FadeSlide>
      {history.length === 0 ? (
        <Text style={styles.emptyText}>No patient history yet.</Text>
      ) : (
        history.map((item, index) => (
          <Stagger key={item.patient_id} index={index}>
          <Pressable onPress={() => { setPatientId(item.patient_id); void loadPatient(item.patient_id); }} style={({ pressed }) => [styles.historyCard, pressed && styles.pressed]}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyName}>{item.name}</Text>
              <Text style={styles.historyCount}>{item.visit_count} visit{item.visit_count === 1 ? '' : 's'}</Text>
            </View>
            <Text style={styles.historyMeta}>{item.patient_id} · {item.age ?? 'Age N/A'} · {item.gender ?? 'Gender N/A'}</Text>
            {item.last_visit ? <Text style={styles.historyMeta}>Last visit: {new Date(item.last_visit).toLocaleDateString()} {item.last_time ?? ''}</Text> : null}
            <Text style={styles.historyStatus}>{item.last_status?.replace(/_/g, ' ') ?? 'No status'}</Text>
          </Pressable>
          </Stagger>
        ))
      )}

      <Text style={styles.lookupTitle}>Patient Lookup</Text>
      <View style={styles.searchRow}>
        <TextField
          value={patientId}
          onChangeText={setPatientId}
          placeholder="Enter patient ID (e.g., P001)"
          containerStyle={styles.searchInput}
        />
        <Button title="Search" icon="search-outline" style={styles.searchBtn} onPress={searchPatient} disabled={loading} loading={loading} />
      </View>
      {testMode && <Text style={styles.testHint}>Test mode: search `FAKE-P001` to view demo patient data.</Text>}

      {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.xl }} />}

      {searched && !loading && !patient && (
        <Text style={styles.emptyText}>Patient not found.</Text>
      )}

      {patient && (
        <Card style={styles.resultCard}>
          {patient.patient.patient_id.startsWith('FAKE-') && <StatusBadge label="Fake test data" tone="warning" />}
          <Text style={styles.sectionTitle}>Patient Profile</Text>
          <Text style={styles.field}>Name: {patient.patient.name}</Text>
          <Text style={styles.field}>Age: {patient.patient.age ?? 'N/A'}</Text>
          <Text style={styles.field}>Gender: {patient.patient.gender ?? 'N/A'}</Text>
          <Text style={styles.field}>Blood Group: {patient.patient.blood_group ?? 'N/A'}</Text>
          {patient.patient.existing_conditions && patient.patient.existing_conditions.length > 0 && (
            <Text style={styles.field}>Conditions: {patient.patient.existing_conditions.join(', ')}</Text>
          )}
          {patient.patient.allergies && patient.patient.allergies.length > 0 && (
            <Text style={styles.field}>Allergies: {patient.patient.allergies.join(', ')}</Text>
          )}
          {patient.patient.medical_history && (
            <Text style={styles.field}>History: {patient.patient.medical_history}</Text>
          )}

          {patient.preconsult_summary && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Pre-Consultation Summary</Text>
              {(patient.preconsult_summary as { clinical_summary?: string }).clinical_summary ? (
                <Text style={styles.field}>{(patient.preconsult_summary as { clinical_summary: string }).clinical_summary}</Text>
              ) : null}
              {(patient.preconsult_summary as { chief_complaint?: string })?.chief_complaint && (
                <Text style={styles.field}>
                  Complaint: {(patient.preconsult_summary as { chief_complaint: string }).chief_complaint}
                </Text>
              )}
              {Array.isArray((patient.preconsult_summary as { symptoms?: { severity?: string; duration?: string }[] }).symptoms) &&
                (patient.preconsult_summary as { symptoms: { severity?: string; duration?: string }[] }).symptoms.map((item, index) => (
                  <Text key={index} style={styles.field}>Symptoms: {item.severity || 'n/a'} · {item.duration || 'n/a'}</Text>
                ))}
              {(patient.preconsult_summary as { medications?: string[] })?.medications && (
                <Text style={styles.field}>
                  Medications: {(patient.preconsult_summary as { medications: string[] }).medications.join(', ') || 'None'}
                </Text>
              )}
              {(patient.preconsult_summary as { allergies?: string[] })?.allergies && (
                <Text style={styles.field}>
                  Allergies: {(patient.preconsult_summary as { allergies: string[] }).allergies.join(', ') || 'None'}
                </Text>
              )}
              {(patient.preconsult_summary as { medical_history?: string })?.medical_history ? (
                <Text style={styles.field}>History: {(patient.preconsult_summary as { medical_history: string }).medical_history}</Text>
              ) : null}
              {(patient.preconsult_summary as { lifestyle_notes?: string })?.lifestyle_notes ? (
                <Text style={styles.field}>Lifestyle: {(patient.preconsult_summary as { lifestyle_notes: string }).lifestyle_notes}</Text>
              ) : null}
              {(patient.preconsult_summary as { vital_signs?: { temperature?: string } })?.vital_signs?.temperature ? (
                <Text style={styles.field}>Temperature: {(patient.preconsult_summary as { vital_signs: { temperature: string } }).vital_signs.temperature}</Text>
              ) : null}
            </>
          )}

          {patient.urgency && (
            <StatusBadge label={patient.urgency} tone={patient.urgency === 'red' ? 'danger' : patient.urgency === 'orange' || patient.urgency === 'yellow' ? 'warning' : 'success'} />
          )}

          {patient.recent_reports && patient.recent_reports.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Recent Reports</Text>
              {patient.recent_reports.map((r) => (
                <Pressable
                  key={r.report_id}
                  style={({ pressed }) => [styles.reportItem, pressed && styles.pressed]}
                  onPress={() => r.is_fake ? Alert.alert('Fake test data', 'This report is local demo data.') : router.push(`/reports/${r.report_id}`)}
                >
                  <Text style={styles.field}>{r.diagnosis}</Text>
                  <Text style={styles.reportDate}>{new Date(r.date).toLocaleDateString()}</Text>
                </Pressable>
              ))}
            </>
          )}
        </Card>
      )}
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  title: { ...typography.title, color: colors.ink, marginBottom: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.md },
  lookupTitle: { ...typography.heading, color: colors.ink, marginTop: spacing.xxl, marginBottom: spacing.md },
  searchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, alignItems: 'flex-end' },
  searchInput: { flex: 1 },
  searchBtn: { minWidth: 118 },
  testHint: { ...typography.caption, color: colors.warning, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: colors.inkSubtle, textAlign: 'center', marginTop: spacing.xl },
  resultCard: { padding: spacing.lg },
  historyCard: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyName: { ...typography.heading, color: colors.ink },
  historyCount: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  historyMeta: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.xs },
  historyStatus: { ...typography.caption, color: colors.primary, marginTop: spacing.sm, textTransform: 'capitalize' },
  field: { ...typography.body, color: colors.inkMuted, marginBottom: spacing.xs },
  reportItem: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.sm },
  reportDate: { ...typography.caption, color: colors.inkSubtle },
  pressed: { opacity: 0.78 },
});
