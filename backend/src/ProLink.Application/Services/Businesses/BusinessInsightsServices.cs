using Microsoft.Extensions.Options;
using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;

namespace ProLink.Application.Services.Businesses;

/// <summary>
/// Records analytics events with de-duplication: the same visitor repeating the same action within
/// <see cref="DedupeWindow"/> is counted once. Bots and the business's own team are ignored.
/// </summary>
public sealed class EventRecorder(
    IBusinessRepository businesses,
    IBusinessAnalyticsRepository analytics,
    IUnitOfWork uow,
    VisitorHasher hasher,
    TimeProvider clock)
{
    public static readonly TimeSpan DedupeWindow = TimeSpan.FromMinutes(30);

    public async Task<bool> RecordAsync(Guid businessId, BusinessEventType type, Guid? productId, VisitorContext visitor, CancellationToken ct,
        Guid? campaignId = null)
    {
        if (VisitorHasher.IsAutomated(visitor.UserAgent)) return false;
        if (visitor.UserId is not null && await businesses.IsTeamMemberAsync(businessId, visitor.UserId.Value, ct)) return false;

        var now = clock.GetUtcNow().UtcDateTime;
        var hash = hasher.Hash(businessId, visitor);
        if (await analytics.HasRecentEventAsync(businessId, hash, type, productId, now - DedupeWindow, ct, campaignId)) return false;

        analytics.AddEvent(new BusinessAnalyticsEvent
        {
            BusinessId = businessId, Type = type, ProductId = productId, CampaignId = campaignId, VisitorHash = hash, OccurredAt = now
        });
        await uow.SaveChangesAsync(ct);
        return true;
    }
}

public sealed class BusinessQrService(
    IBusinessRepository businesses,
    BusinessQrCampaignService campaigns,
    IBusinessAnalyticsRepository analytics,
    IUnitOfWork uow,
    IQrCodeGenerator generator,
    BusinessAccessGuard guard,
    EventRecorder recorder,
    IOptions<AppOptions> options,
    TimeProvider clock) : IBusinessQrService
{
    public async Task<BusinessQrDto> GetAsync(Guid userId, Guid businessId, CancellationToken ct = default) =>
        await DtoAsync((await guard.RequireAsync(userId, businessId, BusinessRole.Editor, ct)).Business, ct);

    public async Task<BusinessQrDto> SetEnabledAsync(Guid userId, Guid businessId, bool enabled, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        access.Business.QrEnabled = enabled;
        await uow.SaveChangesAsync(ct);
        return await DtoAsync(access.Business, ct);
    }

    public async Task<BusinessQrDto> RegenerateAsync(Guid userId, Guid businessId, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        access.Business.QrCode = await BusinessProfileService.NewQrCodeAsync(businesses, ct);
        access.Business.QrGeneratedAt = clock.GetUtcNow().UtcDateTime;
        access.Business.QrEnabled = true;
        await uow.SaveChangesAsync(ct);
        return await DtoAsync(access.Business, ct);
    }

    public async Task<byte[]> GetPngAsync(Guid userId, Guid businessId, int size, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Editor, ct);
        return generator.GeneratePng(QrUrl(access.Business), Math.Clamp(size / 30, 4, 40));
    }

    public async Task<string> GetSvgAsync(Guid userId, Guid businessId, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Editor, ct);
        return generator.GenerateSvg(QrUrl(access.Business));
    }

    public async Task<QrResolveDto> ResolveAsync(string code, VisitorContext visitor, CancellationToken ct = default)
    {
        var business = QrCodes.LooksValid(code) ? await businesses.GetByQrCodeAsync(code, ct) : null;
        if (business is null && QrCodes.LooksValid(code))
            return await campaigns.ResolveAsync(code, visitor, ct);
        if (business is null) throw new NotFoundException("This QR code isn't recognised. It may have been replaced by a newer code.");
        if (!business.QrEnabled) throw new GoneException("This QR code has been turned off by the business.");
        if (business.Status != BusinessStatus.Published || !business.IsActive)
            throw new NotFoundException("This business profile isn't available right now.");

        await recorder.RecordAsync(business.Id, BusinessEventType.QrScan, null, visitor, ct);
        return new QrResolveDto(business.Slug);
    }

    private string QrUrl(Business b) => BusinessUrls.Qr(options.Value.PublicBaseUrl, b.QrCode);

    private async Task<BusinessQrDto> DtoAsync(Business b, CancellationToken ct)
    {
        var total = await analytics.CountAsync(b.Id, BusinessEventType.QrScan, null, ct);
        var recent = await analytics.CountAsync(b.Id, BusinessEventType.QrScan, clock.GetUtcNow().UtcDateTime.AddDays(-30), ct);
        return new BusinessQrDto(b.QrCode, QrUrl(b), BusinessUrls.Public(options.Value.PublicBaseUrl, b.Slug), b.QrEnabled,
            b.Status == BusinessStatus.Published, b.QrGeneratedAt, total, recent);
    }
}

