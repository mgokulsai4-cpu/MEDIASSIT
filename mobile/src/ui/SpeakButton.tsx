import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { speak, stopSpeaking, speechRecognitionAvailable } from '../services/voice';
import { radii, spacing } from './theme';

interface SpeakButtonProps {
  text: string;
  style?: object;
}

export function SpeakButton({ text, style }: SpeakButtonProps) {
  const { theme } = useSettings();
  const [speaking, setSpeaking] = useState(false);

  const handlePress = useCallback(() => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    if (!speechRecognitionAvailable() && !text) return;
    setSpeaking(true);
    speak(text);
    // Auto-clear speaking state after estimated duration (rough 15 chars/sec)
    const estimatedMs = Math.max(2000, Math.min((text.length / 15) * 1000, 30000));
    setTimeout(() => setSpeaking(false), estimatedMs);
  }, [speaking, text]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={speaking ? 'Stop reading aloud' : 'Read aloud'}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: speaking ? theme.dangerSoft : theme.primarySoft },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons
        name={speaking ? 'stop-circle' : 'volume-medium'}
        size={14}
        color={speaking ? theme.danger : theme.primaryDark}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.78 },
});
