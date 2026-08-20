import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../../src/api/client';
import type { ScannedReport } from '../../../src/types';
import { Card } from '../../../src/ui/Card';
import { Screen } from '../../../src/ui/Screen';
import { colors, layout, spacing, typography } from '../../../src/ui/theme';

export default function ScanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scan, setScan] = useState<ScannedReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ScannedReport>(`/api/scan/${id}`)
      .then((res) => setScan((res.data as unknown as ScannedReport) ?? null))
      .catch(() => setScan(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;
  if (!scan) return <Screen><Text style={styles.error}>Scan not found.</Text></Screen>;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Scan {scan.scan_id}</Text>
        <Text style={styles.meta}>{new Date(scan.created_at).toLocaleString()}</Text>

        {!!scan.ai_summary && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>AI Summary</Text>
            <Text style={styles.summary}>{scan.ai_summary}</Text>
          </Card>
        )}

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Extracted Text</Text>
          <Text style={styles.raw}>{scan.raw_text}</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  title: { ...typography.title, color: colors.ink },
  meta: { ...typography.caption, color: colors.inkSubtle, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  sectionTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.sm },
  summary: { ...typography.body, color: colors.ink, lineHeight: 22 },
  raw: { ...typography.caption, color: colors.inkMuted, lineHeight: 18 },
  error: { textAlign: 'center', color: colors.inkSubtle, marginTop: 60, fontSize: 16 },
});