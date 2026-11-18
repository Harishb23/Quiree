using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using ProLink.Application.Interfaces;
using ProLink.Application.Services;
using ProLink.Domain.Entities;

namespace ProLink.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IProfileModeService, ProfileModeService>();
        services.AddScoped<ITemplateService, TemplateService>();
        services.AddScoped<IPublicProfileService, PublicProfileService>();
        services.AddScoped<IQrCodeService, QrCodeService>();
        services.AddScoped<ISubscriptionService, SubscriptionService>();
        services.AddScoped<IEnquiryService, EnquiryService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IAccountService, AccountService>();
        return services;
    }
}
