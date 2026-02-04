export const VALIDATION_ERROR = 'VALIDATION_ERROR';
export const NOT_FOUND = 'NOT_FOUND';
export const RATE_LIMITED = 'RATE_LIMITED';
export const INTERNAL_ERROR = 'INTERNAL_ERROR';

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export type ErrorResponse = { success: false; error: { code: string; message: string } };

export function error(code: string, message: string): ErrorResponse {
  return { success: false, error: { code, message } };
}

export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}
