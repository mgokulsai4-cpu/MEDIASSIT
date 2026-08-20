import { useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, type StyleProp, type ViewStyle, View } from 'react-native';
import type { ReactNode } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { layout, radii, spacing, typography } from './theme';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  rightAccessory?: ReactNode;
  error?: string;
}

export function TextField({ label, containerStyle, rightAccessory, error, ...props }: TextFieldProps) {
  const { theme } = useSettings();
  const [focused, setFocused] = useState(false);
  return (
    <View style={containerStyle}>
      {label ? <Text style={[styles.label, { color: theme.inkMuted }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.surface, borderColor: theme.borderStrong },
          focused && { borderColor: theme.primary, borderWidth: 2 },
          !!error && { borderColor: theme.danger },
        ]}
      >
        <TextInput
          {...props}
          placeholderTextColor={props.placeholderTextColor ?? theme.inkSubtle}
          selectionColor={props.selectionColor ?? theme.primary}
          cursorColor={props.cursorColor ?? theme.primary}
          onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
          style={[styles.input, { color: theme.ink, backgroundColor: 'transparent', outlineColor: 'transparent', outlineWidth: 0 }, props.style]}
        />
        {rightAccessory}
      </View>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: spacing.sm },
  inputRow: {
    minHeight: layout.minTouchTarget,
    borderWidth: 1,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  error: { ...typography.caption, marginTop: spacing.xs },
});
