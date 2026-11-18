using System.Globalization;
using System.IO.Compression;
using Microsoft.Extensions.Options;
using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;

namespace ProLink.Application.Services.Businesses;

/// <summary>
/// Extra QR codes per business, each with its own destination, style, expiry and scan statistics.
/// Viewing and downloading needs Editor; creating, editing and deleting needs Manager (same as the main QR).
/// </summary>
public sealed class BusinessQrCampaignService(
    IBusinessRepository businesses,
    IBusinessQrCampaignRepository campaigns,
    IBusinessCatalogRepository catalog,
    IBusinessAnalyticsRepository analytics,
    IQrCodeGenerator generator,
    IUnitOfWork uow,
    BusinessAccessGuard guard,
    EventRecorder recorder,
    IOptions<AppOptions> options,
    TimeProvider clock)
{
    public const int MaxCampaignsPerBusiness = 200;
    /// <summary>Minimum WCAG contrast between dark modules and background for reliable scanning.</summary>
    public const double MinContrast = 4.0;

    private DateTime Now => clock.GetUtcNow().UtcDateTime;
    private string QrUrl(string code) => BusinessUrls.Qr(options.Value.PublicBaseUrl, code);

    // ---------------------------------------------------------------------
    // Owner endpoints
    // ---------------------------------------------------------------------

    public async Task<IReadOnlyList<QrCampaignDto>> ListAsync(Guid userId, Guid businessId, CancellationToken ct)
    {
        await guard.RequireAsync(userId, businessId, BusinessRole.Editor, ct);
        var list = await campaigns.ListAsync(businessId, ct);
        var counts = await analytics.CampaignScanCountsAsync(businessId, Now.AddDays(-30), ct);
        var names = await TargetNamesAsync(businessId, list, ct);
        return list.Select(c => Dto(c, counts, names)).ToList();
    }

    public async Task<QrCampaignDto> CreateAsync(Guid userId, Guid businessId, QrCampaignUpsertRequest request, CancellationToken ct)
    {
        await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        if (await campaigns.CountAsync(businessId, ct) >= MaxCampaignsPerBusiness)
            throw new BusinessValidationException($"A business can have up to {MaxCampaignsPerBusiness} QR campaigns.");

        var campaign = new BusinessQrCampaign { BusinessId = businessId, Code = await BusinessProfileService.NewQrCodeAsync(businesses, ct) };
        await ApplyAsync(campaign, request, ct);
        campaigns.Add(campaign);
        await uow.SaveChangesAsync(ct);
        return await SingleAsync(campaign, ct);
    }

    public async Task<IReadOnlyList<QrCampaignDto>> CreateBulkAsync(Guid userId, Guid businessId, BulkQrCampaignRequest request, CancellationToken ct)
    {
        await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        if (request.Destination is QrDestination.Product or QrDestination.Offer)
            throw new BusinessValidationException("Bulk codes can open a section (e.g. the menu), not a single product or offer.");
        if (await campaigns.CountAsync(businessId, ct) + request.Count > MaxCampaignsPerBusiness)
            throw new BusinessValidationException($"A business can have up to {MaxCampaignsPerBusiness} QR campaigns.");
        EnsureScannable(request.ForegroundColor, request.BackgroundColor);

        var prefix = request.NamePrefix.Trim();
        var created = new List<BusinessQrCampaign>();
        for (var i = 0; i < request.Count; i++)
        {
            var name = $"{prefix} {request.StartNumber + i}";
            if (await campaigns.NameExistsAsync(businessId, name, null, ct))
                throw new ConflictException($"A QR campaign called \"{name}\" already exists. Choose a different prefix or start number.");
            var campaign = new BusinessQrCampaign
            {
                BusinessId = businessId, Name = name, Code = await BusinessProfileService.NewQrCodeAsync(businesses, ct),
                Destination = request.Destination, ForegroundColor = request.ForegroundColor.ToUpperInvariant(),
                BackgroundColor = request.BackgroundColor.ToUpperInvariant(), ShowLogo = request.ShowLogo, FrameText = Text.Clean(request.FrameText)
            };
            campaigns.Add(campaign);
            created.Add(campaign);
        }
        await uow.SaveChangesAsync(ct);
        return created.Select(c => Dto(c, new Dictionary<Guid, (int, int)>(), new Dictionary<Guid, string>())).ToList();
    }

    public async Task<QrCampaignDto> UpdateAsync(Guid userId, Guid businessId, Guid campaignId, QrCampaignUpsertRequest request, CancellationToken ct)
    {
        await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        var campaign = await campaigns.GetAsync(businessId, campaignId, ct) ?? throw new NotFoundException("QR campaign not found.");
        await ApplyAsync(campaign, request, ct);
        await uow.SaveChangesAsync(ct);
        return await SingleAsync(campaign, ct);
    }

    public async Task DeleteAsync(Guid userId, Guid businessId, Guid campaignId, CancellationToken ct)
    {
        await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        var campaign = await campaigns.GetAsync(businessId, campaignId, ct) ?? throw new NotFoundException("QR campaign not found.");
        // Scan history stays in analytics (shown as a deleted campaign); the code stops resolving.
        uow.Remove(campaign);
        await uow.SaveChangesAsync(ct);
    }

    public async Task<QrCampaignStatsDto> StatsAsync(Guid userId, Guid businessId, int days, CancellationToken ct)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Editor, ct);
        days = Math.Clamp(days, 7, 90);
        var zone = access.Business.TimeZone;
        var to = BusinessTime.Today(zone, Now);
        var from = to.AddDays(-(days - 1));
        var rows = await analytics.ListScansAsync(businessId, BusinessTime.StartOfDayUtc(from, zone), BusinessTime.StartOfDayUtc(to.AddDays(1), zone), ct);
        var list = await campaigns.ListAsync(businessId, ct);
        var names = list.ToDictionary(c => c.Id, c => c.Name);

        QrCampaignStatsItemDto Item(Guid? id, string name, List<ScanRow> scans)
        {
            var daily = new int[days];
            foreach (var s in scans)
            {
                var index = DateOnly.FromDateTime(BusinessTime.ToLocal(s.OccurredAt, zone)).DayNumber - from.DayNumber;
                if (index >= 0 && index < days) daily[index]++;
            }
            return new QrCampaignStatsItemDto(id, name, scans.Count, scans.Select(s => s.VisitorHash).Distinct().Count(), daily);
        }

        // Dictionary keys can't be null, so main-QR scans (CampaignId == null) are kept separately.
        var mainScans = rows.Where(r => r.CampaignId is null).ToList();
        var byCampaign = rows.Where(r => r.CampaignId is not null).GroupBy(r => r.CampaignId!.Value).ToDictionary(g => g.Key, g => g.ToList());
        var items = new List<QrCampaignStatsItemDto> { Item(null, "Main storefront QR", mainScans) };
        items.AddRange(list.Select(c => Item(c.Id, c.Name, byCampaign.GetValueOrDefault(c.Id) ?? [])));
        // Scans from campaigns that were later deleted are still counted, grouped together.
        var deleted = byCampaign.Where(kv => !names.ContainsKey(kv.Key)).SelectMany(kv => kv.Value).ToList();
        if (deleted.Count > 0) items.Add(Item(Guid.Empty, "Deleted campaigns", deleted));

        return new QrCampaignStatsDto(from, to, days, items.OrderByDescending(i => i.Scans).ToList());
    }

    /// <summary>ZIP of plain PNG codes in each campaign's colours (for printing table cards in bulk).</summary>
    public async Task<byte[]> DownloadZipAsync(Guid userId, Guid businessId, IReadOnlyCollection<Guid> ids, CancellationToken ct)
    {
        await guard.RequireAsync(userId, businessId, BusinessRole.Editor, ct);
        var selected = (await campaigns.ListAsync(businessId, ct)).Where(c => ids.Count == 0 || ids.Contains(c.Id)).ToList();
        if (selected.Count == 0) throw new NotFoundException("No QR campaigns to download.");

        using var buffer = new MemoryStream();
        using (var zip = new ZipArchive(buffer, ZipArchiveMode.Create, leaveOpen: true))
        {
            var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var c in selected)
            {
                var baseName = SafeFileName(c.Name);
                var name = baseName;
                for (var n = 2; !used.Add(name); n++) name = $"{baseName}-{n}";
                var entry = zip.CreateEntry($"{name}.png", CompressionLevel.Fastest);
                await using var stream = entry.Open();
                var png = generator.GeneratePng(QrUrl(c.Code), 24, c.ForegroundColor, c.BackgroundColor);
                await stream.WriteAsync(png, ct);
            }
        }
        return buffer.ToArray();
    }

    // ---------------------------------------------------------------------
    // Public resolve (called by BusinessQrService when the code isn't a main QR)
    // ---------------------------------------------------------------------

    public async Task<QrResolveDto> ResolveAsync(string code, VisitorContext visitor, CancellationToken ct)
    {
        var campaign = await campaigns.GetByCodeAsync(code, ct)
                       ?? throw new NotFoundException("This QR code isn't recognised. It may have been replaced by a newer code.");
        var business = campaign.Business!;
        if (business.Status != BusinessStatus.Published || !business.IsActive)
            throw new NotFoundException("This business profile isn't available right now.");
        if (!campaign.IsEnabled) throw new GoneException("This QR code has been turned off by the business.");
        if (campaign.ExpiresAt is not null && campaign.ExpiresAt <= Now) throw new GoneException("This QR campaign has ended.");

        await recorder.RecordAsync(business.Id, BusinessEventType.QrScan, null, visitor, ct, campaign.Id);

        // A printed code must never dead-end: if its product/offer is gone or not live, open the storefront instead.
        var destination = campaign.Destination;
        var target = campaign.TargetId;
        if (destination == QrDestination.Product)
        {
            var product = target is null ? null : await catalog.GetProductAsync(business.Id, target.Value, ct);
            if (product is null || !product.IsAvailable) (destination, target) = (QrDestination.Products, null);
        }
        else if (destination == QrDestination.Offer)
        {
            var today = BusinessTime.Today(business.TimeZone, Now);
            var live = await catalog.ListLiveOffersAsync(business.Id, today, ct);
            if (target is null || live.All(o => o.Id != target)) (destination, target) = (QrDestination.Profile, null);
        }
        return new QrResolveDto(business.Slug, destination, target);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private async Task ApplyAsync(BusinessQrCampaign c, QrCampaignUpsertRequest r, CancellationToken ct)
    {
        var name = r.Name.Trim();
        if (await campaigns.NameExistsAsync(c.BusinessId, name, c.Id, ct)) throw new ConflictException("Another QR campaign already uses this name.");
        EnsureScannable(r.ForegroundColor, r.BackgroundColor);

        Guid? target = null;
        if (r.Destination == QrDestination.Product)
        {
            _ = await catalog.GetProductAsync(c.BusinessId, r.TargetId!.Value, ct) ?? throw new BusinessValidationException("Choose one of your products.");
            target = r.TargetId;
        }
        else if (r.Destination == QrDestination.Offer)
        {
            _ = await catalog.GetOfferAsync(c.BusinessId, r.TargetId!.Value, ct) ?? throw new BusinessValidationException("Choose one of your offers.");
            target = r.TargetId;
        }

        c.Name = name;
        c.Destination = r.Destination;
        c.TargetId = target;
        c.IsEnabled = r.IsEnabled;
        c.ExpiresAt = r.ExpiresAt is null ? null : DateTime.SpecifyKind(r.ExpiresAt.Value.ToUniversalTime(), DateTimeKind.Utc);
        c.ForegroundColor = r.ForegroundColor.ToUpperInvariant();
        c.BackgroundColor = r.BackgroundColor.ToUpperInvariant();
        c.ShowLogo = r.ShowLogo;
        c.FrameText = Text.Clean(r.FrameText);
    }

    /// <summary>Scanners need dark modules on a light background with enough contrast.</summary>
    public static void EnsureScannable(string foreground, string background)
    {
        double Luminance(string hex)
        {
            double Channel(int i)
            {
                var c = int.Parse(hex.AsSpan(1 + i * 2, 2), NumberStyles.HexNumber) / 255.0;
                return c <= 0.03928 ? c / 12.92 : Math.Pow((c + 0.055) / 1.055, 2.4);
            }
            return 0.2126 * Channel(0) + 0.7152 * Channel(1) + 0.0722 * Channel(2);
        }

        var fg = Luminance(foreground);
        var bg = Luminance(background);
        if (fg >= bg) throw new BusinessValidationException("Use a dark QR colour on a light background — many phones can't read light-on-dark codes.");
        if ((bg + 0.05) / (fg + 0.05) < MinContrast)
            throw new BusinessValidationException("The QR colours are too similar to scan reliably. Pick a darker code colour or a lighter background.");
    }

    private static string SafeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var clean = new string(name.Select(ch => invalid.Contains(ch) ? '-' : ch).ToArray()).Trim();
        return clean.Length == 0 ? "qr" : clean;
    }

    private async Task<Dictionary<Guid, string>> TargetNamesAsync(Guid businessId, List<BusinessQrCampaign> list, CancellationToken ct)
    {
        var names = new Dictionary<Guid, string>();
        var productIds = list.Where(c => c.Destination == QrDestination.Product && c.TargetId is not null).Select(c => c.TargetId!.Value).ToList();
        foreach (var (id, p) in await catalog.GetProductsAsync(businessId, productIds, ct)) names[id] = p.Name;
        if (list.Any(c => c.Destination == QrDestination.Offer))
            foreach (var o in await catalog.ListOffersAsync(businessId, ct)) names[o.Id] = o.Title;
        return names;
    }

    private async Task<QrCampaignDto> SingleAsync(BusinessQrCampaign c, CancellationToken ct)
    {
        var counts = await analytics.CampaignScanCountsAsync(c.BusinessId, Now.AddDays(-30), ct);
        var names = await TargetNamesAsync(c.BusinessId, [c], ct);
        return Dto(c, counts, names);
    }

    private QrCampaignDto Dto(BusinessQrCampaign c, IReadOnlyDictionary<Guid, (int Total, int Recent)> counts, IReadOnlyDictionary<Guid, string> names)
    {
        var (total, recent) = counts.GetValueOrDefault(c.Id);
        return new QrCampaignDto(c.Id, c.Name, c.Code, QrUrl(c.Code), c.Destination, c.TargetId,
            c.TargetId is not null ? names.GetValueOrDefault(c.TargetId.Value) : null,
            c.IsEnabled, c.ExpiresAt, c.ExpiresAt is not null && c.ExpiresAt <= Now,
            c.ForegroundColor, c.BackgroundColor, c.ShowLogo, c.FrameText, total, recent, c.CreatedAt);
    }
}
