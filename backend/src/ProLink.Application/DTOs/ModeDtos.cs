using System.ComponentModel.DataAnnotations;
using ProLink.Application.Common;
using ProLink.Domain.Enums;

namespace ProLink.Application.DTOs;

public sealed class SkillDto
{
    [Required, StringLength(80)]
    public string Name { get; set; } = string.Empty;

    [StringLength(80)]
    public string? Category { get; set; }

    [Range(0, 100)]
    public int? Level { get; set; }
}

public sealed class WorkExperienceDto
{
    [Required, StringLength(120)]
    public string Title { get; set; } = string.Empty;

    [Required, StringLength(150)]
    public string Company { get; set; } = string.Empty;

    [StringLength(150)]
    public string? Location { get; set; }

    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsCurrent { get; set; }

    [StringLength(2000)]
    public string? Description { get; set; }

    [StringLength(4000)]
    public string? Responsibilities { get; set; }
}

public sealed class EducationDto
{
    [Required, StringLength(150)]
    public string Degree { get; set; } = string.Empty;

    [Required, StringLength(200)]
    public string Institution { get; set; } = string.Empty;

    [StringLength(150)]
    public string? FieldOfStudy { get; set; }

    [Range(1950, 2100)]
    public int? StartYear { get; set; }

    [Range(1950, 2100)]
    public int? EndYear { get; set; }

    [StringLength(50)]
    public string? Grade { get; set; }

    [StringLength(1000)]
    public string? Description { get; set; }
}

public sealed class ProjectDto
{
    [Required, StringLength(150)]
    public string Title { get; set; } = string.Empty;

    [StringLength(120)]
    public string? Role { get; set; }

    [StringLength(2000)]
    public string? Description { get; set; }

    [StringLength(300)]
    public string? TechStack { get; set; }

    [StringLength(1000)]
    public string? Outcome { get; set; }

    [StringLength(500), SafeUrl]
    public string? Url { get; set; }
}

public sealed class AchievementDto
{
    [Required, StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    public DateOnly? Date { get; set; }
}

public sealed class CertificationDto
{
    [Required, StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [StringLength(150)]
    public string? Issuer { get; set; }

    public DateOnly? IssueDate { get; set; }

    [StringLength(500), SafeUrl]
    public string? CredentialUrl { get; set; }
}

public sealed class ServiceDto
{
    [Required, StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }
}

public sealed class CustomSectionDto
{
    [Required, StringLength(100)]
    public string Title { get; set; } = string.Empty;

    [Required, StringLength(4000)]
    public string Content { get; set; } = string.Empty;
}

/// <summary>Full create/update payload for a profile mode. Section lists replace existing entries.</summary>
public sealed class ModeUpsertRequest
{
    [Required, StringLength(60, MinimumLength = 2)]
    public string ModeName { get; set; } = string.Empty;

    public ModeType ModeType { get; set; } = ModeType.General;

    [StringLength(120)]
    public string? Designation { get; set; }

    [StringLength(150)]
    public string? CompanyName { get; set; }

    [StringLength(3000)]
    public string? Summary { get; set; }

    [EmailAddress, StringLength(256)]
    public string? ContactEmail { get; set; }

    [Phone, StringLength(30)]
    public string? ContactPhone { get; set; }

    [StringLength(150)]
    public string? Location { get; set; }

    [StringLength(300), SafeUrl]
    public string? Website { get; set; }

    [StringLength(150)]
    public string? BusinessName { get; set; }

    [StringLength(100)]
    public string? Industry { get; set; }

    [StringLength(3000)]
    public string? BusinessDescription { get; set; }

    [StringLength(300), SafeUrl]
    public string? CompanyWebsite { get; set; }

    [StringLength(300), SafeUrl]
    public string? GitHubUrl { get; set; }

    public bool IsPublished { get; set; } = true;

    /// <summary>Optional template to assign when creating the mode.</summary>
    public int? TemplateId { get; set; }

    [MaxLength(60)] public List<SkillDto> Skills { get; set; } = [];
    [MaxLength(30)] public List<WorkExperienceDto> WorkExperiences { get; set; } = [];
    [MaxLength(20)] public List<EducationDto> Educations { get; set; } = [];
    [MaxLength(30)] public List<ProjectDto> Projects { get; set; } = [];
    [MaxLength(30)] public List<AchievementDto> Achievements { get; set; } = [];
    [MaxLength(30)] public List<CertificationDto> Certifications { get; set; } = [];
    [MaxLength(30)] public List<ServiceDto> Services { get; set; } = [];
    [MaxLength(10)] public List<CustomSectionDto> CustomSections { get; set; } = [];
    [MaxLength(10)] public List<SocialLinkDto> SocialLinks { get; set; } = [];
}

public sealed class SetPublishedRequest
{
    public bool IsPublished { get; set; }
}

public sealed record ModeSummaryDto(
    Guid Id,
    string ModeName,
    ModeType ModeType,
    string? Designation,
    string? CompanyName,
    bool IsPublished,
    bool IsDefault,
    int SortOrder,
    int? TemplateId,
    string? TemplateKey,
    string? TemplateName,
    DateTime UpdatedAt);

public sealed record ModeDetailDto(
    Guid Id,
    string ModeName,
    ModeType ModeType,
    string? Designation,
    string? CompanyName,
    string? Summary,
    string? ContactEmail,
    string? ContactPhone,
    string? Location,
    string? Website,
    string? BusinessName,
    string? Industry,
    string? BusinessDescription,
    string? CompanyWebsite,
    string? GitHubUrl,
    bool IsPublished,
    bool IsDefault,
    int SortOrder,
    int? TemplateId,
    string? TemplateKey,
    IReadOnlyList<SkillDto> Skills,
    IReadOnlyList<WorkExperienceDto> WorkExperiences,
    IReadOnlyList<EducationDto> Educations,
    IReadOnlyList<ProjectDto> Projects,
    IReadOnlyList<AchievementDto> Achievements,
    IReadOnlyList<CertificationDto> Certifications,
    IReadOnlyList<ServiceDto> Services,
    IReadOnlyList<CustomSectionDto> CustomSections,
    IReadOnlyList<SocialLinkDto> SocialLinks,
    DateTime UpdatedAt);
