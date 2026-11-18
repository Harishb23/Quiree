using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ProLink.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBusinessProfiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BusinessCategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Key = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Icon = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BusinessCategoryAttributes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    CategoryId = table.Column<int>(type: "int", nullable: false),
                    Key = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    InputType = table.Column<int>(type: "int", nullable: false),
                    Options = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessCategoryAttributes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessCategoryAttributes_BusinessCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "BusinessCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessSubcategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    CategoryId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessSubcategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessSubcategories_BusinessCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "BusinessCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Businesses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    CategoryId = table.Column<int>(type: "int", nullable: false),
                    SubcategoryId = table.Column<int>(type: "int", nullable: true),
                    LogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CoverUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: true),
                    YearEstablished = table.Column<int>(type: "int", nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    WhatsApp = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Website = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    AddressLine1 = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    AddressLine2 = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    State = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Country = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PostalCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    MapsUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Latitude = table.Column<double>(type: "float", nullable: true),
                    Longitude = table.Column<double>(type: "float", nullable: true),
                    TimeZone = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    DeliveryAvailable = table.Column<bool>(type: "bit", nullable: false),
                    PickupAvailable = table.Column<bool>(type: "bit", nullable: false),
                    PaymentMethods = table.Column<int>(type: "int", nullable: false),
                    Theme = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    BrandColor = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: false),
                    Layout = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    FeaturedSections = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsVerified = table.Column<bool>(type: "bit", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    QrCode = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    QrEnabled = table.Column<bool>(type: "bit", nullable: false),
                    QrGeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Businesses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Businesses_BusinessCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "BusinessCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Businesses_BusinessSubcategories_SubcategoryId",
                        column: x => x.SubcategoryId,
                        principalTable: "BusinessSubcategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Businesses_Users_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessAnalyticsEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BusinessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    VisitorHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessAnalyticsEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessAnalyticsEvents_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessEnquiries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Subject = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ServiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RelatedItemName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessEnquiries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessEnquiries_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessGalleryImages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Category = table.Column<int>(type: "int", nullable: false),
                    Caption = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessGalleryImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessGalleryImages_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessMembers_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BusinessMembers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BusinessOffers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    DiscountPercent = table.Column<int>(type: "int", nullable: true),
                    DiscountAmountInPaise = table.Column<long>(type: "bigint", nullable: true),
                    BannerUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsFeatured = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessOffers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessOffers_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessProductCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessProductCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessProductCategories_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessReviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Rating = table.Column<int>(type: "int", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    OwnerReply = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessReviews", x => x.Id);
                    table.CheckConstraint("CK_BusinessReviews_Rating", "[Rating] BETWEEN 1 AND 5");
                    table.ForeignKey(
                        name: "FK_BusinessReviews_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessServices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    PriceInPaise = table.Column<long>(type: "bigint", nullable: true),
                    PriceNote = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    DurationMinutes = table.Column<int>(type: "int", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsAvailable = table.Column<bool>(type: "bit", nullable: false),
                    IsFeatured = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessServices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessServices_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessSocialLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Platform = table.Column<int>(type: "int", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessSocialLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessSocialLinks_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessSpecialHours",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    IsClosed = table.Column<bool>(type: "bit", nullable: false),
                    Opens = table.Column<TimeOnly>(type: "time", nullable: true),
                    Closes = table.Column<TimeOnly>(type: "time", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessSpecialHours", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessSpecialHours_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessWorkingHours",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Day = table.Column<int>(type: "int", nullable: false),
                    IsClosed = table.Column<bool>(type: "bit", nullable: false),
                    Opens = table.Column<TimeOnly>(type: "time", nullable: true),
                    Closes = table.Column<TimeOnly>(type: "time", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessWorkingHours", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessWorkingHours_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessEnquiryActivities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EnquiryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: true),
                    Message = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: true),
                    ByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ByName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessEnquiryActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessEnquiryActivities_BusinessEnquiries_EnquiryId",
                        column: x => x.EnquiryId,
                        principalTable: "BusinessEnquiries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessProducts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductCategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Sku = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: true),
                    PriceInPaise = table.Column<long>(type: "bigint", nullable: true),
                    DiscountPriceInPaise = table.Column<long>(type: "bigint", nullable: true),
                    Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    Stock = table.Column<int>(type: "int", nullable: false),
                    IsAvailable = table.Column<bool>(type: "bit", nullable: false),
                    IsFeatured = table.Column<bool>(type: "bit", nullable: false),
                    AttributesJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessProducts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessProducts_BusinessProductCategories_ProductCategoryId",
                        column: x => x.ProductCategoryId,
                        principalTable: "BusinessProductCategories",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BusinessProducts_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BusinessProductImages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessProductImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessProductImages_BusinessProducts_ProductId",
                        column: x => x.ProductId,
                        principalTable: "BusinessProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "BusinessCategories",
                columns: new[] { "Id", "Icon", "IsActive", "Key", "Name", "SortOrder" },
                values: new object[,]
                {
                    { 1, "footprints", true, "footwear", "Footwear and Shoe Shops", 1 },
                    { 2, "flower-2", true, "flowers", "Flower Shops", 2 },
                    { 3, "shirt", true, "clothing", "Clothing and Fashion", 3 },
                    { 4, "utensils", true, "restaurants", "Restaurants and Cafes", 4 },
                    { 5, "cake-slice", true, "bakeries", "Bakeries", 5 },
                    { 6, "gem", true, "jewellery", "Jewellery Stores", 6 },
                    { 7, "scissors", true, "beauty", "Beauty and Salons", 7 },
                    { 8, "smartphone", true, "electronics", "Electronics and Mobile Shops", 8 },
                    { 9, "shopping-basket", true, "grocery", "Grocery and Supermarkets", 9 },
                    { 10, "sofa", true, "home-furniture", "Home and Furniture", 10 },
                    { 11, "stethoscope", true, "healthcare", "Medical and Healthcare", 11 },
                    { 12, "graduation-cap", true, "education", "Education and Training", 12 },
                    { 13, "briefcase", true, "professional-services", "Professional Services", 13 },
                    { 14, "store", true, "other", "Other Businesses", 14 }
                });

            migrationBuilder.InsertData(
                table: "BusinessCategoryAttributes",
                columns: new[] { "Id", "CategoryId", "InputType", "IsRequired", "Key", "Label", "Options", "SortOrder" },
                values: new object[,]
                {
                    { 101, 1, 0, false, "brand", "Brand", null, 1 },
                    { 102, 1, 3, false, "shoe_size", "Shoe Size", "UK 3|UK 4|UK 5|UK 6|UK 7|UK 8|UK 9|UK 10|UK 11|UK 12", 2 },
                    { 103, 1, 2, false, "gender", "Gender", "Men|Women|Unisex|Boys|Girls", 3 },
                    { 104, 1, 2, false, "shoe_type", "Shoe Type", "Sneakers|Running|Formal|Casual|Boots|Sandals|Slippers|Loafers|Heels|Flats", 4 },
                    { 105, 1, 2, false, "material", "Material", "Leather|Synthetic|Canvas|Mesh|Suede|Rubber", 5 },
                    { 106, 1, 0, false, "color", "Color", null, 6 },
                    { 201, 2, 3, false, "flower_type", "Flower Type", "Roses|Lilies|Orchids|Carnations|Tulips|Sunflowers|Gerberas|Mixed", 1 },
                    { 202, 2, 2, false, "bouquet_type", "Bouquet Type", "Hand-tied|Basket|Box|Vase Arrangement|Garland|Single Stem", 2 },
                    { 203, 2, 3, false, "occasion", "Occasion", "Birthday|Anniversary|Wedding|Love & Romance|Sympathy|Congratulations|Festival", 3 },
                    { 204, 2, 0, false, "arrangement", "Arrangement", null, 4 },
                    { 205, 2, 4, false, "delivery_available", "Delivery Available", null, 5 },
                    { 301, 3, 2, false, "clothing_type", "Clothing Type", "Shirt|T-Shirt|Trousers|Jeans|Dress|Saree|Kurta|Lehenga|Jacket|Suit|Ethnic Set", 1 },
                    { 302, 3, 3, false, "size", "Size", "XS|S|M|L|XL|XXL|3XL|Free Size", 2 },
                    { 303, 3, 0, false, "color", "Color", null, 3 },
                    { 304, 3, 2, false, "fabric", "Fabric", "Cotton|Linen|Silk|Polyester|Rayon|Denim|Wool|Chiffon|Georgette", 4 },
                    { 305, 3, 0, false, "brand", "Brand", null, 5 },
                    { 306, 3, 0, false, "collection", "Collection", null, 6 },
                    { 401, 4, 2, false, "food_category", "Food Category", "Starters|Main Course|Breads|Rice & Biryani|Desserts|Beverages|Combos|Snacks", 1 },
                    { 402, 4, 2, false, "food_type", "Cuisine", "South Indian|North Indian|Chinese|Continental|Italian|Arabian|Street Food|Bakery", 2 },
                    { 403, 4, 2, true, "veg_type", "Veg / Non-Veg", "Veg|Non-Veg|Egg|Vegan", 3 },
                    { 404, 4, 2, false, "spice_level", "Spice Level", "Mild|Medium|Hot", 4 },
                    { 405, 4, 1, false, "serves", "Serves", null, 5 },
                    { 501, 5, 2, false, "item_type", "Item Type", "Cake|Pastry|Bread|Cookies|Cupcakes|Savouries|Desserts", 1 },
                    { 502, 5, 0, false, "flavour", "Flavour", null, 2 },
                    { 503, 5, 0, false, "weight", "Weight / Size", null, 3 },
                    { 504, 5, 4, false, "eggless", "Eggless", null, 4 },
                    { 505, 5, 4, false, "custom_orders", "Custom Orders Accepted", null, 5 },
                    { 601, 6, 2, false, "metal", "Metal", "Gold|Silver|Platinum|Rose Gold|White Gold|Imitation", 1 },
                    { 602, 6, 2, false, "purity", "Purity", "24K|22K|18K|14K|925 Sterling|N/A", 2 },
                    { 603, 6, 2, false, "jewellery_type", "Jewellery Type", "Ring|Necklace|Chain|Earrings|Bangles|Bracelet|Pendant|Anklet|Nose Pin", 3 },
                    { 604, 6, 1, false, "weight_grams", "Weight (grams)", null, 4 },
                    { 605, 6, 0, false, "stone", "Stone", null, 5 },
                    { 606, 6, 4, false, "certified", "Hallmark / Certified", null, 6 },
                    { 701, 7, 2, false, "product_type", "Product Type", "Hair Care|Skin Care|Makeup|Fragrance|Nail Care|Tools", 1 },
                    { 702, 7, 0, false, "brand", "Brand", null, 2 },
                    { 703, 7, 2, false, "suitable_for", "Suitable For", "Men|Women|Unisex", 3 },
                    { 704, 7, 0, false, "volume", "Volume / Size", null, 4 },
                    { 801, 8, 0, true, "brand", "Brand", null, 1 },
                    { 802, 8, 0, false, "model", "Model", null, 2 },
                    { 803, 8, 2, false, "storage", "Storage", "32 GB|64 GB|128 GB|256 GB|512 GB|1 TB|N/A", 3 },
                    { 804, 8, 2, false, "ram", "RAM", "2 GB|4 GB|6 GB|8 GB|12 GB|16 GB|32 GB|N/A", 4 },
                    { 805, 8, 0, false, "color", "Color", null, 5 },
                    { 806, 8, 2, false, "warranty", "Warranty", "No Warranty|6 Months|1 Year|2 Years|3 Years", 6 },
                    { 807, 8, 2, false, "condition", "Condition", "New|Refurbished|Used", 7 },
                    { 901, 9, 0, false, "brand", "Brand", null, 1 },
                    { 902, 9, 0, false, "pack_size", "Pack Size", null, 2 },
                    { 903, 9, 2, false, "unit", "Unit", "Piece|Kg|Gram|Litre|ml|Dozen|Pack", 3 },
                    { 904, 9, 4, false, "organic", "Organic", null, 4 },
                    { 905, 9, 2, false, "veg_type", "Veg / Non-Veg", "Veg|Non-Veg", 5 },
                    { 1001, 10, 2, false, "material", "Material", "Wood|Engineered Wood|Metal|Glass|Plastic|Fabric|Leather|Cane", 1 },
                    { 1002, 10, 0, false, "dimensions", "Dimensions", null, 2 },
                    { 1003, 10, 0, false, "color", "Color / Finish", null, 3 },
                    { 1004, 10, 2, false, "room", "Room", "Living Room|Bedroom|Dining|Kitchen|Office|Outdoor", 4 },
                    { 1005, 10, 4, false, "assembly_required", "Assembly Required", null, 5 },
                    { 1101, 11, 2, false, "product_type", "Product Type", "Medicine|Wellness|Medical Device|Personal Care|Optical", 1 },
                    { 1102, 11, 0, false, "brand", "Brand", null, 2 },
                    { 1103, 11, 4, false, "prescription_required", "Prescription Required", null, 3 },
                    { 1104, 11, 0, false, "pack_size", "Pack Size", null, 4 },
                    { 1201, 12, 2, false, "course_level", "Level", "Beginner|Intermediate|Advanced|All Levels", 1 },
                    { 1202, 12, 2, false, "mode", "Mode", "In-person|Online|Hybrid", 2 },
                    { 1203, 12, 0, false, "duration", "Course Duration", null, 3 },
                    { 1204, 12, 4, false, "certificate", "Certificate Provided", null, 4 },
                    { 1301, 13, 0, false, "service_area", "Service Area", null, 1 },
                    { 1302, 13, 2, false, "delivery_mode", "Delivery Mode", "On-site|Remote|At our office", 2 },
                    { 1303, 13, 0, false, "turnaround", "Turnaround Time", null, 3 },
                    { 1401, 14, 0, false, "brand", "Brand", null, 1 },
                    { 1402, 14, 0, false, "specification", "Specification", null, 2 }
                });

            migrationBuilder.InsertData(
                table: "BusinessSubcategories",
                columns: new[] { "Id", "CategoryId", "Name", "SortOrder" },
                values: new object[,]
                {
                    { 101, 1, "Men's Footwear", 1 },
                    { 102, 1, "Women's Footwear", 2 },
                    { 103, 1, "Kids' Footwear", 3 },
                    { 104, 1, "Sports Shoes", 4 },
                    { 105, 1, "Formal Shoes", 5 },
                    { 106, 1, "Sandals & Slippers", 6 },
                    { 201, 2, "Florist", 1 },
                    { 202, 2, "Wedding Florist", 2 },
                    { 203, 2, "Event Decorator", 3 },
                    { 204, 2, "Plant Nursery", 4 },
                    { 301, 3, "Men's Wear", 1 },
                    { 302, 3, "Women's Wear", 2 },
                    { 303, 3, "Kids' Wear", 3 },
                    { 304, 3, "Ethnic Wear", 4 },
                    { 305, 3, "Boutique", 5 },
                    { 306, 3, "Tailoring", 6 },
                    { 401, 4, "Restaurant", 1 },
                    { 402, 4, "Cafe", 2 },
                    { 403, 4, "Fast Food", 3 },
                    { 404, 4, "Fine Dining", 4 },
                    { 405, 4, "Cloud Kitchen", 5 },
                    { 406, 4, "Juice & Dessert Bar", 6 },
                    { 501, 5, "Bakery", 1 },
                    { 502, 5, "Cake Shop", 2 },
                    { 503, 5, "Patisserie", 3 },
                    { 504, 5, "Home Baker", 4 },
                    { 601, 6, "Gold Jewellery", 1 },
                    { 602, 6, "Silver Jewellery", 2 },
                    { 603, 6, "Diamond Jewellery", 3 },
                    { 604, 6, "Fashion Jewellery", 4 },
                    { 701, 7, "Unisex Salon", 1 },
                    { 702, 7, "Beauty Parlour", 2 },
                    { 703, 7, "Spa", 3 },
                    { 704, 7, "Barber Shop", 4 },
                    { 705, 7, "Bridal Studio", 5 },
                    { 706, 7, "Nail Studio", 6 },
                    { 801, 8, "Mobile Phones", 1 },
                    { 802, 8, "Mobile Accessories", 2 },
                    { 803, 8, "Computers & Laptops", 3 },
                    { 804, 8, "Home Appliances", 4 },
                    { 805, 8, "Repair Centre", 5 },
                    { 901, 9, "Supermarket", 1 },
                    { 902, 9, "Kirana Store", 2 },
                    { 903, 9, "Organic Store", 3 },
                    { 904, 9, "Fruits & Vegetables", 4 },
                    { 905, 9, "Dairy", 5 },
                    { 1001, 10, "Furniture", 1 },
                    { 1002, 10, "Home Decor", 2 },
                    { 1003, 10, "Kitchenware", 3 },
                    { 1004, 10, "Furnishings", 4 },
                    { 1005, 10, "Lighting", 5 },
                    { 1101, 11, "Clinic", 1 },
                    { 1102, 11, "Pharmacy", 2 },
                    { 1103, 11, "Diagnostic Centre", 3 },
                    { 1104, 11, "Dental Clinic", 4 },
                    { 1105, 11, "Physiotherapy", 5 },
                    { 1106, 11, "Optical Store", 6 },
                    { 1201, 12, "Tuition Centre", 1 },
                    { 1202, 12, "Coaching Institute", 2 },
                    { 1203, 12, "Skill Training", 3 },
                    { 1204, 12, "Music & Arts", 4 },
                    { 1205, 12, "Language Classes", 5 },
                    { 1301, 13, "Consulting", 1 },
                    { 1302, 13, "Legal", 2 },
                    { 1303, 13, "Accounting & Tax", 3 },
                    { 1304, 13, "IT Services", 4 },
                    { 1305, 13, "Repair & Maintenance", 5 },
                    { 1306, 13, "Home Services", 6 },
                    { 1307, 13, "Photography", 7 },
                    { 1401, 14, "Retail Store", 1 },
                    { 1402, 14, "Wholesale", 2 },
                    { 1403, 14, "Manufacturing", 3 },
                    { 1404, 14, "Other", 4 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessAnalyticsEvents_BusinessId_OccurredAt",
                table: "BusinessAnalyticsEvents",
                columns: new[] { "BusinessId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessAnalyticsEvents_BusinessId_VisitorHash_Type_OccurredAt",
                table: "BusinessAnalyticsEvents",
                columns: new[] { "BusinessId", "VisitorHash", "Type", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessCategories_Key",
                table: "BusinessCategories",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BusinessCategoryAttributes_CategoryId_Key",
                table: "BusinessCategoryAttributes",
                columns: new[] { "CategoryId", "Key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BusinessEnquiries_BusinessId_Status_CreatedAt",
                table: "BusinessEnquiries",
                columns: new[] { "BusinessId", "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessEnquiryActivities_EnquiryId",
                table: "BusinessEnquiryActivities",
                column: "EnquiryId");

            migrationBuilder.CreateIndex(
                name: "IX_Businesses_CategoryId",
                table: "Businesses",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Businesses_OwnerId",
                table: "Businesses",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Businesses_QrCode",
                table: "Businesses",
                column: "QrCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Businesses_Slug",
                table: "Businesses",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Businesses_Status_IsActive",
                table: "Businesses",
                columns: new[] { "Status", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Businesses_SubcategoryId",
                table: "Businesses",
                column: "SubcategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessGalleryImages_BusinessId_Category",
                table: "BusinessGalleryImages",
                columns: new[] { "BusinessId", "Category" });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessMembers_BusinessId_UserId",
                table: "BusinessMembers",
                columns: new[] { "BusinessId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BusinessMembers_UserId",
                table: "BusinessMembers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessOffers_BusinessId_IsActive_EndDate",
                table: "BusinessOffers",
                columns: new[] { "BusinessId", "IsActive", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessProductCategories_BusinessId_Name",
                table: "BusinessProductCategories",
                columns: new[] { "BusinessId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BusinessProductImages_ProductId",
                table: "BusinessProductImages",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessProducts_BusinessId_IsAvailable_IsFeatured",
                table: "BusinessProducts",
                columns: new[] { "BusinessId", "IsAvailable", "IsFeatured" });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessProducts_BusinessId_Sku",
                table: "BusinessProducts",
                columns: new[] { "BusinessId", "Sku" },
                unique: true,
                filter: "[Sku] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessProducts_ProductCategoryId",
                table: "BusinessProducts",
                column: "ProductCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessReviews_BusinessId_Status",
                table: "BusinessReviews",
                columns: new[] { "BusinessId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessServices_BusinessId_IsAvailable",
                table: "BusinessServices",
                columns: new[] { "BusinessId", "IsAvailable" });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessSocialLinks_BusinessId",
                table: "BusinessSocialLinks",
                column: "BusinessId");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessSpecialHours_BusinessId_Date",
                table: "BusinessSpecialHours",
                columns: new[] { "BusinessId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BusinessSubcategories_CategoryId_Name",
                table: "BusinessSubcategories",
                columns: new[] { "CategoryId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BusinessWorkingHours_BusinessId_Day",
                table: "BusinessWorkingHours",
                columns: new[] { "BusinessId", "Day" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BusinessAnalyticsEvents");

            migrationBuilder.DropTable(
                name: "BusinessCategoryAttributes");

            migrationBuilder.DropTable(
                name: "BusinessEnquiryActivities");

            migrationBuilder.DropTable(
                name: "BusinessGalleryImages");

            migrationBuilder.DropTable(
                name: "BusinessMembers");

            migrationBuilder.DropTable(
                name: "BusinessOffers");

            migrationBuilder.DropTable(
                name: "BusinessProductImages");

            migrationBuilder.DropTable(
                name: "BusinessReviews");

            migrationBuilder.DropTable(
                name: "BusinessServices");

            migrationBuilder.DropTable(
                name: "BusinessSocialLinks");

            migrationBuilder.DropTable(
                name: "BusinessSpecialHours");

            migrationBuilder.DropTable(
                name: "BusinessWorkingHours");

            migrationBuilder.DropTable(
                name: "BusinessEnquiries");

            migrationBuilder.DropTable(
                name: "BusinessProducts");

            migrationBuilder.DropTable(
                name: "BusinessProductCategories");

            migrationBuilder.DropTable(
                name: "Businesses");

            migrationBuilder.DropTable(
                name: "BusinessSubcategories");

            migrationBuilder.DropTable(
                name: "BusinessCategories");
        }
    }
}
