/**
 * Unit tests for src/utils.ts
 *
 * Tests cover all exported utilities:
 * - issueIdRegEx: Jira issue key pattern matching
 * - isError: Type guard for Error instances
 * - toCommaDelimitedString: Convert iterables to comma-separated strings
 * - nullIfEmpty: Normalize empty arrays to null
 * - formatDate: Format dates as ISO 8601 (YYYY-MM-DD)
 */

import { describe, expect, it } from 'vitest';

import { formatDate, isError, issueIdRegEx, nullIfEmpty, toCommaDelimitedString } from '../src/utils';

describe('issueIdRegEx', () => {
  it('matches standard Jira issue key format (PROJECT-123)', () => {
    const text = 'Fixed PROJ-123';
    const matches = text.match(issueIdRegEx);
    expect(matches).toEqual(['PROJ-123']);
  });

  it('matches multiple issue keys in a string', () => {
    const text = 'Fixed PROJ-123 and ABC-456';
    const matches = text.match(issueIdRegEx);
    expect(matches).toEqual(['PROJ-123', 'ABC-456']);
  });

  it('matches lowercase project keys', () => {
    const text = 'Working on proj-789';
    const matches = text.match(issueIdRegEx);
    expect(matches).toEqual(['proj-789']);
  });

  it('matches mixed case project keys', () => {
    const text = 'Issue Proj-100 is urgent';
    const matches = text.match(issueIdRegEx);
    expect(matches).toEqual(['Proj-100']);
  });

  it('matches project keys with numbers', () => {
    const text = 'Tracking TEST2-555';
    const matches = text.match(issueIdRegEx);
    expect(matches).toEqual(['TEST2-555']);
  });

  it('matches single digit issue numbers', () => {
    const text = 'PROJ-1';
    const matches = text.match(issueIdRegEx);
    expect(matches).toEqual(['PROJ-1']);
  });

  it('matches large issue numbers', () => {
    const text = 'PROJ-999999';
    const matches = text.match(issueIdRegEx);
    expect(matches).toEqual(['PROJ-999999']);
  });

  it('matches issue keys embedded in longer text', () => {
    const text = 'branch feature/JIRA-123-add-feature';
    const matches = text.match(issueIdRegEx);
    expect(matches).toEqual(['JIRA-123']);
  });

  it('returns null when no issue keys are present', () => {
    const text = 'No issue keys here';
    const matches = text.match(issueIdRegEx);
    expect(matches).toBeNull();
  });

  it('matches issue keys in commit messages', () => {
    const text = 'feat(api): implement login [FEAT-42]';
    const matches = text.match(issueIdRegEx);
    expect(matches).toEqual(['FEAT-42']);
  });

  it('matches multiple issue keys with various separators', () => {
    const text = 'BUG-1, FIX-2; TASK-3 and STORY-4';
    const matches = text.match(issueIdRegEx);
    expect(matches).toEqual(['BUG-1', 'FIX-2', 'TASK-3', 'STORY-4']);
  });

  it('does not match keys without hyphen', () => {
    const text = 'PROJ123 is not valid';
    const matches = text.match(issueIdRegEx);
    expect(matches).toBeNull();
  });

  it('does not match keys without issue number', () => {
    const text = 'PROJ- is incomplete';
    const matches = text.match(issueIdRegEx);
    expect(matches).toBeNull();
  });
});

describe('isError', () => {
  it('returns true for Error instance', () => {
    const error = new Error('Test error');
    expect(isError(error)).toBe(true);
  });

  it('returns true for TypeError instance', () => {
    const error = new TypeError('Type error');
    expect(isError(error)).toBe(true);
  });

  it('returns true for SyntaxError instance', () => {
    const error = new SyntaxError('Syntax error');
    expect(isError(error)).toBe(true);
  });

  it('returns true for RangeError instance', () => {
    const error = new RangeError('Range error');
    expect(isError(error)).toBe(true);
  });

  it('returns true for custom error subclass', () => {
    class CustomError extends Error {
      code: string;
      constructor(message: string, code: string) {
        super(message);
        this.code = code;
      }
    }
    const error = new CustomError('Custom error', 'ERR_CUSTOM');
    expect(isError(error)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isError(undefined)).toBe(false);
  });

  it('returns false for plain string', () => {
    expect(isError('error message')).toBe(false);
  });

  it('returns false for number', () => {
    expect(isError(404)).toBe(false);
  });

  it('returns false for plain object', () => {
    expect(isError({ message: 'error', code: 'ERR' })).toBe(false);
  });

  it('returns false for object with Error-like properties', () => {
    const fakeError = { name: 'Error', message: 'fake', stack: 'trace' };
    expect(isError(fakeError)).toBe(false);
  });

  it('returns false for array', () => {
    expect(isError(['error'])).toBe(false);
  });

  it('allows accessing errno properties after type guard', () => {
    const error = new Error('ENOENT');
    (error as NodeJS.ErrnoException).code = 'ENOENT';
    (error as NodeJS.ErrnoException).errno = -2;

    if (isError(error)) {
      expect(error.code).toBe('ENOENT');
      expect(error.message).toBe('ENOENT');
    }
  });
});

