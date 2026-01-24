/**
 * Unit tests for Action class error handling
 *
 * These tests verify error handling behavior in action.ts:
 * - When EventManager.updateJiraFixVersion() throws an error
 * - Verify core.error() is called with Error objects
 * - Verify errors are re-thrown for proper action failure
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Args } from '../src/@types';
import { Action } from '../src/action';

// Store mock function for controlling EventManager behavior per test
let mockUpdateJiraFixVersion = vi.fn().mockResolvedValue([]);

// Mock @actions/core
vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setFailed: vi.fn(),
  getInput: vi.fn().mockReturnValue(''),
}));

// Mock EventManager using class syntax as required by Vitest 4.x
vi.mock('../src/EventManager', () => {
  return {
    default: class MockEventManager {
      updateJiraFixVersion = mockUpdateJiraFixVersion;
      context: unknown;
      jira: unknown;
      argv: unknown;

      constructor(context: unknown, jira: unknown, argv: unknown) {
        this.context = context;
        this.jira = jira;
        this.argv = argv;
      }
    },
  };
});

// Mock Jira class using class syntax
vi.mock('../src/Jira', () => {
  return {
    default: class MockJira {
      baseUrl = 'https://mock.atlassian.net';
      token = 'mock-token';
      email = 'mock@example.com';
      projectKeyToId = new Map();
      client = {};
    },
  };
});

describe('Action', () => {
  const mockContext = github.context;
  const baseUrl = 'https://mock.atlassian.net';

  const createMockArgs = (): Args => ({
    token: 'mock-github-token',
    issues: 'TEST-123',
    fixVersions: ['1.0.0'],
    includeMergeMessages: true,
    failOnError: false,
    config: {
      baseUrl,
      token: 'mock-jira-token',
      email: 'test@example.com',
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to default successful behavior
    mockUpdateJiraFixVersion = vi.fn().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('execute()', () => {
    it('returns true on successful execution', async () => {
      const argv = createMockArgs();
      const action = new Action(mockContext, argv);

      const result = await action.execute();

      expect(result).toBe(true);
      expect(core.debug).toHaveBeenCalledWith('Executing action: started');
      expect(core.debug).toHaveBeenCalledWith('Executing action: complete');
    });

    it('calls core.error() when updateJiraFixVersion throws an Error', async () => {
      const testError = new Error('Jira API connection failed');
      const argv = createMockArgs();

      const action = new Action(mockContext, argv);
      // Mock the eventManager's updateJiraFixVersion to throw
      action.eventManager.updateJiraFixVersion = vi.fn().mockRejectedValue(testError);

      await expect(action.execute()).rejects.toThrow('Jira API connection failed');

      expect(core.error).toHaveBeenCalledWith(testError);
      expect(core.debug).toHaveBeenCalledWith('Executing action: started');
      // 'complete' should NOT be called on error
      expect(core.debug).not.toHaveBeenCalledWith('Executing action: complete');
    });

    it('re-throws the error after logging', async () => {
      const testError = new Error('Network timeout');
      const argv = createMockArgs();

      const action = new Action(mockContext, argv);
      action.eventManager.updateJiraFixVersion = vi.fn().mockRejectedValue(testError);

      await expect(action.execute()).rejects.toThrow(testError);
    });

    it('does not call core.error() for non-Error thrown values', async () => {
      const nonErrorValue = 'string error';
      const argv = createMockArgs();

      const action = new Action(mockContext, argv);
      action.eventManager.updateJiraFixVersion = vi.fn().mockRejectedValue(nonErrorValue);

      await expect(action.execute()).rejects.toBe(nonErrorValue);

      // core.error should NOT be called for non-Error values
      expect(core.error).not.toHaveBeenCalled();
    });

    it('handles Error subclasses correctly', async () => {
      const typeError = new TypeError('Invalid argument type');
      const argv = createMockArgs();

      const action = new Action(mockContext, argv);
      action.eventManager.updateJiraFixVersion = vi.fn().mockRejectedValue(typeError);

      await expect(action.execute()).rejects.toThrow(typeError);

      // TypeError is an Error subclass, so core.error should be called
      expect(core.error).toHaveBeenCalledWith(typeError);
    });

    it('preserves error stack trace when re-throwing', async () => {
      const testError = new Error('API error with stack');
      const argv = createMockArgs();

      const action = new Action(mockContext, argv);
      action.eventManager.updateJiraFixVersion = vi.fn().mockRejectedValue(testError);

      try {
        await action.execute();
        // Should not reach here
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBe(testError);
        expect((error as Error).stack).toBeDefined();
      }
    });
  });

  describe('constructor', () => {
    it('initializes Jira client with config from argv', () => {
      const argv = createMockArgs();
      const action = new Action(mockContext, argv);

      expect(action.jira).toBeDefined();
      expect(action.config).toEqual(argv.config);
      expect(action.argv).toEqual(argv);
      expect(action.context).toBe(mockContext);
      expect(action.eventManager).toBeDefined();
    });
  });
});
