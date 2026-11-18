using Microsoft.Extensions.Options;
using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;

namespace ProLink.Application.Services.Businesses;

public sealed class BusinessCategoryService(IBusinessCategoryRepository categories) : IBusinessCategoryService
{
    public async Task<IReadOnlyList<BusinessCategoryDto>> ListAsync(CancellationToken ct = default) =>
        (await categories.ListAsync(ct))
        .Select(c => new BusinessCategoryDto(c.Id, c.Key, c.Name, c.Icon,
            c.Subcategories.OrderBy(s => s.SortOrder).Select(s => new BusinessSubcategoryDto(s.Id, s.Name)).ToList()))
        .ToList();

    public async Task<IReadOnlyList<CategoryAttributeDto>> GetAttributesAsync(int categoryId, CancellationToken ct = default)
    {
        _ = await categories.GetAsync(categoryId, includeAttributes: false, ct) ?? throw new NotFoundException("Category not found.");
        return (await categories.ListAttributesAsync(categoryId, ct))
            .Select(a => new CategoryAttributeDto(a.Id, a.Key, a.Label, a.InputType, ProductAttributes.Options(a), a.IsRequired))
            .ToList();
    }
}

public sealed class BusinessProfileService(
    IBusinessRepository businesses,
    IBusinessCategoryRepository categories,
    IBusinessCatalogRepository catalog,
    IUserRepository users,
    IUnitOfWork uow,
    IFileStorage storage,
    BusinessAccessGuard guard,
    StorefrontBuilder storefront,
    IOptions<AppOptions> options,
    TimeProvider clock) : IBusinessProfileService
{
    /// <summary>Upper bound per owner to prevent abuse; generous for real multi-outlet owners.</summary>
    public const int MaxBusinessesPerOwner = 10;

    private string BaseUrl => options.Value.PublicBaseUrl;

    public async Task<IReadOnlyList<BusinessSummaryDto>> ListMineAsync(Guid userId, CancellationToken ct = default) =>
        (await businesses.ListForUserAsync(userId, ct)).Select(a => BusinessMapper.Summary(a.Business, a.Role, BaseUrl)).ToList();

    public async Task<BusinessDetailDto> GetAsync(Guid userId, Guid businessId, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Editor, ct);
        return await DetailAsync(access, ct);
    }

    public async Task<BusinessDetailDto> CreateAsync(Guid userId, BusinessUpsertRequest request, CancellationToken ct = default)
    {
        if (await businesses.CountOwnedAsync(userId, ct) >= MaxBusinessesPerOwner)
            throw new BusinessValidationException($"You can own up to {MaxBusinessesPerOwner} business profiles.");

        var business = new Business { OwnerId = userId, Slug = await UniqueSlugAsync(request.Name, null, ct), QrCode = await UniqueQrCodeAsync(ct) };
        await ApplyAsync(business, request, ct);
        business.QrGeneratedAt = clock.GetUtcNow().UtcDateTime;
        businesses.Add(business);
        await uow.SaveChangesAsync(ct);

        var access = await businesses.GetAccessAsync(business.Id, userId, ct) ?? throw new NotFoundException();
        return await DetailAsync(access, ct);
    }

    public async Task<BusinessDetailDto> UpdateAsync(Guid userId, Guid businessId, BusinessUpsertRequest request, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        await ApplyAsync(access.Business, request, ct);
        // A published profile must stay publishable after edits.
        if (access.Business.Status == BusinessStatus.Published) BusinessCompletion.EnsurePublishable(access.Business);
        await uow.SaveChangesAsync(ct);
        return await DetailAsync(access, ct);
    }

    public async Task DeleteAsync(Guid userId, Guid businessId, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Owner, ct);
        var files = await businesses.ListFileUrlsAsync(businessId, ct);
        uow.Remove(access.Business);
        await uow.SaveChangesAsync(ct);
        await ImageUpload.DeleteQuietlyAsync(storage, files);
    }

    public async Task<BusinessDetailDto> SetPublishedAsync(Guid userId, Guid businessId, bool publish, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        var b = access.Business;
        if (publish)
        {
            BusinessCompletion.EnsurePublishable(b);
            if (b.Status != BusinessStatus.Published)
            {
                b.Status = BusinessStatus.Published;
                b.PublishedAt = clock.GetUtcNow().UtcDateTime;
            }
        }
        else
        {
            b.Status = BusinessStatus.Draft;
        }
        await uow.SaveChangesAsync(ct);
        return await DetailAsync(access, ct);
    }

    public async Task<BusinessDetailDto> UpdateSlugAsync(Guid userId, Guid businessId, UpdateBusinessSlugRequest request, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Owner, ct);
        var slug = request.Slug.Trim().ToLowerInvariant();
        if (!BusinessSlug.IsValid(slug))
            throw new BusinessValidationException("Use 3–60 lowercase letters, numbers and single hyphens (not at the start or end).");
        if (slug != access.Business.Slug)
        {
            if (await businesses.SlugExistsAsync(slug, businessId, ct)) throw new ConflictException("That link is already taken.");
            access.Business.Slug = slug;
            await uow.SaveChangesAsync(ct);
        }
        return await DetailAsync(access, ct);
    }

    public async Task<BusinessDetailDto> UploadImageAsync(Guid userId, Guid businessId, BusinessImageKind kind, Stream content,
        long length, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        var url = await ImageUpload.SaveAsync(storage, content, length, ct);
        var previous = Swap(access.Business, kind, url);
        await uow.SaveChangesAsync(ct);
        await ImageUpload.DeleteQuietlyAsync(storage, [previous]);
        return await DetailAsync(access, ct);
    }

    public async Task<BusinessDetailDto> RemoveImageAsync(Guid userId, Guid businessId, BusinessImageKind kind, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        var previous = Swap(access.Business, kind, null);
        await uow.SaveChangesAsync(ct);
        await ImageUpload.DeleteQuietlyAsync(storage, [previous]);
        return await DetailAsync(access, ct);
    }

    public async Task<PublicBusinessDto> PreviewAsync(Guid userId, Guid businessId, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Editor, ct);
        return await storefront.BuildAsync(access.Business, isPreview: true, ct);
    }

    // ---------- Team ----------

    public async Task<IReadOnlyList<BusinessMemberDto>> ListMembersAsync(Guid userId, Guid businessId, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Editor, ct);
        var owner = await users.GetWithProfileAsync(access.Business.OwnerId, ct);
        var result = new List<BusinessMemberDto>();
        if (owner is not null)
            result.Add(new BusinessMemberDto(owner.Id, owner.Profile?.FullName ?? owner.Email, owner.Email, BusinessRole.Owner, true, access.Business.CreatedAt));
        result.AddRange((await businesses.ListMembersAsync(businessId, ct)).Select(Member));
        return result;
    }

    public async Task<BusinessMemberDto> AddMemberAsync(Guid userId, Guid businessId, AddBusinessMemberRequest request, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Owner, ct);
        if (request.Role == BusinessRole.Owner) throw new BusinessValidationException("A business can only have one owner.");

        var user = await users.GetByEmailAsync(request.Email.Trim().ToUpperInvariant(), ct)
                   ?? throw new NotFoundException("No account uses that email. Ask them to sign up first, then add them.");
        if (user.Id == access.Business.OwnerId) throw new ConflictException("The owner is already part of this business.");
        if (user.AccountType != AccountType.Business)
            throw new BusinessValidationException("That email belongs to a personal account. Team members need a business account — ask them to register one with a different email.");
        if (await businesses.GetMemberAsync(businessId, user.Id, ct) is not null)
            throw new ConflictException("This person is already on the team.");

        businesses.AddMember(new BusinessMember { BusinessId = businessId, UserId = user.Id, Role = request.Role });
        await uow.SaveChangesAsync(ct);
        return Member((await businesses.GetMemberAsync(businessId, user.Id, ct))!);
    }

    public async Task<BusinessMemberDto> UpdateMemberAsync(Guid userId, Guid businessId, Guid memberUserId,
        UpdateBusinessMemberRequest request, CancellationToken ct = default)
    {
        await guard.RequireAsync(userId, businessId, BusinessRole.Owner, ct);
        if (request.Role == BusinessRole.Owner) throw new BusinessValidationException("A business can only have one owner.");
        var member = await businesses.GetMemberAsync(businessId, memberUserId, ct) ?? throw new NotFoundException("Team member not found.");
        member.Role = request.Role;
        await uow.SaveChangesAsync(ct);
        return Member(member);
    }

    public async Task RemoveMemberAsync(Guid userId, Guid businessId, Guid memberUserId, CancellationToken ct = default)
    {
        // Members may remove themselves (leave); otherwise only the owner can remove people.
        await guard.RequireAsync(userId, businessId, userId == memberUserId ? BusinessRole.Editor : BusinessRole.Owner, ct);
        var member = await businesses.GetMemberAsync(businessId, memberUserId, ct) ?? throw new NotFoundException("Team member not found.");
        uow.Remove(member);
        await uow.SaveChangesAsync(ct);
    }

    // ---------- Helpers ----------

    private static BusinessMemberDto Member(BusinessMember m) =>
        new(m.UserId, m.User?.Profile?.FullName ?? m.User?.Email ?? "", m.User?.Email ?? "", m.Role, false, m.CreatedAt);

    private static string? Swap(Business b, BusinessImageKind kind, string? url)
    {
        string? previous;
        if (kind == BusinessImageKind.Logo) { previous = b.LogoUrl; b.LogoUrl = url; }
        else { previous = b.CoverUrl; b.CoverUrl = url; }
        return previous;
    }

    private async Task<BusinessDetailDto> DetailAsync(BusinessAccess access, CancellationToken ct)
    {
        var b = access.Business;
        var products = await catalog.CountProductsAsync(b.Id, publicOnly: false, ct);
        var services = (await catalog.ListServicesAsync(b.Id, availableOnly: false, ct)).Count;
        var gallery = await catalog.CountGalleryAsync(b.Id, ct);
        var (percent, missing) = BusinessCompletion.Calculate(b, products, services, gallery);
        return BusinessMapper.Detail(b, access.Role, BaseUrl, new ProfileCompletionDto(percent, missing));
    }

    private async Task ApplyAsync(Business b, BusinessUpsertRequest r, CancellationToken ct)
    {
        var category = await categories.GetAsync(r.CategoryId, includeAttributes: false, ct)
                       ?? throw new BusinessValidationException("Please choose a valid business category.");
        if (r.SubcategoryId is not null && category.Subcategories.All(s => s.Id != r.SubcategoryId))
            throw new BusinessValidationException("The subcategory doesn't belong to the chosen category.");
        var timeZone = Text.Clean(r.TimeZone) ?? b.TimeZone ?? BusinessTime.DefaultZone;
        if (!BusinessTime.IsValid(timeZone)) throw new BusinessValidationException("Unknown time zone.");

        b.Name = r.Name.Trim();
        b.CategoryId = category.Id;
        b.SubcategoryId = r.SubcategoryId;
        b.Description = Text.Clean(r.Description);
        b.YearEstablished = r.YearEstablished;
        b.Email = Text.Clean(r.Email);
        b.Phone = Text.Clean(r.Phone);
        b.WhatsApp = Text.Clean(r.WhatsApp);
        b.Website = Text.Clean(r.Website);
        b.AddressLine1 = Text.Clean(r.AddressLine1);
        b.AddressLine2 = Text.Clean(r.AddressLine2);
        b.City = Text.Clean(r.City);
        b.State = Text.Clean(r.State);
        b.Country = Text.Clean(r.Country);
        b.PostalCode = Text.Clean(r.PostalCode);
        b.MapsUrl = Text.Clean(r.MapsUrl);
        b.Latitude = r.Latitude;
        b.Longitude = r.Longitude;
        b.TimeZone = timeZone;
        b.DeliveryAvailable = r.DeliveryAvailable;
        b.PickupAvailable = r.PickupAvailable;
        b.PaymentMethods = r.PaymentMethods.Aggregate(PaymentMethods.None, (acc, m) => acc | m);
        b.Theme = r.Theme;
        b.BrandColor = r.BrandColor.ToUpperInvariant();
        b.Layout = r.Layout;
        var sections = r.FeaturedSections.Distinct().ToList();
        b.FeaturedSections = sections.Count > 0 ? string.Join(",", sections) : string.Join(",", BusinessUpsertRequest.SectionKeys);

        // Child collections are replaced wholesale (same approach as personal profile social links).
        uow.RemoveRange(b.SocialLinks.ToList());
        b.SocialLinks.Clear();
        foreach (var (link, i) in r.SocialLinks.Select((l, i) => (l, i)))
            b.SocialLinks.Add(new BusinessSocialLink { BusinessId = b.Id, Platform = link.Platform, Label = Text.Clean(link.Label), Url = link.Url.Trim(), SortOrder = i });

        uow.RemoveRange(b.WorkingHours.ToList());
        b.WorkingHours.Clear();
        foreach (var h in r.WorkingHours)
            b.WorkingHours.Add(new BusinessWorkingHour
            {
                BusinessId = b.Id, Day = h.Day, IsClosed = h.IsClosed,
                Opens = h.IsClosed ? null : BusinessTime.ParseTime(h.Opens),
                Closes = h.IsClosed ? null : BusinessTime.ParseTime(h.Closes)
            });

        uow.RemoveRange(b.SpecialHours.ToList());
        b.SpecialHours.Clear();
        foreach (var h in r.SpecialHours)
            b.SpecialHours.Add(new BusinessSpecialHour
            {
                BusinessId = b.Id, Date = h.Date, IsClosed = h.IsClosed, Note = Text.Clean(h.Note),
                Opens = h.IsClosed ? null : BusinessTime.ParseTime(h.Opens),
                Closes = h.IsClosed ? null : BusinessTime.ParseTime(h.Closes)
            });
    }

    private async Task<string> UniqueSlugAsync(string name, Guid? excludeId, CancellationToken ct)
    {
        var baseSlug = BusinessSlug.FromName(name);
        var slug = baseSlug;
        for (var i = 2; await businesses.SlugExistsAsync(slug, excludeId, ct); i++)
            slug = $"{baseSlug}-{i}";
        return slug;
    }

    private Task<string> UniqueQrCodeAsync(CancellationToken ct) => NewQrCodeAsync(businesses, ct);

    internal static async Task<string> NewQrCodeAsync(IBusinessRepository repo, CancellationToken ct)
    {
        string code;
        do code = QrCodes.New();
        while (await repo.QrCodeExistsAsync(code, ct));
        return code;
    }
}
