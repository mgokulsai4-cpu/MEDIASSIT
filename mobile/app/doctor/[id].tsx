import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/client';
import { fakeDoctors } from '../../src/data/testData';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Card } from '../../src/ui/Card';
import { FadeSlide, ScaleIn } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { StatusBadge } from '../../src/ui/StatusBadge';
import { colors, layout, radii, spacing, typography } from '../../src/ui/theme';

interface DoctorDetails {
  doctor_id: string;
  name: string;
  specialization?: string;
  department?: string;
  hospital?: string;
  qualification?: string;
  experience?: number;
  consultation_fee?: number;
  room_number?: string;
  rating?: number;
  status?: string;
}

function nextBookableDate() {
  const date = new Date();
  do {
    date.setDate(date.getDate() + 1);
  } while (date.getDay() === 0);
  return date.toISOString().slice(0, 10);
}

export default function DoctorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { testMode, theme } = useSettings();
  const [doctor, setDoctor] = useState<DoctorDetails | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [availabilityDate, setAvailabilityDate] = useState(nextBookableDate());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDoctor() {
      try {
        if (testMode && id.startsWith('FAKE-')) {
          const fake = fakeDoctors.find((item) => item.doctor_id === id);
          if (fake) {
            setDoctor({
              doctor_id: fake.doctor_id,
              name: fake.user.name,
              specialization: fake.specialty,
              department: fake.department,
              hospital: fake.hospital,
              experience: fake.experience_years,
              rating: fake.avg_rating,
              status: 'available',
              qualification: 'MBBS, MD',
              consultation_fee: 500,
              room_number: 'Demo Room 2',
            });
            setSlots(['10:00 AM', '11:00 AM', '02:00 PM', '04:30 PM']);
          }
          return;
        }
        const res = await api.get<DoctorDetails>(`/api/doctors/${id}`);
        setDoctor(res.data as unknown as DoctorDetails);
        const date = nextBookableDate();
        setAvailabilityDate(date);
        const availability = await api.get<{ slots?: string[] }>(`/api/doctors/${id}/availability?date=${date}`);
        setSlots(((availability.data as unknown as { slots?: string[] })?.slots) ?? []);
      } catch {
        setDoctor(null);
      } finally {
        setLoading(false);
      }
    }
    void loadDoctor();
  }, [id, testMode]);

  if (loading) return <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 80 }} />;
  if (!doctor) return <Screen><Text style={[styles.error, { color: theme.inkMuted }]}>Doctor profile not found.</Text></Screen>;

  return (
    <Screen padded={false} style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScaleIn>
        <Card style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>{doctor.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={[styles.name, { color: theme.ink }]}>{doctor.name}</Text>
          <Text style={[styles.specialization, { color: theme.primary }]}>{doctor.specialization || 'Doctor'}</Text>
          {doctor.department ? <Text style={[styles.muted, { color: theme.inkMuted }]}>{doctor.department}</Text> : null}
          {id.startsWith('FAKE-') && <StatusBadge label="Fake test data" tone="warning" />}
        </Card>
        </ScaleIn>

        <FadeSlide delay={100}>
        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>Professional information</Text>
          <InfoRow label="Hospital / clinic" value={doctor.hospital || 'Not provided'} />
          <InfoRow label="Qualification" value={doctor.qualification || 'Not provided'} />
          <InfoRow label="Experience" value={doctor.experience !== undefined ? `${doctor.experience} years` : 'Not provided'} />
          <InfoRow label="Consultation fee" value={doctor.consultation_fee ? `₹${doctor.consultation_fee}` : 'Not provided'} />
          <InfoRow label="Room" value={doctor.room_number || 'Not provided'} />
          <InfoRow label="Rating" value={doctor.rating ? `${doctor.rating.toFixed(1)} / 5` : 'Not rated yet'} />
        </Card>
        </FadeSlide>

        <FadeSlide delay={180}>
        <Card style={styles.infoCard}>
           <Text style={[styles.sectionTitle, { color: theme.ink }]}>Available times on {new Date(`${availabilityDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          {slots.length === 0 ? <Text style={[styles.muted, { color: theme.inkMuted }]}>No remaining times today.</Text> : (
            <View style={styles.slotRow}>
              {slots.map((slot) => <StatusBadge key={slot} label={slot} tone="primary" />)}
            </View>
          )}
        </Card>
        </FadeSlide>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { theme } = useSettings();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.label, { color: theme.inkMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40, gap: spacing.md },
  hero: { alignItems: 'center', padding: spacing.xxl, gap: spacing.xs },
  avatar: { width: 76, height: 76, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarText: { fontSize: 24, fontWeight: '800' },
  name: { ...typography.title, textAlign: 'center' },
  specialization: { ...typography.body, fontWeight: '700' },
  muted: { ...typography.body },
  infoCard: { gap: spacing.sm },
  sectionTitle: { ...typography.heading, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { ...typography.caption, flex: 1 },
  value: { ...typography.body, flex: 1, textAlign: 'right' },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { ...typography.body, textAlign: 'center', marginTop: 80 },
});
