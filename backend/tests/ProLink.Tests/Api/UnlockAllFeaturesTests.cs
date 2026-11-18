using System.Net;
using System.Net.Http.Json;
using ProLink.Application.DTOs;
using ProLink.Tests.Infrastructure;

namespace ProLink.Tests.Api;

/// <summary>Test host with the promotional Subscription:UnlockAllFeatures switch turned on.</summary>
public sealed class UnlockedTestApp : TestApp
{
    protected override bool UnlockAllFeatures => true;
}

public sealed class UnlockAllFeaturesTests(UnlockedTestApp app) : IClassFixture<UnlockedTestApp>
{
    [Fact]
    public async Task Free_users_get_every_template_and_the_top_mode_limit()
    {
        var (client, _) = await app.RegisterAsync();
        var status = await client.GetFromJsonAsync<SubscriptionStatusDto>("/api/subscription", TestApp.Json);
        Assert.True(status!.Entitlements.AllFeaturesUnlocked);
        Assert.True(status.Entitlements.AllowsPremiumTemplates);
        Assert.Equal(10, status.Entitlements.MaxModes);
        Assert.False(status.Entitlements.IsPaid); // stays truthful: they haven't paid

        var templates = await client.GetFromJsonAsync<List<TemplateDto>>("/api/templates", TestApp.Json);
        Assert.Contains(templates!, t => t.IsPremium);
        Assert.DoesNotContain(templates!, t => t.IsLocked);

        // Signed-out visitors see the gallery unlocked too.
        var anonymous = await app.CreateClient().GetFromJsonAsync<List<TemplateDto>>("/api/templates", TestApp.Json);
        Assert.DoesNotContain(anonymous!, t => t.IsLocked);
    }

    [Fact]
    public async Task Free_users_can_create_more_than_two_modes_and_use_premium_templates()
    {
        var (client, _) = await app.RegisterAsync();
        var premium = (await client.GetFromJsonAsync<List<TemplateDto>>("/api/templates", TestApp.Json))!.First(t => t.IsPremium);

        for (var i = 1; i <= 3; i++)
        {
            var created = await client.PostAsJsonAsync("/api/modes", ProfileAndModeApiTests.Mode($"Mode {i}", templateId: premium.Id));
            Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        }
    }

    [Fact]
    public async Task Purchases_are_paused_while_everything_is_free()
    {
        var (client, _) = await app.RegisterAsync();
        var response = await client.PostAsJsonAsync("/api/subscription/orders", new { planId = 2 });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("free for everyone", await response.Content.ReadAsStringAsync());
        Assert.Empty(app.Razorpay.Orders);
    }
}
