using Microsoft.EntityFrameworkCore;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;
using ProLink.Infrastructure.Data;

namespace ProLink.Infrastructure.Repositories;

/// <summary>Case-insensitive "contains" search that behaves the same on SQL Server and SQLite, with wildcards escaped.</summary>
internal static class SearchPattern
{
    public const string Escape = @"\";

    public static string Contains(string term) =>
        "%" + term.Trim().Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_") + "%";
}

public sealed class BusinessCategoryRepository(AppDbContext db) : IBusinessCategoryRepository
{
    public Task<List<BusinessCategory>> ListAsync(CancellationToken ct = default) =>
        db.BusinessCategories.AsNoTracking()
            .Include(c => c.Subcategories.OrderBy(s => s.SortOrder))
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ToListAsync(ct);

    public Task<BusinessCategory?> GetAsync(int id, bool includeAttributes, CancellationToken ct = default)
    {
        IQueryable<BusinessCategory> q = db.BusinessCategories.AsNoTracking().Include(c => c.Subcategories);
        if (includeAttributes) q = q.Include(c => c.Attributes);
        return q.FirstOrDefaultAsync(c => c.Id == id && c.IsActive, ct);
    }

    public Task<List<BusinessCategoryAttribute>> ListAttributesAsync(int categoryId, CancellationToken ct = default) =>
        db.BusinessCategoryAttributes.AsNoTracking()
            .Where(a => a.CategoryId == categoryId)
            .OrderBy(a => a.SortOrder)
            .ToListAsync(ct);
}

