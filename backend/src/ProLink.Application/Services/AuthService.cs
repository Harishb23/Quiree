using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;

namespace ProLink.Application.Services;

public sealed class AuthService(
    IUserRepository users,
    IUnitOfWork uow,
    IPasswordHasher<User> passwordHasher,
    ITokenService tokens,
    IGoogleTokenValidator googleValidator,
    IEmailSender emailSender,
    IOptions<AppOptions> appOptions,
    TimeProvider clock,
    ILogger<AuthService> logger) : IAuthService
{
    private readonly AppOptions _app = appOptions.Value;

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim();
        var normalized = Normalize(email);
        if (await users.GetByEmailAsync(normalized, ct) is not null)
            throw new ConflictException("An account with this email already exists.");

        string slug;
        if (!string.IsNullOrWhiteSpace(request.Username))
        {
            slug = request.Username.Trim().ToLowerInvariant();
            if (!SlugRules.IsValid(slug))
                throw new BusinessValidationException(
                    "Username must be 3-30 characters using lowercase letters, numbers and single hyphens.");
            if (await users.SlugExistsAsync(slug, ct))
                throw new ConflictException("This username is already taken.");
        }
        else
        {
            slug = await GenerateUniqueSlugAsync(request.FullName, ct);
        }

        var user = CreateUser(email, normalized, slug, request.FullName.Trim(), request.AccountType);
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        user.LastLoginAt = clock.GetUtcNow().UtcDateTime;
        users.Add(user);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Registered {AccountType} user {UserId} with slug {Slug}", user.AccountType, user.Id, slug);
        return BuildAuthResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await users.GetByEmailAsync(Normalize(request.Email), ct);
        if (user?.PasswordHash is null)
            throw new UnauthorizedAppException("Invalid email or password.");

        var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            throw new UnauthorizedAppException("Invalid email or password.");
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        user.LastLoginAt = clock.GetUtcNow().UtcDateTime;
        await uow.SaveChangesAsync(ct);

        var withProfile = await users.GetWithProfileAsync(user.Id, ct) ?? user;
        return BuildAuthResponse(withProfile);
    }

    public async Task<AuthResponse> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken ct = default)
    {
        var google = await googleValidator.ValidateAsync(request.IdToken, ct)
                     ?? throw new UnauthorizedAppException("Google sign-in failed. Please try again.");
        if (!google.EmailVerified)
            throw new UnauthorizedAppException("Your Google email address is not verified.");

        var user = await users.GetByGoogleSubjectAsync(google.Subject, ct);
        if (user is null)
        {
            var normalized = Normalize(google.Email);
            user = await users.GetByEmailAsync(normalized, ct);
            if (user is not null)
            {
                // Link Google to the existing (email-verified) account.
                user.GoogleSubject = google.Subject;
            }
            else
            {
                var name = string.IsNullOrWhiteSpace(google.Name) ? google.Email.Split('@')[0] : google.Name!;
                var slug = await GenerateUniqueSlugAsync(name, ct);
                user = CreateUser(google.Email, normalized, slug, name, request.AccountType);
                user.GoogleSubject = google.Subject;
                if (UrlRules.IsSafeHttpUrl(google.Picture ?? string.Empty))
                    user.Profile!.PhotoUrl = google.Picture;
                users.Add(user);
            }
        }

        user.LastLoginAt = clock.GetUtcNow().UtcDateTime;
        await uow.SaveChangesAsync(ct);

        var withProfile = await users.GetWithProfileAsync(user.Id, ct) ?? user;
        return BuildAuthResponse(withProfile);
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default)
    {
        // Always succeed silently so the endpoint cannot be used to discover registered emails.
        var user = await users.GetByEmailAsync(Normalize(request.Email), ct);
        if (user is null) return;

        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
        user.PasswordResetTokenHash = Hash(token);
        user.PasswordResetExpiresAt = clock.GetUtcNow().UtcDateTime.AddMinutes(_app.PasswordResetTokenMinutes);
        await uow.SaveChangesAsync(ct);

        var link = $"{_app.FrontendBaseUrl.TrimEnd('/')}/reset-password" +
                   $"?email={Uri.EscapeDataString(user.Email)}&token={Uri.EscapeDataString(token)}";
        var body = $"""
            <p>Hello,</p>
            <p>We received a request to reset your {_app.BrandName} password.</p>
            <p><a href="{link}">Reset your password</a></p>
            <p>This link expires in {_app.PasswordResetTokenMinutes} minutes. If you did not request this, you can ignore this email.</p>
            """;
        await emailSender.SendAsync(user.Email, $"Reset your {_app.BrandName} password", body, ct);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        var user = await users.GetByEmailAsync(Normalize(request.Email), ct);
        var now = clock.GetUtcNow().UtcDateTime;
        if (user?.PasswordResetTokenHash is null || user.PasswordResetExpiresAt is null
            || user.PasswordResetExpiresAt < now
            || !CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(user.PasswordResetTokenHash), Encoding.UTF8.GetBytes(Hash(request.Token))))
        {
            throw new BusinessValidationException("This password reset link is invalid or has expired.");
        }

        user.PasswordHash = passwordHasher.HashPassword(user, request.NewPassword);
        user.PasswordResetTokenHash = null;
        user.PasswordResetExpiresAt = null;
        user.UpdatedAt = now;
        await uow.SaveChangesAsync(ct);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("User not found.");
        if (user.PasswordHash is not null)
        {
            if (string.IsNullOrEmpty(request.CurrentPassword) ||
                passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword)
                == PasswordVerificationResult.Failed)
                throw new BusinessValidationException("Current password is incorrect.");
        }

        user.PasswordHash = passwordHasher.HashPassword(user, request.NewPassword);
        user.UpdatedAt = clock.GetUtcNow().UtcDateTime;
        await uow.SaveChangesAsync(ct);
    }

    public async Task<CurrentUserDto> GetCurrentUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.GetWithProfileAsync(userId, ct) ?? throw new NotFoundException("User not found.");
        return ToCurrentUser(user);
    }

    public async Task<UsernameAvailabilityDto> CheckUsernameAsync(string username, CancellationToken ct = default)
    {
        var slug = (username ?? string.Empty).Trim().ToLowerInvariant();
        if (!SlugRules.IsValid(slug))
            return new(slug, false, "Use 3-30 lowercase letters, numbers or single hyphens.");
        return await users.SlugExistsAsync(slug, ct)
            ? new(slug, false, "This username is already taken.")
            : new(slug, true, null);
    }

    private User CreateUser(string email, string normalizedEmail, string slug, string fullName, AccountType accountType)
    {
        var isAdmin = _app.AdminEmails.Any(a => Normalize(a) == normalizedEmail);
        var user = new User
        {
            Email = email,
            NormalizedEmail = normalizedEmail,
            PublicSlug = slug,
            Role = isAdmin ? UserRole.Admin : UserRole.User,
            AccountType = accountType
        };
        user.Profile = new UserProfile { UserId = user.Id, FullName = fullName };
        // The permanent URL is fixed at registration and never regenerated (the QR code encodes it).
        user.PublicSettings = new PublicProfileSettings
        {
            UserId = user.Id,
            PermanentUrl = BuildPermanentUrl(slug),
            QrReference = Convert.ToHexString(RandomNumberGenerator.GetBytes(8)).ToLowerInvariant(),
            QrGeneratedAt = clock.GetUtcNow().UtcDateTime,
            // Business accounts present themselves through business storefronts, not a personal /p/ page.
            IsPublic = accountType == AccountType.Personal
        };
        return user;
    }

    private string BuildPermanentUrl(string slug) => $"{_app.PublicBaseUrl.TrimEnd('/')}/p/{slug}";

    private async Task<string> GenerateUniqueSlugAsync(string seed, CancellationToken ct)
    {
        var baseSlug = SlugRules.FromText(seed);
        if (SlugRules.IsValid(baseSlug) && !await users.SlugExistsAsync(baseSlug, ct)) return baseSlug;

        for (var attempt = 0; attempt < 20; attempt++)
        {
            var candidate = $"{baseSlug}-{RandomNumberGenerator.GetInt32(100, 9999)}";
            if (SlugRules.IsValid(candidate) && !await users.SlugExistsAsync(candidate, ct)) return candidate;
        }

        return $"user-{Guid.NewGuid():N}"[..20];
    }

    private AuthResponse BuildAuthResponse(User user)
    {
        var (token, expiresAt) = tokens.CreateAccessToken(user);
        return new AuthResponse(token, expiresAt, ToCurrentUser(user));
    }

    private CurrentUserDto ToCurrentUser(User user) => new(
        user.Id,
        user.Email,
        user.Profile?.FullName ?? user.Email,
        user.Profile?.PhotoUrl,
        user.Role.ToString(),
        user.PublicSlug,
        user.PublicSettings?.PermanentUrl ?? BuildPermanentUrl(user.PublicSlug),
        user.PasswordHash is not null,
        user.GoogleSubject is not null,
        user.AccountType);

    private static string Normalize(string email) => email.Trim().ToUpperInvariant();

    private static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
