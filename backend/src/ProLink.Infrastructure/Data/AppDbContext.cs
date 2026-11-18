using Microsoft.EntityFrameworkCore;
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
