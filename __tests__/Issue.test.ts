/**
 * Unit tests for the Issue class
 *
 * These tests verify the Issue class functionality including:
 * - Issue construction and initialization
 * - getOutputs() method
 * - setIssue() method
 * - getIssueFixVersions() with fresh parameter
 * - getJiraIssueObject() method
 * - Error handling in apply()
 * - Edge cases like missing fixVersions field
 */

import * as core from '@actions/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Args } from '../src/@types/index.d';
import Issue from '../src/Issue';

// Mock the @actions/core module
vi.mock('@actions/core', () => ({
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warning: vi.fn(),
}));

// Mock data for testing
const baseUrl = 'https://mock.atlassian.net';

const createMockIssueData = (key: string, fixVersions: { name: string }[] = []) => ({
  id: '123456',
  self: `${baseUrl}/rest/api/2/issue/123456`,
  key,
  fields: {
    fixVersions,
    project: { key: key.split('-')[0] },
  },
});

const createMockArgs = (overrides: Partial<Args> = {}): Args => ({
  token: 'mock-token',
  issues: 'TEST-123',
  fixVersions: ['v1.0.0'],
  includeMergeMessages: false,
  failOnError: false,
  config: {
    baseUrl,
    token: 'mock-token',
    email: 'mock@example.com',
  },
  ...overrides,
});

