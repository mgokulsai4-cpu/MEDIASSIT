import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/api/client';
import { fakeDoctorDashboard } from '../../src/data/testData';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { FadeSlide, Stagger } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { StatusBadge } from '../../src/ui/StatusBadge';
import { colors, layout, spacing, typography } from '../../src/ui/theme';

interface DashboardData {
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  today_appointments: {
    appointment_id: string;
    patient_id: string;
    patient_name: string;
    date: string;
    time: string;
    urgency: string;
    status: string;
    queue_position: string | null;
    queue_status: string | null;
    preconsult_status?: string | null;
    chief_complaint?: string;
    urgency_guidance?: { level: string; label: string; action: string };
  }[];
  total_today: number;
  queue_length: number;
  urgency_breakdown: { red: number; orange: number; yellow: number; green: number };
}

export default function DoctorDashboardScreen() {
  const { user } = useAuth();
  const { testMode, theme, fakeQueue } = useSettings();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const activeFakeQueue = fakeQueue.filter((entry) => ['waiting', 'called', 'in_consultation'].includes(entry.status));
  const fakeUrgencyBreakdown = activeFakeQueue.reduce<DashboardData['urgency_breakdown']>((counts, entry) => {
    if (entry.urgency in counts) counts[entry.urgency as keyof DashboardData['urgency_breakdown']] += 1;
    return counts;
  }, { red: 0, orange: 0, yellow: 0, green: 0 });
  const fakeDashboard: DashboardData = {
    ...fakeDoctorDashboard as DashboardData,
    queue_length: activeFakeQueue.length,
    urgency_breakdown: fakeUrgencyBreakdown,
    today_appointments: (fakeDoctorDashboard as DashboardData).today_appointments.map((appointment) => {
      const queue = activeFakeQueue.find((entry) => entry.patient_id === appointment.patient_id);
      return {
        ...appointment,
        date: appointment.date ?? new Date().toISOString().slice(0, 10),
        queue_position: queue ? String(queue.position) : null,
        queue_status: queue?.status ?? null,
      };
    }),
  };
  const displayData = testMode ? fakeDashboard : data;

  const load = useCallback(async () => {
    try {
      const res = await api.get<DashboardData>('/api/doctor-dashboard/dashboard');
      setData(res.data as unknown as DashboardData);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (testMode) {
      setLoading(false);
      return;
    }
    void load();
  }, [load, testMode]));

  if (loading) return <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />;

  return (
    <Screen padded={false}>
    <ScrollView contentContainerStyle={styles.content}>
      <FadeSlide>
        <View style={styles.greetingRow}>
          <Text style={[styles.greeting, { color: theme.ink }]}>Welcome, Dr. {user?.name ?? ''}</Text>
          {testMode && <StatusBadge label="Fake test data" tone="warning" />}
        </View>
      </FadeSlide>
      {displayData && (
        <>
          <FadeSlide delay={80}>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: theme.primarySoft }]}><Ionicons name="calendar" size={16} color={theme.primary} /></View>
              <Text style={[styles.statNum, { color: theme.primary }]}>{displayData.total_today}</Text>
              <Text style={[styles.statLabel, { color: theme.inkMuted }]}>Upcoming Appointments</Text>
            </Card>
            <Card style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: theme.warningSoft }]}><Ionicons name="people" size={16} color={theme.warning} /></View>
              <Text style={[styles.statNum, { color: theme.primary }]}>{displayData.queue_length}</Text>
              <Text style={[styles.statLabel, { color: theme.inkMuted }]}>In Queue</Text>
            </Card>
          </View>
          </FadeSlide>

          <FadeSlide delay={160}>
          <Card style={styles.urgencyRow}>
            <Text style={[styles.sectionTitle, { color: theme.ink }]}>AI urgency guidance</Text>
            <Text style={[styles.emptyText, { textAlign: 'left', marginTop: 0, marginBottom: spacing.sm }]}>
              Queue order follows pre-consultation severity: red first, then orange, yellow, and routine green visits.
            </Text>
            <View style={styles.urgencyBar}>
              {(['red', 'orange', 'yellow', 'green'] as const).map((level) => (
                <View key={level} style={styles.urgencyItem}>
                  <View style={[styles.urgencyDot, { backgroundColor: level === 'red' ? '#DC2626' : level === 'orange' ? '#F97316' : level === 'yellow' ? '#EAB308' : '#22C55E' }]} />
                  <Text style={[styles.urgencyText, { color: severityColor(level) }]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}: {displayData.urgency_breakdown[level]}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
          </FadeSlide>

          <FadeSlide delay={220}>
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>Upcoming Appointments</Text>
          </FadeSlide>
          {displayData.today_appointments.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.inkSubtle }]}>No appointments scheduled for today.</Text>
          ) : (
            displayData.today_appointments.map((appt, index) => (
              <Stagger key={appt.appointment_id} index={index}>
              <Pressable
                style={({ pressed }) => [styles.apptCard, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && styles.pressed]}
                onPress={() => router.push(`/doctor/consultation/${appt.appointment_id}`)}
              >
                <View style={styles.apptHeader}>
                  <Text style={[styles.apptPatient, { color: theme.ink }]}>{appt.patient_name}</Text>
                  <StatusBadge label={appt.urgency} tone={appt.urgency === 'red' ? 'danger' : appt.urgency === 'orange' || appt.urgency === 'yellow' ? 'warning' : 'success'} />
                </View>
                <Text style={[styles.apptTime, { color: theme.inkMuted }]}>Time: {appt.time}</Text>
                <Text style={[styles.apptDate, { color: theme.inkMuted }]}>Date: {new Date(`${appt.date}T00:00:00`).toLocaleDateString()}</Text>
                <Text style={[styles.apptStatus, { color: theme.inkMuted }]}>Status: {appt.status.replace(/_/g, ' ')}</Text>
                {appt.chief_complaint ? <Text style={[styles.apptStatus, { color: theme.inkMuted }]}>Complaint: {appt.chief_complaint}</Text> : null}
                {appt.urgency_guidance?.action ? <Text style={[styles.apptQueue, { color: theme.primary }]}>{appt.urgency_guidance.action}</Text> : null}
                {appt.preconsult_status ? <Text style={[styles.apptQueue, { color: theme.primary }]}>Pre-consult: {appt.preconsult_status.replace(/_/g, ' ')}</Text> : null}
                {appt.queue_position && (
                  <Text style={[styles.apptQueue, { color: theme.primary }]}>Queue: {appt.queue_position} ({appt.queue_status})</Text>
                )}
              </Pressable>
              </Stagger>
            ))
          )}

          <FadeSlide delay={280}>
            <Button title="Manage queue" icon="list-outline" size="lg" style={styles.manageQueueBtn} onPress={() => router.push('/(tabs-doctor)/queue')} />
          </FadeSlide>
        </>
      )}
      {!displayData && (
        <Card style={styles.emptyCard}>
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>Dashboard is waiting for live data</Text>
          <Text style={[styles.emptyText, { color: theme.inkSubtle }]}>Enable Test Mode in Settings to preview appointments, queue, patients, and reports.</Text>
          <Button title="Open Settings" variant="secondary" onPress={() => router.push('/settings')} />
        </Card>
      )}
    </ScrollView>
    </Screen>
  );
}

