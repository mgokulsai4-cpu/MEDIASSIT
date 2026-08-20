import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/client';
import type { Prescription } from '../../src/types';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { colors, layout, radii, spacing, typography } from '../../src/ui/theme';

export default function PrescriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Prescription>(`/api/prescriptions/${id}`)
      .then((res) => setItem((res.data as unknown as Prescription) ?? null))
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;
  if (!item) return <Screen><Text style={styles.error}>Prescription not found.</Text></Screen>;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Prescription {item.prescription_id}</Text>
        {item.doctor && <Text style={styles.doctor}>{item.doctor.name} · {item.doctor.specialization}</Text>}

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Medications</Text>
          {item.medications.length === 0 && <Text style={styles.muted}>No medications listed.</Text>}
          {item.medications.map((med, i) => (
            <View key={i} style={styles.medRow}>
              <View style={styles.medIcon}>
                <Ionicons name="medkit-outline" size={16} color={colors.accent} />
              </View>
              <View style={styles.medCopy}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medMeta}>
                  {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ') || 'As directed'}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {!!item.instructions && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.body}>{item.instructions}</Text>
          </Card>
        )}

        {(item.follow_up_date || item.follow_up_notes) && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Follow-up</Text>
            {!!item.follow_up_date && <Text style={styles.body}>Follow-up date: {item.follow_up_date}</Text>}
            {!!item.follow_up_notes && <Text style={styles.body}>{item.follow_up_notes}</Text>}
          </Card>
        )}

        <Text style={styles.meta}>Issued {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  title: { ...typography.title, color: colors.ink },
  doctor: { ...typography.body, color: colors.inkMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  sectionTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.md },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.surfaceMuted },
  medIcon: { width: 32, height: 32, borderRadius: radii.sm, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  medCopy: { flex: 1 },
  medName: { ...typography.label, color: colors.ink },
  medMeta: { ...typography.caption, color: colors.inkMuted, marginTop: 1 },
  body: { ...typography.body, color: colors.inkMuted },
  muted: { ...typography.body, color: colors.inkSubtle },
  meta: { ...typography.caption, color: colors.inkSubtle, textAlign: 'center', marginTop: spacing.md },
  error: { textAlign: 'center', color: colors.inkSubtle, marginTop: 60, fontSize: 16 },
});