using ProLink.Domain.Common;
using ProLink.Domain.Enums;

namespace ProLink.Domain.Entities;

public class SubscriptionPlan
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    /// <summary>Price in the smallest currency unit (paise).</summary>
    public long PriceInPaise { get; set; }
    public string Currency { get; set; } = "INR";
    /// <summary>0 means the plan never expires (free plan).</summary>
    public int DurationDays { get; set; }
    public int MaxModes { get; set; }
    public bool AllowsPremiumTemplates { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public class Subscription : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public int PlanId { get; set; }
    public SubscriptionPlan? Plan { get; set; }
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Pending;
    public DateTime? StartsAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class Payment : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public int PlanId { get; set; }
    public SubscriptionPlan? Plan { get; set; }
    public Guid? SubscriptionId { get; set; }
    public Subscription? Subscription { get; set; }

    public string RazorpayOrderId { get; set; } = string.Empty;
    public string? RazorpayPaymentId { get; set; }
    public string? RazorpaySignature { get; set; }
    public long AmountInPaise { get; set; }
    public string Currency { get; set; } = "INR";
    public PaymentStatus Status { get; set; } = PaymentStatus.Created;
    public string? FailureReason { get; set; }
    public DateTime? PaidAt { get; set; }
}

public class Enquiry : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public EnquiryStatus Status { get; set; } = EnquiryStatus.New;
}
