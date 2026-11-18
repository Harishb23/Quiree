using System.ComponentModel.DataAnnotations;
using ProLink.Application.Common;
using ProLink.Domain.Enums;

namespace ProLink.Application.DTOs;

// ===========================================================================
// Shared
// ===========================================================================

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

public sealed record ImageDto(Guid Id, string Url);

// ===========================================================================
// Categories
// ===========================================================================

public sealed record BusinessSubcategoryDto(int Id, string Name);

public sealed record BusinessCategoryDto(int Id, string Key, string Name, string Icon,
    IReadOnlyList<BusinessSubcategoryDto> Subcategories);

public sealed record CategoryAttributeDto(int Id, string Key, string Label, AttributeInputType InputType,
    IReadOnlyList<string> Options, bool IsRequired);

// ===========================================================================
// Business profile
// ===========================================================================

public sealed class WorkingHourDto
{
    public DayOfWeek Day { get; set; }
    public bool IsClosed { get; set; }
    /// <summary>24-hour "HH:mm".</summary>
    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Use HH:mm (24-hour) times.")]
    public string? Opens { get; set; }
    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Use HH:mm (24-hour) times.")]
    public string? Closes { get; set; }
}

public sealed class SpecialHourDto
{
    public DateOnly Date { get; set; }
    public bool IsClosed { get; set; } = true;
    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Use HH:mm (24-hour) times.")]
    public string? Opens { get; set; }
    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Use HH:mm (24-hour) times.")]
    public string? Closes { get; set; }
    [MaxLength(150)]
    public string? Note { get; set; }
}

public sealed class BusinessSocialLinkDto
{
    public BusinessSocialPlatform Platform { get; set; }
    [MaxLength(50)]
    public string? Label { get; set; }
    [Required, MaxLength(500), SafeUrl]
    public string Url { get; set; } = string.Empty;
}

/// <summary>Create / update payload for a business profile (all wizard steps).</summary>
public sealed class BusinessUpsertRequest : IValidatableObject
{
    // Step 1 — basics
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;
    [Range(1, int.MaxValue, ErrorMessage = "Please choose a business category.")]
    public int CategoryId { get; set; }
    public int? SubcategoryId { get; set; }
    [MaxLength(3000)]
    public string? Description { get; set; }
    [Range(1800, 2100)]
    public int? YearEstablished { get; set; }
    [EmailAddress, MaxLength(256)]
    public string? Email { get; set; }
    [MaxLength(30), RegularExpression(@"^[0-9+()\-\s]{6,30}$", ErrorMessage = "Enter a valid phone number.")]
    public string? Phone { get; set; }
    [MaxLength(30), RegularExpression(@"^[0-9+()\-\s]{6,30}$", ErrorMessage = "Enter a valid WhatsApp number.")]
    public string? WhatsApp { get; set; }

    // Step 2 — address
    [MaxLength(200)] public string? AddressLine1 { get; set; }
    [MaxLength(200)] public string? AddressLine2 { get; set; }
    [MaxLength(100)] public string? City { get; set; }
    [MaxLength(100)] public string? State { get; set; }
    [MaxLength(100)] public string? Country { get; set; }
    [MaxLength(20)] public string? PostalCode { get; set; }
    [MaxLength(500), SafeUrl] public string? MapsUrl { get; set; }
    [Range(-90, 90)] public double? Latitude { get; set; }
    [Range(-180, 180)] public double? Longitude { get; set; }
    [MaxLength(64)] public string? TimeZone { get; set; }

    // Step 3 — operations
    public List<WorkingHourDto> WorkingHours { get; set; } = [];
    public List<SpecialHourDto> SpecialHours { get; set; } = [];
    public bool DeliveryAvailable { get; set; }
    public bool PickupAvailable { get; set; }
    public List<PaymentMethods> PaymentMethods { get; set; } = [];

    // Step 4 — online presence
    [MaxLength(300), SafeUrl] public string? Website { get; set; }
    public List<BusinessSocialLinkDto> SocialLinks { get; set; } = [];

