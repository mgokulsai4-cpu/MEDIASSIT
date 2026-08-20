import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { createFakeAppointments, fakeDoctorQueue, fakeDoctorReports } from '../data/testData';
import type { Appointment } from '../types';
import { isThemeName, themes, type ThemeColors, type ThemeName } from '../ui/theme';

const THEME_KEY = 'medassist_theme';
const TEST_MODE_KEY = 'medassist_test_mode';

type FakeQueueEntry = (typeof fakeDoctorQueue)[number];
type FakeReport = (typeof fakeDoctorReports)[number];

function createFakeQueue(): FakeQueueEntry[] {
  return fakeDoctorQueue.map((entry) => ({
    ...entry,
    patient: entry.patient ? { ...entry.patient } : entry.patient,
  }));
}

function createFakeReports(): FakeReport[] {
  return fakeDoctorReports.map((report) => ({ ...report }));
}

interface SettingsState {
  themeName: ThemeName;
  theme: ThemeColors;
  setThemeName: (name: ThemeName) => Promise<void>;
  testMode: boolean;
  setTestMode: (enabled: boolean) => Promise<void>;
  fakeAppointments: Appointment[];
  addFakeAppointment: (appointment: Appointment) => void;
  removeFakeAppointment: (appointmentId: string) => void;
  fakeQueue: FakeQueueEntry[];
  updateFakeQueueStatus: (queueId: string, status: string) => void;
  fakeReports: FakeReport[];
  addFakeReport: (report: FakeReport) => void;
}

const SettingsContext = createContext<SettingsState>({
  themeName: 'ocean',
  theme: themes.ocean,
  setThemeName: async () => {},
  testMode: false,
  setTestMode: async () => {},
  fakeAppointments: [],
  addFakeAppointment: () => {},
  removeFakeAppointment: () => {},
  fakeQueue: [],
  updateFakeQueueStatus: () => {},
  fakeReports: [],
  addFakeReport: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [themeName, setThemeNameState] = useState<ThemeName>('ocean');
  const [testMode, setTestModeState] = useState(true);
  const [fakeAppointments, setFakeAppointments] = useState<Appointment[]>([]);
  const [fakeQueue, setFakeQueue] = useState<FakeQueueEntry[]>(createFakeQueue);
  const [fakeReports, setFakeReports] = useState<FakeReport[]>(createFakeReports);

  useEffect(() => {
    async function loadSettings() {
      const [storedTheme, storedTestMode] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(TEST_MODE_KEY),
      ]);
      if (isThemeName(storedTheme)) setThemeNameState(storedTheme);
      setTestModeState(storedTestMode === null ? true : storedTestMode === 'true');
    }
    void loadSettings();
  }, []);

  useEffect(() => {
    if (testMode && fakeAppointments.length === 0) {
      setFakeAppointments(createFakeAppointments(user?.user_id ?? 'FAKE-PATIENT'));
    }
  }, [testMode, user?.user_id, fakeAppointments.length]);

  const setThemeName = async (name: ThemeName) => {
    setThemeNameState(name);
    await AsyncStorage.setItem(THEME_KEY, name);
  };

  const setTestMode = async (enabled: boolean) => {
    setTestModeState(enabled);
    await AsyncStorage.setItem(TEST_MODE_KEY, String(enabled));
    if (enabled) {
      setFakeAppointments(createFakeAppointments(user?.user_id ?? 'FAKE-PATIENT'));
      setFakeQueue(createFakeQueue());
      setFakeReports(createFakeReports());
    } else {
      setFakeAppointments([]);
    }
  };

  const addFakeAppointment = (appointment: Appointment) => {
    setFakeAppointments((previous) => [...previous, appointment]);
  };

  const removeFakeAppointment = (appointmentId: string) => {
    setFakeAppointments((previous) => previous.filter((item) => item.appointment_id !== appointmentId));
  };

  const updateFakeQueueStatus = (queueId: string, status: string) => {
    setFakeQueue((previous) => previous.map((entry) => entry.queue_id === queueId ? { ...entry, status } : entry));
  };

  const addFakeReport = (report: FakeReport) => {
    setFakeReports((previous) => [report, ...previous]);
  };

  return (
    <SettingsContext.Provider value={{
      themeName,
      theme: themes[themeName],
      setThemeName,
      testMode,
      setTestMode,
      fakeAppointments,
      addFakeAppointment,
      removeFakeAppointment,
      fakeQueue,
      updateFakeQueueStatus,
      fakeReports,
      addFakeReport,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsState {
  return useContext(SettingsContext);
}
