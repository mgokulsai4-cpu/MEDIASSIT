import type { ComponentProps } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../contexts/SettingsContext';
import { usePressScale } from './motion';
import { fonts, isDarkTheme, layout } from './theme';

export function AppleBackButton({ label = 'Back' }: { label?: string }) {
  const router = useRouter();
  const { theme } = useSettings();
  const press = usePressScale(0.94);

  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => router.back()}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={28} color={theme.primary} />
        <Text style={[styles.backLabel, { color: theme.primary }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function AppleHeaderIcon({
  icon,
  accessibilityLabel,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { theme } = useSettings();
  const press = usePressScale(0.88);
  return (
    <Animated.View style={press.style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={10}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={onPress}
        style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}
      >
        <Ionicons name={icon} size={22} color={theme.primary} />
      </Pressable>
    </Animated.View>
  );
}

export function appleStackScreenOptions(theme: { background: string; ink: string; primary: string }) {
  return {
    headerShown: true,
    headerShadowVisible: false,
    headerBackVisible: false,
    headerLeft: () => <AppleBackButton />,
    headerTintColor: theme.primary,
    headerTitleAlign: 'center' as const,
    headerTitleStyle: {
      fontFamily: fonts.sansSemi,
      fontSize: 17,
      fontWeight: '600' as const,
      color: theme.ink,
    },
    headerStyle: {
      backgroundColor: theme.background,
    },
    headerLeftContainerStyle: { paddingLeft: 4 },
    headerRightContainerStyle: { paddingRight: 4 },
    contentStyle: { backgroundColor: theme.background },
    animation: 'slide_from_right' as const,
  };
}

export function AppleTabBarBackground() {
  const { theme, themeName } = useSettings();
  const dark = isDarkTheme(themeName);
  return (
    <View style={[styles.floatShell, { borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
      <BlurView intensity={dark ? 42 : 80} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[styles.floatTint, { backgroundColor: dark ? 'rgba(18,24,34,0.55)' : 'rgba(255,255,255,0.55)' }]} />
    </View>
  );
}

export function useAppleTabBarStyle() {
  const insets = useSafeAreaInsets();
  const { themeName } = useSettings();
  const dark = isDarkTheme(themeName);
  const bottom = Math.max(insets.bottom, 10);

  return {
    position: 'absolute' as const,
    left: layout.floatingTabInset,
    right: layout.floatingTabInset,
    bottom,
    height: layout.floatingTabHeight,
    borderRadius: 24,
    overflow: 'hidden' as const,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: '#0E2A3D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: dark ? 0.35 : 0.16,
    shadowRadius: 20,
    paddingTop: 8,
    paddingBottom: 8,
    ...Platform.select({ android: { elevation: 14 }, default: {} }),
  };
}

export function floatingTabScenePadding() {
  return layout.floatingTabHeight + layout.floatingTabInset + 18;
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    marginLeft: 0,
    paddingRight: 8,
  },
  backLabel: {
    fontFamily: fonts.sans,
    fontSize: 17,
    fontWeight: '400',
    marginLeft: -4,
  },
  headerIcon: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  pressed: { opacity: 0.45 },
  floatShell: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  floatTint: {
    ...StyleSheet.absoluteFillObject,
  },
});
