using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ProLink.Tests.Infrastructure;

namespace ProLink.Tests.Api;

public sealed class HealthApiTests(TestApp app) : IClassFixture<TestApp>
{
    [Fact]
    public async Task Health_reports_application_status()
    {
        var response = await app.CreateClient().GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Healthy", body.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Database_health_reports_reachable_database()
    {
        var response = await app.CreateClient().GetAsync("/api/health/database");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Reachable", body.GetProperty("database").GetString());
    }
}
