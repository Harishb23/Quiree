namespace ProLink.Application.Common;

/// <summary>Base type for expected business errors. Mapped to HTTP responses by the API layer.</summary>
public abstract class AppException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public sealed class NotFoundException(string message = "The requested resource was not found.")
    : AppException(message, 404);

public sealed class BusinessValidationException(string message) : AppException(message, 400);

public sealed class ConflictException(string message) : AppException(message, 409);

public sealed class ForbiddenException(string message = "You do not have permission to perform this action.")
    : AppException(message, 403);

public sealed class UnauthorizedAppException(string message = "Invalid credentials.") : AppException(message, 401);

/// <summary>Raised when the user's plan does not allow an operation.</summary>
public sealed class PlanLimitException(string message) : AppException(message, 402);
