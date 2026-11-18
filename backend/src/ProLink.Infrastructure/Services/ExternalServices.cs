using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Mail;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Google.Apis.Auth;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using ProLink.Application.Common;
using ProLink.Application.Interfaces;
using ProLink.Domain.Entities;
using QRCoder;

namespace ProLink.Infrastructure.Services;

public sealed class JwtTokenService(IOptions<JwtOptions> options, TimeProvider clock) : ITokenService
{
    public const string SlugClaim = "slug";
    public const string AccountTypeClaim = "acct";

    public (string Token, DateTime ExpiresAt) CreateAccessToken(User user)
    {
        var o = options.Value;
        var now = clock.GetUtcNow().UtcDateTime;
        var expires = now.AddMinutes(o.ExpiryMinutes);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(SlugClaim, user.PublicSlug),
            new Claim(AccountTypeClaim, user.AccountType.ToString())
        };
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(o.SigningKey)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(o.Issuer, o.Audience, claims, now, expires, credentials);
        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}

public sealed class GoogleTokenValidator(IOptions<GoogleAuthOptions> options, ILogger<GoogleTokenValidator> logger)
    : IGoogleTokenValidator
{
    public async Task<GoogleUserInfo?> ValidateAsync(string idToken, CancellationToken ct = default)
    {
        var clientId = options.Value.ClientId;
        if (string.IsNullOrWhiteSpace(clientId))
        {
            logger.LogWarning("Google sign-in attempted but GoogleAuth:ClientId is not configured.");
            return null;
        }

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId] });
            return new GoogleUserInfo(payload.Subject, payload.Email, payload.EmailVerified, payload.Name, payload.Picture);
        }
        catch (InvalidJwtException ex)
        {
            logger.LogWarning(ex, "Rejected Google ID token");
            return null;
        }
    }
}

/// <summary>Sends email over SMTP; when SMTP is not configured (local development) the message is logged instead.</summary>
public sealed class SmtpEmailSender(IOptions<SmtpOptions> options, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
    {
        var o = options.Value;
        if (string.IsNullOrWhiteSpace(o.Host))
        {
            logger.LogWarning("SMTP not configured. Email to {To} | {Subject}\n{Body}", toEmail, subject, htmlBody);
            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(o.FromEmail, o.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        message.To.Add(toEmail);
        using var client = new SmtpClient(o.Host, o.Port)
        {
            EnableSsl = o.EnableSsl,
            Credentials = string.IsNullOrEmpty(o.UserName) ? null : new NetworkCredential(o.UserName, o.Password)
        };
        await client.SendMailAsync(message, ct);
    }
}

public sealed class RazorpayClient(HttpClient http, IOptions<RazorpayOptions> options, ILogger<RazorpayClient> logger)
    : IRazorpayClient
{
    private readonly RazorpayOptions _o = options.Value;

    public string KeyId => _o.KeyId;

    public async Task<RazorpayOrder> CreateOrderAsync(long amountInPaise, string currency, string receipt,
        IDictionary<string, string> notes, CancellationToken ct = default)
    {
        EnsureConfigured();
        using var request = new HttpRequestMessage(HttpMethod.Post, "orders")
        {
            Content = JsonContent.Create(new { amount = amountInPaise, currency, receipt, notes })
        };
        Authorize(request);
        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Razorpay order creation failed: {Status} {Body}", response.StatusCode,
                await response.Content.ReadAsStringAsync(ct));
            throw new BusinessValidationException("Unable to start the payment right now. Please try again.");
        }

        var order = await response.Content.ReadFromJsonAsync<OrderResponse>(cancellationToken: ct)
                    ?? throw new BusinessValidationException("Invalid response from payment gateway.");
        return new RazorpayOrder(order.Id, order.Amount, order.Currency);
    }

    public async Task<RazorpayPayment?> FetchPaymentAsync(string paymentId, CancellationToken ct = default)
    {
        EnsureConfigured();
        using var request = new HttpRequestMessage(HttpMethod.Get, $"payments/{Uri.EscapeDataString(paymentId)}");
        Authorize(request);
        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode) return null;
        var p = await response.Content.ReadFromJsonAsync<PaymentResponse>(cancellationToken: ct);
        return p is null ? null : new RazorpayPayment(p.Id, p.OrderId ?? "", p.Amount, p.Currency, p.Status);
    }

    public bool VerifyPaymentSignature(string orderId, string paymentId, string signature) =>
        !string.IsNullOrEmpty(_o.KeySecret) && SignatureMatches($"{orderId}|{paymentId}", _o.KeySecret, signature);

    public bool VerifyWebhookSignature(string payload, string signature) =>
        !string.IsNullOrEmpty(_o.WebhookSecret) && SignatureMatches(payload, _o.WebhookSecret, signature);

    public static string ComputeSignature(string payload, string secret) =>
        Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(payload)))
            .ToLowerInvariant();

    private static bool SignatureMatches(string payload, string secret, string signature) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(ComputeSignature(payload, secret)),
            Encoding.UTF8.GetBytes(signature.Trim().ToLowerInvariant()));

    private void Authorize(HttpRequestMessage request) =>
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_o.KeyId}:{_o.KeySecret}")));

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_o.KeyId) || string.IsNullOrWhiteSpace(_o.KeySecret))
            throw new BusinessValidationException("Online payments are not configured yet. Please contact support.");
    }

    private sealed record OrderResponse(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("amount")] long Amount,
        [property: JsonPropertyName("currency")] string Currency);

    private sealed record PaymentResponse(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("order_id")] string? OrderId,
        [property: JsonPropertyName("amount")] long Amount,
        [property: JsonPropertyName("currency")] string Currency,
        [property: JsonPropertyName("status")] string Status);
}

