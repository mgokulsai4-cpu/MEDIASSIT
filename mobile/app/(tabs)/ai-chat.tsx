import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import type { ChatTurn, TriageResult } from '../../src/types';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { BubbleIn, FadeSlide, ScaleIn, TypingDots } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { StatusBadge } from '../../src/ui/StatusBadge';
import { fonts, layout, radii, spacing, typography } from '../../src/ui/theme';
import {
  speechRecognitionAvailable,
  requestMicPermission,
  startListening,
  stopListening,
  speak,
} from '../../src/services/voice';

interface Message {
  id: string;
  type: 'question' | 'answer' | 'result' | 'user' | 'error';
  content: string;
  rephrased?: boolean;
  options?: { id: string; key: string; text: string; emoji: string }[];
  triage?: TriageResult['triage'];
}

const STARTERS = [
  { label: 'Fever', text: 'I have a fever' },
  { label: 'Headache', text: 'I have a headache' },
  { label: 'Cough', text: 'I have a cough' },
  { label: 'Chest pain', text: 'I have chest pain' },
  { label: 'Stomach pain', text: 'I have stomach pain' },
];

let nextId = 1;
function uid(prefix: string): string {
  return `${prefix}-${nextId++}`;
}

export default function AIChatScreen() {
  const router = useRouter();
  const { theme } = useSettings();
  const [simple, setSimple] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<{ key: string; answer: string; rephrased: boolean }[]>([]);
  const [listening, setListening] = useState(false);
  const voiceAvailable = speechRecognitionAvailable();
  const flatListRef = useRef<FlatList<Message> | null>(null);
  const sendScale = useRef(new Animated.Value(0.9)).current;
  const started = messages.length > 0;
  const canSend = Boolean(input.trim()) && !loading;

  useEffect(() => {
    Animated.spring(sendScale, { toValue: canSend ? 1 : 0.9, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [canSend, sendScale]);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, []);

  const handleTurn = useCallback((turn: ChatTurn) => {
    if (turn.type === 'question') {
      addMessage({
        id: uid('q'),
        type: 'question',
        content: turn.question.text,
        rephrased: turn.question.rephrased,
        options: turn.question.options,
      });
    } else {
      const triage = turn.triage;
      addMessage({
        id: uid('result'),
        type: 'result',
        content: triage.reason,
        triage,
      });
    }
  }, [addMessage]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    addMessage({ id: uid('user'), type: 'user', content: msg });

    setLoading(true);
    try {
      const res = await api.post<ChatTurn>('/api/ai/chat', {
        message: msg,
        answers,
        simple,
      });
      const turn = res.data as unknown as ChatTurn;
      if (turn) handleTurn(turn);
    } catch {
      addMessage({ id: uid('error'), type: 'error', content: 'The symptom check is unavailable right now. Try again in a moment.' });
    } finally {
      setLoading(false);
    }
  }, [input, loading, answers, simple, addMessage, handleTurn]);

  const handleOptionSelect = useCallback(async (option: { id: string; key: string; text: string }, rephrased = false) => {
    const isCategory = option.key.startsWith('category.');
    const categoryAnswer = isCategory ? option.id : undefined;
    addMessage({ id: uid('answer'), type: 'answer', content: option.text });

    const newAnswer = { key: option.key, answer: option.key.split('.').pop() || option.id, rephrased };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    setLoading(true);
    try {
      const payload: Record<string, unknown> = { answers: updatedAnswers, simple };
      if (categoryAnswer && categoryAnswer !== 'not_sure') {
        payload.message = `I have a ${categoryAnswer} problem`;
      }
      const res = await api.post<ChatTurn>('/api/ai/chat', payload);
      const turn = res.data as unknown as ChatTurn;
      if (turn) handleTurn(turn);
    } catch {
      addMessage({ id: uid('error'), type: 'error', content: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [answers, loading, simple, addMessage, handleTurn]);

  const handleVoiceToggle = useCallback(async () => {
    if (listening) {
      stopListening();
      setListening(false);
      return;
    }
    const granted = await requestMicPermission();
    if (!granted) {
      Alert.alert('Microphone required', 'Voice input needs microphone permission.');
      return;
    }
    setListening(true);
    startListening(
      (text) => {
        setListening(false);
        setInput(text);
        void handleSend(text);
      },
      (partial) => setInput(partial),
    );
  }, [listening, handleSend]);

  const handleSpeakBot = useCallback((text?: string) => {
    if (!text) return;
    if (speechRecognitionAvailable()) stopListening();
    speak(text);
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    if (item.type === 'user' || item.type === 'answer') {
      return (
        <BubbleIn side="user" style={styles.rowEnd}>
          <View style={[styles.userBubble, { backgroundColor: theme.primary }]}>
            <Text style={[styles.bubbleText, { color: theme.onPrimary }]}>{item.content}</Text>
          </View>
        </BubbleIn>
      );
    }

    if (item.type === 'error') {
      return (
        <BubbleIn side="bot">
          <View style={[styles.assistCard, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}>
            <Text style={[styles.bubbleText, { color: theme.danger }]}>{item.content}</Text>
          </View>
        </BubbleIn>
      );
    }

    if (item.type === 'result' && item.triage) {
      const triage = item.triage;
      const urgency = triage.urgency.level;
      const tone = urgency === 'red' ? 'danger' : urgency === 'green' ? 'success' : 'warning';
      return (
        <BubbleIn side="bot" style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.resultTop}>
            <Text style={[styles.resultKicker, { color: theme.inkMuted }]}>Care guidance</Text>
            <StatusBadge label={triage.urgency.label} tone={tone} />
          </View>
          <Text style={[styles.resultReason, { color: theme.ink }]}>{triage.reason}</Text>
          {triage.recommended_specialties.length > 0 ? (
            <Text style={[styles.resultMeta, { color: theme.inkMuted }]}>
              Suggested: {triage.recommended_specialties.map((s) => s.specialty).join(', ')}
            </Text>
          ) : null}
          {triage.emergency_flag ? (
            <Text style={[styles.resultEmergency, { color: theme.danger }]}>If this feels severe, seek emergency care now.</Text>
          ) : null}
          <Text style={[styles.resultDisclaimer, { color: theme.inkSubtle }]}>{triage.disclaimer}</Text>
          {triage.recommended_specialties.length > 0 ? (
            <Button title="Find a doctor" icon="medical-outline" style={styles.bookBtn} onPress={() => router.push('/(tabs)/doctors')} />
          ) : null}
        </BubbleIn>
      );
    }

    return (
      <BubbleIn side="bot" style={styles.rowStart}>
        <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="medkit" size={14} color={theme.primary} />
        </View>
        <View style={[styles.botBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.botTextRow}>
            <Text style={[styles.bubbleText, { color: theme.ink, flex: 1 }]}>{item.content}</Text>
            <Pressable
              onPress={() => handleSpeakBot(item.content)}
              accessibilityRole="button"
              accessibilityLabel="Read aloud"
              style={({ pressed }) => [styles.speakBtn, { backgroundColor: theme.primarySoft }, pressed && styles.pressed]}
            >
              <Ionicons name="volume-medium" size={14} color={theme.primaryDark} />
            </Pressable>
          </View>
          {item.options && item.options.length > 0 ? (
            <View style={styles.options}>
              {item.options.map((opt) => (
                <Pressable
                  key={opt.key}
                  disabled={loading}
                  onPress={() => handleOptionSelect(opt, item.rephrased === true)}
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: theme.primarySoft, borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.optionText, { color: theme.primaryDark }]}>
                    {simple && opt.emoji ? `${opt.emoji} ` : ''}{opt.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </BubbleIn>
    );
  }, [handleOptionSelect, handleSpeakBot, loading, router, simple, theme]);

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            started ? (
              <Pressable
                style={[
                  styles.simpleToggle,
                  { backgroundColor: simple ? theme.primarySoft : theme.surfaceMuted, borderColor: simple ? theme.primary : theme.border },
                ]}
                onPress={() => setSimple((s) => !s)}
                accessibilityRole="switch"
                accessibilityState={{ checked: simple }}
                accessibilityLabel="Simple words mode"
              >
                <Text style={[styles.simpleToggleText, { color: simple ? theme.primaryDark : theme.inkSubtle }]}>
                  {simple ? 'Simple words: ON' : 'Simple words: OFF'}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.welcome}>
                <ScaleIn>
                  <View style={[styles.welcomeIcon, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="heart" size={26} color={theme.primary} />
                  </View>
                </ScaleIn>
                <FadeSlide delay={80}>
                  <Text style={[styles.welcomeTitle, { color: theme.ink }]}>What brings you in?</Text>
                </FadeSlide>
                <FadeSlide delay={140}>
                  <Text style={[styles.welcomeBody, { color: theme.inkMuted }]}>
                    Describe your symptoms in plain language. We will ask a few follow-ups and point you to the right kind of care.
                  </Text>
                </FadeSlide>
                <FadeSlide delay={180}>
                  <Pressable
                    style={[
                      styles.simpleToggle,
                      { backgroundColor: simple ? theme.primarySoft : theme.surfaceMuted, borderColor: simple ? theme.primary : theme.border },
                    ]}
                    onPress={() => setSimple((s) => !s)}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: simple }}
                    accessibilityLabel="Simple words mode"
                  >
                    <Text style={[styles.simpleToggleText, { color: simple ? theme.primaryDark : theme.inkSubtle }]}>
                      {simple ? 'Simple words: ON' : 'Simple words: OFF'}
                    </Text>
                  </Pressable>
                </FadeSlide>
                <FadeSlide delay={220}>
                  <Text style={[styles.starterLabel, { color: theme.inkSubtle }]}>Common starting points</Text>
                </FadeSlide>
                <View style={styles.starters}>
                  {STARTERS.map((item, index) => (
                    <FadeSlide key={item.label} delay={280 + index * 70} from={10}>
                      <Pressable
                        onPress={() => handleSend(item.text)}
                        style={({ pressed }) => [
                          styles.starter,
                          { backgroundColor: theme.surface, borderColor: theme.border },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={[styles.starterText, { color: theme.ink }]}>{item.label}</Text>
                      </Pressable>
                    </FadeSlide>
                  ))}
                </View>
              </View>
            )
          }
          ListFooterComponent={loading ? (
            <BubbleIn side="bot">
              <View style={[styles.typingRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <TypingDots />
                <Text style={[styles.typing, { color: theme.inkSubtle }]}>Reviewing your answers…</Text>
              </View>
            </BubbleIn>
          ) : null}
        />

        <FadeSlide from={20} delay={180} style={styles.composerDock}>
          <View style={[styles.composer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {voiceAvailable ? (
              <Pressable
                onPress={() => void handleVoiceToggle()}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={listening ? 'Stop voice input' : 'Voice input'}
                style={({ pressed }) => [
                  styles.micBtn,
                  { backgroundColor: listening ? theme.dangerSoft : theme.primarySoft },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name={listening ? 'mic' : 'mic-outline'} size={18} color={listening ? theme.danger : theme.primaryDark} />
              </Pressable>
            ) : null}
            <TextInput
              style={[styles.input, { color: theme.ink }]}
              placeholder={listening ? 'Listening…' : 'Describe what you feel…'}
              placeholderTextColor={theme.inkSubtle}
              value={input}
              onChangeText={setInput}
              multiline
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
            />
            <Animated.View style={{ transform: [{ scale: sendScale }] }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                onPress={() => handleSend()}
                disabled={!canSend}
                style={({ pressed }) => [
                  styles.send,
                  { backgroundColor: canSend ? theme.primary : theme.surfaceMuted },
                  pressed && canSend ? styles.pressed : null,
                ]}
              >
                {loading
                  ? <ActivityIndicator color={theme.onPrimary} size="small" />
                  : <Ionicons name="arrow-up" size={20} color={canSend ? theme.onPrimary : theme.inkSubtle} />}
              </Pressable>
            </Animated.View>
          </View>
        </FadeSlide>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: layout.horizontalPadding, paddingTop: spacing.lg, paddingBottom: spacing.md, flexGrow: 1 },
  welcome: { alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  welcomeIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  welcomeTitle: { ...typography.title, textAlign: 'center' },
  welcomeBody: { ...typography.body, textAlign: 'center', marginTop: spacing.sm, maxWidth: 340 },
  simpleToggle: { alignSelf: 'center', borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm, borderWidth: 1 },
  simpleToggleText: { ...typography.caption, fontWeight: '700' },
  starterLabel: { ...typography.caption, marginTop: spacing.xxl, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.6 },
  starters: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  starter: { minHeight: 40, paddingHorizontal: spacing.lg, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center' },
  starterText: { ...typography.label },
  rowStart: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.md, gap: spacing.sm, maxWidth: '92%' },
  rowEnd: { alignItems: 'flex-end', marginBottom: spacing.md },
  avatar: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  botBubble: { flexShrink: 1, borderRadius: 18, borderTopLeftRadius: 6, padding: spacing.lg, borderWidth: 1 },
  botTextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  speakBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  userBubble: { maxWidth: '82%', borderRadius: 18, borderTopRightRadius: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  assistCard: { borderRadius: 16, padding: spacing.lg, borderWidth: 1, marginBottom: spacing.md },
  bubbleText: { ...typography.body },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  option: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center' },
  optionText: { ...typography.label },
  resultCard: { borderRadius: 20, padding: spacing.xl, borderWidth: 1, marginBottom: spacing.md },
  resultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  resultKicker: { ...typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  resultReason: { ...typography.body, fontFamily: fonts.sansMedium },
  resultMeta: { ...typography.caption, marginTop: spacing.sm },
  resultEmergency: { ...typography.label, marginTop: spacing.md },
  resultDisclaimer: { ...typography.caption, marginTop: spacing.md },
  bookBtn: { marginTop: spacing.lg },
  typingRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: 18, borderWidth: 1, marginBottom: spacing.md },
  typing: { ...typography.caption },
  composerDock: { paddingHorizontal: layout.horizontalPadding, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 28,
    paddingLeft: spacing.sm,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 52,
    gap: spacing.xs,
  },
  micBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, ...typography.body, maxHeight: 110, paddingVertical: 8, paddingRight: spacing.sm },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.78 },
});
