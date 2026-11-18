using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProLink.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameTemplatesToCardDesigns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Description", "Name", "SortOrder" },
                values: new object[] { "Violet-blue frosted glass with icon skill tiles.", "Modern Glass", 2 });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Description", "Name", "SortOrder" },
                values: new object[] { "Black and gold luxury card with a glowing portrait ring.", "Premium Dark", 4 });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Crisp white, outline icons and simple skill chips.", "Minimal White" });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Description", "Name", "SortOrder" },
                values: new object[] { "Skyline cover, navy accents and an experience focus.", "Corporate Executive", 7 });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Vibrant magenta-purple gradient with service tiles.", "Gradient Pro" });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Artistic cover with a portfolio grid for creatives.", "Creative Portfolio" });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "Description", "Name", "SortOrder" },
                values: new object[] { "Warm cream and bronze with service tiles and client impact.", "Elegant Personal", 10 });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Large photo beside a navy panel with contact details.", "Modern Split" });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Cyber neon glow with stats and a featured project.", "Neon Tech" });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 10,
                columns: new[] { "Description", "Name", "SortOrder" },
                values: new object[] { "Square portrait with a clean blue name card and contact tiles.", "Classic Professional", 1 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Description", "Name", "SortOrder" },
                values: new object[] { "Frosted violet glass with a timeline layout.", "Modern Glass Resume", 1 });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Description", "Name", "SortOrder" },
                values: new object[] { "Deep midnight glass with luminous accents.", "Premium Dark Glass", 2 });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Clean, typographic and print friendly.", "Minimal Professional Resume" });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Description", "Name", "SortOrder" },
                values: new object[] { "Navy executive styling with a structured sidebar.", "Corporate Executive Resume", 4 });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Vibrant aurora gradients behind soft glass.", "Gradient Glass Profile" });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Bold, warm and project-forward.", "Creative Portfolio Resume" });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "Description", "Name", "SortOrder" },
                values: new object[] { "Airy white glass with serif headings.", "Elegant White Resume", 7 });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Two-panel layout with a fixed identity column.", "Modern Split Layout" });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 9,
                columns: new[] { "Description", "Name" },
                values: new object[] { "Cyber neon glow for technologists.", "Neon Technology Resume" });

            migrationBuilder.UpdateData(
                table: "ProfileTemplates",
                keyColumn: "Id",
                keyValue: 10,
                columns: new[] { "Description", "Name", "SortOrder" },
                values: new object[] { "Magazine-style hero for personal brands.", "Premium Personal Branding Resume", 10 });
        }
    }
}
