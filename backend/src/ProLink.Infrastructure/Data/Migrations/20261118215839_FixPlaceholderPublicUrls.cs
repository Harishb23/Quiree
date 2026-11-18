using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProLink.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixPlaceholderPublicUrls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Accounts registered on the live site while App:PublicBaseUrl was still the "https://yourdomain.com"
            // placeholder had that stored as their permanent personal profile URL (it feeds their personal QR code).
            // Point those at the real domain. Only exact placeholder-prefixed rows are touched.
            migrationBuilder.Sql(
                "UPDATE PublicProfileSettings " +
                "SET PermanentUrl = 'https://quiree.runasp.net' + SUBSTRING(PermanentUrl, LEN('https://yourdomain.com') + 1, 300) " +
                "WHERE PermanentUrl LIKE 'https://yourdomain.com/%'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty: restoring a broken placeholder URL would serve no purpose.
        }
    }
}