public sealed class BusinessRepository(AppDbContext db) : IBusinessRepository
{
    public async Task<List<BusinessAccess>> ListForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var rows = await db.Businesses.AsNoTracking()
            .Include(b => b.Category)
            .Where(b => b.OwnerId == userId || b.Members.Any(m => m.UserId == userId))
            .Select(b => new
            {
                Business = b,
                MemberRole = b.Members.Where(m => m.UserId == userId).Select(m => (BusinessRole?)m.Role).FirstOrDefault()
            })
            .ToListAsync(ct);
        return rows
            .Select(r => new BusinessAccess(r.Business, r.Business.OwnerId == userId ? BusinessRole.Owner : r.MemberRole ?? BusinessRole.Editor))
            .OrderByDescending(r => r.Business.UpdatedAt)
            .ToList();
    }

    public Task<int> CountOwnedAsync(Guid userId, CancellationToken ct = default) =>
        db.Businesses.CountAsync(b => b.OwnerId == userId, ct);

    public Task<bool> SlugExistsAsync(string slug, Guid? excludeId, CancellationToken ct = default) =>
        db.Businesses.AnyAsync(b => b.Slug == slug && (excludeId == null || b.Id != excludeId), ct);

    /// <summary>Main QR codes and campaign codes share one namespace (both resolve via /bq/{code}).</summary>
    public async Task<bool> QrCodeExistsAsync(string code, CancellationToken ct = default) =>
        await db.Businesses.AnyAsync(b => b.QrCode == code, ct) || await db.BusinessQrCampaigns.AnyAsync(c => c.Code == code, ct);

    public async Task<BusinessAccess?> GetAccessAsync(Guid businessId, Guid userId, CancellationToken ct = default)
    {
        var business = await db.Businesses
            .AsSplitQuery()
            .Include(b => b.Category)
            .Include(b => b.Subcategory)
            .Include(b => b.SocialLinks)
            .Include(b => b.WorkingHours)
            .Include(b => b.SpecialHours)
            .FirstOrDefaultAsync(b => b.Id == businessId, ct);
        if (business is null) return null;
        if (business.OwnerId == userId) return new BusinessAccess(business, BusinessRole.Owner);

        var role = await db.BusinessMembers
            .Where(m => m.BusinessId == businessId && m.UserId == userId)
            .Select(m => (BusinessRole?)m.Role)
            .FirstOrDefaultAsync(ct);
        return role is null ? null : new BusinessAccess(business, role.Value);
    }

    public Task<bool> IsTeamMemberAsync(Guid businessId, Guid userId, CancellationToken ct = default) =>
        db.Businesses.AnyAsync(b => b.Id == businessId && (b.OwnerId == userId || b.Members.Any(m => m.UserId == userId)), ct);

    public Task<Business?> GetPublicBySlugAsync(string slug, CancellationToken ct = default) =>
        db.Businesses.AsNoTracking()
            .AsSplitQuery()
            .Include(b => b.Category)
            .Include(b => b.Subcategory)
            .Include(b => b.SocialLinks)
            .Include(b => b.WorkingHours)
            .Include(b => b.SpecialHours)
            .FirstOrDefaultAsync(b => b.Slug == slug && b.Status == BusinessStatus.Published && b.IsActive, ct);

    public Task<Business?> GetByQrCodeAsync(string code, CancellationToken ct = default) =>
        db.Businesses.AsNoTracking().FirstOrDefaultAsync(b => b.QrCode == code, ct);

    public async Task<List<string>> ListFileUrlsAsync(Guid businessId, CancellationToken ct = default)
    {
        var urls = new List<string?>();
        var b = await db.Businesses.AsNoTracking().Where(x => x.Id == businessId)
            .Select(x => new { x.LogoUrl, x.CoverUrl }).FirstOrDefaultAsync(ct);
        if (b is not null) urls.AddRange([b.LogoUrl, b.CoverUrl]);
        urls.AddRange(await db.BusinessProductImages.Where(i => i.Product!.BusinessId == businessId).Select(i => i.Url).ToListAsync(ct));
        urls.AddRange(await db.BusinessServices.Where(s => s.BusinessId == businessId).Select(s => s.ImageUrl).ToListAsync(ct));
        urls.AddRange(await db.BusinessOffers.Where(o => o.BusinessId == businessId).Select(o => o.BannerUrl).ToListAsync(ct));
        urls.AddRange(await db.BusinessGalleryImages.Where(g => g.BusinessId == businessId).Select(g => g.Url).ToListAsync(ct));
        return urls.Where(u => !string.IsNullOrEmpty(u)).Select(u => u!).ToList();
    }

    public void Add(Business business) => db.Businesses.Add(business);

    public Task<List<BusinessMember>> ListMembersAsync(Guid businessId, CancellationToken ct = default) =>
        db.BusinessMembers.AsNoTracking()
            .Include(m => m.User).ThenInclude(u => u!.Profile)
            .Where(m => m.BusinessId == businessId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);

    public Task<BusinessMember?> GetMemberAsync(Guid businessId, Guid userId, CancellationToken ct = default) =>
        db.BusinessMembers.Include(m => m.User).ThenInclude(u => u!.Profile)
            .FirstOrDefaultAsync(m => m.BusinessId == businessId && m.UserId == userId, ct);

    public void AddMember(BusinessMember member) => db.BusinessMembers.Add(member);
}

public sealed class BusinessCatalogRepository(AppDbContext db) : IBusinessCatalogRepository
{
    // ---------- Product categories ----------

