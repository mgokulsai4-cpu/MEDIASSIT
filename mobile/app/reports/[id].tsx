import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/client';
import type { MedicalReport } from '../../src/types';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { SpeakButton } from '../../src/ui/SpeakButton';
import { useSettings } from '../../src/contexts/SettingsContext';
import { speak } from '../../src/services/voice';
import { colors, layout, spacing, typography } from '../../src/ui/theme';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<MedicalReport | null>(null);
  const { readAloud } = useSettings();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await api.get<MedicalReport>(`/api/reports/${id}`);
        setReport((res.data as unknown as MedicalReport) ?? null);
      } catch {
        setReport(null);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadReport();
  }, [id]);

  useEffect(() => {
    if (report && readAloud) {
      const fields = [
        report.symptoms ? 'Symptoms: ' + (Array.isArray(report.symptoms) ? report.symptoms.join(', ') : report.symptoms) : '',
        report.clinical_observations ? 'Observations: ' + report.clinical_observations : '',
        report.doctor_diagnosis ? 'Diagnosis: ' + report.doctor_diagnosis : '',
        report.treatment ? 'Treatment: ' + report.treatment : '',
        report.prescription ? 'Prescription: ' + report.prescription : '',
        report.follow_up ? 'Follow-up: ' + report.follow_up : '',
      ].filter(Boolean).join('. ');
      if (fields) speak('Medical report. ' + fields);
    }
  }, [report, readAloud]);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;
  if (!report) return <Screen><Text style={styles.error}>Report not found.</Text></Screen>;

  return (
    <Screen padded={false}>
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={styles.title}>Medical Report</Text>
      <SpeakButton text={"Medical report. " + [
        report.symptoms ? "Symptoms: " + (Array.isArray(report.symptoms) ? report.symptoms.join(", ") : report.symptoms) : "",
        report.clinical_observations ? "Observations: " + report.clinical_observations : "",
        report.doctor_diagnosis ? "Diagnosis: " + report.doctor_diagnosis : "",
        report.treatment ? "Treatment: " + report.treatment : "",
        report.prescription ? "Prescription: " + report.prescription : "",
        report.follow_up ? "Follow-up: " + report.follow_up : "",
      ].filter(Boolean).join(". ")} />
    </View>
      <Text style={styles.date}>{new Date(report.created_at ?? report.date ?? new Date().toISOString()).toLocaleDateString('en-US', { dateStyle: 'long' })}</Text>

      <Field label="Symptoms" value={Array.isArray(report.symptoms) ? report.symptoms.join(', ') : report.symptoms} />
      <Field label="Clinical Observations" value={report.clinical_observations} />
      <Field label="Diagnosis" value={report.doctor_diagnosis} />
      <Field label="Treatment" value={report.treatment} />
      <Field label="Prescription" value={report.prescription} />
      <Field label="Follow-up" value={report.follow_up} />
    </ScrollView>
    </Screen>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <Card style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: layout.horizontalPadding, paddingBottom: 40 },
  title: { ...typography.title, color: colors.ink, marginBottom: spacing.xs },
  date: { ...typography.caption, color: colors.inkMuted, marginBottom: spacing.xl },
  error: { textAlign: 'center', color: colors.inkSubtle, marginTop: 60, fontSize: 16 },
  field: { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, color: colors.inkMuted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  fieldValue: { ...typography.body, color: colors.ink },
});