    // Step 5 — customisation
    [RegularExpression("^(classic|elegant|bold|minimal)$", ErrorMessage = "Unknown theme.")]
    public string Theme { get; set; } = "classic";
    [RegularExpression("^#[0-9A-Fa-f]{6}$", ErrorMessage = "Brand colour must be a hex colour like #6B3FA0.")]
    public string BrandColor { get; set; } = "#6B3FA0";
    [RegularExpression("^(grid|list)$", ErrorMessage = "Layout must be grid or list.")]
    public string Layout { get; set; } = "grid";
    public List<string> FeaturedSections { get; set; } = [];

    public static readonly string[] SectionKeys = ["offers", "products", "services", "gallery", "reviews", "info"];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (WorkingHours.GroupBy(h => h.Day).Any(g => g.Count() > 1))
            yield return new ValidationResult("Each day can only appear once in working hours.", [nameof(WorkingHours)]);
        foreach (var h in WorkingHours.Where(h => !h.IsClosed))
        {
            if (string.IsNullOrEmpty(h.Opens) || string.IsNullOrEmpty(h.Closes))
                yield return new ValidationResult($"Set opening and closing times for {h.Day}, or mark it closed.", [nameof(WorkingHours)]);
            else if (string.CompareOrdinal(h.Opens, h.Closes) == 0)
                yield return new ValidationResult($"{h.Day}: opening and closing times can't be the same.", [nameof(WorkingHours)]);
        }
        if (SpecialHours.Count > 60)
            yield return new ValidationResult("You can add up to 60 special dates.", [nameof(SpecialHours)]);
        if (SpecialHours.GroupBy(h => h.Date).Any(g => g.Count() > 1))
            yield return new ValidationResult("Each special date can only appear once.", [nameof(SpecialHours)]);
        foreach (var h in SpecialHours.Where(h => !h.IsClosed && (string.IsNullOrEmpty(h.Opens) || string.IsNullOrEmpty(h.Closes))))
            yield return new ValidationResult($"Set hours for {h.Date:yyyy-MM-dd}, or mark it closed.", [nameof(SpecialHours)]);
        if (SocialLinks.Count > 12)
            yield return new ValidationResult("You can add up to 12 social links.", [nameof(SocialLinks)]);
        if (FeaturedSections.Any(s => !SectionKeys.Contains(s)))
            yield return new ValidationResult("Unknown profile section.", [nameof(FeaturedSections)]);
        if ((Latitude is null) != (Longitude is null))
            yield return new ValidationResult("Provide both latitude and longitude, or neither.", [nameof(Latitude)]);
    }
}

public sealed class UpdateBusinessSlugRequest
{
    [Required, MinLength(3), MaxLength(60)]
    public string Slug { get; set; } = string.Empty;
}

public sealed record BusinessSummaryDto(
    Guid Id,
    string Name,
    string Slug,
    string CategoryName,
    string CategoryIcon,
    string? LogoUrl,
    string? City,
    BusinessStatus Status,
    BusinessRole MyRole,
    string PublicUrl,
    DateTime UpdatedAt);

public sealed record ProfileCompletionDto(int Percent, IReadOnlyList<string> Missing);

public sealed record BusinessDetailDto(
    Guid Id,
    string Name,
    string Slug,
    int CategoryId,
    string CategoryName,
    string CategoryIcon,
    int? SubcategoryId,
    string? SubcategoryName,
    string? LogoUrl,
    string? CoverUrl,
    string? Description,
    int? YearEstablished,
    string? Email,
    string? Phone,
    string? WhatsApp,
    string? Website,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? Country,
    string? PostalCode,
    string? MapsUrl,
    double? Latitude,
    double? Longitude,
    string TimeZone,
    IReadOnlyList<WorkingHourDto> WorkingHours,
    IReadOnlyList<SpecialHourDto> SpecialHours,
    bool DeliveryAvailable,
    bool PickupAvailable,
    IReadOnlyList<PaymentMethods> PaymentMethods,
    IReadOnlyList<BusinessSocialLinkDto> SocialLinks,
    string Theme,
    string BrandColor,
    string Layout,
    IReadOnlyList<string> FeaturedSections,
    BusinessStatus Status,
    bool IsVerified,
    DateTime? PublishedAt,
    string? PublicUrl,
    BusinessRole MyRole,
    ProfileCompletionDto Completion,
    DateTime CreatedAt,
    DateTime UpdatedAt);

// ===========================================================================
// Team
// ===========================================================================

