using Microsoft.Extensions.Options;
using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;

namespace ProLink.Application.Services.Businesses;

/// <summary>Entity → DTO mapping for the business module. Entities never leave the application layer.</summary>
public static class BusinessMapper
{
    public static readonly PaymentMethods[] AllPaymentMethods =
        Enum.GetValues<PaymentMethods>().Where(m => m != PaymentMethods.None).ToArray();

    public static IReadOnlyList<PaymentMethods> SplitPaymentMethods(PaymentMethods flags) =>
        AllPaymentMethods.Where(m => flags.HasFlag(m)).ToList();

    public static IReadOnlyList<string> Sections(string csv) =>
        csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public static IReadOnlyList<WorkingHourDto> Hours(IEnumerable<BusinessWorkingHour> hours) =>
        hours.OrderBy(h => ((int)h.Day + 6) % 7) // Monday first
            .Select(h => new WorkingHourDto
            {
                Day = h.Day, IsClosed = h.IsClosed, Opens = BusinessTime.FormatTime(h.Opens), Closes = BusinessTime.FormatTime(h.Closes)
            }).ToList();

    public static IReadOnlyList<SpecialHourDto> Special(IEnumerable<BusinessSpecialHour> hours) =>
        hours.OrderBy(h => h.Date)
            .Select(h => new SpecialHourDto
            {
                Date = h.Date, IsClosed = h.IsClosed, Opens = BusinessTime.FormatTime(h.Opens),
                Closes = BusinessTime.FormatTime(h.Closes), Note = h.Note
            }).ToList();

    public static IReadOnlyList<BusinessSocialLinkDto> Social(IEnumerable<BusinessSocialLink> links) =>
        links.OrderBy(l => l.SortOrder)
            .Select(l => new BusinessSocialLinkDto { Platform = l.Platform, Label = l.Label, Url = l.Url }).ToList();

    public static BusinessSummaryDto Summary(Business b, BusinessRole role, string baseUrl) => new(
        b.Id, b.Name, b.Slug, b.Category?.Name ?? "", b.Category?.Icon ?? "store", b.LogoUrl, b.City, b.Status, role,
        BusinessUrls.Public(baseUrl, b.Slug), b.UpdatedAt);

    public static BusinessDetailDto Detail(Business b, BusinessRole role, string baseUrl, ProfileCompletionDto completion) => new(
        b.Id, b.Name, b.Slug, b.CategoryId, b.Category?.Name ?? "", b.Category?.Icon ?? "store", b.SubcategoryId,
        b.Subcategory?.Name, b.LogoUrl, b.CoverUrl, b.Description, b.YearEstablished, b.Email, b.Phone, b.WhatsApp,
        b.Website, b.AddressLine1, b.AddressLine2, b.City, b.State, b.Country, b.PostalCode, b.MapsUrl, b.Latitude,
        b.Longitude, b.TimeZone, Hours(b.WorkingHours), Special(b.SpecialHours), b.DeliveryAvailable, b.PickupAvailable,
        SplitPaymentMethods(b.PaymentMethods), Social(b.SocialLinks), b.Theme, b.BrandColor, b.Layout,
        Sections(b.FeaturedSections), b.Status, b.IsVerified, b.PublishedAt, BusinessUrls.Public(baseUrl, b.Slug), role,
        completion, b.CreatedAt, b.UpdatedAt);

    public static ProductDto Product(BusinessProduct p) => new(
        p.Id, p.Name, p.Sku, p.ProductCategoryId, p.ProductCategory?.Name, p.Description, p.PriceInPaise,
        p.DiscountPriceInPaise, p.Currency, p.Stock, p.IsAvailable, p.IsFeatured,
        ProductAttributes.Deserialize(p.AttributesJson),
        p.Images.OrderBy(i => i.SortOrder).Select(i => new ImageDto(i.Id, i.Url)).ToList(),
        p.CreatedAt, p.UpdatedAt);

