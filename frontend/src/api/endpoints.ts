import { api } from './client'
import type {
  AuthResponse,
  CreateOrderResponse,
  CurrentUser,
  DashboardOverview,
  EnquiryRequest,
  ModeDetail,
  ModeSummary,
  ModeUpsertRequest,
  PaymentRecord,
  Plan,
  Profile,
  PublicProfile,
  PublicSettings,
  QrCodeInfo,
  RegisterRequest,
  SubscriptionStatusInfo,
  TemplateInfo,
  UpdateProfileRequest,
  UsernameAvailability,
  VerifyPaymentRequest,
} from '../types/api'

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export const authApi = {
  register: (body: RegisterRequest) => data(api.post<AuthResponse>('/auth/register', body)),
  login: (email: string, password: string) => data(api.post<AuthResponse>('/auth/login', { email, password })),
  google: (idToken: string) => data(api.post<AuthResponse>('/auth/google', { idToken })),
  forgotPassword: (email: string) => data(api.post<{ message: string }>('/auth/forgot-password', { email })),
  resetPassword: (email: string, token: string, newPassword: string) =>
    data(api.post<{ message: string }>('/auth/reset-password', { email, token, newPassword })),
  me: () => data(api.get<CurrentUser>('/auth/me')),
  changePassword: (currentPassword: string | null, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  logout: () => api.post('/auth/logout'),
  usernameAvailable: (username: string) =>
    data(api.get<UsernameAvailability>('/auth/username-available', { params: { username } })),
}

export const profileApi = {
  get: () => data(api.get<Profile>('/profile')),
  update: (body: UpdateProfileRequest) => data(api.put<Profile>('/profile', body)),
  uploadPhoto: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return data(api.post<Profile>('/profile/photo', form))
  },
  removePhoto: () => data(api.delete<Profile>('/profile/photo')),
}

export const modesApi = {
  list: () => data(api.get<ModeSummary[]>('/modes')),
  get: (id: string) => data(api.get<ModeDetail>(`/modes/${id}`)),
  create: (body: ModeUpsertRequest) => data(api.post<ModeDetail>('/modes', body)),
  update: (id: string, body: ModeUpsertRequest) => data(api.put<ModeDetail>(`/modes/${id}`, body)),
  remove: (id: string) => api.delete(`/modes/${id}`),
  setPublished: (id: string, isPublished: boolean) =>
    data(api.patch<ModeSummary>(`/modes/${id}/publish`, { isPublished })),
  setDefault: (id: string) => data(api.post<ModeSummary[]>(`/modes/${id}/default`)),
  assignTemplate: (id: string, templateId: number) =>
    data(api.put<ModeSummary>(`/modes/${id}/template`, { templateId })),
  preview: (id: string) => data(api.get<PublicProfile>(`/modes/${id}/preview`)),
}

export const templatesApi = {
  list: () => data(api.get<TemplateInfo[]>('/templates')),
}

export const qrApi = {
  info: () => data(api.get<QrCodeInfo>('/qr')),
  png: (size = 600) => data(api.get<Blob>('/qr/png', { params: { size }, responseType: 'blob' })),
  svg: () => data(api.get<Blob>('/qr/svg', { responseType: 'blob' })),
}

export const publicApi = {
  get: (slug: string) => data(api.get<PublicProfile>(`/public/${encodeURIComponent(slug)}`)),
  vcardUrl: (slug: string, modeId?: string) =>
    `${api.defaults.baseURL}/public/${encodeURIComponent(slug)}/vcard${modeId ? `?modeId=${modeId}` : ''}`,
  manifestUrl: (slug: string) => `${api.defaults.baseURL}/public/${encodeURIComponent(slug)}/manifest.webmanifest`,
  qrManifestUrl: (slug: string) => `${api.defaults.baseURL}/public/${encodeURIComponent(slug)}/qr-manifest.webmanifest`,
  qrUrl: (slug: string) => `${api.defaults.baseURL}/public/${encodeURIComponent(slug)}/qr.png`,
}

export const subscriptionApi = {
  plans: () => data(api.get<Plan[]>('/subscription/plans')),
  status: () => data(api.get<SubscriptionStatusInfo>('/subscription')),
  createOrder: (planId: number) => data(api.post<CreateOrderResponse>('/subscription/orders', { planId })),
  verify: (body: VerifyPaymentRequest) => data(api.post<SubscriptionStatusInfo>('/subscription/verify', body)),
  payments: () => data(api.get<PaymentRecord[]>('/subscription/payments')),
}

export const dashboardApi = {
  overview: () => data(api.get<DashboardOverview>('/dashboard')),
}

export const accountApi = {
  getPublicSettings: () => data(api.get<PublicSettings>('/account/public-settings')),
  updatePublicSettings: (isPublic: boolean, allowViewerModeSelection: boolean) =>
    data(api.put<PublicSettings>('/account/public-settings', { isPublic, allowViewerModeSelection })),
}

export const enquiryApi = {
  create: (body: EnquiryRequest) => data(api.post<{ id: string; message: string }>('/enquiries', body)),
}