describe('toCommaDelimitedString', () => {
  it('converts Set to comma-delimited string', () => {
    const issueSet = new Set(['PROJ-1', 'PROJ-2', 'PROJ-3']);
    expect(toCommaDelimitedString(issueSet)).toBe('PROJ-1,PROJ-2,PROJ-3');
  });

  it('converts array to comma-delimited string', () => {
    const arr = ['a', 'b', 'c'];
    expect(toCommaDelimitedString(arr)).toBe('a,b,c');
  });

  it('converts IterableIterator to comma-delimited string', () => {
    const map = new Map([
      ['key1', 'PROJ-1'],
      ['key2', 'PROJ-2'],
    ]);
    const iterator = map.values();
    expect(toCommaDelimitedString(iterator)).toBe('PROJ-1,PROJ-2');
  });

  it('returns empty string for undefined', () => {
    expect(toCommaDelimitedString(undefined)).toBe('');
  });

  it('returns empty string for empty Set', () => {
    const emptySet = new Set<string>();
    expect(toCommaDelimitedString(emptySet)).toBe('');
  });

  it('returns empty string for empty array', () => {
    expect(toCommaDelimitedString([])).toBe('');
  });

  it('handles single element Set', () => {
    const single = new Set(['ONLY-1']);
    expect(toCommaDelimitedString(single)).toBe('ONLY-1');
  });

  it('handles single element array', () => {
    expect(toCommaDelimitedString(['single'])).toBe('single');
  });

  it('preserves whitespace in elements', () => {
    const arr = ['item 1', 'item 2', 'item 3'];
    expect(toCommaDelimitedString(arr)).toBe('item 1,item 2,item 3');
  });

  it('handles elements with commas', () => {
    const arr = ['a,b', 'c,d'];
    expect(toCommaDelimitedString(arr)).toBe('a,b,c,d');
  });

  it('handles Set with duplicate-like values (Set dedupes)', () => {
    const set = new Set(['A', 'B', 'A', 'C']); // 'A' will only appear once
    expect(toCommaDelimitedString(set)).toBe('A,B,C');
  });

  it('handles generator function iterator', () => {
    function* generateItems(): IterableIterator<string> {
      yield 'first';
      yield 'second';
      yield 'third';
    }
    expect(toCommaDelimitedString(generateItems())).toBe('first,second,third');
  });
});

