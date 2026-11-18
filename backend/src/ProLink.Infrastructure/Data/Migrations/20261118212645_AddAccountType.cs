using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProLink.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AccountType",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Existing accounts that already own a business become Business accounts (their storefronts, QR codes
            // and enquiries keep working). Everyone else stays Personal (the column default).
            migrationBuilder.Sql("UPDATE Users SET AccountType = 1 WHERE Id IN (SELECT DISTINCT OwnerId FROM Businesses)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccountType",
                table: "Users");
        }
    }
}
