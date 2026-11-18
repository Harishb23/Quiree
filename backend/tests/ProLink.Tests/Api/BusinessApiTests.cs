using System.Net;
using System.Net.Http.Json;
using ProLink.Application.DTOs;
using ProLink.Domain.Enums;
using ProLink.Tests.Infrastructure;

namespace ProLink.Tests.Api;

public sealed class BusinessApiTests(TestApp app) : IClassFixture<TestApp>
{
    private const string Browser = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52];

    internal static object Business(string name = "Sole Street", int categoryId = 1, string? phone = "+91 98765 43210",
        string? city = "Chennai") => new
    {
        name,
        categoryId,
        subcategoryId = categoryId * 100 + 1, // first subcategory of the category (seed id scheme)
        description = "Sneakers and formal shoes",
        phone,
        whatsApp = "+91 98765 43210",
        email = "hello@solestreet.test",
        addressLine1 = "12 Anna Salai",
        city,
        country = "India",
        workingHours = new[]
        {
            new { day = "Monday", isClosed = false, opens = "10:00", closes = "21:00" },
            new { day = "Sunday", isClosed = true, opens = (string?)null, closes = (string?)null }
        },
        specialHours = new[] { new { date = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(10).ToString("yyyy-MM-dd"), isClosed = true, note = "New Year" } },
        deliveryAvailable = true,
        pickupAvailable = true,
        paymentMethods = new[] { "Cash", "Upi" },
        socialLinks = new[] { new { platform = "Instagram", url = "https://instagram.com/solestreet" } },
        theme = "classic",
        brandColor = "#6b3fa0",
        layout = "grid",
        featuredSections = new[] { "products", "offers", "info" }
    };

    private async Task<(HttpClient Client, BusinessDetailDto Business)> CreateBusinessAsync(bool publish = true, string name = "Sole Street")
    {
        var (client, _) = await app.RegisterBusinessAsync();
        var created = await client.PostAsJsonAsync("/api/businesses", Business(name));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var business = (await created.Content.ReadFromJsonAsync<BusinessDetailDto>(TestApp.Json))!;
        if (publish)
        {
            var published = await client.PutAsync($"/api/businesses/{business.Id}/publish", null);
            Assert.Equal(HttpStatusCode.OK, published.StatusCode);
            business = (await published.Content.ReadFromJsonAsync<BusinessDetailDto>(TestApp.Json))!;
        }
        return (client, business);
    }

    private static HttpClient Anonymous(TestApp app, string userAgent = Browser)
    {
        var client = app.CreateClient();
        client.DefaultRequestHeaders.UserAgent.ParseAdd(userAgent);
        return client;
    }

    private static MultipartFormDataContent Image(string field = "file") => new() { { new ByteArrayContent(Png), field, "photo.png" } };

    // ---------------------------------------------------------------------
    // Categories
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Categories_are_seeded_with_category_specific_attributes()
    {
        var client = app.CreateClient();
        var categories = await client.GetFromJsonAsync<List<BusinessCategoryDto>>("/api/business-categories", TestApp.Json);
        Assert.Equal(14, categories!.Count);
        Assert.Contains(categories, c => c.Key == "flowers" && c.Subcategories.Count > 0);

        var shoes = await client.GetFromJsonAsync<List<CategoryAttributeDto>>("/api/business-categories/1/attributes", TestApp.Json);
        var restaurant = await client.GetFromJsonAsync<List<CategoryAttributeDto>>("/api/business-categories/4/attributes", TestApp.Json);
        Assert.Contains(shoes!, a => a.Key == "shoe_size" && a.InputType == AttributeInputType.MultiSelect);
        Assert.Contains(restaurant!, a => a.Key == "veg_type" && a.IsRequired);
        Assert.DoesNotContain(restaurant!, a => a.Key == "shoe_size");
    }

    // ---------------------------------------------------------------------
    // Profile lifecycle & publishing
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Draft_business_is_private_until_published()
    {
        var (client, business) = await CreateBusinessAsync(publish: false);
        Assert.Equal(BusinessStatus.Draft, business.Status);
        Assert.StartsWith("sole-street", business.Slug);
        Assert.Equal(BusinessRole.Owner, business.MyRole);
        Assert.Equal(2, business.WorkingHours.Count);
        Assert.Equal([PaymentMethods.Cash, PaymentMethods.Upi], business.PaymentMethods);
        Assert.Equal("#6B3FA0", business.BrandColor);

        var mine = await client.GetFromJsonAsync<List<BusinessSummaryDto>>("/api/businesses/my-businesses", TestApp.Json);
        Assert.Contains(mine!, b => b.Id == business.Id);

        var anon = Anonymous(app);
        Assert.Equal(HttpStatusCode.NotFound, (await anon.GetAsync($"/api/public/businesses/{business.Slug}")).StatusCode);

        // The owner can still preview the draft storefront.
        var preview = await client.GetFromJsonAsync<PublicBusinessDto>($"/api/businesses/{business.Id}/preview", TestApp.Json);
        Assert.True(preview!.IsPreview);

        Assert.Equal(HttpStatusCode.OK, (await client.PutAsync($"/api/businesses/{business.Id}/publish", null)).StatusCode);
        var storefront = await anon.GetFromJsonAsync<PublicBusinessDto>($"/api/public/businesses/{business.Slug}", TestApp.Json);
        Assert.Equal("Sole Street", storefront!.Name);
        Assert.Equal("Footwear and Shoe Shops", storefront.CategoryName);
        Assert.Contains(storefront.UpcomingSpecialHours, h => h.Note == "New Year");
    }

    [Fact]
    public async Task Publishing_requires_a_contact_method_and_city()
    {
        var (client, _) = await app.RegisterBusinessAsync();
        var created = await client.PostAsJsonAsync("/api/businesses", new { name = "No Contact Co", categoryId = 14 });
        var business = (await created.Content.ReadFromJsonAsync<BusinessDetailDto>(TestApp.Json))!;
        var publish = await client.PutAsync($"/api/businesses/{business.Id}/publish", null);
        Assert.Equal(HttpStatusCode.BadRequest, publish.StatusCode);
        Assert.Contains("before publishing", await publish.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("{\"name\":\"X\",\"categoryId\":99}")]
    [InlineData("{\"name\":\"X\",\"categoryId\":1,\"subcategoryId\":201}")]
    [InlineData("{\"name\":\"X\",\"categoryId\":1,\"website\":\"javascript:alert(1)\"}")]
    [InlineData("{\"name\":\"X\",\"categoryId\":1,\"brandColor\":\"purple\"}")]
    [InlineData("{\"name\":\"X\",\"categoryId\":1,\"workingHours\":[{\"day\":\"Monday\",\"isClosed\":false,\"opens\":\"25:00\",\"closes\":\"10:00\"}]}")]
    public async Task Invalid_business_payloads_are_rejected(string json)
    {
        var (client, _) = await app.RegisterBusinessAsync();
        var response = await client.PostAsync("/api/businesses", new StringContent(json, System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Slugs_are_unique_and_editable_by_the_owner()
    {
        var (_, first) = await CreateBusinessAsync(name: "Bloom Florist");
        var (client, second) = await CreateBusinessAsync(name: "Bloom Florist");
        Assert.NotEqual(first.Slug, second.Slug);

        Assert.Equal(HttpStatusCode.Conflict,
            (await client.PutAsJsonAsync($"/api/businesses/{second.Id}/slug", new { slug = first.Slug })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PutAsJsonAsync($"/api/businesses/{second.Id}/slug", new { slug = "Bad Slug!" })).StatusCode);

        var newSlug = $"bloom-{Guid.NewGuid():N}"[..20];
        var updated = await client.PutAsJsonAsync($"/api/businesses/{second.Id}/slug", new { slug = newSlug });
        Assert.Equal(newSlug, (await updated.Content.ReadFromJsonAsync<BusinessDetailDto>(TestApp.Json))!.Slug);
    }

    // ---------------------------------------------------------------------
    // Ownership & team roles
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Other_users_cannot_see_or_change_a_business()
    {
        var (_, business) = await CreateBusinessAsync();
        var (stranger, _) = await app.RegisterBusinessAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/businesses/{business.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PutAsJsonAsync($"/api/businesses/{business.Id}", Business("Hijacked"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.DeleteAsync($"/api/businesses/{business.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.PostAsJsonAsync($"/api/businesses/{business.Id}/products", new { name = "Fake" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/businesses/{business.Id}/enquiries")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.CreateClient().GetAsync($"/api/businesses/{business.Id}")).StatusCode);
    }

    [Fact]
    public async Task Team_roles_limit_what_members_can_do()
    {
        var (owner, business) = await CreateBusinessAsync();
        var editorEmail = $"editor{Guid.NewGuid():N}@example.com";
        var managerEmail = $"manager{Guid.NewGuid():N}@example.com";
        var (editor, _) = await app.RegisterBusinessAsync(email: editorEmail);
        var (manager, _) = await app.RegisterBusinessAsync(email: managerEmail);

        Assert.Equal(HttpStatusCode.NotFound,
            (await owner.PostAsJsonAsync($"/api/businesses/{business.Id}/members", new { email = "nobody@example.com", role = "Editor" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await owner.PostAsJsonAsync($"/api/businesses/{business.Id}/members", new { email = editorEmail, role = "Editor" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await owner.PostAsJsonAsync($"/api/businesses/{business.Id}/members", new { email = managerEmail, role = "Manager" })).StatusCode);

        var members = await owner.GetFromJsonAsync<List<BusinessMemberDto>>($"/api/businesses/{business.Id}/members", TestApp.Json);
        Assert.Equal(3, members!.Count);

        // Editors manage the catalogue but not the profile, enquiries or the business itself.
        var editorList = await editor.GetFromJsonAsync<List<BusinessSummaryDto>>("/api/businesses/my-businesses", TestApp.Json);
        Assert.Contains(editorList!, b => b.Id == business.Id && b.MyRole == BusinessRole.Editor);
        Assert.Equal(HttpStatusCode.Created, (await editor.PostAsJsonAsync($"/api/businesses/{business.Id}/products", new { name = "Runner" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.PutAsJsonAsync($"/api/businesses/{business.Id}", Business())).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.GetAsync($"/api/businesses/{business.Id}/enquiries")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await editor.DeleteAsync($"/api/businesses/{business.Id}")).StatusCode);

        // Managers can edit and unpublish, but cannot delete or manage the team.
        Assert.Equal(HttpStatusCode.OK, (await manager.PutAsync($"/api/businesses/{business.Id}/unpublish", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await manager.GetAsync($"/api/businesses/{business.Id}/enquiries")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await manager.DeleteAsync($"/api/businesses/{business.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await manager.PostAsJsonAsync($"/api/businesses/{business.Id}/members", new { email = editorEmail, role = "Manager" })).StatusCode);
    }

    // ---------------------------------------------------------------------
    // Products
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Products_validate_category_attributes_prices_and_skus()
    {
        var (client, business) = await CreateBusinessAsync();
        var url = $"/api/businesses/{business.Id}/products";

        var badOption = await client.PostAsJsonAsync(url, new { name = "Runner", attributes = new Dictionary<string, string> { ["gender"] = "Martian" } });
        Assert.Equal(HttpStatusCode.BadRequest, badOption.StatusCode);

        var badDiscount = await client.PostAsJsonAsync(url, new { name = "Runner", priceInPaise = 1000, discountPriceInPaise = 1500 });
        Assert.Equal(HttpStatusCode.BadRequest, badDiscount.StatusCode);

        var category = await (await client.PostAsJsonAsync($"/api/businesses/{business.Id}/product-categories", new { name = "Sneakers" }))
            .Content.ReadFromJsonAsync<ProductCategoryDto>(TestApp.Json);

        var created = await client.PostAsJsonAsync(url, new
        {
            name = "Air Runner",
            sku = "AR-1",
            productCategoryId = category!.Id,
            priceInPaise = 499900,
            discountPriceInPaise = 399900,
            isFeatured = true,
            attributes = new Dictionary<string, string>
            {
                ["gender"] = "men", ["shoe_size"] = "UK 9, uk 8", ["material"] = "Mesh", ["unknown_key"] = "ignored", ["color"] = "<b>Black</b>"
            }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var product = (await created.Content.ReadFromJsonAsync<ProductDto>(TestApp.Json))!;
        Assert.Equal("Men", product.Attributes["gender"]);
        Assert.Equal("UK 8,UK 9", product.Attributes["shoe_size"]);
        Assert.Equal("Black", product.Attributes["color"]);
        Assert.False(product.Attributes.ContainsKey("unknown_key"));
        Assert.Equal("Sneakers", product.ProductCategoryName);

        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(url, new { name = "Copy", sku = "AR-1" })).StatusCode);

        // Images: real image accepted, disguised file rejected, limits enforced by signature.
        var withImages = await client.PostAsync($"{url}/{product.Id}/images", new MultipartFormDataContent
        {
            { new ByteArrayContent(Png), "files", "a.png" }, { new ByteArrayContent(Png), "files", "b.png" }
        });
        Assert.Equal(HttpStatusCode.OK, withImages.StatusCode);
        var imaged = (await withImages.Content.ReadFromJsonAsync<ProductDto>(TestApp.Json))!;
        Assert.Equal(2, imaged.Images.Count);
        Assert.StartsWith("/uploads/business/", imaged.Images[0].Url);

        var fake = new MultipartFormDataContent { { new ByteArrayContent("<?php ?>"u8.ToArray()), "files", "evil.png" } };
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync($"{url}/{product.Id}/images", fake)).StatusCode);

        var reordered = await client.PutAsJsonAsync($"{url}/{product.Id}/images/order",
            new { imageIds = imaged.Images.Select(i => i.Id).Reverse() });
        Assert.Equal(imaged.Images[1].Id, (await reordered.Content.ReadFromJsonAsync<ProductDto>(TestApp.Json))!.Images[0].Id);

        // Search, filter, sort, paginate.
        for (var i = 0; i < 5; i++)
            await client.PostAsJsonAsync(url, new { name = $"Sandal {i}", priceInPaise = 10000 * (i + 1), isAvailable = i != 4 });

        var page = await client.GetFromJsonAsync<PagedResult<ProductDto>>($"{url}?search=sandal&sort=price_desc&page=1&pageSize=2", TestApp.Json);
        Assert.Equal(5, page!.Total);
        Assert.Equal(2, page.Items.Count);
        Assert.Equal("Sandal 4", page.Items[0].Name);

        var featured = await client.GetFromJsonAsync<PagedResult<ProductDto>>($"{url}?featured=true", TestApp.Json);
        Assert.Single(featured!.Items);

        // Public listing hides unavailable products and labels attributes.
        var pub = await Anonymous(app).GetFromJsonAsync<PagedResult<PublicProductDto>>(
            $"/api/public/businesses/{business.Slug}/products?search=sandal", TestApp.Json);
        Assert.Equal(4, pub!.Total);
        var publicProduct = await Anonymous(app).GetFromJsonAsync<PublicProductDto>(
            $"/api/public/businesses/{business.Slug}/products/{product.Id}", TestApp.Json);
        Assert.Contains(publicProduct!.Attributes, a => a.Label == "Shoe Size" && a.Value == "UK 8, UK 9");

        // Deleting a category keeps its products (uncategorised).
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/businesses/{business.Id}/product-categories/{category.Id}")).StatusCode);
        var after = await client.GetFromJsonAsync<ProductDto>($"{url}/{product.Id}", TestApp.Json);
        Assert.Null(after!.ProductCategoryId);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"{url}/{product.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"{url}/{product.Id}")).StatusCode);
    }

    [Fact]
    public async Task Required_category_attributes_are_enforced()
    {
        var (client, _) = await app.RegisterBusinessAsync();
        var created = await client.PostAsJsonAsync("/api/businesses", new { name = "Spice Route", categoryId = 4 });
        var business = (await created.Content.ReadFromJsonAsync<BusinessDetailDto>(TestApp.Json))!;

        var missing = await client.PostAsJsonAsync($"/api/businesses/{business.Id}/products", new { name = "Paneer Tikka" });
        Assert.Equal(HttpStatusCode.BadRequest, missing.StatusCode);
        Assert.Contains("Veg / Non-Veg is required", await missing.Content.ReadAsStringAsync());

        var ok = await client.PostAsJsonAsync($"/api/businesses/{business.Id}/products",
            new { name = "Paneer Tikka", priceInPaise = 24000, attributes = new Dictionary<string, string> { ["veg_type"] = "Veg", ["serves"] = "2" } });
        Assert.Equal(HttpStatusCode.Created, ok.StatusCode);
    }

    // ---------------------------------------------------------------------
    // Services, offers, gallery
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Services_offers_and_gallery_are_managed_and_published_correctly()
    {
        var (client, business) = await CreateBusinessAsync();
        var b = $"/api/businesses/{business.Id}";

        var service = await (await client.PostAsJsonAsync($"{b}/services",
            new { name = "Shoe Repair", priceInPaise = 15000, priceNote = "starting from", durationMinutes = 30 }))
            .Content.ReadFromJsonAsync<BusinessServiceDto>(TestApp.Json);
        Assert.Equal(30, service!.DurationMinutes);
        var withImage = await client.PostAsync($"{b}/services/{service.Id}/image", Image());
        Assert.NotNull((await withImage.Content.ReadFromJsonAsync<BusinessServiceDto>(TestApp.Json))!.ImageUrl);
        await client.PostAsJsonAsync($"{b}/services", new { name = "Hidden Service", isAvailable = false });

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var live = await client.PostAsJsonAsync($"{b}/offers", new { title = "Diwali Sale", discountPercent = 20, startDate = today.AddDays(-2), endDate = today.AddDays(5) });
        var liveOffer = (await live.Content.ReadFromJsonAsync<OfferDto>(TestApp.Json))!;
        Assert.Equal(OfferState.Live, liveOffer.State);
        var expired = await (await client.PostAsJsonAsync($"{b}/offers", new { title = "Old Sale", discountPercent = 10, startDate = today.AddDays(-30), endDate = today.AddDays(-3) }))
            .Content.ReadFromJsonAsync<OfferDto>(TestApp.Json);
        Assert.Equal(OfferState.Expired, expired!.State);
        var scheduled = await (await client.PostAsJsonAsync($"{b}/offers", new { title = "Next Month", startDate = today.AddDays(20) }))
            .Content.ReadFromJsonAsync<OfferDto>(TestApp.Json);
        Assert.Equal(OfferState.Scheduled, scheduled!.State);
        var inactive = await (await client.PostAsJsonAsync($"{b}/offers", new { title = "Paused", isActive = false }))
            .Content.ReadFromJsonAsync<OfferDto>(TestApp.Json);
        Assert.Equal(OfferState.Inactive, inactive!.State);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostAsJsonAsync($"{b}/offers", new { title = "Backwards", startDate = today, endDate = today.AddDays(-1) })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"{b}/offers/{liveOffer.Id}/banner", Image())).StatusCode);

        var gallery = new MultipartFormDataContent
        {
            { new ByteArrayContent(Png), "file", "shop.png" }, { new StringContent("Interior"), "category" }, { new StringContent("Our store"), "caption" }
        };
        var photo = await (await client.PostAsync($"{b}/gallery", gallery)).Content.ReadFromJsonAsync<GalleryImageDto>(TestApp.Json);
        Assert.Equal(GalleryCategory.Interior, photo!.Category);
        var edited = await client.PutAsJsonAsync($"{b}/gallery/{photo.Id}", new { category = "Exterior", caption = "Front" });
        Assert.Equal(GalleryCategory.Exterior, (await edited.Content.ReadFromJsonAsync<GalleryImageDto>(TestApp.Json))!.Category);

        var storefront = await Anonymous(app).GetFromJsonAsync<PublicBusinessDto>($"/api/public/businesses/{business.Slug}", TestApp.Json);
        Assert.Single(storefront!.Services);
        Assert.Single(storefront.Offers);
        Assert.Equal("Diwali Sale", storefront.Offers[0].Title);
        Assert.Single(storefront.Gallery);

        var publicOffers = await Anonymous(app).GetFromJsonAsync<List<PublicOfferDto>>($"/api/public/businesses/{business.Slug}/offers", TestApp.Json);
        Assert.Single(publicOffers!);
        var publicServices = await Anonymous(app).GetFromJsonAsync<List<PublicServiceDto>>($"/api/public/businesses/{business.Slug}/services", TestApp.Json);
        Assert.Single(publicServices!);
    }

    // ---------------------------------------------------------------------
    // QR codes
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Business_qr_resolves_to_the_business_and_can_be_disabled_and_regenerated()
    {
        var (client, business) = await CreateBusinessAsync();
        var qr = await client.GetFromJsonAsync<BusinessQrDto>($"/api/businesses/{business.Id}/qr", TestApp.Json);
        Assert.Equal($"{TestApp.PublicBaseUrl}/bq/{qr!.QrCode}", qr.QrUrl);
        Assert.Equal($"{TestApp.PublicBaseUrl}/business/{business.Slug}", qr.PublicUrl);
        Assert.DoesNotContain(business.Id.ToString(), qr.QrUrl);

        var png = await client.GetAsync($"/api/businesses/{business.Id}/qr/png?size=300");
        Assert.Equal("image/png", png.Content.Headers.ContentType!.MediaType);
        var svg = await client.GetAsync($"/api/businesses/{business.Id}/qr/svg");
        Assert.Contains("<svg", await svg.Content.ReadAsStringAsync());

        // Scans from a browser count once per visitor window; bots never count.
        var visitor = Anonymous(app);
        var resolved = await visitor.GetFromJsonAsync<QrResolveDto>($"/api/bq/{qr.QrCode}", TestApp.Json);
        Assert.Equal(business.Slug, resolved!.Slug);
        await visitor.GetAsync($"/api/bq/{qr.QrCode}");
        await Anonymous(app, "WhatsApp/2.23 link preview").GetAsync($"/api/bq/{qr.QrCode}");
        qr = await client.GetFromJsonAsync<BusinessQrDto>($"/api/businesses/{business.Id}/qr", TestApp.Json);
        Assert.Equal(1, qr!.TotalScans);

        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/businesses/{business.Id}/qr", new { enabled = false })).StatusCode);
        Assert.Equal(HttpStatusCode.Gone, (await visitor.GetAsync($"/api/bq/{qr.QrCode}")).StatusCode);

        var regenerated = await (await client.PostAsync($"/api/businesses/{business.Id}/qr", null)).Content.ReadFromJsonAsync<BusinessQrDto>(TestApp.Json);
        Assert.NotEqual(qr.QrCode, regenerated!.QrCode);
        Assert.True(regenerated.Enabled);
        Assert.Equal(HttpStatusCode.NotFound, (await visitor.GetAsync($"/api/bq/{qr.QrCode}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await visitor.GetAsync($"/api/bq/{regenerated.QrCode}")).StatusCode);

        // Unpublished businesses don't resolve.
        await client.PutAsync($"/api/businesses/{business.Id}/unpublish", null);
        Assert.Equal(HttpStatusCode.NotFound, (await visitor.GetAsync($"/api/bq/{regenerated.QrCode}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await visitor.GetAsync("/api/bq/not-a-code")).StatusCode);
    }

    // ---------------------------------------------------------------------
    // Enquiries
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Customers_can_enquire_and_owners_can_manage_and_reply()
    {
        var (client, business) = await CreateBusinessAsync();
        var anon = Anonymous(app);
        var url = $"/api/public/businesses/{business.Slug}/enquiries";

        Assert.Equal(HttpStatusCode.BadRequest,
            (await anon.PostAsJsonAsync(url, new { customerName = "Asha", subject = "Price?", message = "How much are these?" })).StatusCode);

        var product = await (await client.PostAsJsonAsync($"/api/businesses/{business.Id}/products", new { name = "Air Runner" }))
            .Content.ReadFromJsonAsync<ProductDto>(TestApp.Json);
        var sentBefore = app.Emails.Sent.Count;
        var submitted = await anon.PostAsJsonAsync(url, new
        {
            customerName = "Asha <script>x</script>", email = "asha@example.com", subject = "Size 8 available?",
            message = "Do you have it in size 8?", productId = product!.Id
        });
        Assert.Equal(HttpStatusCode.Created, submitted.StatusCode);
        Assert.Contains(app.Emails.Sent.Skip(sentBefore), m => m.Subject.Contains("New enquiry"));

        var list = await client.GetFromJsonAsync<PagedResult<EnquirySummaryDto>>($"/api/businesses/{business.Id}/enquiries?status=New", TestApp.Json);
        var summary = Assert.Single(list!.Items);
        Assert.Equal("Asha x", summary.CustomerName);
        Assert.Equal("Air Runner", summary.RelatedItemName);

        var inProgress = await client.PutAsJsonAsync($"/api/businesses/{business.Id}/enquiries/{summary.Id}/status",
            new { status = "InProgress", note = "Checking stock" });
        Assert.Equal(BusinessEnquiryStatus.InProgress, (await inProgress.Content.ReadFromJsonAsync<EnquiryDetailDto>(TestApp.Json))!.Status);

        var beforeReply = app.Emails.Sent.Count;
        var replied = await client.PostAsJsonAsync($"/api/businesses/{business.Id}/enquiries/{summary.Id}/responses",
            new { message = "Yes, size 8 is in stock!", sendEmail = true });
        var detail = (await replied.Content.ReadFromJsonAsync<EnquiryDetailDto>(TestApp.Json))!;
        Assert.Equal(BusinessEnquiryStatus.Responded, detail.Status);
        Assert.Equal([EnquiryActivityType.Created, EnquiryActivityType.StatusChanged, EnquiryActivityType.Response],
            detail.Activities.Select(a => a.Type));
        Assert.Contains(app.Emails.Sent.Skip(beforeReply), m => m.To == "asha@example.com" && m.Body.Contains("size 8 is in stock"));

        var searched = await client.GetFromJsonAsync<PagedResult<EnquirySummaryDto>>($"/api/businesses/{business.Id}/enquiries?search=size", TestApp.Json);
        Assert.Single(searched!.Items);
        var closed = await client.GetFromJsonAsync<PagedResult<EnquirySummaryDto>>($"/api/businesses/{business.Id}/enquiries?status=Closed", TestApp.Json);
        Assert.Empty(closed!.Items);
    }

    // ---------------------------------------------------------------------
    // Reviews
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Reviews_are_moderated_before_appearing_publicly()
    {
        var (client, business) = await CreateBusinessAsync();
        var anon = Anonymous(app);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await anon.PostAsJsonAsync($"/api/public/businesses/{business.Slug}/reviews", new { customerName = "Ravi", rating = 6 })).StatusCode);
        Assert.Equal(HttpStatusCode.Created,
            (await anon.PostAsJsonAsync($"/api/public/businesses/{business.Slug}/reviews", new { customerName = "Ravi", rating = 4, comment = "Great fit" })).StatusCode);

        var storefront = await anon.GetFromJsonAsync<PublicBusinessDto>($"/api/public/businesses/{business.Slug}", TestApp.Json);
        Assert.Empty(storefront!.Reviews);

        var pending = await client.GetFromJsonAsync<List<ReviewDto>>($"/api/businesses/{business.Id}/reviews?status=Pending", TestApp.Json);
        var review = Assert.Single(pending!);
        await client.PutAsJsonAsync($"/api/businesses/{business.Id}/reviews/{review.Id}", new { status = "Approved", ownerReply = "Thank you!" });

        storefront = await anon.GetFromJsonAsync<PublicBusinessDto>($"/api/public/businesses/{business.Slug}", TestApp.Json);
        Assert.Equal("Thank you!", Assert.Single(storefront!.Reviews).OwnerReply);
        Assert.Equal(4.0, storefront.Rating.Average);
        Assert.Equal(1, storefront.Rating.Count);
    }

    // ---------------------------------------------------------------------
    // Analytics & dashboard
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Analytics_count_real_visitors_once_and_ignore_bots_and_the_team()
    {
        var (client, business) = await CreateBusinessAsync();
        var events = $"/api/public/businesses/{business.Slug}/events";
        var product = await (await client.PostAsJsonAsync($"/api/businesses/{business.Id}/products", new { name = "Air Runner" }))
            .Content.ReadFromJsonAsync<ProductDto>(TestApp.Json);

        var visitor = Anonymous(app);
        await visitor.PostAsJsonAsync(events, new { type = "ProfileView" });
        await visitor.PostAsJsonAsync(events, new { type = "ProfileView" }); // duplicate within window
        await visitor.PostAsJsonAsync(events, new { type = "WhatsAppClick" });
        await visitor.PostAsJsonAsync(events, new { type = "ProductView", productId = product!.Id });
        await Anonymous(app, "Googlebot/2.1").PostAsJsonAsync(events, new { type = "ProfileView" });
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0) Owner");
        await client.PostAsJsonAsync(events, new { type = "ProfileView" }); // the owner's own visit

        Assert.Equal(HttpStatusCode.BadRequest, (await visitor.PostAsJsonAsync(events, new { type = "QrScan" })).StatusCode);

        var analytics = await client.GetFromJsonAsync<BusinessAnalyticsDto>($"/api/businesses/{business.Id}/analytics?days=7", TestApp.Json);
        Assert.Equal(1, analytics!.Totals.ProfileViews);
        Assert.Equal(1, analytics.Totals.WhatsAppClicks);
        Assert.Equal(1, analytics.Totals.ProductViews);
        Assert.Equal(1, analytics.Totals.UniqueVisitors);
        Assert.Equal(7, analytics.Daily.Count);
        Assert.Equal(1, analytics.Daily[^1].Views);
        Assert.Equal("Air Runner", Assert.Single(analytics.TopProducts).Name);

        var dashboard = await client.GetFromJsonAsync<BusinessDashboardDto>($"/api/businesses/{business.Id}/dashboard", TestApp.Json);
        Assert.Equal(1, dashboard!.ProductCount);
        Assert.True(dashboard.Completion.Percent > 0);
        Assert.Contains(dashboard.RecentActivity, a => a.Kind == "whatsapp");
    }

    // ---------------------------------------------------------------------
    // Deletion & isolation from personal profiles
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Deleting_a_business_removes_its_content()
    {
        var (client, business) = await CreateBusinessAsync();
        await client.PostAsJsonAsync($"/api/businesses/{business.Id}/products", new { name = "Air Runner" });
        await Anonymous(app).PostAsJsonAsync($"/api/public/businesses/{business.Slug}/enquiries",
            new { customerName = "Asha", phone = "9876543210", subject = "Hi", message = "Hello there" });

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/businesses/{business.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Anonymous(app).GetAsync($"/api/public/businesses/{business.Slug}")).StatusCode);
        Assert.Equal(0, app.Db(db => db.BusinessProducts.Count(p => p.BusinessId == business.Id)));
        Assert.Equal(0, app.Db(db => db.BusinessEnquiries.Count(e => e.BusinessId == business.Id)));

        // The business account itself still works.
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/businesses/my-businesses")).StatusCode);
    }

    [Fact]
    public async Task Personal_usernames_cannot_take_business_route_names()
    {
        var client = app.CreateClient();
        var check = await client.GetFromJsonAsync<UsernameAvailabilityDto>("/api/auth/username-available?username=business", TestApp.Json);
        Assert.False(check!.Available);
    }

    [Fact]
    public async Task Timestamps_are_returned_as_utc_so_browsers_show_the_right_local_time()
    {
        var (client, business) = await CreateBusinessAsync();
        // Re-read from the database (not the in-memory entity) and inspect the raw JSON.
        var json = await client.GetStringAsync($"/api/businesses/{business.Id}");
        Assert.Matches("\"createdAt\":\"[^\"]+Z\"", json);
        var payments = await client.GetStringAsync("/api/subscription");
        Assert.DoesNotContain("+00:00\"", payments);
    }
}
