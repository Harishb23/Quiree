using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Tests.Infrastructure;

namespace ProLink.Tests.Api;

public sealed class AuthApiTests(TestApp app) : IClassFixture<TestApp>
{
    [Fact]
    public async Task Register_creates_account_with_permanent_url_and_token()
    {
        var (_, auth) = await app.RegisterAsync(username: "harish-dev");

        Assert.False(string.IsNullOrEmpty(auth.AccessToken));
        Assert.Equal("harish-dev", auth.User.PublicSlug);
        Assert.Equal($"{TestApp.PublicBaseUrl}/p/harish-dev", auth.User.PublicUrl);
        Assert.True(auth.User.HasPassword);
    }

    [Fact]
    public async Task Register_generates_unique_slug_when_username_omitted()
    {
        var (_, a) = await app.RegisterAsync();
        var (_, b) = await app.RegisterAsync();
        Assert.StartsWith("harish-baskar", a.User.PublicSlug);
        Assert.NotEqual(a.User.PublicSlug, b.User.PublicSlug);
    }

    [Fact]
    public async Task Register_rejects_duplicate_email_and_taken_username()
    {
        await app.RegisterAsync(username: "taken-name", email: "dup@example.com");
        var client = app.CreateClient();

        var dupEmail = await client.PostAsJsonAsync("/api/auth/register",
            new { fullName = "Someone", email = "DUP@example.com", password = "Passw0rd!" });
        Assert.Equal(HttpStatusCode.Conflict, dupEmail.StatusCode);

        var dupSlug = await client.PostAsJsonAsync("/api/auth/register",
            new { fullName = "Someone", email = "other@example.com", password = "Passw0rd!", username = "taken-name" });
        Assert.Equal(HttpStatusCode.Conflict, dupSlug.StatusCode);
    }

    [Theory]
    [InlineData("short1")]
    [InlineData("lettersonly")]
    [InlineData("12345678")]
    public async Task Register_rejects_weak_passwords(string password)
    {
        var response = await app.CreateClient().PostAsJsonAsync("/api/auth/register",
            new { fullName = "Weak", email = $"{Guid.NewGuid():N}@example.com", password });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_succeeds_with_correct_password_and_fails_otherwise()
    {
        var email = $"{Guid.NewGuid():N}@example.com";
        await app.RegisterAsync(email: email);
        var client = app.CreateClient();

        var ok = await client.PostAsJsonAsync("/api/auth/login", new { email, password = "Passw0rd!" });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        var bad = await client.PostAsJsonAsync("/api/auth/login", new { email, password = "Wrong-pass1" });
        Assert.Equal(HttpStatusCode.Unauthorized, bad.StatusCode);

        var unknown = await client.PostAsJsonAsync("/api/auth/login", new { email = "nobody@example.com", password = "Passw0rd!" });
        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
    }

    [Fact]
    public async Task Protected_endpoints_require_a_valid_token()
    {
        var anonymous = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/modes")).StatusCode);

        anonymous.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "not-a-jwt");
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/auth/me")).StatusCode);

        var (client, auth) = await app.RegisterAsync();
        var me = await client.GetFromJsonAsync<CurrentUserDto>("/api/auth/me", TestApp.Json);
        Assert.Equal(auth.User.Id, me!.Id);
    }

    [Fact]
    public async Task Forgot_and_reset_password_flow()
    {
        var email = $"{Guid.NewGuid():N}@example.com";
        await app.RegisterAsync(email: email);
        var client = app.CreateClient();

        var forgot = await client.PostAsJsonAsync("/api/auth/forgot-password", new { email });
        Assert.Equal(HttpStatusCode.OK, forgot.StatusCode);
        var mail = app.Emails.Sent.Last(m => m.To == email);
        var token = Uri.UnescapeDataString(Regex.Match(mail.Body, "token=([^\"&]+)").Groups[1].Value);

        var badReset = await client.PostAsJsonAsync("/api/auth/reset-password", new { email, token = "wrong", newPassword = "NewPassw0rd" });
        Assert.Equal(HttpStatusCode.BadRequest, badReset.StatusCode);

        var reset = await client.PostAsJsonAsync("/api/auth/reset-password", new { email, token, newPassword = "NewPassw0rd" });
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);

        // Token is single use
        var reuse = await client.PostAsJsonAsync("/api/auth/reset-password", new { email, token, newPassword = "Another1pass" });
        Assert.Equal(HttpStatusCode.BadRequest, reuse.StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PostAsJsonAsync("/api/auth/login", new { email, password = "Passw0rd!" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await client.PostAsJsonAsync("/api/auth/login", new { email, password = "NewPassw0rd" })).StatusCode);
    }

    [Fact]
    public async Task Forgot_password_does_not_reveal_unknown_emails()
    {
        var response = await app.CreateClient().PostAsJsonAsync("/api/auth/forgot-password", new { email = "ghost@example.com" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain(app.Emails.Sent, m => m.To == "ghost@example.com");
    }

    [Fact]
    public async Task Google_sign_in_creates_account_then_logs_in_same_user()
    {
        var email = $"{Guid.NewGuid():N}@gmail.com";
        app.Google.Tokens["valid-google-token"] = new GoogleUserInfo("google-sub-1", email, true, "Google User", null);
        var client = app.CreateClient();

        var first = await (await client.PostAsJsonAsync("/api/auth/google", new { idToken = "valid-google-token" }))
            .Content.ReadFromJsonAsync<AuthResponse>(TestApp.Json);
        var second = await (await client.PostAsJsonAsync("/api/auth/google", new { idToken = "valid-google-token" }))
            .Content.ReadFromJsonAsync<AuthResponse>(TestApp.Json);

        Assert.Equal(first!.User.Id, second!.User.Id);
        Assert.True(first.User.HasGoogle);
        Assert.False(first.User.HasPassword);

        var invalid = await client.PostAsJsonAsync("/api/auth/google", new { idToken = "forged" });
        Assert.Equal(HttpStatusCode.Unauthorized, invalid.StatusCode);
    }
}
