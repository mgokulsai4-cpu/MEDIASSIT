import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { FadeSlide, ScaleIn } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { layout, radii, spacing, typography } from '../../src/ui/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { theme } = useSettings();
  const router = useRouter();
  const handleLogout = () => { void logout(); };

  return (
    <Screen padded={false}>
    <ScrollView contentContainerStyle={styles.container}>
      <ScaleIn>
        <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>
            {(user?.name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
        </View>
      </ScaleIn>
      <FadeSlide delay={80}>
        <Text style={[styles.name, { color: theme.ink }]}>{user?.name || 'Patient'}</Text>
        <Text style={[styles.role, { color: theme.inkMuted }]}>{user?.role?.toUpperCase() || 'PATIENT'}</Text>
      </FadeSlide>

      <FadeSlide delay={160} style={styles.infoCard}>
        <Card>
          <InfoRow label="Email" value={user?.email} />
          <InfoRow label="Phone" value={user?.phone || 'Not set'} />
          <InfoRow label="User ID" value={user?.user_id} />
        </Card>
      </FadeSlide>

      <FadeSlide delay={240} style={{ width: '100%' }}>
        <Button title="Health timeline" icon="time-outline" variant="secondary" style={styles.settingsBtn} onPress={() => router.push('/timeline')} />
        <Button title="Family & guardians" icon="people-outline" variant="secondary" style={styles.familyBtn} onPress={() => router.push('/family')} />
        <Button title="My prescriptions" icon="medkit-outline" variant="secondary" style={styles.familyBtn} onPress={() => router.push('/prescriptions')} />
        <Button title="Settings" icon="settings-outline" variant="secondary" style={styles.familyBtn} onPress={() => router.push('/settings')} />
        <Button title="Log out" icon="log-out-outline" variant="danger" style={styles.logoutBtn} onPress={handleLogout} />
      </FadeSlide>
    </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  const { theme } = useSettings();
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.ink }]}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: layout.horizontalPadding, alignItems: 'center', paddingBottom: 40 },
  avatar: { width: 76, height: 76, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarText: { fontSize: 25, fontWeight: '800' },
  name: { ...typography.title },
  role: { ...typography.caption, marginTop: spacing.xs, marginBottom: spacing.xl },
  infoCard: { width: '100%', marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  infoLabel: { ...typography.caption },
  infoValue: { ...typography.caption, fontWeight: '600' },
  settingsBtn: { marginTop: spacing.xl, width: '100%' },
  familyBtn: { marginTop: spacing.md, width: '100%' },
  logoutBtn: { marginTop: spacing.md, width: '100%' },
});