function severityColor(level: string): string {
  return {
    red: '#DC2626',
    orange: '#F97316',
    yellow: '#CA8A04',
    green: '#16A34A',
  }[level] ?? colors.inkMuted;
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  greeting: { ...typography.title, color: colors.ink },
  greetingRow: { marginBottom: spacing.xl, gap: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statCard: { flex: 1, padding: spacing.lg, alignItems: 'flex-start' },
  statIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statNum: { fontSize: 32, fontWeight: '800', color: colors.primary },
  statLabel: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.xs, textAlign: 'center' },
  urgencyRow: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.md },
  urgencyBar: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  urgencyItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  urgencyDot: { width: 10, height: 10, borderRadius: 5 },
  urgencyText: { ...typography.caption, color: colors.inkMuted },
  apptCard: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  apptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  apptPatient: { ...typography.heading, color: colors.ink },
  apptTime: { ...typography.body, color: colors.inkMuted },
  apptDate: { ...typography.body, color: colors.inkMuted },
  apptStatus: { ...typography.body, color: colors.inkMuted },
  apptQueue: { ...typography.caption, color: colors.primary, fontWeight: '600', marginTop: spacing.xs },
  emptyText: { ...typography.body, color: colors.inkSubtle, textAlign: 'center', marginTop: spacing.xl },
  manageQueueBtn: { marginTop: spacing.md },
  emptyCard: { marginTop: spacing.md, gap: spacing.md },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
});
