using ProLink.Application.DTOs;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;

namespace ProLink.Application.Interfaces;

public sealed record BusinessAccess(Business Business, BusinessRole Role);

public sealed record EventRow(BusinessEventType Type, string VisitorHash, DateTime OccurredAt);

public sealed record ScanRow(Guid? CampaignId, string VisitorHash, DateTime OccurredAt);

public interface IBusinessCategoryRepository
{
    Task<List<BusinessCategory>> ListAsync(CancellationToken ct = default);
    Task<BusinessCategory?> GetAsync(int id, bool includeAttributes, CancellationToken ct = default);
    Task<List<BusinessCategoryAttribute>> ListAttributesAsync(int categoryId, CancellationToken ct = default);
}

public interface IBusinessRepository
{
    /// <summary>Businesses the user owns or is a team member of, with the user's role.</summary>
    Task<List<BusinessAccess>> ListForUserAsync(Guid userId, CancellationToken ct = default);
    Task<int> CountOwnedAsync(Guid userId, CancellationToken ct = default);
    Task<bool> SlugExistsAsync(string slug, Guid? excludeId, CancellationToken ct = default);
    Task<bool> QrCodeExistsAsync(string code, CancellationToken ct = default);

    /// <summary>Loads a tracked business (with category, subcategory, links and hours) and the caller's role, or null.</summary>
    Task<BusinessAccess?> GetAccessAsync(Guid businessId, Guid userId, CancellationToken ct = default);
    Task<bool> IsTeamMemberAsync(Guid businessId, Guid userId, CancellationToken ct = default);

    /// <summary>Published, active business by slug (read-only, with links and hours).</summary>
    Task<Business?> GetPublicBySlugAsync(string slug, CancellationToken ct = default);
    Task<Business?> GetByQrCodeAsync(string code, CancellationToken ct = default);

    /// <summary>Every uploaded file URL owned by the business (for cleanup on delete).</summary>
    Task<List<string>> ListFileUrlsAsync(Guid businessId, CancellationToken ct = default);
    void Add(Business business);

    Task<List<BusinessMember>> ListMembersAsync(Guid businessId, CancellationToken ct = default);
    Task<BusinessMember?> GetMemberAsync(Guid businessId, Guid userId, CancellationToken ct = default);
    void AddMember(BusinessMember member);
}

public interface IBusinessCatalogRepository
{
    // Product categories
    Task<List<(BusinessProductCategory Category, int ProductCount)>> ListProductCategoriesAsync(Guid businessId,
        bool publicOnly, CancellationToken ct = default);
    Task<BusinessProductCategory?> GetProductCategoryAsync(Guid businessId, Guid id, CancellationToken ct = default);
    Task<bool> ProductCategoryNameExistsAsync(Guid businessId, string name, Guid? excludeId, CancellationToken ct = default);
    Task ClearProductCategoryAsync(Guid categoryId, CancellationToken ct = default);
    void AddProductCategory(BusinessProductCategory category);

    // Products
    Task<(List<BusinessProduct> Items, int Total)> QueryProductsAsync(Guid businessId, ProductQuery query, bool publicOnly,
        CancellationToken ct = default);
    Task<BusinessProduct?> GetProductAsync(Guid businessId, Guid productId, CancellationToken ct = default);
    Task<List<BusinessProduct>> ListFeaturedProductsAsync(Guid businessId, int take, CancellationToken ct = default);
    Task<Dictionary<Guid, BusinessProduct>> GetProductsAsync(Guid businessId, IEnumerable<Guid> ids, CancellationToken ct = default);
    Task<bool> SkuExistsAsync(Guid businessId, string sku, Guid? excludeId, CancellationToken ct = default);
    Task<int> CountProductsAsync(Guid businessId, bool publicOnly, CancellationToken ct = default);
    void AddProduct(BusinessProduct product);
    void AddProductImage(BusinessProductImage image);

    // Services
    Task<List<BusinessService>> ListServicesAsync(Guid businessId, bool availableOnly, CancellationToken ct = default);
    Task<BusinessService?> GetServiceAsync(Guid businessId, Guid serviceId, CancellationToken ct = default);
    void AddService(BusinessService service);

