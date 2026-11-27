import { CaDetails, StoredClientCert, CrlDetails, CaddyConfig, SyncResult, AuthStatus, SystemConfig } from '../types.ts';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // The session lives in an HttpOnly cookie that the browser sends automatically.
  const headers = new Headers(options.headers || {});

  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // Only an expired/revoked session returns AUTH_REQUIRED. Wrong-password answers (login, change password)
    // are ordinary errors shown in their own form.
    const body = await res.clone().json().catch(() => null);
    if (body?.code === 'AUTH_REQUIRED') {
      window.dispatchEvent(new CustomEvent('auth-unauthorized'));
      throw new Error('Your session has expired. Please sign in again.');
    }
  }

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      if (data.error || data.message) {
        errorMsg = data.error || data.message;
      }
    } catch {
      const text = await res.text();
      if (text) errorMsg = text;
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  async getAuthStatus(): Promise<AuthStatus> {
    return request<AuthStatus>('/api/auth/status');
  },

  async login(username: string, password: string): Promise<AuthStatus> {
    return request<AuthStatus>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async setupAccount(username: string, password: string): Promise<AuthStatus> {
    return request<AuthStatus>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async logout(): Promise<void> {
    await request('/api/auth/logout', { method: 'POST' });
  },

  async logoutAll(): Promise<{ ok: boolean; revoked: number }> {
    return request<{ ok: boolean; revoked: number }>('/api/auth/logout-all', { method: 'POST' });
  },

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ ok: boolean; otherSessionsSignedOut: number }> {
    return request<{ ok: boolean; otherSessionsSignedOut: number }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // System Config
  async getSystemConfig(): Promise<SystemConfig> {
    return request<SystemConfig>('/api/system/config');
  },

  // CA
  async getCaDetails(): Promise<CaDetails> {
    return request<CaDetails>('/api/ca');
  },

  async initRootCa(data: {
    commonName: string;
    organization: string;
    organizationalUnit?: string;
    country?: string;
    validityDays: number;
    keySize: 2048 | 4096;
    wipeExistingCerts?: boolean;
  }): Promise<{ success: boolean; ca: CaDetails }> {
    return request<{ success: boolean; ca: CaDetails }>('/api/ca/init', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getCaDownloadUrl(): string {
    return '/api/ca/download';
  },

  // Certificates
  async getCertificates(): Promise<StoredClientCert[]> {
    return request<StoredClientCert[]>('/api/certs');
  },

  async issueClientCert(data: {
    personalizedName: string;
    organization?: string;
    organizationalUnit?: string;
    validityDays: number;
    p12Password?: string | null;
    allowedHosts?: string[];
    emailAddress?: string;
    sanDns?: string[];
    notes?: string;
  }): Promise<{ success: boolean; cert: StoredClientCert }> {
    return request<{ success: boolean; cert: StoredClientCert }>('/api/certs/issue', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async revokeCert(id: string, reason: string): Promise<{ success: boolean; cert: StoredClientCert; caddySync?: any }> {
    return request<{ success: boolean; cert: StoredClientCert; caddySync?: any }>(`/api/certs/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async deleteCert(id: string): Promise<{ success: boolean; message: string; caddySync?: any }> {
    return request<{ success: boolean; message: string; caddySync?: any }>(`/api/certs/${id}`, {
      method: 'DELETE',
    });
  },

  getCertDownloadUrl(id: string, type: 'p12' | 'crt' | 'key'): string {
    return `/api/certs/${id}/download/${type}`;
  },

  // CRL
  async getCrl(): Promise<CrlDetails> {
    return request<CrlDetails>('/api/crl');
  },

  getCrlDownloadUrl(): string {
    return '/api/crl/download';
  },

  // Caddy
  async getCaddyConfig(): Promise<CaddyConfig> {
    return request<CaddyConfig>('/api/caddy/config');
  },

  async saveCaddyConfig(config: Partial<CaddyConfig>): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/caddy/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async testCaddyConnection(config: Partial<CaddyConfig>): Promise<{ success: boolean; message: string; details?: string }> {
    return request<{ success: boolean; message: string; details?: string }>('/api/caddy/test', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async syncCaddy(): Promise<SyncResult> {
    return request<SyncResult>('/api/caddy/sync', {
      method: 'POST',
    });
  },

  async syncLocalCaddy(): Promise<SyncResult> {
    return request<SyncResult>('/api/caddy/sync-local', {
      method: 'POST',
    });
  },
};
