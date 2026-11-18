using System.ComponentModel.DataAnnotations;
using ProLink.Application.Common;
using ProLink.Domain.Enums;

namespace ProLink.Application.DTOs;

public sealed class SocialLinkDto
{
    [Required]
    public SocialPlatform Platform { get; set; }

    [Required, StringLength(500), SafeUrl]
    public string Url { get; set; } = string.Empty;
}

public sealed class UpdateProfileRequest
{
    [Required, StringLength(100, MinimumLength = 2)]
    public string FullName { get; set; } = string.Empty;

    [EmailAddress, StringLength(256)]
    public string? Email { get; set; }

    [Phone, StringLength(30)]
    public string? Mobile { get; set; }

    [StringLength(150)]
    public string? Location { get; set; }

    [StringLength(300), SafeUrl]
    public string? Website { get; set; }

    [StringLength(2000)]
    public string? Summary { get; set; }

    [MaxLength(10)]
    public List<SocialLinkDto> SocialLinks { get; set; } = [];
}

public sealed record ProfileDto(
    string FullName,
    string? PhotoUrl,
    string? Email,
    string? Mobile,
    string? Location,
    string? Website,
    string? Summary,
    IReadOnlyList<SocialLinkDto> SocialLinks,
    DateTime UpdatedAt);
