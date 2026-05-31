import apiClient from './client';
import type { AuthResponse, AuthUser } from '../types';

const unwrap = <T>(res: { data: T }): T => res.data;

export const authApi = {
  login: (identifier: string, password: string): Promise<AuthResponse> =>
    apiClient.post('/auth/login', { identifier, password }).then(unwrap),

  logout: (): Promise<void> =>
    apiClient.post('/auth/logout'),

  me: (): Promise<{ user: AuthUser }> =>
    apiClient.get('/auth/me').then(unwrap),
};
