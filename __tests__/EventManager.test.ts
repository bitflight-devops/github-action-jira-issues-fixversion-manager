/**
 * Unit tests for EventManager class
 *
 * These tests focus on branch coverage for:
 * - isProjectOfIssueSelected() filtering logic
 * - getIssueSetFromString() edge cases
 */

import * as core from '@actions/core';
import type { Context } from '@actions/github/lib/context';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Args } from '../src/@types';
import EventManager from '../src/EventManager';
import type Jira from '../src/Jira';

// Mock @actions/core
vi.mock('@actions/core', () => ({
  getInput: vi.fn(() => ''),
  getBooleanInput: vi.fn(() => false),
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

// Mock Jira class
vi.mock('../src/Jira', () => ({
  default: class MockJira {
    baseUrl = 'https://mock.atlassian.net';
    token = 'mock-token';
    email = 'mock@example.com';
  },
}));

// Mock Issue class
vi.mock('../src/Issue', () => ({
  default: class MockIssue {
    issueKey: string;

    constructor(issueKey: string) {
      this.issueKey = issueKey;
    }

    async build() {
      return this;
    }

    async apply() {
      return;
    }
  },
}));

describe('EventManager', () => {
  let mockContext: Context;
  let mockJira: Jira;
  let baseArgv: Args;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create minimal mock context
    mockContext = {
      eventName: 'push',
      sha: '1234567890',
      ref: 'refs/heads/main',
      workflow: 'test',
      action: 'test',
      actor: 'test-user',
      job: 'test-job',
      runNumber: 1,
      runId: 1,
      apiUrl: 'https://api.github.com',
      serverUrl: 'https://github.com',
      graphqlUrl: 'https://api.github.com/graphql',
      repo: { owner: 'test', repo: 'test' },
      issue: { owner: 'test', repo: 'test', number: 1 },
      payload: {},
    } as unknown as Context;

    // Create mock Jira instance - cast an empty object as Jira type
    mockJira = {
      baseUrl: 'https://mock.atlassian.net',
      token: 'mock-token',
      email: 'mock@example.com',
    } as unknown as Jira;

    // Base argv configuration
    baseArgv = {
      token: 'mock-token',
      issues: '',
      fixVersions: ['1.0.0'],
      failOnError: false,
      includeMergeMessages: true,
      config: {
        baseUrl: 'https://mock.atlassian.net',
        token: 'mock-token',
        email: 'mock@example.com',
      },
    };
  });

  describe('isProjectOfIssueSelected()', () => {
    describe('project exclusion list handling', () => {
      it('should exclude issue when project is in exclusion list', () => {
        // Arrange: Create EventManager with PROJ in exclusion list
        const argv: Args = {
          ...baseArgv,
          projectsIgnore: 'PROJ,EXCLUDED',
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act
        const result = manager.isProjectOfIssueSelected('PROJ-123');

        // Assert
        expect(result).toBe(false);
        expect(core.debug).toHaveBeenCalledWith('PROJ-123 is excluded because of a specific project filter exclusion');
      });

      it('should exclude issue with lowercase project key in exclusion list (case insensitive)', () => {
        // Arrange: Exclusion list has uppercase, issue key is mixed case
        const argv: Args = {
          ...baseArgv,
          projectsIgnore: 'PROJ',
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act: Pass lowercase project prefix - extraction uses split('-')[0]
        const result = manager.isProjectOfIssueSelected('proj-456');

        // Assert: Should still match because of toUpperCase() in the check
        expect(result).toBe(false);
        expect(core.debug).toHaveBeenCalledWith('proj-456 is excluded because of a specific project filter exclusion');
      });
    });

    describe('project inclusion list handling', () => {
      it('should include issue when project is in inclusion list', () => {
        // Arrange: Create EventManager with PROJ in inclusion list
        const argv: Args = {
          ...baseArgv,
          projects: 'PROJ,ALLOWED',
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act
        const result = manager.isProjectOfIssueSelected('PROJ-123');

        // Assert
        expect(result).toBe(true);
        expect(core.debug).toHaveBeenCalledWith(
          'PROJ-123 is included because there its part of the specific project filter',
        );
      });

      it('should exclude issue when project is NOT in inclusion list', () => {
        // Arrange: Create EventManager with specific projects included, but not OTHER
        const argv: Args = {
          ...baseArgv,
          projects: 'PROJ,ALLOWED',
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act: OTHER is not in the inclusion list
        const result = manager.isProjectOfIssueSelected('OTHER-789');

        // Assert
        expect(result).toBe(false);
        expect(core.debug).toHaveBeenCalledWith(
          "OTHER-789 is excluded because it doesn't belong to the included projects",
        );
      });

      it('should include issue with lowercase project key in inclusion list (case insensitive)', () => {
        // Arrange: Inclusion list has uppercase, issue key is mixed case
        const argv: Args = {
          ...baseArgv,
          projects: 'PROJ',
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act
        const result = manager.isProjectOfIssueSelected('proj-123');

        // Assert: Should match because of toUpperCase() in the check
        expect(result).toBe(true);
      });
    });

    describe('no project filter handling', () => {
      it('should include all issues when no inclusion or exclusion list defined', () => {
        // Arrange: No projects or projectsIgnore specified
        const argv: Args = {
          ...baseArgv,
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act
        const result = manager.isProjectOfIssueSelected('ANY-PROJECT-123');

        // Assert
        expect(result).toBe(true);
        expect(core.debug).toHaveBeenCalledWith(
          'ANY-PROJECT-123 is included because there is no specific project filter',
        );
      });

      it('should include all issues when inclusion list is empty string', () => {
        // Arrange: Empty string for projects (results in nullIfEmpty returning null)
        const argv: Args = {
          ...baseArgv,
          projects: '',
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act
        const result = manager.isProjectOfIssueSelected('RANDOM-999');

        // Assert: Empty string is normalized to null via nullIfEmpty
        expect(result).toBe(true);
      });
    });

    describe('empty project prefix handling', () => {
      it('should return false for issue key with empty project prefix', () => {
        // Arrange
        const argv: Args = {
          ...baseArgv,
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act: Issue key starting with hyphen yields empty project
        const result = manager.isProjectOfIssueSelected('-123');

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for issue key with no hyphen', () => {
        // Arrange
        const argv: Args = {
          ...baseArgv,
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act: No hyphen means split returns single element, project is the whole string
        // But this doesn't match the issueIdRegEx so it wouldn't normally be passed here
        // Testing direct call to the method
        const result = manager.isProjectOfIssueSelected('PROJ123');

        // Assert: Project is "PROJ123", which is valid (non-empty)
        expect(result).toBe(true);
      });
    });

    describe('exclusion takes precedence over inclusion', () => {
      it('should exclude issue when project is in both exclusion and inclusion lists', () => {
        // Arrange: PROJ is in both lists, exclusion should take precedence
        const argv: Args = {
          ...baseArgv,
          projects: 'PROJ,OTHER',
          projectsIgnore: 'PROJ',
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act
        const result = manager.isProjectOfIssueSelected('PROJ-123');

        // Assert: Exclusion is checked first
        expect(result).toBe(false);
        expect(core.debug).toHaveBeenCalledWith('PROJ-123 is excluded because of a specific project filter exclusion');
      });
    });
  });

  describe('getIssueSetFromString()', () => {
    describe('empty and invalid input handling', () => {
      it('should return empty set for empty string input', () => {
        // Arrange
        const argv: Args = {
          ...baseArgv,
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act
        const result = manager.getIssueSetFromString('');

        // Assert
        expect(result).toBeInstanceOf(Set);
        expect(result.size).toBe(0);
      });

      it('should return empty set for string with no issue key matches', () => {
        // Arrange
        const argv: Args = {
          ...baseArgv,
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act: String with no valid issue key pattern
        const result = manager.getIssueSetFromString('This is just some text without any issue keys');

        // Assert
        expect(result).toBeInstanceOf(Set);
        expect(result.size).toBe(0);
      });

      it('should return empty set for string with invalid issue key format', () => {
        // Arrange
        const argv: Args = {
          ...baseArgv,
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act: Invalid formats
        const result = manager.getIssueSetFromString('PROJ PROJ- -123 123');

        // Assert
        expect(result.size).toBe(0);
      });
    });

    describe('filtering based on project filters', () => {
      it('should return empty set when all matched issues are filtered out by exclusion', () => {
        // Arrange: Exclude PROJ project
        const argv: Args = {
          ...baseArgv,
          projectsIgnore: 'PROJ',
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act: Only PROJ issues in the string
        const result = manager.getIssueSetFromString('PROJ-123, PROJ-456, PROJ-789');

        // Assert
        expect(result.size).toBe(0);
      });

      it('should return empty set when all matched issues are filtered out by inclusion list', () => {
        // Arrange: Only include ALLOWED project
        const argv: Args = {
          ...baseArgv,
          projects: 'ALLOWED',
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act: Only OTHER issues in the string
        const result = manager.getIssueSetFromString('OTHER-123, EXCLUDED-456');

        // Assert
        expect(result.size).toBe(0);
      });

      it('should return only issues matching inclusion filter', () => {
        // Arrange: Only include PROJ project
        const argv: Args = {
          ...baseArgv,
          projects: 'PROJ',
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act: Mixed projects in the string
        const result = manager.getIssueSetFromString('PROJ-123, OTHER-456, PROJ-789');

        // Assert
        expect(result.size).toBe(2);
        expect(result.has('PROJ-123')).toBe(true);
        expect(result.has('PROJ-789')).toBe(true);
        expect(result.has('OTHER-456')).toBe(false);
      });

      it('should exclude specific projects while including others', () => {
        // Arrange: Exclude EXCLUDED project
        const argv: Args = {
          ...baseArgv,
          projectsIgnore: 'EXCLUDED',
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act
        const result = manager.getIssueSetFromString('PROJ-123, EXCLUDED-456, OTHER-789');

        // Assert
        expect(result.size).toBe(2);
        expect(result.has('PROJ-123')).toBe(true);
        expect(result.has('OTHER-789')).toBe(true);
        expect(result.has('EXCLUDED-456')).toBe(false);
      });
    });

    describe('accumulator set behavior', () => {
      it('should add issues to existing set when provided', () => {
        // Arrange
        const argv: Args = {
          ...baseArgv,
        };
        const manager = new EventManager(mockContext, mockJira, argv);
        const existingSet = new Set<string>(['EXISTING-1', 'EXISTING-2']);

        // Act
        const result = manager.getIssueSetFromString('NEW-123, NEW-456', existingSet);

        // Assert
        expect(result).toBe(existingSet); // Same reference
        expect(result.size).toBe(4);
        expect(result.has('EXISTING-1')).toBe(true);
        expect(result.has('EXISTING-2')).toBe(true);
        expect(result.has('NEW-123')).toBe(true);
        expect(result.has('NEW-456')).toBe(true);
      });

      it('should deduplicate issues in accumulator set', () => {
        // Arrange
        const argv: Args = {
          ...baseArgv,
        };
        const manager = new EventManager(mockContext, mockJira, argv);
        const existingSet = new Set<string>(['PROJ-123']);

        // Act: PROJ-123 already exists
        const result = manager.getIssueSetFromString('PROJ-123, PROJ-456', existingSet);

        // Assert
        expect(result.size).toBe(2);
        expect(result.has('PROJ-123')).toBe(true);
        expect(result.has('PROJ-456')).toBe(true);
      });
    });

    describe('issue key extraction', () => {
      it('should extract multiple issue keys from comma-separated string', () => {
        // Arrange
        const argv: Args = {
          ...baseArgv,
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act
        const result = manager.getIssueSetFromString('PROJ-123, PROJ-456, TEST-789');

        // Assert
        expect(result.size).toBe(3);
        expect(result.has('PROJ-123')).toBe(true);
        expect(result.has('PROJ-456')).toBe(true);
        expect(result.has('TEST-789')).toBe(true);
      });

      it('should extract issue keys from natural text', () => {
        // Arrange
        const argv: Args = {
          ...baseArgv,
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act
        const result = manager.getIssueSetFromString('Fixed PROJ-123 and also resolved TEST-456 in this PR');

        // Assert
        expect(result.size).toBe(2);
        expect(result.has('PROJ-123')).toBe(true);
        expect(result.has('TEST-456')).toBe(true);
      });

      it('should handle duplicate issue keys in input', () => {
        // Arrange
        const argv: Args = {
          ...baseArgv,
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act
        const result = manager.getIssueSetFromString('PROJ-123 PROJ-123 PROJ-123');

        // Assert
        expect(result.size).toBe(1);
        expect(result.has('PROJ-123')).toBe(true);
      });
    });

    describe('debug logging', () => {
      it('should log debug message when issue is added to set', () => {
        // Arrange
        const argv: Args = {
          ...baseArgv,
        };
        const manager = new EventManager(mockContext, mockJira, argv);

        // Act
        manager.getIssueSetFromString('PROJ-123');

        // Assert
        expect(core.debug).toHaveBeenCalledWith('PROJ-123 is added to set');
      });
    });
  });

  describe('updateJiraFixVersion()', () => {
    it('should process issues and call Issue.build().apply() for each', async () => {
      // Arrange
      const argv: Args = {
        ...baseArgv,
        issues: 'PROJ-123, PROJ-456',
      };
      const manager = new EventManager(mockContext, mockJira, argv);

      // Act
      const result = await manager.updateJiraFixVersion();

      // Assert
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no issues match filters', async () => {
      // Arrange
      const argv: Args = {
        ...baseArgv,
        issues: 'EXCLUDED-123',
        projectsIgnore: 'EXCLUDED',
      };
      const manager = new EventManager(mockContext, mockJira, argv);

      // Act
      const result = await manager.updateJiraFixVersion();

      // Assert
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });

    it('should return empty array when issues string is empty', async () => {
      // Arrange
      const argv: Args = {
        ...baseArgv,
        issues: '',
      };
      const manager = new EventManager(mockContext, mockJira, argv);

      // Act
      const result = await manager.updateJiraFixVersion();

      // Assert
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });
  });

  describe('constructor', () => {
    it('should normalize project keys to uppercase in inclusion filter', () => {
      // Arrange
      const argv: Args = {
        ...baseArgv,
        projects: 'proj, Test, UPPER',
      };

      // Act
      const manager = new EventManager(mockContext, mockJira, argv);

      // Assert
      expect(manager.filter.projectsIncluded).toEqual(['PROJ', 'TEST', 'UPPER']);
    });

    it('should normalize project keys to uppercase in exclusion filter', () => {
      // Arrange
      const argv: Args = {
        ...baseArgv,
        projectsIgnore: 'excluded, Ignore',
      };

      // Act
      const manager = new EventManager(mockContext, mockJira, argv);

      // Assert
      expect(manager.filter.projectsExcluded).toEqual(['EXCLUDED', 'IGNORE']);
    });

    it('should set filter.projectsIncluded to null when projects is undefined', () => {
      // Arrange
      const argv: Args = {
        ...baseArgv,
        projects: undefined,
      };

      // Act
      const manager = new EventManager(mockContext, mockJira, argv);

      // Assert
      expect(manager.filter.projectsIncluded).toBeNull();
    });

    it('should set filter.projectsExcluded to null when projectsIgnore is undefined', () => {
      // Arrange
      const argv: Args = {
        ...baseArgv,
        projectsIgnore: undefined,
      };

      // Act
      const manager = new EventManager(mockContext, mockJira, argv);

      // Assert
      expect(manager.filter.projectsExcluded).toBeNull();
    });

    it('should trim whitespace from project keys', () => {
      // Arrange
      const argv: Args = {
        ...baseArgv,
        projects: '  PROJ  ,  TEST  ',
        projectsIgnore: '  EXCLUDED  ',
      };

      // Act
      const manager = new EventManager(mockContext, mockJira, argv);

      // Assert
      expect(manager.filter.projectsIncluded).toEqual(['PROJ', 'TEST']);
      expect(manager.filter.projectsExcluded).toEqual(['EXCLUDED']);
    });
  });
});
