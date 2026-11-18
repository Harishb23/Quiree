using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ProLink.Api.Infrastructure;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;

namespace ProLink.Api.Controllers;

/// <summary>Anonymous viewer endpoints. Only published data for public profiles is returned.</summary>
[ApiController]
[AllowAnonymous]
[EnableRateLimiting("public")]
[Route("api/public/{slug}")]
public sealed class PublicProfileController(IPublicProfileService publicProfiles, IQrCodeGenerator qrGenerator)
    : ControllerBase
{
    [HttpGet]
    public async Task<PublicProfileDto> Get(string slug, CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-cache";
        return await publicProfiles.GetAsync(slug, ct);
    }

    [HttpGet("vcard")]
    public async Task<IActionResult> VCard(string slug, [FromQuery] Guid? modeId, CancellationToken ct)
    {
        var card = await publicProfiles.GetVCardAsync(slug, modeId, ct);
        Response.Headers.CacheControl = "no-store";
        return File(Encoding.UTF8.GetBytes(card.Content), "text/vcard; charset=utf-8", card.FileName);
    }

    [HttpGet("manifest.webmanifest")]
    public async Task<IActionResult> Manifest(string slug, CancellationToken ct) =>
        Content(await publicProfiles.GetManifestJsonAsync(slug, ct), "application/manifest+json");

    /// <summary>Install manifest for the owner's "My QR" home-screen app (/q/{slug}).</summary>
    [HttpGet("qr-manifest.webmanifest")]
    public async Task<IActionResult> QrManifest(string slug, CancellationToken ct) =>
        Content(await publicProfiles.GetQrManifestJsonAsync(slug, ct), "application/manifest+json");

    /// <summary>QR for the share sheet. Rendered from the same permanent URL as the owner's QR.</summary>
    [HttpGet("qr.png")]
    public async Task<IActionResult> Qr(string slug, CancellationToken ct)
    {
        var profile = await publicProfiles.GetAsync(slug, ct);
        Response.Headers.CacheControl = "public,max-age=86400";
        return File(qrGenerator.GeneratePng(profile.PermanentUrl, 12), "image/png");
    }
}

[ApiController]
[Route("api/subscription")]
public sealed class SubscriptionController(ISubscriptionService subscriptions) : ControllerBase
{
    [HttpGet("plans")]
    [AllowAnonymous]
    public Task<IReadOnlyList<PlanDto>> Plans(CancellationToken ct) => subscriptions.ListPlansAsync(ct);

    [HttpGet]
    [Authorize]
    public Task<SubscriptionStatusDto> Status(CancellationToken ct) => subscriptions.GetStatusAsync(User.GetUserId(), ct);

    [HttpPost("orders")]
    [Authorize]
    public Task<CreateOrderResponse> CreateOrder(CreateOrderRequest request, CancellationToken ct) =>
        subscriptions.CreateOrderAsync(User.GetUserId(), request, ct);

    /// <summary>Called by the frontend after checkout. Activation happens only after server-side verification.</summary>
    [HttpPost("verify")]
    [Authorize]
    public Task<SubscriptionStatusDto> Verify(VerifyPaymentRequest request, CancellationToken ct) =>
        subscriptions.VerifyPaymentAsync(User.GetUserId(), request, ct);

    [HttpGet("payments")]
    [Authorize]
    public Task<IReadOnlyList<PaymentDto>> Payments(CancellationToken ct) =>
        subscriptions.GetPaymentHistoryAsync(User.GetUserId(), ct);

    /// <summary>Razorpay webhook (configure payment.captured, order.paid and payment.failed events).</summary>
    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook(CancellationToken ct)
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var payload = await reader.ReadToEndAsync(ct);
        var signature = Request.Headers["X-Razorpay-Signature"].ToString();
        await subscriptions.HandleWebhookAsync(payload, signature, ct);
        return Ok();
    }
}

[ApiController]
[Route("api/enquiries")]
public sealed class EnquiriesController(IEnquiryService enquiries) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting("enquiry")]
    public async Task<IActionResult> Create(CreateEnquiryRequest request, CancellationToken ct)
    {
        var created = await enquiries.CreateAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created, new { created.Id, message = "Thank you! We will get back to you shortly." });
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public Task<IReadOnlyList<EnquiryDto>> List(CancellationToken ct) => enquiries.ListAsync(ct);
}
