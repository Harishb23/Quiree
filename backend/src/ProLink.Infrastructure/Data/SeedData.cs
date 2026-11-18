using Microsoft.EntityFrameworkCore;
using ProLink.Domain.Entities;

namespace ProLink.Infrastructure.Data;

/// <summary>Reference data managed through migrations (templates and subscription plans).</summary>
internal static class SeedData
{
    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProfileTemplate>().HasData(
            // Ids/keys are stable; names and display order follow the template design sheet.
            T(10, 1, "personal-branding", "Classic Professional", "Square portrait with a clean blue name card and contact tiles.", true),
            T(1, 2, "modern-glass", "Modern Glass", "Violet-blue frosted glass with icon skill tiles.", false),
            T(3, 3, "minimal", "Minimal White", "Crisp white, outline icons and simple skill chips.", false),
            T(2, 4, "premium-dark", "Premium Dark", "Black and gold luxury card with a glowing portrait ring.", true),
            T(5, 5, "gradient-glass", "Gradient Pro", "Vibrant magenta-purple gradient with service tiles.", true),
            T(6, 6, "creative-portfolio", "Creative Portfolio", "Artistic cover with a portfolio grid for creatives.", true),
            T(4, 7, "corporate", "Corporate Executive", "Skyline cover, navy accents and an experience focus.", false),
            T(8, 8, "split-layout", "Modern Split", "Large photo beside a navy panel with contact details.", true),
            T(9, 9, "neon-tech", "Neon Tech", "Cyber neon glow with stats and a featured project.", true),
            T(7, 10, "elegant-white", "Elegant Personal", "Warm cream and bronze with service tiles and client impact.", false));

        modelBuilder.Entity<SubscriptionPlan>().HasData(
            new SubscriptionPlan
            {
                Id = 1, Code = "free", Name = "Free", Description = "Get started with 2 profile modes and essential templates.",
                PriceInPaise = 0, Currency = "INR", DurationDays = 0, MaxModes = 2, AllowsPremiumTemplates = false,
                IsActive = true, SortOrder = 1
            },
            new SubscriptionPlan
            {
                Id = 2, Code = "pro-monthly", Name = "Pro Monthly", Description = "Up to 10 profile modes and all 10 premium templates.",
                PriceInPaise = 19900, Currency = "INR", DurationDays = 30, MaxModes = 10, AllowsPremiumTemplates = true,
                IsActive = true, SortOrder = 2
            },
            new SubscriptionPlan
            {
                Id = 3, Code = "pro-yearly", Name = "Pro Yearly", Description = "Everything in Pro, billed yearly (2 months free).",
                PriceInPaise = 199000, Currency = "INR", DurationDays = 365, MaxModes = 10, AllowsPremiumTemplates = true,
                IsActive = true, SortOrder = 3
            });
    }

    private static ProfileTemplate T(int id, int sortOrder, string key, string name, string description, bool premium) => new()
    {
        Id = id, Key = key, Name = name, Description = description, IsPremium = premium, IsActive = true, SortOrder = sortOrder
    };
}
