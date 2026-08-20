import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextField, type TextFieldProps } from './TextField';
import { useSettings } from '../contexts/SettingsContext';
import { layout } from './theme';

type PasswordFieldProps = Omit<TextFieldProps, 'secureTextEntry' | 'rightAccessory'>;

export function PasswordField(props: PasswordFieldProps) {
  const { theme } = useSettings();
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      secureTextEntry={!visible}
      rightAccessory={(
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={8}
          onPress={() => setVisible((current) => !current)}
          style={({ pressed }) => [styles.eye, pressed && styles.pressed]}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color={theme.inkMuted} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  eye: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