    public static PublicProductDto PublicProduct(BusinessProduct p, IReadOnlyList<BusinessCategoryAttribute> defs)
    {
        var values = ProductAttributes.Deserialize(p.AttributesJson);
        var attributes = defs.OrderBy(d => d.SortOrder)
            .Where(d => values.ContainsKey(d.Key))
            .Select(d => new PublicAttributeDto(d.Key, d.Label, d.InputType switch
            {
                AttributeInputType.Boolean => values[d.Key] == "true" ? "Yes" : "No",
                AttributeInputType.MultiSelect => values[d.Key].Replace(",", ", "),
                _ => values[d.Key]
            }))
            .ToList();
        return new PublicProductDto(p.Id, p.Name, p.Description, p.PriceInPaise, p.DiscountPriceInPaise, p.Currency,
            p.Stock, p.IsFeatured, p.ProductCategoryId, p.ProductCategory?.Name, attributes,
            p.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).ToList());
    }

    public static BusinessServiceDto Service(BusinessService s) => new(
        s.Id, s.Name, s.Description, s.PriceInPaise, s.PriceNote, s.Currency, s.DurationMinutes, s.ImageUrl,
        s.IsAvailable, s.IsFeatured, s.UpdatedAt);

    public static OfferState State(BusinessOffer o, DateOnly today) =>
        !o.IsActive ? OfferState.Inactive
        : o.EndDate is not null && o.EndDate < today ? OfferState.Expired
        : o.StartDate is not null && o.StartDate > today ? OfferState.Scheduled
        : OfferState.Live;

    public static OfferDto Offer(BusinessOffer o, DateOnly today) => new(
        o.Id, o.Title, o.Description, o.DiscountPercent, o.DiscountAmountInPaise, o.BannerUrl, o.StartDate, o.EndDate,
        o.IsActive, o.IsFeatured, State(o, today), o.UpdatedAt);

    public static GalleryImageDto Gallery(BusinessGalleryImage g) => new(g.Id, g.Url, g.Category, g.Caption, g.CreatedAt);

    public static ReviewDto Review(BusinessReview r) => new(r.Id, r.CustomerName, r.Rating, r.Comment, r.Status, r.OwnerReply, r.CreatedAt);

    public static EnquirySummaryDto EnquirySummary(BusinessEnquiry e) => new(
        e.Id, e.CustomerName, e.Phone, e.Email, e.Subject,
        e.Message.Length > 140 ? e.Message[..140].TrimEnd() + "…" : e.Message,
        e.RelatedItemName, e.Status, e.CreatedAt, e.UpdatedAt);

    public static EnquiryDetailDto EnquiryDetail(BusinessEnquiry e) => new(
        e.Id, e.CustomerName, e.Phone, e.Email, e.Subject, e.Message, e.ProductId, e.ServiceId, e.RelatedItemName,
        e.Status, e.CreatedAt,
        e.Activities.OrderBy(a => a.CreatedAt)
            .Select(a => new EnquiryActivityDto(a.Id, a.Type, a.Status, a.Message, a.ByName, a.CreatedAt)).ToList());

    public static RatingSummaryDto Rating(int[] distribution)
    {
        var count = distribution.Sum();
        var average = count == 0 ? 0 : Math.Round(distribution.Select((c, i) => c * (i + 1)).Sum() / (double)count, 1);
        return new RatingSummaryDto(average, count, distribution);
    }
}

/// <summary>Builds the customer-facing storefront payload. Shared by the public page and the owner's preview.</summary>
public sealed class StorefrontBuilder(
    IBusinessCatalogRepository catalog,
    IBusinessEngagementRepository engagement,
    IBusinessCategoryRepository categories,
    IOptions<AppOptions> options,
    TimeProvider clock)
{
    public const int FeaturedProductCount = 8;

    public async Task<PublicBusinessDto> BuildAsync(Business b, bool isPreview, CancellationToken ct)
    {
        var today = BusinessTime.Today(b.TimeZone, clock.GetUtcNow().UtcDateTime);
        var defs = await categories.ListAttributesAsync(b.CategoryId, ct);
        var productCategories = await catalog.ListProductCategoriesAsync(b.Id, publicOnly: true, ct);
        var featured = await catalog.ListFeaturedProductsAsync(b.Id, FeaturedProductCount, ct);
        var totalProducts = await catalog.CountProductsAsync(b.Id, publicOnly: true, ct);
        var services = await catalog.ListServicesAsync(b.Id, availableOnly: true, ct);
        var offers = await catalog.ListLiveOffersAsync(b.Id, today, ct);
        var gallery = await catalog.ListGalleryAsync(b.Id, ct);
        var reviews = await engagement.ListReviewsAsync(b.Id, ReviewStatus.Approved, 20, ct);
        var distribution = await engagement.GetRatingDistributionAsync(b.Id, ct);

        return new PublicBusinessDto(
            b.Slug, b.Name, b.Category?.Name ?? "", b.Category?.Icon ?? "store", b.Subcategory?.Name,
            b.LogoUrl, b.CoverUrl, b.Description, b.YearEstablished, b.IsVerified,
            b.Email, b.Phone, b.WhatsApp, b.Website,
            b.AddressLine1, b.AddressLine2, b.City, b.State, b.Country, b.PostalCode, b.MapsUrl, b.Latitude, b.Longitude,
            b.TimeZone,
            BusinessMapper.Hours(b.WorkingHours),
            BusinessMapper.Special(b.SpecialHours.Where(h => h.Date >= today && h.Date <= today.AddDays(60))),
            b.DeliveryAvailable, b.PickupAvailable, BusinessMapper.SplitPaymentMethods(b.PaymentMethods),
            BusinessMapper.Social(b.SocialLinks),
            b.Theme, b.BrandColor, b.Layout, BusinessMapper.Sections(b.FeaturedSections),
            productCategories.Where(c => c.ProductCount > 0)
                .Select(c => new ProductCategoryDto(c.Category.Id, c.Category.Name, c.ProductCount)).ToList(),
            featured.Select(p => BusinessMapper.PublicProduct(p, defs)).ToList(),
            totalProducts,
            services.Select(s => new PublicServiceDto(s.Id, s.Name, s.Description, s.PriceInPaise, s.PriceNote, s.Currency,
                s.DurationMinutes, s.ImageUrl, s.IsFeatured)).ToList(),
            offers.Select(o => new PublicOfferDto(o.Id, o.Title, o.Description, o.DiscountPercent, o.DiscountAmountInPaise,
                o.BannerUrl, o.EndDate, o.IsFeatured)).ToList(),
            gallery.Select(g => new PublicGalleryImageDto(g.Url, g.Category, g.Caption)).ToList(),
            reviews.Select(r => new PublicReviewDto(r.CustomerName, r.Rating, r.Comment, r.OwnerReply, r.CreatedAt)).ToList(),
            BusinessMapper.Rating(distribution),
            BusinessUrls.Public(options.Value.PublicBaseUrl, b.Slug),
            isPreview);
    }
}
