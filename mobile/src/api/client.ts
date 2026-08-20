import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../constants/api';
import type { ApiResponse } from '../types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function setToken(token: string): Promise<void> {
  return AsyncStorage.setItem(TOKEN_KEY, token);
}

async function removeToken(): Promise<void> {
  return AsyncStorage.removeItem(TOKEN_KEY);
}

async function getStoredUser(): Promise<string | null> {
  return AsyncStorage.getItem(USER_KEY);
}

async function setStoredUser(user: string): Promise<void> {
  return AsyncStorage.setItem(USER_KEY, user);
}

async function removeStoredUser(): Promise<void> {
  return AsyncStorage.removeItem(USER_KEY);
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      await removeToken();
      await removeStoredUser();
      _onUnauthorized?.();
      throw new Error('Session expired. Please login again.');
    }
    throw new Error(formatApiError(data, res.status));
  }

  return data as ApiResponse<T>;
}

function formatApiError(data: unknown, status: number): string {
  const payload = (data ?? {}) as { message?: string; error?: string; details?: unknown };
  const details = payload.details;
  if (Array.isArray(details) && details.length > 0) {
    const messages = details
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) return String((item as { msg: unknown }).msg ?? '');
        return '';
      })
      .filter(Boolean);
    if (messages.length) return [...new Set(messages)].join('. ');
  }
  if (payload.message && payload.message !== 'Validation failed') return payload.message;
  if (payload.error) return payload.error;
  return payload.message || `Request failed with status ${status}`;
}

let _onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(fn: (() => void) | null): void {
  _onUnauthorized = fn;
}

export const api = {
  getToken,
  setToken,
  removeToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,

  get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};
