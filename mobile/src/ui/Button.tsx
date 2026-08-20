import { useCallback, type ComponentProps } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../contexts/SettingsContext';
import { usePressScale } from './motion';
import { layout, radii, shadowsStrong, spacing, typography, type ThemeColors } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  themeOverride?: ThemeColors;
  haptic?: boolean;
  onPress?: PressableProps['onPress'];
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  style,
  textStyle,
  themeOverride,
  haptic = true,
  onPress,
  ...props
}: ButtonProps) {
  const { theme: settingsTheme } = useSettings();
  const theme = themeOverride ?? settingsTheme;
  const isDisabled = disabled || loading;
  const tall = size === 'lg';
  const press = usePressScale(0.965);

  const variantStyle = {
    primary: { backgroundColor: theme.primary, borderColor: theme.primary },
    secondary: { backgroundColor: theme.surface, borderColor: theme.borderStrong },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
    danger: { backgroundColor: theme.danger, borderColor: theme.danger },
    success: { backgroundColor: theme.success, borderColor: theme.success },
  }[variant];

  const labelColor = {
    primary: theme.onPrimary,
    secondary: theme.ink,
    ghost: theme.primary,
    danger: theme.white,
    success: theme.onSuccess,
  }[variant];

  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>(
    (event) => {
      if (haptic && !isDisabled) void Haptics.selectionAsync();
      onPress?.(event);
    },
    [haptic, isDisabled, onPress],
  );

  return (
    <Animated.View style={[press.style, style]}>
      <Pressable
        accessibilityRole="button"
        android_ripple={{ color: `${theme.primary}22` }}
        {...props}
        disabled={isDisabled}
        onPress={handlePress}
        onPressIn={(event) => {
          if (!isDisabled) press.onPressIn();
          props.onPressIn?.(event);
        }}
        onPressOut={(event) => {
          press.onPressOut();
          props.onPressOut?.(event);
        }}
        style={({ pressed }) => [
          styles.base,
          tall ? styles.lg : styles.md,
          variantStyle,
          variant === 'secondary' && styles.secondaryBorder,
          (variant === 'primary' || variant === 'success' || variant === 'danger') && shadowsStrong,
          pressed && !isDisabled && styles.pressed,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={labelColor} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={tall ? 20 : 18} color={labelColor} style={styles.icon} /> : null}
            <Text style={[styles.text, tall && styles.textLg, { color: labelColor }, textStyle]}>{title}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouchTarget,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  md: { minHeight: 48 },
  lg: { minHeight: 56, borderRadius: radii.lg },
  secondaryBorder: { borderWidth: 2 },
  icon: { marginRight: spacing.sm },
  text: { ...typography.label, fontSize: 15, fontWeight: '700' },
  textLg: { fontSize: 16 },
  pressed: { opacity: 0.92 },
  disabled: { opacity: 0.55 },
});
