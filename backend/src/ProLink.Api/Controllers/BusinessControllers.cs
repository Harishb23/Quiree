using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ProLink.Api.Infrastructure;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Domain.Enums;

namespace ProLink.Api.Controllers;

internal static class UploadLimits
{
    public const long SingleImage = 6 * 1024 * 1024;
    public const long ProductImages = 42 * 1024 * 1024;
}

/// <summary>Business category catalogue (public reference data).</summary>
[ApiController]
[AllowAnonymous]
[Route("api/business-categories")]
public sealed class BusinessCategoriesController(IBusinessCategoryService categories) : ControllerBase
{
    /// <summary>All active categories with their subcategories.</summary>
    [HttpGet]
    public async Task<IReadOnlyList<BusinessCategoryDto>> List(CancellationToken ct)
    {
        Response.Headers.CacheControl = "public,max-age=3600";
        return await categories.ListAsync(ct);
    }

    /// <summary>Category-specific product fields (e.g. shoe size for footwear).</summary>
    [HttpGet("{id:int}/attributes")]
    public Task<IReadOnlyList<CategoryAttributeDto>> Attributes(int id, CancellationToken ct) => categories.GetAttributesAsync(id, ct);
}

/// <summary>Business profiles owned by (or shared with) the signed-in user.</summary>
[ApiController]
[Authorize(Policy = AccountPolicies.Business)]
[Route("api/businesses")]
public sealed class BusinessesController(
    IBusinessProfileService profiles,
    IBusinessAnalyticsService analytics,
    IBusinessQrService qr) : ControllerBase
{
    [HttpGet("my-businesses")]
    public Task<IReadOnlyList<BusinessSummaryDto>> Mine(CancellationToken ct) => profiles.ListMineAsync(User.GetUserId(), ct);

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<ActionResult<BusinessDetailDto>> Create(BusinessUpsertRequest request, CancellationToken ct)
    {
        var created = await profiles.CreateAsync(User.GetUserId(), request, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpGet("{id:guid}")]
    public Task<BusinessDetailDto> Get(Guid id, CancellationToken ct) => profiles.GetAsync(User.GetUserId(), id, ct);

    [HttpPut("{id:guid}")]
    public Task<BusinessDetailDto> Update(Guid id, BusinessUpsertRequest request, CancellationToken ct) =>
        profiles.UpdateAsync(User.GetUserId(), id, request, ct);

    /// <summary>Permanently deletes the business and all its content (owner only).</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await profiles.DeleteAsync(User.GetUserId(), id, ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/publish")]
    public Task<BusinessDetailDto> Publish(Guid id, CancellationToken ct) => profiles.SetPublishedAsync(User.GetUserId(), id, true, ct);

    [HttpPut("{id:guid}/unpublish")]
    public Task<BusinessDetailDto> Unpublish(Guid id, CancellationToken ct) => profiles.SetPublishedAsync(User.GetUserId(), id, false, ct);

    /// <summary>Changes the public link (owner only). The QR code keeps working because it doesn't encode the slug.</summary>
    [HttpPut("{id:guid}/slug")]
    public Task<BusinessDetailDto> UpdateSlug(Guid id, UpdateBusinessSlugRequest request, CancellationToken ct) =>
        profiles.UpdateSlugAsync(User.GetUserId(), id, request, ct);

    [HttpPost("{id:guid}/logo")]
    [RequestSizeLimit(UploadLimits.SingleImage)]
    public async Task<BusinessDetailDto> UploadLogo(Guid id, IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        return await profiles.UploadImageAsync(User.GetUserId(), id, BusinessImageKind.Logo, stream, file.Length, ct);
    }

    [HttpDelete("{id:guid}/logo")]
    public Task<BusinessDetailDto> RemoveLogo(Guid id, CancellationToken ct) =>
        profiles.RemoveImageAsync(User.GetUserId(), id, BusinessImageKind.Logo, ct);

    [HttpPost("{id:guid}/cover")]
    [RequestSizeLimit(UploadLimits.SingleImage)]
    public async Task<BusinessDetailDto> UploadCover(Guid id, IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        return await profiles.UploadImageAsync(User.GetUserId(), id, BusinessImageKind.Cover, stream, file.Length, ct);
    }

    [HttpDelete("{id:guid}/cover")]
    public Task<BusinessDetailDto> RemoveCover(Guid id, CancellationToken ct) =>
        profiles.RemoveImageAsync(User.GetUserId(), id, BusinessImageKind.Cover, ct);

    /// <summary>The storefront exactly as customers will see it, available while still in draft.</summary>
    [HttpGet("{id:guid}/preview")]
    public Task<PublicBusinessDto> Preview(Guid id, CancellationToken ct) => profiles.PreviewAsync(User.GetUserId(), id, ct);

    // ---------- Team ----------

    [HttpGet("{id:guid}/members")]
    public Task<IReadOnlyList<BusinessMemberDto>> Members(Guid id, CancellationToken ct) => profiles.ListMembersAsync(User.GetUserId(), id, ct);

    [HttpPost("{id:guid}/members")]
    public Task<BusinessMemberDto> AddMember(Guid id, AddBusinessMemberRequest request, CancellationToken ct) =>
        profiles.AddMemberAsync(User.GetUserId(), id, request, ct);

    [HttpPut("{id:guid}/members/{userId:guid}")]
    public Task<BusinessMemberDto> UpdateMember(Guid id, Guid userId, UpdateBusinessMemberRequest request, CancellationToken ct) =>
        profiles.UpdateMemberAsync(User.GetUserId(), id, userId, request, ct);

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId, CancellationToken ct)
    {
        await profiles.RemoveMemberAsync(User.GetUserId(), id, userId, ct);
        return NoContent();
    }

    // ---------- Insights ----------

    [HttpGet("{id:guid}/dashboard")]
    public Task<BusinessDashboardDto> Dashboard(Guid id, CancellationToken ct) => analytics.GetDashboardAsync(User.GetUserId(), id, ct);

    /// <summary>Totals, daily series and top products for the last 7–90 days.</summary>
    [HttpGet("{id:guid}/analytics")]
    public Task<BusinessAnalyticsDto> Analytics(Guid id, [FromQuery] int days = 30, CancellationToken ct = default) =>
        analytics.GetAnalyticsAsync(User.GetUserId(), id, days, ct);

    // ---------- QR ----------

    [HttpGet("{id:guid}/qr")]
    public Task<BusinessQrDto> GetQr(Guid id, CancellationToken ct) => qr.GetAsync(User.GetUserId(), id, ct);

    /// <summary>Issues a new QR code; previously printed codes stop working.</summary>
    [HttpPost("{id:guid}/qr")]
    public Task<BusinessQrDto> RegenerateQr(Guid id, CancellationToken ct) => qr.RegenerateAsync(User.GetUserId(), id, ct);

    [HttpPut("{id:guid}/qr")]
    public Task<BusinessQrDto> SetQrEnabled(Guid id, SetQrEnabledRequest request, CancellationToken ct) =>
        qr.SetEnabledAsync(User.GetUserId(), id, request.Enabled, ct);

    [HttpGet("{id:guid}/qr/png")]
    public async Task<IActionResult> QrPng(Guid id, [FromQuery] int size = 600, [FromQuery] bool download = false, CancellationToken ct = default)
    {
        var bytes = await qr.GetPngAsync(User.GetUserId(), id, Math.Clamp(size, 150, 1200), ct);
        return download ? File(bytes, "image/png", "business-qr.png") : File(bytes, "image/png");
    }

    [HttpGet("{id:guid}/qr/svg")]
    public async Task<IActionResult> QrSvg(Guid id, [FromQuery] bool download = false, CancellationToken ct = default)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(await qr.GetSvgAsync(User.GetUserId(), id, ct));
        return download ? File(bytes, "image/svg+xml", "business-qr.svg") : File(bytes, "image/svg+xml");
    }
}

