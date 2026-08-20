import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { BubbleIn, FadeSlide } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { StatusBadge } from '../../src/ui/StatusBadge';
import { useSettings } from '../../src/contexts/SettingsContext';
import { layout, radii, spacing, typography } from '../../src/ui/theme';

interface QuestionOption {
  id: string;
  key: string;
  text: string;
  emoji: string;
}

interface PreConsultQuestion {
  type: 'question';
  question: { id: string; key: string; text: string; rephrased: boolean; options: QuestionOption[] };
  done: boolean;
}

interface PreConsultResult {
  type: 'result';
  preconsult_summary: Record<string, unknown>;
  done: boolean;
}

type PreConsultTurn = (PreConsultQuestion | PreConsultResult) & {
  pc_id?: string;
  status?: string;
  messages?: { role: string; text: string }[];
  answers?: { key: string; answer: string; rephrased?: boolean }[];
};

function fakeQuestion(index: number): PreConsultQuestion {
  const questions = [
    { key: 'chief_complaint', text: 'What is your main reason for this visit?', options: [{ id: 'symptoms', key: 'chief_complaint.symptoms', text: 'I have symptoms', emoji: '' }, { id: 'checkup', key: 'chief_complaint.checkup', text: 'Routine checkup', emoji: '' }] },
    { key: 'severity', text: 'How would you describe the severity?', options: [{ id: 'mild', key: 'severity.mild', text: 'Mild', emoji: '' }, { id: 'moderate', key: 'severity.moderate', text: 'Moderate', emoji: '' }, { id: 'severe', key: 'severity.severe', text: 'Severe', emoji: '' }] },
    { key: 'duration', text: 'How long has this been happening?', options: [{ id: 'today', key: 'duration.today', text: 'Since today', emoji: '' }, { id: 'week', key: 'duration.week', text: 'A few days', emoji: '' }, { id: 'longer', key: 'duration.longer', text: 'More than a week', emoji: '' }] },
  ];
  const question = questions[Math.min(index, questions.length - 1)];
  return { type: 'question', question: { id: `fake-${question.key}`, key: question.key, text: question.text, rephrased: false, options: question.options }, done: false };
}

function fakeResult(): PreConsultResult {
  return {
    type: 'result',
    preconsult_summary: {
      chief_complaint: 'Demo appointment concern',
      symptoms: [{ duration: 'A few days', severity: 'moderate', associated: '' }],
      medications: [],
      allergies: [],
      medical_history: 'Fake test data',
      clinical_summary: 'Demo patient presents with a test concern. Severity is moderate.',
      urgency: 'green',
    },
    done: true,
  };
}

interface ChatMessage {
  role: 'bot' | 'user';
  text: string;
  options?: QuestionOption[];
}

function unwrap<T>(res: { data?: T } | T): T {
  return ((res as { data?: T }).data ?? res) as T;
}

