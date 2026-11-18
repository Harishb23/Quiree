import type { AxiosProgressEvent } from 'axios'
import { api } from './client'
import type {
  BusinessAnalytics,
  BusinessCategory,
  BusinessDashboard,
  BusinessDetail,
  BusinessMember,
  BusinessQr,
  BusinessRole,
  BusinessServiceItem,
  BusinessSummary,
  BusinessUpsertRequest,
  BulkQrCampaignRequest,
  CategoryAttribute,
  EnquiryDetail,
  EnquiryQuery,
  EnquiryRequest,
  EnquiryStatus,
  EnquirySummary,
  GalleryCategory,
  GalleryImage,
  Offer,
  OfferUpsertRequest,
  PagedResult,
  Product,
  ProductCategory,
  ProductQuery,
  ProductUpsertRequest,
  PublicBusiness,
  PublicOffer,
  PublicProduct,
  PublicService,
  QrCampaign,
  QrCampaignStats,
  QrCampaignUpsertRequest,
  QrResolveResult,
  Review,
  ReviewStatus,
  ServiceUpsertRequest,
  TrackableEvent,
} from '../types/business'

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

/** Upload progress callback: receives 0–100. */
export type ProgressFn = (percent: number) => void

const progress = (onProgress?: ProgressFn) =>
  onProgress
    ? {
        onUploadProgress: (e: AxiosProgressEvent) => {
          if (e.total) onProgress(Math.round((e.loaded / e.total) * 100))
        },
      }
    : undefined

function fileForm(field: string, files: File | File[], extra?: Record<string, string>) {
  const form = new FormData()
  for (const f of Array.isArray(files) ? files : [files]) form.append(field, f)
  if (extra) for (const [k, v] of Object.entries(extra)) form.append(k, v)
  return form
}

export const businessCategoriesApi = {
  list: () => data(api.get<BusinessCategory[]>('/business-categories')),
  attributes: (categoryId: number) => data(api.get<CategoryAttribute[]>(`/business-categories/${categoryId}/attributes`)),
}

/** Owner / team endpoints. Every call is authorised server-side by business role. */
export const businessApi = {
  mine: () => data(api.get<BusinessSummary[]>('/businesses/my-businesses')),
  get: (id: string) => data(api.get<BusinessDetail>(`/businesses/${id}`)),
  create: (body: BusinessUpsertRequest) => data(api.post<BusinessDetail>('/businesses', body)),
  update: (id: string, body: BusinessUpsertRequest) => data(api.put<BusinessDetail>(`/businesses/${id}`, body)),
  remove: (id: string) => api.delete(`/businesses/${id}`),
  publish: (id: string) => data(api.put<BusinessDetail>(`/businesses/${id}/publish`)),
  unpublish: (id: string) => data(api.put<BusinessDetail>(`/businesses/${id}/unpublish`)),
  updateSlug: (id: string, slug: string) => data(api.put<BusinessDetail>(`/businesses/${id}/slug`, { slug })),
  uploadLogo: (id: string, file: File, onProgress?: ProgressFn) =>
    data(api.post<BusinessDetail>(`/businesses/${id}/logo`, fileForm('file', file), progress(onProgress))),
  removeLogo: (id: string) => data(api.delete<BusinessDetail>(`/businesses/${id}/logo`)),
  uploadCover: (id: string, file: File, onProgress?: ProgressFn) =>
    data(api.post<BusinessDetail>(`/businesses/${id}/cover`, fileForm('file', file), progress(onProgress))),
  removeCover: (id: string) => data(api.delete<BusinessDetail>(`/businesses/${id}/cover`)),
  preview: (id: string) => data(api.get<PublicBusiness>(`/businesses/${id}/preview`)),

  members: (id: string) => data(api.get<BusinessMember[]>(`/businesses/${id}/members`)),
  addMember: (id: string, email: string, role: BusinessRole) =>
    data(api.post<BusinessMember>(`/businesses/${id}/members`, { email, role })),
  updateMember: (id: string, userId: string, role: BusinessRole) =>
    data(api.put<BusinessMember>(`/businesses/${id}/members/${userId}`, { role })),
  removeMember: (id: string, userId: string) => api.delete(`/businesses/${id}/members/${userId}`),

  dashboard: (id: string) => data(api.get<BusinessDashboard>(`/businesses/${id}/dashboard`)),
  analytics: (id: string, days: number) => data(api.get<BusinessAnalytics>(`/businesses/${id}/analytics`, { params: { days } })),

  qr: (id: string) => data(api.get<BusinessQr>(`/businesses/${id}/qr`)),
  regenerateQr: (id: string) => data(api.post<BusinessQr>(`/businesses/${id}/qr`)),
  setQrEnabled: (id: string, enabled: boolean) => data(api.put<BusinessQr>(`/businesses/${id}/qr`, { enabled })),
  qrPng: (id: string, size = 1000) =>
    data(api.get<Blob>(`/businesses/${id}/qr/png`, { params: { size }, responseType: 'blob' })),
  qrSvg: (id: string) => data(api.get<Blob>(`/businesses/${id}/qr/svg`, { responseType: 'blob' })),
}