public sealed record BusinessMemberDto(Guid UserId, string FullName, string Email, BusinessRole Role, bool IsOwner, DateTime AddedAt);

public sealed class AddBusinessMemberRequest
{
    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;
    [EnumDataType(typeof(BusinessRole))]
    public BusinessRole Role { get; set; } = BusinessRole.Editor;
}

public sealed class UpdateBusinessMemberRequest
{
    [EnumDataType(typeof(BusinessRole))]
    public BusinessRole Role { get; set; }
}

// ===========================================================================
// Products
// ===========================================================================

public sealed class ProductCategoryRequest
{
    [Required, MaxLength(80)]
    public string Name { get; set; } = string.Empty;
}

public sealed record ProductCategoryDto(Guid Id, string Name, int ProductCount);

public sealed class ProductUpsertRequest : IValidatableObject
{
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(60)]
    public string? Sku { get; set; }
    public Guid? ProductCategoryId { get; set; }
    [MaxLength(3000)]
    public string? Description { get; set; }
    /// <summary>Price in paise (₹1 = 100). Null = price on request.</summary>
    [Range(0, 10_000_000_000)]
    public long? PriceInPaise { get; set; }
    [Range(0, 10_000_000_000)]
    public long? DiscountPriceInPaise { get; set; }
    [EnumDataType(typeof(StockStatus))]
    public StockStatus Stock { get; set; } = StockStatus.InStock;
    public bool IsAvailable { get; set; } = true;
    public bool IsFeatured { get; set; }
    /// <summary>Category attribute key → value. Multi-select values are comma-separated.</summary>
    public Dictionary<string, string> Attributes { get; set; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (DiscountPriceInPaise is not null && PriceInPaise is null)
            yield return new ValidationResult("Set a regular price before adding a discount price.", [nameof(DiscountPriceInPaise)]);
        if (DiscountPriceInPaise is not null && PriceInPaise is not null && DiscountPriceInPaise >= PriceInPaise)
            yield return new ValidationResult("Discount price must be lower than the regular price.", [nameof(DiscountPriceInPaise)]);
        if (Attributes.Count > 30)
            yield return new ValidationResult("Too many attributes.", [nameof(Attributes)]);
    }
}

public sealed record ProductDto(
    Guid Id,
    string Name,
    string? Sku,
    Guid? ProductCategoryId,
    string? ProductCategoryName,
    string? Description,
    long? PriceInPaise,
    long? DiscountPriceInPaise,
    string Currency,
    StockStatus Stock,
    bool IsAvailable,
    bool IsFeatured,
    IReadOnlyDictionary<string, string> Attributes,
    IReadOnlyList<ImageDto> Images,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed class ProductQuery
{
    [MaxLength(100)]
    public string? Search { get; set; }
    public Guid? CategoryId { get; set; }
    public StockStatus? Stock { get; set; }
    public bool? Featured { get; set; }
    public bool? Available { get; set; }
    [RegularExpression("^(newest|oldest|name|price_asc|price_desc)$")]
    public string Sort { get; set; } = "newest";
    [Range(1, 10_000)]
    public int Page { get; set; } = 1;
    [Range(1, 60)]
    public int PageSize { get; set; } = 12;
}

// ===========================================================================
// Services, offers, gallery
// ===========================================================================

public sealed class ServiceUpsertRequest
{
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(2000)]
    public string? Description { get; set; }
    [Range(0, 10_000_000_000)]
    public long? PriceInPaise { get; set; }
    [MaxLength(50)]
    public string? PriceNote { get; set; }
    [Range(1, 10_080)]
    public int? DurationMinutes { get; set; }
    public bool IsAvailable { get; set; } = true;
    public bool IsFeatured { get; set; }
}

public sealed record BusinessServiceDto(
    Guid Id,
    string Name,
    string? Description,
    long? PriceInPaise,
    string? PriceNote,
    string Currency,
    int? DurationMinutes,
    string? ImageUrl,
    bool IsAvailable,
    bool IsFeatured,
    DateTime UpdatedAt);

