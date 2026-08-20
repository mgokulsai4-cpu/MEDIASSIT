import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useFonts, IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans';
import { SourceSerif4_600SemiBold, SourceSerif4_700Bold } from '@expo-google-fonts/source-serif-4';
import { AuthProvider } from '../src/contexts/AuthContext';
import { SettingsProvider } from '../src/contexts/SettingsContext';
import { useSettings } from '../src/contexts/SettingsContext';
import { appleStackScreenOptions, AppleBackButton } from '../src/ui/navigation';
import { isDarkTheme } from '../src/ui/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F8FB' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <AuthProvider>
      <SettingsProvider>
        <RootStack />
      </SettingsProvider>
    </AuthProvider>
  );
}

function RootStack() {
  const { theme, themeName } = useSettings();
  const stack = appleStackScreenOptions(theme);

  return (
    <>
      <StatusBar style={isDarkTheme(themeName) ? 'light' : 'dark'} backgroundColor={theme.background} />
      <Stack screenOptions={{ ...stack, headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(tabs-doctor)" />
        <Stack.Screen
          name="patient-onboarding"
          options={{
            ...stack,
            title: 'Your profile',
            headerLeft: () => <AppleBackButton />,
          }}
        />
        <Stack.Screen
          name="doctor-onboarding"
          options={{
            ...stack,
            title: 'Doctor profile',
            headerLeft: () => <AppleBackButton />,
          }}
        />
        <Stack.Screen
          name="doctor/[id]"
          options={{
            ...stack,
            title: 'Doctor',
            headerLeft: () => <AppleBackButton label="Doctors" />,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            ...stack,
            title: 'Settings',
            headerLeft: () => <AppleBackButton />,
          }}
        />
        <Stack.Screen
          name="reports/[id]"
          options={{
            ...stack,
            title: 'Report',
            headerLeft: () => <AppleBackButton label="Reports" />,
          }}
        />
        <Stack.Screen
          name="queue/[id]"
          options={{
            ...stack,
            title: 'Queue',
            headerLeft: () => <AppleBackButton label="Visits" />,
          }}
        />
        <Stack.Screen
          name="preconsult/[appointmentId]"
          options={{
            ...stack,
            title: 'Pre-Consultation',
            headerLeft: () => <AppleBackButton label="Visits" />,
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            ...stack,
            title: 'Notifications',
            headerLeft: () => <AppleBackButton />,
          }}
        />
        <Stack.Screen
          name="doctor/consultation/[appointmentId]"
          options={{
            ...stack,
            title: 'Consultation',
            headerLeft: () => <AppleBackButton label="Home" />,
          }}
        />
      </Stack>
    </>
  );
}
