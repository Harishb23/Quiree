using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProLink.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQrCampaigns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CampaignId",
                table: "BusinessAnalyticsEvents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BusinessQrCampaigns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Destination = table.Column<int>(type: "int", nullable: false),
                    TargetId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ForegroundColor = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: false),
                    BackgroundColor = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: false),
                    ShowLogo = table.Column<bool>(type: "bit", nullable: false),
                    FrameText = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessQrCampaigns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BusinessQrCampaigns_Businesses_BusinessId",
                        column: x => x.BusinessId,
                        principalTable: "Businesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessAnalyticsEvents_BusinessId_CampaignId_OccurredAt",
                table: "BusinessAnalyticsEvents",
                columns: new[] { "BusinessId", "CampaignId", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessQrCampaigns_BusinessId_Name",
                table: "BusinessQrCampaigns",
                columns: new[] { "BusinessId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BusinessQrCampaigns_Code",
                table: "BusinessQrCampaigns",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BusinessQrCampaigns");

            migrationBuilder.DropIndex(
                name: "IX_BusinessAnalyticsEvents_BusinessId_CampaignId_OccurredAt",
                table: "BusinessAnalyticsEvents");

            migrationBuilder.DropColumn(
                name: "CampaignId",
                table: "BusinessAnalyticsEvents");
        }
    }
}
