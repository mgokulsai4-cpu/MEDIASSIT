import { Stack } from 'expo-router';
import { useSettings } from '../../src/contexts/SettingsContext';
import { AppleBackButton, appleStackScreenOptions } from '../../src/ui/navigation';

export default function AuthLayout() {
  const { theme } = useSettings();
  const stack = appleStackScreenOptions(theme);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="login" />
      <Stack.Screen
        name="register"
        options={{
          ...stack,
          title: 'Create Account',
          headerLeft: () => <AppleBackButton label="Log In" />,
        }}
      />
    </Stack>
  );
}
