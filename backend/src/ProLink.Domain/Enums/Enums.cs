namespace ProLink.Domain.Enums;

public enum UserRole
{
    User = 0,
    Admin = 1
}

public enum ModeType
{
    General = 0,
    Developer = 1,
    HR = 2,
    Entrepreneur = 3,
    Marketing = 4,
    Consultant = 5
}

public enum SocialPlatform
{
    LinkedIn = 0,
    Instagram = 1,
    Facebook = 2,
    WhatsApp = 3,
    GitHub = 4,
    Twitter = 5,
    YouTube = 6,
    Website = 7
}

public enum SubscriptionStatus
{
    Pending = 0,
    Active = 1,
    Expired = 2,
    Cancelled = 3
}

public enum PaymentStatus
{
    Created = 0,
    Captured = 1,
    Failed = 2
}

public enum EnquiryStatus
{
    New = 0,
    InProgress = 1,
    Closed = 2
}
