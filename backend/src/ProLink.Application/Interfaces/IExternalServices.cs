using ProLink.Domain.Entities;

namespace ProLink.Application.Interfaces;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateAccessToken(User user);
}

public sealed record GoogleUserInfo(string Subject, string Email, bool EmailVerified, string? Name, string? Picture);

public interface IGoogleTokenValidator
{
    /// <summary>Returns null when the token is invalid or not issued for this application.</summary>
    Task<GoogleUserInfo?> ValidateAsync(string idToken, CancellationToken ct = default);
}

public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default);
}

public sealed record RazorpayOrder(string Id, long Amount, string Currency);

public sealed record RazorpayPayment(string Id, string OrderId, long Amount, string Currency, string Status);

public interface IRazorpayClient
{
    string KeyId { get; }
    Task<RazorpayOrder> CreateOrderAsync(long amountInPaise, string currency, string receipt,
        IDictionary<string, string> notes, CancellationToken ct = default);
    Task<RazorpayPayment?> FetchPaymentAsync(string paymentId, CancellationToken ct = default);
    bool VerifyPaymentSignature(string orderId, string paymentId, string signature);
    bool VerifyWebhookSignature(string payload, string signature);
}

public interface IQrCodeGenerator
{
    byte[] GeneratePng(string content, int pixelsPerModule = 20);
    string GenerateSvg(string content);
}

public interface IFileStorage
{
    /// <summary>Saves the file and returns its public relative URL.</summary>
    Task<string> SaveAsync(Stream content, string folder, string extension, CancellationToken ct = default);
    Task DeleteAsync(string publicUrl, CancellationToken ct = default);
}