public sealed class BusinessAnalyticsService(
    IBusinessRepository businesses,
    IBusinessCatalogRepository catalog,
    IBusinessEngagementRepository engagement,
    IBusinessAnalyticsRepository analytics,
    BusinessAccessGuard guard,
    EventRecorder recorder,
    IOptions<AppOptions> options,
    TimeProvider clock) : IBusinessAnalyticsService
{
    /// <summary>Events the public page may report. Scans and enquiries are recorded server-side only.</summary>
    private static readonly HashSet<BusinessEventType> ClientEvents =
    [
        BusinessEventType.ProfileView, BusinessEventType.ProductView, BusinessEventType.WhatsAppClick, BusinessEventType.CallClick,
        BusinessEventType.WebsiteClick, BusinessEventType.DirectionsClick, BusinessEventType.ShareClick
    ];

    private static readonly BusinessEventType[] ClickEvents =
    [
        BusinessEventType.WhatsAppClick, BusinessEventType.CallClick, BusinessEventType.WebsiteClick,
        BusinessEventType.DirectionsClick, BusinessEventType.ShareClick
    ];

    public async Task TrackAsync(string slug, TrackEventRequest request, VisitorContext visitor, CancellationToken ct = default)
    {
        if (!ClientEvents.Contains(request.Type)) throw new BusinessValidationException("This event can't be reported by the client.");
        var business = await businesses.GetPublicBySlugAsync(slug, ct) ?? throw new NotFoundException("Business not found.");

        Guid? productId = null;
        if (request.Type == BusinessEventType.ProductView)
        {
            if (request.ProductId is null) throw new BusinessValidationException("Product views need a product.");
            var product = await catalog.GetProductAsync(business.Id, request.ProductId.Value, ct);
            if (product is null || !product.IsAvailable) return; // stale link: ignore quietly
            productId = product.Id;
        }
        await recorder.RecordAsync(business.Id, request.Type, productId, visitor, ct);
    }

    public async Task<BusinessAnalyticsDto> GetAnalyticsAsync(Guid userId, Guid businessId, int days, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Editor, ct);
        return await BuildAnalyticsAsync(access.Business, days, ct);
    }

    public async Task<BusinessDashboardDto> GetDashboardAsync(Guid userId, Guid businessId, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Editor, ct);
        var b = access.Business;
        var canSeeEnquiries = access.Role <= BusinessRole.Manager;
        var today = BusinessTime.Today(b.TimeZone, clock.GetUtcNow().UtcDateTime);

        var analyticsDto = await BuildAnalyticsAsync(b, 30, ct);
        var products = await catalog.CountProductsAsync(b.Id, publicOnly: false, ct);
        var services = (await catalog.ListServicesAsync(b.Id, availableOnly: false, ct)).Count;
        var gallery = await catalog.CountGalleryAsync(b.Id, ct);
        var (percent, missing) = BusinessCompletion.Calculate(b, products, services, gallery);
        var liveOffers = await catalog.ListLiveOffersAsync(b.Id, today, ct);
        var newEnquiries = await engagement.CountEnquiriesAsync(b.Id, BusinessEnquiryStatus.New, null, ct);
        var pendingReviews = await engagement.CountReviewsAsync(b.Id, ReviewStatus.Pending, ct);
        var recentEnquiries = canSeeEnquiries
            ? (await engagement.QueryEnquiriesAsync(b.Id, new EnquiryQuery { Page = 1, PageSize = 5 }, ct)).Items
            : [];

        return new BusinessDashboardDto(
            BusinessMapper.Summary(b, access.Role, options.Value.PublicBaseUrl),
            new ProfileCompletionDto(percent, missing),
            b.QrEnabled,
            analyticsDto,
            products, services, gallery, newEnquiries, pendingReviews,
            liveOffers.Take(5).Select(o => BusinessMapper.Offer(o, today)).ToList(),
            recentEnquiries.Select(BusinessMapper.EnquirySummary).ToList(),
            await RecentActivityAsync(b, canSeeEnquiries, ct));
    }

    private async Task<BusinessAnalyticsDto> BuildAnalyticsAsync(Business b, int days, CancellationToken ct)
    {
        days = Math.Clamp(days, 7, 90);
        var zone = b.TimeZone;
        var to = BusinessTime.Today(zone, clock.GetUtcNow().UtcDateTime);
        var from = to.AddDays(-(days - 1));
        var previousFrom = from.AddDays(-days);

        var fromUtc = BusinessTime.StartOfDayUtc(from, zone);
        var toUtc = BusinessTime.StartOfDayUtc(to.AddDays(1), zone);
        var previousFromUtc = BusinessTime.StartOfDayUtc(previousFrom, zone);

        var rows = await analytics.ListEventsAsync(b.Id, previousFromUtc, toUtc, ct);
        var current = rows.Where(r => r.OccurredAt >= fromUtc).ToList();
        var previous = rows.Where(r => r.OccurredAt < fromUtc).ToList();

        var byDay = current.GroupBy(r => DateOnly.FromDateTime(BusinessTime.ToLocal(r.OccurredAt, zone))).ToDictionary(g => g.Key);
        var daily = Enumerable.Range(0, days).Select(i =>
        {
            var date = from.AddDays(i);
            if (!byDay.TryGetValue(date, out var g)) return new AnalyticsDailyPointDto(date, 0, 0, 0, 0);
            return new AnalyticsDailyPointDto(date,
                g.Count(r => r.Type == BusinessEventType.ProfileView),
                g.Count(r => r.Type == BusinessEventType.QrScan),
                g.Count(r => ClickEvents.Contains(r.Type)),
                g.Select(r => r.VisitorHash).Distinct().Count());
        }).ToList();

        var top = await analytics.TopProductsAsync(b.Id, fromUtc, toUtc, 5, ct);
        var productLookup = await catalog.GetProductsAsync(b.Id, top.Select(t => t.ProductId), ct);
        var topProducts = top.Where(t => productLookup.ContainsKey(t.ProductId))
            .Select(t => new TopProductDto(t.ProductId, productLookup[t.ProductId].Name,
                productLookup[t.ProductId].Images.OrderBy(i => i.SortOrder).FirstOrDefault()?.Url, t.Views))
            .ToList();

        return new BusinessAnalyticsDto(from, to, days, Totals(current), Totals(previous), daily, topProducts);
    }

    /// <summary>
    /// Unique visitors are distinct (visitor, day) pairs: the anonymous id rotates daily by design,
    /// so a person returning on another day counts again.
    /// </summary>
    private static AnalyticsTotalsDto Totals(List<EventRow> rows)
    {
        int Count(BusinessEventType t) => rows.Count(r => r.Type == t);
        return new AnalyticsTotalsDto(
            Count(BusinessEventType.QrScan),
            rows.Select(r => r.VisitorHash).Distinct().Count(),
            Count(BusinessEventType.ProfileView),
            Count(BusinessEventType.ProductView),
            Count(BusinessEventType.WhatsAppClick),
            Count(BusinessEventType.CallClick),
            Count(BusinessEventType.WebsiteClick),
            Count(BusinessEventType.DirectionsClick),
            Count(BusinessEventType.ShareClick),
            Count(BusinessEventType.EnquirySubmitted));
    }

    private async Task<IReadOnlyList<ActivityItemDto>> RecentActivityAsync(Business b, bool canSeeEnquiries, CancellationToken ct)
    {
        var items = new List<ActivityItemDto>();
        var events = await analytics.RecentAsync(b.Id, 15, ct);
        var products = await catalog.GetProductsAsync(b.Id, events.Where(e => e.ProductId is not null).Select(e => e.ProductId!.Value), ct);
        foreach (var e in events.Where(e => e.Type != BusinessEventType.EnquirySubmitted))
        {
            var (kind, title) = e.Type switch
            {
                BusinessEventType.QrScan => ("scan", "QR code scanned"),
                BusinessEventType.ProfileView => ("view", "Profile viewed"),
                BusinessEventType.ProductView => ("product", "Product viewed"),
                BusinessEventType.WhatsAppClick => ("whatsapp", "WhatsApp button tapped"),
                BusinessEventType.CallClick => ("call", "Call button tapped"),
                BusinessEventType.WebsiteClick => ("website", "Website link opened"),
                BusinessEventType.DirectionsClick => ("directions", "Directions requested"),
                BusinessEventType.ShareClick => ("share", "Profile shared"),
                _ => ("event", e.Type.ToString())
            };
            var detail = e.ProductId is not null && products.TryGetValue(e.ProductId.Value, out var p) ? p.Name : null;
            items.Add(new ActivityItemDto(kind, title, detail, e.OccurredAt));
        }

        var enquiries = (await engagement.QueryEnquiriesAsync(b.Id, new EnquiryQuery { Page = 1, PageSize = 5 }, ct)).Items;
        items.AddRange(enquiries.Select(e => new ActivityItemDto("enquiry", "New enquiry received",
            canSeeEnquiries ? $"{e.CustomerName}: {e.Subject}" : null, e.CreatedAt)));

        var reviews = await engagement.ListReviewsAsync(b.Id, null, 5, ct);
        items.AddRange(reviews.Select(r => new ActivityItemDto("review", $"{r.Rating}★ review received",
            r.Status == ReviewStatus.Pending ? "Awaiting your approval" : r.CustomerName, r.CreatedAt)));

        return items.OrderByDescending(i => i.OccurredAt).Take(12).ToList();
    }
}

