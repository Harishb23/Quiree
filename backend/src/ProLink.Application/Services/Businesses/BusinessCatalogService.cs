using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;

namespace ProLink.Application.Services.Businesses;

/// <summary>Products, product categories, services, offers and gallery. Editors and above may manage the catalogue.</summary>
public sealed class BusinessCatalogService(
    IBusinessCatalogRepository catalog,
    IBusinessCategoryRepository categories,
    IUnitOfWork uow,
    IFileStorage storage,
    BusinessAccessGuard guard,
    TimeProvider clock) : IBusinessCatalogService
{
    public const int MaxImagesPerProduct = 8;
    public const int MaxGalleryImages = 60;
    public const int MaxProductCategories = 50;

    private Task<BusinessAccess> EditorAsync(Guid userId, Guid businessId, CancellationToken ct) =>
        guard.RequireAsync(userId, businessId, BusinessRole.Editor, ct);

    // =====================================================================
    // Product categories
    // =====================================================================

    public async Task<IReadOnlyList<ProductCategoryDto>> ListProductCategoriesAsync(Guid userId, Guid businessId, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        return (await catalog.ListProductCategoriesAsync(businessId, publicOnly: false, ct))
            .Select(c => new ProductCategoryDto(c.Category.Id, c.Category.Name, c.ProductCount)).ToList();
    }

    public async Task<ProductCategoryDto> CreateProductCategoryAsync(Guid userId, Guid businessId, ProductCategoryRequest request, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var name = request.Name.Trim();
        var existing = await catalog.ListProductCategoriesAsync(businessId, publicOnly: false, ct);
        if (existing.Count >= MaxProductCategories) throw new BusinessValidationException($"You can create up to {MaxProductCategories} product categories.");
        if (await catalog.ProductCategoryNameExistsAsync(businessId, name, null, ct)) throw new ConflictException("A category with this name already exists.");

        var category = new BusinessProductCategory { BusinessId = businessId, Name = name, SortOrder = existing.Count };
        catalog.AddProductCategory(category);
        await uow.SaveChangesAsync(ct);
        return new ProductCategoryDto(category.Id, category.Name, 0);
    }

    public async Task<ProductCategoryDto> UpdateProductCategoryAsync(Guid userId, Guid businessId, Guid categoryId,
        ProductCategoryRequest request, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var category = await catalog.GetProductCategoryAsync(businessId, categoryId, ct) ?? throw new NotFoundException("Category not found.");
        var name = request.Name.Trim();
        if (await catalog.ProductCategoryNameExistsAsync(businessId, name, categoryId, ct)) throw new ConflictException("A category with this name already exists.");
        category.Name = name;
        await uow.SaveChangesAsync(ct);
        var count = (await catalog.ListProductCategoriesAsync(businessId, false, ct)).FirstOrDefault(c => c.Category.Id == categoryId).ProductCount;
        return new ProductCategoryDto(category.Id, category.Name, count);
    }

    public async Task DeleteProductCategoryAsync(Guid userId, Guid businessId, Guid categoryId, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var category = await catalog.GetProductCategoryAsync(businessId, categoryId, ct) ?? throw new NotFoundException("Category not found.");
        // Products keep existing; they just become uncategorised.
        await catalog.ClearProductCategoryAsync(categoryId, ct);
        uow.Remove(category);
        await uow.SaveChangesAsync(ct);
    }

    // =====================================================================
    // Products
    // =====================================================================

    public async Task<PagedResult<ProductDto>> ListProductsAsync(Guid userId, Guid businessId, ProductQuery query, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var (items, total) = await catalog.QueryProductsAsync(businessId, query, publicOnly: false, ct);
        return new PagedResult<ProductDto>(items.Select(BusinessMapper.Product).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<ProductDto> GetProductAsync(Guid userId, Guid businessId, Guid productId, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        return BusinessMapper.Product(await LoadProductAsync(businessId, productId, ct));
    }

    public async Task<ProductDto> CreateProductAsync(Guid userId, Guid businessId, ProductUpsertRequest request, CancellationToken ct = default)
    {
        var access = await EditorAsync(userId, businessId, ct);
        var product = new BusinessProduct { BusinessId = businessId };
        await ApplyProductAsync(access.Business, product, request, ct);
        catalog.AddProduct(product);
        await uow.SaveChangesAsync(ct);
        return BusinessMapper.Product(await LoadProductAsync(businessId, product.Id, ct));
    }

    public async Task<ProductDto> UpdateProductAsync(Guid userId, Guid businessId, Guid productId, ProductUpsertRequest request, CancellationToken ct = default)
    {
        var access = await EditorAsync(userId, businessId, ct);
        var product = await LoadProductAsync(businessId, productId, ct);
        await ApplyProductAsync(access.Business, product, request, ct);
        await uow.SaveChangesAsync(ct);
        return BusinessMapper.Product(await LoadProductAsync(businessId, productId, ct));
    }

    public async Task DeleteProductAsync(Guid userId, Guid businessId, Guid productId, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var product = await LoadProductAsync(businessId, productId, ct);
        var files = product.Images.Select(i => i.Url).ToList();
        uow.Remove(product);
        await uow.SaveChangesAsync(ct);
        await ImageUpload.DeleteQuietlyAsync(storage, files);
    }

    public async Task<ProductDto> AddProductImageAsync(Guid userId, Guid businessId, Guid productId, Stream content, long length, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var product = await LoadProductAsync(businessId, productId, ct);
        if (product.Images.Count >= MaxImagesPerProduct)
            throw new BusinessValidationException($"A product can have up to {MaxImagesPerProduct} images.");

        var url = await ImageUpload.SaveAsync(storage, content, length, ct);
        catalog.AddProductImage(new BusinessProductImage
        {
            ProductId = product.Id, Url = url, SortOrder = product.Images.Count == 0 ? 0 : product.Images.Max(i => i.SortOrder) + 1
        });
        await uow.SaveChangesAsync(ct);
        return BusinessMapper.Product(await LoadProductAsync(businessId, productId, ct));
    }

    public async Task<ProductDto> RemoveProductImageAsync(Guid userId, Guid businessId, Guid productId, Guid imageId, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var product = await LoadProductAsync(businessId, productId, ct);
        var image = product.Images.FirstOrDefault(i => i.Id == imageId) ?? throw new NotFoundException("Image not found.");
        uow.Remove(image);
        await uow.SaveChangesAsync(ct);
        await ImageUpload.DeleteQuietlyAsync(storage, [image.Url]);
        return BusinessMapper.Product(await LoadProductAsync(businessId, productId, ct));
    }

    public async Task<ProductDto> ReorderProductImagesAsync(Guid userId, Guid businessId, Guid productId, IReadOnlyList<Guid> imageIds, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var product = await LoadProductAsync(businessId, productId, ct);
        if (imageIds.Count != product.Images.Count || imageIds.Distinct().Count() != imageIds.Count
            || imageIds.Any(id => product.Images.All(i => i.Id != id)))
            throw new BusinessValidationException("The image order must list each of the product's images exactly once.");
        foreach (var image in product.Images) image.SortOrder = imageIds.ToList().IndexOf(image.Id);
        await uow.SaveChangesAsync(ct);
        return BusinessMapper.Product(product);
    }

    private async Task<BusinessProduct> LoadProductAsync(Guid businessId, Guid productId, CancellationToken ct) =>
        await catalog.GetProductAsync(businessId, productId, ct) ?? throw new NotFoundException("Product not found.");

    private async Task ApplyProductAsync(Business business, BusinessProduct p, ProductUpsertRequest r, CancellationToken ct)
    {
        var sku = Text.Clean(r.Sku);
        if (sku is not null && await catalog.SkuExistsAsync(business.Id, sku, p.Id, ct))
            throw new ConflictException("Another product already uses this SKU.");
        if (r.ProductCategoryId is not null && await catalog.GetProductCategoryAsync(business.Id, r.ProductCategoryId.Value, ct) is null)
            throw new BusinessValidationException("Choose one of your product categories.");

        var definitions = await categories.ListAttributesAsync(business.CategoryId, ct);
        var attributes = ProductAttributes.Normalize(r.Attributes, definitions);

        p.Name = r.Name.Trim();
        p.Sku = sku;
        p.ProductCategoryId = r.ProductCategoryId;
        p.Description = Text.Clean(r.Description);
        p.PriceInPaise = r.PriceInPaise;
        p.DiscountPriceInPaise = r.DiscountPriceInPaise;
        p.Stock = r.Stock;
        p.IsAvailable = r.IsAvailable;
        p.IsFeatured = r.IsFeatured;
        p.AttributesJson = ProductAttributes.Serialize(attributes);
    }

    // =====================================================================
    // Services
    // =====================================================================

    public async Task<IReadOnlyList<BusinessServiceDto>> ListServicesAsync(Guid userId, Guid businessId, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        return (await catalog.ListServicesAsync(businessId, availableOnly: false, ct)).Select(BusinessMapper.Service).ToList();
    }

    public async Task<BusinessServiceDto> CreateServiceAsync(Guid userId, Guid businessId, ServiceUpsertRequest request, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var service = new BusinessService { BusinessId = businessId };
        ApplyService(service, request);
        catalog.AddService(service);
        await uow.SaveChangesAsync(ct);
        return BusinessMapper.Service(service);
    }

    public async Task<BusinessServiceDto> UpdateServiceAsync(Guid userId, Guid businessId, Guid serviceId, ServiceUpsertRequest request, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var service = await catalog.GetServiceAsync(businessId, serviceId, ct) ?? throw new NotFoundException("Service not found.");
        ApplyService(service, request);
        await uow.SaveChangesAsync(ct);
        return BusinessMapper.Service(service);
    }

    public async Task DeleteServiceAsync(Guid userId, Guid businessId, Guid serviceId, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var service = await catalog.GetServiceAsync(businessId, serviceId, ct) ?? throw new NotFoundException("Service not found.");
        uow.Remove(service);
        await uow.SaveChangesAsync(ct);
        await ImageUpload.DeleteQuietlyAsync(storage, [service.ImageUrl]);
    }

    public async Task<BusinessServiceDto> SetServiceImageAsync(Guid userId, Guid businessId, Guid serviceId, Stream? content, long length, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var service = await catalog.GetServiceAsync(businessId, serviceId, ct) ?? throw new NotFoundException("Service not found.");
        var previous = service.ImageUrl;
        service.ImageUrl = content is null ? null : await ImageUpload.SaveAsync(storage, content, length, ct);
        await uow.SaveChangesAsync(ct);
        await ImageUpload.DeleteQuietlyAsync(storage, [previous]);
        return BusinessMapper.Service(service);
    }

    private static void ApplyService(BusinessService s, ServiceUpsertRequest r)
    {
        s.Name = r.Name.Trim();
        s.Description = Text.Clean(r.Description);
        s.PriceInPaise = r.PriceInPaise;
        s.PriceNote = Text.Clean(r.PriceNote);
        s.DurationMinutes = r.DurationMinutes;
        s.IsAvailable = r.IsAvailable;
        s.IsFeatured = r.IsFeatured;
    }

    // =====================================================================
    // Offers
    // =====================================================================

    public async Task<IReadOnlyList<OfferDto>> ListOffersAsync(Guid userId, Guid businessId, CancellationToken ct = default)
    {
        var access = await EditorAsync(userId, businessId, ct);
        var today = Today(access.Business);
        return (await catalog.ListOffersAsync(businessId, ct)).Select(o => BusinessMapper.Offer(o, today)).ToList();
    }

    public async Task<OfferDto> CreateOfferAsync(Guid userId, Guid businessId, OfferUpsertRequest request, CancellationToken ct = default)
    {
        var access = await EditorAsync(userId, businessId, ct);
        var offer = new BusinessOffer { BusinessId = businessId };
        ApplyOffer(offer, request);
        catalog.AddOffer(offer);
        await uow.SaveChangesAsync(ct);
        return BusinessMapper.Offer(offer, Today(access.Business));
    }

    public async Task<OfferDto> UpdateOfferAsync(Guid userId, Guid businessId, Guid offerId, OfferUpsertRequest request, CancellationToken ct = default)
    {
        var access = await EditorAsync(userId, businessId, ct);
        var offer = await catalog.GetOfferAsync(businessId, offerId, ct) ?? throw new NotFoundException("Offer not found.");
        ApplyOffer(offer, request);
        await uow.SaveChangesAsync(ct);
        return BusinessMapper.Offer(offer, Today(access.Business));
    }

    public async Task DeleteOfferAsync(Guid userId, Guid businessId, Guid offerId, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var offer = await catalog.GetOfferAsync(businessId, offerId, ct) ?? throw new NotFoundException("Offer not found.");
        uow.Remove(offer);
        await uow.SaveChangesAsync(ct);
        await ImageUpload.DeleteQuietlyAsync(storage, [offer.BannerUrl]);
    }

    public async Task<OfferDto> SetOfferBannerAsync(Guid userId, Guid businessId, Guid offerId, Stream? content, long length, CancellationToken ct = default)
    {
        var access = await EditorAsync(userId, businessId, ct);
        var offer = await catalog.GetOfferAsync(businessId, offerId, ct) ?? throw new NotFoundException("Offer not found.");
        var previous = offer.BannerUrl;
        offer.BannerUrl = content is null ? null : await ImageUpload.SaveAsync(storage, content, length, ct);
        await uow.SaveChangesAsync(ct);
        await ImageUpload.DeleteQuietlyAsync(storage, [previous]);
        return BusinessMapper.Offer(offer, Today(access.Business));
    }

    private static void ApplyOffer(BusinessOffer o, OfferUpsertRequest r)
    {
        o.Title = r.Title.Trim();
        o.Description = Text.Clean(r.Description);
        o.DiscountPercent = r.DiscountPercent;
        o.DiscountAmountInPaise = r.DiscountAmountInPaise;
        o.StartDate = r.StartDate;
        o.EndDate = r.EndDate;
        o.IsActive = r.IsActive;
        o.IsFeatured = r.IsFeatured;
    }

    private DateOnly Today(Business b) => BusinessTime.Today(b.TimeZone, clock.GetUtcNow().UtcDateTime);

    // =====================================================================
    // Gallery
    // =====================================================================

    public async Task<IReadOnlyList<GalleryImageDto>> ListGalleryAsync(Guid userId, Guid businessId, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        return (await catalog.ListGalleryAsync(businessId, ct)).Select(BusinessMapper.Gallery).ToList();
    }

    public async Task<GalleryImageDto> AddGalleryImageAsync(Guid userId, Guid businessId, Stream content, long length,
        GalleryUpdateRequest meta, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        if (await catalog.CountGalleryAsync(businessId, ct) >= MaxGalleryImages)
            throw new BusinessValidationException($"The gallery can hold up to {MaxGalleryImages} photos.");
        if (!Enum.IsDefined(meta.Category)) throw new BusinessValidationException("Unknown gallery category.");

        var url = await ImageUpload.SaveAsync(storage, content, length, ct);
        var image = new BusinessGalleryImage { BusinessId = businessId, Url = url, Category = meta.Category, Caption = Text.Clean(meta.Caption) };
        catalog.AddGalleryImage(image);
        await uow.SaveChangesAsync(ct);
        return BusinessMapper.Gallery(image);
    }

    public async Task<GalleryImageDto> UpdateGalleryImageAsync(Guid userId, Guid businessId, Guid imageId, GalleryUpdateRequest request, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var image = await catalog.GetGalleryImageAsync(businessId, imageId, ct) ?? throw new NotFoundException("Photo not found.");
        image.Category = request.Category;
        image.Caption = Text.Clean(request.Caption);
        await uow.SaveChangesAsync(ct);
        return BusinessMapper.Gallery(image);
    }

    public async Task DeleteGalleryImageAsync(Guid userId, Guid businessId, Guid imageId, CancellationToken ct = default)
    {
        await EditorAsync(userId, businessId, ct);
        var image = await catalog.GetGalleryImageAsync(businessId, imageId, ct) ?? throw new NotFoundException("Photo not found.");
        uow.Remove(image);
        await uow.SaveChangesAsync(ct);
        await ImageUpload.DeleteQuietlyAsync(storage, [image.Url]);
    }
}