/// <summary>Products, product categories, services, offers and gallery for a business.</summary>
[ApiController]
[Authorize(Policy = AccountPolicies.Business)]
[Route("api/businesses/{businessId:guid}")]
public sealed class BusinessCatalogController(IBusinessCatalogService catalog) : ControllerBase
{
    // ---------- Product categories ----------

    [HttpGet("product-categories")]
    public Task<IReadOnlyList<ProductCategoryDto>> ProductCategories(Guid businessId, CancellationToken ct) =>
        catalog.ListProductCategoriesAsync(User.GetUserId(), businessId, ct);

    [HttpPost("product-categories")]
    public Task<ProductCategoryDto> CreateProductCategory(Guid businessId, ProductCategoryRequest request, CancellationToken ct) =>
        catalog.CreateProductCategoryAsync(User.GetUserId(), businessId, request, ct);

    [HttpPut("product-categories/{categoryId:guid}")]
    public Task<ProductCategoryDto> UpdateProductCategory(Guid businessId, Guid categoryId, ProductCategoryRequest request, CancellationToken ct) =>
        catalog.UpdateProductCategoryAsync(User.GetUserId(), businessId, categoryId, request, ct);

    [HttpDelete("product-categories/{categoryId:guid}")]
    public async Task<IActionResult> DeleteProductCategory(Guid businessId, Guid categoryId, CancellationToken ct)
    {
        await catalog.DeleteProductCategoryAsync(User.GetUserId(), businessId, categoryId, ct);
        return NoContent();
    }

