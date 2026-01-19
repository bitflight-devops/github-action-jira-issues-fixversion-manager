/**
 * Jira API response fixtures for testing
 * These mock the responses from the Jira REST API v2
 */

export const JIRA_BASE_URL = 'https://mock.atlassian.net';
export const TEST_FIX_VERSION = '2.21.0 - API';

// GET /rest/api/2/issue/UNICORN-8403?fields=fixVersions
export const issueUnicorn8403 = {
  expand: 'renderedFields,names,schema,operations,editmeta,changelog,versionedRepresentations',
  id: '123456',
  self: `${JIRA_BASE_URL}/rest/api/2/issue/123456`,
  key: 'UNICORN-8403',
  fields: {
    fixVersions: [],
  },
};

// GET /rest/api/2/issue/UNICORN-8403?fields=fixVersions (after update)
export const issueUnicorn8403WithFixVersion = {
  ...issueUnicorn8403,
  fields: {
    fixVersions: [
      {
        self: `${JIRA_BASE_URL}/rest/api/2/version/10001`,
        id: '10001',
        name: TEST_FIX_VERSION,
        archived: false,
        released: false,
      },
    ],
  },
};

// GET /rest/api/2/project/UNICORN
export const projectUnicorn = {
  expand: 'description,lead,issueTypes,url,projectKeys,permissions,insight',
  self: `${JIRA_BASE_URL}/rest/api/2/project/10000`,
  id: '10000',
  key: 'UNICORN',
  name: 'Unicorn Project',
  avatarUrls: {
    '48x48': `${JIRA_BASE_URL}/secure/projectavatar?pid=10000&avatarId=10011`,
    '24x24': `${JIRA_BASE_URL}/secure/projectavatar?size=small&pid=10000&avatarId=10011`,
    '16x16': `${JIRA_BASE_URL}/secure/projectavatar?size=xsmall&pid=10000&avatarId=10011`,
    '32x32': `${JIRA_BASE_URL}/secure/projectavatar?size=medium&pid=10000&avatarId=10011`,
  },
  projectTypeKey: 'software',
  simplified: false,
  style: 'classic',
  isPrivate: false,
};

// GET /rest/api/2/project/UNICORN/versions (empty - version doesn't exist yet)
export const projectVersionsEmpty = {
  self: `${JIRA_BASE_URL}/rest/api/2/project/UNICORN/version?maxResults=50&startAt=0`,
  nextPage: undefined,
  maxResults: 50,
  startAt: 0,
  total: 0,
  isLast: true,
  values: [],
};

// GET /rest/api/2/project/UNICORN/versions (with existing version)
export const projectVersionsWithVersion = {
  self: `${JIRA_BASE_URL}/rest/api/2/project/UNICORN/version?maxResults=50&startAt=0`,
  nextPage: undefined,
  maxResults: 50,
  startAt: 0,
  total: 1,
  isLast: true,
  values: [
    {
      self: `${JIRA_BASE_URL}/rest/api/2/version/10001`,
      id: '10001',
      name: TEST_FIX_VERSION,
      archived: false,
      released: false,
      startDate: '2026-01-19',
      projectId: 10_000,
    },
  ],
};

// POST /rest/api/2/version (create version response)
export const createVersionResponse = {
  self: `${JIRA_BASE_URL}/rest/api/2/version/10001`,
  id: '10001',
  name: TEST_FIX_VERSION,
  description: `${TEST_FIX_VERSION} (via GitHub)`,
  archived: false,
  released: false,
  startDate: '2026-01-19',
  projectId: 10_000,
};

// PUT /rest/api/2/issue/UNICORN-8403 (edit issue response - 204 No Content typically)
export const editIssueResponse = {};

// GET /rest/api/2/issue/UNICORN-8403/editmeta
export const issueEditMeta = {
  fields: {
    fixVersions: {
      required: false,
      schema: {
        type: 'array',
        items: 'version',
        system: 'fixVersions',
      },
      name: 'Fix Version/s',
      key: 'fixVersions',
      operations: ['set', 'add', 'remove'],
      allowedValues: [],
    },
  },
};
