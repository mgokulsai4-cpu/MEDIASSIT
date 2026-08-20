import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../src/api/client';
import type { TimelineEntry } from '../src/types';
import { Card } from '../src/ui/Card';
import { Screen } from '../src/ui/Screen';
import { colors, layout, radii, spacing, typography } from '../src/ui/theme';

const TYPE_META: Record<TimelineEntry['type'], { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  appointment: { icon: 'calendar', color: colors.primary, bg: colors.primarySoft },
  report: { icon: 'document-text', color: colors.accent, bg: colors.accentSoft },
  prescription: { icon: 'medkit', color: colors.success, bg: colors.successSoft },
  preconsult: { icon: 'clipboard', color: colors.warning, bg: colors.warningSoft },
  triage: { icon: 'chatbubbles', color: '#7C5CA8', bg: '#F0EAF8' },
};

export default function TimelineScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const endpoint = patientId ? `/api/timeline/patient/${patientId}` : '/api/timeline/me';
      const res = await api.get<TimelineEntry[]>(endpoint);
      setEntries(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;

  return (
    <Screen padded={false}>
      <FlatList
        data={entries}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.title}>{patientId ? 'Health Timeline' : 'My Health Timeline'}</Text>}
        ListEmptyComponent={<Text style={styles.empty}>No health records yet. Book an appointment to get started.</Text>}
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.triage;
          return (
            <Pressable
              onPress={() => (item.link ? router.push(item.link as never) : undefined)}
              disabled={!item.link}
            >
              <Card style={styles.card}>
                <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.entryTitle}>{item.title}</Text>
                  <Text style={styles.entrySub}>{item.subtitle}</Text>
                  {!!item.doctor_name && <Text style={styles.entryDoctor}>{item.doctor_name}</Text>}
                </View>
                <View style={styles.right}>
                  <Text style={styles.date}>{item.date}</Text>
                  {!!item.status && <Text style={[styles.status, { color: meta.color }]}>{item.status}</Text>}
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: layout.horizontalPadding, paddingBottom: 40 },
  title: { ...typography.title, color: colors.ink, marginBottom: spacing.lg },
  empty: { ...typography.body, color: colors.inkSubtle, textAlign: 'center', marginTop: 60 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  iconWrap: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  entryTitle: { ...typography.heading, color: colors.ink },
  entrySub: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
  entryDoctor: { ...typography.caption, color: colors.primaryDark, marginTop: 1 },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  date: { ...typography.caption, color: colors.inkSubtle },
  status: { ...typography.caption, fontWeight: '700', textTransform: 'capitalize' },
});