public sealed class OfferUpsertRequest : IValidatableObject
{
    [Required, MaxLength(120)]
    public string Title { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string? Description { get; set; }
    [Range(1, 100)]
    public int? DiscountPercent { get; set; }
    [Range(1, 10_000_000_000)]
    public long? DiscountAmountInPaise { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (StartDate is not null && EndDate is not null && EndDate < StartDate)
            yield return new ValidationResult("End date can't be before the start date.", [nameof(EndDate)]);
        if (DiscountPercent is not null && DiscountAmountInPaise is not null)
            yield return new ValidationResult("Use either a percentage or a fixed amount, not both.", [nameof(DiscountPercent)]);
    }
}

/// <summary>Computed from IsActive and the dates in the business's time zone.</summary>
public enum OfferState
{
    Live = 0,
    Scheduled = 1,
    Expired = 2,
    Inactive = 3
}

public sealed record OfferDto(
    Guid Id,
    string Title,
    string? Description,
    int? DiscountPercent,
    long? DiscountAmountInPaise,
    string? BannerUrl,
    DateOnly? StartDate,
    DateOnly? EndDate,
    bool IsActive,
    bool IsFeatured,
    OfferState State,
    DateTime UpdatedAt);

public sealed class GalleryUpdateRequest
{
    [EnumDataType(typeof(GalleryCategory))]
    public GalleryCategory Category { get; set; }
    [MaxLength(150)]
    public string? Caption { get; set; }
}

public sealed record GalleryImageDto(Guid Id, string Url, GalleryCategory Category, string? Caption, DateTime CreatedAt);

// ===========================================================================
// QR
// ===========================================================================

public sealed record BusinessQrDto(
    string QrCode,
    string QrUrl,
    string PublicUrl,
    bool Enabled,
    bool IsPublished,
    DateTime GeneratedAt,
    int TotalScans,
    int ScansLast30Days);

public sealed class SetQrEnabledRequest
{
    public bool Enabled { get; set; }
}

/// <summary>Where a scanned code should open. TargetId is set for Product / Offer destinations.</summary>
public sealed record QrResolveDto(string Slug, QrDestination Destination = QrDestination.Profile, Guid? TargetId = null);

// ===========================================================================
// Reviews
// ===========================================================================

public sealed class CreateReviewRequest
{
    [Required, MaxLength(80)]
    public string CustomerName { get; set; } = string.Empty;
    [Range(1, 5)]
    public int Rating { get; set; }
    [MaxLength(1000)]
    public string? Comment { get; set; }
}

public sealed class UpdateReviewRequest
{
    [EnumDataType(typeof(ReviewStatus))]
    public ReviewStatus Status { get; set; }
    [MaxLength(1000)]
    public string? OwnerReply { get; set; }
}

public sealed record ReviewDto(Guid Id, string CustomerName, int Rating, string? Comment, ReviewStatus Status,
    string? OwnerReply, DateTime CreatedAt);

public sealed record RatingSummaryDto(double Average, int Count, IReadOnlyList<int> Distribution);

// ===========================================================================
// Enquiries
// ===========================================================================

public sealed class CreateBusinessEnquiryRequest : IValidatableObject
{
    [Required, MaxLength(100)]
    public string CustomerName { get; set; } = string.Empty;
    [MaxLength(30), RegularExpression(@"^[0-9+()\-\s]{6,30}$", ErrorMessage = "Enter a valid phone number.")]
    public string? Phone { get; set; }
    [EmailAddress, MaxLength(256)]
    public string? Email { get; set; }
    [Required, MaxLength(150)]
    public string Subject { get; set; } = string.Empty;
    [Required, MinLength(5), MaxLength(3000)]
    public string Message { get; set; } = string.Empty;
    public Guid? ProductId { get; set; }
    public Guid? ServiceId { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Phone) && string.IsNullOrWhiteSpace(Email))
            yield return new ValidationResult("Please share a phone number or email so the business can reply.", [nameof(Phone)]);
    }
}

public sealed class UpdateEnquiryStatusRequest
{
    [EnumDataType(typeof(BusinessEnquiryStatus))]
    public BusinessEnquiryStatus Status { get; set; }
    [MaxLength(1000)]
    public string? Note { get; set; }
}

public sealed class RespondEnquiryRequest
{
    [Required, MinLength(2), MaxLength(3000)]
    public string Message { get; set; } = string.Empty;
    /// <summary>Email the reply to the customer (requires an email on the enquiry).</summary>
    public bool SendEmail { get; set; } = true;
}

