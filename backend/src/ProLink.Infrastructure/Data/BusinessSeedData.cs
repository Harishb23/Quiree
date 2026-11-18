using Microsoft.EntityFrameworkCore;
using ProLink.Domain.Entities;
using ProLink.Domain.Enums;

namespace ProLink.Infrastructure.Data;

/// <summary>
/// Business category catalogue. Adding a category or attribute is a data change: append a row here (with a new,
/// never-reused id) and add a migration. Ids are stable: subcategory / attribute ids are categoryId * 100 + n.
/// </summary>
internal static class BusinessSeedData
{
    private sealed record Attr(string Key, string Label, AttributeInputType Type, string? Options = null, bool Required = false);

    private sealed record Cat(int Id, string Key, string Name, string Icon, string[] Subcategories, Attr[] Attributes);

    private const AttributeInputType Text = AttributeInputType.Text;
    private const AttributeInputType Number = AttributeInputType.Number;
    private const AttributeInputType Select = AttributeInputType.Select;
    private const AttributeInputType Multi = AttributeInputType.MultiSelect;
    private const AttributeInputType Bool = AttributeInputType.Boolean;

    private static readonly Cat[] Categories =
    [
        new(1, "footwear", "Footwear and Shoe Shops", "footprints",
            ["Men's Footwear", "Women's Footwear", "Kids' Footwear", "Sports Shoes", "Formal Shoes", "Sandals & Slippers"],
            [
                new("brand", "Brand", Text),
                new("shoe_size", "Shoe Size", Multi, "UK 3|UK 4|UK 5|UK 6|UK 7|UK 8|UK 9|UK 10|UK 11|UK 12"),
                new("gender", "Gender", Select, "Men|Women|Unisex|Boys|Girls"),
                new("shoe_type", "Shoe Type", Select, "Sneakers|Running|Formal|Casual|Boots|Sandals|Slippers|Loafers|Heels|Flats"),
                new("material", "Material", Select, "Leather|Synthetic|Canvas|Mesh|Suede|Rubber"),
                new("color", "Color", Text)
            ]),
        new(2, "flowers", "Flower Shops", "flower-2",
            ["Florist", "Wedding Florist", "Event Decorator", "Plant Nursery"],
            [
                new("flower_type", "Flower Type", Multi, "Roses|Lilies|Orchids|Carnations|Tulips|Sunflowers|Gerberas|Mixed"),
                new("bouquet_type", "Bouquet Type", Select, "Hand-tied|Basket|Box|Vase Arrangement|Garland|Single Stem"),
                new("occasion", "Occasion", Multi, "Birthday|Anniversary|Wedding|Love & Romance|Sympathy|Congratulations|Festival"),
                new("arrangement", "Arrangement", Text),
                new("delivery_available", "Delivery Available", Bool)
            ]),
        new(3, "clothing", "Clothing and Fashion", "shirt",
            ["Men's Wear", "Women's Wear", "Kids' Wear", "Ethnic Wear", "Boutique", "Tailoring"],
            [
                new("clothing_type", "Clothing Type", Select, "Shirt|T-Shirt|Trousers|Jeans|Dress|Saree|Kurta|Lehenga|Jacket|Suit|Ethnic Set"),
                new("size", "Size", Multi, "XS|S|M|L|XL|XXL|3XL|Free Size"),
                new("color", "Color", Text),
                new("fabric", "Fabric", Select, "Cotton|Linen|Silk|Polyester|Rayon|Denim|Wool|Chiffon|Georgette"),
                new("brand", "Brand", Text),
                new("collection", "Collection", Text)
            ]),
        new(4, "restaurants", "Restaurants and Cafes", "utensils",
            ["Restaurant", "Cafe", "Fast Food", "Fine Dining", "Cloud Kitchen", "Juice & Dessert Bar"],
            [
                new("food_category", "Food Category", Select, "Starters|Main Course|Breads|Rice & Biryani|Desserts|Beverages|Combos|Snacks"),
                new("food_type", "Cuisine", Select, "South Indian|North Indian|Chinese|Continental|Italian|Arabian|Street Food|Bakery"),
                new("veg_type", "Veg / Non-Veg", Select, "Veg|Non-Veg|Egg|Vegan", Required: true),
                new("spice_level", "Spice Level", Select, "Mild|Medium|Hot"),
                new("serves", "Serves", Number)
            ]),
        new(5, "bakeries", "Bakeries", "cake-slice",
            ["Bakery", "Cake Shop", "Patisserie", "Home Baker"],
            [
                new("item_type", "Item Type", Select, "Cake|Pastry|Bread|Cookies|Cupcakes|Savouries|Desserts"),
                new("flavour", "Flavour", Text),
                new("weight", "Weight / Size", Text),
                new("eggless", "Eggless", Bool),
                new("custom_orders", "Custom Orders Accepted", Bool)
            ]),
        new(6, "jewellery", "Jewellery Stores", "gem",
            ["Gold Jewellery", "Silver Jewellery", "Diamond Jewellery", "Fashion Jewellery"],
            [
                new("metal", "Metal", Select, "Gold|Silver|Platinum|Rose Gold|White Gold|Imitation"),
                new("purity", "Purity", Select, "24K|22K|18K|14K|925 Sterling|N/A"),
                new("jewellery_type", "Jewellery Type", Select, "Ring|Necklace|Chain|Earrings|Bangles|Bracelet|Pendant|Anklet|Nose Pin"),
                new("weight_grams", "Weight (grams)", Number),
                new("stone", "Stone", Text),
                new("certified", "Hallmark / Certified", Bool)
            ]),
        new(7, "beauty", "Beauty and Salons", "scissors",
            ["Unisex Salon", "Beauty Parlour", "Spa", "Barber Shop", "Bridal Studio", "Nail Studio"],
            [
                new("product_type", "Product Type", Select, "Hair Care|Skin Care|Makeup|Fragrance|Nail Care|Tools"),
                new("brand", "Brand", Text),
                new("suitable_for", "Suitable For", Select, "Men|Women|Unisex"),
                new("volume", "Volume / Size", Text)
            ]),
        new(8, "electronics", "Electronics and Mobile Shops", "smartphone",
            ["Mobile Phones", "Mobile Accessories", "Computers & Laptops", "Home Appliances", "Repair Centre"],
            [
                new("brand", "Brand", Text, Required: true),
                new("model", "Model", Text),
                new("storage", "Storage", Select, "32 GB|64 GB|128 GB|256 GB|512 GB|1 TB|N/A"),
                new("ram", "RAM", Select, "2 GB|4 GB|6 GB|8 GB|12 GB|16 GB|32 GB|N/A"),
                new("color", "Color", Text),
                new("warranty", "Warranty", Select, "No Warranty|6 Months|1 Year|2 Years|3 Years"),
                new("condition", "Condition", Select, "New|Refurbished|Used")
            ]),
        new(9, "grocery", "Grocery and Supermarkets", "shopping-basket",
            ["Supermarket", "Kirana Store", "Organic Store", "Fruits & Vegetables", "Dairy"],
            [
                new("brand", "Brand", Text),
                new("pack_size", "Pack Size", Text),
                new("unit", "Unit", Select, "Piece|Kg|Gram|Litre|ml|Dozen|Pack"),
                new("organic", "Organic", Bool),
                new("veg_type", "Veg / Non-Veg", Select, "Veg|Non-Veg")
            ]),
        new(10, "home-furniture", "Home and Furniture", "sofa",
            ["Furniture", "Home Decor", "Kitchenware", "Furnishings", "Lighting"],
            [
                new("material", "Material", Select, "Wood|Engineered Wood|Metal|Glass|Plastic|Fabric|Leather|Cane"),
                new("dimensions", "Dimensions", Text),
                new("color", "Color / Finish", Text),
                new("room", "Room", Select, "Living Room|Bedroom|Dining|Kitchen|Office|Outdoor"),
                new("assembly_required", "Assembly Required", Bool)
            ]),
        new(11, "healthcare", "Medical and Healthcare", "stethoscope",
            ["Clinic", "Pharmacy", "Diagnostic Centre", "Dental Clinic", "Physiotherapy", "Optical Store"],
            [
                new("product_type", "Product Type", Select, "Medicine|Wellness|Medical Device|Personal Care|Optical"),
                new("brand", "Brand", Text),
                new("prescription_required", "Prescription Required", Bool),
                new("pack_size", "Pack Size", Text)
            ]),
        new(12, "education", "Education and Training", "graduation-cap",
            ["Tuition Centre", "Coaching Institute", "Skill Training", "Music & Arts", "Language Classes"],
            [
                new("course_level", "Level", Select, "Beginner|Intermediate|Advanced|All Levels"),
                new("mode", "Mode", Select, "In-person|Online|Hybrid"),
                new("duration", "Course Duration", Text),
                new("certificate", "Certificate Provided", Bool)
            ]),
        new(13, "professional-services", "Professional Services", "briefcase",
            ["Consulting", "Legal", "Accounting & Tax", "IT Services", "Repair & Maintenance", "Home Services", "Photography"],
            [
                new("service_area", "Service Area", Text),
                new("delivery_mode", "Delivery Mode", Select, "On-site|Remote|At our office"),
                new("turnaround", "Turnaround Time", Text)
            ]),
        new(14, "other", "Other Businesses", "store",
            ["Retail Store", "Wholesale", "Manufacturing", "Other"],
            [
                new("brand", "Brand", Text),
                new("specification", "Specification", Text)
            ])
    ];

    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BusinessCategory>().HasData(Categories.Select(c => new BusinessCategory
        {
            Id = c.Id, Key = c.Key, Name = c.Name, Icon = c.Icon, SortOrder = c.Id, IsActive = true
        }));

        modelBuilder.Entity<BusinessSubcategory>().HasData(Categories.SelectMany(c => c.Subcategories.Select((name, i) =>
            new BusinessSubcategory { Id = c.Id * 100 + i + 1, CategoryId = c.Id, Name = name, SortOrder = i + 1 })));

        modelBuilder.Entity<BusinessCategoryAttribute>().HasData(Categories.SelectMany(c => c.Attributes.Select((a, i) =>
            new BusinessCategoryAttribute
            {
                Id = c.Id * 100 + i + 1, CategoryId = c.Id, Key = a.Key, Label = a.Label, InputType = a.Type,
                Options = a.Options, IsRequired = a.Required, SortOrder = i + 1
            })));
    }
}
