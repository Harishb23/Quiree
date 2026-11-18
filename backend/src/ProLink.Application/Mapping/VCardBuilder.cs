using System.Text;
using ProLink.Application.DTOs;

namespace ProLink.Application.Mapping;

/// <summary>Builds vCard 3.0 files (best compatibility with iOS and Android contact apps).</summary>
public static class VCardBuilder
{
    public static string Build(string fullName, PublicModeDto mode, string permanentProfileUrl)
    {
        var (first, last) = SplitName(fullName);
        var c = mode.Contact;
        var organization = mode.CompanyName ?? mode.BusinessName;

        var sb = new StringBuilder();
        Line(sb, "BEGIN:VCARD");
        Line(sb, "VERSION:3.0");
        Line(sb, $"N:{Escape(last)};{Escape(first)};;;");
        Line(sb, $"FN:{Escape(fullName)}");
        if (!string.IsNullOrWhiteSpace(mode.Designation)) Line(sb, $"TITLE:{Escape(mode.Designation)}");
        if (!string.IsNullOrWhiteSpace(organization)) Line(sb, $"ORG:{Escape(organization)}");
        if (!string.IsNullOrWhiteSpace(c.Phone)) Line(sb, $"TEL;TYPE=CELL,VOICE:{Escape(c.Phone)}");
        if (!string.IsNullOrWhiteSpace(c.Email)) Line(sb, $"EMAIL;TYPE=INTERNET,WORK:{Escape(c.Email)}");
        if (!string.IsNullOrWhiteSpace(c.Location)) Line(sb, $"ADR;TYPE=WORK:;;{Escape(c.Location)};;;;");
        // The website is always the permanent public profile URL (the same URL encoded in the QR code).
        Line(sb, $"URL:{Escape(permanentProfileUrl)}");
        Line(sb, $"NOTE:{Escape($"{mode.ModeName} profile - {permanentProfileUrl}")}");
        Line(sb, $"REV:{DateTime.UtcNow:yyyyMMddTHHmmssZ}");
        Line(sb, "END:VCARD");
        return sb.ToString();
    }

    public static string FileName(string fullName)
    {
        var safe = new string(fullName.Where(ch => char.IsLetterOrDigit(ch) || ch == ' ').ToArray()).Trim();
        return $"{(safe.Length == 0 ? "contact" : safe.Replace(' ', '_'))}.vcf";
    }

    private static (string First, string Last) SplitName(string fullName)
    {
        var parts = fullName.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        return parts.Length switch
        {
            0 => ("", ""),
            1 => (parts[0], ""),
            _ => (parts[0], parts[1])
        };
    }

    private static string Escape(string value) => value
        .Replace("\\", "\\\\")
        .Replace(";", "\\;")
        .Replace(",", "\\,")
        .Replace("\r\n", "\\n")
        .Replace("\n", "\\n");

    private static void Line(StringBuilder sb, string line) => sb.Append(line).Append("\r\n");
}
