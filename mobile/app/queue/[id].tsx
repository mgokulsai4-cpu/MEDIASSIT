import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/client';
import { subscribeQueue } from '../../src/api/socket';
import type { QueueEntry } from '../../src/types';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { FadeSlide, Pulse, ScaleIn } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { SpeakButton } from '../../src/ui/SpeakButton';
import { speak } from '../../src/services/voice';
import { useSettings } from '../../src/contexts/SettingsContext';
import { radii, spacing, typography } from '../../src/ui/theme';

export default function QueueScreen() {
  const { theme, readAloud } = useSettings();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isFake = id.startsWith('FAKE-');
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadEntry() {
    if (isFake) {
      setEntry({ queue_id: id, queue_token: 'Q-FAKE', patient_id: 'FAKE-PATIENT', doctor_id: 'FAKE-DOC-001', position: 3, status: 'waiting', estimated_wait_minutes: 30, urgency: 'yellow', priority_guidance: { level: 'yellow', label: 'Soon', action: 'Keep ahead of routine visits. Moderate severity from the AI interview.' } });
      return;
    }
    try {
      const res = await api.get<QueueEntry>(`/api/queue/${id}`);
      setEntry((res.data as unknown as QueueEntry) ?? null);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadEntry().finally(() => setLoading(false));
    if (isFake) return;

    const unsubscribe = subscribeQueue(id, (update) => {
      setLive(true);
      setEntry((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          position: update.position ?? prev.position,
          waiting_time: update.waiting_time ?? prev.waiting_time,
          estimated_wait_minutes: update.eta_minutes ?? update.waiting_time ?? prev.estimated_wait_minutes,
          status: (update.status as QueueEntry['status']) ?? prev.status,
        };
      });
    });

    timerRef.current = setInterval(loadEntry, 20000);
    return () => {
      unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id, isFake]);

  const handleCancel = async () => {
    Alert.alert('Leave Queue', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!isFake) await api.patch(`/api/queue/${id}/cancel`);
            await loadEntry();
            setEntry((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
            Alert.alert('Queue left', 'You have left this queue.');
          } catch (e) {
            Alert.alert('Error', (e as Error).message);
          }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />;
  if (!entry) return <Screen><Text style={[styles.error, { color: theme.inkSubtle }]}>Queue entry not found.</Text></Screen>;

  const isActive = entry.status !== 'cancelled' && entry.status !== 'completed';
  const isDone = entry.status === 'cancelled' || entry.status === 'completed';
  const statusText =
    entry.status === 'waiting' ? 'In Queue'
    : entry.status === 'called' ? 'Doctor Calling!'
    : entry.status === 'in_consultation' ? 'In Consultation'
    : entry.status === 'completed' ? 'Completed'
    : 'Cancelled';
  // Auto-read queue status for accessibility
  const queueSpeakText = entry ? (
    'Queue position ' + (entry.position ?? 'unknown') + '. Status: ' + statusText + '.' +
    (entry.estimated_wait_minutes ? ' Estimated wait ' + entry.estimated_wait_minutes + ' minutes.' : '') +
    (entry.priority_guidance?.action ? ' Priority: ' + entry.priority_guidance.label + '. ' + entry.priority_guidance.action : '')
  ) : '';

  useEffect(() => {
    if (entry && readAloud && queueSpeakText) {
      speak(queueSpeakText);
    }
  }, [entry?.status, entry?.position, readAloud]);

  const ringColor =
    entry.status === 'called' ? theme.success
    : entry.status === 'in_consultation' ? theme.warning
    : isDone ? theme.inkSubtle
    : theme.primary;

  return (
    <Screen style={styles.container}>
      <ScaleIn style={{ width: '100%' }}>
      <Card style={styles.card}>
        <Pulse active={isActive} amount={entry.status === 'called' ? 1.07 : 1.04}>
          <View style={[styles.positionCircle, { borderColor: ringColor, backgroundColor: theme.surface }]}>
            <Text style={[styles.positionNum, { color: ringColor }]}>{entry.position ?? '-'}</Text>
            <Text style={[styles.positionLabel, { color: theme.inkMuted }]}>
              {entry.status === 'called' ? 'NOW' : 'POSITION'}
            </Text>
          </View>
        </Pulse>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[styles.status, { color: theme.ink }]}>{statusText}</Text>
        <SpeakButton text={queueSpeakText} />
      </View>
        <Text style={[styles.token, { color: theme.primary }]}>Token {entry.queue_token || entry.queue_id}</Text>
        {isActive && (
          <View style={[styles.waitPill, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="time-outline" size={14} color={theme.primaryDark} />
            <Text style={[styles.waitText, { color: theme.primaryDark }]}>~{entry.estimated_wait_minutes ?? entry.waiting_time ?? 0} min wait</Text>
          </View>
        )}
        {(entry.appointment_time || entry.appointment?.time) && (
          <View style={[styles.waitPill, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="calendar-outline" size={14} color={theme.primaryDark} />
            <Text style={[styles.appointmentText, { color: theme.primaryDark }]}>Appointment {entry.appointment_time ?? entry.appointment?.time}</Text>
          </View>
        )}
        {entry.priority_guidance?.action ? (
          <Text style={[styles.hint, { color: theme.inkMuted }]}>
            Priority: {entry.priority_guidance.label}. {entry.priority_guidance.action}
          </Text>
        ) : null}
        {entry.status === 'waiting' && (
          <Text style={[styles.hint, { color: theme.inkSubtle }]}>
            {live
              ? 'Live position updates enabled. You will also be notified when the doctor calls you.'
              : 'You will be notified when the doctor calls you. Position and wait time update live.'}
          </Text>
        )}
      </Card>
      </ScaleIn>

      {isActive && (
        <FadeSlide delay={180} style={{ width: '100%' }}>
          <Button title="Leave queue" icon="exit-outline" variant="danger" size="lg" style={styles.cancelBtn} onPress={handleCancel} />
        </FadeSlide>
      )}

      {isDone && (
        <Text style={[styles.doneText, { color: theme.inkMuted }]}>
          {entry.status === 'cancelled' ? 'You have left the queue.' : 'Your consultation is complete.'}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xl },
  card: { width: '100%', padding: spacing.xxxl, alignItems: 'center', marginBottom: spacing.xl },
  positionCircle: { width: 116, height: 116, borderRadius: 58, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  positionNum: { fontSize: 40, fontWeight: '800' },
  positionLabel: { ...typography.caption, letterSpacing: 1 },
  status: { ...typography.heading, marginBottom: spacing.sm },
  token: { ...typography.body, fontWeight: '700', marginBottom: spacing.sm },
  waitPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.xs },
  waitText: { ...typography.label },
  appointmentText: { ...typography.label },
  hint: { ...typography.caption, marginTop: spacing.lg, textAlign: 'center' },
  cancelBtn: { width: '100%' },
  doneText: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
  error: { textAlign: 'center', marginTop: 60, fontSize: 16 },
});