    // Offers
    Task<List<BusinessOffer>> ListOffersAsync(Guid businessId, CancellationToken ct = default);
    /// <summary>Active offers whose date window includes <paramref name="today"/> (business-local date).</summary>
    Task<List<BusinessOffer>> ListLiveOffersAsync(Guid businessId, DateOnly today, CancellationToken ct = default);
    Task<BusinessOffer?> GetOfferAsync(Guid businessId, Guid offerId, CancellationToken ct = default);
    void AddOffer(BusinessOffer offer);

    // Gallery
    Task<List<BusinessGalleryImage>> ListGalleryAsync(Guid businessId, CancellationToken ct = default);
    Task<BusinessGalleryImage?> GetGalleryImageAsync(Guid businessId, Guid imageId, CancellationToken ct = default);
    Task<int> CountGalleryAsync(Guid businessId, CancellationToken ct = default);
    void AddGalleryImage(BusinessGalleryImage image);
}

public interface IBusinessEngagementRepository
{
    // Reviews
    Task<List<BusinessReview>> ListReviewsAsync(Guid businessId, ReviewStatus? status, int take, CancellationToken ct = default);
    Task<BusinessReview?> GetReviewAsync(Guid businessId, Guid reviewId, CancellationToken ct = default);
    /// <summary>Count of approved reviews per star rating (index 0 = 1 star).</summary>
    Task<int[]> GetRatingDistributionAsync(Guid businessId, CancellationToken ct = default);
    Task<int> CountReviewsAsync(Guid businessId, ReviewStatus status, CancellationToken ct = default);
    void AddReview(BusinessReview review);

    // Enquiries
    Task<(List<BusinessEnquiry> Items, int Total)> QueryEnquiriesAsync(Guid businessId, EnquiryQuery query, CancellationToken ct = default);
    Task<BusinessEnquiry?> GetEnquiryAsync(Guid businessId, Guid enquiryId, CancellationToken ct = default);
    Task<int> CountEnquiriesAsync(Guid businessId, BusinessEnquiryStatus? status, DateTime? since, CancellationToken ct = default);
    void AddEnquiry(BusinessEnquiry enquiry);
    void AddEnquiryActivity(BusinessEnquiryActivity activity);
}

public interface IBusinessAnalyticsRepository
{
    void AddEvent(BusinessAnalyticsEvent analyticsEvent);
    Task<bool> HasRecentEventAsync(Guid businessId, string visitorHash, BusinessEventType type, Guid? productId,
        DateTime since, CancellationToken ct = default, Guid? campaignId = null);
    /// <summary>Lightweight rows for in-memory aggregation (bucketed in the business's time zone).</summary>
    Task<List<EventRow>> ListEventsAsync(Guid businessId, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default);
    Task<List<(Guid ProductId, int Views)>> TopProductsAsync(Guid businessId, DateTime fromUtc, DateTime toUtc, int take,
        CancellationToken ct = default);
    Task<int> CountAsync(Guid businessId, BusinessEventType type, DateTime? sinceUtc, CancellationToken ct = default);
    Task<List<BusinessAnalyticsEvent>> RecentAsync(Guid businessId, int take, CancellationToken ct = default);
    Task<List<ScanRow>> ListScansAsync(Guid businessId, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default);
    /// <summary>Scan counts per campaign: total and since the given instant.</summary>
    Task<Dictionary<Guid, (int Total, int Recent)>> CampaignScanCountsAsync(Guid businessId, DateTime sinceUtc, CancellationToken ct = default);
}

public interface IBusinessQrCampaignRepository
{
    Task<List<BusinessQrCampaign>> ListAsync(Guid businessId, CancellationToken ct = default);
    Task<BusinessQrCampaign?> GetAsync(Guid businessId, Guid campaignId, CancellationToken ct = default);
    /// <summary>Campaign by code with its business (read-only), for resolving scans.</summary>
    Task<BusinessQrCampaign?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<int> CountAsync(Guid businessId, CancellationToken ct = default);
    Task<bool> NameExistsAsync(Guid businessId, string name, Guid? excludeId, CancellationToken ct = default);
    void Add(BusinessQrCampaign campaign);
}
