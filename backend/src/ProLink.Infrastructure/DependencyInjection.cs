using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ProLink.Application.Common;
using ProLink.Application.Interfaces;
using ProLink.Infrastructure.Data;
using ProLink.Infrastructure.Repositories;
using ProLink.Infrastructure.Services;

namespace ProLink.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"),
                sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)
                          .EnableRetryOnFailure(3)));

        services.Configure<AppOptions>(configuration.GetSection(AppOptions.SectionName));
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<GoogleAuthOptions>(configuration.GetSection(GoogleAuthOptions.SectionName));
        services.Configure<RazorpayOptions>(configuration.GetSection(RazorpayOptions.SectionName));
        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IProfileRepository, ProfileRepository>();
        services.AddScoped<IProfileModeRepository, ProfileModeRepository>();
        services.AddScoped<ITemplateRepository, TemplateRepository>();
        services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
        services.AddScoped<IPaymentRepository, PaymentRepository>();
        services.AddScoped<IEnquiryRepository, EnquiryRepository>();

        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton<IGoogleTokenValidator, GoogleTokenValidator>();
        services.AddSingleton<IEmailSender, SmtpEmailSender>();
        services.AddSingleton<IQrCodeGenerator, QrCodeGeneratorService>();
        services.AddSingleton<IFileStorage, LocalFileStorage>();
        services.AddHttpClient<IRazorpayClient, RazorpayClient>(c =>
        {
            c.BaseAddress = new Uri("https://api.razorpay.com/v1/");
            c.Timeout = TimeSpan.FromSeconds(20);
        });

        return services;
    }
}
