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

export default function LoginScreen() {
  const { login } = useAuth();
  const { role: routeRole } = useLocalSearchParams<{ role?: string }>();
  const initialRole = routeRole === 'doctor' ? 'doctor' : 'patient';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>(initialRole);
  const [loading, setLoading] = useState(false);
  const { theme } = useSettings();

  useEffect(() => {
    if (routeRole === 'doctor' || routeRole === 'patient') setRole(routeRole);
  }, [routeRole]);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: User }>('/api/auth/login', {
        identifier: identifier.trim(),
        password,
        role,
      });
      const data = (res as { data?: { token: string; user: User } }).data;
      if (data?.token && data?.user) {
        await login(data.token, data.user);
      }
    } catch (e) {
      Alert.alert('Login Failed', (e as Error).message);
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
          <Text style={[styles.title, { color: theme.ink }]}>MedAssist+</Text>
          <Text style={[styles.subtitle, { color: theme.inkMuted }]}>Your AI Healthcare Companion</Text>
        </FadeSlide>
      </View>

      <FadeSlide delay={140}>
      <TextField
        label="Email or phone"
        placeholder="Email or Phone"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <PasswordField
        label="Password"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
      />

      <Text style={[styles.accountLabel, { color: theme.inkMuted }]}>I am signing in as</Text>
      <View style={styles.roleRow}>
        {(['patient', 'doctor'] as const).map((option) => (
          <Pressable key={option} onPress={() => setRole(option)} style={({ pressed }) => [styles.roleOption, { backgroundColor: role === option ? theme.primary : theme.surfaceMuted, borderColor: role === option ? theme.primary : theme.border }, pressed && styles.pressed]}>
            <Text style={{ color: role === option ? theme.onPrimary : theme.ink, fontWeight: '700' }}>{option === 'patient' ? 'Patient' : 'Doctor'}</Text>
          </Pressable>
        ))}
      </View>

      <Button
        title={loading ? 'Logging in...' : 'Log in'}
        icon="log-in-outline"
        size="lg"
        themeOverride={theme}
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
        loading={loading}
      />

      <Link href={{ pathname: '/(auth)/register', params: { role } }} style={[styles.link, { color: theme.primary }]}>
        Don't have an account? Register
      </Link>
      </FadeSlide>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 64, height: 64, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  logoText: { fontSize: 22, fontWeight: '800' },
  title: { ...typography.display },
  subtitle: { ...typography.body, marginTop: spacing.xs },
  button: { marginTop: spacing.md, width: '100%' },
  link: { textAlign: 'center', marginTop: spacing.xl, fontSize: 14, fontWeight: '600' },
  accountLabel: { ...typography.label, marginTop: spacing.lg, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleOption: { flex: 1, minHeight: 46, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.64, transform: [{ scale: 0.96 }] },
});
