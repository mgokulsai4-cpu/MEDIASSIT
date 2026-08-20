import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { FadeSlide, Stagger } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { StatusBadge } from '../../src/ui/StatusBadge';
import { colors, layout, spacing, typography } from '../../src/ui/theme';

interface QueueEntry {
  queue_id: string;
  queue_token?: string;
  appointment_id?: string;
  patient_id: string;
  patient?: { name: string; age?: number };
  appointment_time?: string;
  position: number;
  priority_score: number;
  urgency: string;
  status: string;
  waiting_time: number;
  is_fake?: boolean;
  priority_guidance?: { label: string; action: string };
}

export default function DoctorQueueScreen() {
  const router = useRouter();
  const { testMode, fakeQueue, updateFakeQueueStatus } = useSettings();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    if (!doctorId) return;
    try {
      const res = await api.get<{ data: QueueEntry[] }>(`/api/queue/doctor/${doctorId}`);
      setEntries(((res.data as { data?: QueueEntry[] })?.data) ?? []);
    } catch {
      setEntries([]);
    }
  }, [doctorId]);

  useEffect(() => {
    async function getDoctor() {
      try {
        const me = await api.get<{ doctor?: { doctor_id?: string } }>('/api/doctors/me');
        const docId = (me.data as { doctor?: { doctor_id?: string } })?.doctor?.doctor_id;
        if (docId) setDoctorId(docId);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    getDoctor();
  }, []);

  useEffect(() => {
    if (doctorId) {
      loadQueue();
      const interval = setInterval(loadQueue, 10000);
      return () => clearInterval(interval);
    }
  }, [doctorId, loadQueue]);

  useFocusEffect(useCallback(() => {
    if (doctorId) void loadQueue();
  }, [doctorId, loadQueue]));

  const handleCallNext = async () => {
    const visibleEntries = testMode ? fakeQueue as QueueEntry[] : entries;
    const next = visibleEntries.find((e) => e.status === 'waiting');
    if (!next) {
      Alert.alert('No Patients', 'No patients are waiting in the queue.');
      return;
    }
    if (next.is_fake) {
      updateFakeQueueStatus(next.queue_id, 'called');
      return;
    }
    try {
      await api.patch(`/api/queue/${next.queue_id}`, { status: 'called' });
      loadQueue();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  const handleComplete = async (queueId: string) => {
    if (queueId.startsWith('FAKE-')) {
      updateFakeQueueStatus(queueId, 'completed');
      return;
    }
    try {
      await api.patch(`/api/queue/${queueId}`, { status: 'completed' });
      loadQueue();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  const handleWritePrescription = (entry: QueueEntry) => {
    if (entry.is_fake || !entry.appointment_id) {
      Alert.alert('Demo only', 'Prescriptions need a real completed appointment.');
      return;
    }
    router.push(`/prescriptions/new?appointmentId=${entry.appointment_id}&patientId=${entry.patient_id}`);
  };

  const handleStartConsultation = async (entry: QueueEntry) => {
    if (entry.queue_id.startsWith('FAKE-')) {
      updateFakeQueueStatus(entry.queue_id, 'in_consultation');
      router.push(`/doctor/consultation/${entry.appointment_id || 'FAKE-APPT-101'}`);
      return;
    }
    try {
      await api.patch(`/api/queue/${entry.queue_id}`, { status: 'in_consultation' });
      await loadQueue();
      if (entry.appointment_id) router.push(`/doctor/consultation/${entry.appointment_id}`);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;

  const visibleEntries = testMode ? fakeQueue as QueueEntry[] : entries;
  const waiting = visibleEntries.filter((e) => e.status === 'waiting');
  const active = visibleEntries.filter((e) => e.status === 'called' || e.status === 'in_consultation');

  return (
    <Screen padded={false}>
    <ScrollView contentContainerStyle={styles.content}>
      <FadeSlide>
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <Text style={styles.title}>Queue ({visibleEntries.length})</Text>
            {testMode && <StatusBadge label="Fake test data" tone="warning" />}
          </View>
        </View>
      </FadeSlide>
      {waiting.length > 0 && (
        <FadeSlide delay={80}>
          <Button title="Call next patient" icon="megaphone-outline" variant="success" size="lg" style={styles.callNextBtn} onPress={handleCallNext} />
        </FadeSlide>
      )}

      {active.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active</Text>
          {active.map((entry, index) => (
            <Stagger key={entry.queue_id} index={index} style={styles.card}>
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.patientName}>{entry.patient?.name ?? entry.patient_id}</Text>
                <StatusBadge label={entry.status === 'called' ? 'Called' : 'In Consultation'} tone="warning" />
              </View>
              <Text style={styles.detail}>Token: {entry.queue_token || entry.queue_id}</Text>
              <Text style={styles.detail}>Position: #{entry.position}</Text>
              <Text style={[styles.detail, { color: severityColor(entry.urgency) }]}>Urgency: {entry.urgency.toUpperCase()}</Text>
              {entry.priority_guidance?.action ? <Text style={styles.detail}>{entry.priority_guidance.action}</Text> : null}
              {entry.appointment_time && <Text style={styles.detail}>Appointment: {entry.appointment_time}</Text>}
              <View style={styles.actionRow}>
                {entry.status === 'called' && (
                  <Button title="Start consult" icon="play-outline" style={styles.actionBtn} onPress={() => handleStartConsultation(entry)} />
                )}
                {entry.status === 'in_consultation' && (
                  <Button title="Write Rx" icon="create-outline" variant="secondary" style={styles.actionBtn} onPress={() => handleWritePrescription(entry)} />
                )}
                <Button title="Complete" icon="checkmark-outline" variant="secondary" style={styles.completeBtn} onPress={() => handleComplete(entry.queue_id)} />
              </View>
            </Card>
            </Stagger>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Waiting ({waiting.length})</Text>
        {waiting.length === 0 ? (
          <Text style={styles.emptyText}>No patients waiting.</Text>
        ) : (
          waiting.map((entry, i) => (
            <Stagger key={entry.queue_id} index={i} style={styles.card}>
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.patientName}>{entry.patient?.name ?? entry.patient_id}</Text>
                <Text style={[styles.urgencyText, { color: severityColor(entry.urgency) }]}>{entry.urgency.toUpperCase()}</Text>
              </View>
              <Text style={styles.detail}>Token: {entry.queue_token || entry.queue_id}</Text>
              <Text style={styles.detail}>Position: #{entry.position}</Text>
              <Text style={styles.detail}>Est. wait: ~{entry.waiting_time} min</Text>
              {entry.priority_guidance?.action ? <Text style={styles.detail}>{entry.priority_guidance.action}</Text> : null}
              {entry.appointment_time && <Text style={styles.detail}>Appointment: {entry.appointment_time}</Text>}
            </Card>
            </Stagger>
          ))
        )}
      </View>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  title: { ...typography.title, color: colors.ink },
  titleGroup: { gap: spacing.xs },
  callNextBtn: { width: '100%', marginBottom: spacing.xl },
  section: { marginBottom: spacing.xxl },
  sectionTitle: { ...typography.heading, color: colors.inkMuted, marginBottom: spacing.md },
  card: { marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  patientName: { ...typography.heading, color: colors.ink },
  detail: { ...typography.body, color: colors.inkMuted, marginBottom: 2 },
  urgencyText: { ...typography.caption, fontWeight: '800', letterSpacing: 0.4 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1 },
  completeBtn: { flex: 1 },
  emptyText: { ...typography.body, color: colors.inkSubtle, textAlign: 'center', marginTop: spacing.sm },
});
