using System.ComponentModel.DataAnnotations;
using ProLink.Application.Common;

namespace ProLink.Application.DTOs;

public sealed class RegisterRequest
{
    [Required, StringLength(100, MinimumLength = 2)]
    public string FullName { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters.")]
    [RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d).+$", ErrorMessage = "Password must contain at least one letter and one number.")]
    [NoSanitize]
    public string Password { get; set; } = string.Empty;

    /// <summary>Optional permanent username for the public URL. Generated when omitted.</summary>
    [StringLength(SlugRules.MaxLength)]
    public string? Username { get; set; }
}

public sealed class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, NoSanitize]
    public string Password { get; set; } = string.Empty;
}

public sealed class GoogleLoginRequest
{
    /// <summary>The ID token (credential) returned by Google Identity Services.</summary>
    [Required, NoSanitize]
    public string IdToken { get; set; } = string.Empty;
}

public sealed class ForgotPasswordRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public sealed class ResetPasswordRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, NoSanitize]
    public string Token { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters.")]
    [RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d).+$", ErrorMessage = "Password must contain at least one letter and one number.")]
    [NoSanitize]
    public string NewPassword { get; set; } = string.Empty;
}

public sealed class ChangePasswordRequest
{
    [NoSanitize]
    public string? CurrentPassword { get; set; }

    [Required, StringLength(128, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters.")]
    [RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d).+$", ErrorMessage = "Password must contain at least one letter and one number.")]
    [NoSanitize]
    public string NewPassword { get; set; } = string.Empty;
}

public sealed record CurrentUserDto(
    Guid Id,
    string Email,
    string FullName,
    string? PhotoUrl,
    string Role,
    string PublicSlug,
    string PublicUrl,
    bool HasPassword,
    bool HasGoogle);

public sealed record AuthResponse(string AccessToken, DateTime ExpiresAt, CurrentUserDto User);

public sealed record UsernameAvailabilityDto(string Username, bool Available, string? Reason);
