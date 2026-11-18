using System.Net;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ProLink.Application.Common;
using ProLink.Application.DTOs;
using ProLink.Application.Interfaces;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;

namespace ProLink.Application.Services.Businesses;

/// <summary>Customer enquiries and reviews. Enquiries hold customer contact details, so only owners and managers see them.</summary>
public sealed class BusinessEngagementService(
    IBusinessRepository businesses,
    IBusinessCatalogRepository catalog,
    IBusinessEngagementRepository engagement,
    IBusinessAnalyticsRepository analytics,
    IUserRepository users,
    IUnitOfWork uow,
    IEmailSender email,
    BusinessAccessGuard guard,
    VisitorHasher hasher,
    IOptions<AppOptions> options,
    TimeProvider clock,
    ILogger<BusinessEngagementService> logger) : IBusinessEngagementService
{
    // =====================================================================
    // Enquiries
    // =====================================================================

    public async Task<Guid> SubmitEnquiryAsync(string slug, CreateBusinessEnquiryRequest request, VisitorContext visitor, CancellationToken ct = default)
    {
        var business = await businesses.GetPublicBySlugAsync(slug, ct) ?? throw new NotFoundException("Business not found.");

        string? related = null;
        if (request.ProductId is not null)
            related = (await catalog.GetProductAsync(business.Id, request.ProductId.Value, ct))?.Name
                      ?? throw new BusinessValidationException("That product is no longer available.");
        if (request.ServiceId is not null)
            related = (await catalog.GetServiceAsync(business.Id, request.ServiceId.Value, ct))?.Name
                      ?? throw new BusinessValidationException("That service is no longer available.");

        var enquiry = new BusinessEnquiry
        {
            BusinessId = business.Id,
            CustomerName = request.CustomerName.Trim(),
            Phone = Text.Clean(request.Phone),
            Email = Text.Clean(request.Email),
            Subject = request.Subject.Trim(),
            Message = request.Message.Trim(),
            ProductId = request.ProductId,
            ServiceId = request.ServiceId,
            RelatedItemName = related
        };
        enquiry.Activities.Add(new BusinessEnquiryActivity
        {
            EnquiryId = enquiry.Id, Type = EnquiryActivityType.Created, Status = BusinessEnquiryStatus.New, ByName = enquiry.CustomerName
        });
        engagement.AddEnquiry(enquiry);

        if (!VisitorHasher.IsAutomated(visitor.UserAgent))
            analytics.AddEvent(new BusinessAnalyticsEvent
            {
                BusinessId = business.Id, Type = BusinessEventType.EnquirySubmitted,
                VisitorHash = hasher.Hash(business.Id, visitor), OccurredAt = clock.GetUtcNow().UtcDateTime
            });

        await uow.SaveChangesAsync(ct);
        await NotifyOwnerAsync(business, enquiry, ct);
        return enquiry.Id;
    }

    public async Task<PagedResult<EnquirySummaryDto>> ListEnquiriesAsync(Guid userId, Guid businessId, EnquiryQuery query, CancellationToken ct = default)
    {
        await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        var (items, total) = await engagement.QueryEnquiriesAsync(businessId, query, ct);
        return new PagedResult<EnquirySummaryDto>(items.Select(BusinessMapper.EnquirySummary).ToList(), total, query.Page, query.PageSize);
    }

    public async Task<EnquiryDetailDto> GetEnquiryAsync(Guid userId, Guid businessId, Guid enquiryId, CancellationToken ct = default)
    {
        await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        return BusinessMapper.EnquiryDetail(await LoadEnquiryAsync(businessId, enquiryId, ct));
    }

    public async Task<EnquiryDetailDto> UpdateEnquiryStatusAsync(Guid userId, Guid businessId, Guid enquiryId,
        UpdateEnquiryStatusRequest request, CancellationToken ct = default)
    {
        await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        var enquiry = await LoadEnquiryAsync(businessId, enquiryId, ct);
        var note = Text.Clean(request.Note);
        if (enquiry.Status == request.Status && note is null) return BusinessMapper.EnquiryDetail(enquiry);

        var type = enquiry.Status == request.Status ? EnquiryActivityType.Note : EnquiryActivityType.StatusChanged;
        enquiry.Status = request.Status;
        enquiry.UpdatedAt = clock.GetUtcNow().UtcDateTime;
        engagement.AddEnquiryActivity(new BusinessEnquiryActivity
        {
            EnquiryId = enquiry.Id, Type = type, Status = request.Status, Message = note,
            ByUserId = userId, ByName = await DisplayNameAsync(userId, ct)
        });
        await uow.SaveChangesAsync(ct);
        return BusinessMapper.EnquiryDetail(enquiry);
    }

    public async Task<EnquiryDetailDto> RespondToEnquiryAsync(Guid userId, Guid businessId, Guid enquiryId,
        RespondEnquiryRequest request, CancellationToken ct = default)
    {
        var access = await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        var enquiry = await LoadEnquiryAsync(businessId, enquiryId, ct);
        if (request.SendEmail && enquiry.Email is null)
            throw new BusinessValidationException("This customer didn't leave an email. Contact them by phone, then record your reply with email turned off.");

        var message = request.Message.Trim();
        enquiry.Status = BusinessEnquiryStatus.Responded;
        enquiry.UpdatedAt = clock.GetUtcNow().UtcDateTime;
        engagement.AddEnquiryActivity(new BusinessEnquiryActivity
        {
            EnquiryId = enquiry.Id, Type = EnquiryActivityType.Response, Status = BusinessEnquiryStatus.Responded,
            Message = message, ByUserId = userId, ByName = await DisplayNameAsync(userId, ct)
        });
        await uow.SaveChangesAsync(ct);

        if (request.SendEmail && enquiry.Email is not null)
            await email.SendAsync(enquiry.Email, $"Re: {enquiry.Subject} — {access.Business.Name}",
                ReplyEmail(access.Business, enquiry, message), ct);
        return BusinessMapper.EnquiryDetail(enquiry);
    }

    private async Task<BusinessEnquiry> LoadEnquiryAsync(Guid businessId, Guid enquiryId, CancellationToken ct) =>
        await engagement.GetEnquiryAsync(businessId, enquiryId, ct) ?? throw new NotFoundException("Enquiry not found.");

    private async Task<string> DisplayNameAsync(Guid userId, CancellationToken ct)
    {
        var user = await users.GetWithProfileAsync(userId, ct);
        return user?.Profile?.FullName ?? user?.Email ?? "Team member";
    }

    /// <summary>Uses the existing email infrastructure. A failed notification never loses the customer's enquiry.</summary>
    private async Task NotifyOwnerAsync(Business business, BusinessEnquiry enquiry, CancellationToken ct)
    {
        try
        {
            var owner = await users.GetByIdAsync(business.OwnerId, ct);
            if (owner is null) return;
            var link = $"{options.Value.FrontendBaseUrl.TrimEnd('/')}/dashboard/business/{business.Id}/enquiries?open={enquiry.Id}";
            Func<string?, string> e = s => WebUtility.HtmlEncode(s) ?? "";
            var body = $"""
                <p>You have a new enquiry for <strong>{e(business.Name)}</strong>.</p>
                <p><strong>{e(enquiry.CustomerName)}</strong>{(enquiry.Phone is null ? "" : $" · {e(enquiry.Phone)}")}{(enquiry.Email is null ? "" : $" · {e(enquiry.Email)}")}</p>
                <p><strong>{e(enquiry.Subject)}</strong>{(enquiry.RelatedItemName is null ? "" : $" (about {e(enquiry.RelatedItemName)})")}</p>
                <p style="white-space:pre-line">{e(enquiry.Message)}</p>
                <p><a href="{e(link)}">Open the enquiry in your dashboard</a></p>
                """;
            await email.SendAsync(owner.Email, $"New enquiry: {enquiry.Subject}", body, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Could not send enquiry notification for business {BusinessId}", business.Id);
        }
    }

    private static string ReplyEmail(Business b, BusinessEnquiry enquiry, string message)
    {
        Func<string?, string> e = s => WebUtility.HtmlEncode(s) ?? "";
        var contact = string.Join(" · ", new[] { b.Phone, b.WhatsApp is null ? null : $"WhatsApp {b.WhatsApp}", b.Email }
            .Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => e(x!)));
        return $"""
            <p>Hi {e(enquiry.CustomerName)},</p>
            <p style="white-space:pre-line">{e(message)}</p>
            <p>— {e(b.Name)}{(contact.Length > 0 ? $"<br/>{contact}" : "")}</p>
            <hr/>
            <p style="color:#71677D;font-size:13px">Your enquiry: <strong>{e(enquiry.Subject)}</strong><br/>{e(enquiry.Message)}</p>
            """;
    }

    // =====================================================================
    // Reviews (moderated — only approved reviews are public)
    // =====================================================================

    public async Task SubmitReviewAsync(string slug, CreateReviewRequest request, CancellationToken ct = default)
    {
        var business = await businesses.GetPublicBySlugAsync(slug, ct) ?? throw new NotFoundException("Business not found.");
        engagement.AddReview(new BusinessReview
        {
            BusinessId = business.Id, CustomerName = request.CustomerName.Trim(), Rating = request.Rating,
            Comment = Text.Clean(request.Comment), Status = ReviewStatus.Pending
        });
        await uow.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<ReviewDto>> ListReviewsAsync(Guid userId, Guid businessId, ReviewStatus? status, CancellationToken ct = default)
    {
        await guard.RequireAsync(userId, businessId, BusinessRole.Editor, ct);
        return (await engagement.ListReviewsAsync(businessId, status, 200, ct)).Select(BusinessMapper.Review).ToList();
    }

    public async Task<ReviewDto> UpdateReviewAsync(Guid userId, Guid businessId, Guid reviewId, UpdateReviewRequest request, CancellationToken ct = default)
    {
        await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        var review = await engagement.GetReviewAsync(businessId, reviewId, ct) ?? throw new NotFoundException("Review not found.");
        review.Status = request.Status;
        review.OwnerReply = Text.Clean(request.OwnerReply);
        await uow.SaveChangesAsync(ct);
        return BusinessMapper.Review(review);
    }

    public async Task DeleteReviewAsync(Guid userId, Guid businessId, Guid reviewId, CancellationToken ct = default)
    {
        await guard.RequireAsync(userId, businessId, BusinessRole.Manager, ct);
        var review = await engagement.GetReviewAsync(businessId, reviewId, ct) ?? throw new NotFoundException("Review not found.");
        uow.Remove(review);
        await uow.SaveChangesAsync(ct);
    }
}
