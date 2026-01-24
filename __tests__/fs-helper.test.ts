/**
 * Unit tests for fs-helper.ts
 *
 * Tests the file system helper functions:
 * - existsSync: Check if path exists
 * - directoryExistsSync: Check if directory exists (with optional required flag)
 * - fileExistsSync: Check if file (not directory) exists
 * - loadFileSync: Read file contents as UTF-8 string
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock node:fs before importing the module under test
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
  readFileSync: vi.fn(),
  default: {
    existsSync: vi.fn(),
    statSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}));

// Import mocked fs and module under test after mock setup
import * as fs from 'node:fs';
import { readFileSync } from 'node:fs';
import { directoryExistsSync, existsSync, fileExistsSync, loadFileSync } from '../src/fs-helper';

describe('fs-helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('existsSync', () => {
    it('returns true when path exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = existsSync('/path/to/file.txt');

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('returns false when path does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = existsSync('/nonexistent/path');

      expect(result).toBe(false);
      expect(fs.existsSync).toHaveBeenCalledWith('/nonexistent/path');
    });

    it('throws error when path is empty string', () => {
      expect(() => existsSync('')).toThrow("Arg 'path' must not be empty");
    });

    it('throws error when path is null (coerced)', () => {
      // TypeScript would prevent this, but test runtime behavior
      expect(() => existsSync(null as unknown as string)).toThrow("Arg 'path' must not be empty");
    });

    it('throws error when path is undefined (coerced)', () => {
      expect(() => existsSync(undefined as unknown as string)).toThrow("Arg 'path' must not be empty");
    });
  });

  describe('directoryExistsSync', () => {
    it('returns true when path is an existing directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => true,
      } as fs.Stats);

      const result = directoryExistsSync('/path/to/directory');

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/directory');
      expect(fs.statSync).toHaveBeenCalledWith('/path/to/directory');
    });

    it('returns false when path exists but is a file (not directory)', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
      } as fs.Stats);

      const result = directoryExistsSync('/path/to/file.txt');

      expect(result).toBe(false);
    });

    it('returns false when path does not exist and required is false', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = directoryExistsSync('/nonexistent/path');

      expect(result).toBe(false);
    });

    it('returns false when path does not exist and required is undefined', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = directoryExistsSync('/nonexistent/path', undefined);

      expect(result).toBe(false);
    });

    it('throws error when path does not exist and required is true', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => directoryExistsSync('/nonexistent/dir', true)).toThrow(
        "Directory '/nonexistent/dir' does not exist",
      );
    });

    it('throws error when path is a file and required is true', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
      } as fs.Stats);

      expect(() => directoryExistsSync('/path/to/file.txt', true)).toThrow(
        "Directory '/path/to/file.txt' does not exist",
      );
    });

    it('throws error when path is empty string', () => {
      expect(() => directoryExistsSync('')).toThrow("Arg 'path' must not be empty");
    });

    it('throws error when path is null (coerced)', () => {
      expect(() => directoryExistsSync(null as unknown as string)).toThrow("Arg 'path' must not be empty");
    });

    it('throws error when path is undefined (coerced)', () => {
      expect(() => directoryExistsSync(undefined as unknown as string)).toThrow("Arg 'path' must not be empty");
    });
  });

  describe('fileExistsSync', () => {
    it('returns true when path is an existing file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
      } as fs.Stats);

      const result = fileExistsSync('/path/to/file.txt');

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.txt');
      expect(fs.statSync).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('returns false when path exists but is a directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => true,
      } as fs.Stats);

      const result = fileExistsSync('/path/to/directory');

      expect(result).toBe(false);
    });

    it('returns false when path does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = fileExistsSync('/nonexistent/file.txt');

      expect(result).toBe(false);
    });

    it('throws error when path is empty string', () => {
      expect(() => fileExistsSync('')).toThrow("Arg 'path' must not be empty");
    });

    it('throws error when path is null (coerced)', () => {
      expect(() => fileExistsSync(null as unknown as string)).toThrow("Arg 'path' must not be empty");
    });

    it('throws error when path is undefined (coerced)', () => {
      expect(() => fileExistsSync(undefined as unknown as string)).toThrow("Arg 'path' must not be empty");
    });
  });

  describe('loadFileSync', () => {
    it('returns file contents when file exists', () => {
      const fileContent = 'Hello, World!\nLine 2';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
      } as fs.Stats);
      vi.mocked(readFileSync).mockReturnValue(fileContent);

      const result = loadFileSync('/path/to/file.txt');

      expect(result).toBe(fileContent);
      expect(readFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'utf8');
    });

    it('returns empty string when file is empty', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
      } as fs.Stats);
      vi.mocked(readFileSync).mockReturnValue('');

      const result = loadFileSync('/path/to/empty.txt');

      expect(result).toBe('');
    });

    it('throws error when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => loadFileSync('/nonexistent/file.txt')).toThrow(
        "Encountered an error when reading file '/nonexistent/file.txt': file not there",
      );
    });

    it('throws error when path is a directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => true,
      } as fs.Stats);

      expect(() => loadFileSync('/path/to/directory')).toThrow(
        "Encountered an error when reading file '/path/to/directory': file not there",
      );
    });

    it('throws wrapped error when readFileSync fails', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
      } as fs.Stats);
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => loadFileSync('/path/to/protected.txt')).toThrow(
        "Encountered an error when reading file '/path/to/protected.txt': Permission denied",
      );
    });

    it('throws error when path is empty string', () => {
      expect(() => loadFileSync('')).toThrow("Arg 'path' must not be empty");
    });

    it('throws error when path is null (coerced)', () => {
      expect(() => loadFileSync(null as unknown as string)).toThrow("Arg 'path' must not be empty");
    });

    it('throws error when path is undefined (coerced)', () => {
      expect(() => loadFileSync(undefined as unknown as string)).toThrow("Arg 'path' must not be empty");
    });

    it('handles file content with special characters', () => {
      const specialContent = 'Unicode: \u00e9\u00e0\u00fc\u00f1\nEmoji: \u{1F680}\nTab:\tEnd';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
      } as fs.Stats);
      vi.mocked(readFileSync).mockReturnValue(specialContent);

      const result = loadFileSync('/path/to/unicode.txt');

      expect(result).toBe(specialContent);
    });

    it('handles YAML content correctly', () => {
      const yamlContent = `projects:
  PROJ:
    ignored_states:
      - Done
    to_state:
      'In Progress':
        - pull_request:
            action: opened`;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => false,
      } as fs.Stats);
      vi.mocked(readFileSync).mockReturnValue(yamlContent);

      const result = loadFileSync('/path/to/config.yaml');

      expect(result).toBe(yamlContent);
      expect(result).toContain('projects:');
      expect(result).toContain('ignored_states:');
    });
  });
});
