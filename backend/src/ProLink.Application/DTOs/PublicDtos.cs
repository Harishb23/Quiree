using ProLink.Domain.Enums;

namespace ProLink.Application.DTOs;

public sealed record PublicContactDto(string? Email, string? Phone, string? Location, string? Website);

/// <summary>Published, viewer-safe data for one profile mode. Never contains account data.</summary>
public sealed record PublicModeDto(
    Guid Id,
    string ModeName,
    ModeType ModeType,
    string? Designation,
    string? CompanyName,
    string? Summary,
    string? BusinessName,
    string? Industry,
    string? BusinessDescription,
    string? CompanyWebsite,
    string? GitHubUrl,
    string TemplateKey,
    PublicContactDto Contact,
    IReadOnlyList<SkillDto> Skills,
    IReadOnlyList<WorkExperienceDto> WorkExperiences,
    IReadOnlyList<EducationDto> Educations,
    IReadOnlyList<ProjectDto> Projects,
    IReadOnlyList<AchievementDto> Achievements,
    IReadOnlyList<CertificationDto> Certifications,
    IReadOnlyList<ServiceDto> Services,
    IReadOnlyList<CustomSectionDto> CustomSections,
    IReadOnlyList<SocialLinkDto> SocialLinks);

public sealed record PublicProfileDto(
    string Slug,
    string PermanentUrl,
    string FullName,
    string? PhotoUrl,
    bool AllowViewerModeSelection,
    Guid? DefaultModeId,
    IReadOnlyList<PublicModeDto> Modes);

public sealed record VCardFile(string FileName, string Content);

public sealed record QrCodeInfoDto(
    string PublicSlug,
    string PermanentUrl,
    string QrReference,
    DateTime GeneratedAt,
    bool IsPublic);
