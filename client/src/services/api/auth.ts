import { apiFetch } from './client';
import type { User, UserPreferences, SavedPassenger } from '@/types';

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ProfileResponse {
  user: User;
  preferences: UserPreferences;
  passengers: SavedPassenger[];
}

export const authApi = {
  register: (input: RegisterInput) =>
    apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: input }),
  login: (input: LoginInput) => apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: input }),
  me: () => apiFetch<ProfileResponse>('/auth/me'),
  forgotPassword: (email: string) =>
    apiFetch<{ ok: boolean; message: string }>('/auth/forgot-password', { method: 'POST', body: { email } }),
  updateProfile: (input: { firstName?: string; lastName?: string; email?: string }) =>
    apiFetch<ProfileResponse>('/auth/profile', { method: 'PUT', body: input }),
  updatePreferences: (preferences: Partial<UserPreferences>) =>
    apiFetch<ProfileResponse>('/auth/preferences', { method: 'PUT', body: preferences }),
  addPassenger: (passenger: Omit<SavedPassenger, 'id'>) =>
    apiFetch<ProfileResponse>('/auth/passengers', { method: 'POST', body: passenger }),
  removePassenger: (id: string) =>
    apiFetch<ProfileResponse>(`/auth/passengers/${id}`, { method: 'DELETE' }),
};
