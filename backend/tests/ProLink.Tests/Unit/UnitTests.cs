using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Mapping;
using ProLink.Application.Services;
using ProLink.Domain.Enums;
using ProLink.Infrastructure.Services;

namespace ProLink.Tests.Unit;

public sealed class RazorpayVerificationTests
{
    private static RazorpayClient Client(string secret = "s3cret", string webhookSecret = "wh") =>
        new(new HttpClient(), Options.Create(new RazorpayOptions { KeyId = "k", KeySecret = secret, WebhookSecret = webhookSecret }),
            NullLogger<RazorpayClient>.Instance);

    [Fact]
    public void Valid_payment_signature_is_accepted()
    {
        // HMAC_SHA256("order_1|pay_1", "s3cret") as Razorpay computes it.
        var signature = RazorpayClient.ComputeSignature("order_1|pay_1", "s3cret");
        Assert.True(Client().VerifyPaymentSignature("order_1", "pay_1", signature));
        Assert.True(Client().VerifyPaymentSignature("order_1", "pay_1", signature.ToUpperInvariant()));
    }

    [Theory]
    [InlineData("order_2", "pay_1")]
    [InlineData("order_1", "pay_2")]
    public void Signature_for_different_order_or_payment_is_rejected(string orderId, string paymentId)
    {
        var signature = RazorpayClient.ComputeSignature("order_1|pay_1", "s3cret");
        Assert.False(Client().VerifyPaymentSignature(orderId, paymentId, signature));
    }

    [Fact]
    public void Signature_made_with_another_secret_is_rejected()
    {
        var signature = RazorpayClient.ComputeSignature("order_1|pay_1", "other");
        Assert.False(Client().VerifyPaymentSignature("order_1", "pay_1", signature));
    }

    [Fact]
    public void Missing_secret_never_verifies()
    {
        var signature = RazorpayClient.ComputeSignature("order_1|pay_1", "");
        Assert.False(Client(secret: "").VerifyPaymentSignature("order_1", "pay_1", signature));
        Assert.False(Client(webhookSecret: "").VerifyWebhookSignature("{}", RazorpayClient.ComputeSignature("{}", "")));
    }

    [Fact]
    public void Webhook_signature_covers_the_exact_body()
    {
        const string body = "{\"event\":\"payment.captured\"}";
        var signature = RazorpayClient.ComputeSignature(body, "wh");
        Assert.True(Client().VerifyWebhookSignature(body, signature));
        Assert.False(Client().VerifyWebhookSignature(body + " ", signature));
    }

    [Fact]
    public void Known_hmac_vector_matches()
    {
        // RFC 4231-style sanity check of the hex encoding (HMAC-SHA256 of "abc" with key "key").
        Assert.Equal("9c196e32dc0175f86f4b1cb89289d6619de6bee699e4c378e68309ed97a1a6ab",
            RazorpayClient.ComputeSignature("abc", "key"));
    }
}

public sealed class SlugAndUrlRulesTests
{
    [Theory]
    [InlineData("harish", true)]
    [InlineData("harish-baskar", true)]
    [InlineData("h1", false)]
    [InlineData("-harish", false)]
    [InlineData("harish--b", false)]
    [InlineData("Harish", false)]
    [InlineData("admin", false)]
    [InlineData("dashboard", false)]
    public void Slug_validation(string slug, bool valid) => Assert.Equal(valid, SlugRules.IsValid(slug));

    [Fact]
    public void Slug_is_generated_from_text() => Assert.Equal("harish-baskar", SlugRules.FromText("  Harish  Baskar! "));

    [Theory]
    [InlineData("https://example.com", true)]
    [InlineData("http://example.com/path", true)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("ftp://example.com", false)]
    [InlineData("example.com", false)]
    public void Only_http_urls_are_safe(string url, bool safe) => Assert.Equal(safe, UrlRules.IsSafeHttpUrl(url));

    [Fact]
    public void Image_signatures_are_detected_by_content()
    {
        Assert.Equal(".jpg", ImageSignature.Detect([0xFF, 0xD8, 0xFF, 0xE0]));
        Assert.Equal(".png", ImageSignature.Detect([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
        Assert.Equal(".webp", ImageSignature.Detect("RIFF\0\0\0\0WEBP"u8));
        Assert.Null(ImageSignature.Detect("GIF89a"u8));
        Assert.Null(ImageSignature.Detect("<svg>"u8));
    }
}

public sealed class VCardBuilderTests
{
    private static PublicModeDto Mode(string? phone = "+91 98765 43210") => new(
        Guid.NewGuid(), "Developer", ModeType.Developer, "Engineer; Lead", "Genius Desk, Inc", null, null, null, null,
        "https://company.example", null, "modern-glass",
        new PublicContactDto("h@example.com", phone, "Pondicherry, India", "https://company.example"),
        [], [], [], [], [], [], [], [], []);

    [Fact]
    public void Builds_valid_vcard_with_escaping_and_permanent_url()
    {
        var card = VCardBuilder.Build("Harish Baskar", Mode(), "https://prolink.id/p/harish");

        Assert.StartsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n", card);
        Assert.EndsWith("END:VCARD\r\n", card);
        Assert.Contains("N:Baskar;Harish;;;\r\n", card);
        Assert.Contains("TITLE:Engineer\\; Lead\r\n", card);
        Assert.Contains("ORG:Genius Desk\\, Inc\r\n", card);
        Assert.Contains("ADR;TYPE=WORK:;;Pondicherry\\, India;;;;\r\n", card);
        Assert.Contains("URL:https://prolink.id/p/harish\r\n", card);
        Assert.DoesNotContain("URL:https://company.example", card);
    }

    [Fact]
    public void Omits_missing_fields() =>
        Assert.DoesNotContain("TEL", VCardBuilder.Build("Solo", Mode(phone: null), "https://x/p/solo"));

    [Fact]
    public void File_name_is_safe() => Assert.Equal("HarishBaskar.vcf", VCardBuilder.FileName("Harish/../Baskar"));
}