    public async Task<List<(BusinessProductCategory Category, int ProductCount)>> ListProductCategoriesAsync(
        Guid businessId, bool publicOnly, CancellationToken ct = default)
    {
        var rows = await db.BusinessProductCategories.AsNoTracking()
            .Where(c => c.BusinessId == businessId)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new
            {
                Category = c,
                Count = db.BusinessProducts.Count(p => p.ProductCategoryId == c.Id && (!publicOnly || p.IsAvailable))
            })
            .ToListAsync(ct);
        return rows.Select(r => (r.Category, r.Count)).ToList();
    }

    public Task<BusinessProductCategory?> GetProductCategoryAsync(Guid businessId, Guid id, CancellationToken ct = default) =>
        db.BusinessProductCategories.FirstOrDefaultAsync(c => c.BusinessId == businessId && c.Id == id, ct);

    public Task<bool> ProductCategoryNameExistsAsync(Guid businessId, string name, Guid? excludeId, CancellationToken ct = default) =>
        db.BusinessProductCategories.AnyAsync(c => c.BusinessId == businessId && c.Name == name && (excludeId == null || c.Id != excludeId), ct);

    public Task ClearProductCategoryAsync(Guid categoryId, CancellationToken ct = default) =>
        db.BusinessProducts.Where(p => p.ProductCategoryId == categoryId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.ProductCategoryId, (Guid?)null), ct);

    public void AddProductCategory(BusinessProductCategory category) => db.BusinessProductCategories.Add(category);

    // ---------- Products ----------

    public async Task<(List<BusinessProduct> Items, int Total)> QueryProductsAsync(Guid businessId, ProductQuery query,
        bool publicOnly, CancellationToken ct = default)
    {
        var q = db.BusinessProducts.AsNoTracking().Where(p => p.BusinessId == businessId);
        if (publicOnly) q = q.Where(p => p.IsAvailable);
        else if (query.Available is not null) q = q.Where(p => p.IsAvailable == query.Available);
        if (query.CategoryId is not null) q = q.Where(p => p.ProductCategoryId == query.CategoryId);
        if (query.Stock is not null) q = q.Where(p => p.Stock == query.Stock);
        if (query.Featured is not null) q = q.Where(p => p.IsFeatured == query.Featured);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var like = SearchPattern.Contains(query.Search);
            q = q.Where(p => EF.Functions.Like(p.Name, like, SearchPattern.Escape)
                             || (p.Sku != null && EF.Functions.Like(p.Sku, like, SearchPattern.Escape))
                             || (p.Description != null && EF.Functions.Like(p.Description, like, SearchPattern.Escape)));
        }

        var total = await q.CountAsync(ct);
        q = query.Sort switch
        {
            "oldest" => q.OrderBy(p => p.CreatedAt),
            "name" => q.OrderBy(p => p.Name),
            "price_asc" => q.OrderBy(p => (p.DiscountPriceInPaise ?? p.PriceInPaise) == null)
                .ThenBy(p => p.DiscountPriceInPaise ?? p.PriceInPaise),
            "price_desc" => q.OrderBy(p => (p.DiscountPriceInPaise ?? p.PriceInPaise) == null)
                .ThenByDescending(p => p.DiscountPriceInPaise ?? p.PriceInPaise),
            _ => publicOnly
                ? q.OrderByDescending(p => p.IsFeatured).ThenByDescending(p => p.CreatedAt)
                : q.OrderByDescending(p => p.CreatedAt)
        };

        var items = await q
            .Include(p => p.ProductCategory)
            .Include(p => p.Images.OrderBy(i => i.SortOrder))
            .AsSplitQuery()
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);
        return (items, total);
    }

    public Task<BusinessProduct?> GetProductAsync(Guid businessId, Guid productId, CancellationToken ct = default) =>
        db.BusinessProducts
            .Include(p => p.ProductCategory)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.BusinessId == businessId && p.Id == productId, ct);

    public Task<List<BusinessProduct>> ListFeaturedProductsAsync(Guid businessId, int take, CancellationToken ct = default) =>
        db.BusinessProducts.AsNoTracking()
            .Include(p => p.ProductCategory)
            .Include(p => p.Images.OrderBy(i => i.SortOrder))
            .AsSplitQuery()
            .Where(p => p.BusinessId == businessId && p.IsAvailable)
            .OrderByDescending(p => p.IsFeatured).ThenBy(p => p.SortOrder).ThenByDescending(p => p.CreatedAt)
            .Take(take)
            .ToListAsync(ct);

    public async Task<Dictionary<Guid, BusinessProduct>> GetProductsAsync(Guid businessId, IEnumerable<Guid> ids,
        CancellationToken ct = default)
    {
        var list = ids.Distinct().ToList();
        return await db.BusinessProducts.AsNoTracking()
            .Include(p => p.Images.OrderBy(i => i.SortOrder))
            .Where(p => p.BusinessId == businessId && list.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);
    }

    public Task<bool> SkuExistsAsync(Guid businessId, string sku, Guid? excludeId, CancellationToken ct = default) =>
        db.BusinessProducts.AnyAsync(p => p.BusinessId == businessId && p.Sku == sku && (excludeId == null || p.Id != excludeId), ct);

    public Task<int> CountProductsAsync(Guid businessId, bool publicOnly, CancellationToken ct = default) =>
        db.BusinessProducts.CountAsync(p => p.BusinessId == businessId && (!publicOnly || p.IsAvailable), ct);

    public void AddProduct(BusinessProduct product) => db.BusinessProducts.Add(product);
    public void AddProductImage(BusinessProductImage image) => db.BusinessProductImages.Add(image);

    // ---------- Services ----------

    public Task<List<BusinessService>> ListServicesAsync(Guid businessId, bool availableOnly, CancellationToken ct = default) =>
        db.BusinessServices.AsNoTracking()
            .Where(s => s.BusinessId == businessId && (!availableOnly || s.IsAvailable))
            .OrderByDescending(s => s.IsFeatured).ThenBy(s => s.SortOrder).ThenBy(s => s.Name)
            .ToListAsync(ct);

    public Task<BusinessService?> GetServiceAsync(Guid businessId, Guid serviceId, CancellationToken ct = default) =>
        db.BusinessServices.FirstOrDefaultAsync(s => s.BusinessId == businessId && s.Id == serviceId, ct);

    public void AddService(BusinessService service) => db.BusinessServices.Add(service);

    // ---------- Offers ----------

    public Task<List<BusinessOffer>> ListOffersAsync(Guid businessId, CancellationToken ct = default) =>
        db.BusinessOffers.AsNoTracking()
            .Where(o => o.BusinessId == businessId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(ct);

    public Task<List<BusinessOffer>> ListLiveOffersAsync(Guid businessId, DateOnly today, CancellationToken ct = default) =>
        db.BusinessOffers.AsNoTracking()
            .Where(o => o.BusinessId == businessId && o.IsActive
                        && (o.StartDate == null || o.StartDate <= today)
                        && (o.EndDate == null || o.EndDate >= today))
            .OrderByDescending(o => o.IsFeatured).ThenBy(o => o.EndDate == null).ThenBy(o => o.EndDate)
            .ToListAsync(ct);

    public Task<BusinessOffer?> GetOfferAsync(Guid businessId, Guid offerId, CancellationToken ct = default) =>
        db.BusinessOffers.FirstOrDefaultAsync(o => o.BusinessId == businessId && o.Id == offerId, ct);

    public void AddOffer(BusinessOffer offer) => db.BusinessOffers.Add(offer);

    // ---------- Gallery ----------

    public Task<List<BusinessGalleryImage>> ListGalleryAsync(Guid businessId, CancellationToken ct = default) =>
        db.BusinessGalleryImages.AsNoTracking()
            .Where(g => g.BusinessId == businessId)
            .OrderBy(g => g.SortOrder).ThenByDescending(g => g.CreatedAt)
            .ToListAsync(ct);

    public Task<BusinessGalleryImage?> GetGalleryImageAsync(Guid businessId, Guid imageId, CancellationToken ct = default) =>
        db.BusinessGalleryImages.FirstOrDefaultAsync(g => g.BusinessId == businessId && g.Id == imageId, ct);

    public Task<int> CountGalleryAsync(Guid businessId, CancellationToken ct = default) =>
        db.BusinessGalleryImages.CountAsync(g => g.BusinessId == businessId, ct);

    public void AddGalleryImage(BusinessGalleryImage image) => db.BusinessGalleryImages.Add(image);
}

