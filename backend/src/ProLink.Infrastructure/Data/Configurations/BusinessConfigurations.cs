using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProLink.Domain.Entities;

namespace ProLink.Infrastructure.Data.Configurations;

public sealed class BusinessCategoryConfiguration : IEntityTypeConfiguration<BusinessCategory>
{
    public void Configure(EntityTypeBuilder<BusinessCategory> b)
    {
        b.ToTable("BusinessCategories");
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Key).HasMaxLength(50).IsRequired();
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.Icon).HasMaxLength(50).IsRequired();
        b.HasIndex(x => x.Key).IsUnique();
        b.HasMany(x => x.Subcategories).WithOne(x => x.Category)
            .HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Attributes).WithOne(x => x.Category)
            .HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class BusinessSubcategoryConfiguration : IEntityTypeConfiguration<BusinessSubcategory>
{
    public void Configure(EntityTypeBuilder<BusinessSubcategory> b)
    {
        b.ToTable("BusinessSubcategories");
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.HasIndex(x => new { x.CategoryId, x.Name }).IsUnique();
    }
}

public sealed class BusinessCategoryAttributeConfiguration : IEntityTypeConfiguration<BusinessCategoryAttribute>
{
    public void Configure(EntityTypeBuilder<BusinessCategoryAttribute> b)
    {
        b.ToTable("BusinessCategoryAttributes");
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Key).HasMaxLength(50).IsRequired();
        b.Property(x => x.Label).HasMaxLength(100).IsRequired();
        b.Property(x => x.Options).HasMaxLength(1000);
        b.HasIndex(x => new { x.CategoryId, x.Key }).IsUnique();
    }
}

public sealed class BusinessConfiguration : IEntityTypeConfiguration<Business>
{
    public void Configure(EntityTypeBuilder<Business> b)
    {
        b.ToTable("Businesses");
        b.Property(x => x.Name).HasMaxLength(120).IsRequired();
        b.Property(x => x.Slug).HasMaxLength(60).IsRequired();
        b.Property(x => x.LogoUrl).HasMaxLength(500);
        b.Property(x => x.CoverUrl).HasMaxLength(500);
        b.Property(x => x.Description).HasMaxLength(3000);
        b.Property(x => x.Email).HasMaxLength(256);
        b.Property(x => x.Phone).HasMaxLength(30);
        b.Property(x => x.WhatsApp).HasMaxLength(30);
        b.Property(x => x.Website).HasMaxLength(300);
        b.Property(x => x.AddressLine1).HasMaxLength(200);
        b.Property(x => x.AddressLine2).HasMaxLength(200);
        b.Property(x => x.City).HasMaxLength(100);
        b.Property(x => x.State).HasMaxLength(100);
        b.Property(x => x.Country).HasMaxLength(100);
        b.Property(x => x.PostalCode).HasMaxLength(20);
        b.Property(x => x.MapsUrl).HasMaxLength(500);
        b.Property(x => x.TimeZone).HasMaxLength(64).IsRequired();
        b.Property(x => x.Theme).HasMaxLength(30).IsRequired();
        b.Property(x => x.BrandColor).HasMaxLength(7).IsRequired();
        b.Property(x => x.Layout).HasMaxLength(20).IsRequired();
        b.Property(x => x.FeaturedSections).HasMaxLength(200).IsRequired();
        b.Property(x => x.QrCode).HasMaxLength(16).IsRequired();

        b.HasIndex(x => x.Slug).IsUnique();
        b.HasIndex(x => x.QrCode).IsUnique();
        b.HasIndex(x => x.OwnerId);
        b.HasIndex(x => new { x.Status, x.IsActive });

        b.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Subcategory).WithMany().HasForeignKey(x => x.SubcategoryId).OnDelete(DeleteBehavior.Restrict);

