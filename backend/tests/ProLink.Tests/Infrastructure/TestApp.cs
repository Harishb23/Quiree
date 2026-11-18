using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Infrastructure.Data;
using ProLink.Infrastructure.Services;

namespace ProLink.Tests.Infrastructure;

/// <summary>Boots the real API (controllers, services, EF Core) against an in-memory SQLite database.</summary>
public class TestApp : WebApplicationFactory<Program>
{
    public const string RazorpaySecret = "test_key_secret";
    public const string WebhookSecret = "test_webhook_secret";
    public const string PublicBaseUrl = "https://prolink.test";

    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly string _uploads = Path.Combine(Path.GetTempPath(), "prolink-tests", Guid.NewGuid().ToString("N"));

    public FakeEmailSender Emails { get; } = new();
    public FakeRazorpayClient Razorpay { get; } = new();
    public FakeGoogleValidator Google { get; } = new();

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    /// <summary>Plan limits are enforced in tests unless a subclass opts into the promotional unlock.</summary>
    protected virtual bool UnlockAllFeatures => false;

    public TestApp() => _connection.Open();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Jwt:SigningKey", "integration-tests-signing-key-0123456789-abcdef");
        builder.UseSetting("App:PublicBaseUrl", PublicBaseUrl);
        builder.UseSetting("App:FrontendBaseUrl", PublicBaseUrl);
        builder.UseSetting("Razorpay:KeyId", "rzp_test_key");
        builder.UseSetting("Razorpay:KeySecret", RazorpaySecret);
        builder.UseSetting("Razorpay:WebhookSecret", WebhookSecret);
        // Satisfies the startup check; the SQL Server registration is replaced with SQLite below.
        builder.UseSetting("ConnectionStrings:DefaultConnection", "Server=unused;Database=unused");
        builder.UseSetting("Database:MigrateOnStartup", "false");
        builder.UseSetting("RateLimiting:AuthPerMinute", "10000");
        builder.UseSetting("RateLimiting:PublicPerMinute", "10000");
        builder.UseSetting("Subscription:UnlockAllFeatures", UnlockAllFeatures ? "true" : "false");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<AppDbContext>();
            services.AddDbContext<AppDbContext>(o => o.UseSqlite(_connection));

            // Uploaded test files go to a throwaway folder, never the real wwwroot/uploads.
            services.Configure<StorageOptions>(o => o.RootPath = _uploads);

            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Emails);
            services.RemoveAll<IRazorpayClient>();
            services.AddSingleton<IRazorpayClient>(Razorpay);
            services.RemoveAll<IGoogleTokenValidator>();
            services.AddSingleton<IGoogleTokenValidator>(Google);

            // The background expiry worker isn't needed for request tests.
            var worker = services.FirstOrDefault(d => d.ImplementationType?.Name == "SubscriptionExpiryWorker");
            if (worker is not null) services.Remove(worker);

            using var scope = services.BuildServiceProvider().CreateScope();
            scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();
        });
    }

    public T Db<T>(Func<AppDbContext, T> query)
    {
        using var scope = Services.CreateScope();
        return query(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    /// <summary>Registers a user and returns an authenticated client.</summary>
    /// <summary>Registers a business account (business profiles only) and returns an authenticated client.</summary>
    public Task<(HttpClient Client, AuthResponse Auth)> RegisterBusinessAsync(string? username = null, string? email = null) =>
        RegisterAsync(username, email, "Business");

    public async Task<(HttpClient Client, AuthResponse Auth)> RegisterAsync(string? username = null, string? email = null,
        string accountType = "Personal")
    {
        var client = CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            fullName = "Harish Baskar",
            email = email ?? $"user{Guid.NewGuid():N}@example.com",
            password = "Passw0rd!",
            username,
            accountType
        }, Json);
        response.EnsureSuccessStatusCode();
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>(Json))!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        return (client, auth);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection.Dispose();
            try { if (Directory.Exists(_uploads)) Directory.Delete(_uploads, recursive: true); } catch (IOException) { }
        }
    }
}

public sealed class FakeEmailSender : IEmailSender
{
    public ConcurrentQueue<(string To, string Subject, string Body)> Sent { get; } = new();

    public Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
    {
        Sent.Enqueue((toEmail, subject, htmlBody));
        return Task.CompletedTask;
    }
}

public sealed class FakeGoogleValidator : IGoogleTokenValidator
{
    public Dictionary<string, GoogleUserInfo> Tokens { get; } = new();

    public Task<GoogleUserInfo?> ValidateAsync(string idToken, CancellationToken ct = default) =>
        Task.FromResult(Tokens.GetValueOrDefault(idToken));
}

/// <summary>Simulates the Razorpay API. Signature checks use the real HMAC implementation.</summary>
public sealed class FakeRazorpayClient : IRazorpayClient
{
    private readonly RazorpayClient _real = new(new HttpClient(),
        Microsoft.Extensions.Options.Options.Create(new Application.Common.RazorpayOptions
        {
            KeyId = "rzp_test_key", KeySecret = TestApp.RazorpaySecret, WebhookSecret = TestApp.WebhookSecret
        }),
        Microsoft.Extensions.Logging.Abstractions.NullLogger<RazorpayClient>.Instance);

    public ConcurrentDictionary<string, RazorpayOrder> Orders { get; } = new();
    public ConcurrentDictionary<string, RazorpayPayment> Payments { get; } = new();

    public string KeyId => "rzp_test_key";

    public Task<RazorpayOrder> CreateOrderAsync(long amountInPaise, string currency, string receipt,
        IDictionary<string, string> notes, CancellationToken ct = default)
    {
        var order = new RazorpayOrder($"order_{Guid.NewGuid():N}"[..20], amountInPaise, currency);
        Orders[order.Id] = order;
        return Task.FromResult(order);
    }

    public Task<RazorpayPayment?> FetchPaymentAsync(string paymentId, CancellationToken ct = default) =>
        Task.FromResult(Payments.GetValueOrDefault(paymentId));

    public bool VerifyPaymentSignature(string orderId, string paymentId, string signature) =>
        _real.VerifyPaymentSignature(orderId, paymentId, signature);

    public bool VerifyWebhookSignature(string payload, string signature) =>
        _real.VerifyWebhookSignature(payload, signature);

    /// <summary>Simulates a successful checkout: returns the values Razorpay would hand to the browser.</summary>
    public (string PaymentId, string Signature) SimulateCapturedPayment(string orderId)
    {
        var order = Orders[orderId];
        var paymentId = $"pay_{Guid.NewGuid():N}"[..18];
        Payments[paymentId] = new RazorpayPayment(paymentId, orderId, order.Amount, order.Currency, "captured");
        return (paymentId, RazorpayClient.ComputeSignature($"{orderId}|{paymentId}", TestApp.RazorpaySecret));
    }
}
