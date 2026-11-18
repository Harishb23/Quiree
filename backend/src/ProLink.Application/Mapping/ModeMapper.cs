using ProLink.Application.DTOs;
using ProLink.Domain.Entities;

namespace ProLink.Application.Mapping;

public static class ModeMapper
{
    public const string FallbackTemplateKey = "modern-glass";

    public static ModeSummaryDto ToSummary(ProfileMode m) => new(
        m.Id, m.ModeName, m.ModeType, m.Designation, m.CompanyName, m.IsPublished, m.IsDefault, m.SortOrder,
        m.TemplateMapping?.TemplateId, m.TemplateMapping?.Template?.Key, m.TemplateMapping?.Template?.Name, m.UpdatedAt);

    public static ModeDetailDto ToDetail(ProfileMode m) => new(
        m.Id, m.ModeName, m.ModeType, m.Designation, m.CompanyName, m.Summary,
        m.ContactEmail, m.ContactPhone, m.Location, m.Website,
        m.BusinessName, m.Industry, m.BusinessDescription, m.CompanyWebsite, m.GitHubUrl,
        m.IsPublished, m.IsDefault, m.SortOrder,
        m.TemplateMapping?.TemplateId, m.TemplateMapping?.Template?.Key,
        Skills(m), Experiences(m), Educations(m), Projects(m), Achievements(m), Certifications(m),
        Services(m), CustomSections(m), SocialLinks(m.SocialLinks), m.UpdatedAt);

    /// <summary>Builds the viewer-safe representation. Mode contact info falls back to the main profile.</summary>
    public static PublicModeDto ToPublic(ProfileMode m, UserProfile? profile)
    {
        var contact = new PublicContactDto(
            Email: Coalesce(m.ContactEmail, profile?.Email),
            Phone: Coalesce(m.ContactPhone, profile?.Mobile),
            Location: Coalesce(m.Location, profile?.Location),
            Website: Coalesce(m.Website, profile?.Website));

        // Mode-level links override main-profile links of the same platform.
        var links = m.SocialLinks.Select(l => (l.Platform, l.Url)).ToList();
        if (profile is not null)
        {
            links.AddRange(profile.SocialLinks
                .Where(pl => links.All(l => l.Platform != pl.Platform))
                .Select(pl => (pl.Platform, pl.Url)));
        }

        return new PublicModeDto(
            m.Id, m.ModeName, m.ModeType, m.Designation, m.CompanyName,
            Coalesce(m.Summary, profile?.Summary),
            m.BusinessName, m.Industry, m.BusinessDescription, m.CompanyWebsite, m.GitHubUrl,
            m.TemplateMapping?.Template?.Key ?? FallbackTemplateKey,
            contact,
            Skills(m), Experiences(m), Educations(m), Projects(m), Achievements(m), Certifications(m),
            Services(m), CustomSections(m),
            links.OrderBy(l => l.Platform).Select(l => new SocialLinkDto { Platform = l.Platform, Url = l.Url }).ToList());
    }

