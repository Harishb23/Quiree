using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;

namespace ProLink.Infrastructure.Data.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.ToTable("Users");
        b.Property(x => x.Email).HasMaxLength(256).IsRequired();
        b.Property(x => x.NormalizedEmail).HasMaxLength(256).IsRequired();
        b.Property(x => x.PasswordHash).HasMaxLength(500);
        b.Property(x => x.GoogleSubject).HasMaxLength(100);
        b.Property(x => x.PublicSlug).HasMaxLength(30).IsRequired();
        b.Property(x => x.PasswordResetTokenHash).HasMaxLength(128);
        b.Property(x => x.AccountType).HasDefaultValue(AccountType.Personal);

        b.HasIndex(x => x.NormalizedEmail).IsUnique();
        b.HasIndex(x => x.PublicSlug).IsUnique();
        b.HasIndex(x => x.GoogleSubject).IsUnique().HasFilter("[GoogleSubject] IS NOT NULL");

        b.HasOne(x => x.Profile).WithOne(x => x.User)
            .HasForeignKey<UserProfile>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.PublicSettings).WithOne(x => x.User)
            .HasForeignKey<PublicProfileSettings>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Modes).WithOne(x => x.User)
            .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Subscriptions).WithOne(x => x.User)
            .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Payments).WithOne(x => x.User)
            .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class UserProfileConfiguration : IEntityTypeConfiguration<UserProfile>
{
    public void Configure(EntityTypeBuilder<UserProfile> b)
    {
        b.ToTable("UserProfiles");
        b.HasIndex(x => x.UserId).IsUnique();
        b.Property(x => x.FullName).HasMaxLength(100).IsRequired();
        b.Property(x => x.PhotoUrl).HasMaxLength(500);
        b.Property(x => x.Email).HasMaxLength(256);
        b.Property(x => x.Mobile).HasMaxLength(30);
        b.Property(x => x.Location).HasMaxLength(150);
        b.Property(x => x.Website).HasMaxLength(300);
        b.Property(x => x.Summary).HasMaxLength(2000);
        b.HasMany(x => x.SocialLinks).WithOne(x => x.UserProfile)
            .HasForeignKey(x => x.UserProfileId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class PublicProfileSettingsConfiguration : IEntityTypeConfiguration<PublicProfileSettings>
{
    public void Configure(EntityTypeBuilder<PublicProfileSettings> b)
    {
        b.ToTable("PublicProfileSettings");
        b.HasIndex(x => x.UserId).IsUnique();
        b.HasIndex(x => x.QrReference).IsUnique();
        b.HasIndex(x => x.PermanentUrl).IsUnique();
        b.Property(x => x.PermanentUrl).HasMaxLength(300).IsRequired();
        b.Property(x => x.QrReference).HasMaxLength(32).IsRequired();
    }
}

public sealed class ProfileModeConfiguration : IEntityTypeConfiguration<ProfileMode>
{
    public void Configure(EntityTypeBuilder<ProfileMode> b)
    {
        b.ToTable("ProfileModes");
        b.Property(x => x.ModeName).HasMaxLength(60).IsRequired();
        b.Property(x => x.Designation).HasMaxLength(120);
        b.Property(x => x.CompanyName).HasMaxLength(150);
        b.Property(x => x.Summary).HasMaxLength(3000);
        b.Property(x => x.ContactEmail).HasMaxLength(256);
        b.Property(x => x.ContactPhone).HasMaxLength(30);
        b.Property(x => x.Location).HasMaxLength(150);
        b.Property(x => x.Website).HasMaxLength(300);
        b.Property(x => x.BusinessName).HasMaxLength(150);
        b.Property(x => x.Industry).HasMaxLength(100);
        b.Property(x => x.BusinessDescription).HasMaxLength(3000);
        b.Property(x => x.CompanyWebsite).HasMaxLength(300);
        b.Property(x => x.GitHubUrl).HasMaxLength(300);

        b.HasIndex(x => new { x.UserId, x.ModeName }).IsUnique();
        b.HasIndex(x => new { x.UserId, x.IsPublished, x.SortOrder });

        b.HasMany(x => x.Skills).WithOne(x => x.ProfileMode).HasForeignKey(x => x.ProfileModeId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.WorkExperiences).WithOne(x => x.ProfileMode).HasForeignKey(x => x.ProfileModeId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Educations).WithOne(x => x.ProfileMode).HasForeignKey(x => x.ProfileModeId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Projects).WithOne(x => x.ProfileMode).HasForeignKey(x => x.ProfileModeId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Achievements).WithOne(x => x.ProfileMode).HasForeignKey(x => x.ProfileModeId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Certifications).WithOne(x => x.ProfileMode).HasForeignKey(x => x.ProfileModeId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Services).WithOne(x => x.ProfileMode).HasForeignKey(x => x.ProfileModeId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.CustomSections).WithOne(x => x.ProfileMode).HasForeignKey(x => x.ProfileModeId).OnDelete(DeleteBehavior.Cascade);
        // SQL Server disallows a second cascade path (Users -> Modes -> SocialLinks); the app deletes these explicitly.
        b.HasMany(x => x.SocialLinks).WithOne(x => x.ProfileMode).HasForeignKey(x => x.ProfileModeId).OnDelete(DeleteBehavior.ClientCascade);
        b.HasOne(x => x.TemplateMapping).WithOne(x => x.ProfileMode)
            .HasForeignKey<ModeTemplateMapping>(x => x.ProfileModeId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ProfileSkillConfiguration : IEntityTypeConfiguration<ProfileSkill>
{
    public void Configure(EntityTypeBuilder<ProfileSkill> b)
    {
        b.ToTable("ProfileSkills");
        b.Property(x => x.Name).HasMaxLength(80).IsRequired();
        b.Property(x => x.Category).HasMaxLength(80);
        b.HasIndex(x => new { x.ProfileModeId, x.SortOrder });
    }
}

public sealed class WorkExperienceConfiguration : IEntityTypeConfiguration<WorkExperience>
{
    public void Configure(EntityTypeBuilder<WorkExperience> b)
    {
        b.ToTable("WorkExperiences");
        b.Property(x => x.Title).HasMaxLength(120).IsRequired();
        b.Property(x => x.Company).HasMaxLength(150).IsRequired();
        b.Property(x => x.Location).HasMaxLength(150);
        b.Property(x => x.Description).HasMaxLength(2000);
        b.Property(x => x.Responsibilities).HasMaxLength(4000);
        b.HasIndex(x => new { x.ProfileModeId, x.SortOrder });
    }
}

public sealed class EducationDetailConfiguration : IEntityTypeConfiguration<EducationDetail>
{
    public void Configure(EntityTypeBuilder<EducationDetail> b)
    {
        b.ToTable("EducationDetails");
        b.Property(x => x.Degree).HasMaxLength(150).IsRequired();
        b.Property(x => x.Institution).HasMaxLength(200).IsRequired();
        b.Property(x => x.FieldOfStudy).HasMaxLength(150);
        b.Property(x => x.Grade).HasMaxLength(50);
        b.Property(x => x.Description).HasMaxLength(1000);
        b.HasIndex(x => new { x.ProfileModeId, x.SortOrder });
    }
}

public sealed class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> b)
    {
        b.ToTable("Projects");
        b.Property(x => x.Title).HasMaxLength(150).IsRequired();
        b.Property(x => x.Role).HasMaxLength(120);
        b.Property(x => x.Description).HasMaxLength(2000);
        b.Property(x => x.TechStack).HasMaxLength(300);
        b.Property(x => x.Outcome).HasMaxLength(1000);
        b.Property(x => x.Url).HasMaxLength(500);
        b.HasIndex(x => new { x.ProfileModeId, x.SortOrder });
    }
}

public sealed class AchievementConfiguration : IEntityTypeConfiguration<Achievement>
{
    public void Configure(EntityTypeBuilder<Achievement> b)
    {
        b.ToTable("Achievements");
        b.Property(x => x.Title).HasMaxLength(200).IsRequired();
        b.Property(x => x.Description).HasMaxLength(1000);
        b.HasIndex(x => new { x.ProfileModeId, x.SortOrder });
    }
}

public sealed class CertificationConfiguration : IEntityTypeConfiguration<Certification>
{
    public void Configure(EntityTypeBuilder<Certification> b)
    {
        b.ToTable("Certifications");
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Issuer).HasMaxLength(150);
        b.Property(x => x.CredentialUrl).HasMaxLength(500);
        b.HasIndex(x => new { x.ProfileModeId, x.SortOrder });
    }
}

public sealed class OfferedServiceConfiguration : IEntityTypeConfiguration<OfferedService>
{
    public void Configure(EntityTypeBuilder<OfferedService> b)
    {
        b.ToTable("Services");
        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Description).HasMaxLength(1000);
        b.HasIndex(x => new { x.ProfileModeId, x.SortOrder });
    }
}

public sealed class CustomSectionConfiguration : IEntityTypeConfiguration<CustomSection>
{
    public void Configure(EntityTypeBuilder<CustomSection> b)
    {
        b.ToTable("CustomSections");
        b.Property(x => x.Title).HasMaxLength(100).IsRequired();
        b.Property(x => x.Content).HasMaxLength(4000).IsRequired();
        b.HasIndex(x => new { x.ProfileModeId, x.SortOrder });
    }
}

public sealed class SocialLinkConfiguration : IEntityTypeConfiguration<SocialLink>
{
    public void Configure(EntityTypeBuilder<SocialLink> b)
    {
        b.ToTable("SocialLinks", t => t.HasCheckConstraint("CK_SocialLinks_SingleOwner",
            "([UserProfileId] IS NOT NULL AND [ProfileModeId] IS NULL) OR ([UserProfileId] IS NULL AND [ProfileModeId] IS NOT NULL)"));
        b.Property(x => x.Url).HasMaxLength(500).IsRequired();
        b.HasIndex(x => new { x.UserProfileId, x.Platform }).IsUnique().HasFilter("[UserProfileId] IS NOT NULL");
        b.HasIndex(x => new { x.ProfileModeId, x.Platform }).IsUnique().HasFilter("[ProfileModeId] IS NOT NULL");
    }
}

public sealed class ProfileTemplateConfiguration : IEntityTypeConfiguration<ProfileTemplate>
{
    public void Configure(EntityTypeBuilder<ProfileTemplate> b)
    {
        b.ToTable("ProfileTemplates");
        b.Property(x => x.Key).HasMaxLength(50).IsRequired();
        b.Property(x => x.Name).HasMaxLength(80).IsRequired();
        b.Property(x => x.Description).HasMaxLength(300);
        b.HasIndex(x => x.Key).IsUnique();
    }
}

public sealed class ModeTemplateMappingConfiguration : IEntityTypeConfiguration<ModeTemplateMapping>
{
    public void Configure(EntityTypeBuilder<ModeTemplateMapping> b)
    {
        b.ToTable("ModeTemplateMappings");
        b.HasIndex(x => x.ProfileModeId).IsUnique();
        b.HasOne(x => x.Template).WithMany().HasForeignKey(x => x.TemplateId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class SubscriptionPlanConfiguration : IEntityTypeConfiguration<SubscriptionPlan>
{
    public void Configure(EntityTypeBuilder<SubscriptionPlan> b)
    {
        b.ToTable("SubscriptionPlans");
        b.Property(x => x.Code).HasMaxLength(40).IsRequired();
        b.Property(x => x.Name).HasMaxLength(80).IsRequired();
        b.Property(x => x.Description).HasMaxLength(300);
        b.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        b.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class SubscriptionConfiguration : IEntityTypeConfiguration<Subscription>
{
    public void Configure(EntityTypeBuilder<Subscription> b)
    {
        b.ToTable("Subscriptions");
        b.HasIndex(x => new { x.UserId, x.Status, x.ExpiresAt });
        b.HasOne(x => x.Plan).WithMany().HasForeignKey(x => x.PlanId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> b)
    {
        b.ToTable("Payments");
        b.Property(x => x.RazorpayOrderId).HasMaxLength(100).IsRequired();
        b.Property(x => x.RazorpayPaymentId).HasMaxLength(100);
        b.Property(x => x.RazorpaySignature).HasMaxLength(200);
        b.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        b.Property(x => x.FailureReason).HasMaxLength(500);
        b.HasIndex(x => x.RazorpayOrderId).IsUnique();
        b.HasIndex(x => x.RazorpayPaymentId).IsUnique().HasFilter("[RazorpayPaymentId] IS NOT NULL");
        b.HasIndex(x => new { x.UserId, x.CreatedAt });
        b.HasOne(x => x.Plan).WithMany().HasForeignKey(x => x.PlanId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Subscription).WithMany().HasForeignKey(x => x.SubscriptionId).OnDelete(DeleteBehavior.NoAction);
    }
}

public sealed class EnquiryConfiguration : IEntityTypeConfiguration<Enquiry>
{
    public void Configure(EntityTypeBuilder<Enquiry> b)
    {
        b.ToTable("Enquiries");
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.Email).HasMaxLength(256).IsRequired();
        b.Property(x => x.Phone).HasMaxLength(30);
        b.Property(x => x.Subject).HasMaxLength(150).IsRequired();
        b.Property(x => x.Message).HasMaxLength(3000).IsRequired();
        b.HasIndex(x => x.CreatedAt);
    }
}
