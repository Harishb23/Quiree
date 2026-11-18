using ProLink.Domain.Common;
using ProLink.Domain.Enums;

namespace ProLink.Domain.Entities;

// ---------------------------------------------------------------------------
// Category catalogue (reference data, seeded through migrations)
// ---------------------------------------------------------------------------

public class BusinessCategory
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>Lucide icon name used by the frontend.</summary>
    public string Icon { get; set; } = "store";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<BusinessSubcategory> Subcategories { get; set; } = new List<BusinessSubcategory>();
    public ICollection<BusinessCategoryAttribute> Attributes { get; set; } = new List<BusinessCategoryAttribute>();
}

public class BusinessSubcategory
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public BusinessCategory? Category { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

/// <summary>A product field shown only for businesses in this category (e.g. "Shoe Size" for footwear).</summary>
public class BusinessCategoryAttribute
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public BusinessCategory? Category { get; set; }
    /// <summary>Stable key used in product attribute storage (e.g. "shoe_size").</summary>
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public AttributeInputType InputType { get; set; }
    /// <summary>"|"-separated options for Select / MultiSelect.</summary>
    public string? Options { get; set; }
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
}

// ---------------------------------------------------------------------------
// Business aggregate
// ---------------------------------------------------------------------------

public class Business : BaseEntity
{
    public Guid OwnerId { get; set; }
    public User? Owner { get; set; }

    // Basic information
    public string Name { get; set; } = string.Empty;
    /// <summary>Public identifier used in /business/{Slug}. Never the database id.</summary>
    public string Slug { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public BusinessCategory? Category { get; set; }
    public int? SubcategoryId { get; set; }
    public BusinessSubcategory? Subcategory { get; set; }
    public string? LogoUrl { get; set; }
    public string? CoverUrl { get; set; }
    public string? Description { get; set; }
    public int? YearEstablished { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? WhatsApp { get; set; }
    public string? Website { get; set; }

    // Address (primary location; branches can be added as a separate entity later)
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }
    public string? MapsUrl { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    /// <summary>IANA time zone used for opening hours and offer dates.</summary>
    public string TimeZone { get; set; } = "Asia/Kolkata";

    // Operations
    public bool DeliveryAvailable { get; set; }
    public bool PickupAvailable { get; set; }
    public PaymentMethods PaymentMethods { get; set; }

    // Customisation
    public string Theme { get; set; } = "classic";
    public string BrandColor { get; set; } = "#6B3FA0";
    public string Layout { get; set; } = "grid";
    /// <summary>Comma-separated, ordered section keys shown on the public page.</summary>
    public string FeaturedSections { get; set; } = "offers,products,services,gallery,reviews,info";

    // Lifecycle
    public BusinessStatus Status { get; set; } = BusinessStatus.Draft;
    /// <summary>False when suspended by an administrator; hides the public page.</summary>
    public bool IsActive { get; set; } = true;
    public bool IsVerified { get; set; }
    public DateTime? PublishedAt { get; set; }

    // QR — the QR encodes /bq/{QrCode}, so it survives slug changes and can be disabled or rotated.
    public string QrCode { get; set; } = string.Empty;
    public bool QrEnabled { get; set; } = true;
    public DateTime QrGeneratedAt { get; set; } = DateTime.UtcNow;

    public ICollection<BusinessMember> Members { get; set; } = new List<BusinessMember>();
    public ICollection<BusinessSocialLink> SocialLinks { get; set; } = new List<BusinessSocialLink>();
    public ICollection<BusinessWorkingHour> WorkingHours { get; set; } = new List<BusinessWorkingHour>();
    public ICollection<BusinessSpecialHour> SpecialHours { get; set; } = new List<BusinessSpecialHour>();
    public ICollection<BusinessProductCategory> ProductCategories { get; set; } = new List<BusinessProductCategory>();
    public ICollection<BusinessProduct> Products { get; set; } = new List<BusinessProduct>();
    public ICollection<BusinessService> Services { get; set; } = new List<BusinessService>();
    public ICollection<BusinessOffer> Offers { get; set; } = new List<BusinessOffer>();
    public ICollection<BusinessGalleryImage> Gallery { get; set; } = new List<BusinessGalleryImage>();
    public ICollection<BusinessReview> Reviews { get; set; } = new List<BusinessReview>();
    public ICollection<BusinessEnquiry> Enquiries { get; set; } = new List<BusinessEnquiry>();
    public ICollection<BusinessQrCampaign> QrCampaigns { get; set; } = new List<BusinessQrCampaign>();
}

/// <summary>A team member other than the owner (the owner is <see cref="Business.OwnerId"/>).</summary>
public class BusinessMember : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public BusinessRole Role { get; set; } = BusinessRole.Editor;
}

public class BusinessSocialLink : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }
    public BusinessSocialPlatform Platform { get; set; }
    public string? Label { get; set; }
    public string Url { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class BusinessWorkingHour : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }
    public DayOfWeek Day { get; set; }
    public bool IsClosed { get; set; }
    public TimeOnly? Opens { get; set; }
    public TimeOnly? Closes { get; set; }
}