public sealed class PublicBusinessService(
    IBusinessRepository businesses,
    IBusinessCatalogRepository catalog,
    IBusinessCategoryRepository categories,
    StorefrontBuilder storefront,
    TimeProvider clock) : IPublicBusinessService
{
    public async Task<PublicBusinessDto> GetAsync(string slug, CancellationToken ct = default) =>
        await storefront.BuildAsync(await LoadAsync(slug, ct), isPreview: false, ct);

    public async Task<PagedResult<PublicProductDto>> ListProductsAsync(string slug, ProductQuery query, CancellationToken ct = default)
    {
        var b = await LoadAsync(slug, ct);
        var defs = await categories.ListAttributesAsync(b.CategoryId, ct);
        var (items, total) = await catalog.QueryProductsAsync(b.Id, query, publicOnly: true, ct);
        return new PagedResult<PublicProductDto>(items.Select(p => BusinessMapper.PublicProduct(p, defs)).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<PublicProductDto> GetProductAsync(string slug, Guid productId, CancellationToken ct = default)
    {
        var b = await LoadAsync(slug, ct);
        var product = await catalog.GetProductAsync(b.Id, productId, ct);
        if (product is null || !product.IsAvailable) throw new NotFoundException("Product not found.");
        return BusinessMapper.PublicProduct(product, await categories.ListAttributesAsync(b.CategoryId, ct));
    }

    public async Task<IReadOnlyList<PublicServiceDto>> ListServicesAsync(string slug, CancellationToken ct = default)
    {
        var b = await LoadAsync(slug, ct);
        return (await catalog.ListServicesAsync(b.Id, availableOnly: true, ct))
            .Select(s => new PublicServiceDto(s.Id, s.Name, s.Description, s.PriceInPaise, s.PriceNote, s.Currency, s.DurationMinutes, s.ImageUrl, s.IsFeatured))
            .ToList();
    }

    public async Task<IReadOnlyList<PublicOfferDto>> ListOffersAsync(string slug, CancellationToken ct = default)
    {
        var b = await LoadAsync(slug, ct);
        var today = BusinessTime.Today(b.TimeZone, clock.GetUtcNow().UtcDateTime);
        return (await catalog.ListLiveOffersAsync(b.Id, today, ct))
            .Select(o => new PublicOfferDto(o.Id, o.Title, o.Description, o.DiscountPercent, o.DiscountAmountInPaise, o.BannerUrl, o.EndDate, o.IsFeatured))
            .ToList();
    }

    private async Task<Business> LoadAsync(string slug, CancellationToken ct) =>
        await businesses.GetPublicBySlugAsync(slug.Trim().ToLowerInvariant(), ct) ?? throw new NotFoundException("Business not found.");
}
