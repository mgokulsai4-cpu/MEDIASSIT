import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../src/contexts/SettingsContext';
import { AnimatedTabIcon } from '../../src/ui/motion';
import { AppleHeaderIcon, AppleTabBarBackground, floatingTabScenePadding, useAppleTabBarStyle } from '../../src/ui/navigation';
import { fonts } from '../../src/ui/theme';

export default function DoctorTabsLayout() {
  const { theme } = useSettings();
  const router = useRouter();
  const tabBarStyle = useAppleTabBarStyle();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        headerTintColor: theme.primary,
        headerTitleStyle: { fontFamily: fonts.sansSemi, fontSize: 17, fontWeight: '600', color: theme.ink },
        headerStyle: { backgroundColor: theme.background },
        sceneStyle: { backgroundColor: theme.background, paddingBottom: floatingTabScenePadding() },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.inkSubtle,
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11, fontWeight: '500' },
        tabBarItemStyle: { paddingTop: 2 },
        tabBarBackground: () => <AppleTabBarBackground />,
        tabBarStyle,
        tabBarHideOnKeyboard: true,
        animation: 'fade',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerRight: () => (
            <AppleHeaderIcon
              icon="notifications-outline"
              accessibilityLabel="Notifications"
              onPress={() => router.push('/notifications')}
            />
          ),
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused}><Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} /></AnimatedTabIcon>,
        }}
      />
      <Tabs.Screen name="queue" options={{ title: 'Queue', tabBarLabel: 'Queue', tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused}><Ionicons name={focused ? 'list' : 'list-outline'} size={24} color={color} /></AnimatedTabIcon> }} />
      <Tabs.Screen name="patients" options={{ title: 'Patients', tabBarLabel: 'Patients', tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused}><Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} /></AnimatedTabIcon> }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarLabel: 'Reports', tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused}><Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={24} color={color} /></AnimatedTabIcon> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile', tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused}><Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} /></AnimatedTabIcon> }} />
    </Tabs>
  );
}
