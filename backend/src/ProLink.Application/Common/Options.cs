namespace ProLink.Application.Common;

public sealed class AppOptions
{
    public const string SectionName = "App";

    /// <summary>Public origin used to build permanent profile URLs, e.g. https://prolink.id</summary>
    public string PublicBaseUrl { get; set; } = "http://localhost:5173";
    /// <summary>Origin of the frontend (used for password reset links).</summary>
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
    public string BrandName { get; set; } = "ProLink ID";
    /// <summary>Accounts registered with these emails receive the Admin role.</summary>
    public string[] AdminEmails { get; set; } = [];
    public int PasswordResetTokenMinutes { get; set; } = 60;
}

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "ProLink";
    public string Audience { get; set; } = "ProLink";
    public string SigningKey { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 1440;
}

public sealed class GoogleAuthOptions
{
    public const string SectionName = "GoogleAuth";

    public string ClientId { get; set; } = string.Empty;
}

public sealed class RazorpayOptions
{
    public const string SectionName = "Razorpay";

    public string KeyId { get; set; } = string.Empty;
    public string KeySecret { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    /// <summary>Additionally confirm payments via the Razorpay Payments API after signature verification.</summary>
    public bool VerifyPaymentViaApi { get; set; } = true;
}

public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromEmail { get; set; } = "no-reply@prolink.id";
    public string FromName { get; set; } = "ProLink ID";
}

public sealed class SubscriptionOptions
{
    public const string SectionName = "Subscription";

    /// <summary>
    /// When true, every user gets the highest plan's entitlements (all templates, top mode limit) and new purchases
    /// are paused. Existing subscriptions are untouched. Turn off to restore normal plan limits.
    /// </summary>
    public bool UnlockAllFeatures { get; set; }
}
