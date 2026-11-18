using ProLink.Application.DTOs;

namespace ProLink.Application.Interfaces;

public interface IBusinessCategoryService
{
    Task<IReadOnlyList<BusinessCategoryDto>> ListAsync(CancellationToken ct = default);
    Task<IReadOnlyList<CategoryAttributeDto>> GetAttributesAsync(int categoryId, CancellationToken ct = default);
}

public interface IBusinessProfileService
{
    Task<IReadOnlyList<BusinessSummaryDto>> ListMineAsync(Guid userId, CancellationToken ct = default);
    Task<BusinessDetailDto> GetAsync(Guid userId, Guid businessId, CancellationToken ct = default);
    Task<BusinessDetailDto> CreateAsync(Guid userId, BusinessUpsertRequest request, CancellationToken ct = default);
    Task<BusinessDetailDto> UpdateAsync(Guid userId, Guid businessId, BusinessUpsertRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid businessId, CancellationToken ct = default);
    Task<BusinessDetailDto> SetPublishedAsync(Guid userId, Guid businessId, bool publish, CancellationToken ct = default);
    Task<BusinessDetailDto> UpdateSlugAsync(Guid userId, Guid businessId, UpdateBusinessSlugRequest request, CancellationToken ct = default);
    Task<BusinessDetailDto> UploadImageAsync(Guid userId, Guid businessId, BusinessImageKind kind, Stream content, long length, CancellationToken ct = default);
    Task<BusinessDetailDto> RemoveImageAsync(Guid userId, Guid businessId, BusinessImageKind kind, CancellationToken ct = default);
    /// <summary>Renders the storefront exactly as customers will see it, even while in draft.</summary>
    Task<PublicBusinessDto> PreviewAsync(Guid userId, Guid businessId, CancellationToken ct = default);

    Task<IReadOnlyList<BusinessMemberDto>> ListMembersAsync(Guid userId, Guid businessId, CancellationToken ct = default);
    Task<BusinessMemberDto> AddMemberAsync(Guid userId, Guid businessId, AddBusinessMemberRequest request, CancellationToken ct = default);
    Task<BusinessMemberDto> UpdateMemberAsync(Guid userId, Guid businessId, Guid memberUserId, UpdateBusinessMemberRequest request, CancellationToken ct = default);
    Task RemoveMemberAsync(Guid userId, Guid businessId, Guid memberUserId, CancellationToken ct = default);
}

public enum BusinessImageKind
{
    Logo,
    Cover
}

public interface IBusinessCatalogService
{
    Task<IReadOnlyList<ProductCategoryDto>> ListProductCategoriesAsync(Guid userId, Guid businessId, CancellationToken ct = default);
    Task<ProductCategoryDto> CreateProductCategoryAsync(Guid userId, Guid businessId, ProductCategoryRequest request, CancellationToken ct = default);
    Task<ProductCategoryDto> UpdateProductCategoryAsync(Guid userId, Guid businessId, Guid categoryId, ProductCategoryRequest request, CancellationToken ct = default);
    Task DeleteProductCategoryAsync(Guid userId, Guid businessId, Guid categoryId, CancellationToken ct = default);

    Task<PagedResult<ProductDto>> ListProductsAsync(Guid userId, Guid businessId, ProductQuery query, CancellationToken ct = default);
    Task<ProductDto> GetProductAsync(Guid userId, Guid businessId, Guid productId, CancellationToken ct = default);
    Task<ProductDto> CreateProductAsync(Guid userId, Guid businessId, ProductUpsertRequest request, CancellationToken ct = default);
    Task<ProductDto> UpdateProductAsync(Guid userId, Guid businessId, Guid productId, ProductUpsertRequest request, CancellationToken ct = default);
    Task DeleteProductAsync(Guid userId, Guid businessId, Guid productId, CancellationToken ct = default);
    Task<ProductDto> AddProductImageAsync(Guid userId, Guid businessId, Guid productId, Stream content, long length, CancellationToken ct = default);
    Task<ProductDto> RemoveProductImageAsync(Guid userId, Guid businessId, Guid productId, Guid imageId, CancellationToken ct = default);
    Task<ProductDto> ReorderProductImagesAsync(Guid userId, Guid businessId, Guid productId, IReadOnlyList<Guid> imageIds, CancellationToken ct = default);

    Task<IReadOnlyList<BusinessServiceDto>> ListServicesAsync(Guid userId, Guid businessId, CancellationToken ct = default);
    Task<BusinessServiceDto> CreateServiceAsync(Guid userId, Guid businessId, ServiceUpsertRequest request, CancellationToken ct = default);
    Task<BusinessServiceDto> UpdateServiceAsync(Guid userId, Guid businessId, Guid serviceId, ServiceUpsertRequest request, CancellationToken ct = default);
    Task DeleteServiceAsync(Guid userId, Guid businessId, Guid serviceId, CancellationToken ct = default);
    Task<BusinessServiceDto> SetServiceImageAsync(Guid userId, Guid businessId, Guid serviceId, Stream? content, long length, CancellationToken ct = default);

