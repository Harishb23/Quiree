using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using ProLink.Application.DTOs;
using ProLink.Domain.Enums;
using ProLink.Tests.Infrastructure;

namespace ProLink.Tests.Api;

public sealed class BusinessQrCampaignTests(TestApp app) : IClassFixture<TestApp>
{
    private const string Browser = "Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile";

    private async Task<(HttpClient Client, BusinessDetailDto Business)> PublishedBusinessAsync()
    {
        var (client, _) = await app.RegisterBusinessAsync();
        var business = (await (await client.PostAsJsonAsync("/api/businesses", BusinessApiTests.Business($"Cafe {Guid.NewGuid():N}"[..14], categoryId: 4)))
            .Content.ReadFromJsonAsync<BusinessDetailDto>(TestApp.Json))!;
        await client.PutAsync($"/api/businesses/{business.Id}/publish", null);
        return (client, business);
    }

    private HttpClient Visitor(string ua = Browser)
    {
        var c = app.CreateClient();
        c.DefaultRequestHeaders.UserAgent.ParseAdd(ua);
        return c;
    }

    [Fact]
    public async Task Campaigns_resolve_to_their_destination_and_can_be_switched_without_a_new_code()
    {
        var (client, business) = await PublishedBusinessAsync();
        var url = $"/api/businesses/{business.Id}/qr-campaigns";
        var product = (await (await client.PostAsJsonAsync($"/api/businesses/{business.Id}/products",
            new { name = "Masala Dosa", priceInPaise = 9000, attributes = new Dictionary<string, string> { ["veg_type"] = "Veg" } }))
            .Content.ReadFromJsonAsync<ProductDto>(TestApp.Json))!;

        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync(url, new { name = "Packaging", destination = "Product" })).StatusCode);

        var created = await client.PostAsJsonAsync(url, new { name = "Packaging", destination = "Product", targetId = product.Id });
        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        var campaign = (await created.Content.ReadFromJsonAsync<QrCampaignDto>(TestApp.Json))!;
        Assert.Equal("Masala Dosa", campaign.TargetName);
        Assert.EndsWith($"/bq/{campaign.Code}", campaign.QrUrl);

        var resolved = await Visitor().GetFromJsonAsync<QrResolveDto>($"/api/bq/{campaign.Code}", TestApp.Json);
        Assert.Equal(business.Slug, resolved!.Slug);
        Assert.Equal(QrDestination.Product, resolved.Destination);
        Assert.Equal(product.Id, resolved.TargetId);

        // Switch destination: same printed code, new target.
        var updated = await client.PutAsJsonAsync($"{url}/{campaign.Id}", new { name = "Packaging", destination = "Reviews" });
        Assert.Equal(campaign.Code, (await updated.Content.ReadFromJsonAsync<QrCampaignDto>(TestApp.Json))!.Code);
        resolved = await Visitor().GetFromJsonAsync<QrResolveDto>($"/api/bq/{campaign.Code}", TestApp.Json);
        Assert.Equal(QrDestination.Reviews, resolved!.Destination);

        // The main QR still opens the storefront.
        var qr = await client.GetFromJsonAsync<BusinessQrDto>($"/api/businesses/{business.Id}/qr", TestApp.Json);
        Assert.Equal(QrDestination.Profile, (await Visitor().GetFromJsonAsync<QrResolveDto>($"/api/bq/{qr!.QrCode}", TestApp.Json))!.Destination);
    }

    [Fact]
    public async Task Printed_codes_fall_back_to_the_storefront_when_their_target_disappears()
    {
        var (client, business) = await PublishedBusinessAsync();
        var product = (await (await client.PostAsJsonAsync($"/api/businesses/{business.Id}/products",
            new { name = "Filter Coffee", attributes = new Dictionary<string, string> { ["veg_type"] = "Veg" } }))
            .Content.ReadFromJsonAsync<ProductDto>(TestApp.Json))!;
        var campaign = (await (await client.PostAsJsonAsync($"/api/businesses/{business.Id}/qr-campaigns",
            new { name = "Coffee cup", destination = "Product", targetId = product.Id })).Content.ReadFromJsonAsync<QrCampaignDto>(TestApp.Json))!;

        await client.DeleteAsync($"/api/businesses/{business.Id}/products/{product.Id}");
        var resolved = await Visitor().GetFromJsonAsync<QrResolveDto>($"/api/bq/{campaign.Code}", TestApp.Json);
        Assert.Equal(QrDestination.Products, resolved!.Destination);
        Assert.Null(resolved.TargetId);
    }

    [Fact]
    public async Task Disabled_and_expired_campaigns_stop_resolving()
    {
        var (client, business) = await PublishedBusinessAsync();
        var url = $"/api/businesses/{business.Id}/qr-campaigns";
        var campaign = (await (await client.PostAsJsonAsync(url, new { name = "Flyer", destination = "Profile" }))
            .Content.ReadFromJsonAsync<QrCampaignDto>(TestApp.Json))!;

        await client.PutAsJsonAsync($"{url}/{campaign.Id}", new { name = "Flyer", destination = "Profile", isEnabled = false });
        Assert.Equal(HttpStatusCode.Gone, (await Visitor().GetAsync($"/api/bq/{campaign.Code}")).StatusCode);

        var expired = await client.PutAsJsonAsync($"{url}/{campaign.Id}",
            new { name = "Flyer", destination = "Profile", isEnabled = true, expiresAt = DateTime.UtcNow.AddMinutes(-1) });
        Assert.True((await expired.Content.ReadFromJsonAsync<QrCampaignDto>(TestApp.Json))!.IsExpired);
        var gone = await Visitor().GetAsync($"/api/bq/{campaign.Code}");
        Assert.Equal(HttpStatusCode.Gone, gone.StatusCode);
        Assert.Contains("ended", await gone.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"{url}/{campaign.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Visitor().GetAsync($"/api/bq/{campaign.Code}")).StatusCode);
    }

    [Theory]
    [InlineData("#FFFFFF", "#000000")] // light on dark
    [InlineData("#BBBBBB", "#FFFFFF")] // too little contrast
    public async Task Unscannable_colours_are_rejected(string fg, string bg)
    {
        var (client, business) = await PublishedBusinessAsync();
        var response = await client.PostAsJsonAsync($"/api/businesses/{business.Id}/qr-campaigns",
            new { name = "Bad colours", destination = "Profile", foregroundColor = fg, backgroundColor = bg });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Bulk_table_codes_are_created_compared_and_downloadable()
    {
        var (client, business) = await PublishedBusinessAsync();
        var url = $"/api/businesses/{business.Id}/qr-campaigns";
        var bulk = await client.PostAsJsonAsync($"{url}/bulk", new { namePrefix = "Table", count = 3, destination = "Products", frameText = "Scan for menu" });
        var tables = (await bulk.Content.ReadFromJsonAsync<List<QrCampaignDto>>(TestApp.Json))!;
        Assert.Equal(["Table 1", "Table 2", "Table 3"], tables.Select(t => t.Name));
        Assert.Equal(3, tables.Select(t => t.Code).Distinct().Count());
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync($"{url}/bulk", new { namePrefix = "Table", count = 2 })).StatusCode);

        // Scans per campaign: table 1 twice (two visitors), table 2 once, a bot never.
        await Visitor().GetAsync($"/api/bq/{tables[0].Code}");
        await Visitor("Mozilla/5.0 (iPhone) Safari").GetAsync($"/api/bq/{tables[0].Code}");
        await Visitor().GetAsync($"/api/bq/{tables[1].Code}");
        await Visitor("facebookexternalhit/1.1").GetAsync($"/api/bq/{tables[2].Code}");

        var stats = await client.GetFromJsonAsync<QrCampaignStatsDto>($"{url}/stats?days=7", TestApp.Json);
        var t1 = stats!.Items.Single(i => i.CampaignId == tables[0].Id);
        Assert.Equal(2, t1.Scans);
        Assert.Equal(2, t1.UniqueVisitors);
        Assert.Equal(2, t1.Daily[^1]);
        Assert.Equal(0, stats.Items.Single(i => i.CampaignId == tables[2].Id).Scans);
        Assert.Contains(stats.Items, i => i.CampaignId == null && i.Name == "Main storefront QR");
        Assert.Equal(t1.Name, stats.Items[0].Name); // sorted by scans

        var list = await client.GetFromJsonAsync<List<QrCampaignDto>>(url, TestApp.Json);
        Assert.Equal(2, list!.Single(c => c.Id == tables[0].Id).TotalScans);

        var zip = await client.GetAsync($"{url}/download?ids={tables[0].Id}&ids={tables[1].Id}");
        Assert.Equal("application/zip", zip.Content.Headers.ContentType!.MediaType);
        using var archive = new ZipArchive(await zip.Content.ReadAsStreamAsync());
        Assert.Equal(["Table 1.png", "Table 2.png"], archive.Entries.Select(e => e.Name).OrderBy(n => n));
    }

    [Fact]
    public async Task Only_managers_can_change_campaigns_and_strangers_see_nothing()
    {
        var (owner, business) = await PublishedBusinessAsync();
        var url = $"/api/businesses/{business.Id}/qr-campaigns";
        var editorEmail = $"ed{Guid.NewGuid():N}@example.com";
        var (editor, _) = await app.RegisterBusinessAsync(email: editorEmail);
        await owner.PostAsJsonAsync($"/api/businesses/{business.Id}/members", new { email = editorEmail, role = "Editor" });
        var (stranger, _) = await app.RegisterBusinessAsync();

        Assert.Equal(HttpStatusCode.OK, (await editor.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.PostAsJsonAsync(url, new { name = "X", destination = "Profile" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync(url)).StatusCode);

        // A campaign target must belong to the same business.
        var (otherOwner, otherBusiness) = await PublishedBusinessAsync();
        var foreign = (await (await otherOwner.PostAsJsonAsync($"/api/businesses/{otherBusiness.Id}/products",
            new { name = "Not yours", attributes = new Dictionary<string, string> { ["veg_type"] = "Veg" } }))
            .Content.ReadFromJsonAsync<ProductDto>(TestApp.Json))!;
        Assert.Equal(HttpStatusCode.BadRequest,
            (await owner.PostAsJsonAsync(url, new { name = "Sneaky", destination = "Product", targetId = foreign.Id })).StatusCode);
    }
}
