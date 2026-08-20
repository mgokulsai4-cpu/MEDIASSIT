import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSettings } from '../contexts/SettingsContext';
import { isDarkTheme, radii, spacing, shadows } from './theme';

interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function Card({ style, padded = true, children, ...props }: CardProps) {
  const { theme, themeName } = useSettings();
  return (
    <BlurView
      {...props}
      intensity={isDarkTheme(themeName) ? 30 : 18}
      tint={isDarkTheme(themeName) ? 'dark' : 'light'}
      style={[styles.card, { borderColor: theme.border }, style]}
    >
      <View style={[styles.glassOverlay, { backgroundColor: `${theme.surface}F0` }, padded && styles.padded]}>
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows,
  },
  glassOverlay: { width: '100%' },
  padded: { padding: spacing.lg },
});
