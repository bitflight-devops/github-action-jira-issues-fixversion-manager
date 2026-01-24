import * as path from 'node:path';

import * as core from '@actions/core';

import type { Args, JiraAuthConfig } from './@types';
import * as fsHelper from './fs-helper';

/**
 * Parses and validates GitHub Action inputs from environment variables and action inputs.
 *
 * Retrieves configuration from the following sources (in order of precedence):
 * - Environment variables: `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_USER_EMAIL`, `GITHUB_TOKEN`, `GITHUB_WORKSPACE`
 * - Action inputs: `jira_base_url`, `jira_api_token`, `jira_user_email`, `token`, `projects`,
 *   `projects_ignore`, `fix_versions`, `issues`, `fail_on_error`
 *
 * @returns The validated action arguments containing Jira configuration, GitHub token,
 *          project filters, fix versions, issue keys, and error handling preferences.
 * @throws {Error} If `JIRA_BASE_URL` environment variable or `jira_base_url` input is not provided.
 * @throws {Error} If `JIRA_API_TOKEN` environment variable or `jira_api_token` input is not provided.
 * @throws {Error} If `JIRA_USER_EMAIL` environment variable or `jira_user_email` input is not provided.
 * @throws {Error} If `GITHUB_WORKSPACE` environment variable is not defined.
 * @throws {Error} If the GitHub workspace directory does not exist.
 *
 * @example
 * ```typescript
 * // In a GitHub Action context with proper environment variables set:
 * const inputs = getInputs();
 * console.log(inputs.config.baseUrl); // 'https://company.atlassian.net'
 * console.log(inputs.fixVersions);    // ['v1.0.0', 'v1.1.0']
 * ```
 */
export function getInputs(): Args {
  const result = {} as unknown as Args;
  const jiraConfig = {} as unknown as JiraAuthConfig;

  jiraConfig.baseUrl = process.env.JIRA_BASE_URL || core.getInput('jira_base_url') || '';
  if (!jiraConfig.baseUrl || jiraConfig.baseUrl === '') {
    throw new Error('JIRA_BASE_URL env not defined, or supplied as action input jira_base_url');
  }
  jiraConfig.token = process.env.JIRA_API_TOKEN || core.getInput('jira_api_token') || '';
  if (!jiraConfig.token || jiraConfig.token === '') {
    throw new Error('JIRA_API_TOKEN env not defined, or supplied as action input jira_api_token');
  }
  jiraConfig.email = process.env.JIRA_USER_EMAIL || core.getInput('jira_user_email') || '';
  if (!jiraConfig.email || jiraConfig.email === '') {
    throw new Error('JIRA_USER_EMAIL env not defined, or supplied as action input jira_user_email');
  }

  result.config = jiraConfig;
  result.token = core.getInput('token') || process.env.GITHUB_TOKEN || '';
  result.projects = core.getInput('projects');
  result.projectsIgnore = core.getInput('projects_ignore');
  result.fixVersions = core
    .getInput('fix_versions')
    ?.split(',')
    .map((i) => i.trim());
  core.debug(`fix_versions: ${JSON.stringify(result.fixVersions)}`);
  result.issues = core.getInput('issues');
  result.failOnError = core.getInput('fail_on_error') === 'true';

  // GitHub workspace
  let githubWorkspacePath = process.env.GITHUB_WORKSPACE;
  if (!githubWorkspacePath) {
    throw new Error('GITHUB_WORKSPACE not defined');
  }
  githubWorkspacePath = path.resolve(githubWorkspacePath);
  core.debug(`GITHUB_WORKSPACE = '${githubWorkspacePath}'`);
  fsHelper.directoryExistsSync(githubWorkspacePath, true);

  return result;
}
