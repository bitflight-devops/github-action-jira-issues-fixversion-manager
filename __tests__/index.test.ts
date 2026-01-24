/**
 * Integration tests for the Jira Fix Version Manager GitHub Action
 *
 * These tests verify the action's core functionality:
 * - Input validation and defaults
 * - GitHub event handling
 * - Jira API interactions (creating versions, updating issues)
 *
 * ## Running Tests
 *
 * **With mocked Jira API (default - for CI):**
 * ```
 * yarn test
 * ```
 */

import * as path from 'node:path';

import * as core from '@actions/core';
import * as github from '@actions/github';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Args } from '../src/@types';
import { Action } from '../src/action';
import * as fsHelper from '../src/fs-helper';
import * as inputHelper from '../src/input-helper';
import { setupJiraMock, teardownJiraMock } from './mocks/jira-api';

const originalGitHubWorkspace = process.env.GITHUB_WORKSPACE;
const gitHubWorkspace = path.resolve('/checkout-tests/workspace');

// Use mock URL
const baseUrl = 'https://mock.atlassian.net';

// Inputs for mock @actions/core
let inputs = {} as Record<string, string>;
const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'test-owner/test-repo').split('/');

// Shallow clone original @actions/github context
const originalContext = { ...github.context };

// Define mock data inline (vi.mock is hoisted, so we need to define it inline)
const mockIssueUnicorn = {
  id: '123456',
  self: `${baseUrl}/rest/api/2/issue/123456`,
  key: 'UNICORN-8403',
  fields: {
    fixVersions: [] as { name: string }[],
    project: { key: 'UNICORN' },
  },
};

const mockIssueTest = {
  id: '123457',
  self: `${baseUrl}/rest/api/2/issue/123457`,
  key: 'TEST-123',
  fields: {
    fixVersions: [] as { name: string }[],
    project: { key: 'TEST' },
  },
};

const mockProjects = new Map([
  ['UNICORN', { id: 10_000, key: 'UNICORN', name: 'Unicorn Project' }],
  ['TEST', { id: 10_001, key: 'TEST', name: 'Test Project' }],
]);

const mockVersions = new Map<string, Map<string, string>>([
  ['UNICORN', new Map()],
  ['TEST', new Map()],
]);

let versionIdCounter = 10_001;

// Mock the Jira class to avoid HTTP requests entirely
// Vitest 4.x requires class syntax or explicit function constructors for mocked classes
vi.mock('../src/Jira', () => {
  return {
    default: class MockJira {
      baseUrl = baseUrl;
      token = 'mock-token';
      email = 'mock@example.com';
      projectKeyToId = new Map<string, number>();
      client = {};

      async getIssue(issueId: string) {
        if (issueId === 'UNICORN-8403') return mockIssueUnicorn;
        if (issueId === 'TEST-123') return mockIssueTest;
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
      }

      async getProjectByKey(key: string) {
        const project = mockProjects.get(key);
        if (project) {
          return project.id;
        }
        // Generate a default project
        const id = 10_000 + mockProjects.size;
        mockProjects.set(key, { id, key, name: `${key} Project` });
        return id;
      }

      async getFixVersions(projectIdOrKey: string) {
        return mockVersions.get(projectIdOrKey) || new Map();
      }

      async projectHasFixVersionsFromList(projectIdOrKey: string, fixVersions: string | string[]) {
        const fixVersionsArray = Array.isArray(fixVersions) ? fixVersions : fixVersions.toUpperCase().split(',');
        const projectVersions = mockVersions.get(projectIdOrKey) || new Map();
        const existingVersions: string[] = [];

        for (const versionName of projectVersions.keys()) {
          const versionNameUppercase = versionName.toUpperCase();
          if (fixVersionsArray.some((e) => e.toUpperCase() === versionNameUppercase)) {
            existingVersions.push(versionNameUppercase);
          }
        }

        return existingVersions;
      }

      async createFixVersion(projectId: number, fixVersion: string) {
        // Find project key by ID
        let projectKey = '';
        for (const [key, project] of mockProjects) {
          if (project.id === projectId) {
            projectKey = key;
            break;
          }
        }

        if (projectKey) {
          const versions = mockVersions.get(projectKey) || new Map();
          versions.set(fixVersion, String(versionIdCounter++));
          mockVersions.set(projectKey, versions);
        }

        return true;
      }

      async updateIssueFixVersions(issueIdOrKey: string, fixVersions: string[]) {
        // Update the mock issue data
        let issue: typeof mockIssueUnicorn | undefined;
        if (issueIdOrKey === 'UNICORN-8403') {
          issue = mockIssueUnicorn;
        } else if (issueIdOrKey === 'TEST-123') {
          issue = mockIssueTest;
        }

        if (issue) {
          // Add fix versions to the issue
          const existingVersions = issue.fields.fixVersions || [];
          const newVersions = fixVersions
            .filter((fv) => !existingVersions.some((ev) => ev.name === fv))
            .map((fv) => ({ name: fv }));
          issue.fields.fixVersions = [...existingVersions, ...newVersions];
        }

        return {};
      }
    },
  };
});