public sealed class EnquiryQuery
{
    public BusinessEnquiryStatus? Status { get; set; }
    [MaxLength(100)]
    public string? Search { get; set; }
    [Range(1, 10_000)]
    public int Page { get; set; } = 1;
    [Range(1, 50)]
    public int PageSize { get; set; } = 20;
}

public sealed record EnquirySummaryDto(
    Guid Id,
    string CustomerName,
    string? Phone,
    string? Email,
    string Subject,
    string MessagePreview,
    string? RelatedItemName,
    BusinessEnquiryStatus Status,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record EnquiryActivityDto(Guid Id, EnquiryActivityType Type, BusinessEnquiryStatus? Status, string? Message,
    string? ByName, DateTime CreatedAt);

public sealed record EnquiryDetailDto(
    Guid Id,
    string CustomerName,
    string? Phone,
    string? Email,
    string Subject,
    string Message,
    Guid? ProductId,
    Guid? ServiceId,
    string? RelatedItemName,
    BusinessEnquiryStatus Status,
    DateTime CreatedAt,
    IReadOnlyList<EnquiryActivityDto> Activities);

// ===========================================================================
// Analytics & dashboard
// ===========================================================================

public sealed class TrackEventRequest
{
    [EnumDataType(typeof(BusinessEventType))]
    public BusinessEventType Type { get; set; }
    public Guid? ProductId { get; set; }
}

/// <summary>Request metadata used to fingerprint a visitor. Never persisted.</summary>
public sealed record VisitorContext(string? IpAddress, string? UserAgent, Guid? UserId);

public sealed record AnalyticsTotalsDto(
    int QrScans,
    int UniqueVisitors,
    int ProfileViews,
    int ProductViews,
    int WhatsAppClicks,
    int CallClicks,
    int WebsiteClicks,
    int DirectionsClicks,
    int ShareClicks,
    int Enquiries);

public sealed record AnalyticsDailyPointDto(DateOnly Date, int Views, int Scans, int Clicks, int Visitors);

public sealed record TopProductDto(Guid ProductId, string Name, string? ImageUrl, int Views);

public sealed record BusinessAnalyticsDto(
    DateOnly From,
    DateOnly To,
    int Days,
    AnalyticsTotalsDto Totals,
    AnalyticsTotalsDto PreviousTotals,
    IReadOnlyList<AnalyticsDailyPointDto> Daily,
    IReadOnlyList<TopProductDto> TopProducts);

public sealed record ActivityItemDto(string Kind, string Title, string? Detail, DateTime OccurredAt);

public sealed record BusinessDashboardDto(
    BusinessSummaryDto Business,
    ProfileCompletionDto Completion,
    bool QrEnabled,
    BusinessAnalyticsDto Analytics,
    int ProductCount,
    int ServiceCount,
    int GalleryCount,
    int NewEnquiries,
    int PendingReviews,
    IReadOnlyList<OfferDto> ActiveOffers,
    IReadOnlyList<EnquirySummaryDto> RecentEnquiries,
    IReadOnlyList<ActivityItemDto> RecentActivity);

// ===========================================================================
// Public storefront
// ===========================================================================

public sealed record PublicAttributeDto(string Key, string Label, string Value);

public sealed record PublicProductDto(
    Guid Id,
    string Name,
    string? Description,
    long? PriceInPaise,
    long? DiscountPriceInPaise,
    string Currency,
    StockStatus Stock,
    bool IsFeatured,
    Guid? CategoryId,
    string? CategoryName,
    IReadOnlyList<PublicAttributeDto> Attributes,
    IReadOnlyList<string> Images);

public sealed record PublicServiceDto(Guid Id, string Name, string? Description, long? PriceInPaise, string? PriceNote,
    string Currency, int? DurationMinutes, string? ImageUrl, bool IsFeatured);

public sealed record PublicOfferDto(Guid Id, string Title, string? Description, int? DiscountPercent,
    long? DiscountAmountInPaise, string? BannerUrl, DateOnly? EndDate, bool IsFeatured);

public sealed record PublicGalleryImageDto(string Url, GalleryCategory Category, string? Caption);

public sealed record PublicReviewDto(string CustomerName, int Rating, string? Comment, string? OwnerReply, DateTime CreatedAt);

public sealed record PublicBusinessDto(
    string Slug,
    string Name,
    string CategoryName,
    string CategoryIcon,
    string? SubcategoryName,
    string? LogoUrl,
    string? CoverUrl,
    string? Description,
    int? YearEstablished,
    bool IsVerified,
    string? Email,
    string? Phone,
    string? WhatsApp,
    string? Website,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? Country,
    string? PostalCode,
    string? MapsUrl,
    double? Latitude,
    double? Longitude,
    string TimeZone,
    IReadOnlyList<WorkingHourDto> WorkingHours,
    IReadOnlyList<SpecialHourDto> UpcomingSpecialHours,
    bool DeliveryAvailable,
    bool PickupAvailable,
    IReadOnlyList<PaymentMethods> PaymentMethods,
    IReadOnlyList<BusinessSocialLinkDto> SocialLinks,
    string Theme,
    string BrandColor,
    string Layout,
    IReadOnlyList<string> FeaturedSections,
    IReadOnlyList<ProductCategoryDto> ProductCategories,
    IReadOnlyList<PublicProductDto> FeaturedProducts,
    int TotalProducts,
    IReadOnlyList<PublicServiceDto> Services,
    IReadOnlyList<PublicOfferDto> Offers,
    IReadOnlyList<PublicGalleryImageDto> Gallery,
    IReadOnlyList<PublicReviewDto> Reviews,
    RatingSummaryDto Rating,
    string PublicUrl,
    bool IsPreview);

public sealed class ReorderImagesRequest
{
    [Required, MaxLength(20)]
    public List<Guid> ImageIds { get; set; } = [];
}

// ===========================================================================
// QR campaigns
// ===========================================================================

public class QrCampaignStyle
{
    [RegularExpression("^#[0-9A-Fa-f]{6}$", ErrorMessage = "Use a hex colour like #30243D.")]
    public string ForegroundColor { get; set; } = "#30243D";
    [RegularExpression("^#[0-9A-Fa-f]{6}$", ErrorMessage = "Use a hex colour like #FFFFFF.")]
    public string BackgroundColor { get; set; } = "#FFFFFF";
    public bool ShowLogo { get; set; } = true;
    [MaxLength(40)]
    public string? FrameText { get; set; }
}

public sealed class QrCampaignUpsertRequest : QrCampaignStyle, IValidatableObject
{
    [Required, MaxLength(80)]
    public string Name { get; set; } = string.Empty;
    [EnumDataType(typeof(QrDestination))]
    public QrDestination Destination { get; set; } = QrDestination.Profile;
    public Guid? TargetId { get; set; }
    public bool IsEnabled { get; set; } = true;
    /// <summary>UTC instant after which scans show an "ended" message.</summary>
    public DateTime? ExpiresAt { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Destination is QrDestination.Product or QrDestination.Offer && TargetId is null)
            yield return new ValidationResult($"Choose which {Destination.ToString().ToLowerInvariant()} this QR should open.", [nameof(TargetId)]);
    }
}

