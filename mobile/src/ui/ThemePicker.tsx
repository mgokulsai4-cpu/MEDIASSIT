import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { Stagger } from './motion';
import { THEME_ORDER, themePresets, radii, spacing, typography } from './theme';

export function ThemePicker() {
  const { themeName, theme, setThemeName } = useSettings();

  return (
    <View style={styles.grid}>
      {THEME_ORDER.map((name, index) => {
        const option = themePresets[name];
        const selected = name === themeName;
        const palette = option.colors;
        return (
          <Stagger key={name} index={index} step={45} style={styles.optionWrap}>
          <Pressable
            onPress={() => { void setThemeName(name); }}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: theme.surface, borderColor: selected ? theme.primary : theme.border },
              selected && styles.selectedBorder,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.swatch, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <View style={styles.swatchRow}>
                <View style={[styles.dot, { backgroundColor: palette.primary }]} />
                <View style={[styles.dot, { backgroundColor: palette.accent }]} />
                <View style={[styles.dot, { backgroundColor: palette.surface }]} />
              </View>
              <View style={[styles.line, { backgroundColor: palette.primarySoft }]} />
            </View>
            <Text style={[styles.label, { color: theme.ink }]}>{option.label}</Text>
            <Text style={[styles.description, { color: theme.inkMuted }]}>{option.description}</Text>
            {selected ? <Text style={[styles.selected, { color: theme.primary }]}>Selected</Text> : null}
          </Pressable>
          </Stagger>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  optionWrap: { width: '47%' },
  option: { width: '100%', minHeight: 168, borderRadius: 16, borderWidth: 1, padding: spacing.md },
  selectedBorder: { borderWidth: 2 },
  swatch: { height: 70, borderRadius: 10, padding: spacing.md, justifyContent: 'space-between', marginBottom: spacing.md, borderWidth: 1 },
  swatchRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 18, height: 18, borderRadius: 9 },
  line: { height: 10, width: '65%', borderRadius: 5 },
  label: { ...typography.heading, fontSize: 15 },
  description: { ...typography.caption, marginTop: spacing.xs },
  selected: { ...typography.caption, marginTop: spacing.sm, fontWeight: '700' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
