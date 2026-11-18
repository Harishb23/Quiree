using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using ProLink.Application.Common;
using ProLink.Application.Interfaces;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;

namespace ProLink.Application.Services.Businesses;

/// <summary>
/// Single place where business ownership and team roles are enforced. Callers without any access get a 404
/// (so business ids can't be probed); members whose role is too low get a 403.
/// </summary>
public sealed class BusinessAccessGuard(IBusinessRepository businesses)
{
    public async Task<BusinessAccess> RequireAsync(Guid userId, Guid businessId, BusinessRole minimumRole, CancellationToken ct)
    {
        var access = await businesses.GetAccessAsync(businessId, userId, ct)
                     ?? throw new NotFoundException("Business not found.");
        if (access.Role > minimumRole)
            throw new ForbiddenException(minimumRole switch
            {
                BusinessRole.Owner => "Only the business owner can do this.",
                BusinessRole.Manager => "Only the owner or a manager can do this.",
                _ => "You do not have permission to perform this action."
            });
        return access;
    }
}

public static class BusinessTime
{
    public const string DefaultZone = "Asia/Kolkata";

    public static bool IsValid(string? id) => !string.IsNullOrWhiteSpace(id) && TimeZoneInfo.TryFindSystemTimeZoneById(id, out _);

    public static TimeZoneInfo Resolve(string? id) =>
        id is not null && TimeZoneInfo.TryFindSystemTimeZoneById(id, out var tz) ? tz : TimeZoneInfo.Utc;

    public static DateTime ToLocal(DateTime utc, string zone) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Resolve(zone));

    public static DateOnly Today(string zone, DateTime utcNow) => DateOnly.FromDateTime(ToLocal(utcNow, zone));

    /// <summary>UTC instant at which the given local date starts in the zone.</summary>
    public static DateTime StartOfDayUtc(DateOnly date, string zone)
    {
        var local = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(local, Resolve(zone));
    }

    public static TimeOnly? ParseTime(string? value) =>
        TimeOnly.TryParseExact(value, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var t) ? t : null;

    public static string? FormatTime(TimeOnly? value) => value?.ToString("HH:mm", CultureInfo.InvariantCulture);
}

public static partial class BusinessSlug
{
    public const int MinLength = 3;
    public const int MaxLength = 60;

    private static readonly HashSet<string> Reserved = new(StringComparer.OrdinalIgnoreCase)
    {
        "new", "edit", "create", "admin", "api", "qr", "preview", "dashboard", "settings", "search",
        "products", "services", "offers", "gallery", "null", "undefined"
    };

    [GeneratedRegex("^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")]
    private static partial Regex Pattern();

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonSlugChars();

    public static bool IsValid(string slug) =>
        slug.Length is >= MinLength and <= MaxLength && Pattern().IsMatch(slug) && !slug.Contains("--") && !Reserved.Contains(slug);

    public static string FromName(string name)
    {
        var slug = NonSlugChars().Replace(name.ToLowerInvariant(), "-").Trim('-');
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        if (slug.Length > MaxLength - 4) slug = slug[..(MaxLength - 4)].Trim('-');
        if (slug.Length < MinLength || Reserved.Contains(slug)) slug = $"shop-{slug}".Trim('-');
        return slug;
    }
}

public static class QrCodes
{
    private const string Alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    /// <summary>Unguessable, URL-safe code. Look-alike characters (0/O, 1/l/I) are excluded.</summary>
    public static string New() => RandomNumberGenerator.GetString(Alphabet, 10);

    public static bool LooksValid(string code) => code.Length == 10 && code.All(Alphabet.Contains);
}

/// <summary>Validated, size-limited image uploads (checked by file signature, not by name or content type).</summary>
public static class ImageUpload
{
    public const long MaxBytes = 5 * 1024 * 1024;
    public const string Folder = "business";

    public static async Task<(MemoryStream Buffer, string Extension)> ReadAsync(Stream content, long length, CancellationToken ct)
    {
        if (length <= 0) throw new BusinessValidationException("Please choose an image to upload.");
        if (length > MaxBytes) throw new BusinessValidationException("Images must be 5 MB or smaller.");

        var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, ct);
        if (buffer.Length > MaxBytes) throw new BusinessValidationException("Images must be 5 MB or smaller.");
        var extension = ImageSignature.Detect(buffer.GetBuffer().AsSpan(0, (int)buffer.Length))
                        ?? throw new BusinessValidationException("Only JPG, PNG or WEBP images are allowed.");
        buffer.Position = 0;
        return (buffer, extension);
    }

    public static async Task<string> SaveAsync(IFileStorage storage, Stream content, long length, CancellationToken ct)
    {
        var (buffer, extension) = await ReadAsync(content, length, ct);
        await using (buffer) return await storage.SaveAsync(buffer, Folder, extension, ct);
    }

    /// <summary>Deletes previously uploaded files; failures never break the request.</summary>
    public static async Task DeleteQuietlyAsync(IFileStorage storage, IEnumerable<string?> urls)
    {
        foreach (var url in urls)
        {
            if (string.IsNullOrEmpty(url) || !url.StartsWith("/uploads/", StringComparison.Ordinal)) continue;
            try { await storage.DeleteAsync(url); }
            catch { /* orphaned file is harmless; never fail the user's action over cleanup */ }
        }
    }
}