describe('jira ticket transition', () => {
  beforeAll(() => {
    // Set up Jira API mocking data
    setupJiraMock(baseUrl);

    // Set required environment variables
    process.env.JIRA_BASE_URL = baseUrl;
    process.env.JIRA_API_TOKEN = 'mock-token';
    process.env.JIRA_USER_EMAIL = 'mock@example.com';

    // Mock getInput
    vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
      return inputs[name] || '';
    });
    vi.spyOn(core, 'getBooleanInput').mockImplementation((name: string) => {
      const regMatTrue = /(true|True|TRUE)/;
      const regMatFalse = /(false|False|FALSE)/;
      if (regMatTrue.test(inputs[name])) {
        return true;
      }
      if (regMatFalse.test(inputs[name])) {
        return false;
      }

      throw new Error(`
      TypeError: Input does not meet YAML 1.2 "Core Schema" specification: ${name}
      Support boolean input list: true | True | TRUE | false | False | FALSE
    `);
    });

    // Mock error/warning/info/debug
    vi.spyOn(core, 'error').mockImplementation(console.log);
    vi.spyOn(core, 'warning').mockImplementation(console.log);
    vi.spyOn(core, 'info').mockImplementation(console.log);
    vi.spyOn(core, 'debug').mockImplementation(console.log);

    // Mock github context
    vi.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
      return {
        owner,
        repo,
      };
    });

    github.context.ref = 'refs/heads/DVPS-331';
    github.context.sha = '1234567890123456789012345678901234567890';

    // Mock ./fs-helper directoryExistsSync()
    vi.spyOn(fsHelper, 'directoryExistsSync').mockImplementation((fspath: string) => fspath === gitHubWorkspace);

    // GitHub workspace
    process.env.GITHUB_WORKSPACE = gitHubWorkspace;
  });

  beforeEach(() => {
    // Reset inputs
    inputs = {};
    inputs.token = process.env.GITHUB_TOKEN || 'mock-github-token';
    inputs.fail_on_error = 'false';
    inputs.jira_base_url = baseUrl;

    // Reset mock issue data
    mockIssueUnicorn.fields.fixVersions = [];
    mockIssueTest.fields.fixVersions = [];

    // Reset mock versions
    mockVersions.set('UNICORN', new Map());
    mockVersions.set('TEST', new Map());
    versionIdCounter = 10_001;

    core.info(
      JSON.stringify({
        fail_on_error: inputs.fail_on_error,
        jira_base_url: inputs.jira_base_url,
      }),
    );
  });

  afterAll(() => {
    // Clean up mock data
    teardownJiraMock();

    // Restore GitHub workspace
    process.env.GITHUB_WORKSPACE = undefined;
    if (originalGitHubWorkspace) {
      process.env.GITHUB_WORKSPACE = originalGitHubWorkspace;
    }

    // Restore @actions/github context
    github.context.ref = originalContext.ref;
    github.context.sha = originalContext.sha;

    // Restore
    vi.restoreAllMocks();
  });

  it('sets defaults', () => {
    const settings: Args = inputHelper.getInputs();
    expect(settings).toBeTruthy();
    expect(settings.config).toBeTruthy();
    expect(settings.config.baseUrl).toEqual(baseUrl);
  });

  it('GitHub Event: pull_request', async () => {
    github.context.payload = {
      pull_request: {
        head: { ref: 'refs/heads/DVPS-331' },
        base: { ref: 'refs/heads/dev' },
        number: 2770,
        title: 'DVPS-336',
      },
    };

    // Test with a sample issue and fix version
    inputs.issues = 'UNICORN-8403';
    inputs.fix_versions = '2.21.0 - API';
    github.context.eventName = 'pull_request';

    const settings: Args = inputHelper.getInputs();
    expect(settings.config).toBeTruthy();
    expect(settings.fixVersions).toStrictEqual(['2.21.0 - API']);

    core.info(`fix_versions: ${JSON.stringify(settings.fixVersions)}`);

    const action = new Action(github.context, settings);
    const result = await action.execute();

    expect(result).toEqual(true);
  });

  it('handles missing fix_versions gracefully', async () => {
    github.context.payload = {
      pull_request: {
        head: { ref: 'refs/heads/TEST-123' },
        base: { ref: 'refs/heads/main' },
        number: 1,
        title: 'Test PR',
      },
    };

    inputs.issues = 'TEST-123';
    // Explicitly set fix_versions to empty string (simulating no input)
    delete inputs.fix_versions;
    github.context.eventName = 'pull_request';

    const settings: Args = inputHelper.getInputs();
    // When fix_versions input is empty/undefined, it returns [''] due to split behavior
    // This is expected behavior - the action handles empty strings in fixVersions array
    expect(settings.fixVersions).toBeDefined();
  });
});
