import type { ComponentProps } from 'react';
import { Animated, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../contexts/SettingsContext';
import { usePressScale } from './motion';
import { layout } from './theme';

interface IconButtonProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, accessibilityLabel, onPress, style }: IconButtonProps) {
  const { theme } = useSettings();
  const press = usePressScale(0.9);
  return (
    <Animated.View style={[press.style, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          void Haptics.selectionAsync();
          onPress?.();
        }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.primarySoft, borderColor: theme.border },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name={icon} size={22} color={theme.primary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  pressed: { opacity: 0.8 },
});
