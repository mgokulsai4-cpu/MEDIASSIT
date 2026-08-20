import { StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { radii, spacing, typography } from './theme';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
}

export function StatusBadge({ label, tone = 'neutral', dot = false }: StatusBadgeProps) {
  const { theme } = useSettings();
  const backgroundColor = { neutral: theme.surfaceMuted, primary: theme.primarySoft, success: theme.successSoft, warning: theme.warningSoft, danger: theme.dangerSoft }[tone];
  const textColor = { neutral: theme.inkMuted, primary: theme.primaryDark, success: theme.success, warning: theme.warning, danger: theme.danger }[tone];
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: textColor }]} /> : null}
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { ...typography.caption, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
});