    public static void Apply(ModeUpsertRequest r, ProfileMode m)
    {
        m.ModeName = r.ModeName.Trim();
        m.ModeType = r.ModeType;
        m.Designation = Clean(r.Designation);
        m.CompanyName = Clean(r.CompanyName);
        m.Summary = Clean(r.Summary);
        m.ContactEmail = Clean(r.ContactEmail);
        m.ContactPhone = Clean(r.ContactPhone);
        m.Location = Clean(r.Location);
        m.Website = Clean(r.Website);
        m.BusinessName = Clean(r.BusinessName);
        m.Industry = Clean(r.Industry);
        m.BusinessDescription = Clean(r.BusinessDescription);
        m.CompanyWebsite = Clean(r.CompanyWebsite);
        m.GitHubUrl = Clean(r.GitHubUrl);
        m.UpdatedAt = DateTime.UtcNow;

        // Sections are replaced wholesale; EF deletes the orphaned rows (required relationships).
        m.Skills.Clear();
        var i = 0;
        foreach (var s in DistinctBy(r.Skills, s => $"{s.Category}|{s.Name}"))
            m.Skills.Add(new ProfileSkill { Name = s.Name.Trim(), Category = Clean(s.Category), Level = s.Level, SortOrder = i++ });

        m.WorkExperiences.Clear();
        i = 0;
        foreach (var w in r.WorkExperiences)
            m.WorkExperiences.Add(new WorkExperience
            {
                Title = w.Title.Trim(), Company = w.Company.Trim(), Location = Clean(w.Location),
                StartDate = w.StartDate, EndDate = w.IsCurrent ? null : w.EndDate, IsCurrent = w.IsCurrent,
                Description = Clean(w.Description), Responsibilities = Clean(w.Responsibilities), SortOrder = i++
            });

        m.Educations.Clear();
        i = 0;
        foreach (var e in r.Educations)
            m.Educations.Add(new EducationDetail
            {
                Degree = e.Degree.Trim(), Institution = e.Institution.Trim(), FieldOfStudy = Clean(e.FieldOfStudy),
                StartYear = e.StartYear, EndYear = e.EndYear, Grade = Clean(e.Grade), Description = Clean(e.Description),
                SortOrder = i++
            });

        m.Projects.Clear();
        i = 0;
        foreach (var p in r.Projects)
            m.Projects.Add(new Project
            {
                Title = p.Title.Trim(), Role = Clean(p.Role), Description = Clean(p.Description),
                TechStack = Clean(p.TechStack), Outcome = Clean(p.Outcome), Url = Clean(p.Url), SortOrder = i++
            });

        m.Achievements.Clear();
        i = 0;
        foreach (var a in r.Achievements)
            m.Achievements.Add(new Achievement
            {
                Title = a.Title.Trim(), Description = Clean(a.Description), Date = a.Date, SortOrder = i++
            });

        m.Certifications.Clear();
        i = 0;
        foreach (var c in r.Certifications)
            m.Certifications.Add(new Certification
            {
                Name = c.Name.Trim(), Issuer = Clean(c.Issuer), IssueDate = c.IssueDate,
                CredentialUrl = Clean(c.CredentialUrl), SortOrder = i++
            });

        m.Services.Clear();
        i = 0;
        foreach (var s in r.Services)
            m.Services.Add(new OfferedService { Name = s.Name.Trim(), Description = Clean(s.Description), SortOrder = i++ });

        m.CustomSections.Clear();
        i = 0;
        foreach (var c in r.CustomSections)
            m.CustomSections.Add(new CustomSection { Title = c.Title.Trim(), Content = c.Content.Trim(), SortOrder = i++ });
    }

    public static List<SocialLinkDto> SocialLinks(IEnumerable<SocialLink> links) =>
        links.OrderBy(l => l.Platform)
            .Select(l => new SocialLinkDto { Platform = l.Platform, Url = l.Url })
            .ToList();

    private static List<SkillDto> Skills(ProfileMode m) =>
        m.Skills.OrderBy(x => x.SortOrder)
            .Select(x => new SkillDto { Name = x.Name, Category = x.Category, Level = x.Level }).ToList();

    private static List<WorkExperienceDto> Experiences(ProfileMode m) =>
        m.WorkExperiences.OrderBy(x => x.SortOrder).Select(x => new WorkExperienceDto
        {
            Title = x.Title, Company = x.Company, Location = x.Location, StartDate = x.StartDate,
            EndDate = x.EndDate, IsCurrent = x.IsCurrent, Description = x.Description,
            Responsibilities = x.Responsibilities
        }).ToList();

    private static List<EducationDto> Educations(ProfileMode m) =>
        m.Educations.OrderBy(x => x.SortOrder).Select(x => new EducationDto
        {
            Degree = x.Degree, Institution = x.Institution, FieldOfStudy = x.FieldOfStudy,
            StartYear = x.StartYear, EndYear = x.EndYear, Grade = x.Grade, Description = x.Description
        }).ToList();

    private static List<ProjectDto> Projects(ProfileMode m) =>
        m.Projects.OrderBy(x => x.SortOrder).Select(x => new ProjectDto
        {
            Title = x.Title, Role = x.Role, Description = x.Description, TechStack = x.TechStack,
            Outcome = x.Outcome, Url = x.Url
        }).ToList();

    private static List<AchievementDto> Achievements(ProfileMode m) =>
        m.Achievements.OrderBy(x => x.SortOrder)
            .Select(x => new AchievementDto { Title = x.Title, Description = x.Description, Date = x.Date }).ToList();

    private static List<CertificationDto> Certifications(ProfileMode m) =>
        m.Certifications.OrderBy(x => x.SortOrder).Select(x => new CertificationDto
        {
            Name = x.Name, Issuer = x.Issuer, IssueDate = x.IssueDate, CredentialUrl = x.CredentialUrl
        }).ToList();

    private static List<ServiceDto> Services(ProfileMode m) =>
        m.Services.OrderBy(x => x.SortOrder)
            .Select(x => new ServiceDto { Name = x.Name, Description = x.Description }).ToList();

    private static List<CustomSectionDto> CustomSections(ProfileMode m) =>
        m.CustomSections.OrderBy(x => x.SortOrder)
            .Select(x => new CustomSectionDto { Title = x.Title, Content = x.Content }).ToList();

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? Coalesce(params string?[] values) => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));

    private static IEnumerable<T> DistinctBy<T>(IEnumerable<T> items, Func<T, string> key) =>
        items.GroupBy(i => key(i).Trim().ToLowerInvariant()).Select(g => g.First());
}
