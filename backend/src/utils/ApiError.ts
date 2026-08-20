export const ERROR_CODES = {
  VALIDATION: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  AI_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  INTERNAL: 'INTERNAL_ERROR',
} as const;

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    code: string = ERROR_CODES.INTERNAL,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/** Convenience constructors */
export const Errors = {
  badRequest: (msg: string, details?: unknown) =>
    new ApiError(400, msg, ERROR_CODES.VALIDATION, details),
  unauthorized: (msg = 'Authentication required') =>
    new ApiError(401, msg, ERROR_CODES.UNAUTHORIZED),
  forbidden: (msg = 'You do not have permission to perform this action') =>
    new ApiError(403, msg, ERROR_CODES.FORBIDDEN),
  notFound: (msg = 'Resource not found') => new ApiError(404, msg, ERROR_CODES.NOT_FOUND),
  conflict: (msg: string, details?: unknown) =>
    new ApiError(409, msg, ERROR_CODES.CONFLICT, details),
  aiUnavailable: (msg = 'AI assistant is temporarily unavailable') =>
    new ApiError(503, msg, ERROR_CODES.AI_UNAVAILABLE),
};