// Create a mock Jira instance factory
const createMockJira = (overrides: Record<string, unknown> = {}) => {
  const mockIssueData = createMockIssueData('TEST-123', []);

  return {
    baseUrl,
    token: 'mock-token',
    email: 'mock@example.com',
    projectKeyToId: new Map<string, number>(),
    client: {},
    getIssue: vi.fn().mockResolvedValue(mockIssueData),
    getProjectByKey: vi.fn().mockResolvedValue(10001),
    getFixVersions: vi.fn().mockResolvedValue(new Map([['v1.0.0', '10001']])),
    projectHasFixVersionsFromList: vi.fn().mockResolvedValue([]),
    createFixVersion: vi.fn().mockResolvedValue(true),
    updateIssueFixVersions: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
};

describe('Issue class', () => {
  let mockJira: ReturnType<typeof createMockJira>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockJira = createMockJira();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('extracts project name from issue key', () => {
      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      expect(issue.issue).toBe('TEST-123');
      expect(issue.projectName).toBe('TEST');
      expect(issue.fixVersions).toEqual(['v1.0.0']);
    });

    it('handles lowercase project key', () => {
      const args = createMockArgs();
      const issue = new Issue('test-123', mockJira as any, args);

      expect(issue.projectName).toBe('TEST');
    });

    it('handles issue key with longer project name', () => {
      const args = createMockArgs();
      const issue = new Issue('UNICORN-8403', mockJira as any, args);

      expect(issue.projectName).toBe('UNICORN');
    });

    it('handles invalid issue key format gracefully', () => {
      const args = createMockArgs();
      const issue = new Issue('invalid', mockJira as any, args);

      expect(issue.projectName).toBe('');
    });
  });

  describe('build()', () => {
    it('fetches issue and captures beforeVersions', async () => {
      const mockIssueWithVersions = createMockIssueData('TEST-123', [{ name: 'v0.9.0' }]);
      mockJira.getIssue.mockResolvedValue(mockIssueWithVersions);

      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      const result = await issue.build();

      expect(result).toBe(issue);
      expect(issue.beforeVersions).toEqual(['v0.9.0']);
      expect(mockJira.getIssue).toHaveBeenCalledWith('TEST-123', { fields: ['fixVersions'] });
    });

    it('returns empty array for beforeVersions when issue has no fixVersions', async () => {
      const mockIssueNoVersions = createMockIssueData('TEST-123', []);
      mockJira.getIssue.mockResolvedValue(mockIssueNoVersions);

      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.build();

      expect(issue.beforeVersions).toEqual([]);
    });
  });

  describe('setIssue()', () => {
    it('updates the issue key', () => {
      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      expect(issue.issue).toBe('TEST-123');

      issue.setIssue('TEST-456');

      expect(issue.issue).toBe('TEST-456');
    });

    it('does not update projectName when setIssue is called', () => {
      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      expect(issue.projectName).toBe('TEST');

      issue.setIssue('OTHER-789');

      // Note: setIssue only updates the issue property, not projectName
      expect(issue.issue).toBe('OTHER-789');
      expect(issue.projectName).toBe('TEST');
    });
  });

  describe('getJiraIssueObject()', () => {
    it('fetches and caches the issue object', async () => {
      const mockIssueData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);
      mockJira.getIssue.mockResolvedValue(mockIssueData);

      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      const result = await issue.getJiraIssueObject();

      expect(result).toEqual(mockIssueData);
      expect(issue.issueObject).toEqual(mockIssueData);
      expect(mockJira.getIssue).toHaveBeenCalledWith('TEST-123', { fields: ['fixVersions'] });
    });

    it('updates issueObject on subsequent calls', async () => {
      const firstIssueData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);
      const secondIssueData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }, { name: 'v2.0.0' }]);

      mockJira.getIssue.mockResolvedValueOnce(firstIssueData).mockResolvedValueOnce(secondIssueData);

      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.getJiraIssueObject();
      expect(issue.issueObject).toEqual(firstIssueData);

      await issue.getJiraIssueObject();
      expect(issue.issueObject).toEqual(secondIssueData);
      expect(mockJira.getIssue).toHaveBeenCalledTimes(2);
    });
  });

  describe('getIssueFixVersions()', () => {
    it('returns fixVersions from cached issueObject when fresh=false', async () => {
      const mockIssueData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }, { name: 'v1.1.0' }]);
      mockJira.getIssue.mockResolvedValue(mockIssueData);

      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      // First call to populate cache
      await issue.getIssueFixVersions();

      // Reset mock to verify it's not called again
      mockJira.getIssue.mockClear();

      // Second call with fresh=false should use cache
      const versions = await issue.getIssueFixVersions(false);

      expect(versions).toEqual(['v1.0.0', 'v1.1.0']);
      expect(mockJira.getIssue).not.toHaveBeenCalled();
    });

    it('fetches fresh data when fresh=true', async () => {
      const initialData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);
      const freshData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }, { name: 'v2.0.0' }]);

      mockJira.getIssue.mockResolvedValueOnce(initialData).mockResolvedValueOnce(freshData);

      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      // First call
      const initial = await issue.getIssueFixVersions();
      expect(initial).toEqual(['v1.0.0']);

      // Fresh call
      const fresh = await issue.getIssueFixVersions(true);
      expect(fresh).toEqual(['v1.0.0', 'v2.0.0']);
      expect(mockJira.getIssue).toHaveBeenCalledTimes(2);
    });

    it('fetches data when issueObject is null regardless of fresh parameter', async () => {
      const mockIssueData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);
      mockJira.getIssue.mockResolvedValue(mockIssueData);

      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      // issueObject is null initially
      expect(issue.issueObject).toBeNull();

      const versions = await issue.getIssueFixVersions(false);

      expect(versions).toEqual(['v1.0.0']);
      expect(mockJira.getIssue).toHaveBeenCalled();
    });

    it('returns empty array and logs error when issueObject cannot be queried', async () => {
      mockJira.getIssue.mockResolvedValue(null);

      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      const versions = await issue.getIssueFixVersions();

      expect(versions).toEqual([]);
      expect(core.error).toHaveBeenCalledWith("Issue object can't be queried from Jira");
    });

    it('handles issue with undefined fixVersions field', async () => {
      const mockIssueNoField = {
        id: '123456',
        self: `${baseUrl}/rest/api/2/issue/123456`,
        key: 'TEST-123',
        fields: {
          project: { key: 'TEST' },
          // fixVersions is missing
        },
      };
      mockJira.getIssue.mockResolvedValue(mockIssueNoField);

      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      const versions = await issue.getIssueFixVersions();

      expect(versions).toBeUndefined();
    });
  });

  describe('getOutputs()', () => {
    it('returns output object with all properties', async () => {
      const mockIssueData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);
      mockJira.getIssue.mockResolvedValue(mockIssueData);
      mockJira.getFixVersions.mockResolvedValue(
        new Map([
          ['v1.0.0', '10001'],
          ['v1.1.0', '10002'],
          ['v2.0.0', '10003'],
        ]),
      );

      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.build();
      issue.afterVersions = ['v1.0.0', 'v1.1.0'];

      const output = await issue.getOutputs();

      expect(output).toEqual({
        issue: 'TEST-123',
        availableFixVersions: 'v1.0.0,v1.1.0,v2.0.0',
        currentFixVersions: 'v1.0.0,v1.1.0',
        beforeFixVersions: 'v1.0.0',
      });
    });

    it('fetches fresh fixVersions when afterVersions is not set', async () => {
      const mockIssueData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);
      mockJira.getIssue.mockResolvedValue(mockIssueData);
      mockJira.getFixVersions.mockResolvedValue(new Map([['v1.0.0', '10001']]));

      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.build();
      // afterVersions is undefined

      const output = await issue.getOutputs();

      expect(output.currentFixVersions).toBe('v1.0.0');
    });

    it('returns empty strings for undefined version arrays', async () => {
      const mockIssueData = createMockIssueData('TEST-123', []);
      mockJira.getIssue.mockResolvedValue(mockIssueData);
      mockJira.getFixVersions.mockResolvedValue(new Map());

      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      // Don't call build() so beforeVersions stays undefined
      issue.issueObject = mockIssueData;

      const output = await issue.getOutputs();

      expect(output.availableFixVersions).toBe('');
      expect(output.beforeFixVersions).toBe('');
    });
  });

  describe('apply()', () => {
    it('adds fixVersions to issue successfully', async () => {
      const mockIssueData = createMockIssueData('TEST-123', []);
      const mockIssueDataAfter = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);

      mockJira.getIssue.mockResolvedValueOnce(mockIssueData).mockResolvedValueOnce(mockIssueDataAfter);

      const args = createMockArgs({ fixVersions: ['v1.0.0'] });
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.build();
      await issue.apply();

      expect(mockJira.updateIssueFixVersions).toHaveBeenCalledWith('TEST-123', ['v1.0.0']);
      expect(issue.afterVersions).toEqual(['v1.0.0']);
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('Adding FixVersions v1.0.0 to Jira Issue Key TEST-123'),
      );
    });

    it('skips update when all fixVersions already exist on issue', async () => {
      const mockIssueData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);
      mockJira.getIssue.mockResolvedValue(mockIssueData);

      const args = createMockArgs({ fixVersions: ['v1.0.0'] });
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.build();
      await issue.apply();

      expect(mockJira.updateIssueFixVersions).not.toHaveBeenCalled();
      expect(core.info).toHaveBeenCalledWith('TEST-123 already has the supplied fix versions of: v1.0.0');
    });

    it('only adds fixVersions that do not exist on issue', async () => {
      const mockIssueData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);
      const mockIssueDataAfter = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }, { name: 'v2.0.0' }]);

      mockJira.getIssue.mockResolvedValueOnce(mockIssueData).mockResolvedValueOnce(mockIssueDataAfter);

      const args = createMockArgs({ fixVersions: ['v1.0.0', 'v2.0.0'] });
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.build();
      await issue.apply();

      // Should still call updateIssueFixVersions because v2.0.0 doesn't exist
      expect(mockJira.updateIssueFixVersions).toHaveBeenCalledWith('TEST-123', ['v1.0.0', 'v2.0.0']);
    });

    it('fetches afterVersions without updating when fixVersions is empty', async () => {
      const mockIssueData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);
      mockJira.getIssue.mockResolvedValue(mockIssueData);

      const args = createMockArgs({ fixVersions: [] });
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.build();
      await issue.apply();

      expect(mockJira.updateIssueFixVersions).not.toHaveBeenCalled();
      expect(issue.afterVersions).toEqual(['v1.0.0']);
    });

    it('throws error when failOnError is true and update fails', async () => {
      const mockIssueData = createMockIssueData('TEST-123', []);
      mockJira.getIssue.mockResolvedValue(mockIssueData);
      mockJira.updateIssueFixVersions.mockRejectedValue(new Error('API Error'));

      const args = createMockArgs({ fixVersions: ['v1.0.0'], failOnError: true });
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.build();

      await expect(issue.apply()).rejects.toThrow('API Error');
      expect(core.error).toHaveBeenCalledWith('Failed applying FixVersions for TEST-123');
    });

    it('logs error but does not throw when failOnError is false and update fails', async () => {
      const mockIssueData = createMockIssueData('TEST-123', []);
      mockJira.getIssue.mockResolvedValue(mockIssueData);
      mockJira.updateIssueFixVersions.mockRejectedValue(new Error('API Error'));

      const args = createMockArgs({ fixVersions: ['v1.0.0'], failOnError: false });
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.build();

      await expect(issue.apply()).resolves.toBeUndefined();
      expect(core.error).toHaveBeenCalledWith('Failed applying FixVersions for TEST-123');
      expect(core.error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('handles non-Error thrown values when failOnError is false', async () => {
      const mockIssueData = createMockIssueData('TEST-123', []);
      mockJira.getIssue.mockResolvedValue(mockIssueData);
      mockJira.updateIssueFixVersions.mockRejectedValue('string error');

      const args = createMockArgs({ fixVersions: ['v1.0.0'], failOnError: false });
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.build();

      await expect(issue.apply()).resolves.toBeUndefined();
      expect(core.error).toHaveBeenCalledWith('Failed applying FixVersions for TEST-123');
      // Should not call core.error with the string since isError returns false
    });

    it('throws error when failOnError is true and getIssueFixVersions fails (empty fixVersions branch)', async () => {
      const mockIssueData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);
      mockJira.getIssue.mockResolvedValueOnce(mockIssueData).mockRejectedValueOnce(new Error('Fetch Error'));

      const args = createMockArgs({ fixVersions: [], failOnError: true });
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.build();

      await expect(issue.apply()).rejects.toThrow('Fetch Error');
      expect(core.error).toHaveBeenCalledWith('Failed getting FixVersions for TEST-123');
    });

    it('logs error but does not throw when failOnError is false and getIssueFixVersions fails (empty fixVersions branch)', async () => {
      const mockIssueData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);
      mockJira.getIssue.mockResolvedValueOnce(mockIssueData).mockRejectedValueOnce(new Error('Fetch Error'));

      const args = createMockArgs({ fixVersions: [], failOnError: false });
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.build();

      await expect(issue.apply()).resolves.toBeUndefined();
      expect(core.error).toHaveBeenCalledWith('Failed getting FixVersions for TEST-123');
      expect(core.error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('handles non-Error thrown values in empty fixVersions branch when failOnError is false', async () => {
      const mockIssueData = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);
      mockJira.getIssue.mockResolvedValueOnce(mockIssueData).mockRejectedValueOnce('string error');

      const args = createMockArgs({ fixVersions: [], failOnError: false });
      const issue = new Issue('TEST-123', mockJira as any, args);

      await issue.build();

      await expect(issue.apply()).resolves.toBeUndefined();
      expect(core.error).toHaveBeenCalledWith('Failed getting FixVersions for TEST-123');
    });

    it('logs "Updating" when beforeVersions is undefined', async () => {
      const mockIssueData = createMockIssueData('TEST-123', []);
      const mockIssueDataAfter = createMockIssueData('TEST-123', [{ name: 'v1.0.0' }]);

      mockJira.getIssue.mockResolvedValueOnce(mockIssueData).mockResolvedValueOnce(mockIssueDataAfter);

      const args = createMockArgs({ fixVersions: ['v1.0.0'] });
      const issue = new Issue('TEST-123', mockJira as any, args);

      // Don't call build(), so beforeVersions is undefined
      await issue.apply();

      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('Updating FixVersions v1.0.0 to Jira Issue Key TEST-123'),
      );
    });
  });

  describe('edge cases', () => {
    it('handles issue with fixVersions field as empty array', async () => {
      const mockIssueData = createMockIssueData('TEST-123', []);
      mockJira.getIssue.mockResolvedValue(mockIssueData);

      const args = createMockArgs();
      const issue = new Issue('TEST-123', mockJira as any, args);

      const versions = await issue.getIssueFixVersions();

      expect(versions).toEqual([]);
    });

    it('handles issue key with single digit number', () => {
      const args = createMockArgs();
      // Issue key with less than 2 digits should not match the regex
      const issue = new Issue('TEST-1', mockJira as any, args);

      expect(issue.projectName).toBe('');
    });

    it('handles issue key with exactly 2 digit number', () => {
      const args = createMockArgs();
      const issue = new Issue('TEST-12', mockJira as any, args);

      expect(issue.projectName).toBe('TEST');
    });

    it('handles mixed case project key', () => {
      const args = createMockArgs();
      const issue = new Issue('TeSt-123', mockJira as any, args);

      expect(issue.projectName).toBe('TEST');
    });
  });
});
