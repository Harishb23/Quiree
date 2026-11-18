using System.Net;
using System.Net.Http.Json;
using ProLink.Application.DTOs;
using ProLink.Tests.Infrastructure;

namespace ProLink.Tests.Api;

public sealed class ProfileAndModeApiTests(TestApp app) : IClassFixture<TestApp>
{
    internal static object Mode(string name, string type = "General", bool published = true, int? templateId = null) => new
    {
        modeName = name,
        modeType = type,
        designation = $"{name} Lead",
        companyName = "Acme",
        summary = $"About {name}",
        isPublished = published,
        templateId,
        skills = new[] { new { name = "Recruitment", category = "HR" }, new { name = "recruitment", category = "HR" } },
        workExperiences = new[]
        {
            new { title = "Lead", company = "Acme", startDate = "2020-01-01", isCurrent = true, responsibilities = "Hiring\nPayroll" }
        },
        educations = new[] { new { degree = "MBA", institution = "IIM", startYear = 2015, endYear = 2017 } },
        projects = new[] { new { title = "Campaign", outcome = "+40% leads", url = "https://example.com" } },
        socialLinks = new[] { new { platform = "LinkedIn", url = "https://linkedin.com/in/me" } }
    };

    [Fact]
    public async Task Profile_can_be_read_and_updated_and_html_is_stripped()
    {
        var (client, _) = await app.RegisterAsync();

        var update = await client.PutAsJsonAsync("/api/profile", new
        {
            fullName = "Harish <b>Baskar</b>",
            email = "contact@example.com",
            mobile = "+91 98765 43210",
            location = "Pondicherry",
            website = "https://harish.dev",
            summary = "Builder <script>alert('x')</script>of things",
            socialLinks = new[] { new { platform = "GitHub", url = "https://github.com/harish" } }
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var profile = await client.GetFromJsonAsync<ProfileDto>("/api/profile", TestApp.Json);
        Assert.Equal("Harish Baskar", profile!.FullName);
        Assert.DoesNotContain("<script>", profile.Summary);
        Assert.Single(profile.SocialLinks);
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("data:text/html,hi")]
    [InlineData("not a url")]
    public async Task Unsafe_urls_are_rejected(string url)
    {
        var (client, _) = await app.RegisterAsync();
        var response = await client.PutAsJsonAsync("/api/profile", new
        {
            fullName = "Harish",
            socialLinks = new[] { new { platform = "LinkedIn", url } }
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Photo_upload_accepts_real_images_only()
    {
        var (client, _) = await app.RegisterAsync();
        byte[] png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0];

        using var good = new MultipartFormDataContent { { new ByteArrayContent(png), "file", "me.png" } };
        var ok = await client.PostAsync("/api/profile/photo", good);
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var dto = await ok.Content.ReadFromJsonAsync<ProfileDto>(TestApp.Json);
        Assert.StartsWith("/uploads/profiles/", dto!.PhotoUrl);
        Assert.EndsWith(".png", dto.PhotoUrl);

        using var fake = new MultipartFormDataContent { { new ByteArrayContent("<?php echo 1; ?>"u8.ToArray()), "file", "evil.png" } };
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/profile/photo", fake)).StatusCode);
    }

    [Fact]
    public async Task Modes_crud_with_independent_content_under_one_account()
    {
        var (client, _) = await app.RegisterAsync();

        var hr = await (await client.PostAsJsonAsync("/api/modes", Mode("HR Manager", "HR"))).Content.ReadFromJsonAsync<ModeDetailDto>(TestApp.Json);
        var dev = await (await client.PostAsJsonAsync("/api/modes", Mode("Software Developer", "Developer"))).Content.ReadFromJsonAsync<ModeDetailDto>(TestApp.Json);

        Assert.True(hr!.IsDefault);
        Assert.False(dev!.IsDefault);
        Assert.Single(hr.Skills); // duplicate skill (case-insensitive) collapsed
        Assert.Equal("Hiring\nPayroll", hr.WorkExperiences[0].Responsibilities);
        Assert.Equal("modern-glass", hr.TemplateKey);

        // Update replaces sections for one mode only
        var update = await client.PutAsJsonAsync($"/api/modes/{dev.Id}", new
        {
            modeName = "Software Developer",
            modeType = "Developer",
            designation = "Senior Engineer",
            isPublished = true,
            gitHubUrl = "https://github.com/harish",
            skills = new[] { new { name = "C#", category = "Programming Languages" } }
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var devAfter = await client.GetFromJsonAsync<ModeDetailDto>($"/api/modes/{dev.Id}", TestApp.Json);
        var hrAfter = await client.GetFromJsonAsync<ModeDetailDto>($"/api/modes/{hr.Id}", TestApp.Json);
        Assert.Equal("Senior Engineer", devAfter!.Designation);
        Assert.Empty(devAfter.WorkExperiences);
        Assert.Single(devAfter.Skills);
        Assert.Single(hrAfter!.WorkExperiences);

        var list = await client.GetFromJsonAsync<List<ModeSummaryDto>>("/api/modes", TestApp.Json);
        Assert.Equal(2, list!.Count);
    }

    [Fact]
    public async Task Duplicate_mode_names_are_rejected()
    {
        var (client, _) = await app.RegisterAsync();
        await client.PostAsJsonAsync("/api/modes", Mode("Consultant"));
        var dup = await client.PostAsJsonAsync("/api/modes", Mode("Consultant"));
        Assert.Equal(HttpStatusCode.Conflict, dup.StatusCode);
    }

    [Fact]
    public async Task Free_plan_limits_modes_and_premium_templates()
    {
        var (client, _) = await app.RegisterAsync();
        await client.PostAsJsonAsync("/api/modes", Mode("One"));
        var two = await (await client.PostAsJsonAsync("/api/modes", Mode("Two"))).Content.ReadFromJsonAsync<ModeDetailDto>(TestApp.Json);

        var third = await client.PostAsJsonAsync("/api/modes", Mode("Three"));
        Assert.Equal(HttpStatusCode.PaymentRequired, third.StatusCode);

        // Template 2 (premium-dark) is premium; template 3 (minimal) is free.
        var premium = await client.PutAsJsonAsync($"/api/modes/{two!.Id}/template", new { templateId = 2 });
        Assert.Equal(HttpStatusCode.PaymentRequired, premium.StatusCode);
        var free = await client.PutAsJsonAsync($"/api/modes/{two.Id}/template", new { templateId = 3 });
        Assert.Equal(HttpStatusCode.OK, free.StatusCode);
        Assert.Equal("minimal", (await free.Content.ReadFromJsonAsync<ModeSummaryDto>(TestApp.Json))!.TemplateKey);
    }

    [Fact]
    public async Task Default_mode_can_be_changed_and_deleting_default_promotes_another()
    {
        var (client, _) = await app.RegisterAsync();
        var a = await (await client.PostAsJsonAsync("/api/modes", Mode("Alpha"))).Content.ReadFromJsonAsync<ModeDetailDto>(TestApp.Json);
        var b = await (await client.PostAsJsonAsync("/api/modes", Mode("Beta", published: false))).Content.ReadFromJsonAsync<ModeDetailDto>(TestApp.Json);

        var modes = await (await client.PostAsync($"/api/modes/{b!.Id}/default", null)).Content.ReadFromJsonAsync<List<ModeSummaryDto>>(TestApp.Json);
        Assert.True(modes!.Single(m => m.Id == b.Id).IsDefault);
        Assert.True(modes!.Single(m => m.Id == b.Id).IsPublished); // default is always published
        Assert.Single(modes!, m => m.IsDefault);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/modes/{b.Id}")).StatusCode);
        var remaining = await client.GetFromJsonAsync<List<ModeSummaryDto>>("/api/modes", TestApp.Json);
        Assert.Equal(a!.Id, Assert.Single(remaining!).Id);
        Assert.True(remaining![0].IsDefault);
    }

    [Fact]
    public async Task Users_cannot_access_each_others_modes()
    {
        var (owner, _) = await app.RegisterAsync();
        var (intruder, _) = await app.RegisterAsync();
        var mode = await (await owner.PostAsJsonAsync("/api/modes", Mode("Private"))).Content.ReadFromJsonAsync<ModeDetailDto>(TestApp.Json);

        Assert.Equal(HttpStatusCode.NotFound, (await intruder.GetAsync($"/api/modes/{mode!.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await intruder.PutAsJsonAsync($"/api/modes/{mode.Id}", Mode("Hijack"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await intruder.DeleteAsync($"/api/modes/{mode.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync($"/api/modes/{mode.Id}")).StatusCode);
    }

    [Fact]
    public async Task Validation_errors_are_returned_for_invalid_mode_payloads()
    {
        var (client, _) = await app.RegisterAsync();
        var response = await client.PostAsJsonAsync("/api/modes", new
        {
            modeName = "X",
            contactEmail = "not-an-email",
            workExperiences = new[] { new { title = "", company = "" } }
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("ModeName", body);
        Assert.Contains("ContactEmail", body);
    }
}
