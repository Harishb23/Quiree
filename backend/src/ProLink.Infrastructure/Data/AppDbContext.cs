using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using ProLink.Domain.Common;
using ProLink.Domain.Entities;

namespace ProLink.Infrastructure.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<ProfileMode> ProfileModes => Set<ProfileMode>();
    public DbSet<ProfileSkill> ProfileSkills => Set<ProfileSkill>();
    public DbSet<WorkExperience> WorkExperiences => Set<WorkExperience>();
    public DbSet<EducationDetail> EducationDetails => Set<EducationDetail>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Achievement> Achievements => Set<Achievement>();
    public DbSet<Certification> Certifications => Set<Certification>();
    public DbSet<OfferedService> Services => Set<OfferedService>();
    public DbSet<CustomSection> CustomSections => Set<CustomSection>();
    public DbSet<SocialLink> SocialLinks => Set<SocialLink>();
    public DbSet<ProfileTemplate> ProfileTemplates => Set<ProfileTemplate>();
    public DbSet<ModeTemplateMapping> ModeTemplateMappings => Set<ModeTemplateMapping>();
    public DbSet<PublicProfileSettings> PublicProfileSettings => Set<PublicProfileSettings>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Enquiry> Enquiries => Set<Enquiry>();

    // Business profiles
    public DbSet<BusinessCategory> BusinessCategories => Set<BusinessCategory>();
    public DbSet<BusinessSubcategory> BusinessSubcategories => Set<BusinessSubcategory>();
    public DbSet<BusinessCategoryAttribute> BusinessCategoryAttributes => Set<BusinessCategoryAttribute>();
    public DbSet<Business> Businesses => Set<Business>();
    public DbSet<BusinessMember> BusinessMembers => Set<BusinessMember>();
    public DbSet<BusinessProductCategory> BusinessProductCategories => Set<BusinessProductCategory>();
    public DbSet<BusinessProduct> BusinessProducts => Set<BusinessProduct>();
    public DbSet<BusinessProductImage> BusinessProductImages => Set<BusinessProductImage>();
    public DbSet<BusinessService> BusinessServices => Set<BusinessService>();
    public DbSet<BusinessOffer> BusinessOffers => Set<BusinessOffer>();
    public DbSet<BusinessGalleryImage> BusinessGalleryImages => Set<BusinessGalleryImage>();
    public DbSet<BusinessReview> BusinessReviews => Set<BusinessReview>();
    public DbSet<BusinessEnquiry> BusinessEnquiries => Set<BusinessEnquiry>();
    public DbSet<BusinessEnquiryActivity> BusinessEnquiryActivities => Set<BusinessEnquiryActivity>();
    public DbSet<BusinessAnalyticsEvent> BusinessAnalyticsEvents => Set<BusinessAnalyticsEvent>();
    public DbSet<BusinessQrCampaign> BusinessQrCampaigns => Set<BusinessQrCampaign>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Ids are assigned in code (BaseEntity), so EF must not treat a set key as "already saved".
        // Otherwise new children added to a loaded collection would be UPDATEd instead of INSERTed.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
                     .Where(t => typeof(BaseEntity).IsAssignableFrom(t.ClrType)))
        {
            modelBuilder.Entity(entityType.ClrType).Property(nameof(BaseEntity.Id)).ValueGeneratedNever();
        }

        // All timestamps are written as UTC, but SQL Server's datetime2 doesn't store the kind, so values come back
        // as Unspecified and serialise without a "Z" — browsers then read them as local time (e.g. 5h30 off in India).
        // Mark every DateTime read from the database as UTC. Schema is unchanged.
        var utc = new ValueConverter<DateTime, DateTime>(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        var utcNullable = new ValueConverter<DateTime?, DateTime?>(v => v, v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);
        foreach (var property in modelBuilder.Model.GetEntityTypes().SelectMany(t => t.GetProperties()))
        {
            if (property.ClrType == typeof(DateTime)) property.SetValueConverter(utc);
            else if (property.ClrType == typeof(DateTime?)) property.SetValueConverter(utcNullable);
        }

        SeedData.Apply(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
