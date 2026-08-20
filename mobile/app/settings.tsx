import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { api } from '../src/api/client';
import { useSettings } from '../src/contexts/SettingsContext';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { FadeSlide } from '../src/ui/motion';
import { PasswordField } from '../src/ui/PasswordField';
import { Screen } from '../src/ui/Screen';
import { ThemePicker } from '../src/ui/ThemePicker';
import { spacing, typography } from '../src/ui/theme';

export default function SettingsScreen() {
  const { theme, testMode, setTestMode } = useSettings();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill both password fields.');
      return;
    }
    setChangingPassword(true);
    try {
      await api.patch('/api/auth/password', { current_password: currentPassword, new_password: newPassword });
      Alert.alert('Success', 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      Alert.alert('Password update failed', (error as Error).message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Screen padded={false} style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <FadeSlide>
          <Text style={[styles.title, { color: theme.ink }]}>Personalize MedAssist+</Text>
          <Text style={[styles.subtitle, { color: theme.inkMuted }]}>Choose how your care workspace looks and behaves.</Text>
        </FadeSlide>

        <FadeSlide delay={80}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>Theme</Text>
        <View style={styles.themeWrap}>
          <ThemePicker />
        </View>
        </FadeSlide>

        <FadeSlide delay={160}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>Security</Text>
        <Card style={styles.passwordCard}>
          <PasswordField
            label="Current password"
            placeholder="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            containerStyle={styles.passwordField}
          />
          <PasswordField
            label="New password"
            placeholder="New password (min 6 chars)"
            value={newPassword}
            onChangeText={setNewPassword}
            containerStyle={styles.passwordField}
          />
          <Button
            title="Update password"
            onPress={handleChangePassword}
            loading={changingPassword}
            disabled={changingPassword}
          />
        </Card>
        </FadeSlide>

        <FadeSlide delay={240}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>Testing</Text>
        <View style={[styles.testCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.testCopy}>
            <Text style={[styles.optionLabel, { color: theme.ink }]}>Test mode</Text>
            <Text style={[styles.optionDescription, { color: theme.inkMuted }]}>Show clearly labeled fake doctors, appointments, queue entries, patients, and reports for UI testing.</Text>
            <Text style={[styles.warning, { color: theme.warning }]}>No fake data is sent to backend.</Text>
          </View>
          <Switch
            value={testMode}
            onValueChange={(value) => { void setTestMode(value); }}
            trackColor={{ false: theme.borderStrong, true: theme.primarySoft }}
            thumbColor={testMode ? theme.primary : theme.inkSubtle}
          />
        </View>

        {testMode && (
          <Text style={[styles.testEnabled, { color: theme.success }]}>Test mode enabled. Disable it to remove fake data.</Text>
        )}
        </FadeSlide>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: 40 },
  title: { ...typography.title },
  subtitle: { ...typography.body, marginTop: spacing.xs, marginBottom: spacing.xxl },
  sectionTitle: { ...typography.heading, marginBottom: spacing.md },
  themeWrap: { marginBottom: spacing.xxxl },
  passwordCard: { marginBottom: spacing.xxxl, gap: spacing.md },
  passwordField: { marginBottom: spacing.sm },
  testCard: { borderRadius: 16, borderWidth: 1, padding: spacing.lg, flexDirection: 'row', alignItems: 'center' },
  testCopy: { flex: 1, paddingRight: spacing.md },
  optionLabel: { ...typography.heading, fontSize: 16 },
  optionDescription: { ...typography.caption, marginTop: spacing.xs },
  warning: { ...typography.caption, marginTop: spacing.sm, fontWeight: '600' },
  testEnabled: { ...typography.caption, marginTop: spacing.md },
});
