
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

using ProLink.Api.Infrastructure;
using ProLink.Application;
using ProLink.Application.Common;
using ProLink.Infrastructure;
using ProLink.Infrastructure.Data;
using ProLink.Infrastructure.Services;

// =====================================================
// 1. APPLICATION BUILDER
// =====================================================

var builder = WebApplication.CreateBuilder(args);

var config = builder.Configuration;
var environment = builder.Environment;

// =====================================================
// 2. APPLICATION AND INFRASTRUCTURE SERVICES
// =====================================================

builder.Services.AddApplication();
builder.Services.AddInfrastructure(config);

// =====================================================
// 3. FILE STORAGE CONFIGURATION
// =====================================================

var webRoot = environment.WebRootPath
    ?? Path.Combine(environment.ContentRootPath, "wwwroot");

var uploadPath = Path.Combine(webRoot, "uploads");

builder.Services.Configure<StorageOptions>(options =>
{
    options.RootPath = uploadPath;
});

// =====================================================
// 4. CONTROLLERS AND JSON CONFIGURATION
// =====================================================

builder.Services.AddControllers(options =>
{
    options.Filters.Add<InputSanitizationFilter>();
})
.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(
        new JsonStringEnumConverter());
});

// =====================================================
// 5. EXCEPTION HANDLING
// =====================================================

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// =====================================================
// 6. BACKGROUND SERVICES
// =====================================================

builder.Services.AddHostedService<SubscriptionExpiryWorker>();

// =====================================================
// 7. DATABASE CONNECTION VALIDATION
// =====================================================

var connectionString =
    config.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection is missing. " +
        "Configure it in MonsterASP environment variables.");
}

// =====================================================
// 8. JWT AUTHENTICATION
// =====================================================

var jwt = config.GetSection(JwtOptions.SectionName)
    .Get<JwtOptions>() ?? new JwtOptions();

if (string.IsNullOrWhiteSpace(jwt.SigningKey) ||
    Encoding.UTF8.GetByteCount(jwt.SigningKey) < 32)
{
    throw new InvalidOperationException(
        "Jwt:SigningKey must contain at least 32 bytes.");
}

if (string.IsNullOrWhiteSpace(jwt.Issuer) ||
    string.IsNullOrWhiteSpace(jwt.Audience))
{
    throw new InvalidOperationException(
        "Jwt:Issuer and Jwt:Audience must be configured.");
}

var jwtKey = new SymmetricSecurityKey(
    Encoding.UTF8.GetBytes(jwt.SigningKey));

builder.Services
    .AddAuthentication(
        JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;

        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwt.Issuer,

                ValidateAudience = true,
                ValidAudience = jwt.Audience,

                ValidateIssuerSigningKey = true,
                IssuerSigningKey = jwtKey,

                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1),

                NameClaimType = "sub",
                RoleClaimType = ClaimTypes.Role
            };
    });

builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, AccountTypeHandler>();
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AccountPolicies.Personal, p => p.RequireAuthenticatedUser()
        .AddRequirements(new AccountTypeRequirement(ProLink.Domain.Enums.AccountType.Personal)));
    options.AddPolicy(AccountPolicies.Business, p => p.RequireAuthenticatedUser()
        .AddRequirements(new AccountTypeRequirement(ProLink.Domain.Enums.AccountType.Business)));
});

// =====================================================
// 9. RATE LIMITING
// =====================================================

var authPermits =
    config.GetValue<int?>(
        "RateLimiting:AuthPerMinute") ?? 10;

var publicPermits =
    config.GetValue<int?>(
        "RateLimiting:PublicPerMinute") ?? 120;

var enquiryPermits =
    config.GetValue<int?>(
        "RateLimiting:EnquiryPer10Minutes") ?? 5;

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode =
        StatusCodes.Status429TooManyRequests;

    static string GetClientIp(HttpContext context)
    {
        return context.Connection.RemoteIpAddress?.ToString()
            ?? "unknown";
    }

    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetClientIp(context),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = authPermits,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.AddPolicy("public", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetClientIp(context),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = publicPermits,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.AddPolicy("enquiry", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetClientIp(context),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = enquiryPermits,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

// =====================================================
// 10. CORS
// =====================================================

var origins =
    config.GetSection("Cors:AllowedOrigins")
        .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("ProductionCors", policy =>
    {
        if (origins.Length > 0)
        {
            policy
                .WithOrigins(origins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .WithExposedHeaders("Content-Disposition");
        }
    });
});

// =====================================================
// 11. SWAGGER
// =====================================================

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Quiree API",
        Version = "v1",
        Description = "Quiree REST API"
    });

    options.AddSecurityDefinition("Bearer",
        new OpenApiSecurityScheme
        {
            Description = "Enter JWT Bearer token",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header
        });

    options.AddSecurityRequirement(
        new OpenApiSecurityRequirement
        {
            [
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                }
            ] = Array.Empty<string>()
        });
});

