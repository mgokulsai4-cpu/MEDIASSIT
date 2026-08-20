import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/api/client';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { ButtonStack } from '../../src/ui/ButtonStack';
import { Card } from '../../src/ui/Card';
import { FadeSlide, PopOnChange, ScaleIn } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { layout, radii, spacing, typography } from '../../src/ui/theme';

interface DashboardStats {
  upcoming_appts: number;
  queue_position: number | null;
  report_count: number;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { theme } = useSettings();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({ upcoming_appts: 0, queue_position: null, report_count: 0 });

  const loadStats = useCallback(async () => {
    try {
      const patientRes = await api.get<{ patient: { patient_id: string } }>('/api/patients/me');
      const patientId = patientRes.data?.patient?.patient_id;
      const [apptsRes, queueRes, reportsRes] = await Promise.allSettled([
        api.get<unknown[]>('/api/appointments'),
        api.get<{ entries?: { position?: number }[] }>('/api/queue/active'),
        patientId ? api.get<unknown[]>(`/api/reports/patient/${patientId}`) : Promise.resolve({ data: [] }),
      ]);
      const appointments = apptsRes.status === 'fulfilled' && Array.isArray(apptsRes.value.data) ? apptsRes.value.data : [];
      const upcoming = appointments.filter((a) => ['scheduled', 'confirmed', 'in_queue'].includes(String((a as { status?: string }).status))).length;
      const queueData = queueRes.status === 'fulfilled' ? (queueRes.value as { entries?: { position?: number }[] }).entries ?? [] : [];
      const reports = reportsRes.status === 'fulfilled' && Array.isArray(reportsRes.value.data) ? reportsRes.value.data : [];
      setStats({ upcoming_appts: upcoming, queue_position: queueData[0]?.position ?? null, report_count: reports.length });
    } catch {
      // Offline — keep previous stats
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadStats(); }, [loadStats]));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Screen padded={false}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScaleIn>
        <View style={styles.greeting}>
          <Text style={[styles.greetingText, { color: theme.ink }]}>{greeting}, {user?.name?.split(' ')[0] || 'Patient'}</Text>
          <Text style={[styles.dateText, { color: theme.inkMuted }]}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>
      </ScaleIn>

      <View style={styles.statsRow}>
        {[
          { key: 'up', icon: 'calendar' as const, tint: theme.primarySoft, color: theme.primary, value: stats.upcoming_appts, label: 'Upcoming' },
          { key: 'q', icon: 'time' as const, tint: theme.warningSoft, color: theme.warning, value: stats.queue_position ?? '—', label: 'Queue Pos.' },
          { key: 'r', icon: 'document-text' as const, tint: theme.accentSoft, color: theme.accent, value: stats.report_count, label: 'Reports' },
        ].map((item, index) => (
          <FadeSlide key={item.key} delay={90 + index * 80} from={18} style={styles.statCard}>
            <Card>
              <View style={[styles.statIcon, { backgroundColor: item.tint }]}><Ionicons name={item.icon} size={16} color={item.color} /></View>
              <PopOnChange value={item.value}>
                <Text style={[styles.statNumber, { color: theme.ink }]}>{item.value}</Text>
              </PopOnChange>
              <Text style={[styles.statLabel, { color: theme.inkMuted }]}>{item.label}</Text>
            </Card>
          </FadeSlide>
        ))}
      </View>

      <FadeSlide delay={280}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>What do you need?</Text>
        <ButtonStack>
          <Button title="Check symptoms" icon="sparkles" size="lg" onPress={() => router.push('/(tabs)/ai-chat')} />
          <Button title="Find a doctor" icon="medical-outline" variant="secondary" onPress={() => router.push('/(tabs)/doctors')} />
          <Button title="Scan a paper report" icon="scan-outline" variant="secondary" onPress={() => router.push('/reports/scan')} />
          <Button title="Health timeline" icon="time-outline" variant="secondary" onPress={() => router.push('/timeline')} />
        </ButtonStack>
      </FadeSlide>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  greeting: { marginBottom: spacing.xl, marginTop: spacing.sm },
  greetingText: { ...typography.display, fontSize: 26, lineHeight: 32 },
  dateText: { ...typography.body, marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxxl },
  statCard: { flex: 1, alignItems: 'flex-start' },
  statIcon: { width: 30, height: 30, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statNumber: { fontSize: 26, fontWeight: '800' },
  statLabel: { ...typography.caption, marginTop: 2 },
  sectionTitle: { ...typography.heading, marginBottom: spacing.sm },
});
