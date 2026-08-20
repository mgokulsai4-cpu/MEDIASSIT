import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../src/api/client';
import type { FamilyMember } from '../src/types';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Screen } from '../src/ui/Screen';
import { colors, layout, radii, spacing, typography } from '../src/ui/theme';

const RELATIONS = ['parent', 'child', 'spouse', 'sibling', 'other'] as const;

export default function FamilyScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [relation, setRelation] = useState<(typeof RELATIONS)[number]>('parent');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<FamilyMember[]>('/api/family');
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleAdd = async () => {
    if (!email.trim()) return;
    setAdding(true);
    try {
      await api.post('/api/family', { email: email.trim(), relation });
      setEmail('');
      Alert.alert('Family member added', 'They can now be managed from this account.');
      await load();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = (member: FamilyMember) => {
    Alert.alert('Remove member', `Remove ${member.user.name} from your family?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/family/${member.user.user_id}`);
            await load();
          } catch (e) {
            Alert.alert('Error', (e as Error).message);
          }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;

  return (
    <Screen padded={false}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.link_id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Family & Guardians</Text>
            <Card style={styles.addCard}>
              <Text style={styles.sectionTitle}>Add a family member</Text>
              <TextInput
                style={styles.input}
                placeholder="Their account email"
                placeholderTextColor={colors.inkSubtle}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <View style={styles.relationRow}>
                {RELATIONS.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setRelation(r)}
                    style={({ pressed }) => [
                      styles.relationChip,
                      relation === r && styles.relationChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.relationText, relation === r && styles.relationTextActive]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Button title="Link Member" loading={adding} disabled={!email.trim()} style={styles.addBtn} onPress={() => void handleAdd()} />
            </Card>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No family members linked yet.</Text>}
        renderItem={({ item }) => (
          <Card style={styles.memberCard}>
            <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
              <Text style={styles.avatarText}>{item.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}</Text>
            </View>
            <View style={styles.memberCopy}>
              <Text style={styles.memberName}>{item.user.name}</Text>
              <Text style={styles.memberMeta}>{item.relation} · {item.patient?.age ? `Age ${item.patient.age}` : item.user.email}</Text>
            </View>
            {item.patient && (
              <Pressable
                onPress={() => router.push(`/timeline?patientId=${item.patient?.patient_id}`)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.viewBtn, pressed && styles.pressed]}
              >
                <Ionicons name="time" size={16} color={colors.primaryDark} />
                <Text style={styles.viewBtnText}>Records</Text>
              </Pressable>
            )}
            <Pressable onPress={() => handleRemove(item)} accessibilityRole="button" style={styles.removeBtn}>
              <Ionicons name="close" size={16} color={colors.danger} />
            </Pressable>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: layout.horizontalPadding, paddingBottom: 40 },
  title: { ...typography.title, color: colors.ink, marginBottom: spacing.lg },
  addCard: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.md },
  input: { backgroundColor: colors.surfaceMuted, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 15, color: colors.ink },
  relationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  relationChip: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  relationChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  relationText: { ...typography.label, color: colors.inkMuted },
  relationTextActive: { color: colors.primaryDark },
  addBtn: { marginTop: spacing.lg },
  empty: { ...typography.body, color: colors.inkSubtle, textAlign: 'center', marginTop: 60 },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.label, color: colors.primaryDark },
  memberCopy: { flex: 1 },
  memberName: { ...typography.heading, color: colors.ink },
  memberMeta: { ...typography.caption, color: colors.inkMuted, marginTop: 2, textTransform: 'capitalize' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primarySoft, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  viewBtnText: { ...typography.label, fontSize: 12, color: colors.primaryDark },
  removeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});