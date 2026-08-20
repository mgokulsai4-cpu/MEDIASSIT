import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import type { Appointment } from '../../src/types';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { ButtonStack } from '../../src/ui/ButtonStack';
import { Card } from '../../src/ui/Card';
import { FadeSlide, Stagger } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { StatusBadge } from '../../src/ui/StatusBadge';
import { colors, layout, radii, spacing, typography } from '../../src/ui/theme';

const STATUS_TONES = { pending: 'warning', scheduled: 'primary', confirmed: 'success', in_queue: 'primary', in_consultation: 'warning', cancelled: 'danger', completed: 'neutral', no_show: 'danger' } as const;

function urgencyColor(level?: string): string {
  return ({ red: '#DC2626', orange: '#F97316', yellow: '#CA8A04', green: '#16A34A' } as Record<string, string>)[level ?? ''] ?? colors.inkMuted;
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const { testMode, theme, fakeAppointments, removeFakeAppointment } = useSettings();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const visibleAppointments = testMode
    ? [...fakeAppointments, ...appointments.filter((appointment) => !appointment.is_fake)]
    : appointments.filter((appointment) => !appointment.is_fake);

  const loadAppointments = useCallback(async () => {
    try {
      const res = await api.get<Appointment[]>('/api/appointments?limit=20');
      const rows = Array.isArray(res.data) ? res.data : [];
      setAppointments(rows.map((appointment) => {
        const withDoctor = appointment as Appointment & { doctor?: { name?: string } | null };
        return { ...appointment, doctor_name: appointment.doctor_name ?? withDoctor.doctor?.name };
      }));
    } catch {
      // Offline — use cached/empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadAppointments();
  }, [loadAppointments]));

  const handleCancel = async (appt: Appointment) => {
    if (appt.is_fake) {
      removeFakeAppointment(appt.appointment_id);
      Alert.alert('Fake appointment removed', 'Test appointment was removed locally.');
      return;
    }
    Alert.alert('Cancel Appointment', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/api/appointments/${appt.appointment_id}`, { status: 'cancelled' });
            setAppointments((prev) =>
              prev.map((a) => (a.appointment_id === appt.appointment_id ? { ...a, status: 'cancelled' } : a)),
            );
            await loadAppointments();
            Alert.alert('Appointment cancelled', 'Your appointment was cancelled.');
          } catch (e) {
            Alert.alert('Error', (e as Error).message);
          }
        },
      },
    ]);
  };

  const handleJoinQueue = async (appt: Appointment) => {
    if (appt.is_fake) {
      router.push('/queue/FAKE-QUEUE-001');
      return;
    }
    try {
      const res = await api.post<{ queue_id: string }>('/api/queue/join', { appointment_id: appt.appointment_id });
      const queueId = ((res.data as { queue_id?: string })?.queue_id);
      if (queueId) {
        router.push(`/queue/${queueId}`);
      }
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />;
  }

  return (
    <Screen padded={false}>
    <FlatList
      data={visibleAppointments}
      keyExtractor={(item) => item.appointment_id}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadAppointments(); }} tintColor={theme.primary} />}
      renderItem={({ item: appt, index }) => {
        const date = new Date(appt.date);
        return (
        <Stagger index={index} style={styles.card}>
        <Card>
          <View style={styles.cardTop}>
            <View style={[styles.dateChip, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.dateChipDay, { color: theme.primaryDark }]}>{date.getDate()}</Text>
              <Text style={[styles.dateChipMonth, { color: theme.primaryDark }]}>{date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text>
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={[styles.doctorName, { color: theme.ink }]} numberOfLines={1}>{appt.doctor_name ?? 'Doctor'}</Text>
              <Text style={[styles.time, { color: theme.primary }]}>{date.toLocaleDateString('en-US', { weekday: 'short' })} · {appt.time}</Text>
            </View>
            <StatusBadge label={appt.status.replace(/_/g, ' ')} tone={STATUS_TONES[appt.status as keyof typeof STATUS_TONES] || 'neutral'} />
          </View>
          {appt.is_fake ? <View style={styles.fakeBadge}><StatusBadge label="Fake test data" tone="warning" /></View> : null}
          {appt.hospital ? (
            <View style={styles.metaRow}>
              <Ionicons name="business-outline" size={13} color={theme.inkMuted} />
              <Text style={[styles.hospital, { color: theme.inkMuted }]}>{appt.hospital}</Text>
            </View>
          ) : null}
          {appt.reason ? <Text style={[styles.reason, { color: theme.inkMuted }]}>Reason: {appt.reason}</Text> : null}
          {appt.urgency ? (
            <Text style={[styles.urgency, { color: urgencyColor(appt.urgency) }]}>
              Urgency: {appt.urgency.toUpperCase()}
            </Text>
          ) : null}
          {(['scheduled', 'confirmed', 'in_queue'] as Appointment['status'][]).includes(appt.status) && (
            <ButtonStack>
              <Button title={appt.status === 'in_queue' ? 'View queue' : 'Join queue'} icon={appt.status === 'in_queue' ? 'time-outline' : 'log-in-outline'} onPress={() => handleJoinQueue(appt)} />
              <Button title="Pre-consultation" icon="clipboard-outline" variant="secondary" onPress={() => router.push(`/preconsult/${appt.appointment_id}`)} />
              <Button title="Cancel visit" icon="close-outline" variant="ghost" onPress={() => handleCancel(appt)} />
            </ButtonStack>
          )}
        </Card>
        </Stagger>
        );
      }}
      ListEmptyComponent={
        <FadeSlide>
          <View style={styles.emptyView}>
            <Ionicons name="calendar-clear-outline" size={40} color={theme.inkSubtle} />
            <Text style={[styles.emptyText, { color: theme.inkSubtle }]}>No appointments yet.</Text>
            <Button title="Find a doctor" icon="medical-outline" variant="secondary" onPress={() => router.push('/(tabs)/doctors')} />
          </View>
        </FadeSlide>
      }
    />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: layout.horizontalPadding, paddingBottom: 40 },
  card: { marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  dateChip: { width: 48, height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  dateChipDay: { fontSize: 18, fontWeight: '800' },
  dateChipMonth: { ...typography.caption, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cardHeaderInfo: { flex: 1, marginHorizontal: spacing.md },
  doctorName: { ...typography.heading },
  time: { ...typography.caption, marginTop: 2, fontWeight: '600' },
  fakeBadge: { marginBottom: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  hospital: { ...typography.caption },
  reason: { ...typography.body, marginTop: spacing.xs },
  urgency: { ...typography.caption, fontWeight: '700', marginTop: spacing.sm },
  emptyView: { alignItems: 'center', marginTop: 60, gap: spacing.md },
  emptyText: { ...typography.body },
});
