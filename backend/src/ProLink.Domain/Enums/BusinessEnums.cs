namespace ProLink.Domain.Enums;

public enum BusinessStatus
{
    Draft = 0,
    Published = 1
}

/// <summary>Team role on a business. Lower value = more privileges.</summary>
public enum BusinessRole
{
    Owner = 0,
    Manager = 1,
    Editor = 2
}

public enum BusinessSocialPlatform
{
    Instagram = 0,
    Facebook = 1,
    YouTube = 2,
    LinkedIn = 3,
    Twitter = 4,
    WhatsApp = 5,
    Other = 6
}

[Flags]
public enum PaymentMethods
{
    None = 0,
    Cash = 1,
    Upi = 2,
    Card = 4,
    NetBanking = 8,
    Wallet = 16,
    BankTransfer = 32,
    PayLater = 64
}

public enum AttributeInputType
{
    Text = 0,
    Number = 1,
    Select = 2,
    MultiSelect = 3,
    Boolean = 4
}

public enum StockStatus
{
    InStock = 0,
    LowStock = 1,
    OutOfStock = 2,
    MadeToOrder = 3
}

public enum GalleryCategory
{
    Interior = 0,
    Exterior = 1,
    Products = 2,
    Events = 3,
    Team = 4,
    Promotions = 5
}

public enum ReviewStatus
{
    Pending = 0,
    Approved = 1,
    Hidden = 2
}

public enum BusinessEnquiryStatus
{
    New = 0,
    InProgress = 1,
    Responded = 2,
    Closed = 3
}

public enum EnquiryActivityType
{
    Created = 0,
    StatusChanged = 1,
    Response = 2,
    Note = 3
}

public enum BusinessEventType
{
    ProfileView = 0,
    QrScan = 1,
    ProductView = 2,
    WhatsAppClick = 3,
    CallClick = 4,
    WebsiteClick = 5,
    DirectionsClick = 6,
    ShareClick = 7,
    EnquirySubmitted = 8
}

/// <summary>Where a QR campaign sends people. Product and Offer also need a target id.</summary>
public enum QrDestination
{
    Profile = 0,
    Product = 1,
    Offer = 2,
    Products = 3,
    Services = 4,
    Reviews = 5,
    Enquiry = 6,
    Gallery = 7
}
