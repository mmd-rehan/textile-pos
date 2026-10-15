/**
 * The API client (api/client.ts) rejects with the server's error object
 * `{ code, message, details }`, not an Axios error, so read those fields
 * directly.
 */
export interface ApiError {
  code?: string;
  message?: string;
  details?: unknown;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as ApiError | null)?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

export function apiErrorCode(err: unknown): string | undefined {
  const code = (err as ApiError | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Turns a server error into per-field messages for a form: known error codes
 * map to a field (e.g. PRODUCT_CODE_EXISTS → productCode), and validation
 * errors use the field names the server reports. Returns [] when the error
 * isn't about a specific field.
 */
export function serverFieldErrors(err: unknown, codeToField: Record<string, string> = {}): FieldError[] {
  const e = err as ApiError | null;
  const code = apiErrorCode(err);
  if (code && codeToField[code]) {
    return [{ field: codeToField[code], message: apiErrorMessage(err, 'Invalid value') }];
  }
  if (code === 'VALIDATION_ERROR' && Array.isArray(e?.details)) {
    return (e!.details as { field?: string; constraints?: string[] }[])
      .filter((d) => typeof d?.field === 'string')
      .map((d) => ({ field: d.field!, message: d.constraints?.[0] ?? 'Invalid value' }));
  }
  return [];
}
