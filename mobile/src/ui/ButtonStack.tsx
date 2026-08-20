import { Children, cloneElement, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { spacing } from './theme';

export function ButtonStack({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.stack, style]}>
      {Children.map(children, (child) =>
        isValidElement<{ style?: StyleProp<ViewStyle> }>(child)
          ? cloneElement(child, { style: [{ width: '100%' }, child.props.style] })
          : child,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { width: '100%', gap: spacing.sm, marginTop: spacing.md },
});
