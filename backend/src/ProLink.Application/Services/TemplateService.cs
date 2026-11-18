using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Application.Mapping;
using ProLink.Domain.Entities;

namespace ProLink.Application.Services;

public sealed class TemplateService(
    ITemplateRepository templates,
    IProfileModeRepository modes,
    ISubscriptionService subscriptions,
    IUnitOfWork uow,
    TimeProvider clock) : ITemplateService
{
    public async Task<IReadOnlyList<TemplateDto>> ListAsync(Guid? userId, CancellationToken ct = default)
    {
        var allowsPremium = userId is { } id && (await subscriptions.GetEntitlementsAsync(id, ct)).AllowsPremiumTemplates;
        return (await templates.ListActiveAsync(ct))
            .Select(t => new TemplateDto(t.Id, t.Key, t.Name, t.Description, t.IsPremium,
                IsLocked: t.IsPremium && !allowsPremium))
            .ToList();
    }

    public async Task<ModeSummaryDto> AssignToModeAsync(Guid userId, Guid modeId, int templateId,
        CancellationToken ct = default)
    {
        var mode = await modes.GetAsync(userId, modeId, false, ct) ?? throw new NotFoundException("Profile mode not found.");
        var template = await templates.GetByIdAsync(templateId, ct);
        if (template is null || !template.IsActive) throw new NotFoundException("Template not found.");

        if (template.IsPremium && !(await subscriptions.GetEntitlementsAsync(userId, ct)).AllowsPremiumTemplates)
            throw new PlanLimitException($"\"{template.Name}\" is a premium template. Upgrade your plan to use it.");

        if (mode.TemplateMapping is null)
            mode.TemplateMapping = new ModeTemplateMapping { ProfileModeId = mode.Id, TemplateId = template.Id };
        else
            mode.TemplateMapping.TemplateId = template.Id;

        mode.TemplateMapping.Template = template;
        mode.TemplateMapping.UpdatedAt = clock.GetUtcNow().UtcDateTime;
        await uow.SaveChangesAsync(ct);
        return ModeMapper.ToSummary(mode);
    }
}