export default function PreConsultScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const { theme } = useSettings();
  const isFake = appointmentId.startsWith('FAKE-');
  const router = useRouter();
  const [pcId, setPcId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [freeText, setFreeText] = useState('');
  const [waitingForFreeText, setWaitingForFreeText] = useState(false);
  const [waitingKey, setWaitingKey] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const applyHistory = useCallback((history: { role: string; text: string }[] | undefined, turn: PreConsultTurn) => {
    const mapped: ChatMessage[] = (history ?? []).map((item) => ({
      role: item.role === 'patient' ? 'user' : 'bot',
      text: item.text,
    }));
    if (turn.type === 'question' && turn.question) {
      const already = mapped.some((item) => item.role === 'bot' && item.text === turn.question.text);
      if (!already) mapped.push({ role: 'bot', text: turn.question.text });
      const last = mapped[mapped.length - 1];
      if (last?.role === 'bot') last.options = turn.question.options;
      const hasFreeText = turn.question.options.length === 1 && turn.question.options[0].id === 'free_text';
      setWaitingForFreeText(hasFreeText);
      setWaitingKey(turn.question.key);
    } else if (turn.type === 'result' && turn.preconsult_summary) {
      setDone(true);
      setSummary(turn.preconsult_summary);
      if (!mapped.some((item) => item.text.includes('pre-consultation summary'))) {
        mapped.push({ role: 'bot', text: 'Your pre-consultation summary has been generated and shared with your doctor.' });
      }
    }
    setMessages(mapped);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const startInterview = useCallback(async () => {
    try {
      setLoading(true);
      if (isFake) {
        setPcId('FAKE-PC-001');
        applyHistory([], fakeQuestion(0));
        return;
      }
      const res = await api.post<PreConsultTurn>('/api/preconsult/start', { appointment_id: appointmentId });
      const turn = unwrap(res);
      if (turn.pc_id) setPcId(turn.pc_id);
      applyHistory(turn.messages, turn);
    } catch {
      setMessages([{ role: 'bot', text: 'Failed to start pre-consultation. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [appointmentId, isFake, applyHistory]);

  useEffect(() => {
    void startInterview();
  }, [startInterview]);

  const sendAnswer = useCallback(async (key: string, answer: string, label: string, message?: string) => {
    if (!pcId) return;
    setMessages((prev) => [...prev.map((item) => ({ ...item, options: undefined })), { role: 'user', text: label }]);
    setWaitingForFreeText(false);
    setLoading(true);
    try {
      if (isFake) {
        const nextIndex = key === 'chief_complaint.symptoms' || key === 'chief_complaint' ? 1 : 2;
        applyHistory([], nextIndex >= 2 ? fakeResult() : fakeQuestion(nextIndex));
        return;
      }
      const res = await api.post<PreConsultTurn>('/api/preconsult/answer', {
        pc_id: pcId,
        message: message ?? label,
        answers: [{ key, answer }],
      });
      applyHistory(unwrap(res).messages, unwrap(res));
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', text: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [pcId, isFake, applyHistory]);

  const handleOptionSelect = useCallback((option: QuestionOption) => {
    if (option.id === 'free_text' || option.key === 'free_text') {
      setWaitingForFreeText(true);
      setWaitingKey(option.key || option.id);
      return;
    }
    void sendAnswer(option.key || option.id, option.id, option.text, option.id === 'start' ? undefined : option.text);
  }, [sendAnswer]);

  const handleFreeTextSubmit = useCallback(() => {
    if (!freeText.trim()) return;
    const text = freeText.trim();
    setFreeText('');
    void sendAnswer(waitingKey || 'chief_complaint', text, text, text);
  }, [freeText, waitingKey, sendAnswer]);

  const urgency = typeof summary?.urgency === 'string' ? summary.urgency : '';

  return (
    <Screen padded={false}>
      <ScrollView ref={scrollRef} style={styles.chatArea} contentContainerStyle={styles.chatContent}>
        {messages.map((msg, i) => (
          <BubbleIn key={`${msg.role}-${i}`} side={msg.role === 'user' ? 'user' : 'bot'}>
          <View style={msg.role === 'bot' ? [styles.botBubble, { backgroundColor: theme.surface, borderColor: theme.border }] : [styles.userBubble, { backgroundColor: theme.primary }]}>
            <Text style={msg.role === 'bot' ? [styles.botText, { color: theme.ink }] : [styles.userText, { color: theme.onPrimary }]}>{msg.text}</Text>
            {msg.options && msg.options.length > 0 && !done && i === messages.length - 1 && (
              <View style={styles.optionsRow}>
                {msg.options.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={({ pressed }) => [styles.optionChip, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }, pressed && styles.pressed]}
                    onPress={() => handleOptionSelect(opt)}
                    disabled={loading}
                  >
                    {opt.emoji ? <Text style={styles.optionEmoji}>{opt.emoji}</Text> : null}
                    <Text style={[styles.optionText, { color: theme.ink }]}>{opt.text}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          </BubbleIn>
        ))}
        {loading && <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: spacing.md }} />}

        {done && summary && (
          <FadeSlide>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryTitle, { color: theme.ink }]}>Pre-consultation summary</Text>
            {urgency ? <StatusBadge label={urgency} tone={urgency === 'red' ? 'danger' : urgency === 'green' ? 'success' : 'warning'} /> : null}
            {typeof summary.clinical_summary === 'string' && summary.clinical_summary ? (
              <Text style={[styles.summaryBody, { color: theme.inkMuted }]}>{summary.clinical_summary}</Text>
            ) : null}
            {typeof summary.chief_complaint === 'string' && summary.chief_complaint ? (
              <Text style={[styles.summaryField, { color: theme.ink }]}>Complaint: {summary.chief_complaint}</Text>
            ) : null}
          </Card>
          </FadeSlide>
        )}
      </ScrollView>

      {waitingForFreeText && !done && (
        <View style={[styles.inputArea, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.textInput, { color: theme.ink, backgroundColor: theme.surface, borderColor: theme.borderStrong }]}
            value={freeText}
            onChangeText={setFreeText}
            placeholder="Type your answer..."
            placeholderTextColor={theme.inkSubtle}
            multiline
          />
          <Button title="Send" icon="send-outline" style={styles.sendBtn} onPress={handleFreeTextSubmit} disabled={!freeText.trim() || loading} loading={loading} />
        </View>
      )}

      {done && (
        <View style={[styles.doneArea, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <Button title="Back to visits" icon="arrow-back-outline" variant="secondary" style={styles.backBtn} onPress={() => router.back()} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chatArea: { flex: 1 },
  chatContent: { padding: layout.horizontalPadding, paddingBottom: spacing.xxxl },
  botBubble: { alignSelf: 'flex-start', borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, maxWidth: '85%' },
  botText: { ...typography.body },
  userText: { ...typography.body },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  optionChip: { borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  optionEmoji: { fontSize: 16, marginRight: spacing.sm },
  optionText: { ...typography.caption },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, borderTopWidth: 1 },
  textInput: { flex: 1, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 15, maxHeight: 100 },
  sendBtn: { marginLeft: spacing.sm, minWidth: 104 },
  doneArea: { padding: spacing.md, borderTopWidth: 1 },
  backBtn: { width: '100%' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  summaryCard: { marginTop: spacing.md, gap: spacing.sm },
  summaryTitle: { ...typography.heading },
  summaryBody: { ...typography.body },
  summaryField: { ...typography.body },
});
