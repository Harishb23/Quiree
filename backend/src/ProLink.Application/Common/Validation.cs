using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace ProLink.Application.Common;

/// <summary>Skips HTML stripping for the decorated property (e.g. passwords).</summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class NoSanitizeAttribute : Attribute;

/// <summary>Accepts empty values or absolute http/https URLs only (blocks javascript:, data:, etc).</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class SafeUrlAttribute : ValidationAttribute
{
    public SafeUrlAttribute() : base("{0} must be a valid http or https URL.") { }

    public override bool IsValid(object? value) =>
        value is null || value is string s && (string.IsNullOrWhiteSpace(s) || UrlRules.IsSafeHttpUrl(s));
}

public static class UrlRules
{
    public static bool IsSafeHttpUrl(string value) =>
        Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
        && !string.IsNullOrEmpty(uri.Host);
}

public static partial class SlugRules
{
    public const int MinLength = 3;
    public const int MaxLength = 30;

    private static readonly HashSet<string> Reserved = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin", "api", "app", "dashboard", "login", "register", "signup", "logout", "settings",
        "about", "pricing", "features", "contact", "help", "support", "p", "q", "www", "static",
        "uploads", "assets", "icons", "prolink", "root", "system", "null", "undefined",
        "business", "businesses", "bq"
    };

    [GeneratedRegex("^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")]
    private static partial Regex SlugPattern();

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonSlugChars();

    public static bool IsValid(string slug) =>
        slug.Length is >= MinLength and <= MaxLength
        && SlugPattern().IsMatch(slug)
        && !slug.Contains("--")
        && !Reserved.Contains(slug);

    public static string FromText(string text)
    {
        var slug = NonSlugChars().Replace(text.ToLowerInvariant(), "-").Trim('-');
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        if (slug.Length > MaxLength - 5) slug = slug[..(MaxLength - 5)].Trim('-');
        if (slug.Length < MinLength) slug = $"user-{slug}".Trim('-');
        return slug;
    }
}
