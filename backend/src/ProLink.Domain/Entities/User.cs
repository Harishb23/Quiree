using ProLink.Domain.Common;
using ProLink.Domain.Enums;

namespace ProLink.Domain.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string NormalizedEmail { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public string? GoogleSubject { get; set; }
    public UserRole Role { get; set; } = UserRole.User;

    /// <summary>Permanent, immutable public identifier used in /p/{PublicSlug}.</summary>
    public string PublicSlug { get; set; } = string.Empty;

    public string? PasswordResetTokenHash { get; set; }
    public DateTime? PasswordResetExpiresAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public UserProfile? Profile { get; set; }
    public PublicProfileSettings? PublicSettings { get; set; }
    public ICollection<ProfileMode> Modes { get; set; } = new List<ProfileMode>();
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