    // ---------- Products ----------

    /// <summary>Search, filter, sort and paginate products.</summary>
    [HttpGet("products")]
    public Task<PagedResult<ProductDto>> Products(Guid businessId, [FromQuery] ProductQuery query, CancellationToken ct) =>
        catalog.ListProductsAsync(User.GetUserId(), businessId, query, ct);

    [HttpGet("products/{productId:guid}")]
    public Task<ProductDto> Product(Guid businessId, Guid productId, CancellationToken ct) =>
        catalog.GetProductAsync(User.GetUserId(), businessId, productId, ct);

    [HttpPost("products")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<ActionResult<ProductDto>> CreateProduct(Guid businessId, ProductUpsertRequest request, CancellationToken ct)
    {
        var created = await catalog.CreateProductAsync(User.GetUserId(), businessId, request, ct);
        return CreatedAtAction(nameof(Product), new { businessId, productId = created.Id }, created);
    }

    [HttpPut("products/{productId:guid}")]
    public Task<ProductDto> UpdateProduct(Guid businessId, Guid productId, ProductUpsertRequest request, CancellationToken ct) =>
        catalog.UpdateProductAsync(User.GetUserId(), businessId, productId, request, ct);

    [HttpDelete("products/{productId:guid}")]
    public async Task<IActionResult> DeleteProduct(Guid businessId, Guid productId, CancellationToken ct)
    {
        await catalog.DeleteProductAsync(User.GetUserId(), businessId, productId, ct);
        return NoContent();
    }

    /// <summary>Uploads one or more images (JPG, PNG or WEBP, 5 MB each, up to 8 per product).</summary>
    [HttpPost("products/{productId:guid}/images")]
    [RequestSizeLimit(UploadLimits.ProductImages)]
    public async Task<ProductDto> AddProductImages(Guid businessId, Guid productId, [FromForm] List<IFormFile> files, CancellationToken ct)
    {
        if (files.Count == 0) throw new Application.Common.BusinessValidationException("Please choose at least one image.");
        ProductDto? result = null;
        foreach (var file in files)
        {
            await using var stream = file.OpenReadStream();
            result = await catalog.AddProductImageAsync(User.GetUserId(), businessId, productId, stream, file.Length, ct);
        }
        return result!;
    }

    [HttpDelete("products/{productId:guid}/images/{imageId:guid}")]
    public Task<ProductDto> RemoveProductImage(Guid businessId, Guid productId, Guid imageId, CancellationToken ct) =>
        catalog.RemoveProductImageAsync(User.GetUserId(), businessId, productId, imageId, ct);

    [HttpPut("products/{productId:guid}/images/order")]
    public Task<ProductDto> ReorderProductImages(Guid businessId, Guid productId, ReorderImagesRequest request, CancellationToken ct) =>
        catalog.ReorderProductImagesAsync(User.GetUserId(), businessId, productId, request.ImageIds, ct);

    // ---------- Services ----------

    [HttpGet("services")]
    public Task<IReadOnlyList<BusinessServiceDto>> Services(Guid businessId, CancellationToken ct) =>
        catalog.ListServicesAsync(User.GetUserId(), businessId, ct);

    [HttpPost("services")]
    public Task<BusinessServiceDto> CreateService(Guid businessId, ServiceUpsertRequest request, CancellationToken ct) =>
        catalog.CreateServiceAsync(User.GetUserId(), businessId, request, ct);

    [HttpPut("services/{serviceId:guid}")]
    public Task<BusinessServiceDto> UpdateService(Guid businessId, Guid serviceId, ServiceUpsertRequest request, CancellationToken ct) =>
        catalog.UpdateServiceAsync(User.GetUserId(), businessId, serviceId, request, ct);

    [HttpDelete("services/{serviceId:guid}")]
    public async Task<IActionResult> DeleteService(Guid businessId, Guid serviceId, CancellationToken ct)
    {
        await catalog.DeleteServiceAsync(User.GetUserId(), businessId, serviceId, ct);
        return NoContent();
    }

    [HttpPost("services/{serviceId:guid}/image")]
    [RequestSizeLimit(UploadLimits.SingleImage)]
    public async Task<BusinessServiceDto> UploadServiceImage(Guid businessId, Guid serviceId, IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        return await catalog.SetServiceImageAsync(User.GetUserId(), businessId, serviceId, stream, file.Length, ct);
    }

    [HttpDelete("services/{serviceId:guid}/image")]
    public Task<BusinessServiceDto> RemoveServiceImage(Guid businessId, Guid serviceId, CancellationToken ct) =>
        catalog.SetServiceImageAsync(User.GetUserId(), businessId, serviceId, null, 0, ct);

    // ---------- Offers ----------

    [HttpGet("offers")]
    public Task<IReadOnlyList<OfferDto>> Offers(Guid businessId, CancellationToken ct) =>
        catalog.ListOffersAsync(User.GetUserId(), businessId, ct);

    [HttpPost("offers")]
    public Task<OfferDto> CreateOffer(Guid businessId, OfferUpsertRequest request, CancellationToken ct) =>
        catalog.CreateOfferAsync(User.GetUserId(), businessId, request, ct);

    [HttpPut("offers/{offerId:guid}")]
    public Task<OfferDto> UpdateOffer(Guid businessId, Guid offerId, OfferUpsertRequest request, CancellationToken ct) =>
        catalog.UpdateOfferAsync(User.GetUserId(), businessId, offerId, request, ct);

    [HttpDelete("offers/{offerId:guid}")]
    public async Task<IActionResult> DeleteOffer(Guid businessId, Guid offerId, CancellationToken ct)
    {
        await catalog.DeleteOfferAsync(User.GetUserId(), businessId, offerId, ct);
        return NoContent();
    }

    [HttpPost("offers/{offerId:guid}/banner")]
    [RequestSizeLimit(UploadLimits.SingleImage)]
    public async Task<OfferDto> UploadOfferBanner(Guid businessId, Guid offerId, IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        return await catalog.SetOfferBannerAsync(User.GetUserId(), businessId, offerId, stream, file.Length, ct);
    }

    [HttpDelete("offers/{offerId:guid}/banner")]
    public Task<OfferDto> RemoveOfferBanner(Guid businessId, Guid offerId, CancellationToken ct) =>
        catalog.SetOfferBannerAsync(User.GetUserId(), businessId, offerId, null, 0, ct);

    // ---------- Gallery ----------

    [HttpGet("gallery")]
    public Task<IReadOnlyList<GalleryImageDto>> Gallery(Guid businessId, CancellationToken ct) =>
        catalog.ListGalleryAsync(User.GetUserId(), businessId, ct);

    [HttpPost("gallery")]
    [RequestSizeLimit(UploadLimits.SingleImage)]
    public async Task<GalleryImageDto> AddGalleryImage(Guid businessId, IFormFile file, [FromForm] GalleryCategory category,
        [FromForm] string? caption, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        return await catalog.AddGalleryImageAsync(User.GetUserId(), businessId, stream, file.Length,
            new GalleryUpdateRequest { Category = category, Caption = caption }, ct);
    }

    [HttpPut("gallery/{imageId:guid}")]
    public Task<GalleryImageDto> UpdateGalleryImage(Guid businessId, Guid imageId, GalleryUpdateRequest request, CancellationToken ct) =>
        catalog.UpdateGalleryImageAsync(User.GetUserId(), businessId, imageId, request, ct);

    [HttpDelete("gallery/{imageId:guid}")]
    public async Task<IActionResult> DeleteGalleryImage(Guid businessId, Guid imageId, CancellationToken ct)
    {
        await catalog.DeleteGalleryImageAsync(User.GetUserId(), businessId, imageId, ct);
        return NoContent();
    }
}

/// <summary>Customer enquiries and reviews for a business.</summary>
[ApiController]
[Authorize(Policy = AccountPolicies.Business)]
[Route("api/businesses/{businessId:guid}")]
public sealed class BusinessEngagementController(IBusinessEngagementService engagement) : ControllerBase
{
    [HttpGet("enquiries")]
    public Task<PagedResult<EnquirySummaryDto>> Enquiries(Guid businessId, [FromQuery] EnquiryQuery query, CancellationToken ct) =>
        engagement.ListEnquiriesAsync(User.GetUserId(), businessId, query, ct);

