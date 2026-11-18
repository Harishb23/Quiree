using System.Net;
using System.Net.Http.Json;
using ProLink.Application.DTOs;
using ProLink.Domain.Enums;
using ProLink.Tests.Infrastructure;

namespace ProLink.Tests.Api;

public sealed class AccountTypeTests(TestApp app) : IClassFixture<TestApp>
{
    [Fact]
    public async Task Registration_records_the_account_type_and_returns_it_on_login()
    {
        var email = $"shop{Guid.NewGuid():N}@example.com";
        var (_, registered) = await app.RegisterBusinessAsync(email: email);
        Assert.Equal(AccountType.Business, registered.User.AccountType);

        var login = await app.CreateClient().PostAsJsonAsync("/api/auth/login", new { email, password = "Passw0rd!" });
        var auth = (await login.Content.ReadFromJsonAsync<AuthResponse>(TestApp.Json))!;
        Assert.Equal(AccountType.Business, auth.User.AccountType);

        var (_, personal) = await app.RegisterAsync();
        Assert.Equal(AccountType.Personal, personal.User.AccountType);
    }

    [Fact]
    public async Task One_email_is_one_account()
    {
        var email = $"both{Guid.NewGuid():N}@example.com";
        await app.RegisterAsync(email: email);
        var second = await app.CreateClient().PostAsJsonAsync("/api/auth/register",
            new { fullName = "Same Person", email, password = "Passw0rd!", accountType = "Business" });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Personal_accounts_cannot_use_business_endpoints()
    {
        var (personal, _) = await app.RegisterAsync();
        Assert.Equal(HttpStatusCode.OK, (await personal.GetAsync("/api/profile")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await personal.GetAsync("/api/modes")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await personal.GetAsync("/api/businesses/my-businesses")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await personal.PostAsJsonAsync("/api/businesses", BusinessApiTests.Business("Not allowed"))).StatusCode);
    }

    [Fact]
    public async Task Business_accounts_cannot_use_personal_profile_endpoints()
    {
        var (business, auth) = await app.RegisterBusinessAsync();
        Assert.Equal(HttpStatusCode.OK, (await business.GetAsync("/api/businesses/my-businesses")).StatusCode);
        foreach (var path in new[] { "/api/profile", "/api/modes", "/api/qr", "/api/dashboard", "/api/account/public-settings" })
            Assert.Equal(HttpStatusCode.Forbidden, (await business.GetAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await business.PostAsJsonAsync("/api/modes", ProfileAndModeApiTests.Mode("Developer"))).StatusCode);

        // A new business account has no public personal page.
        Assert.Equal(HttpStatusCode.NotFound, (await app.CreateClient().GetAsync($"/api/public/{auth.User.PublicSlug}")).StatusCode);
    }

    [Fact]
    public async Task Team_members_must_be_business_accounts()
    {
        var (owner, _) = await app.RegisterBusinessAsync();
        var business = (await (await owner.PostAsJsonAsync("/api/businesses", BusinessApiTests.Business("Team Shop")))
            .Content.ReadFromJsonAsync<BusinessDetailDto>(TestApp.Json))!;

        var personalEmail = $"p{Guid.NewGuid():N}@example.com";
        await app.RegisterAsync(email: personalEmail);
        var rejected = await owner.PostAsJsonAsync($"/api/businesses/{business.Id}/members", new { email = personalEmail, role = "Editor" });
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
        Assert.Contains("business account", await rejected.Content.ReadAsStringAsync());

        var businessEmail = $"b{Guid.NewGuid():N}@example.com";
        await app.RegisterBusinessAsync(email: businessEmail);
        Assert.Equal(HttpStatusCode.OK,
            (await owner.PostAsJsonAsync($"/api/businesses/{business.Id}/members", new { email = businessEmail, role = "Editor" })).StatusCode);
    }

    [Fact]
    public async Task Google_sign_up_creates_the_chosen_account_type()
    {
        app.Google.Tokens["g-biz"] = new Application.Interfaces.GoogleUserInfo($"sub{Guid.NewGuid():N}", $"g{Guid.NewGuid():N}@example.com", true, "Shop Owner", null);
        var response = await app.CreateClient().PostAsJsonAsync("/api/auth/google", new { idToken = "g-biz", accountType = "Business" });
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>(TestApp.Json))!;
        Assert.Equal(AccountType.Business, auth.User.AccountType);
    }
}
