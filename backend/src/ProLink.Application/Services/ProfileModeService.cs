using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Application.Mapping;
using ProLink.Domain.Entities;

namespace ProLink.Application.Services;

public sealed class ProfileModeService(
    IProfileModeRepository modes,
    IProfileRepository profiles,
    IUserRepository users,
    ITemplateRepository templates,
    ISubscriptionService subscriptions,
    IUnitOfWork uow,
    TimeProvider clock) : IProfileModeService
{
    public async Task<IReadOnlyList<ModeSummaryDto>> ListAsync(Guid userId, CancellationToken ct = default) =>
        (await modes.ListByUserAsync(userId, ct)).Select(ModeMapper.ToSummary).ToList();

    public async Task<ModeDetailDto> GetAsync(Guid userId, Guid modeId, CancellationToken ct = default) =>
        ModeMapper.ToDetail(await LoadAsync(userId, modeId, true, ct));

    public async Task<ModeDetailDto> CreateAsync(Guid userId, ModeUpsertRequest request, CancellationToken ct = default)
    {
        var entitlements = await subscriptions.GetEntitlementsAsync(userId, ct);
        var count = await modes.CountByUserAsync(userId, ct);
        if (count >= entitlements.MaxModes)
            throw new PlanLimitException(
                $"Your {entitlements.PlanName} plan allows up to {entitlements.MaxModes} profile modes. Upgrade to add more.");

        await EnsureUniqueNameAsync(userId, request.ModeName, null, ct);

        var template = request.TemplateId is { } templateId
            ? await templates.GetByIdAsync(templateId, ct) ?? throw new BusinessValidationException("Template not found.")
            : await templates.GetDefaultAsync(ct);
        if (template is { IsPremium: true } && !entitlements.AllowsPremiumTemplates)
            throw new PlanLimitException("This template is available on premium plans.");

        var mode = new ProfileMode
        {
            UserId = userId,
            SortOrder = count,
            IsDefault = count == 0,
            IsPublished = request.IsPublished || count == 0
        };
        ModeMapper.Apply(request, mode);
        ReplaceSocialLinks(mode, request.SocialLinks);
        if (template is not null)
            mode.TemplateMapping = new ModeTemplateMapping { ProfileModeId = mode.Id, TemplateId = template.Id, Template = template };

        modes.Add(mode);
        await uow.SaveChangesAsync(ct);
        return ModeMapper.ToDetail(mode);
    }

    public async Task<ModeDetailDto> UpdateAsync(Guid userId, Guid modeId, ModeUpsertRequest request,
        CancellationToken ct = default)
    {
        var mode = await LoadAsync(userId, modeId, true, ct);
        await EnsureUniqueNameAsync(userId, request.ModeName, modeId, ct);

        ModeMapper.Apply(request, mode);
        mode.IsPublished = request.IsPublished;
        uow.RemoveRange(mode.SocialLinks.ToList());
        mode.SocialLinks.Clear();
        ReplaceSocialLinks(mode, request.SocialLinks);

        await uow.SaveChangesAsync(ct);
        return ModeMapper.ToDetail(mode);
    }

    public async Task DeleteAsync(Guid userId, Guid modeId, CancellationToken ct = default)
    {
        var all = await modes.ListByUserAsync(userId, ct);
        var mode = all.FirstOrDefault(m => m.Id == modeId) ?? throw new NotFoundException("Profile mode not found.");

        var detailed = await LoadAsync(userId, modeId, true, ct);
        uow.RemoveRange(detailed.SocialLinks.ToList());
        uow.Remove(detailed);

        var remaining = all.Where(m => m.Id != modeId).OrderBy(m => m.SortOrder).ToList();
        if (mode.IsDefault && remaining.Count > 0)
        {
            var next = remaining.FirstOrDefault(m => m.IsPublished) ?? remaining[0];
            next.IsDefault = true;
            next.IsPublished = true;
        }
        for (var i = 0; i < remaining.Count; i++) remaining[i].SortOrder = i;

        await uow.SaveChangesAsync(ct);
    }

    public async Task<ModeSummaryDto> SetPublishedAsync(Guid userId, Guid modeId, bool isPublished,
        CancellationToken ct = default)
    {
        var mode = await LoadAsync(userId, modeId, false, ct);
        mode.IsPublished = isPublished;
        mode.UpdatedAt = clock.GetUtcNow().UtcDateTime;
        await uow.SaveChangesAsync(ct);
        return ModeMapper.ToSummary(mode);
    }

    public async Task<IReadOnlyList<ModeSummaryDto>> SetDefaultAsync(Guid userId, Guid modeId,
        CancellationToken ct = default)
    {
        var all = await modes.ListByUserAsync(userId, ct);
        var target = all.FirstOrDefault(m => m.Id == modeId) ?? throw new NotFoundException("Profile mode not found.");

        foreach (var m in all) m.IsDefault = m.Id == modeId;
        // The default mode is what new viewers see, so it must be published.
        target.IsPublished = true;
        target.UpdatedAt = clock.GetUtcNow().UtcDateTime;

        await uow.SaveChangesAsync(ct);
        return all.OrderBy(m => m.SortOrder).Select(ModeMapper.ToSummary).ToList();
    }

    public async Task<PublicProfileDto> PreviewAsync(Guid userId, Guid modeId, CancellationToken ct = default)
    {
        var mode = await LoadAsync(userId, modeId, true, ct);
        var profile = await profiles.GetByUserIdAsync(userId, ct) ?? throw new NotFoundException("Profile not found.");
        var settings = await profiles.GetSettingsAsync(userId, ct) ?? throw new NotFoundException("Profile not found.");
        var user = await users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("User not found.");
        return new PublicProfileDto(user.PublicSlug, settings.PermanentUrl, profile.FullName, profile.PhotoUrl,
            false, mode.Id, [ModeMapper.ToPublic(mode, profile)]);
    }

    private async Task<ProfileMode> LoadAsync(Guid userId, Guid modeId, bool includeSections, CancellationToken ct) =>
        await modes.GetAsync(userId, modeId, includeSections, ct) ?? throw new NotFoundException("Profile mode not found.");

    private async Task EnsureUniqueNameAsync(Guid userId, string modeName, Guid? excludeId, CancellationToken ct)
    {
        if (await modes.NameExistsAsync(userId, modeName.Trim(), excludeId, ct))
            throw new ConflictException($"You already have a profile mode named \"{modeName.Trim()}\".");
    }

    private static void ReplaceSocialLinks(ProfileMode mode, IEnumerable<SocialLinkDto> links)
    {
        foreach (var link in links.GroupBy(l => l.Platform).Select(g => g.First()))
            mode.SocialLinks.Add(new SocialLink { ProfileModeId = mode.Id, Platform = link.Platform, Url = link.Url.Trim() });
    }
}
