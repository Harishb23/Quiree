using ProLink.Domain.Common;
using ProLink.Domain.Enums;

namespace ProLink.Domain.Entities;

public abstract class ModeChildEntity : BaseEntity
{
    public Guid ProfileModeId { get; set; }
    public ProfileMode? ProfileMode { get; set; }
    public int SortOrder { get; set; }
}

public class ProfileSkill : ModeChildEntity
{
    public string Name { get; set; } = string.Empty;
    /// <summary>Grouping such as "Programming Languages", "Recruitment", "SEO".</summary>
    public string? Category { get; set; }
    /// <summary>Optional proficiency 0-100.</summary>
    public int? Level { get; set; }
}

public class WorkExperience : ModeChildEntity
{
    public string Title { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string? Location { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsCurrent { get; set; }
    public string? Description { get; set; }
    /// <summary>Newline-separated responsibilities.</summary>
    public string? Responsibilities { get; set; }
}

public class EducationDetail : ModeChildEntity
{
    public string Degree { get; set; } = string.Empty;
    public string Institution { get; set; } = string.Empty;
    public string? FieldOfStudy { get; set; }
    public int? StartYear { get; set; }
    public int? EndYear { get; set; }
    public string? Grade { get; set; }
    public string? Description { get; set; }
}

public class Project : ModeChildEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? Description { get; set; }
    public string? TechStack { get; set; }
    /// <summary>Outcomes such as campaign results or business impact.</summary>
    public string? Outcome { get; set; }
    public string? Url { get; set; }
}

public class Achievement : ModeChildEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? Date { get; set; }
}

public class Certification : ModeChildEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Issuer { get; set; }
    public DateOnly? IssueDate { get; set; }
    public string? CredentialUrl { get; set; }
}

public class OfferedService : ModeChildEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class CustomSection : ModeChildEntity
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

/// <summary>Belongs either to the main profile or to a specific mode.</summary>
public class SocialLink : BaseEntity
{
    public Guid? UserProfileId { get; set; }
    public UserProfile? UserProfile { get; set; }
    public Guid? ProfileModeId { get; set; }
    public ProfileMode? ProfileMode { get; set; }

    public SocialPlatform Platform { get; set; }
    public string Url { get; set; } = string.Empty;
}
