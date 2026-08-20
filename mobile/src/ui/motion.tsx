import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';

const easeOut = Easing.out(Easing.cubic);

export function usePressScale(pressedScale = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: pressedScale, friction: 6, tension: 280, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 220, useNativeDriver: true }).start();
  };

  return { scale, onPressIn, onPressOut, style: { transform: [{ scale }] } };
}

export function FadeSlide({
  children,
  delay = 0,
  from = 14,
  fromX = 0,
  duration = 420,
  style,
}: {
  children: ReactNode;
  delay?: number;
  from?: number;
  fromX?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(from)).current;
  const translateX = useRef(new Animated.Value(fromX)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, easing: easeOut, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: duration + 40, delay, easing: easeOut, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: duration + 40, delay, easing: easeOut, useNativeDriver: true }),
    ]).start();
  }, [delay, duration, opacity, translateX, translateY]);

  return <Animated.View style={[{ opacity, transform: [{ translateX }, { translateY }] }, style]}>{children}</Animated.View>;
}

export function ScaleIn({
  children,
  delay = 0,
  from = 0.86,
  style,
}: {
  children: ReactNode;
  delay?: number;
  from?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(from)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 360, delay, easing: easeOut, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 90, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, scale]);

  return <Animated.View style={[{ opacity, transform: [{ scale }] }, style]}>{children}</Animated.View>;
}

export function Stagger({
  index,
  children,
  style,
  step = 52,
  cap = 8,
  from = 12,
}: {
  index: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  step?: number;
  cap?: number;
  from?: number;
}) {
  return (
    <FadeSlide delay={Math.min(index, cap) * step} from={from} style={style}>
      {children}
    </FadeSlide>
  );
}

export function BubbleIn({
  children,
  side = 'bot',
  style,
}: {
  children: ReactNode;
  side?: 'bot' | 'user';
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(side === 'user' ? 22 : -22)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, easing: easeOut, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale, translateX]);

  return <Animated.View style={[{ opacity, transform: [{ translateX }, { scale }] }, style]}>{children}</Animated.View>;
}

export function PressScale({
  children,
  style,
  pressedScale = 0.97,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
}) {
  const { scale, onPressIn, onPressOut } = usePressScale(pressedScale);
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]} onTouchStart={onPressIn} onTouchEnd={onPressOut} onTouchCancel={onPressOut}>
      {children}
    </Animated.View>
  );
}

export function Pulse({
  active = true,
  children,
  style,
  amount = 1.045,
}: {
  active?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  amount?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: amount, duration: 980, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 980, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, amount, scale]);

  return <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>;
}

export function PopOnChange({
  value,
  children,
  style,
}: {
  value: string | number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scale.setValue(0.82);
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 170, useNativeDriver: true }).start();
  }, [scale, value]);

  return <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>;
}

export function TypingDots() {
  const { theme } = useSettings();
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const loops = dots.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 130),
          Animated.timing(value, { toValue: 1, duration: 260, easing: easeOut, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.3, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [dots]);

  return (
    <View style={styles.dots}>
      {dots.map((value, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: theme.primary,
              opacity: value,
              transform: [{ translateY: value.interpolate({ inputRange: [0.3, 1], outputRange: [0, -4] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function AnimatedTabIcon({ focused, children }: { focused: boolean; children: ReactNode }) {
  const scale = useRef(new Animated.Value(focused ? 1.12 : 1)).current;
  const lift = useRef(new Animated.Value(focused ? -2 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: focused ? 1.18 : 1, friction: 5, tension: 180, useNativeDriver: true }),
      Animated.spring(lift, { toValue: focused ? -2 : 0, friction: 6, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [focused, lift, scale]);

  return <Animated.View style={{ transform: [{ translateY: lift }, { scale }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 14 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