public sealed class BusinessEngagementRepository(AppDbContext db) : IBusinessEngagementRepository
{
    public Task<List<BusinessReview>> ListReviewsAsync(Guid businessId, ReviewStatus? status, int take, CancellationToken ct = default) =>
        db.BusinessReviews.AsNoTracking()
            .Where(r => r.BusinessId == businessId && (status == null || r.Status == status))
            .OrderByDescending(r => r.CreatedAt)
            .Take(take)
            .ToListAsync(ct);

    public Task<BusinessReview?> GetReviewAsync(Guid businessId, Guid reviewId, CancellationToken ct = default) =>
        db.BusinessReviews.FirstOrDefaultAsync(r => r.BusinessId == businessId && r.Id == reviewId, ct);

    public async Task<int[]> GetRatingDistributionAsync(Guid businessId, CancellationToken ct = default)
    {
        var counts = await db.BusinessReviews
            .Where(r => r.BusinessId == businessId && r.Status == ReviewStatus.Approved)
            .GroupBy(r => r.Rating)
            .Select(g => new { Rating = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var result = new int[5];
        foreach (var c in counts.Where(c => c.Rating is >= 1 and <= 5)) result[c.Rating - 1] = c.Count;
        return result;
    }

    public Task<int> CountReviewsAsync(Guid businessId, ReviewStatus status, CancellationToken ct = default) =>
        db.BusinessReviews.CountAsync(r => r.BusinessId == businessId && r.Status == status, ct);

    public void AddReview(BusinessReview review) => db.BusinessReviews.Add(review);

    public async Task<(List<BusinessEnquiry> Items, int Total)> QueryEnquiriesAsync(Guid businessId, EnquiryQuery query,
        CancellationToken ct = default)
    {
        var q = db.BusinessEnquiries.AsNoTracking().Where(e => e.BusinessId == businessId);
        if (query.Status is not null) q = q.Where(e => e.Status == query.Status);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var like = SearchPattern.Contains(query.Search);
            q = q.Where(e => EF.Functions.Like(e.CustomerName, like, SearchPattern.Escape)
                             || EF.Functions.Like(e.Subject, like, SearchPattern.Escape)
                             || EF.Functions.Like(e.Message, like, SearchPattern.Escape)
                             || (e.Email != null && EF.Functions.Like(e.Email, like, SearchPattern.Escape))
                             || (e.Phone != null && EF.Functions.Like(e.Phone, like, SearchPattern.Escape)));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(e => e.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .ToListAsync(ct);
        return (items, total);
    }

    public Task<BusinessEnquiry?> GetEnquiryAsync(Guid businessId, Guid enquiryId, CancellationToken ct = default) =>
        db.BusinessEnquiries
            .Include(e => e.Activities)
            .FirstOrDefaultAsync(e => e.BusinessId == businessId && e.Id == enquiryId, ct);

    public Task<int> CountEnquiriesAsync(Guid businessId, BusinessEnquiryStatus? status, DateTime? since, CancellationToken ct = default) =>
        db.BusinessEnquiries.CountAsync(e => e.BusinessId == businessId
                                             && (status == null || e.Status == status)
                                             && (since == null || e.CreatedAt >= since), ct);

    public void AddEnquiry(BusinessEnquiry enquiry) => db.BusinessEnquiries.Add(enquiry);
    public void AddEnquiryActivity(BusinessEnquiryActivity activity) => db.BusinessEnquiryActivities.Add(activity);
}

public sealed class BusinessAnalyticsRepository(AppDbContext db) : IBusinessAnalyticsRepository
{
    public void AddEvent(BusinessAnalyticsEvent analyticsEvent) => db.BusinessAnalyticsEvents.Add(analyticsEvent);

    public Task<bool> HasRecentEventAsync(Guid businessId, string visitorHash, BusinessEventType type, Guid? productId,
        DateTime since, CancellationToken ct = default, Guid? campaignId = null) =>
        db.BusinessAnalyticsEvents.AnyAsync(e => e.BusinessId == businessId && e.VisitorHash == visitorHash && e.Type == type
                                                 && e.ProductId == productId && e.CampaignId == campaignId && e.OccurredAt >= since, ct);

    public Task<List<EventRow>> ListEventsAsync(Guid businessId, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default) =>
        db.BusinessAnalyticsEvents.AsNoTracking()
            .Where(e => e.BusinessId == businessId && e.OccurredAt >= fromUtc && e.OccurredAt < toUtc)
            .Select(e => new EventRow(e.Type, e.VisitorHash, e.OccurredAt))
            .ToListAsync(ct);

    public async Task<List<(Guid ProductId, int Views)>> TopProductsAsync(Guid businessId, DateTime fromUtc, DateTime toUtc,
        int take, CancellationToken ct = default)
    {
        var rows = await db.BusinessAnalyticsEvents.AsNoTracking()
            .Where(e => e.BusinessId == businessId && e.Type == BusinessEventType.ProductView && e.ProductId != null
                        && e.OccurredAt >= fromUtc && e.OccurredAt < toUtc)
            .GroupBy(e => e.ProductId!.Value)
            .Select(g => new { ProductId = g.Key, Views = g.Count() })
            .OrderByDescending(x => x.Views)
            .Take(take)
            .ToListAsync(ct);
        return rows.Select(r => (r.ProductId, r.Views)).ToList();
    }

    public Task<int> CountAsync(Guid businessId, BusinessEventType type, DateTime? sinceUtc, CancellationToken ct = default) =>
        db.BusinessAnalyticsEvents.CountAsync(e => e.BusinessId == businessId && e.Type == type
                                                   && (sinceUtc == null || e.OccurredAt >= sinceUtc), ct);

    public Task<List<BusinessAnalyticsEvent>> RecentAsync(Guid businessId, int take, CancellationToken ct = default) =>
        db.BusinessAnalyticsEvents.AsNoTracking()
            .Where(e => e.BusinessId == businessId)
            .OrderByDescending(e => e.Id)
            .Take(take)
            .ToListAsync(ct);

    public Task<List<ScanRow>> ListScansAsync(Guid businessId, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default) =>
        db.BusinessAnalyticsEvents.AsNoTracking()
            .Where(e => e.BusinessId == businessId && e.Type == BusinessEventType.QrScan && e.OccurredAt >= fromUtc && e.OccurredAt < toUtc)
            .Select(e => new ScanRow(e.CampaignId, e.VisitorHash, e.OccurredAt))
            .ToListAsync(ct);

    public async Task<Dictionary<Guid, (int Total, int Recent)>> CampaignScanCountsAsync(Guid businessId, DateTime sinceUtc, CancellationToken ct = default)
    {
        var rows = await db.BusinessAnalyticsEvents.AsNoTracking()
            .Where(e => e.BusinessId == businessId && e.Type == BusinessEventType.QrScan && e.CampaignId != null)
            .GroupBy(e => e.CampaignId!.Value)
            .Select(g => new { Id = g.Key, Total = g.Count(), Recent = g.Count(e => e.OccurredAt >= sinceUtc) })
            .ToListAsync(ct);
        return rows.ToDictionary(r => r.Id, r => (r.Total, r.Recent));
    }
}

public sealed class BusinessQrCampaignRepository(AppDbContext db) : IBusinessQrCampaignRepository
{
    public Task<List<BusinessQrCampaign>> ListAsync(Guid businessId, CancellationToken ct = default) =>
        db.BusinessQrCampaigns.AsNoTracking()
            .Where(c => c.BusinessId == businessId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);

    public Task<BusinessQrCampaign?> GetAsync(Guid businessId, Guid campaignId, CancellationToken ct = default) =>
        db.BusinessQrCampaigns.FirstOrDefaultAsync(c => c.BusinessId == businessId && c.Id == campaignId, ct);

    public Task<BusinessQrCampaign?> GetByCodeAsync(string code, CancellationToken ct = default) =>
        db.BusinessQrCampaigns.AsNoTracking().Include(c => c.Business).FirstOrDefaultAsync(c => c.Code == code, ct);

    public Task<int> CountAsync(Guid businessId, CancellationToken ct = default) =>
        db.BusinessQrCampaigns.CountAsync(c => c.BusinessId == businessId, ct);

    public Task<bool> NameExistsAsync(Guid businessId, string name, Guid? excludeId, CancellationToken ct = default) =>
        db.BusinessQrCampaigns.AnyAsync(c => c.BusinessId == businessId && c.Name == name && (excludeId == null || c.Id != excludeId), ct);

    public void Add(BusinessQrCampaign campaign) => db.BusinessQrCampaigns.Add(campaign);
}
