import { describe, expect, it } from 'vitest';
import { apiErrorCode, apiErrorMessage, serverFieldErrors } from './errors';

describe('API error helpers', () => {
  it('reads the unwrapped server error', () => {
    const err = { code: 'ROLL_NOT_AVAILABLE', message: 'Roll R-1 is SOLD and cannot be sold' };
    expect(apiErrorMessage(err, 'fallback')).toBe('Roll R-1 is SOLD and cannot be sold');
    expect(apiErrorCode(err)).toBe('ROLL_NOT_AVAILABLE');
  });

  it('falls back when there is no usable message', () => {
    expect(apiErrorMessage(undefined, 'fallback')).toBe('fallback');
    expect(apiErrorMessage({ message: '  ' }, 'fallback')).toBe('fallback');
    expect(apiErrorMessage({ response: { data: { message: 'axios shape' } } }, 'fallback')).toBe('fallback');
  });

  it('maps a known error code to a form field', () => {
    expect(serverFieldErrors({ code: 'PRODUCT_CODE_EXISTS', message: 'Product code already exists' }, { PRODUCT_CODE_EXISTS: 'productCode' })).toEqual([
      { field: 'productCode', message: 'Product code already exists' },
    ]);
  });

  it('maps server validation details to fields', () => {
    const err = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [
        { field: 'retailPrice', constraints: ['retailPrice must be a number conforming to the specified constraints'] },
        { field: 'name', constraints: [] },
      ],
    };
    expect(serverFieldErrors(err)).toEqual([
      { field: 'retailPrice', message: 'retailPrice must be a number conforming to the specified constraints' },
      { field: 'name', message: 'Invalid value' },
    ]);
  });

  it('returns nothing for errors that are not about a field', () => {
    expect(serverFieldErrors({ code: 'INTERNAL_SERVER_ERROR', message: 'boom' })).toEqual([]);
  });
});
