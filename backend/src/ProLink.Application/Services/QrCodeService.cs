using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;

namespace ProLink.Application.Services;

/// <summary>
/// The QR code is always rendered from the stored permanent URL. Nothing about a user's modes,
/// templates or profile content feeds into it, so the code never changes.
/// </summary>
public sealed class QrCodeService(IProfileRepository profiles, IUserRepository users, IQrCodeGenerator generator)
    : IQrCodeService
{
    public async Task<QrCodeInfoDto> GetForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("User not found.");
        var settings = await LoadSettingsAsync(userId, ct);
        return new QrCodeInfoDto(user.PublicSlug, settings.PermanentUrl, settings.QrReference,
            settings.QrGeneratedAt, settings.IsPublic);
    }

    public async Task<byte[]> GetPngForUserAsync(Guid userId, int size, CancellationToken ct = default)
    {
        var settings = await LoadSettingsAsync(userId, ct);
        var pixelsPerModule = Math.Clamp(size / 30, 4, 40);
        return generator.GeneratePng(settings.PermanentUrl, pixelsPerModule);
    }

    public async Task<string> GetSvgForUserAsync(Guid userId, CancellationToken ct = default) =>
        generator.GenerateSvg((await LoadSettingsAsync(userId, ct)).PermanentUrl);

    private async Task<Domain.Entities.PublicProfileSettings> LoadSettingsAsync(Guid userId, CancellationToken ct) =>
        await profiles.GetSettingsAsync(userId, ct) ?? throw new NotFoundException("QR code not found.");
}
