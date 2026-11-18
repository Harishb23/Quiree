using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProLink.Api.Infrastructure;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;

namespace ProLink.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/profile")]
public sealed class ProfileController(IProfileService profiles) : ControllerBase
{
    [HttpGet]
    public Task<ProfileDto> Get(CancellationToken ct) => profiles.GetAsync(User.GetUserId(), ct);

    [HttpPut]
    public Task<ProfileDto> Update(UpdateProfileRequest request, CancellationToken ct) =>
        profiles.UpdateAsync(User.GetUserId(), request, ct);

    [HttpPost("photo")]
    [RequestSizeLimit(3 * 1024 * 1024)]
    public async Task<ProfileDto> UploadPhoto(IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        return await profiles.UpdatePhotoAsync(User.GetUserId(), stream, file.FileName, file.Length, ct);
    }

    [HttpDelete("photo")]
    public Task<ProfileDto> RemovePhoto(CancellationToken ct) => profiles.RemovePhotoAsync(User.GetUserId(), ct);
}

[ApiController]
[Authorize]
[Route("api/modes")]
public sealed class ModesController(IProfileModeService modes, ITemplateService templates) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<ModeSummaryDto>> List(CancellationToken ct) => modes.ListAsync(User.GetUserId(), ct);

    [HttpGet("{id:guid}")]
    public Task<ModeDetailDto> Get(Guid id, CancellationToken ct) => modes.GetAsync(User.GetUserId(), id, ct);

    [HttpPost]
    public async Task<ActionResult<ModeDetailDto>> Create(ModeUpsertRequest request, CancellationToken ct)
    {
        var created = await modes.CreateAsync(User.GetUserId(), request, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public Task<ModeDetailDto> Update(Guid id, ModeUpsertRequest request, CancellationToken ct) =>
        modes.UpdateAsync(User.GetUserId(), id, request, ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await modes.DeleteAsync(User.GetUserId(), id, ct);
        return NoContent();
    }

    [HttpPatch("{id:guid}/publish")]
    public Task<ModeSummaryDto> SetPublished(Guid id, SetPublishedRequest request, CancellationToken ct) =>
        modes.SetPublishedAsync(User.GetUserId(), id, request.IsPublished, ct);

    [HttpPost("{id:guid}/default")]
    public Task<IReadOnlyList<ModeSummaryDto>> SetDefault(Guid id, CancellationToken ct) =>
        modes.SetDefaultAsync(User.GetUserId(), id, ct);

    [HttpPut("{id:guid}/template")]
    public Task<ModeSummaryDto> AssignTemplate(Guid id, AssignTemplateRequest request, CancellationToken ct) =>
        templates.AssignToModeAsync(User.GetUserId(), id, request.TemplateId, ct);

    [HttpGet("{id:guid}/preview")]
    public Task<PublicProfileDto> Preview(Guid id, CancellationToken ct) => modes.PreviewAsync(User.GetUserId(), id, ct);
}

[ApiController]
[Route("api/templates")]
public sealed class TemplatesController(ITemplateService templates) : ControllerBase
{
    /// <summary>Anonymous callers get the catalogue; signed-in users also get lock state for their plan.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IReadOnlyList<TemplateDto>> List(CancellationToken ct)
    {
        var auth = await HttpContext.AuthenticateAsync();
        return await templates.ListAsync(auth.Succeeded ? auth.Principal!.TryGetUserId() : null, ct);
    }
}

[ApiController]
[Authorize]
[Route("api/qr")]
public sealed class QrController(IQrCodeService qr) : ControllerBase
{
    [HttpGet]
    public Task<QrCodeInfoDto> Get(CancellationToken ct) => qr.GetForUserAsync(User.GetUserId(), ct);

    [HttpGet("png")]
    public async Task<IActionResult> Png([FromQuery] int size = 600, [FromQuery] bool download = false, CancellationToken ct = default)
    {
        var bytes = await qr.GetPngForUserAsync(User.GetUserId(), Math.Clamp(size, 150, 1200), ct);
        return download ? File(bytes, "image/png", "prolink-qr.png") : File(bytes, "image/png");
    }

    [HttpGet("svg")]
    public async Task<IActionResult> Svg([FromQuery] bool download = false, CancellationToken ct = default)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(await qr.GetSvgForUserAsync(User.GetUserId(), ct));
        return download ? File(bytes, "image/svg+xml", "prolink-qr.svg") : File(bytes, "image/svg+xml");
    }
}

[ApiController]
[Authorize]
[Route("api/dashboard")]
public sealed class DashboardController(IDashboardService dashboard) : ControllerBase
{
    [HttpGet]
    public Task<DashboardOverviewDto> Get(CancellationToken ct) => dashboard.GetOverviewAsync(User.GetUserId(), ct);
}

[ApiController]
[Authorize]
[Route("api/account")]
public sealed class AccountController(IAccountService account) : ControllerBase
{
    [HttpGet("public-settings")]
    public Task<PublicSettingsDto> GetSettings(CancellationToken ct) =>
        account.GetPublicSettingsAsync(User.GetUserId(), ct);

    [HttpPut("public-settings")]
    public Task<PublicSettingsDto> UpdateSettings(UpdatePublicSettingsRequest request, CancellationToken ct) =>
        account.UpdatePublicSettingsAsync(User.GetUserId(), request, ct);
}