describe('nullIfEmpty', () => {
  it('returns array with valid values unchanged', () => {
    const input = ['PROJ-1', 'PROJ-2'];
    expect(nullIfEmpty(input)).toEqual(['PROJ-1', 'PROJ-2']);
  });

  it('returns null for empty array', () => {
    expect(nullIfEmpty([])).toBeNull();
  });

  it('returns null for array containing only empty string', () => {
    expect(nullIfEmpty([''])).toBeNull();
  });

  it('returns null for null input', () => {
    expect(nullIfEmpty(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(nullIfEmpty(undefined)).toBeNull();
  });

  it('returns array when first element is not empty string', () => {
    const input = ['value', ''];
    expect(nullIfEmpty(input)).toEqual(['value', '']);
  });

  it('returns single-element array unchanged', () => {
    expect(nullIfEmpty(['only'])).toEqual(['only']);
  });

  it('handles array with whitespace-only first element (not empty)', () => {
    // Note: ' ' is not the same as ''
    const input = [' ', 'value'];
    expect(nullIfEmpty(input)).toEqual([' ', 'value']);
  });

  it('returns null for array starting with empty string even with other values', () => {
    // Based on implementation: checks if str[0] === ''
    const input = ['', 'value1', 'value2'];
    expect(nullIfEmpty(input)).toBeNull();
  });

  it('handles array with special characters', () => {
    const input = ['PROJ-123', 'v1.0.0 - API', 'feature/test'];
    expect(nullIfEmpty(input)).toEqual(['PROJ-123', 'v1.0.0 - API', 'feature/test']);
  });

  it('preserves original array reference when valid', () => {
    const original = ['a', 'b', 'c'];
    const result = nullIfEmpty(original);
    expect(result).toBe(original);
  });
});

describe('formatDate', () => {
  it('formats Date object to YYYY-MM-DD', () => {
    // Create date at noon UTC to avoid timezone boundary issues
    const date = new Date(Date.UTC(2024, 2, 15, 12, 0, 0)); // March 15, 2024
    const result = formatDate(date);
    // The result depends on local timezone, but we can verify format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('pads single-digit month with leading zero', () => {
    // January (month 0 in JS) should become "01"
    const date = new Date(2024, 0, 15); // January 15, 2024
    const result = formatDate(date);
    expect(result).toMatch(/^2024-01-\d{2}$/);
  });

  it('pads single-digit day with leading zero', () => {
    // Day 5 should become "05"
    const date = new Date(2024, 5, 5); // June 5, 2024
    const result = formatDate(date);
    expect(result).toMatch(/^\d{4}-06-05$/);
  });

  it('handles double-digit month correctly', () => {
    // December (month 11) should become "12"
    const date = new Date(2024, 11, 25); // December 25, 2024
    const result = formatDate(date);
    expect(result).toMatch(/^\d{4}-12-25$/);
  });

  it('handles double-digit day correctly', () => {
    const date = new Date(2024, 6, 31); // July 31, 2024
    const result = formatDate(date);
    expect(result).toMatch(/^\d{4}-07-31$/);
  });

  it('formats numeric timestamp correctly', () => {
    // 1710460800000 = March 15, 2024 00:00:00 UTC
    const timestamp = 1710460800000;
    const result = formatDate(timestamp);
    // Verify format is correct (actual date depends on timezone)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formats ISO date string correctly', () => {
    const dateString = '2024-03-15';
    const result = formatDate(dateString);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formats human-readable date string', () => {
    const dateString = 'March 15, 2024';
    const result = formatDate(dateString);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('handles first day of year', () => {
    const date = new Date(2024, 0, 1); // January 1, 2024
    const result = formatDate(date);
    expect(result).toMatch(/^2024-01-01$/);
  });

  it('handles last day of year', () => {
    const date = new Date(2024, 11, 31); // December 31, 2024
    const result = formatDate(date);
    expect(result).toMatch(/^2024-12-31$/);
  });

  it('handles leap year date', () => {
    const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
    const result = formatDate(date);
    expect(result).toMatch(/^2024-02-29$/);
  });

  it('handles year boundary correctly', () => {
    const date = new Date(1999, 11, 31); // December 31, 1999
    const result = formatDate(date);
    expect(result).toMatch(/^1999-12-31$/);
  });

  it('handles future dates', () => {
    const date = new Date(2099, 5, 15); // June 15, 2099
    const result = formatDate(date);
    expect(result).toMatch(/^2099-06-15$/);
  });

  it('handles past dates', () => {
    const date = new Date(1990, 0, 1); // January 1, 1990
    const result = formatDate(date);
    expect(result).toMatch(/^1990-01-01$/);
  });

  it('returns consistent format regardless of input type', () => {
    const date = new Date(2024, 5, 15);
    const timestamp = date.getTime();
    const dateString = date.toISOString();

    const fromDate = formatDate(date);
    const fromTimestamp = formatDate(timestamp);
    const fromString = formatDate(dateString);

    // All should produce the same format (though potentially different dates due to timezone)
    expect(fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fromTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fromString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('handles minimum month and day values with proper padding', () => {
    // January 1st - both month and day need padding
    const date = new Date(2024, 0, 1);
    const result = formatDate(date);
    expect(result).toBe('2024-01-01');
  });

  it('handles September (month 9) correctly', () => {
    // September is month 8 in JS (0-indexed), should output "09"
    const date = new Date(2024, 8, 9); // September 9, 2024
    const result = formatDate(date);
    expect(result).toBe('2024-09-09');
  });

  it('handles October (month 10) correctly - no padding needed', () => {
    // October is month 9 in JS (0-indexed), should output "10"
    const date = new Date(2024, 9, 10); // October 10, 2024
    const result = formatDate(date);
    expect(result).toBe('2024-10-10');
  });
});
