using Microsoft.EntityFrameworkCore;
using ProLink.Application.Interfaces;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;
using ProLink.Infrastructure.Data;

namespace ProLink.Infrastructure.Repositories;

public sealed class UnitOfWork(AppDbContext db) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
    public void Remove<T>(T entity) where T : class => db.Set<T>().Remove(entity);
    public void RemoveRange<T>(IEnumerable<T> entities) where T : class => db.Set<T>().RemoveRange(entities);
}

public sealed class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<User?> GetWithProfileAsync(Guid id, CancellationToken ct = default) =>
        db.Users
            .Include(u => u.Profile).ThenInclude(p => p!.SocialLinks)
            .Include(u => u.PublicSettings)
            .FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken ct = default) =>
        db.Users.FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail, ct);

    public Task<User?> GetByGoogleSubjectAsync(string subject, CancellationToken ct = default) =>
        db.Users.FirstOrDefaultAsync(u => u.GoogleSubject == subject, ct);

    public Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default) =>
        db.Users.AnyAsync(u => u.PublicSlug == slug, ct);

    public void Add(User user) => db.Users.Add(user);
}

public sealed class ProfileRepository(AppDbContext db) : IProfileRepository
{
    public Task<UserProfile?> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        db.UserProfiles.Include(p => p.SocialLinks).FirstOrDefaultAsync(p => p.UserId == userId, ct);

    public Task<PublicProfileSettings?> GetSettingsAsync(Guid userId, CancellationToken ct = default) =>
        db.PublicProfileSettings.FirstOrDefaultAsync(s => s.UserId == userId, ct);

    public Task<User?> GetPublicProfileBySlugAsync(string slug, CancellationToken ct = default) =>
        db.Users
            .AsNoTracking()
            .AsSplitQuery()
            .Include(u => u.Profile).ThenInclude(p => p!.SocialLinks)
            .Include(u => u.PublicSettings)
            .Include(u => u.Modes.Where(m => m.IsPublished)).ThenInclude(m => m.Skills)
            .Include(u => u.Modes.Where(m => m.IsPublished)).ThenInclude(m => m.WorkExperiences)
            .Include(u => u.Modes.Where(m => m.IsPublished)).ThenInclude(m => m.Educations)
            .Include(u => u.Modes.Where(m => m.IsPublished)).ThenInclude(m => m.Projects)
            .Include(u => u.Modes.Where(m => m.IsPublished)).ThenInclude(m => m.Achievements)
            .Include(u => u.Modes.Where(m => m.IsPublished)).ThenInclude(m => m.Certifications)
            .Include(u => u.Modes.Where(m => m.IsPublished)).ThenInclude(m => m.Services)
            .Include(u => u.Modes.Where(m => m.IsPublished)).ThenInclude(m => m.CustomSections)
            .Include(u => u.Modes.Where(m => m.IsPublished)).ThenInclude(m => m.SocialLinks)
            .Include(u => u.Modes.Where(m => m.IsPublished)).ThenInclude(m => m.TemplateMapping!).ThenInclude(t => t.Template)
            .FirstOrDefaultAsync(u => u.PublicSlug == slug, ct);
}

public sealed class ProfileModeRepository(AppDbContext db) : IProfileModeRepository
{
    public Task<List<ProfileMode>> ListByUserAsync(Guid userId, CancellationToken ct = default) =>
        db.ProfileModes
            .Include(m => m.TemplateMapping!).ThenInclude(t => t.Template)
            .Where(m => m.UserId == userId)
            .OrderBy(m => m.SortOrder).ThenBy(m => m.CreatedAt)
            .ToListAsync(ct);

    public Task<ProfileMode?> GetAsync(Guid userId, Guid modeId, bool includeSections, CancellationToken ct = default)
    {
        IQueryable<ProfileMode> query = db.ProfileModes.Include(m => m.TemplateMapping!).ThenInclude(t => t.Template);
        if (includeSections)
        {
            query = query.AsSplitQuery()
                .Include(m => m.Skills).Include(m => m.WorkExperiences).Include(m => m.Educations)
                .Include(m => m.Projects).Include(m => m.Achievements).Include(m => m.Certifications)
                .Include(m => m.Services).Include(m => m.CustomSections).Include(m => m.SocialLinks);
        }
        return query.FirstOrDefaultAsync(m => m.Id == modeId && m.UserId == userId, ct);
    }

