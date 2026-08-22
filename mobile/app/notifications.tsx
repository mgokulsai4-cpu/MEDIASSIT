import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../src/api/client';
import type { AppNotification } from '../src/types';
import { Card } from '../src/ui/Card';
import { FadeSlide, Stagger } from '../src/ui/motion';
import { Screen } from '../src/ui/Screen';
import { SpeakButton } from '../src/ui/SpeakButton';
import { speak } from '../src/services/voice';
import { useSettings } from '../src/contexts/SettingsContext';
import { layout, spacing, typography } from '../src/ui/theme';

function unwrap<T>(res: { data?: T } | T): T {
  return ((res as { data?: T }).data ?? res) as T;
}

export default function NotificationsScreen() {
  const { theme, readAloud } = useSettings();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get<AppNotification[]>('/api/notifications');
      setItems(unwrap(res) ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  useEffect(() => {
    if (readAloud && items.length > 0) {
      const unread = items.filter(n => !n.read);
      if (unread.length > 0) {
        speak('You have ' + unread.length + ' new notification' + (unread.length > 1 ? 's' : '') + '. ' + unread[0].body);
      }
    }
  }, [items, readAloud]);

  const markRead = async (item: AppNotification) => {
    if (item.read) return;
    try {
      await api.patch(`/api/notifications/${item.notification_id}/read`);
      setItems((current) => current.map((row) => row.notification_id === item.notification_id ? { ...row, read: true } : row));
    } catch {
      // ignore
    }
  };

  if (loading) return <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />;

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.notification_id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={<FadeSlide><Text style={[styles.empty, { color: theme.inkSubtle }]}>No notifications yet.</Text></FadeSlide>}
        renderItem={({ item, index }) => (
          <Stagger index={index} style={styles.card}>
            <Pressable onPress={() => void markRead(item)}>
              <Card style={!item.read ? { borderColor: theme.primary } : undefined}>
                <View style={styles.row}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flex: 1 }}>
                  <Text style={[styles.title, { color: theme.ink }]}>{item.title}</Text>
                  <SpeakButton text={item.title + ". " + item.body} />
                </View>
                  {!item.read ? <Text style={[styles.dot, { color: theme.primary }]}>●</Text> : null}
                </View>
                <Text style={[styles.body, { color: theme.inkMuted }]}>{item.body}</Text>
                <Text style={[styles.meta, { color: theme.inkSubtle }]}>{new Date(item.created_at).toLocaleString()}</Text>
              </Card>
            </Pressable>
          </Stagger>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.heading, flex: 1 },
  dot: { fontSize: 12 },
  body: { ...typography.body, marginTop: spacing.xs },
  meta: { ...typography.caption, marginTop: spacing.sm },
  empty: { ...typography.body, textAlign: 'center', marginTop: 40 },
});
