using ProLink.Domain.Common;
using ProLink.Domain.Enums;

namespace ProLink.Domain.Entities;

/// <summary>An independent professional identity owned by a single user.</summary>
public class ProfileMode : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string ModeName { get; set; } = string.Empty;
    public ModeType ModeType { get; set; } = ModeType.General;
    public string? Designation { get; set; }
    public string? CompanyName { get; set; }
    public string? Summary { get; set; }

    // Mode-specific contact information (falls back to the main profile when empty)
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? Location { get; set; }
    public string? Website { get; set; }

    // Role-specific fields (Entrepreneur / Developer)
    public string? BusinessName { get; set; }
    public string? Industry { get; set; }
    public string? BusinessDescription { get; set; }
    public string? CompanyWebsite { get; set; }
    public string? GitHubUrl { get; set; }

    /// <summary>Published modes are visible on the public profile.</summary>
    public bool IsPublished { get; set; } = true;
    public bool IsDefault { get; set; }
    public int SortOrder { get; set; }

    public ICollection<ProfileSkill> Skills { get; set; } = new List<ProfileSkill>();
    public ICollection<WorkExperience> WorkExperiences { get; set; } = new List<WorkExperience>();
    public ICollection<EducationDetail> Educations { get; set; } = new List<EducationDetail>();
    public ICollection<Project> Projects { get; set; } = new List<Project>();
    public ICollection<Achievement> Achievements { get; set; } = new List<Achievement>();
    public ICollection<Certification> Certifications { get; set; } = new List<Certification>();
    public ICollection<OfferedService> Services { get; set; } = new List<OfferedService>();
    public ICollection<CustomSection> CustomSections { get; set; } = new List<CustomSection>();
    public ICollection<SocialLink> SocialLinks { get; set; } = new List<SocialLink>();
    public ModeTemplateMapping? TemplateMapping { get; set; }
}
