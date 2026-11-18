using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ProLink.Application.DTOs;
using ProLink.Tests.Infrastructure;

namespace ProLink.Tests.Api;

public sealed class PublicProfileApiTests(TestApp app) : IClassFixture<TestApp>
{
    private static object Mode(string name, bool published = true) => ProfileAndModeApiTests.Mode(name, "General", published);

    [Fact]
    public async Task Public_profile_is_anonymous_and_exposes_only_published_modes()
    {
        var email = $"{Guid.NewGuid():N}@private.example";
        var (owner, auth) = await app.RegisterAsync(email: email);
        await owner.PostAsJsonAsync("/api/modes", Mode("Published"));
        await owner.PostAsJsonAsync("/api/modes", Mode("Hidden", published: false));

        var anonymous = app.CreateClient();
        var response = await anonymous.GetAsync($"/api/public/{auth.User.PublicSlug}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        var profile = JsonSerializer.Deserialize<PublicProfileDto>(json, TestApp.Json)!;

        Assert.Equal("Published", Assert.Single(profile.Modes).ModeName);
        Assert.Equal(profile.Modes[0].Id, profile.DefaultModeId);
        // Account data never leaks through the public API.
        Assert.DoesNotContain(email, json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("passwordHash", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(auth.User.Id.ToString(), json);
    }

    [Fact]
    public async Task Private_or_unknown_profiles_return_404()
    {
        var (owner, auth) = await app.RegisterAsync();
        await owner.PutAsJsonAsync("/api/account/public-settings", new { isPublic = false, allowViewerModeSelection = true });

        var anonymous = app.CreateClient();
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/public/{auth.User.PublicSlug}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync("/api/public/does-not-exist")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/public/{auth.User.PublicSlug}/vcard")).StatusCode);
    }

    [Fact]
    public async Task Mode_contact_falls_back_to_main_profile()
    {
        var (owner, auth) = await app.RegisterAsync();
        await owner.PutAsJsonAsync("/api/profile", new
        {
            fullName = "Harish Baskar",
            email = "public@harish.dev",
            mobile = "+91 90000 00000",
            location = "Chennai",
            socialLinks = new[] { new { platform = "GitHub", url = "https://github.com/main" }, new { platform = "LinkedIn", url = "https://linkedin.com/in/main" } }
        });
        await owner.PostAsJsonAsync("/api/modes", Mode("Dev")); // has its own LinkedIn link

        var profile = await app.CreateClient().GetFromJsonAsync<PublicProfileDto>($"/api/public/{auth.User.PublicSlug}", TestApp.Json);
        var mode = profile!.Modes[0];
        Assert.Equal("public@harish.dev", mode.Contact.Email);
        Assert.Equal("Chennai", mode.Contact.Location);
        Assert.Equal("https://linkedin.com/in/me", mode.SocialLinks.Single(l => l.Platform.ToString() == "LinkedIn").Url);
        Assert.Contains(mode.SocialLinks, l => l.Url == "https://github.com/main");
    }

    [Fact]
    public async Task VCard_uses_selected_mode_and_permanent_profile_url()
    {
        var (owner, auth) = await app.RegisterAsync();
        await owner.PutAsJsonAsync("/api/profile", new { fullName = "Harish Baskar", email = "h@harish.dev", mobile = "+919876543210" });
        var hr = await (await owner.PostAsJsonAsync("/api/modes", new
        {
            modeName = "HR Manager", designation = "HR Manager", companyName = "People, Inc.", website = "https://company.example", isPublished = true
        })).Content.ReadFromJsonAsync<ModeDetailDto>(TestApp.Json);
        var dev = await (await owner.PostAsJsonAsync("/api/modes", new
        {
            modeName = "Developer", designation = "Software Developer", companyName = "Genius Desk", isPublished = true
        })).Content.ReadFromJsonAsync<ModeDetailDto>(TestApp.Json);

        var response = await app.CreateClient().GetAsync($"/api/public/{auth.User.PublicSlug}/vcard?modeId={dev!.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/vcard", response.Content.Headers.ContentType!.MediaType);
        Assert.EndsWith(".vcf", response.Content.Headers.ContentDisposition!.FileName!.Trim('"'));
        var vcard = await response.Content.ReadAsStringAsync();

        Assert.Contains("BEGIN:VCARD", vcard);
        Assert.Contains("FN:Harish Baskar", vcard);
        Assert.Contains("TITLE:Software Developer", vcard);
        Assert.Contains("ORG:Genius Desk", vcard);
        Assert.Contains("TEL;TYPE=CELL,VOICE:+919876543210", vcard);
        Assert.Contains("EMAIL;TYPE=INTERNET,WORK:h@harish.dev", vcard);
        Assert.Contains($"URL:{TestApp.PublicBaseUrl}/p/{auth.User.PublicSlug}", vcard);

        // HR mode: escaped comma in ORG, and the company website is NOT used as the URL.
        var hrCard = await app.CreateClient().GetStringAsync($"/api/public/{auth.User.PublicSlug}/vcard?modeId={hr!.Id}");
        Assert.Contains("ORG:People\\, Inc.", hrCard);
        Assert.Contains($"URL:{TestApp.PublicBaseUrl}/p/{auth.User.PublicSlug}", hrCard);
        Assert.DoesNotContain("URL:https://company.example", hrCard);
    }

    [Fact]
    public async Task Same_QR_code_before_and_after_profile_mode_template_and_default_changes()
    {
        var (owner, auth) = await app.RegisterAsync();
        var a = await (await owner.PostAsJsonAsync("/api/modes", Mode("HR"))).Content.ReadFromJsonAsync<ModeDetailDto>(TestApp.Json);

        var infoBefore = await owner.GetFromJsonAsync<QrCodeInfoDto>("/api/qr", TestApp.Json);
        var pngBefore = await owner.GetByteArrayAsync("/api/qr/png?size=600");
        var svgBefore = await owner.GetStringAsync("/api/qr/svg");

        // Every kind of change the owner can make:
        await owner.PutAsJsonAsync("/api/profile", new { fullName = "Renamed Person", summary = "New summary" });
        var b = await (await owner.PostAsJsonAsync("/api/modes", Mode("Entrepreneur"))).Content.ReadFromJsonAsync<ModeDetailDto>(TestApp.Json);
        await owner.PutAsJsonAsync($"/api/modes/{a!.Id}", Mode("HR Updated"));
        await owner.PutAsJsonAsync($"/api/modes/{a.Id}/template", new { templateId = 3 });
        await owner.PostAsync($"/api/modes/{b!.Id}/default", null);
        await owner.PatchAsJsonAsync($"/api/modes/{a.Id}/publish", new { isPublished = false });

        var infoAfter = await owner.GetFromJsonAsync<QrCodeInfoDto>("/api/qr", TestApp.Json);
        var pngAfter = await owner.GetByteArrayAsync("/api/qr/png?size=600");
        var svgAfter = await owner.GetStringAsync("/api/qr/svg");

        Assert.Equal($"{TestApp.PublicBaseUrl}/p/{auth.User.PublicSlug}", infoBefore!.PermanentUrl);
        Assert.Equal(infoBefore.PermanentUrl, infoAfter!.PermanentUrl);
        Assert.Equal(infoBefore.QrReference, infoAfter.QrReference);
        Assert.Equal(infoBefore.GeneratedAt, infoAfter.GeneratedAt);
        Assert.Equal(pngBefore, pngAfter);
        Assert.Equal(svgBefore, svgAfter);

        // The same URL now resolves to the new default mode for new viewers.
        var profile = await app.CreateClient().GetFromJsonAsync<PublicProfileDto>($"/api/public/{auth.User.PublicSlug}", TestApp.Json);
        Assert.Equal(b.Id, profile!.DefaultModeId);
        Assert.Equal(infoBefore.PermanentUrl, profile.PermanentUrl);
    }

    [Fact]
    public async Task Manifest_starts_at_the_permanent_profile_path()
    {
        var (_, auth) = await app.RegisterAsync();
        var response = await app.CreateClient().GetAsync($"/api/public/{auth.User.PublicSlug}/manifest.webmanifest");
        Assert.Equal("application/manifest+json", response.Content.Headers.ContentType!.MediaType);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal($"/p/{auth.User.PublicSlug}", doc.RootElement.GetProperty("start_url").GetString());
        Assert.Equal("standalone", doc.RootElement.GetProperty("display").GetString());
        Assert.True(doc.RootElement.GetProperty("icons").GetArrayLength() >= 2);
    }

    [Fact]
    public async Task Qr_manifest_installs_the_full_screen_qr_page()
    {
        var (_, auth) = await app.RegisterAsync();
        var response = await app.CreateClient().GetAsync($"/api/public/{auth.User.PublicSlug}/qr-manifest.webmanifest");
        Assert.Equal("application/manifest+json", response.Content.Headers.ContentType!.MediaType);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal($"/q/{auth.User.PublicSlug}", doc.RootElement.GetProperty("start_url").GetString());
        Assert.Equal($"/q/{auth.User.PublicSlug}", doc.RootElement.GetProperty("scope").GetString());
        Assert.Equal("Quiree", doc.RootElement.GetProperty("short_name").GetString());
    }

    [Fact]
    public async Task Owner_preview_includes_unpublished_mode_but_public_does_not()
    {
        var (owner, auth) = await app.RegisterAsync();
        await owner.PostAsJsonAsync("/api/modes", Mode("Visible"));
        var hidden = await (await owner.PostAsJsonAsync("/api/modes", Mode("Draft", published: false))).Content.ReadFromJsonAsync<ModeDetailDto>(TestApp.Json);

        var preview = await owner.GetFromJsonAsync<PublicProfileDto>($"/api/modes/{hidden!.Id}/preview", TestApp.Json);
        Assert.Equal("Draft", Assert.Single(preview!.Modes).ModeName);

        var publicProfile = await app.CreateClient().GetFromJsonAsync<PublicProfileDto>($"/api/public/{auth.User.PublicSlug}", TestApp.Json);
        Assert.DoesNotContain(publicProfile!.Modes, m => m.ModeName == "Draft");
    }
}
