import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import type { ScannedReport } from '../../src/types';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { colors, layout, radii, spacing, typography } from '../../src/ui/theme';

export default function ScanReportScreen() {
  const router = useRouter();
  const [image, setImage] = useState<{ uri: string; base64: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScannedReport | null>(null);
  const [history, setHistory] = useState<ScannedReport[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get<ScannedReport[]>('/api/scan/list');
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch {
      setHistory([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadHistory(); }, [loadHistory]));

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Photo library access is required to scan reports.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      base64: true,
    });
    if (!picked.canceled && picked.assets[0]?.base64) {
      setImage({ uri: picked.assets[0].uri, base64: picked.assets[0].base64 });
      setResult(null);
    }
  };

  const handleScan = async () => {
    if (!image) return;
    setScanning(true);
    setResult(null);
    try {
      const res = await api.post<ScannedReport>('/api/scan', { image_base64: image.base64 });
      const scan = res.data as unknown as ScannedReport;
      setResult(scan);
      await loadHistory();
    } catch (e) {
      Alert.alert('Scan failed', (e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Scan a Paper Report</Text>
        <Text style={styles.subtitle}>Take a photo of a paper medical report. The AI extracts the text and gives you a plain-language summary.</Text>

        <Card style={styles.card}>
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="contain" />
          ) : (
            <Pressable onPress={() => void pickImage()} accessibilityRole="button" style={({ pressed }) => [styles.placeholder, pressed && styles.pressed]}>
              <Ionicons name="document-text" size={40} color={colors.inkSubtle} />
              <Text style={styles.placeholderText}>Pick a photo of your report</Text>
            </Pressable>
          )}
          {image && (
            <View style={styles.previewActions}>
              <Button title="Change Photo" variant="secondary" style={styles.previewBtn} onPress={() => void pickImage()} />
              <Button title="Extract Text" loading={scanning} style={styles.previewBtn} onPress={() => void handleScan()} />
            </View>
          )}
        </Card>

        {result && (
          <Card style={[styles.card, styles.resultCard]}>
            <Text style={styles.sectionTitle}>AI Summary</Text>
            {result.ai_summary ? (
              <Text style={styles.summaryText}>{result.ai_summary}</Text>
            ) : (
              <Text style={styles.summaryText}>Text extracted but AI summary is unavailable. Read the extracted text below.</Text>
            )}
            <Text style={styles.sectionTitle}>Extracted Text</Text>
            <Text style={styles.rawText}>{result.raw_text}</Text>
            <Text style={styles.meta}>Scan {result.scan_id} · {new Date(result.created_at).toLocaleString()}</Text>
          </Card>
        )}

        {history.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Previous Scans</Text>
            {history.map((scan) => (
              <Pressable key={scan.scan_id} onPress={() => router.push(`/reports/scan/${scan.scan_id}`)}>
                <Card style={styles.historyCard}>
                  <View style={styles.historyIcon}>
                    <Ionicons name="scan" size={16} color={colors.accent} />
                  </View>
                  <View style={styles.historyCopy}>
                    <Text style={styles.historyTitle}>{scan.raw_text.slice(0, 60)}...</Text>
                    <Text style={styles.historyMeta}>{scan.scan_id} · {new Date(scan.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.inkSubtle} />
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.horizontalPadding, paddingBottom: 40 },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  resultCard: { backgroundColor: colors.accentSoft },
  placeholder: { height: 180, borderRadius: radii.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.surfaceMuted },
  placeholderText: { ...typography.label, color: colors.inkSubtle },
  preview: { height: 220, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, width: '100%' },
  previewActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  previewBtn: { flex: 1 },
  sectionTitle: { ...typography.heading, color: colors.ink, marginTop: spacing.md, marginBottom: spacing.sm },
  summaryText: { ...typography.body, color: colors.ink, marginBottom: spacing.md },
  rawText: { ...typography.caption, color: colors.inkMuted, lineHeight: 18 },
  meta: { ...typography.caption, color: colors.inkSubtle, marginTop: spacing.md, textAlign: 'center' },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  historyIcon: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  historyCopy: { flex: 1 },
  historyTitle: { ...typography.label, color: colors.ink },
  historyMeta: { ...typography.caption, color: colors.inkMuted, marginTop: 1 },
  pressed: { opacity: 0.8 },
});