    [HttpGet("enquiries/{enquiryId:guid}")]
    public Task<EnquiryDetailDto> Enquiry(Guid businessId, Guid enquiryId, CancellationToken ct) =>
        engagement.GetEnquiryAsync(User.GetUserId(), businessId, enquiryId, ct);

    [HttpPut("enquiries/{enquiryId:guid}/status")]
    public Task<EnquiryDetailDto> UpdateEnquiryStatus(Guid businessId, Guid enquiryId, UpdateEnquiryStatusRequest request, CancellationToken ct) =>
        engagement.UpdateEnquiryStatusAsync(User.GetUserId(), businessId, enquiryId, request, ct);

    /// <summary>Records a reply (and emails it to the customer when requested). Marks the enquiry Responded.</summary>
    [HttpPost("enquiries/{enquiryId:guid}/responses")]
    public Task<EnquiryDetailDto> Respond(Guid businessId, Guid enquiryId, RespondEnquiryRequest request, CancellationToken ct) =>
        engagement.RespondToEnquiryAsync(User.GetUserId(), businessId, enquiryId, request, ct);

    [HttpGet("reviews")]
    public Task<IReadOnlyList<ReviewDto>> Reviews(Guid businessId, [FromQuery] ReviewStatus? status, CancellationToken ct) =>
        engagement.ListReviewsAsync(User.GetUserId(), businessId, status, ct);

