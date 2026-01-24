/**
 * Jira API mocking setup using vitest
 *
 * This module provides mock implementations for the Jira class methods
 * used in tests. It replaces the previous nock-based HTTP mocking with
 * vitest's vi.mock approach for cleaner, more maintainable tests.
 */

// Mock data that can be customized per test
export const mockJiraData = {
  issues: new Map<string, object>(),
  projects: new Map<string, { id: number; key: string; name: string }>(),
  versions: new Map<string, Map<string, string>>(), // projectKey -> Map<versionName, versionId>
};

/**
 * Reset mock data between tests
 */
export function resetMockData(): void {
  mockJiraData.issues.clear();
  mockJiraData.projects.clear();
  mockJiraData.versions.clear();
}

/**
 * Set up default mock data for tests
 */
export function setupDefaultMockData(baseUrl: string): void {
  // Default project
  mockJiraData.projects.set('UNICORN', {
    id: 10000,
    key: 'UNICORN',
    name: 'Unicorn Project',
  });

  mockJiraData.projects.set('TEST', {
    id: 10001,
    key: 'TEST',
    name: 'Test Project',
  });

  // Default issue
  mockJiraData.issues.set('UNICORN-8403', {
    id: '123456',
    self: `${baseUrl}/rest/api/2/issue/123456`,
    key: 'UNICORN-8403',
    fields: {
      fixVersions: [],
      project: { key: 'UNICORN' },
    },
  });

  mockJiraData.issues.set('TEST-123', {
    id: '123457',
    self: `${baseUrl}/rest/api/2/issue/123457`,
    key: 'TEST-123',
    fields: {
      fixVersions: [],
      project: { key: 'TEST' },
    },
  });

  // Default versions (empty initially)
  mockJiraData.versions.set('UNICORN', new Map());
  mockJiraData.versions.set('TEST', new Map());
}

/**
 * Initialize mocks for Jira API
 * In the new approach, this just sets up the default data
 */
export function setupJiraMock(baseUrl: string): void {
  resetMockData();
  setupDefaultMockData(baseUrl);
}

/**
 * Clean up after tests
 */
export function teardownJiraMock(): void {
  resetMockData();
}

/**
 * Check if we're in record mode (kept for compatibility, always returns false)
 */
export function isRecordMode(): boolean {
  return false;
}

/**
 * Create mock Jira instance for vi.mock
 */
export function createMockJiraInstance(baseUrl: string) {
  let versionIdCounter = 10001;

  return {
    baseUrl,
    token: 'mock-token',
    email: 'mock@example.com',
    projectKeyToId: new Map<string, number>(),
    client: {},

    getIssue: async (issueId: string) => {
      const issue = mockJiraData.issues.get(issueId);
      if (issue) {
        return issue;
      }
      // Generate a default response for any issue
      const projectKey = issueId.split('-')[0];
      return {
        id: '999999',
        self: `${baseUrl}/rest/api/2/issue/999999`,
        key: issueId,
        fields: {
          fixVersions: [],
          project: { key: projectKey },
        },
      };
    },

    getProjectByKey: async (key: string) => {
      const project = mockJiraData.projects.get(key);
      if (project) {
        return project.id;
      }
      // Generate a default project
      const id = 10000 + mockJiraData.projects.size;
      mockJiraData.projects.set(key, { id, key, name: `${key} Project` });
      return id;
    },

    getFixVersions: async (projectIdOrKey: string) => {
      return mockJiraData.versions.get(projectIdOrKey) || new Map();
    },

    projectHasFixVersionsFromList: async (projectIdOrKey: string, fixVersions: string | string[]) => {
      const fixVersionsArray = Array.isArray(fixVersions) ? fixVersions : fixVersions.toUpperCase().split(',');
      const projectVersions = mockJiraData.versions.get(projectIdOrKey) || new Map();
      const existingVersions: string[] = [];

      for (const versionName of projectVersions.keys()) {
        const versionNameUppercase = versionName.toUpperCase();
        if (fixVersionsArray.some((e) => e.toUpperCase() === versionNameUppercase)) {
          existingVersions.push(versionNameUppercase);
        }
      }

      return existingVersions;
    },

    createFixVersion: async (projectId: number, fixVersion: string) => {
      // Find project key by ID
      let projectKey = '';
      for (const [key, project] of mockJiraData.projects) {
        if (project.id === projectId) {
          projectKey = key;
          break;
        }
      }

      if (projectKey) {
        const versions = mockJiraData.versions.get(projectKey) || new Map();
        versions.set(fixVersion, String(versionIdCounter++));
        mockJiraData.versions.set(projectKey, versions);
      }

      return true;
    },

    updateIssueFixVersions: async (issueIdOrKey: string, fixVersions: string[]) => {
      const issue = mockJiraData.issues.get(issueIdOrKey) as
        | { fields: { fixVersions: { name: string }[] } }
        | undefined;
      if (issue) {
        // Add fix versions to the issue
        const existingVersions = issue.fields.fixVersions || [];
        const newVersions = fixVersions
          .filter((fv) => !existingVersions.some((ev) => ev.name === fv))
          .map((fv) => ({ name: fv }));
        issue.fields.fixVersions = [...existingVersions, ...newVersions];
      }
      return {};
    },
  };
}
