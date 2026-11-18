using System.Net;
using System.Net.Http.Json;
using System.Text;
using ProLink.Application.DTOs;
using ProLink.Domain.Enums;
using ProLink.Infrastructure.Services;
using ProLink.Tests.Infrastructure;

namespace ProLink.Tests.Api;

public sealed class SubscriptionApiTests(TestApp app) : IClassFixture<TestApp>
{
    private const int ProMonthlyPlanId = 2;

    [Fact]
    public async Task Plans_are_public_and_new_users_are_on_free_plan()
    {
        var plans = await app.CreateClient().GetFromJsonAsync<List<PlanDto>>("/api/subscription/plans", TestApp.Json);
        Assert.Equal(["free", "pro-monthly", "pro-yearly"], plans!.Select(p => p.Code));

        var (client, _) = await app.RegisterAsync();
        var status = await client.GetFromJsonAsync<SubscriptionStatusDto>("/api/subscription", TestApp.Json);
        Assert.Equal("free", status!.Entitlements.PlanCode);
        Assert.False(status.Entitlements.IsPaid);
    }

    [Fact]
    public async Task Order_amount_comes_from_the_server_side_plan()
    {
        var (client, _) = await app.RegisterAsync();
        var order = await (await client.PostAsJsonAsync("/api/subscription/orders", new { planId = ProMonthlyPlanId, amount = 1 }))
            .Content.ReadFromJsonAsync<CreateOrderResponse>(TestApp.Json);

        Assert.Equal(19900, order!.Amount);
        Assert.Equal(19900, app.Razorpay.Orders[order.OrderId].Amount);
        Assert.Equal("rzp_test_key", order.KeyId);

        var free = await client.PostAsJsonAsync("/api/subscription/orders", new { planId = 1 });
        Assert.Equal(HttpStatusCode.BadRequest, free.StatusCode);
    }

    [Fact]
    public async Task Verified_payment_activates_subscription_and_unlocks_limits()
    {
        var (client, _) = await app.RegisterAsync();
        var order = await (await client.PostAsJsonAsync("/api/subscription/orders", new { planId = ProMonthlyPlanId }))
            .Content.ReadFromJsonAsync<CreateOrderResponse>(TestApp.Json);
        var (paymentId, signature) = app.Razorpay.SimulateCapturedPayment(order!.OrderId);

        var verify = await client.PostAsJsonAsync("/api/subscription/verify",
            new { razorpayOrderId = order.OrderId, razorpayPaymentId = paymentId, razorpaySignature = signature });
        Assert.Equal(HttpStatusCode.OK, verify.StatusCode);
        var status = await verify.Content.ReadFromJsonAsync<SubscriptionStatusDto>(TestApp.Json);
        Assert.Equal("pro-monthly", status!.Entitlements.PlanCode);
        Assert.True(status.Entitlements.AllowsPremiumTemplates);
        Assert.InRange(status.DaysRemaining!.Value, 29, 30);

        // Idempotent: verifying again doesn't create a second subscription.
        await client.PostAsJsonAsync("/api/subscription/verify",
            new { razorpayOrderId = order.OrderId, razorpayPaymentId = paymentId, razorpaySignature = signature });
        var payments = await client.GetFromJsonAsync<List<PaymentDto>>("/api/subscription/payments", TestApp.Json);
        Assert.Equal(PaymentStatus.Captured, Assert.Single(payments!).Status);

        // Paid plan unlocks premium templates.
        for (var i = 0; i < 3; i++) await client.PostAsJsonAsync("/api/modes", ProfileAndModeApiTests.Mode($"Mode {i}"));
        var modes = await client.GetFromJsonAsync<List<ModeSummaryDto>>("/api/modes", TestApp.Json);
        Assert.Equal(3, modes!.Count);
        var premium = await client.PutAsJsonAsync($"/api/modes/{modes[0].Id}/template", new { templateId = 2 });
        Assert.Equal(HttpStatusCode.OK, premium.StatusCode);
    }

    [Fact]
    public async Task Forged_signature_is_rejected_and_nothing_is_activated()
    {
        var (client, _) = await app.RegisterAsync();
        var order = await (await client.PostAsJsonAsync("/api/subscription/orders", new { planId = ProMonthlyPlanId }))
            .Content.ReadFromJsonAsync<CreateOrderResponse>(TestApp.Json);
        var (paymentId, _) = app.Razorpay.SimulateCapturedPayment(order!.OrderId);

        var forged = RazorpayClient.ComputeSignature($"{order.OrderId}|{paymentId}", "attacker-secret");
        var verify = await client.PostAsJsonAsync("/api/subscription/verify",
            new { razorpayOrderId = order.OrderId, razorpayPaymentId = paymentId, razorpaySignature = forged });

        Assert.Equal(HttpStatusCode.BadRequest, verify.StatusCode);
        var status = await client.GetFromJsonAsync<SubscriptionStatusDto>("/api/subscription", TestApp.Json);
        Assert.Equal("free", status!.Entitlements.PlanCode);
        var payments = await client.GetFromJsonAsync<List<PaymentDto>>("/api/subscription/payments", TestApp.Json);
        Assert.Equal(PaymentStatus.Failed, Assert.Single(payments!).Status);
    }

    [Fact]
    public async Task Users_cannot_verify_someone_elses_order()
    {
        var (buyer, _) = await app.RegisterAsync();
        var (other, _) = await app.RegisterAsync();
        var order = await (await buyer.PostAsJsonAsync("/api/subscription/orders", new { planId = ProMonthlyPlanId }))
            .Content.ReadFromJsonAsync<CreateOrderResponse>(TestApp.Json);
        var (paymentId, signature) = app.Razorpay.SimulateCapturedPayment(order!.OrderId);

        var response = await other.PostAsJsonAsync("/api/subscription/verify",
            new { razorpayOrderId = order.OrderId, razorpayPaymentId = paymentId, razorpaySignature = signature });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Webhook_requires_valid_signature_and_activates_on_capture()
    {
        var (client, _) = await app.RegisterAsync();
        var order = await (await client.PostAsJsonAsync("/api/subscription/orders", new { planId = 3 }))
            .Content.ReadFromJsonAsync<CreateOrderResponse>(TestApp.Json);
        var payload = System.Text.Json.JsonSerializer.Serialize(new
        {
            @event = "payment.captured",
            payload = new { payment = new { entity = new { id = "pay_webhook1", order_id = order!.OrderId, amount = order.Amount, status = "captured" } } }
        });
        var anonymous = app.CreateClient();

        var forged = new StringContent(payload, Encoding.UTF8, "application/json");
        forged.Headers.Add("X-Razorpay-Signature", "deadbeef");
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsync("/api/subscription/webhook", forged)).StatusCode);
        Assert.Equal("free", (await client.GetFromJsonAsync<SubscriptionStatusDto>("/api/subscription", TestApp.Json))!.Entitlements.PlanCode);

        var signed = new StringContent(payload, Encoding.UTF8, "application/json");
        signed.Headers.Add("X-Razorpay-Signature", RazorpayClient.ComputeSignature(payload, TestApp.WebhookSecret));
        Assert.Equal(HttpStatusCode.OK, (await anonymous.PostAsync("/api/subscription/webhook", signed)).StatusCode);

        var status = await client.GetFromJsonAsync<SubscriptionStatusDto>("/api/subscription", TestApp.Json);
        Assert.Equal("pro-yearly", status!.Entitlements.PlanCode);
    }
}