    [HttpPut("reviews/{reviewId:guid}")]
    public Task<ReviewDto> UpdateReview(Guid businessId, Guid reviewId, UpdateReviewRequest request, CancellationToken ct) =>
        engagement.UpdateReviewAsync(User.GetUserId(), businessId, reviewId, request, ct);

    [HttpDelete("reviews/{reviewId:guid}")]
    public async Task<IActionResult> DeleteReview(Guid businessId, Guid reviewId, CancellationToken ct)
    {
        await engagement.DeleteReviewAsync(User.GetUserId(), businessId, reviewId, ct);
        return NoContent();
    }
}

/// <summary>Anonymous storefront endpoints. Only published, active businesses are served.</summary>
[ApiController]
[AllowAnonymous]
[EnableRateLimiting("public")]
[Route("api/public/businesses/{slug}")]
public sealed class PublicBusinessesController(
    IPublicBusinessService storefront,
    IBusinessEngagementService engagement,
    IBusinessAnalyticsService analytics) : ControllerBase
{
    [HttpGet]
    public async Task<PublicBusinessDto> Get(string slug, CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-cache";
        return await storefront.GetAsync(slug, ct);
    }

    [HttpGet("products")]
    public Task<PagedResult<PublicProductDto>> Products(string slug, [FromQuery] ProductQuery query, CancellationToken ct) =>
        storefront.ListProductsAsync(slug, query, ct);

    [HttpGet("products/{productId:guid}")]
    public Task<PublicProductDto> Product(string slug, Guid productId, CancellationToken ct) =>
        storefront.GetProductAsync(slug, productId, ct);

    [HttpGet("services")]
    public Task<IReadOnlyList<PublicServiceDto>> Services(string slug, CancellationToken ct) => storefront.ListServicesAsync(slug, ct);

    /// <summary>Only offers that are active and within their date window today (business time zone).</summary>
    [HttpGet("offers")]
    public Task<IReadOnlyList<PublicOfferDto>> Offers(string slug, CancellationToken ct) => storefront.ListOffersAsync(slug, ct);

    [HttpPost("enquiries")]
    [EnableRateLimiting("enquiry")]
    public async Task<IActionResult> Enquire(string slug, CreateBusinessEnquiryRequest request, CancellationToken ct)
    {
        var id = await engagement.SubmitEnquiryAsync(slug, request, await HttpContext.GetVisitorAsync(), ct);
        return StatusCode(StatusCodes.Status201Created, new { id, message = "Thanks! The business will get back to you soon." });
    }

    /// <summary>Reviews are held for the owner's approval before they appear.</summary>
    [HttpPost("reviews")]
    [EnableRateLimiting("enquiry")]
    public async Task<IActionResult> Review(string slug, CreateReviewRequest request, CancellationToken ct)
    {
        await engagement.SubmitReviewAsync(slug, request, ct);
        return StatusCode(StatusCodes.Status201Created, new { message = "Thanks for your review! It will appear once the business approves it." });
    }

    /// <summary>Anonymous engagement tracking (views and taps). Bots, repeats and the business's own team are ignored.</summary>
    [HttpPost("events")]
    public async Task<IActionResult> Track(string slug, TrackEventRequest request, CancellationToken ct)
    {
        await analytics.TrackAsync(slug, request, await HttpContext.GetVisitorAsync(), ct);
        return NoContent();
    }
}

/// <summary>Resolves a scanned business QR code (/bq/{code}) to its storefront.</summary>
[ApiController]
[AllowAnonymous]
[EnableRateLimiting("public")]
[Route("api/bq/{code}")]
public sealed class BusinessQrResolveController(IBusinessQrService qr) : ControllerBase
{
    [HttpGet]
    public async Task<QrResolveDto> Resolve(string code, CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        return await qr.ResolveAsync(code, await HttpContext.GetVisitorAsync(), ct);
    }
}

internal static class VisitorContextExtensions
{
    /// <summary>Request metadata for anonymous analytics. Signed-in callers are identified so team activity can be excluded.</summary>
    public static async Task<VisitorContext> GetVisitorAsync(this HttpContext context)
    {
        Guid? userId = null;
        if (context.Request.Headers.Authorization.Count > 0)
        {
            var auth = await context.AuthenticateAsync();
            if (auth.Succeeded) userId = auth.Principal!.TryGetUserId();
        }
        return new VisitorContext(context.Connection.RemoteIpAddress?.ToString(), context.Request.Headers.UserAgent.ToString(), userId);
    }
}

/// <summary>
/// Extra QR codes for a business (tables, packaging, banners…), each with its own destination and statistics.
/// They share the /bq/{code} route with the main QR, so destinations can change without reprinting.
/// </summary>
[ApiController]
[Authorize(Policy = AccountPolicies.Business)]
[Route("api/businesses/{businessId:guid}/qr-campaigns")]
public sealed class BusinessQrCampaignsController(Application.Services.Businesses.BusinessQrCampaignService campaigns) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<QrCampaignDto>> List(Guid businessId, CancellationToken ct) => campaigns.ListAsync(User.GetUserId(), businessId, ct);