    public Task<int> CountByUserAsync(Guid userId, CancellationToken ct = default) =>
        db.ProfileModes.CountAsync(m => m.UserId == userId, ct);

    public Task<bool> NameExistsAsync(Guid userId, string modeName, Guid? excludeModeId, CancellationToken ct = default) =>
        db.ProfileModes.AnyAsync(m => m.UserId == userId && m.ModeName == modeName
                                      && (excludeModeId == null || m.Id != excludeModeId), ct);

    public void Add(ProfileMode mode) => db.ProfileModes.Add(mode);
}

public sealed class TemplateRepository(AppDbContext db) : ITemplateRepository
{
    public Task<List<ProfileTemplate>> ListActiveAsync(CancellationToken ct = default) =>
        db.ProfileTemplates.AsNoTracking().Where(t => t.IsActive).OrderBy(t => t.SortOrder).ToListAsync(ct);

    public Task<ProfileTemplate?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.ProfileTemplates.FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task<ProfileTemplate?> GetDefaultAsync(CancellationToken ct = default) =>
        db.ProfileTemplates.Where(t => t.IsActive && !t.IsPremium).OrderBy(t => t.SortOrder).FirstOrDefaultAsync(ct);
}

public sealed class SubscriptionRepository(AppDbContext db) : ISubscriptionRepository
{
    public Task<List<SubscriptionPlan>> ListPlansAsync(CancellationToken ct = default) =>
        db.SubscriptionPlans.AsNoTracking().Where(p => p.IsActive).OrderBy(p => p.SortOrder).ToListAsync(ct);

    public Task<SubscriptionPlan?> GetPlanAsync(int planId, CancellationToken ct = default) =>
        db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Id == planId, ct);

    public Task<SubscriptionPlan?> GetFreePlanAsync(CancellationToken ct = default) =>
        db.SubscriptionPlans.AsNoTracking().FirstOrDefaultAsync(p => p.Code == "free", ct);

    public Task<Subscription?> GetCurrentAsync(Guid userId, DateTime now, CancellationToken ct = default) =>
        db.Subscriptions.Include(s => s.Plan)
            .Where(s => s.UserId == userId && s.Status == SubscriptionStatus.Active
                        && s.StartsAt <= now && s.ExpiresAt > now)
            .OrderByDescending(s => s.ExpiresAt)
            .FirstOrDefaultAsync(ct);

    public Task<List<Subscription>> ListExpiredActiveAsync(DateTime now, CancellationToken ct = default) =>
        db.Subscriptions.Where(s => s.Status == SubscriptionStatus.Active && s.ExpiresAt <= now).ToListAsync(ct);

    public void Add(Subscription subscription) => db.Subscriptions.Add(subscription);
}

public sealed class PaymentRepository(AppDbContext db) : IPaymentRepository
{
    public Task<Payment?> GetByOrderIdAsync(string orderId, CancellationToken ct = default) =>
        db.Payments.Include(p => p.Plan).FirstOrDefaultAsync(p => p.RazorpayOrderId == orderId, ct);

    public Task<List<Payment>> ListByUserAsync(Guid userId, CancellationToken ct = default) =>
        db.Payments.AsNoTracking().Include(p => p.Plan)
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);

    public void Add(Payment payment) => db.Payments.Add(payment);
}

public sealed class EnquiryRepository(AppDbContext db) : IEnquiryRepository
{
    public Task<List<Enquiry>> ListAsync(int take, CancellationToken ct = default) =>
        db.Enquiries.AsNoTracking().OrderByDescending(e => e.CreatedAt).Take(take).ToListAsync(ct);

    public void Add(Enquiry enquiry) => db.Enquiries.Add(enquiry);
}
