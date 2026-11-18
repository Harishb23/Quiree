using System.ComponentModel.DataAnnotations;
using ProLink.Domain.Enums;

namespace ProLink.Application.DTOs;

// ---------- Templates ----------

public sealed record TemplateDto(
    int Id,
    string Key,
    string Name,
    string Description,
    bool IsPremium,
    bool IsLocked);

public sealed class AssignTemplateRequest
{
    [Range(1, int.MaxValue)]
    public int TemplateId { get; set; }
}

// ---------- Subscription ----------

public sealed record PlanDto(
    int Id,
    string Code,
    string Name,
    string Description,
    long PriceInPaise,
    string Currency,
    int DurationDays,
    int MaxModes,
    bool AllowsPremiumTemplates);

public sealed record EntitlementsDto(
    string PlanCode,
    string PlanName,
    int MaxModes,
    bool AllowsPremiumTemplates,
    bool IsPaid,
    DateTime? ExpiresAt,
    bool AllFeaturesUnlocked = false);

public sealed record SubscriptionStatusDto(
    EntitlementsDto Entitlements,
    Guid? SubscriptionId,
    SubscriptionStatus? Status,
    DateTime? StartsAt,
    DateTime? ExpiresAt,
    int? DaysRemaining);

public sealed class CreateOrderRequest
{
    [Range(1, int.MaxValue)]
    public int PlanId { get; set; }
}

public sealed record CreateOrderResponse(
    string OrderId,
    long Amount,
    string Currency,
    string KeyId,
    string PlanName,
    string CustomerName,
    string CustomerEmail);

public sealed class VerifyPaymentRequest
{
    [Required, StringLength(100)]
    public string RazorpayOrderId { get; set; } = string.Empty;

    [Required, StringLength(100)]
    public string RazorpayPaymentId { get; set; } = string.Empty;

    [Required, StringLength(200)]
    public string RazorpaySignature { get; set; } = string.Empty;
}

public sealed record PaymentDto(
    Guid Id,
    string PlanName,
    long AmountInPaise,
    string Currency,
    PaymentStatus Status,
    string RazorpayOrderId,
    string? RazorpayPaymentId,
    DateTime CreatedAt,
    DateTime? PaidAt);

// ---------- Enquiry ----------

public sealed class CreateEnquiryRequest
{
    [Required, StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [Phone, StringLength(30)]
    public string? Phone { get; set; }

    [Required, StringLength(150, MinimumLength = 3)]
    public string Subject { get; set; } = string.Empty;

    [Required, StringLength(3000, MinimumLength = 10)]
    public string Message { get; set; } = string.Empty;
}

public sealed record EnquiryDto(
    Guid Id,
    string Name,
    string Email,
    string? Phone,
    string Subject,
    string Message,
    EnquiryStatus Status,
    DateTime CreatedAt);

// ---------- Dashboard / Account ----------

public sealed record DashboardOverviewDto(
    int TotalModes,
    int PublishedModes,
    string? ActiveModeName,
    Guid? ActiveModeId,
    string? SelectedTemplateName,
    string QrStatus,
    string PublicUrl,
    bool IsPublic,
    EntitlementsDto Subscription,
    int ProfileCompletion);

public sealed class UpdatePublicSettingsRequest
{
    public bool IsPublic { get; set; }
    public bool AllowViewerModeSelection { get; set; }
}

public sealed record PublicSettingsDto(bool IsPublic, bool AllowViewerModeSelection, string PermanentUrl);