export const businessCatalogApi = {
  productCategories: (id: string) => data(api.get<ProductCategory[]>(`/businesses/${id}/product-categories`)),
  createProductCategory: (id: string, name: string) =>
    data(api.post<ProductCategory>(`/businesses/${id}/product-categories`, { name })),
  updateProductCategory: (id: string, categoryId: string, name: string) =>
    data(api.put<ProductCategory>(`/businesses/${id}/product-categories/${categoryId}`, { name })),
  deleteProductCategory: (id: string, categoryId: string) => api.delete(`/businesses/${id}/product-categories/${categoryId}`),

  products: (id: string, query: ProductQuery) =>
    data(api.get<PagedResult<Product>>(`/businesses/${id}/products`, { params: query })),
  product: (id: string, productId: string) => data(api.get<Product>(`/businesses/${id}/products/${productId}`)),
  createProduct: (id: string, body: ProductUpsertRequest) => data(api.post<Product>(`/businesses/${id}/products`, body)),
  updateProduct: (id: string, productId: string, body: ProductUpsertRequest) =>
    data(api.put<Product>(`/businesses/${id}/products/${productId}`, body)),
  deleteProduct: (id: string, productId: string) => api.delete(`/businesses/${id}/products/${productId}`),
  addProductImages: (id: string, productId: string, files: File[], onProgress?: ProgressFn) =>
    data(api.post<Product>(`/businesses/${id}/products/${productId}/images`, fileForm('files', files), progress(onProgress))),
  removeProductImage: (id: string, productId: string, imageId: string) =>
    data(api.delete<Product>(`/businesses/${id}/products/${productId}/images/${imageId}`)),
  reorderProductImages: (id: string, productId: string, imageIds: string[]) =>
    data(api.put<Product>(`/businesses/${id}/products/${productId}/images/order`, { imageIds })),

  services: (id: string) => data(api.get<BusinessServiceItem[]>(`/businesses/${id}/services`)),
  createService: (id: string, body: ServiceUpsertRequest) => data(api.post<BusinessServiceItem>(`/businesses/${id}/services`, body)),
  updateService: (id: string, serviceId: string, body: ServiceUpsertRequest) =>
    data(api.put<BusinessServiceItem>(`/businesses/${id}/services/${serviceId}`, body)),
  deleteService: (id: string, serviceId: string) => api.delete(`/businesses/${id}/services/${serviceId}`),
  uploadServiceImage: (id: string, serviceId: string, file: File, onProgress?: ProgressFn) =>
    data(api.post<BusinessServiceItem>(`/businesses/${id}/services/${serviceId}/image`, fileForm('file', file), progress(onProgress))),
  removeServiceImage: (id: string, serviceId: string) =>
    data(api.delete<BusinessServiceItem>(`/businesses/${id}/services/${serviceId}/image`)),

  offers: (id: string) => data(api.get<Offer[]>(`/businesses/${id}/offers`)),
  createOffer: (id: string, body: OfferUpsertRequest) => data(api.post<Offer>(`/businesses/${id}/offers`, body)),
  updateOffer: (id: string, offerId: string, body: OfferUpsertRequest) =>
    data(api.put<Offer>(`/businesses/${id}/offers/${offerId}`, body)),
  deleteOffer: (id: string, offerId: string) => api.delete(`/businesses/${id}/offers/${offerId}`),
  uploadOfferBanner: (id: string, offerId: string, file: File, onProgress?: ProgressFn) =>
    data(api.post<Offer>(`/businesses/${id}/offers/${offerId}/banner`, fileForm('file', file), progress(onProgress))),
  removeOfferBanner: (id: string, offerId: string) => data(api.delete<Offer>(`/businesses/${id}/offers/${offerId}/banner`)),

  gallery: (id: string) => data(api.get<GalleryImage[]>(`/businesses/${id}/gallery`)),
  addGalleryImage: (id: string, file: File, category: GalleryCategory, caption: string, onProgress?: ProgressFn) =>
    data(api.post<GalleryImage>(`/businesses/${id}/gallery`, fileForm('file', file, { category, caption }), progress(onProgress))),
  updateGalleryImage: (id: string, imageId: string, category: GalleryCategory, caption: string | null) =>
    data(api.put<GalleryImage>(`/businesses/${id}/gallery/${imageId}`, { category, caption })),
  deleteGalleryImage: (id: string, imageId: string) => api.delete(`/businesses/${id}/gallery/${imageId}`),
}

