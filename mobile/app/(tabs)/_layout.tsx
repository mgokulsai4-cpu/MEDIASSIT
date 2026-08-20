import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../src/contexts/SettingsContext';
import { AnimatedTabIcon } from '../../src/ui/motion';
import { AppleHeaderIcon, AppleTabBarBackground, floatingTabScenePadding, useAppleTabBarStyle } from '../../src/ui/navigation';
import { fonts, typography } from '../../src/ui/theme';
import { Text, View } from 'react-native';

function SymptomHeader() {
  const { theme } = useSettings();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.sansSemi, fontSize: 17, color: theme.ink }}>Symptom Check</Text>
      <Text style={{ ...typography.caption, color: theme.inkSubtle }}>Guidance only · not a diagnosis</Text>
    </View>
  );
}

export default function TabLayout() {
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
        name="index"
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
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: 'Symptom Check',
          tabBarLabel: 'Symptoms',
          headerTitle: () => <SymptomHeader />,
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused}><Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} /></AnimatedTabIcon>,
        }}
      />
      <Tabs.Screen
        name="doctors"
        options={{
          title: 'Doctors',
          tabBarLabel: 'Doctors',
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused}><Ionicons name={focused ? 'medical' : 'medical-outline'} size={24} color={color} /></AnimatedTabIcon>,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Visits',
          tabBarLabel: 'Visits',
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused}><Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} /></AnimatedTabIcon>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused}><Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} /></AnimatedTabIcon>,
        }}
      />
    </Tabs>
  );
}
