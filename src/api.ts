import { Usuario, CheckDiario, Medida, ComparativoData } from './types';

const API_BASE = '/api';

// Simple token storage helpers
export function getSavedToken(): string | null {
  return localStorage.getItem('d90_token');
}

export function saveToken(token: string) {
  localStorage.setItem('d90_token', token);
}

export function getSavedUsuario(): Usuario | null {
  const data = localStorage.getItem('d90_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveUsuario(user: Usuario) {
  localStorage.setItem('d90_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('d90_token');
  localStorage.removeItem('d90_user');
}

// Request Helper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getSavedToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as any;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Clear expired session and reload
      clearSession();
      window.dispatchEvent(new Event('auth-expired'));
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Erro de rede: Código ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Public users list
  getUsers: () => request<Usuario[]>('/auth/users'),

  // Login
  login: (nome: string, pin: string) =>
    request<{ token: string; usuario: Usuario }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ nome, pin }),
    }),

  changePin: (newPin: string) =>
    request<{ success: boolean }>('/auth/change-pin', {
      method: 'POST',
      body: JSON.stringify({ newPin }),
    }),

  // Validate Token / Fetch current user profile
  getMe: () => request<Usuario>('/usuario/me'),

  // Upload photo to Vercel Blob via API
  uploadFoto: async (file: File): Promise<{ url: string }> => {
    const token = getSavedToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers = {} as any;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearSession();
        window.dispatchEvent(new Event('auth-expired'));
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Erro de rede: Código ${response.status}`);
    }

    return response.json();
  },

  // Participant: Daily Checks
  getChecks: () => request<CheckDiario[]>('/checks'),
  saveCheck: (data: string, checks: { treino: boolean; dieta: boolean; zero_doce: boolean; zero_besteira: boolean; agua: boolean }) =>
    request<CheckDiario>('/checks', {
      method: 'POST',
      body: JSON.stringify({ data, ...checks }),
    }),

  // Participant: Measures
  getMedidas: () => request<Medida[]>('/medidas'),
  addMedida: (data: {
    data: string;
    peso: number;
    braco_direito?: number;
    braco_esquerdo?: number;
    perna_direita?: number;
    perna_esquerda?: number;
    barriga?: number;
    cintura?: number;
    quadril?: number;
    peito?: number;
    observacao?: string;
    braço?: number;
    foto_url?: string;
  }) =>
    request<Medida>('/medidas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Participant: Dieta Itens
  getItensDieta: () => request<any[]>('/dieta/itens'),
  saveItemDieta: (item: { id?: number; nome_refeicao: string; descricao?: string; ordem: number }) =>
    request<any>('/dieta/itens', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  deleteItemDieta: (id: number) =>
    request<{ success: boolean }>(`/dieta/itens/${id}`, {
      method: 'DELETE',
    }),

  // Participant: Dieta Checks
  getChecksDieta: (data: string) => request<any[]>(`/dieta/checks?data=${data}`),
  saveChecksDieta: (data: string, checks: { item_dieta_id: number; cumprido: boolean; e_refeicao_livre?: boolean }[]) =>
    request<any[]>('/dieta/checks', {
      method: 'POST',
      body: JSON.stringify({ data, checks }),
    }),

  // Participant: Progress Photos
  getFotosProgresso: () => request<any[]>('/fotos-progresso'),
  addFotoProgresso: (foto: { data: string; foto_url: string; legenda?: string; angulo?: string }) =>
    request<any>('/fotos-progresso', {
      method: 'POST',
      body: JSON.stringify(foto),
    }),

  // Admin: Comparative Data
  getComparativo: () => request<ComparativoData[]>('/admin/comparativo'),

  // Challenge Config
  getDesafioConfig: () => request<any>('/desafio/config'),
  saveDesafioConfig: (config: { data_inicio: string; dia_lixo_semana: number }) =>
    request<any>('/desafio/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
};