public sealed class BulkQrCampaignRequest : QrCampaignStyle
{
    /// <summary>e.g. "Table" gives "Table 1", "Table 2", and so on.</summary>
    [Required, MaxLength(60)]
    public string NamePrefix { get; set; } = string.Empty;
    [Range(1, 100)]
    public int Count { get; set; } = 10;
    [Range(1, 100_000)]
    public int StartNumber { get; set; } = 1;
    [EnumDataType(typeof(QrDestination))]
    public QrDestination Destination { get; set; } = QrDestination.Products;
}

public sealed record QrCampaignDto(
    Guid Id,
    string Name,
    string Code,
    string QrUrl,
    QrDestination Destination,
    Guid? TargetId,
    string? TargetName,
    bool IsEnabled,
    DateTime? ExpiresAt,
    bool IsExpired,
    string ForegroundColor,
    string BackgroundColor,
    bool ShowLogo,
    string? FrameText,
    int TotalScans,
    int ScansLast30Days,
    DateTime CreatedAt);

/// <summary>One line in the campaign comparison. CampaignId null = the main business QR.</summary>
public sealed record QrCampaignStatsItemDto(Guid? CampaignId, string Name, int Scans, int UniqueVisitors, IReadOnlyList<int> Daily);

public sealed record QrCampaignStatsDto(DateOnly From, DateOnly To, int Days, IReadOnlyList<QrCampaignStatsItemDto> Items);
