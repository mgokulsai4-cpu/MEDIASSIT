import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/api/client';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { FadeSlide, ScaleIn } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { colors, layout, radii, spacing, typography } from '../../src/ui/theme';

interface DoctorProfile {
  specialization?: string;
  department?: string;
  hospital?: string;
  qualification?: string;
  experience?: number;
  consultation_fee?: number;
  room_number?: string;
  status?: string;
  availability?: { day: string; slots?: string[] }[];
}

export default function DoctorProfileScreen() {
  const { user, logout } = useAuth();
  const { theme } = useSettings();
  const router = useRouter();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);

  useFocusEffect(useCallback(() => {
    async function loadProfile() {
      try {
        const res = await api.get<{ doctor: DoctorProfile }>('/api/doctors/me');
        setDoctor(res.data?.doctor ?? null);
      } catch {
        setDoctor(null);
      } finally {
        setLoadingProfile(false);
      }
    }
    void loadProfile();
  }, []));

  const handleLogout = () => { void logout(); };

  const setStatus = async (status: 'available' | 'busy' | 'offline') => {
    setSavingStatus(true);
    try {
      const res = await api.patch<{ doctor: DoctorProfile }>('/api/doctors/me/status', { status });
      setDoctor(res.data?.doctor ?? { ...doctor, status });
    } catch (error) {
      Alert.alert('Could not update status', (error as Error).message);
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <Screen
      padded={false}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
      <ScaleIn>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <Text style={[styles.avatarText, { color: theme.onPrimary }]}>
            {user?.name?.charAt(0)?.toUpperCase() ?? 'D'}
          </Text>
        </View>
      </ScaleIn>
      <FadeSlide delay={80}>
        <Text style={[styles.name, { color: theme.ink }]}>{user?.name ?? 'Doctor'}</Text>
        <Text style={[styles.role, { color: theme.inkMuted }]}>Doctor</Text>
        <Text style={[styles.email, { color: theme.inkMuted }]}>{user?.email ?? ''}</Text>
      </FadeSlide>

      {loadingProfile ? <ActivityIndicator color={theme.primary} style={styles.profileLoader} /> : doctor ? (
        <FadeSlide delay={160} style={{ alignSelf: 'stretch' }}>
        <Card style={styles.profileCard}>
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>Professional profile</Text>
          <InfoRow label="Specialization" value={doctor.specialization} />
          <InfoRow label="Department" value={doctor.department} />
          <InfoRow label="Hospital / clinic" value={doctor.hospital} />
          <InfoRow label="Qualification" value={doctor.qualification} />
          <InfoRow label="Experience" value={doctor.experience !== undefined ? `${doctor.experience} years` : undefined} />
          <InfoRow label="Consultation fee" value={doctor.consultation_fee ? `₹${doctor.consultation_fee}` : undefined} />
          <InfoRow label="Room" value={doctor.room_number} />
          <InfoRow label="Status" value={doctor.status} />
          <View style={[styles.statusRow, { borderColor: theme.border }]}>
            {(['available', 'busy', 'offline'] as const).map((status) => {
              const selected = doctor.status === status;
              return (
                <Pressable
                  key={status}
                  disabled={savingStatus}
                  onPress={() => void setStatus(status)}
                  style={[styles.statusSeg, selected && { backgroundColor: theme.primary }]}
                >
                  <Text style={[styles.statusSegText, { color: selected ? theme.onPrimary : theme.ink }]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.scheduleTitle, { color: theme.ink }]}>Appointment times</Text>
          <ScheduleDisplay availability={doctor.availability ?? []} />
          <Button title="Edit professional profile" icon="create-outline" variant="secondary" style={styles.editButton} onPress={() => router.push({ pathname: '/doctor-onboarding', params: { edit: 'true' } })} />
        </Card>
        </FadeSlide>
      ) : null}

      <FadeSlide delay={240} style={styles.section}>
        <Button title="Settings" icon="settings-outline" variant="secondary" style={styles.settingsBtn} onPress={() => router.push('/settings')} />
        <Button title="Log out" icon="log-out-outline" variant="danger" style={styles.logoutBtn} onPress={handleLogout} />
      </FadeSlide>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  const { theme } = useSettings();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.ink }]}>{value || 'Not provided'}</Text>
    </View>
  );
}

function ScheduleDisplay({ availability }: { availability: { day: string; slots?: string[] }[] }) {
  const { theme } = useSettings();
  return (
    <View style={styles.scheduleGrid}>
      {availability.filter((row) => row.slots && row.slots.length > 0).map((row) => (
        <View key={row.day} style={[styles.dayCard, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
          <Text style={[styles.dayLabel, { color: theme.ink }]}>{row.day}</Text>
          <View style={styles.slotWrap}>
            {(row.slots ?? []).map((slot) => <Text key={slot} style={[styles.slotPill, { backgroundColor: theme.primarySoft, color: theme.primaryDark }]}>{slot}</Text>)}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: layout.horizontalPadding, paddingTop: spacing.xxxl },
  content: { width: '100%', alignItems: 'center', paddingBottom: spacing.xxl },
  avatar: { width: 84, height: 84, borderRadius: radii.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.white },
  name: { ...typography.title },
  role: { ...typography.body, marginTop: spacing.xs },
  email: { ...typography.caption, marginTop: spacing.xs },
  profileLoader: { marginTop: spacing.xxl },
  profileCard: { alignSelf: 'stretch', marginTop: spacing.xxl, gap: spacing.xs },
  sectionTitle: { ...typography.heading, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { ...typography.caption, flex: 1 },
  infoValue: { ...typography.body, flex: 1, textAlign: 'right' },
  statusRow: { flexDirection: 'row', marginTop: spacing.sm, borderWidth: 1, borderRadius: radii.md, overflow: 'hidden', minHeight: 48 },
  statusSeg: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  statusSegText: { ...typography.label, fontWeight: '700' },
  scheduleTitle: { ...typography.heading, marginTop: spacing.md, marginBottom: spacing.xs },
  scheduleGrid: { gap: spacing.sm },
  dayCard: { borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, gap: spacing.xs },
  dayLabel: { ...typography.label },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  slotPill: { ...typography.caption, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  editButton: { marginTop: spacing.md },
  section: { width: '100%', marginTop: spacing.xxxl },
  settingsBtn: { width: '100%' },
  logoutBtn: { width: '100%', marginTop: spacing.md },
});
