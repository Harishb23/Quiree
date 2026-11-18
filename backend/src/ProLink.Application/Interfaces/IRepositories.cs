using ProLink.Domain.Entities;

namespace ProLink.Application.Interfaces;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    void Remove<T>(T entity) where T : class;
    void RemoveRange<T>(IEnumerable<T> entities) where T : class;
}

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<User?> GetWithProfileAsync(Guid id, CancellationToken ct = default);
    Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken ct = default);
    Task<User?> GetByGoogleSubjectAsync(string subject, CancellationToken ct = default);
    Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default);
    void Add(User user);
}

public interface IProfileRepository
{
    Task<UserProfile?> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<PublicProfileSettings?> GetSettingsAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Loads a public profile with settings, social links and published modes (with all sections).</summary>
    Task<User?> GetPublicProfileBySlugAsync(string slug, CancellationToken ct = default);
}

public interface IProfileModeRepository
{
    Task<List<ProfileMode>> ListByUserAsync(Guid userId, CancellationToken ct = default);
    Task<ProfileMode?> GetAsync(Guid userId, Guid modeId, bool includeSections, CancellationToken ct = default);
    Task<int> CountByUserAsync(Guid userId, CancellationToken ct = default);
    Task<bool> NameExistsAsync(Guid userId, string modeName, Guid? excludeModeId, CancellationToken ct = default);
    void Add(ProfileMode mode);
}

public interface ITemplateRepository
{
    Task<List<ProfileTemplate>> ListActiveAsync(CancellationToken ct = default);
    Task<ProfileTemplate?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<ProfileTemplate?> GetDefaultAsync(CancellationToken ct = default);
}

public interface ISubscriptionRepository
{
    Task<List<SubscriptionPlan>> ListPlansAsync(CancellationToken ct = default);
    Task<SubscriptionPlan?> GetPlanAsync(int planId, CancellationToken ct = default);
    Task<SubscriptionPlan?> GetFreePlanAsync(CancellationToken ct = default);
    /// <summary>The latest active, unexpired subscription for the user.</summary>
    Task<Subscription?> GetCurrentAsync(Guid userId, DateTime now, CancellationToken ct = default);
    Task<List<Subscription>> ListExpiredActiveAsync(DateTime now, CancellationToken ct = default);
    void Add(Subscription subscription);
}

public interface IPaymentRepository
{
    Task<Payment?> GetByOrderIdAsync(string orderId, CancellationToken ct = default);
    Task<List<Payment>> ListByUserAsync(Guid userId, CancellationToken ct = default);
    void Add(Payment payment);
}

public interface IEnquiryRepository
{
    Task<List<Enquiry>> ListAsync(int take, CancellationToken ct = default);
    void Add(Enquiry enquiry);
}
