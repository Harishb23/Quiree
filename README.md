# Quiree — Personal & Business Digital Profiles with Smart QR Codes

One account, many professional identities (HR Manager, Developer, Entrepreneur…), each with its own resume-style
profile and template — all shared through **one permanent QR code** and URL (`/p/{username}`).

```
backend/    ASP.NET Core 8 Web API (clean architecture)
  src/ProLink.Domain           Entities & enums
  src/ProLink.Application      DTOs, interfaces, services (business logic), mapping, validation
  src/ProLink.Infrastructure   EF Core (SQL Server), repositories, migrations, JWT, Google, Razorpay, QR, storage, email
  src/ProLink.Api              Controllers, auth, rate limiting, sanitization, error handling
  tests/ProLink.Tests          xUnit integration (WebApplicationFactory + SQLite) and unit tests
  deploy/migrations.sql        Idempotent migration script for production
frontend/   React 19 + Vite + TypeScript + SCSS Modules
  src/templates/               10 resume templates + shared resume building blocks
  src/pages/                   marketing, auth, dashboard, public viewer
  public/sw.js, public/icons/  PWA service worker & icons
```

## Prerequisites
- .NET SDK 8 (pinned via `backend/global.json`), Node 20+, SQL Server (local instance or LocalDB)
- `dotnet tool install -g dotnet-ef` (for migrations)

## Run locally

```bash
# 1. API  (http://localhost:5080) — applies migrations automatically in Development
cd backend/src/ProLink.Api
dotnet run

# 2. Frontend (http://localhost:5175) — proxies /api and /uploads to the API
cd frontend
npm install
npm run dev
```

The development connection string (`appsettings.Development.json`) targets `Server=localhost;Database=ProLinkDb` with
Windows authentication. Change it there or override with `ConnectionStrings__DefaultConnection`.

## Configuration & secrets

Never commit secrets. Use `dotnet user-secrets` locally (already initialised for ProLink.Api) or environment variables
in production (`Section__Key`).

| Setting | Purpose |
|---|---|
| `ConnectionStrings:DefaultConnection` | SQL Server |
| `Jwt:SigningKey` | **Required**, ≥ 32 bytes random. The dev key in `appsettings.Development.json` must not be used in production |
| `App:PublicBaseUrl` | Origin baked into every permanent URL / QR code (e.g. `https://quiree.runasp.net`). **Set it correctly before the first real user registers — it is stored permanently.** |
| `App:FrontendBaseUrl` | Used in password-reset links |
| `App:AdminEmails` | Accounts with these emails get the Admin role (can list enquiries) |
| `GoogleAuth:ClientId` | Google OAuth client id (also set `VITE_GOOGLE_CLIENT_ID` in the frontend) |
| `Razorpay:KeyId` / `KeySecret` / `WebhookSecret` | Razorpay keys (use **test mode** keys first) |
| `Smtp:*` | Outgoing email. If `Smtp:Host` is empty the email (e.g. reset link) is written to the API log |
| `Cors:AllowedOrigins` | Only needed if the frontend is served from a different origin |
| `RateLimiting:*` | Per-IP limits (auth 10/min, public 120/min, enquiries 5/10 min by default) |

Frontend: copy `frontend/.env.example` to `.env.local`. Only public values belong there.

```bash
cd backend/src/ProLink.Api
dotnet user-secrets set "Razorpay:KeyId" "rzp_test_xxx"
dotnet user-secrets set "Razorpay:KeySecret" "xxx"
dotnet user-secrets set "Razorpay:WebhookSecret" "xxx"
dotnet user-secrets set "GoogleAuth:ClientId" "xxx.apps.googleusercontent.com"
```

### Razorpay
1. Orders are created server-side with the plan price from the database (the client never sends an amount).
2. After Checkout, the frontend posts `order_id | payment_id | signature` to `/api/subscription/verify`.
   The API verifies the HMAC-SHA256 signature **and** re-fetches the payment from Razorpay before activating.
3. Configure a webhook to `https://<api>/api/subscription/webhook` with events `payment.captured`, `order.paid`,
   `payment.failed` — it activates subscriptions even if the browser closes mid-payment. Activation is idempotent.
4. Plans are seeded (Free: 2 modes / 4 templates, Pro Monthly ₹199, Pro Yearly ₹1,990: 10 modes / all templates).
   Expired subscriptions are marked hourly by a background worker; entitlements always check `ExpiresAt`.

## Tests

```bash
cd backend && dotnet test        # 60 tests: auth, profile, modes, public profile, vCard, QR stability, subscriptions, Razorpay signatures
cd frontend && npm test -- run   # 66 tests: auth, profile form, mode form, templates, viewer mode switching/persistence, vCard link, QR page, contact form
```

`PublicProfileApiTests.Same_QR_code_before_and_after_profile_mode_template_and_default_changes` proves the QR image,
URL and reference stay byte-identical across every kind of owner change.

## Deployment

1. **Database**: run `backend/deploy/migrations.sql` (idempotent) or `dotnet ef database update`. Keep
   `Database:MigrateOnStartup=false` in production. Regenerate the script after new migrations:
   `dotnet ef migrations script --idempotent -p src/ProLink.Infrastructure -s src/ProLink.Api -o deploy/migrations.sql`
2. **API**: `dotnet publish src/ProLink.Api -c Release`. Persist `wwwroot/uploads` (profile photos) on durable storage.
3. **Frontend**: `npm run build` → static files in `frontend/dist`. Serve with SPA fallback to `index.html`.
4. **Same origin + HTTPS (required for PWA)**: serve the SPA and route `/api/*` and `/uploads/*` to the API on the same
   domain (Nginx/IIS/Azure Front Door). The per-profile web manifest, service worker and vCard downloads rely on this.
   Service workers and install prompts only work over HTTPS.

## Behaviour notes
- **Permanent QR**: generated from `PublicProfileSettings.PermanentUrl`, set once at registration. Usernames cannot be
  changed. Editing modes, templates, profile data or the default mode never touches it.
- **Viewer memory**: the viewer's chosen mode(s) are stored in that browser's Local Storage
  (`prolink.viewer.{slug}`). It is per browser and device — a different browser or phone starts fresh. If a saved mode
  is unpublished or deleted, the viewer sees the owner's current default.
- **Save Contact**: `/api/public/{slug}/vcard?modeId=` returns a vCard 3.0 whose `URL` is always the permanent profile URL.
- **Add to Home Screen**: Android/Chromium uses the native install prompt; iOS Safari shows instructions. The shortcut
  opens the permanent profile URL. Lock-screen shortcuts are not offered (OS-dependent).
- **Privacy**: public endpoints return only published modes of public profiles; account email, ids and billing data are
  never exposed. HTML is stripped from all input; links must be http(s).

## Remaining / recommended next steps
- Replace the founder/company placeholders in `frontend/src/content/siteContent.ts` (marked `TODO(client)`).
- Add real Razorpay test keys, Google client id and SMTP settings, then run a test-mode payment end-to-end.
- Optional hardening: refresh tokens / httpOnly-cookie sessions (currently a 24 h JWT in Local Storage), email
  verification on sign-up, image re-encoding/resizing, cloud blob storage for uploads, admin UI for enquiries.
