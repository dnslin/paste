import { describe, it, expect } from 'vitest';
import {
  success,
  error,
  ApiError,
  type ApiResponse,
  VALIDATION_ERROR,
  NOT_FOUND,
  RATE_LIMITED,
  INTERNAL_ERROR,
} from '../api-response';

describe('api-response', () => {
  describe('success', () => {
    it('should create success response with data', () => {
      const data = { id: 1, name: 'test' };
      const response = success(data);

      expect(response.success).toBe(true);
      expect(response).toEqual({ success: true, data });
    });

    it('should handle primitive data', () => {
      const response = success('hello');

      expect(response.success).toBe(true);
      expect(response).toEqual({ success: true, data: 'hello' });
    });

    it('should handle null data', () => {
      const response = success(null);

      expect(response.success).toBe(true);
      expect(response).toEqual({ success: true, data: null });
    });

    it('should handle array data', () => {
      const data = [1, 2, 3];
      const response = success(data);

      expect(response.success).toBe(true);
      expect(response).toEqual({ success: true, data });
    });
  });

  describe('error', () => {
    it('should create error response with code and message', () => {
      const response = error('TEST_ERROR', 'Something went wrong');

      expect(response.success).toBe(false);
      expect(response).toEqual({
        success: false,
        error: { code: 'TEST_ERROR', message: 'Something went wrong' },
      });
    });

    it('should work with predefined error codes', () => {
      const response = error(VALIDATION_ERROR, 'Invalid input');

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('ApiError', () => {
    it('should be an instance of Error', () => {
      const err = new ApiError('TEST_CODE', 'Test message');

      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ApiError);
    });

    it('should have code and message properties', () => {
      const err = new ApiError('NOT_FOUND', 'Resource not found');

      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Resource not found');
    });

    it('should have correct name', () => {
      const err = new ApiError('TEST', 'test');

      expect(err.name).toBe('ApiError');
    });
  });

  describe('error codes', () => {
    it('should export predefined error codes', () => {
      expect(VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(NOT_FOUND).toBe('NOT_FOUND');
      expect(RATE_LIMITED).toBe('RATE_LIMITED');
      expect(INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });
  });

  describe('type narrowing', () => {
    it('should narrow type on success check', () => {
      const response: ApiResponse<{ value: number }> = success({ value: 42 });

      if (response.success) {
        expect(response.data.value).toBe(42);
      } else {
        expect.fail('Should be success');
      }
    });

    it('should narrow type on failure check', () => {
      const response: ApiResponse<string> = error('ERR', 'failed');

      if (!response.success) {
        expect(response.error.code).toBe('ERR');
        expect(response.error.message).toBe('failed');
      } else {
        expect.fail('Should be error');
      }
    });
  });
});
