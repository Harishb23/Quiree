using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using ProLink.Application.Common;
using ProLink.Application.DTOs;

namespace ProLink.Application.Services.Businesses;

/// <summary>
/// Turns request metadata into an anonymous visitor id. The id is an HMAC of business + date + IP + user agent,
/// keyed with a server secret, so it can't be reversed, changes every day and differs per business.
/// Raw IPs and user agents are never stored.
/// </summary>
public sealed partial class VisitorHasher(IOptions<JwtOptions> jwt, TimeProvider clock)
{
    [GeneratedRegex(@"bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python-requests|httpclient|okhttp|java/|go-http|headless|lighthouse|pingdom|uptime|monitor",
        RegexOptions.IgnoreCase)]
    private static partial Regex BotPattern();

    /// <summary>Link-preview fetchers, crawlers, scripts and empty user agents are not counted as visitors.</summary>
    public static bool IsAutomated(string? userAgent) => string.IsNullOrWhiteSpace(userAgent) || BotPattern().IsMatch(userAgent);

    public string Hash(Guid businessId, VisitorContext visitor)
    {
        var day = clock.GetUtcNow().UtcDateTime.ToString("yyyyMMdd");
        var material = $"{businessId:N}|{day}|{visitor.IpAddress}|{visitor.UserAgent}";
        var key = Encoding.UTF8.GetBytes(jwt.Value.SigningKey + "|business-analytics");
        return Convert.ToHexString(HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(material))).ToLowerInvariant();
    }
}
