using ProLink.Domain.Common;

namespace ProLink.Domain.Entities;

/// <summary>The owner's main profile, shared by all professional modes.</summary>
public class UserProfile : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string FullName { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string? Email { get; set; }
    public string? Mobile { get; set; }
    public string? Location { get; set; }
    public string? Website { get; set; }
    public string? Summary { get; set; }

    public ICollection<SocialLink> SocialLinks { get; set; } = new List<SocialLink>();
}
