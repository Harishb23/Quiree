using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Domain.Entities;

namespace ProLink.Application.Services;

public sealed class EnquiryService(IEnquiryRepository enquiries, IUnitOfWork uow) : IEnquiryService
{
    public async Task<EnquiryDto> CreateAsync(CreateEnquiryRequest request, CancellationToken ct = default)
    {
        var enquiry = new Enquiry
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            Subject = request.Subject.Trim(),
            Message = request.Message.Trim()
        };
        enquiries.Add(enquiry);
        await uow.SaveChangesAsync(ct);
        return ToDto(enquiry);
    }

    public async Task<IReadOnlyList<EnquiryDto>> ListAsync(CancellationToken ct = default) =>
        (await enquiries.ListAsync(200, ct)).Select(ToDto).ToList();

    private static EnquiryDto ToDto(Enquiry e) =>
        new(e.Id, e.Name, e.Email, e.Phone, e.Subject, e.Message, e.Status, e.CreatedAt);
}

public sealed class DashboardService(
    IUserRepository users,
    IProfileModeRepository modes,
    ISubscriptionService subscriptions) : IDashboardService
{
    public async Task<DashboardOverviewDto> GetOverviewAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.GetWithProfileAsync(userId, ct) ?? throw new NotFoundException("User not found.");
        var all = await modes.ListByUserAsync(userId, ct);
        var active = all.FirstOrDefault(m => m.IsDefault && m.IsPublished) ?? all.FirstOrDefault(m => m.IsPublished);
        var entitlements = await subscriptions.GetEntitlementsAsync(userId, ct);
        var settings = user.PublicSettings!;

        return new DashboardOverviewDto(
            TotalModes: all.Count,
            PublishedModes: all.Count(m => m.IsPublished),
            ActiveModeName: active?.ModeName,
            ActiveModeId: active?.Id,
            SelectedTemplateName: active?.TemplateMapping?.Template?.Name,
            QrStatus: settings.IsPublic ? "Active" : "Private",
            PublicUrl: settings.PermanentUrl,
            IsPublic: settings.IsPublic,
            Subscription: entitlements,
            ProfileCompletion: CalculateCompletion(user.Profile, all.Count));
    }

    private static int CalculateCompletion(UserProfile? p, int modeCount)
    {
        if (p is null) return 0;
        var checks = new[]
        {
            !string.IsNullOrWhiteSpace(p.FullName), !string.IsNullOrWhiteSpace(p.PhotoUrl),
            !string.IsNullOrWhiteSpace(p.Email), !string.IsNullOrWhiteSpace(p.Mobile),
            !string.IsNullOrWhiteSpace(p.Location), !string.IsNullOrWhiteSpace(p.Summary),
            p.SocialLinks.Count > 0, modeCount > 0
        };
        return (int)Math.Round(checks.Count(c => c) * 100.0 / checks.Length);
    }
}

public sealed class AccountService(IProfileRepository profiles, IUnitOfWork uow, TimeProvider clock) : IAccountService
{
    public async Task<PublicSettingsDto> GetPublicSettingsAsync(Guid userId, CancellationToken ct = default) =>
        ToDto(await LoadAsync(userId, ct));

    public async Task<PublicSettingsDto> UpdatePublicSettingsAsync(Guid userId, UpdatePublicSettingsRequest request,
        CancellationToken ct = default)
    {
        var settings = await LoadAsync(userId, ct);
        // PermanentUrl and QrReference are intentionally not editable.
        settings.IsPublic = request.IsPublic;
        settings.AllowViewerModeSelection = request.AllowViewerModeSelection;
        settings.UpdatedAt = clock.GetUtcNow().UtcDateTime;
        await uow.SaveChangesAsync(ct);
        return ToDto(settings);
    }

    private async Task<PublicProfileSettings> LoadAsync(Guid userId, CancellationToken ct) =>
        await profiles.GetSettingsAsync(userId, ct) ?? throw new NotFoundException("Settings not found.");

    private static PublicSettingsDto ToDto(PublicProfileSettings s) =>
        new(s.IsPublic, s.AllowViewerModeSelection, s.PermanentUrl);
}
