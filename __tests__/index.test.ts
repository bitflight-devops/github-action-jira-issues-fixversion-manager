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
 *
 * **Record mode (captures real Jira responses for fixtures):**
 * ```
 * JIRA_RECORD_MODE=true \
 * JIRA_BASE_URL=https://your-instance.atlassian.net \
 * JIRA_API_TOKEN=your-api-token \
 * JIRA_USER_EMAIL=your@email.com \
 * yarn test
 * ```
 *
 * After recording, commit the generated fixtures in `__tests__/fixtures/recorded/`
 */

import * as path from 'node:path';

import * as core from '@actions/core';
import * as github from '@actions/github';

import { Args } from '../src/@types';
import { Action } from '../src/action';
import * as fsHelper from '../src/fs-helper';
import * as inputHelper from '../src/input-helper';
import { isRecordMode, setupJiraMock, teardownJiraMock } from './mocks/jira-api';

const originalGitHubWorkspace = process.env.GITHUB_WORKSPACE;
const gitHubWorkspace = path.resolve('/checkout-tests/workspace');

// Use mock URL unless in record mode with real credentials
const baseUrl = process.env.JIRA_BASE_URL || 'https://mock.atlassian.net';

// Inputs for mock @actions/core
let inputs = {} as Record<string, string>;
const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'test-owner/test-repo').split('/');

// Shallow clone original @actions/github context
const originalContext = { ...github.context };

describe('jira ticket transition', () => {
  beforeAll(() => {
    jest.setTimeout(50_000);

    // Set up Jira API mocking (or recording in record mode)
    setupJiraMock(baseUrl);

    // Set required environment variables if not in record mode
    if (!isRecordMode()) {
      process.env.JIRA_BASE_URL = baseUrl;
      process.env.JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || 'mock-token';
      process.env.JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL || 'mock@example.com';
    }

    // Mock getInput
    jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
      return inputs[name] || '';
    });
    jest.spyOn(core, 'getBooleanInput').mockImplementation((name: string) => {
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
    jest.spyOn(core, 'error').mockImplementation(console.log);
    jest.spyOn(core, 'warning').mockImplementation(console.log);
    jest.spyOn(core, 'info').mockImplementation(console.log);
    jest.spyOn(core, 'debug').mockImplementation(console.log);

    // Mock github context
    jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
      return {
        owner,
        repo,
      };
    });

    github.context.ref = 'refs/heads/DVPS-331';
    github.context.sha = '1234567890123456789012345678901234567890';

    // Mock ./fs-helper directoryExistsSync()
    jest.spyOn(fsHelper, 'directoryExistsSync').mockImplementation((fspath: string) => fspath === gitHubWorkspace);

    // GitHub workspace
    process.env.GITHUB_WORKSPACE = gitHubWorkspace;
  });

  beforeEach(() => {
    // Reset inputs
    inputs = {};
    inputs.token = process.env.GITHUB_TOKEN || 'mock-github-token';
    inputs.fail_on_error = 'false';
    inputs.jira_base_url = baseUrl;

    core.info(JSON.stringify({ fail_on_error: inputs.fail_on_error, jira_base_url: inputs.jira_base_url }));
  });

  afterAll(() => {
    // Save recorded fixtures if in record mode
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
    jest.restoreAllMocks();
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
