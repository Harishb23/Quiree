using ProLink.Application.DTOs;

namespace ProLink.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<AuthResponse> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken ct = default);
    Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default);
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default);
    Task<CurrentUserDto> GetCurrentUserAsync(Guid userId, CancellationToken ct = default);
    Task<UsernameAvailabilityDto> CheckUsernameAsync(string username, CancellationToken ct = default);
}

public interface IProfileService
{
    Task<ProfileDto> GetAsync(Guid userId, CancellationToken ct = default);
    Task<ProfileDto> UpdateAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct = default);
    Task<ProfileDto> UpdatePhotoAsync(Guid userId, Stream content, string fileName, long length, CancellationToken ct = default);
    Task<ProfileDto> RemovePhotoAsync(Guid userId, CancellationToken ct = default);
}

public interface IProfileModeService
{
    Task<IReadOnlyList<ModeSummaryDto>> ListAsync(Guid userId, CancellationToken ct = default);
    Task<ModeDetailDto> GetAsync(Guid userId, Guid modeId, CancellationToken ct = default);
    Task<ModeDetailDto> CreateAsync(Guid userId, ModeUpsertRequest request, CancellationToken ct = default);
    Task<ModeDetailDto> UpdateAsync(Guid userId, Guid modeId, ModeUpsertRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid modeId, CancellationToken ct = default);
    Task<ModeSummaryDto> SetPublishedAsync(Guid userId, Guid modeId, bool isPublished, CancellationToken ct = default);
    Task<IReadOnlyList<ModeSummaryDto>> SetDefaultAsync(Guid userId, Guid modeId, CancellationToken ct = default);
    /// <summary>Owner-only preview, rendered exactly as viewers would see it (even if unpublished).</summary>
    Task<PublicProfileDto> PreviewAsync(Guid userId, Guid modeId, CancellationToken ct = default);
}

public interface ITemplateService
{
    Task<IReadOnlyList<TemplateDto>> ListAsync(Guid? userId, CancellationToken ct = default);
    Task<ModeSummaryDto> AssignToModeAsync(Guid userId, Guid modeId, int templateId, CancellationToken ct = default);
}

public interface IPublicProfileService
{
    Task<PublicProfileDto> GetAsync(string slug, CancellationToken ct = default);
    Task<VCardFile> GetVCardAsync(string slug, Guid? modeId, CancellationToken ct = default);
    Task<string> GetManifestJsonAsync(string slug, CancellationToken ct = default);
    Task<string> GetQrManifestJsonAsync(string slug, CancellationToken ct = default);
}

public interface IQrCodeService
{
    Task<QrCodeInfoDto> GetForUserAsync(Guid userId, CancellationToken ct = default);
    Task<byte[]> GetPngForUserAsync(Guid userId, int size, CancellationToken ct = default);
    Task<string> GetSvgForUserAsync(Guid userId, CancellationToken ct = default);
}

public interface ISubscriptionService
{
    Task<IReadOnlyList<PlanDto>> ListPlansAsync(CancellationToken ct = default);
    Task<EntitlementsDto> GetEntitlementsAsync(Guid userId, CancellationToken ct = default);
    Task<SubscriptionStatusDto> GetStatusAsync(Guid userId, CancellationToken ct = default);
    Task<CreateOrderResponse> CreateOrderAsync(Guid userId, CreateOrderRequest request, CancellationToken ct = default);
    Task<SubscriptionStatusDto> VerifyPaymentAsync(Guid userId, VerifyPaymentRequest request, CancellationToken ct = default);
    Task HandleWebhookAsync(string payload, string signature, CancellationToken ct = default);
    Task<IReadOnlyList<PaymentDto>> GetPaymentHistoryAsync(Guid userId, CancellationToken ct = default);
    Task<int> ExpireDueSubscriptionsAsync(CancellationToken ct = default);
}

public interface IEnquiryService
{
    Task<EnquiryDto> CreateAsync(CreateEnquiryRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<EnquiryDto>> ListAsync(CancellationToken ct = default);
}

public interface IDashboardService
{
    Task<DashboardOverviewDto> GetOverviewAsync(Guid userId, CancellationToken ct = default);
}

public interface IAccountService
{
    Task<PublicSettingsDto> GetPublicSettingsAsync(Guid userId, CancellationToken ct = default);
    Task<PublicSettingsDto> UpdatePublicSettingsAsync(Guid userId, UpdatePublicSettingsRequest request, CancellationToken ct = default);
}