export const businessEngagementApi = {
  enquiries: (id: string, query: EnquiryQuery) =>
    data(api.get<PagedResult<EnquirySummary>>(`/businesses/${id}/enquiries`, { params: query })),
  enquiry: (id: string, enquiryId: string) => data(api.get<EnquiryDetail>(`/businesses/${id}/enquiries/${enquiryId}`)),
  setEnquiryStatus: (id: string, enquiryId: string, status: EnquiryStatus, note?: string | null) =>
    data(api.put<EnquiryDetail>(`/businesses/${id}/enquiries/${enquiryId}/status`, { status, note: note ?? null })),
  respond: (id: string, enquiryId: string, message: string, sendEmail: boolean) =>
    data(api.post<EnquiryDetail>(`/businesses/${id}/enquiries/${enquiryId}/responses`, { message, sendEmail })),

  reviews: (id: string, status?: ReviewStatus) =>
    data(api.get<Review[]>(`/businesses/${id}/reviews`, { params: status ? { status } : undefined })),
  updateReview: (id: string, reviewId: string, status: ReviewStatus, ownerReply: string | null) =>
    data(api.put<Review>(`/businesses/${id}/reviews/${reviewId}`, { status, ownerReply })),
  deleteReview: (id: string, reviewId: string) => api.delete(`/businesses/${id}/reviews/${reviewId}`),
}

/** Anonymous storefront endpoints (no login). */
export const publicBusinessApi = {
  get: (slug: string) => data(api.get<PublicBusiness>(`/public/businesses/${encodeURIComponent(slug)}`)),
  products: (slug: string, query: ProductQuery) =>
    data(api.get<PagedResult<PublicProduct>>(`/public/businesses/${encodeURIComponent(slug)}/products`, { params: query })),
  product: (slug: string, productId: string) =>
    data(api.get<PublicProduct>(`/public/businesses/${encodeURIComponent(slug)}/products/${productId}`)),
  services: (slug: string) => data(api.get<PublicService[]>(`/public/businesses/${encodeURIComponent(slug)}/services`)),
  offers: (slug: string) => data(api.get<PublicOffer[]>(`/public/businesses/${encodeURIComponent(slug)}/offers`)),
  enquire: (slug: string, body: EnquiryRequest) =>
    data(api.post<{ id: string; message: string }>(`/public/businesses/${encodeURIComponent(slug)}/enquiries`, body)),
  review: (slug: string, body: { customerName: string; rating: number; comment: string | null }) =>
    data(api.post<{ message: string }>(`/public/businesses/${encodeURIComponent(slug)}/reviews`, body)),
  /** Fire-and-forget analytics; failures are ignored so tracking never affects customers. */
  track: (slug: string, type: TrackableEvent, productId?: string) => {
    api.post(`/public/businesses/${encodeURIComponent(slug)}/events`, { type, productId: productId ?? null }).catch(() => {})
  },
  resolveQr: (code: string) => data(api.get<QrResolveResult>(`/bq/${encodeURIComponent(code)}`)),
}

/** Extra QR codes per business (tables, packaging, banners). View/download: Editor+; changes: Manager+. */
export const qrCampaignsApi = {
  list: (id: string) => data(api.get<QrCampaign[]>(`/businesses/${id}/qr-campaigns`)),
  create: (id: string, body: QrCampaignUpsertRequest) => data(api.post<QrCampaign>(`/businesses/${id}/qr-campaigns`, body)),
  createBulk: (id: string, body: BulkQrCampaignRequest) => data(api.post<QrCampaign[]>(`/businesses/${id}/qr-campaigns/bulk`, body)),
  update: (id: string, campaignId: string, body: QrCampaignUpsertRequest) =>
    data(api.put<QrCampaign>(`/businesses/${id}/qr-campaigns/${campaignId}`, body)),
  remove: (id: string, campaignId: string) => api.delete(`/businesses/${id}/qr-campaigns/${campaignId}`),
  stats: (id: string, days: number) => data(api.get<QrCampaignStats>(`/businesses/${id}/qr-campaigns/stats`, { params: { days } })),
  /** ZIP of PNGs; empty ids = all campaigns. */
  downloadZip: (id: string, ids: string[]) =>
    data(
      api.get<Blob>(`/businesses/${id}/qr-campaigns/download`, {
        params: { ids },
        paramsSerializer: { indexes: null },
        responseType: 'blob',
      }),
    ),
}
