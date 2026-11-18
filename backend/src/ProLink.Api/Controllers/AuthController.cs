using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ProLink.Api.Infrastructure;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;

namespace ProLink.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService auth) : ControllerBase
{
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public Task<AuthResponse> Register(RegisterRequest request, CancellationToken ct) => auth.RegisterAsync(request, ct);

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public Task<AuthResponse> Login(LoginRequest request, CancellationToken ct) => auth.LoginAsync(request, ct);

    [HttpPost("google")]
    [EnableRateLimiting("auth")]
    public Task<AuthResponse> Google(GoogleLoginRequest request, CancellationToken ct) => auth.GoogleLoginAsync(request, ct);

    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken ct)
    {
        await auth.ForgotPasswordAsync(request, ct);
        return Ok(new { message = "If an account exists for this email, a reset link has been sent." });
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken ct)
    {
        await auth.ResetPasswordAsync(request, ct);
        return Ok(new { message = "Your password has been reset. You can now sign in." });
    }

    [HttpGet("username-available")]
    [EnableRateLimiting("public")]
    public Task<UsernameAvailabilityDto> UsernameAvailable([FromQuery] string username, CancellationToken ct) =>
        auth.CheckUsernameAsync(username, ct);

    [Authorize]
    [HttpGet("me")]
    public Task<CurrentUserDto> Me(CancellationToken ct) => auth.GetCurrentUserAsync(User.GetUserId(), ct);

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        await auth.ChangePasswordAsync(User.GetUserId(), request, ct);
        return NoContent();
    }

    /// <summary>JWTs are stateless; the client discards its token. Kept for API symmetry and auditing.</summary>
    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout() => NoContent();
}
