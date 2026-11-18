using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;

namespace ProLink.Application.Services;

public sealed class SubscriptionService(
    ISubscriptionRepository subscriptions,
    IPaymentRepository payments,
    IUserRepository users,
    IRazorpayClient razorpay,
    IUnitOfWork uow,
    IOptions<RazorpayOptions> razorpayOptions,
    IOptions<SubscriptionOptions> subscriptionOptions,
    TimeProvider clock,
    ILogger<SubscriptionService> logger) : ISubscriptionService
{
    public const string FreePlanCode = "free";

    public async Task<IReadOnlyList<PlanDto>> ListPlansAsync(CancellationToken ct = default) =>
        (await subscriptions.ListPlansAsync(ct)).Select(ToDto).ToList();

    public async Task<EntitlementsDto> GetEntitlementsAsync(Guid userId, CancellationToken ct = default)
    {
        var entitlements = await PlanEntitlementsAsync(userId, ct);
        if (!subscriptionOptions.Value.UnlockAllFeatures) return entitlements;

        // Promotional unlock: everyone gets the best limits of any active plan. The plan name / paid status stay
        // truthful so existing subscribers still see their real subscription.
        var plans = await subscriptions.ListPlansAsync(ct);
        var maxModes = plans.Count > 0 ? Math.Max(entitlements.MaxModes, plans.Max(p => p.MaxModes)) : entitlements.MaxModes;
        return entitlements with { MaxModes = maxModes, AllowsPremiumTemplates = true, AllFeaturesUnlocked = true };
    }

    private async Task<EntitlementsDto> PlanEntitlementsAsync(Guid userId, CancellationToken ct)
    {
        var current = await subscriptions.GetCurrentAsync(userId, Now, ct);
        if (current?.Plan is { } plan)
            return new EntitlementsDto(plan.Code, plan.Name, plan.MaxModes, plan.AllowsPremiumTemplates, true, current.ExpiresAt);

        var free = await subscriptions.GetFreePlanAsync(ct);
        return free is null
            ? new EntitlementsDto(FreePlanCode, "Free", 2, false, false, null)
            : new EntitlementsDto(free.Code, free.Name, free.MaxModes, free.AllowsPremiumTemplates, false, null);
    }

    public async Task<SubscriptionStatusDto> GetStatusAsync(Guid userId, CancellationToken ct = default)
    {
        var entitlements = await GetEntitlementsAsync(userId, ct);
        var current = await subscriptions.GetCurrentAsync(userId, Now, ct);
        int? daysRemaining = current?.ExpiresAt is { } exp ? Math.Max(0, (int)Math.Ceiling((exp - Now).TotalDays)) : null;
        return new SubscriptionStatusDto(entitlements, current?.Id, current?.Status, current?.StartsAt,
            current?.ExpiresAt, daysRemaining);
    }

    public async Task<CreateOrderResponse> CreateOrderAsync(Guid userId, CreateOrderRequest request,
        CancellationToken ct = default)
    {
        // Nobody should pay for features that are currently free for everyone.
        if (subscriptionOptions.Value.UnlockAllFeatures)
            throw new BusinessValidationException("All features are currently free for everyone, so there's nothing to buy right now.");

        var plan = await subscriptions.GetPlanAsync(request.PlanId, ct);
        if (plan is null || !plan.IsActive) throw new NotFoundException("Plan not found.");
        if (plan.PriceInPaise <= 0) throw new BusinessValidationException("The free plan does not require payment.");

        var user = await users.GetWithProfileAsync(userId, ct) ?? throw new NotFoundException("User not found.");

        // Amount always comes from the server-side plan, never from the client.
        var receipt = $"rcpt_{Guid.NewGuid():N}"[..30];
        var order = await razorpay.CreateOrderAsync(plan.PriceInPaise, plan.Currency, receipt,
            new Dictionary<string, string> { ["userId"] = userId.ToString(), ["planCode"] = plan.Code }, ct);

        payments.Add(new Payment
        {
            UserId = userId,
            PlanId = plan.Id,
            RazorpayOrderId = order.Id,
            AmountInPaise = plan.PriceInPaise,
            Currency = plan.Currency,
            Status = PaymentStatus.Created
        });
        await uow.SaveChangesAsync(ct);

        return new CreateOrderResponse(order.Id, plan.PriceInPaise, plan.Currency, razorpay.KeyId, plan.Name,
            user.Profile?.FullName ?? user.Email, user.Email);
    }

    public async Task<SubscriptionStatusDto> VerifyPaymentAsync(Guid userId, VerifyPaymentRequest request,
        CancellationToken ct = default)
    {
        var payment = await payments.GetByOrderIdAsync(request.RazorpayOrderId, ct);
        if (payment is null || payment.UserId != userId) throw new NotFoundException("Payment order not found.");

        if (payment.Status == PaymentStatus.Captured) return await GetStatusAsync(userId, ct);

        if (!razorpay.VerifyPaymentSignature(request.RazorpayOrderId, request.RazorpayPaymentId, request.RazorpaySignature))
        {
            await MarkFailedAsync(payment, "Signature verification failed.", ct);
            throw new BusinessValidationException("Payment verification failed. If money was deducted it will be refunded automatically.");
        }

        if (razorpayOptions.Value.VerifyPaymentViaApi)
        {
            var remote = await razorpay.FetchPaymentAsync(request.RazorpayPaymentId, ct);
            if (remote is null || remote.OrderId != payment.RazorpayOrderId || remote.Amount != payment.AmountInPaise
                || remote.Status is not ("captured" or "authorized"))
            {
                await MarkFailedAsync(payment, $"Gateway status mismatch ({remote?.Status ?? "not found"}).", ct);
                throw new BusinessValidationException("Payment could not be confirmed with the payment gateway.");
            }
        }

        payment.RazorpaySignature = request.RazorpaySignature;
        await ActivateAsync(payment, request.RazorpayPaymentId, ct);
        return await GetStatusAsync(userId, ct);
    }

    public async Task HandleWebhookAsync(string payload, string signature, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(signature) || !razorpay.VerifyWebhookSignature(payload, signature))
            throw new UnauthorizedAppException("Invalid webhook signature.");

        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;
        var eventName = root.GetProperty("event").GetString();
        if (!root.TryGetProperty("payload", out var body) || !body.TryGetProperty("payment", out var paymentNode))
            return;

        var entity = paymentNode.GetProperty("entity");
        var paymentId = entity.GetProperty("id").GetString();
        var orderId = entity.TryGetProperty("order_id", out var o) ? o.GetString() : null;
        if (orderId is null || paymentId is null) return;

        var payment = await payments.GetByOrderIdAsync(orderId, ct);
        if (payment is null)
        {
            logger.LogWarning("Webhook {Event} for unknown order {OrderId}", eventName, orderId);
            return;
        }

        switch (eventName)
        {
            case "payment.captured" or "order.paid" when payment.Status != PaymentStatus.Captured:
                var amount = entity.TryGetProperty("amount", out var a) ? a.GetInt64() : 0;
                if (amount != payment.AmountInPaise)
                {
                    logger.LogWarning("Webhook amount mismatch for order {OrderId}", orderId);
                    return;
                }
                await ActivateAsync(payment, paymentId, ct);
                break;
            case "payment.failed" when payment.Status == PaymentStatus.Created:
                var reason = entity.TryGetProperty("error_description", out var e) ? e.GetString() : "Payment failed";
                payment.RazorpayPaymentId = paymentId;
                await MarkFailedAsync(payment, reason ?? "Payment failed", ct);
                break;
        }
    }

    public async Task<IReadOnlyList<PaymentDto>> GetPaymentHistoryAsync(Guid userId, CancellationToken ct = default) =>
        (await payments.ListByUserAsync(userId, ct))
        .Select(p => new PaymentDto(p.Id, p.Plan?.Name ?? "Plan", p.AmountInPaise, p.Currency, p.Status,
            p.RazorpayOrderId, p.RazorpayPaymentId, p.CreatedAt, p.PaidAt))
        .ToList();

    public async Task<int> ExpireDueSubscriptionsAsync(CancellationToken ct = default)
    {
        var due = await subscriptions.ListExpiredActiveAsync(Now, ct);
        foreach (var s in due)
        {
            s.Status = SubscriptionStatus.Expired;
            s.UpdatedAt = Now;
        }
        if (due.Count > 0) await uow.SaveChangesAsync(ct);
        return due.Count;
    }

    private async Task ActivateAsync(Payment payment, string paymentId, CancellationToken ct)
    {
        if (payment.Status == PaymentStatus.Captured) return;

        var plan = payment.Plan ?? await subscriptions.GetPlanAsync(payment.PlanId, ct)
                   ?? throw new NotFoundException("Plan not found.");
        var now = Now;

        // Renewals stack on top of an active paid subscription instead of overlapping it.
        var current = await subscriptions.GetCurrentAsync(payment.UserId, now, ct);
        var startsAt = current?.ExpiresAt is { } exp && exp > now ? exp : now;

        var subscription = new Subscription
        {
            UserId = payment.UserId,
            PlanId = plan.Id,
            Status = SubscriptionStatus.Active,
            StartsAt = startsAt,
            ExpiresAt = startsAt.AddDays(plan.DurationDays)
        };
        subscriptions.Add(subscription);

        payment.RazorpayPaymentId = paymentId;
        payment.Status = PaymentStatus.Captured;
        payment.PaidAt = now;
        payment.FailureReason = null;
        payment.SubscriptionId = subscription.Id;
        payment.UpdatedAt = now;
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Activated {Plan} for user {UserId} until {ExpiresAt}", plan.Code, payment.UserId,
            subscription.ExpiresAt);
    }

    private async Task MarkFailedAsync(Payment payment, string reason, CancellationToken ct)
    {
        payment.Status = PaymentStatus.Failed;
        payment.FailureReason = reason.Length > 500 ? reason[..500] : reason;
        payment.UpdatedAt = Now;
        await uow.SaveChangesAsync(ct);
    }

    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    private static PlanDto ToDto(SubscriptionPlan p) => new(p.Id, p.Code, p.Name, p.Description, p.PriceInPaise,
        p.Currency, p.DurationDays, p.MaxModes, p.AllowsPremiumTemplates);
}