    Task<IReadOnlyList<OfferDto>> ListOffersAsync(Guid userId, Guid businessId, CancellationToken ct = default);
    Task<OfferDto> CreateOfferAsync(Guid userId, Guid businessId, OfferUpsertRequest request, CancellationToken ct = default);
    Task<OfferDto> UpdateOfferAsync(Guid userId, Guid businessId, Guid offerId, OfferUpsertRequest request, CancellationToken ct = default);
    Task DeleteOfferAsync(Guid userId, Guid businessId, Guid offerId, CancellationToken ct = default);
    Task<OfferDto> SetOfferBannerAsync(Guid userId, Guid businessId, Guid offerId, Stream? content, long length, CancellationToken ct = default);

    Task<IReadOnlyList<GalleryImageDto>> ListGalleryAsync(Guid userId, Guid businessId, CancellationToken ct = default);
    Task<GalleryImageDto> AddGalleryImageAsync(Guid userId, Guid businessId, Stream content, long length, GalleryUpdateRequest meta, CancellationToken ct = default);
    Task<GalleryImageDto> UpdateGalleryImageAsync(Guid userId, Guid businessId, Guid imageId, GalleryUpdateRequest request, CancellationToken ct = default);
    Task DeleteGalleryImageAsync(Guid userId, Guid businessId, Guid imageId, CancellationToken ct = default);
}

public interface IBusinessEngagementService
{
    Task<Guid> SubmitEnquiryAsync(string slug, CreateBusinessEnquiryRequest request, VisitorContext visitor, CancellationToken ct = default);
    Task<PagedResult<EnquirySummaryDto>> ListEnquiriesAsync(Guid userId, Guid businessId, EnquiryQuery query, CancellationToken ct = default);
    Task<EnquiryDetailDto> GetEnquiryAsync(Guid userId, Guid businessId, Guid enquiryId, CancellationToken ct = default);
    Task<EnquiryDetailDto> UpdateEnquiryStatusAsync(Guid userId, Guid businessId, Guid enquiryId, UpdateEnquiryStatusRequest request, CancellationToken ct = default);
    Task<EnquiryDetailDto> RespondToEnquiryAsync(Guid userId, Guid businessId, Guid enquiryId, RespondEnquiryRequest request, CancellationToken ct = default);

    Task SubmitReviewAsync(string slug, CreateReviewRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<ReviewDto>> ListReviewsAsync(Guid userId, Guid businessId, Domain.Enums.ReviewStatus? status, CancellationToken ct = default);
    Task<ReviewDto> UpdateReviewAsync(Guid userId, Guid businessId, Guid reviewId, UpdateReviewRequest request, CancellationToken ct = default);
    Task DeleteReviewAsync(Guid userId, Guid businessId, Guid reviewId, CancellationToken ct = default);
}

public interface IBusinessQrService
{
    Task<BusinessQrDto> GetAsync(Guid userId, Guid businessId, CancellationToken ct = default);
    Task<BusinessQrDto> SetEnabledAsync(Guid userId, Guid businessId, bool enabled, CancellationToken ct = default);
    /// <summary>Issues a new QR code. Previously printed codes stop working.</summary>
    Task<BusinessQrDto> RegenerateAsync(Guid userId, Guid businessId, CancellationToken ct = default);
    Task<byte[]> GetPngAsync(Guid userId, Guid businessId, int size, CancellationToken ct = default);
    Task<string> GetSvgAsync(Guid userId, Guid businessId, CancellationToken ct = default);
    /// <summary>Resolves a scanned code to the business slug and records the scan.</summary>
    Task<QrResolveDto> ResolveAsync(string code, VisitorContext visitor, CancellationToken ct = default);
}

public interface IBusinessAnalyticsService
{
    Task TrackAsync(string slug, TrackEventRequest request, VisitorContext visitor, CancellationToken ct = default);
    Task<BusinessAnalyticsDto> GetAnalyticsAsync(Guid userId, Guid businessId, int days, CancellationToken ct = default);
    Task<BusinessDashboardDto> GetDashboardAsync(Guid userId, Guid businessId, CancellationToken ct = default);
}

public interface IPublicBusinessService
{
    Task<PublicBusinessDto> GetAsync(string slug, CancellationToken ct = default);
    Task<PagedResult<PublicProductDto>> ListProductsAsync(string slug, ProductQuery query, CancellationToken ct = default);
    Task<PublicProductDto> GetProductAsync(string slug, Guid productId, CancellationToken ct = default);
    Task<IReadOnlyList<PublicServiceDto>> ListServicesAsync(string slug, CancellationToken ct = default);
    Task<IReadOnlyList<PublicOfferDto>> ListOffersAsync(string slug, CancellationToken ct = default);
}
