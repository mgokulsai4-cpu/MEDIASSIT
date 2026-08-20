import { Platform } from 'react-native';

const DEV_API = Platform.select({
  android: 'http://10.0.2.2:4000',
  ios: 'http://localhost:4000',
  default: 'http://localhost:4000',
});

export const API_BASE = __DEV__
  ? process.env.EXPO_PUBLIC_API_URL ?? DEV_API
  : process.env.EXPO_PUBLIC_API_URL ?? 'https://api.medassist.example.com';
