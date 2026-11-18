IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [Enquiries] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [Phone] nvarchar(30) NULL,
        [Subject] nvarchar(150) NOT NULL,
        [Message] nvarchar(3000) NOT NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Enquiries] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [ProfileTemplates] (
        [Id] int NOT NULL IDENTITY,
        [Key] nvarchar(50) NOT NULL,
        [Name] nvarchar(80) NOT NULL,
        [Description] nvarchar(300) NOT NULL,
        [IsPremium] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_ProfileTemplates] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [SubscriptionPlans] (
        [Id] int NOT NULL IDENTITY,
        [Code] nvarchar(40) NOT NULL,
        [Name] nvarchar(80) NOT NULL,
        [Description] nvarchar(300) NOT NULL,
        [PriceInPaise] bigint NOT NULL,
        [Currency] nvarchar(3) NOT NULL,
        [DurationDays] int NOT NULL,
        [MaxModes] int NOT NULL,
        [AllowsPremiumTemplates] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_SubscriptionPlans] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] uniqueidentifier NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [NormalizedEmail] nvarchar(256) NOT NULL,
        [PasswordHash] nvarchar(500) NULL,
        [GoogleSubject] nvarchar(100) NULL,
        [Role] int NOT NULL,
        [PublicSlug] nvarchar(30) NOT NULL,
        [PasswordResetTokenHash] nvarchar(128) NULL,
        [PasswordResetExpiresAt] datetime2 NULL,
        [LastLoginAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [ProfileModes] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [ModeName] nvarchar(60) NOT NULL,
        [ModeType] int NOT NULL,
        [Designation] nvarchar(120) NULL,
        [CompanyName] nvarchar(150) NULL,
        [Summary] nvarchar(3000) NULL,
        [ContactEmail] nvarchar(256) NULL,
        [ContactPhone] nvarchar(30) NULL,
        [Location] nvarchar(150) NULL,
        [Website] nvarchar(300) NULL,
        [BusinessName] nvarchar(150) NULL,
        [Industry] nvarchar(100) NULL,
        [BusinessDescription] nvarchar(3000) NULL,
        [CompanyWebsite] nvarchar(300) NULL,
        [GitHubUrl] nvarchar(300) NULL,
        [IsPublished] bit NOT NULL,
        [IsDefault] bit NOT NULL,
        [SortOrder] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ProfileModes] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProfileModes_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [PublicProfileSettings] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [IsPublic] bit NOT NULL,
        [AllowViewerModeSelection] bit NOT NULL,
        [PermanentUrl] nvarchar(300) NOT NULL,
        [QrReference] nvarchar(32) NOT NULL,
        [QrGeneratedAt] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PublicProfileSettings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PublicProfileSettings_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [Subscriptions] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [PlanId] int NOT NULL,
        [Status] int NOT NULL,
        [StartsAt] datetime2 NULL,
        [ExpiresAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Subscriptions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Subscriptions_SubscriptionPlans_PlanId] FOREIGN KEY ([PlanId]) REFERENCES [SubscriptionPlans] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Subscriptions_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [UserProfiles] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [FullName] nvarchar(100) NOT NULL,
        [PhotoUrl] nvarchar(500) NULL,
        [Email] nvarchar(256) NULL,
        [Mobile] nvarchar(30) NULL,
        [Location] nvarchar(150) NULL,
        [Website] nvarchar(300) NULL,
        [Summary] nvarchar(2000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_UserProfiles] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserProfiles_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [Achievements] (
        [Id] uniqueidentifier NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [Date] date NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [ProfileModeId] uniqueidentifier NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_Achievements] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Achievements_ProfileModes_ProfileModeId] FOREIGN KEY ([ProfileModeId]) REFERENCES [ProfileModes] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [Certifications] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [Issuer] nvarchar(150) NULL,
        [IssueDate] date NULL,
        [CredentialUrl] nvarchar(500) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [ProfileModeId] uniqueidentifier NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_Certifications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Certifications_ProfileModes_ProfileModeId] FOREIGN KEY ([ProfileModeId]) REFERENCES [ProfileModes] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [CustomSections] (
        [Id] uniqueidentifier NOT NULL,
        [Title] nvarchar(100) NOT NULL,
        [Content] nvarchar(4000) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [ProfileModeId] uniqueidentifier NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_CustomSections] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CustomSections_ProfileModes_ProfileModeId] FOREIGN KEY ([ProfileModeId]) REFERENCES [ProfileModes] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [EducationDetails] (
        [Id] uniqueidentifier NOT NULL,
        [Degree] nvarchar(150) NOT NULL,
        [Institution] nvarchar(200) NOT NULL,
        [FieldOfStudy] nvarchar(150) NULL,
        [StartYear] int NULL,
        [EndYear] int NULL,
        [Grade] nvarchar(50) NULL,
        [Description] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [ProfileModeId] uniqueidentifier NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_EducationDetails] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EducationDetails_ProfileModes_ProfileModeId] FOREIGN KEY ([ProfileModeId]) REFERENCES [ProfileModes] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [ModeTemplateMappings] (
        [Id] uniqueidentifier NOT NULL,
        [ProfileModeId] uniqueidentifier NOT NULL,
        [TemplateId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ModeTemplateMappings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ModeTemplateMappings_ProfileModes_ProfileModeId] FOREIGN KEY ([ProfileModeId]) REFERENCES [ProfileModes] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ModeTemplateMappings_ProfileTemplates_TemplateId] FOREIGN KEY ([TemplateId]) REFERENCES [ProfileTemplates] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [ProfileSkills] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(80) NOT NULL,
        [Category] nvarchar(80) NULL,
        [Level] int NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [ProfileModeId] uniqueidentifier NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_ProfileSkills] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProfileSkills_ProfileModes_ProfileModeId] FOREIGN KEY ([ProfileModeId]) REFERENCES [ProfileModes] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [Projects] (
        [Id] uniqueidentifier NOT NULL,
        [Title] nvarchar(150) NOT NULL,
        [Role] nvarchar(120) NULL,
        [Description] nvarchar(2000) NULL,
        [TechStack] nvarchar(300) NULL,
        [Outcome] nvarchar(1000) NULL,
        [Url] nvarchar(500) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [ProfileModeId] uniqueidentifier NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_Projects] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Projects_ProfileModes_ProfileModeId] FOREIGN KEY ([ProfileModeId]) REFERENCES [ProfileModes] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [Services] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [ProfileModeId] uniqueidentifier NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_Services] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Services_ProfileModes_ProfileModeId] FOREIGN KEY ([ProfileModeId]) REFERENCES [ProfileModes] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [WorkExperiences] (
        [Id] uniqueidentifier NOT NULL,
        [Title] nvarchar(120) NOT NULL,
        [Company] nvarchar(150) NOT NULL,
        [Location] nvarchar(150) NULL,
        [StartDate] date NULL,
        [EndDate] date NULL,
        [IsCurrent] bit NOT NULL,
        [Description] nvarchar(2000) NULL,
        [Responsibilities] nvarchar(4000) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        [ProfileModeId] uniqueidentifier NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_WorkExperiences] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WorkExperiences_ProfileModes_ProfileModeId] FOREIGN KEY ([ProfileModeId]) REFERENCES [ProfileModes] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [Payments] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [PlanId] int NOT NULL,
        [SubscriptionId] uniqueidentifier NULL,
        [RazorpayOrderId] nvarchar(100) NOT NULL,
        [RazorpayPaymentId] nvarchar(100) NULL,
        [RazorpaySignature] nvarchar(200) NULL,
        [AmountInPaise] bigint NOT NULL,
        [Currency] nvarchar(3) NOT NULL,
        [Status] int NOT NULL,
        [FailureReason] nvarchar(500) NULL,
        [PaidAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Payments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Payments_SubscriptionPlans_PlanId] FOREIGN KEY ([PlanId]) REFERENCES [SubscriptionPlans] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Payments_Subscriptions_SubscriptionId] FOREIGN KEY ([SubscriptionId]) REFERENCES [Subscriptions] ([Id]),
        CONSTRAINT [FK_Payments_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE TABLE [SocialLinks] (
        [Id] uniqueidentifier NOT NULL,
        [UserProfileId] uniqueidentifier NULL,
        [ProfileModeId] uniqueidentifier NULL,
        [Platform] int NOT NULL,
        [Url] nvarchar(500) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_SocialLinks] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_SocialLinks_SingleOwner] CHECK (([UserProfileId] IS NOT NULL AND [ProfileModeId] IS NULL) OR ([UserProfileId] IS NULL AND [ProfileModeId] IS NOT NULL)),
        CONSTRAINT [FK_SocialLinks_ProfileModes_ProfileModeId] FOREIGN KEY ([ProfileModeId]) REFERENCES [ProfileModes] ([Id]),
        CONSTRAINT [FK_SocialLinks_UserProfiles_UserProfileId] FOREIGN KEY ([UserProfileId]) REFERENCES [UserProfiles] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Description', N'IsActive', N'IsPremium', N'Key', N'Name', N'SortOrder') AND [object_id] = OBJECT_ID(N'[ProfileTemplates]'))
        SET IDENTITY_INSERT [ProfileTemplates] ON;
    EXEC(N'INSERT INTO [ProfileTemplates] ([Id], [Description], [IsActive], [IsPremium], [Key], [Name], [SortOrder])
    VALUES (1, N''Frosted violet glass with a timeline layout.'', CAST(1 AS bit), CAST(0 AS bit), N''modern-glass'', N''Modern Glass Resume'', 1),
    (2, N''Deep midnight glass with luminous accents.'', CAST(1 AS bit), CAST(1 AS bit), N''premium-dark'', N''Premium Dark Glass'', 2),
    (3, N''Clean, typographic and print friendly.'', CAST(1 AS bit), CAST(0 AS bit), N''minimal'', N''Minimal Professional Resume'', 3),
    (4, N''Navy executive styling with a structured sidebar.'', CAST(1 AS bit), CAST(0 AS bit), N''corporate'', N''Corporate Executive Resume'', 4),
    (5, N''Vibrant aurora gradients behind soft glass.'', CAST(1 AS bit), CAST(1 AS bit), N''gradient-glass'', N''Gradient Glass Profile'', 5),
    (6, N''Bold, warm and project-forward.'', CAST(1 AS bit), CAST(1 AS bit), N''creative-portfolio'', N''Creative Portfolio Resume'', 6),
    (7, N''Airy white glass with serif headings.'', CAST(1 AS bit), CAST(0 AS bit), N''elegant-white'', N''Elegant White Resume'', 7),
    (8, N''Two-panel layout with a fixed identity column.'', CAST(1 AS bit), CAST(1 AS bit), N''split-layout'', N''Modern Split Layout'', 8),
    (9, N''Cyber neon glow for technologists.'', CAST(1 AS bit), CAST(1 AS bit), N''neon-tech'', N''Neon Technology Resume'', 9),
    (10, N''Magazine-style hero for personal brands.'', CAST(1 AS bit), CAST(1 AS bit), N''personal-branding'', N''Premium Personal Branding Resume'', 10)');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Description', N'IsActive', N'IsPremium', N'Key', N'Name', N'SortOrder') AND [object_id] = OBJECT_ID(N'[ProfileTemplates]'))
        SET IDENTITY_INSERT [ProfileTemplates] OFF;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'AllowsPremiumTemplates', N'Code', N'Currency', N'Description', N'DurationDays', N'IsActive', N'MaxModes', N'Name', N'PriceInPaise', N'SortOrder') AND [object_id] = OBJECT_ID(N'[SubscriptionPlans]'))
        SET IDENTITY_INSERT [SubscriptionPlans] ON;
    EXEC(N'INSERT INTO [SubscriptionPlans] ([Id], [AllowsPremiumTemplates], [Code], [Currency], [Description], [DurationDays], [IsActive], [MaxModes], [Name], [PriceInPaise], [SortOrder])
    VALUES (1, CAST(0 AS bit), N''free'', N''INR'', N''Get started with 2 profile modes and essential templates.'', 0, CAST(1 AS bit), 2, N''Free'', CAST(0 AS bigint), 1),
    (2, CAST(1 AS bit), N''pro-monthly'', N''INR'', N''Up to 10 profile modes and all 10 premium templates.'', 30, CAST(1 AS bit), 10, N''Pro Monthly'', CAST(19900 AS bigint), 2),
    (3, CAST(1 AS bit), N''pro-yearly'', N''INR'', N''Everything in Pro, billed yearly (2 months free).'', 365, CAST(1 AS bit), 10, N''Pro Yearly'', CAST(199000 AS bigint), 3)');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'AllowsPremiumTemplates', N'Code', N'Currency', N'Description', N'DurationDays', N'IsActive', N'MaxModes', N'Name', N'PriceInPaise', N'SortOrder') AND [object_id] = OBJECT_ID(N'[SubscriptionPlans]'))
        SET IDENTITY_INSERT [SubscriptionPlans] OFF;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Achievements_ProfileModeId_SortOrder] ON [Achievements] ([ProfileModeId], [SortOrder]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Certifications_ProfileModeId_SortOrder] ON [Certifications] ([ProfileModeId], [SortOrder]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_CustomSections_ProfileModeId_SortOrder] ON [CustomSections] ([ProfileModeId], [SortOrder]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_EducationDetails_ProfileModeId_SortOrder] ON [EducationDetails] ([ProfileModeId], [SortOrder]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Enquiries_CreatedAt] ON [Enquiries] ([CreatedAt]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ModeTemplateMappings_ProfileModeId] ON [ModeTemplateMappings] ([ProfileModeId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ModeTemplateMappings_TemplateId] ON [ModeTemplateMappings] ([TemplateId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Payments_PlanId] ON [Payments] ([PlanId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Payments_RazorpayOrderId] ON [Payments] ([RazorpayOrderId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Payments_RazorpayPaymentId] ON [Payments] ([RazorpayPaymentId]) WHERE [RazorpayPaymentId] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Payments_SubscriptionId] ON [Payments] ([SubscriptionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Payments_UserId_CreatedAt] ON [Payments] ([UserId], [CreatedAt]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProfileModes_UserId_IsPublished_SortOrder] ON [ProfileModes] ([UserId], [IsPublished], [SortOrder]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProfileModes_UserId_ModeName] ON [ProfileModes] ([UserId], [ModeName]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProfileSkills_ProfileModeId_SortOrder] ON [ProfileSkills] ([ProfileModeId], [SortOrder]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProfileTemplates_Key] ON [ProfileTemplates] ([Key]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Projects_ProfileModeId_SortOrder] ON [Projects] ([ProfileModeId], [SortOrder]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PublicProfileSettings_PermanentUrl] ON [PublicProfileSettings] ([PermanentUrl]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PublicProfileSettings_QrReference] ON [PublicProfileSettings] ([QrReference]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PublicProfileSettings_UserId] ON [PublicProfileSettings] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Services_ProfileModeId_SortOrder] ON [Services] ([ProfileModeId], [SortOrder]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_SocialLinks_ProfileModeId_Platform] ON [SocialLinks] ([ProfileModeId], [Platform]) WHERE [ProfileModeId] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_SocialLinks_UserProfileId_Platform] ON [SocialLinks] ([UserProfileId], [Platform]) WHERE [UserProfileId] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SubscriptionPlans_Code] ON [SubscriptionPlans] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Subscriptions_PlanId] ON [Subscriptions] ([PlanId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Subscriptions_UserId_Status_ExpiresAt] ON [Subscriptions] ([UserId], [Status], [ExpiresAt]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UserProfiles_UserId] ON [UserProfiles] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Users_GoogleSubject] ON [Users] ([GoogleSubject]) WHERE [GoogleSubject] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_NormalizedEmail] ON [Users] ([NormalizedEmail]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_PublicSlug] ON [Users] ([PublicSlug]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_WorkExperiences_ProfileModeId_SortOrder] ON [WorkExperiences] ([ProfileModeId], [SortOrder]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261031200529_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261031200529_InitialCreate', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155744_RenameTemplatesToCardDesigns'
)
BEGIN
    EXEC(N'UPDATE [ProfileTemplates] SET [Description] = N''Violet-blue frosted glass with icon skill tiles.'', [Name] = N''Modern Glass'', [SortOrder] = 2
    WHERE [Id] = 1;
    SELECT @@ROWCOUNT');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155744_RenameTemplatesToCardDesigns'
)
BEGIN
    EXEC(N'UPDATE [ProfileTemplates] SET [Description] = N''Black and gold luxury card with a glowing portrait ring.'', [Name] = N''Premium Dark'', [SortOrder] = 4
    WHERE [Id] = 2;
    SELECT @@ROWCOUNT');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155744_RenameTemplatesToCardDesigns'
)
BEGIN
    EXEC(N'UPDATE [ProfileTemplates] SET [Description] = N''Crisp white, outline icons and simple skill chips.'', [Name] = N''Minimal White''
    WHERE [Id] = 3;
    SELECT @@ROWCOUNT');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155744_RenameTemplatesToCardDesigns'
)
BEGIN
    EXEC(N'UPDATE [ProfileTemplates] SET [Description] = N''Skyline cover, navy accents and an experience focus.'', [Name] = N''Corporate Executive'', [SortOrder] = 7
    WHERE [Id] = 4;
    SELECT @@ROWCOUNT');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155744_RenameTemplatesToCardDesigns'
)
BEGIN
    EXEC(N'UPDATE [ProfileTemplates] SET [Description] = N''Vibrant magenta-purple gradient with service tiles.'', [Name] = N''Gradient Pro''
    WHERE [Id] = 5;
    SELECT @@ROWCOUNT');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155744_RenameTemplatesToCardDesigns'
)
BEGIN
    EXEC(N'UPDATE [ProfileTemplates] SET [Description] = N''Artistic cover with a portfolio grid for creatives.'', [Name] = N''Creative Portfolio''
    WHERE [Id] = 6;
    SELECT @@ROWCOUNT');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155744_RenameTemplatesToCardDesigns'
)
BEGIN
    EXEC(N'UPDATE [ProfileTemplates] SET [Description] = N''Warm cream and bronze with service tiles and client impact.'', [Name] = N''Elegant Personal'', [SortOrder] = 10
    WHERE [Id] = 7;
    SELECT @@ROWCOUNT');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155744_RenameTemplatesToCardDesigns'
)
BEGIN
    EXEC(N'UPDATE [ProfileTemplates] SET [Description] = N''Large photo beside a navy panel with contact details.'', [Name] = N''Modern Split''
    WHERE [Id] = 8;
    SELECT @@ROWCOUNT');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155744_RenameTemplatesToCardDesigns'
)
BEGIN
    EXEC(N'UPDATE [ProfileTemplates] SET [Description] = N''Cyber neon glow with stats and a featured project.'', [Name] = N''Neon Tech''
    WHERE [Id] = 9;
    SELECT @@ROWCOUNT');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155744_RenameTemplatesToCardDesigns'
)
BEGIN
    EXEC(N'UPDATE [ProfileTemplates] SET [Description] = N''Square portrait with a clean blue name card and contact tiles.'', [Name] = N''Classic Professional'', [SortOrder] = 1
    WHERE [Id] = 10;
    SELECT @@ROWCOUNT');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155744_RenameTemplatesToCardDesigns'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103155744_RenameTemplatesToCardDesigns', N'8.0.11');
END;
GO

COMMIT;
GO