/// <summary>Holiday or one-off schedule that overrides the weekly hours on a date.</summary>
public class BusinessSpecialHour : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }
    public DateOnly Date { get; set; }
    public bool IsClosed { get; set; } = true;
    public TimeOnly? Opens { get; set; }
    public TimeOnly? Closes { get; set; }
    public string? Note { get; set; }
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

/// <summary>Owner-defined grouping of products (e.g. "Sneakers", "Bouquets").</summary>
public class BusinessProductCategory : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class BusinessProduct : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }
    public Guid? ProductCategoryId { get; set; }
    public BusinessProductCategory? ProductCategory { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public string? Description { get; set; }
    /// <summary>Prices in the smallest currency unit (paise). Null = "price on request".</summary>
    public long? PriceInPaise { get; set; }
    public long? DiscountPriceInPaise { get; set; }
    public string Currency { get; set; } = "INR";
    public StockStatus Stock { get; set; } = StockStatus.InStock;
    /// <summary>Hidden from the public page when false.</summary>
    public bool IsAvailable { get; set; } = true;
    public bool IsFeatured { get; set; }
    /// <summary>Category-specific attributes as a JSON object of key → value.</summary>
    public string AttributesJson { get; set; } = "{}";
    public int SortOrder { get; set; }

    public ICollection<BusinessProductImage> Images { get; set; } = new List<BusinessProductImage>();
}

public class BusinessProductImage : BaseEntity
{
    public Guid ProductId { get; set; }
    public BusinessProduct? Product { get; set; }
    public string Url { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class BusinessService : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public long? PriceInPaise { get; set; }
    /// <summary>Optional qualifier such as "per hour" or "starting from".</summary>
    public string? PriceNote { get; set; }
    public string Currency { get; set; } = "INR";
    public int? DurationMinutes { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsAvailable { get; set; } = true;
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
}

public class BusinessOffer : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? DiscountPercent { get; set; }
    public long? DiscountAmountInPaise { get; set; }
    public string? BannerUrl { get; set; }
    /// <summary>Inclusive dates in the business's time zone. Null = open-ended.</summary>
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
}

public class BusinessGalleryImage : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }
    public string Url { get; set; } = string.Empty;
    public GalleryCategory Category { get; set; }
    public string? Caption { get; set; }
    public int SortOrder { get; set; }
}

// ---------------------------------------------------------------------------
// Customer engagement
// ---------------------------------------------------------------------------

public class BusinessReview : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Comment { get; set; }
    /// <summary>Reviews are moderated: only Approved reviews are public.</summary>
    public ReviewStatus Status { get; set; } = ReviewStatus.Pending;
    public string? OwnerReply { get; set; }
}

public class BusinessEnquiry : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public Guid? ProductId { get; set; }
    public Guid? ServiceId { get; set; }
    /// <summary>Snapshot of the product / service name at submission time.</summary>
    public string? RelatedItemName { get; set; }
    public BusinessEnquiryStatus Status { get; set; } = BusinessEnquiryStatus.New;

    public ICollection<BusinessEnquiryActivity> Activities { get; set; } = new List<BusinessEnquiryActivity>();
}

public class BusinessEnquiryActivity : BaseEntity
{
    public Guid EnquiryId { get; set; }
    public BusinessEnquiry? Enquiry { get; set; }
    public EnquiryActivityType Type { get; set; }
    public BusinessEnquiryStatus? Status { get; set; }
    public string? Message { get; set; }
    public Guid? ByUserId { get; set; }
    public string? ByName { get; set; }
}

/// <summary>
/// Privacy-preserving analytics event. No IP address or user agent is stored: visitors are identified by a
/// keyed hash that rotates daily, so they cannot be tracked across days or businesses.
/// </summary>
public class BusinessAnalyticsEvent
{
    public long Id { get; set; }
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }
    public BusinessEventType Type { get; set; }
    public Guid? ProductId { get; set; }
    /// <summary>For QR scans: the campaign scanned (null = the main business QR).</summary>
    public Guid? CampaignId { get; set; }
    public string VisitorHash { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// An additional QR code for a business (e.g. "Table 4", "Packaging", "Diwali banner"). It shares the /bq/{code}
/// route with the main QR, so its destination can be changed later without reprinting.
/// </summary>
public class BusinessQrCampaign : BaseEntity
{
    public Guid BusinessId { get; set; }
    public Business? Business { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public QrDestination Destination { get; set; } = QrDestination.Profile;
    /// <summary>Product or offer id for Product / Offer destinations.</summary>
    public Guid? TargetId { get; set; }
    public bool IsEnabled { get; set; } = true;
    /// <summary>After this instant (UTC) the code shows an "expired" message instead of redirecting.</summary>
    public DateTime? ExpiresAt { get; set; }
    // Visual style (rendered client-side; validated for scannable contrast).
    public string ForegroundColor { get; set; } = "#30243D";
    public string BackgroundColor { get; set; } = "#FFFFFF";
    public bool ShowLogo { get; set; } = true;
    public string? FrameText { get; set; }
}
