using System.Collections;
using System.Net;
using System.Reflection;
using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using ProLink.Application.Common;
using ProLink.Application.Interfaces;

namespace ProLink.Api.Infrastructure;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue("sub");
        return Guid.TryParse(value, out var id) ? id : throw new UnauthorizedAppException("Not authenticated.");
    }

    public static Guid? TryGetUserId(this ClaimsPrincipal principal) =>
        Guid.TryParse(principal.FindFirstValue("sub"), out var id) ? id : null;
}

/// <summary>Maps business exceptions to RFC 7807 problem responses and hides unexpected errors.</summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IHostEnvironment env) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var (status, title, detail) = exception switch
        {
            AppException app => (app.StatusCode, Title(app.StatusCode), app.Message),
            BadHttpRequestException bad => (bad.StatusCode, "Bad request", bad.Message),
            OperationCanceledException => (499, "Request cancelled", "The request was cancelled."),
            _ => (500, "Server error", "Something went wrong on our side. Please try again.")
        };

        if (status >= 500)
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);

        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = status >= 500 && env.IsDevelopment() ? exception.Message : detail,
            Instance = context.Request.Path
        }, ct);
        return true;
    }

    private static string Title(int status) => status switch
    {
        400 => "Validation failed",
        401 => "Unauthorized",
        402 => "Upgrade required",
        403 => "Forbidden",
        404 => "Not found",
        409 => "Conflict",
        _ => "Error"
    };
}

/// <summary>Strips HTML tags from every string on incoming DTOs (except [NoSanitize] properties).</summary>
public sealed partial class InputSanitizationFilter : IActionFilter
{
    [GeneratedRegex("<[^>]*>", RegexOptions.Compiled)]
    private static partial Regex HtmlTag();

    public void OnActionExecuting(ActionExecutingContext context)
    {
        foreach (var key in context.ActionArguments.Keys.ToList())
        {
            var value = context.ActionArguments[key];
            if (value is string s) context.ActionArguments[key] = Clean(s);
            else if (value is not null) Sanitize(value, 0);
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }

    public static string Clean(string value) => HtmlTag().Replace(WebUtility.HtmlDecode(value), string.Empty).Trim();

    private static void Sanitize(object target, int depth)
    {
        var type = target.GetType();
        if (depth > 5 || type.Namespace?.StartsWith("ProLink.Application.DTOs", StringComparison.Ordinal) != true) return;

        foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (!prop.CanRead || prop.GetIndexParameters().Length > 0) continue;
            var value = prop.GetValue(target);
            if (value is string s && prop.CanWrite && prop.GetCustomAttribute<NoSanitizeAttribute>() is null)
                prop.SetValue(target, Clean(s));
            else if (value is IEnumerable list and not string)
                foreach (var item in list) if (item is not null) Sanitize(item, depth + 1);
            else if (value is not null && !prop.PropertyType.IsValueType)
                Sanitize(value, depth + 1);
        }
    }
}

/// <summary>Periodically marks subscriptions whose period has ended as expired.</summary>
public sealed class SubscriptionExpiryWorker(IServiceScopeFactory scopes, ILogger<SubscriptionExpiryWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Shared hosting recycles idle app pools; don't hit the database while the app is still warming up.
        try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); }
        catch (OperationCanceledException) { return; }

        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var expired = await scope.ServiceProvider.GetRequiredService<ISubscriptionService>()
                    .ExpireDueSubscriptionsAsync(stoppingToken);
                if (expired > 0) logger.LogInformation("Expired {Count} subscriptions", expired);
            }
            catch (Microsoft.Data.SqlClient.SqlException ex)
            {
                // Logged, not rethrown: the next hourly run retries, and the API keeps serving requests.
                logger.LogError(ex, "Subscription expiry run failed: SQL error {SqlErrorNumber} on {DataSource}",
                    ex.Number, ex.Server);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Subscription expiry run failed");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
