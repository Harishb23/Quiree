export const config = {
  appName: import.meta.env.VITE_APP_NAME || 'ProLink ID',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
} as const
