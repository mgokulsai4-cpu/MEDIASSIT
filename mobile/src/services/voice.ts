import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import type { ExpoSpeechRecognitionResultEvent } from 'expo-speech-recognition';
import * as Speech from 'expo-speech';

export function speechRecognitionAvailable(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export async function requestMicPermission(): Promise<boolean> {
  try {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return permission.granted;
  } catch {
    return false;
  }
}

export function startListening(
  onFinal: (text: string) => void,
  onPartial?: (text: string) => void,
): void {
  try {
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      addsPunctuation: true,
    });
  } catch {
    return;
  }
  const subscriptions = ExpoSpeechRecognitionModule.addListener(
    'result',
    (event: ExpoSpeechRecognitionResultEvent) => {
      const transcript = event.results.map((r) => r.transcript).join(' ').trim();
      if (!transcript) return;
      if (event.isFinal) {
        onFinal(transcript);
        cleanup();
      } else if (onPartial) {
        onPartial(transcript);
      }
    },
  );
  const errorSub = ExpoSpeechRecognitionModule.addListener('error', () => cleanup());
  function cleanup() {
    subscriptions.remove();
    errorSub.remove();
  }
}

export function stopListening(): void {
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch {
    // ignore
  }
}

export function abortListening(): void {
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch {
    // ignore
  }
}

export function speak(text: string): void {
  try {
    Speech.stop();
    Speech.speak(text, { language: 'en-US', rate: 0.95 });
  } catch {
    // ignore
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}