import * as path from 'node:path';

import * as core from '@actions/core';

import { Args, JiraAuthConfig } from './@types';
import * as fsHelper from './fs-helper';

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
