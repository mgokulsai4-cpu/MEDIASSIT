import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/api/client';
import { useAuth } from '../src/contexts/AuthContext';
import { useSettings } from '../src/contexts/SettingsContext';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Screen } from '../src/ui/Screen';
import { TextField } from '../src/ui/TextField';
import { colors, radii, spacing, typography } from '../src/ui/theme';

const GENDERS = ['male', 'female', 'other'] as const;
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export default function PatientOnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useSettings();
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get<{ patient: { age?: number; gender?: string; blood_group?: string; allergies?: string[]; medical_history?: string } }>('/api/patients/me');
        const patient = res.data?.patient;
        if (patient?.age !== undefined) setAge(String(patient.age));
        if (patient?.gender) setGender(patient.gender);
        if (patient?.blood_group) setBloodGroup(patient.blood_group);
        if (patient?.allergies) setAllergies(patient.allergies.join(', '));
        if (patient?.medical_history) setMedicalHistory(patient.medical_history);
        if (patient?.age !== undefined && patient.gender) router.replace('/(tabs)');
      } catch {
        setError('We could not load your profile. You can still complete it now.');
      } finally {
        setLoading(false);
      }
    }
    void loadProfile();
  }, [router]);

  const saveProfile = async () => {
    if (!age.trim() || !gender) {
      setError('Age and gender are required to continue.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.patch('/api/patients/me', {
        age: Number(age),
        gender,
        blood_group: bloodGroup,
        allergies: allergies.split(',').map((item) => item.trim()).filter(Boolean),
        medical_history: medicalHistory.trim(),
      });
      router.replace('/(tabs)');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 80 }} />;

  return (
    <Screen padded={false} style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.icon, { backgroundColor: theme.primary }]}><Text style={[styles.iconText, { color: theme.onPrimary }]}>+</Text></View>
        <Text style={[styles.title, { color: theme.ink }]}>Tell us about you</Text>
        <Text style={[styles.subtitle, { color: theme.inkMuted }]}>These details help doctors prepare for your visit. You can update them later in your profile.</Text>

        <Card style={styles.card}>
          <TextField label="Age" placeholder="Your age" value={age} onChangeText={setAge} keyboardType="number-pad" containerStyle={styles.field} />
          <Text style={[styles.label, { color: theme.inkMuted }]}>Gender</Text>
          <View style={styles.choiceRow}>
            {GENDERS.map((option) => (
              <Pressable key={option} onPress={() => setGender(option)} style={({ pressed }) => [styles.choice, { backgroundColor: gender === option ? theme.primary : theme.surfaceMuted, borderColor: gender === option ? theme.primary : theme.border }, pressed && styles.pressed]}>
                <Text style={{ color: gender === option ? theme.onPrimary : theme.ink, fontWeight: '600' }}>{option.charAt(0).toUpperCase() + option.slice(1)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.inkMuted }]}>Blood group (optional)</Text>
          <View style={styles.choiceRow}>
            {BLOOD_GROUPS.map((option) => (
              <Pressable key={option} onPress={() => setBloodGroup(option)} style={({ pressed }) => [styles.smallChoice, { backgroundColor: bloodGroup === option ? theme.primary : theme.surfaceMuted, borderColor: bloodGroup === option ? theme.primary : theme.border }, pressed && styles.pressed]}>
                <Text style={{ color: bloodGroup === option ? theme.onPrimary : theme.ink, fontWeight: '600' }}>{option}</Text>
              </Pressable>
            ))}
          </View>

          <TextField label="Allergies (optional)" placeholder="Separate multiple allergies with commas" value={allergies} onChangeText={setAllergies} containerStyle={styles.field} />
          <TextField label="Medical history (optional)" placeholder="Anything your doctor should know" value={medicalHistory} onChangeText={setMedicalHistory} multiline containerStyle={styles.field} />
        </Card>

        {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
        <Button title={saving ? 'Saving...' : `Continue${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`} icon="arrow-forward-outline" size="lg" onPress={saveProfile} loading={saving} disabled={saving} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: 40 },
  icon: { width: 52, height: 52, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  iconText: { fontSize: 28, fontWeight: '800' },
  title: { ...typography.display },
  subtitle: { ...typography.body, marginTop: spacing.sm, marginBottom: spacing.xxl },
  card: { gap: spacing.md, marginBottom: spacing.lg },
  field: { marginBottom: spacing.sm },
  label: { ...typography.label, marginTop: spacing.sm },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minHeight: 44, minWidth: 92, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  smallChoice: { minHeight: 42, minWidth: 48, paddingHorizontal: spacing.sm, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  error: { ...typography.body, marginBottom: spacing.md },
  pressed: { opacity: 0.64, transform: [{ scale: 0.96 }] },
});