    [HttpPost]
    public Task<QrCampaignDto> Create(Guid businessId, QrCampaignUpsertRequest request, CancellationToken ct) =>
        campaigns.CreateAsync(User.GetUserId(), businessId, request, ct);

    /// <summary>Creates numbered codes in one go, e.g. "Table 1" … "Table 20".</summary>
    [HttpPost("bulk")]
    public Task<IReadOnlyList<QrCampaignDto>> CreateBulk(Guid businessId, BulkQrCampaignRequest request, CancellationToken ct) =>
        campaigns.CreateBulkAsync(User.GetUserId(), businessId, request, ct);

    [HttpPut("{campaignId:guid}")]
    public Task<QrCampaignDto> Update(Guid businessId, Guid campaignId, QrCampaignUpsertRequest request, CancellationToken ct) =>
        campaigns.UpdateAsync(User.GetUserId(), businessId, campaignId, request, ct);

    [HttpDelete("{campaignId:guid}")]
    public async Task<IActionResult> Delete(Guid businessId, Guid campaignId, CancellationToken ct)
    {
        await campaigns.DeleteAsync(User.GetUserId(), businessId, campaignId, ct);
        return NoContent();
    }

    /// <summary>Scans and unique visitors per campaign (including the main QR) with a daily series, for comparison.</summary>
    [HttpGet("stats")]
    public Task<QrCampaignStatsDto> Stats(Guid businessId, [FromQuery] int days = 30, CancellationToken ct = default) =>
        campaigns.StatsAsync(User.GetUserId(), businessId, days, ct);

    /// <summary>ZIP of PNG codes. Pass ids to choose campaigns; omit for all.</summary>
    [HttpGet("download")]
    public async Task<IActionResult> Download(Guid businessId, [FromQuery] List<Guid> ids, CancellationToken ct)
    {
        var zip = await campaigns.DownloadZipAsync(User.GetUserId(), businessId, ids, ct);
        return File(zip, "application/zip", "qr-codes.zip");
    }
}