// =====================================================
// 12. BUILD APPLICATION
// =====================================================

var app = builder.Build();

// =====================================================
// 13. DATABASE MIGRATIONS
// =====================================================

if (config.GetValue<bool>(
    "Database:MigrateOnStartup"))
{
    try
    {
        using var scope = app.Services.CreateScope();

        var dbContext =
            scope.ServiceProvider
                .GetRequiredService<AppDbContext>();

        dbContext.Database.Migrate();
    }
    catch (Exception ex)
    {
        app.Logger.LogCritical(
            ex,
            "Database migration failed during startup.");

        throw;
    }
}

// =====================================================
// 14. EXCEPTION HANDLING
// =====================================================

app.UseExceptionHandler();

// =====================================================
// 15. PRODUCTION SECURITY
// =====================================================

if (environment.IsProduction())
{
    app.UseHsts();
}

app.UseHttpsRedirection();

// =====================================================
// 16. SWAGGER
// =====================================================

if (environment.IsDevelopment() ||
    config.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint(
            "/swagger/v1/swagger.json",
            "Quiree API v1");

        options.RoutePrefix = "swagger";
    });
}

// =====================================================
// 17. SECURITY HEADERS
// =====================================================

app.Use(async (context, next) =>
{
    context.Response.Headers.XContentTypeOptions =
        "nosniff";

    context.Response.Headers["Referrer-Policy"] =
        "strict-origin-when-cross-origin";

    context.Response.Headers["X-Frame-Options"] =
        "DENY";

    await next();
});

// =====================================================
// 18. UPLOAD DIRECTORY
// =====================================================

Directory.CreateDirectory(uploadPath);

// =====================================================
// 19. STATIC FILES
// =====================================================
app.UseDefaultFiles();

// Serve React CSS, JS and other static assets
app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider =
        new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
            uploadPath),

    RequestPath = "/uploads",

    OnPrepareResponse = context =>
    {
        context.Context.Response.Headers.CacheControl =
            "public,max-age=604800";
    }
});

// =====================================================
// 20. CORS
// =====================================================

app.UseCors("ProductionCors");

// =====================================================
// 21. RATE LIMITING
// =====================================================

app.UseRateLimiter();

// =====================================================
// 22. AUTHENTICATION
// =====================================================

app.UseAuthentication();

// =====================================================
// 23. AUTHORIZATION
// =====================================================

app.UseAuthorization();

// =====================================================
// 24. API CONTROLLERS
// =====================================================

app.MapControllers();
app.MapFallbackToFile("index.html");
// =====================================================
// 25. ROOT ENDPOINT
// =====================================================


// =====================================================
// 26. APPLICATION HEALTH CHECK
// =====================================================

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "Healthy",
    timestamp = DateTime.UtcNow
}));

// =====================================================
// 27. DATABASE HEALTH CHECK
// =====================================================

app.MapGet("/api/health/database", async (
    AppDbContext db,
    ILogger<Program> logger,
    CancellationToken ct) =>
{
    try
    {
        using var timeout =
            CancellationTokenSource.CreateLinkedTokenSource(ct);

        timeout.CancelAfter(TimeSpan.FromSeconds(10));

        if (await db.Database.CanConnectAsync(timeout.Token))
        {
            return Results.Ok(new
            {
                status = "Healthy",
                database = "Reachable",
                timestamp = DateTime.UtcNow
            });
        }

        logger.LogWarning(
            "Database health check: connection refused");
    }
    catch (Exception ex) when (
        ex is not OperationCanceledException ||
        !ct.IsCancellationRequested)
    {
        logger.LogError(
            ex,
            "Database health check failed");
    }

    return Results.Json(
        new
        {
            status = "Unhealthy",
            database = "Unreachable",
            timestamp = DateTime.UtcNow
        },
        statusCode:
            StatusCodes.Status503ServiceUnavailable);
})
.RequireRateLimiting("public");

// =====================================================
// 28. START APPLICATION
// =====================================================
// Serve React index.html by default

app.Run();

public partial class Program;
