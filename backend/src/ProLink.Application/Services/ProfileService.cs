using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Application.Mapping;
using ProLink.Domain.Entities;

namespace ProLink.Application.Services;

public sealed class ProfileService(
    IProfileRepository profiles,
    IUnitOfWork uow,
    IFileStorage storage,
    TimeProvider clock) : IProfileService
{
    public const long MaxPhotoBytes = 2 * 1024 * 1024;

    public async Task<ProfileDto> GetAsync(Guid userId, CancellationToken ct = default) =>
        ToDto(await LoadAsync(userId, ct));

    public async Task<ProfileDto> UpdateAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct = default)
    {
        var profile = await LoadAsync(userId, ct);
        profile.FullName = request.FullName.Trim();
        profile.Email = Clean(request.Email);
        profile.Mobile = Clean(request.Mobile);
        profile.Location = Clean(request.Location);
        profile.Website = Clean(request.Website);
        profile.Summary = Clean(request.Summary);
        profile.UpdatedAt = clock.GetUtcNow().UtcDateTime;

        uow.RemoveRange(profile.SocialLinks.ToList());
        profile.SocialLinks.Clear();
        foreach (var link in request.SocialLinks.GroupBy(l => l.Platform).Select(g => g.First()))
            profile.SocialLinks.Add(new SocialLink { UserProfileId = profile.Id, Platform = link.Platform, Url = link.Url.Trim() });

        await uow.SaveChangesAsync(ct);
        return ToDto(profile);
    }

    public async Task<ProfileDto> UpdatePhotoAsync(Guid userId, Stream content, string fileName, long length,
        CancellationToken ct = default)
    {
        if (length <= 0) throw new BusinessValidationException("Please choose an image to upload.");
        if (length > MaxPhotoBytes) throw new BusinessValidationException("Profile photo must be 2 MB or smaller.");

        // Validate by file signature, not by the client-supplied name or content type.
        await using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, ct);
        var extension = ImageSignature.Detect(buffer.GetBuffer().AsSpan(0, (int)buffer.Length))
                        ?? throw new BusinessValidationException("Only JPG, PNG or WEBP images are allowed.");
        buffer.Position = 0;

        var profile = await LoadAsync(userId, ct);
        var previous = profile.PhotoUrl;
        profile.PhotoUrl = await storage.SaveAsync(buffer, "profiles", extension, ct);
        profile.UpdatedAt = clock.GetUtcNow().UtcDateTime;
        await uow.SaveChangesAsync(ct);

        if (previous is not null && previous.StartsWith("/uploads/", StringComparison.Ordinal))
            await storage.DeleteAsync(previous, ct);
        return ToDto(profile);
    }

    public async Task<ProfileDto> RemovePhotoAsync(Guid userId, CancellationToken ct = default)
    {
        var profile = await LoadAsync(userId, ct);
        var previous = profile.PhotoUrl;
        profile.PhotoUrl = null;
        profile.UpdatedAt = clock.GetUtcNow().UtcDateTime;
        await uow.SaveChangesAsync(ct);
        if (previous is not null && previous.StartsWith("/uploads/", StringComparison.Ordinal))
            await storage.DeleteAsync(previous, ct);
        return ToDto(profile);
    }

    private async Task<UserProfile> LoadAsync(Guid userId, CancellationToken ct) =>
        await profiles.GetByUserIdAsync(userId, ct) ?? throw new NotFoundException("Profile not found.");

    private static ProfileDto ToDto(UserProfile p) => new(
        p.FullName, p.PhotoUrl, p.Email, p.Mobile, p.Location, p.Website, p.Summary,
        ModeMapper.SocialLinks(p.SocialLinks), p.UpdatedAt);

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public static class ImageSignature
{
    /// <summary>Returns the file extension for supported image signatures, or null.</summary>
    public static string? Detect(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) return ".jpg";
        if (bytes.Length >= 8 && bytes[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
            return ".png";
        if (bytes.Length >= 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8))
            return ".webp";
        return null;
    }
}
