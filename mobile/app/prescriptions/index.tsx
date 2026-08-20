import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import type { Prescription } from '../../src/types';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { colors, layout, radii, spacing, typography } from '../../src/ui/theme';

export default function PrescriptionListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Prescription[]>(`/api/prescriptions/me`);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.prescription_id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.title}>My Prescriptions</Text>}
        ListEmptyComponent={<Text style={styles.empty}>No prescriptions yet.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/prescriptions/${item.prescription_id}`)}>
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Ionicons name="medkit" size={18} color={colors.primary} />
                </View>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>
                    {item.medications.map((m) => m.name).join(', ') || 'Prescription'}
                  </Text>
                  <Text style={styles.cardSub}>
                    {item.doctor?.name ?? 'Doctor'} · {item.follow_up_date ? `Follow-up ${item.follow_up_date}` : (item.created_at ?? '').slice(0, 10)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.inkSubtle} />
              </View>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: layout.horizontalPadding, paddingBottom: 40 },
  title: { ...typography.title, color: colors.ink, marginBottom: spacing.lg },
  empty: { ...typography.body, color: colors.inkSubtle, textAlign: 'center', marginTop: 60 },
  card: { marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1 },
  cardTitle: { ...typography.heading, color: colors.ink },
  cardSub: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
});