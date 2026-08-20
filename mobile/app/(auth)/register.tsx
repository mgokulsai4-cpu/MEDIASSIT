import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Pressable } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/api/client';
import type { User } from '../../src/types';
import { Button } from '../../src/ui/Button';
import { FadeSlide, ScaleIn } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { TextField } from '../../src/ui/TextField';
import { PasswordField } from '../../src/ui/PasswordField';
import { useSettings } from '../../src/contexts/SettingsContext';
import { radii, spacing, typography } from '../../src/ui/theme';

export default function RegisterScreen() {
  const { registerUser } = useAuth();
  const { role: routeRole } = useLocalSearchParams<{ role?: string }>();
  const initialRole = routeRole === 'doctor' ? 'doctor' : 'patient';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>(initialRole);
  const [loading, setLoading] = useState(false);
  const { theme } = useSettings();

  useEffect(() => {
    if (routeRole === 'doctor' || routeRole === 'patient') setRole(routeRole);
  }, [routeRole]);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill required fields');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: User }>('/api/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      const resAny = res as unknown as Record<string, unknown>;
      const finalToken = ((resAny.data as Record<string, unknown>)?.token ?? resAny.token) as string;
      const finalUser = ((resAny.data as Record<string, unknown>)?.user as User) ?? (resAny.user as User);
      if (finalToken && finalUser) {
        await registerUser(finalToken, finalUser);
      }
    } catch (e) {
      const message = (e as Error).message;
      const normalized = message.toLowerCase();
      if (normalized.includes('email already exists')) {
        Alert.alert('Email already exists', 'Use a different email address or log in.');
      } else if (normalized.includes('same username')) {
        Alert.alert('Username already exists', 'Choose a different username.');
      } else if (normalized.includes('phone number already exists')) {
        Alert.alert('Phone number already exists', 'Use a different phone number.');
      } else {
        Alert.alert('Registration Failed', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded={false} style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <ScaleIn>
          <View style={[styles.logo, { backgroundColor: theme.primary }]}><Text style={[styles.logoText, { color: theme.onPrimary }]}>M+</Text></View>
        </ScaleIn>
        <FadeSlide delay={80}>
          <Text style={[styles.title, { color: theme.ink }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: theme.inkMuted }]}>Join MedAssist+ today</Text>
        </FadeSlide>
      </View>

      <FadeSlide delay={140}>
      <TextField label="Username" placeholder="Username" value={name} onChangeText={setName} containerStyle={styles.field} />
      <TextField label="Email" placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" containerStyle={styles.field} />
      <PasswordField label="Password" placeholder="Password (min 6 chars)" value={password} onChangeText={setPassword} containerStyle={styles.field} />
      <Text style={[styles.accountLabel, { color: theme.inkMuted }]}>Create account as</Text>
      <View style={styles.roleRow}>
        {(['patient', 'doctor'] as const).map((option) => (
          <Pressable key={option} onPress={() => setRole(option)} style={({ pressed }) => [styles.roleOption, { backgroundColor: role === option ? theme.primary : theme.surfaceMuted, borderColor: role === option ? theme.primary : theme.border }, pressed && styles.pressed]}>
            <Text style={{ color: role === option ? theme.onPrimary : theme.ink, fontWeight: '700' }}>{option === 'patient' ? 'Patient' : 'Doctor'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.hint, { color: theme.inkMuted }]}>{role === 'doctor' ? 'You will complete your professional profile after registration.' : 'You will complete your health details after registration.'}</Text>

      <Button
        title={loading ? 'Registering...' : 'Create account'}
        icon="person-add-outline"
        size="lg"
        themeOverride={theme}
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
        loading={loading}
      />

      <Link href={{ pathname: '/(auth)/login', params: { role } }} style={[styles.link, { color: theme.primary }]}>
        Already have an account? Login
      </Link>
      </FadeSlide>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 56, height: 56, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoText: { fontSize: 20, fontWeight: '800' },
  title: { ...typography.title },
  subtitle: { ...typography.body, marginTop: spacing.xs },
  field: { marginBottom: spacing.md },
  button: { marginTop: spacing.sm, width: '100%' },
  link: { textAlign: 'center', marginTop: spacing.xl, fontSize: 14, fontWeight: '600' },
  accountLabel: { ...typography.label, marginTop: spacing.sm, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleOption: { flex: 1, minHeight: 46, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { ...typography.caption, marginTop: spacing.sm },
  pressed: { opacity: 0.64, transform: [{ scale: 0.96 }] },
});
