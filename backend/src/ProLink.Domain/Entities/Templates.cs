using ProLink.Domain.Common;

namespace ProLink.Domain.Entities;

public class ProfileTemplate
{
    public int Id { get; set; }
    /// <summary>Stable key used by the frontend renderer, e.g. "modern-glass".</summary>
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsPremium { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public class ModeTemplateMapping : BaseEntity
{
    public Guid ProfileModeId { get; set; }
    public ProfileMode? ProfileMode { get; set; }
    public int TemplateId { get; set; }
    public ProfileTemplate? Template { get; set; }
}

public class PublicProfileSettings : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public bool IsPublic { get; set; } = true;
    /// <summary>Lets viewers pick one or more modes ("Your Choice Mode").</summary>
    public bool AllowViewerModeSelection { get; set; } = true;
    /// <summary>Permanent public URL the QR code encodes. Set once and never regenerated.</summary>
    public string PermanentUrl { get; set; } = string.Empty;
    /// <summary>Stable QR reference id (also immutable).</summary>
    public string QrReference { get; set; } = string.Empty;
    public DateTime QrGeneratedAt { get; set; } = DateTime.UtcNow;
}