/// <summary>Validates and normalises category-specific product attributes against the category's definitions.</summary>
public static partial class ProductAttributes
{
    [GeneratedRegex("<[^>]*>")]
    private static partial Regex HtmlTag();

    public static Dictionary<string, string> Normalize(IReadOnlyDictionary<string, string> input,
        IReadOnlyList<BusinessCategoryAttribute> definitions)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        var errors = new List<string>();

        foreach (var def in definitions.OrderBy(d => d.SortOrder))
        {
            // Unknown keys (e.g. left over after a category change) are dropped rather than rejected.
            input.TryGetValue(def.Key, out var raw);
            var value = HtmlTag().Replace(raw ?? string.Empty, string.Empty).Trim();
            if (value.Length == 0)
            {
                if (def.IsRequired) errors.Add($"{def.Label} is required.");
                continue;
            }

            var options = Options(def);
            switch (def.InputType)
            {
                case AttributeInputType.Number:
                    if (!decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var n) || n < 0)
                        errors.Add($"{def.Label} must be a number.");
                    else result[def.Key] = n.ToString(CultureInfo.InvariantCulture);
                    break;
                case AttributeInputType.Boolean:
                    if (!bool.TryParse(value, out var b)) errors.Add($"{def.Label} must be yes or no.");
                    else result[def.Key] = b ? "true" : "false";
                    break;
                case AttributeInputType.Select:
                    var match = options.FirstOrDefault(o => o.Equals(value, StringComparison.OrdinalIgnoreCase));
                    if (match is null) errors.Add($"{def.Label}: choose one of the listed options.");
                    else result[def.Key] = match;
                    break;
                case AttributeInputType.MultiSelect:
                    var picked = value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    var matches = picked.Select(p => options.FirstOrDefault(o => o.Equals(p, StringComparison.OrdinalIgnoreCase))).ToList();
                    if (matches.Any(m => m is null)) errors.Add($"{def.Label}: choose from the listed options.");
                    else result[def.Key] = string.Join(",", options.Where(o => matches.Contains(o)));
                    break;
                default:
                    if (value.Length > 200) errors.Add($"{def.Label} must be 200 characters or fewer.");
                    else result[def.Key] = value;
                    break;
            }
        }

        if (errors.Count > 0) throw new BusinessValidationException(string.Join(" ", errors));
        return result;
    }

    public static IReadOnlyList<string> Options(BusinessCategoryAttribute def) =>
        string.IsNullOrEmpty(def.Options) ? [] : def.Options.Split('|', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

    public static string Serialize(Dictionary<string, string> values) => JsonSerializer.Serialize(values);

    public static Dictionary<string, string> Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? []; }
        catch (JsonException) { return []; }
    }
}

public static class BusinessUrls
{
    public static string Public(string baseUrl, string slug) => $"{baseUrl.TrimEnd('/')}/business/{slug}";
    public static string Qr(string baseUrl, string code) => $"{baseUrl.TrimEnd('/')}/bq/{code}";
}

public static class Text
{
    public static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public static class BusinessCompletion
{
    public static (int Percent, List<string> Missing) Calculate(Business b, int products, int services, int gallery)
    {
        var checks = new (bool Done, string Label)[]
        {
            (!string.IsNullOrWhiteSpace(b.LogoUrl), "Business logo"),
            (!string.IsNullOrWhiteSpace(b.CoverUrl), "Cover image"),
            (!string.IsNullOrWhiteSpace(b.Description), "Business description"),
            (!string.IsNullOrWhiteSpace(b.Phone) || !string.IsNullOrWhiteSpace(b.WhatsApp), "Phone or WhatsApp"),
            (!string.IsNullOrWhiteSpace(b.AddressLine1) && !string.IsNullOrWhiteSpace(b.City), "Address"),
            (b.WorkingHours.Count > 0, "Opening hours"),
            (!string.IsNullOrWhiteSpace(b.Website) || b.SocialLinks.Count > 0, "Website or social links"),
            (products + services > 0, "At least one product or service"),
            (gallery > 0, "Gallery photos"),
            (b.Status == BusinessStatus.Published, "Publish your profile")
        };
        var done = checks.Count(c => c.Done);
        return ((int)Math.Round(done * 100.0 / checks.Length), checks.Where(c => !c.Done).Select(c => c.Label).ToList());
    }

    /// <summary>Minimum information a customer needs before a profile can go public.</summary>
    public static void EnsurePublishable(Business b)
    {
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(b.Phone) && string.IsNullOrWhiteSpace(b.WhatsApp) && string.IsNullOrWhiteSpace(b.Email))
            missing.Add("a phone, WhatsApp or email contact");
        if (string.IsNullOrWhiteSpace(b.City)) missing.Add("a city");
        if (missing.Count > 0)
            throw new BusinessValidationException($"Add {string.Join(" and ", missing)} before publishing.");
    }
}
