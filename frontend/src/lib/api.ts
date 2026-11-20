export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('pm_access_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem('pm_access_token');
    localStorage.removeItem('pm_user');
    window.dispatchEvent(new Event('auth-logout'));
  }

  if (!response.ok) {
    let errorDetail = 'API Request Failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || errJson.detail || errorDetail;
    } catch {}
    throw new Error(errorDetail);
  }

  // Handle file/csv downloads
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/pdf') || contentType?.includes('text/plain') || contentType?.includes('csv')) {
    return response as any;
  }

  return response.json();
}