        b.HasMany(x => x.Members).WithOne(x => x.Business).HasForeignKey(x => x.BusinessId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.SocialLinks).WithOne(x => x.Business).HasForeignKey(x => x.BusinessId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.WorkingHours).WithOne(x => x.Business).HasForeignKey(x => x.BusinessId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.SpecialHours).WithOne(x => x.Business).HasForeignKey(x => x.BusinessId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.ProductCategories).WithOne(x => x.Business).HasForeignKey(x => x.BusinessId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Products).WithOne(x => x.Business).HasForeignKey(x => x.BusinessId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Services).WithOne(x => x.Business).HasForeignKey(x => x.BusinessId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Offers).WithOne(x => x.Business).HasForeignKey(x => x.BusinessId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Gallery).WithOne(x => x.Business).HasForeignKey(x => x.BusinessId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Reviews).WithOne(x => x.Business).HasForeignKey(x => x.BusinessId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Enquiries).WithOne(x => x.Business).HasForeignKey(x => x.BusinessId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.QrCampaigns).WithOne(x => x.Business).HasForeignKey(x => x.BusinessId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class BusinessMemberConfiguration : IEntityTypeConfiguration<BusinessMember>
{
    public void Configure(EntityTypeBuilder<BusinessMember> b)
    {
        b.ToTable("BusinessMembers");
        b.HasIndex(x => new { x.BusinessId, x.UserId }).IsUnique();
        b.HasIndex(x => x.UserId);
        // NoAction: Users → Businesses → Members already cascades; SQL Server forbids a second path.
        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.NoAction);
    }
}

public sealed class BusinessSocialLinkConfiguration : IEntityTypeConfiguration<BusinessSocialLink>
{
    public void Configure(EntityTypeBuilder<BusinessSocialLink> b)
    {
        b.ToTable("BusinessSocialLinks");
        b.Property(x => x.Label).HasMaxLength(50);
        b.Property(x => x.Url).HasMaxLength(500).IsRequired();
    }
}

public sealed class BusinessWorkingHourConfiguration : IEntityTypeConfiguration<BusinessWorkingHour>
{
    public void Configure(EntityTypeBuilder<BusinessWorkingHour> b)
    {
        b.ToTable("BusinessWorkingHours");
        b.HasIndex(x => new { x.BusinessId, x.Day }).IsUnique();
    }
}

public sealed class BusinessSpecialHourConfiguration : IEntityTypeConfiguration<BusinessSpecialHour>
{
    public void Configure(EntityTypeBuilder<BusinessSpecialHour> b)
    {
        b.ToTable("BusinessSpecialHours");
        b.Property(x => x.Note).HasMaxLength(150);
        b.HasIndex(x => new { x.BusinessId, x.Date }).IsUnique();
    }
}

public sealed class BusinessProductCategoryConfiguration : IEntityTypeConfiguration<BusinessProductCategory>
{
    public void Configure(EntityTypeBuilder<BusinessProductCategory> b)
    {
        b.ToTable("BusinessProductCategories");
        b.Property(x => x.Name).HasMaxLength(80).IsRequired();
        b.HasIndex(x => new { x.BusinessId, x.Name }).IsUnique();
    }
}

public sealed class BusinessProductConfiguration : IEntityTypeConfiguration<BusinessProduct>
{
    public void Configure(EntityTypeBuilder<BusinessProduct> b)
    {
        b.ToTable("BusinessProducts");
        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Sku).HasMaxLength(60);
        b.Property(x => x.Description).HasMaxLength(3000);
        b.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        b.Property(x => x.AttributesJson).HasMaxLength(4000).IsRequired();
        b.HasIndex(x => new { x.BusinessId, x.IsAvailable, x.IsFeatured });
        b.HasIndex(x => new { x.BusinessId, x.Sku }).IsUnique().HasFilter("[Sku] IS NOT NULL");
        // NoAction: Businesses → ProductCategories and Businesses → Products both cascade.
        // The service clears ProductCategoryId before deleting a category.
        b.HasOne(x => x.ProductCategory).WithMany().HasForeignKey(x => x.ProductCategoryId).OnDelete(DeleteBehavior.NoAction);
        b.HasMany(x => x.Images).WithOne(x => x.Product).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class BusinessProductImageConfiguration : IEntityTypeConfiguration<BusinessProductImage>
{
    public void Configure(EntityTypeBuilder<BusinessProductImage> b)
    {
        b.ToTable("BusinessProductImages");
        b.Property(x => x.Url).HasMaxLength(500).IsRequired();
    }
}

public sealed class BusinessServiceConfiguration : IEntityTypeConfiguration<BusinessService>
{
    public void Configure(EntityTypeBuilder<BusinessService> b)
    {
        b.ToTable("BusinessServices");
        b.Property(x => x.Name).HasMaxLength(150).IsRequired();
        b.Property(x => x.Description).HasMaxLength(2000);
        b.Property(x => x.PriceNote).HasMaxLength(50);
        b.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        b.Property(x => x.ImageUrl).HasMaxLength(500);
        b.HasIndex(x => new { x.BusinessId, x.IsAvailable });
    }
}

public sealed class BusinessOfferConfiguration : IEntityTypeConfiguration<BusinessOffer>
{
    public void Configure(EntityTypeBuilder<BusinessOffer> b)
    {
        b.ToTable("BusinessOffers");
        b.Property(x => x.Title).HasMaxLength(120).IsRequired();
        b.Property(x => x.Description).HasMaxLength(1000);
        b.Property(x => x.BannerUrl).HasMaxLength(500);
        b.HasIndex(x => new { x.BusinessId, x.IsActive, x.EndDate });
    }
}

public sealed class BusinessGalleryImageConfiguration : IEntityTypeConfiguration<BusinessGalleryImage>
{
    public void Configure(EntityTypeBuilder<BusinessGalleryImage> b)
    {
        b.ToTable("BusinessGalleryImages");
        b.Property(x => x.Url).HasMaxLength(500).IsRequired();
        b.Property(x => x.Caption).HasMaxLength(150);
        b.HasIndex(x => new { x.BusinessId, x.Category });
    }
}

public sealed class BusinessReviewConfiguration : IEntityTypeConfiguration<BusinessReview>
{
    public void Configure(EntityTypeBuilder<BusinessReview> b)
    {
        b.ToTable("BusinessReviews");
        b.Property(x => x.CustomerName).HasMaxLength(80).IsRequired();
        b.Property(x => x.Comment).HasMaxLength(1000);
        b.Property(x => x.OwnerReply).HasMaxLength(1000);
        b.HasIndex(x => new { x.BusinessId, x.Status });
        b.ToTable(t => t.HasCheckConstraint("CK_BusinessReviews_Rating", "[Rating] BETWEEN 1 AND 5"));
    }
}

public sealed class BusinessEnquiryConfiguration : IEntityTypeConfiguration<BusinessEnquiry>
{
    public void Configure(EntityTypeBuilder<BusinessEnquiry> b)
    {
        b.ToTable("BusinessEnquiries");
        b.Property(x => x.CustomerName).HasMaxLength(100).IsRequired();
        b.Property(x => x.Phone).HasMaxLength(30);
        b.Property(x => x.Email).HasMaxLength(256);
        b.Property(x => x.Subject).HasMaxLength(150).IsRequired();
        b.Property(x => x.Message).HasMaxLength(3000).IsRequired();
        b.Property(x => x.RelatedItemName).HasMaxLength(150);
        b.HasIndex(x => new { x.BusinessId, x.Status, x.CreatedAt });
        b.HasMany(x => x.Activities).WithOne(x => x.Enquiry).HasForeignKey(x => x.EnquiryId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class BusinessEnquiryActivityConfiguration : IEntityTypeConfiguration<BusinessEnquiryActivity>
{
    public void Configure(EntityTypeBuilder<BusinessEnquiryActivity> b)
    {
        b.ToTable("BusinessEnquiryActivities");
        b.Property(x => x.Message).HasMaxLength(3000);
        b.Property(x => x.ByName).HasMaxLength(100);
    }
}

public sealed class BusinessAnalyticsEventConfiguration : IEntityTypeConfiguration<BusinessAnalyticsEvent>
{
    public void Configure(EntityTypeBuilder<BusinessAnalyticsEvent> b)
    {
        b.ToTable("BusinessAnalyticsEvents");
        b.HasKey(x => x.Id);
        b.Property(x => x.VisitorHash).HasMaxLength(64).IsRequired();
        b.HasIndex(x => new { x.BusinessId, x.OccurredAt });
        b.HasIndex(x => new { x.BusinessId, x.VisitorHash, x.Type, x.OccurredAt });
        // No FK to campaigns: scan history is kept (as "deleted campaign") after a campaign is removed.
        b.HasIndex(x => new { x.BusinessId, x.CampaignId, x.OccurredAt });
        b.HasOne(x => x.Business).WithMany().HasForeignKey(x => x.BusinessId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class BusinessQrCampaignConfiguration : IEntityTypeConfiguration<BusinessQrCampaign>
{
    public void Configure(EntityTypeBuilder<BusinessQrCampaign> b)
    {
        b.ToTable("BusinessQrCampaigns");
        b.Property(x => x.Name).HasMaxLength(80).IsRequired();
        b.Property(x => x.Code).HasMaxLength(16).IsRequired();
        b.Property(x => x.ForegroundColor).HasMaxLength(7).IsRequired();
        b.Property(x => x.BackgroundColor).HasMaxLength(7).IsRequired();
        b.Property(x => x.FrameText).HasMaxLength(40);
        b.HasIndex(x => x.Code).IsUnique();
        b.HasIndex(x => new { x.BusinessId, x.Name }).IsUnique();
    }
}
