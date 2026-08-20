import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';
import { layout } from './theme';

interface ScreenProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function Screen({ style, padded = true, ...props }: ScreenProps) {
  const { theme } = useSettings();
  return <SafeAreaView {...props} edges={['left', 'right']} style={[styles.screen, { backgroundColor: theme.background }, padded && styles.padded, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  padded: { paddingHorizontal: layout.horizontalPadding },
});