public sealed class QrCodeGeneratorService : IQrCodeGenerator
{
    private static readonly byte[] Dark = [0x1B, 0x13, 0x40, 0xFF];
    private static readonly byte[] Light = [0xFF, 0xFF, 0xFF, 0xFF];

    public byte[] GeneratePng(string content, int pixelsPerModule = 20)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);
        return new PngByteQRCode(data).GetGraphic(pixelsPerModule, Dark, Light);
    }

    public byte[] GeneratePng(string content, int pixelsPerModule, string darkHex, string lightHex)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);
        return new PngByteQRCode(data).GetGraphic(pixelsPerModule, Rgba(darkHex), Rgba(lightHex));
    }

    private static byte[] Rgba(string hex) =>
        [Convert.ToByte(hex.Substring(1, 2), 16), Convert.ToByte(hex.Substring(3, 2), 16), Convert.ToByte(hex.Substring(5, 2), 16), 0xFF];

    public string GenerateSvg(string content)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);
        return new SvgQRCode(data).GetGraphic(10, "#1b1340", "#ffffff");
    }
}

public sealed class StorageOptions
{
    /// <summary>Absolute path of the folder served at /uploads.</summary>
    public string RootPath { get; set; } = string.Empty;
}

public sealed class LocalFileStorage(IOptions<StorageOptions> options) : IFileStorage
{
    private static readonly HashSet<string> AllowedExtensions = [".jpg", ".png", ".webp"];

    public async Task<string> SaveAsync(Stream content, string folder, string extension, CancellationToken ct = default)
    {
        if (!AllowedExtensions.Contains(extension)) throw new BusinessValidationException("Unsupported file type.");
        if (folder.Any(c => !char.IsLetterOrDigit(c))) throw new ArgumentException("Invalid folder", nameof(folder));

        var directory = Path.Combine(options.Value.RootPath, folder);
        Directory.CreateDirectory(directory);
        var fileName = $"{Guid.NewGuid():N}{extension}";
        await using (var file = File.Create(Path.Combine(directory, fileName)))
            await content.CopyToAsync(file, ct);
        return $"/uploads/{folder}/{fileName}";
    }

    public Task DeleteAsync(string publicUrl, CancellationToken ct = default)
    {
        const string prefix = "/uploads/";
        if (!publicUrl.StartsWith(prefix, StringComparison.Ordinal)) return Task.CompletedTask;

        var root = Path.GetFullPath(options.Value.RootPath);
        var fullPath = Path.GetFullPath(Path.Combine(root, publicUrl[prefix.Length..]));
        // Guard against path traversal.
        if (fullPath.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) && File.Exists(fullPath))
            File.Delete(fullPath);
        return Task.CompletedTask;
    }
}
