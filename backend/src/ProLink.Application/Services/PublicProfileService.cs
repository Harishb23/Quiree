using System.Text.Json;
using Microsoft.Extensions.Options;
using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Application.Mapping;
using ProLink.Domain.Entities;

namespace ProLink.Application.Services;

public sealed class PublicProfileService(IProfileRepository profiles, IOptions<AppOptions> appOptions)
    : IPublicProfileService
{
    public async Task<PublicProfileDto> GetAsync(string slug, CancellationToken ct = default)
    {
        var user = await LoadAsync(slug, ct);
        return Build(user);
    }

    public async Task<VCardFile> GetVCardAsync(string slug, Guid? modeId, CancellationToken ct = default)
    {
        var profile = Build(await LoadAsync(slug, ct));
        var mode = (modeId is { } id ? profile.Modes.FirstOrDefault(m => m.Id == id) : null)
                   ?? profile.Modes.FirstOrDefault(m => m.Id == profile.DefaultModeId)
                   ?? throw new NotFoundException("This profile has no published modes yet.");

        return new VCardFile(VCardBuilder.FileName(profile.FullName),
            VCardBuilder.Build(profile.FullName, mode, profile.PermanentUrl));
    }

    public Task<string> GetManifestJsonAsync(string slug, CancellationToken ct = default) =>
        BuildManifestAsync(slug, qrApp: false, ct);

    public Task<string> GetQrManifestJsonAsync(string slug, CancellationToken ct = default) =>
        BuildManifestAsync(slug, qrApp: true, ct);

    /// <summary>The profile app opens /p/{slug}; the QR app opens /q/{slug}, a full-screen QR to show to others.</summary>
    private async Task<string> BuildManifestAsync(string slug, bool qrApp, CancellationToken ct)
    {
        var user = await LoadAsync(slug, ct);
        var name = user.Profile?.FullName ?? user.PublicSlug;
        var firstName = name.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? name;
        var path = qrApp ? $"/q/{user.PublicSlug}" : $"/p/{user.PublicSlug}";
        var manifest = new
        {
            id = path,
            name = qrApp ? $"{appOptions.Value.BrandName} – {name}" : $"{name} | {appOptions.Value.BrandName}",
            short_name = qrApp ? appOptions.Value.BrandName : firstName,
            description = qrApp ? $"QR code that opens the profile of {name}" : $"Professional profile of {name}",
            start_url = path,
            scope = path,
            display = "standalone",
            orientation = "portrait",
            background_color = "#0b0820",
            theme_color = "#6d4aff",
            icons = new object[]
            {
                new { src = "/icons/icon-192.png", sizes = "192x192", type = "image/png", purpose = "any" },
                new { src = "/icons/icon-512.png", sizes = "512x512", type = "image/png", purpose = "any" },
                new { src = "/icons/icon-maskable-512.png", sizes = "512x512", type = "image/png", purpose = "maskable" }
            }
        };
        return JsonSerializer.Serialize(manifest);
    }

    private async Task<User> LoadAsync(string slug, CancellationToken ct)
    {
        var normalized = (slug ?? string.Empty).Trim().ToLowerInvariant();
        if (normalized.Length is 0 or > SlugRules.MaxLength) throw new NotFoundException("Profile not found.");

        var user = await profiles.GetPublicProfileBySlugAsync(normalized, ct);
        // Private profiles are indistinguishable from missing ones.
        if (user?.PublicSettings is null || !user.PublicSettings.IsPublic)
            throw new NotFoundException("Profile not found.");
        return user;
    }

    /// <summary>Only published modes are exposed. Account email, password and billing data are never included.</summary>
    private static PublicProfileDto Build(User user)
    {
        var published = user.Modes.Where(m => m.IsPublished).OrderBy(m => m.SortOrder).ToList();
        var defaultMode = published.FirstOrDefault(m => m.IsDefault) ?? published.FirstOrDefault();
        return new PublicProfileDto(
            user.PublicSlug,
            user.PublicSettings!.PermanentUrl,
            user.Profile?.FullName ?? user.PublicSlug,
            user.Profile?.PhotoUrl,
            user.PublicSettings.AllowViewerModeSelection,
            defaultMode?.Id,
            published.Select(m => ModeMapper.ToPublic(m, user.Profile)).ToList());
    }
}
