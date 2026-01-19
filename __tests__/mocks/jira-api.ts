/**
 * Jira API mocking setup using nock
 *
 * This module supports two modes:
 * 1. RECORD mode: Makes real API calls and records responses to fixtures
 * 2. PLAYBACK mode: Uses recorded fixtures (default for CI)
 *
 * To record new fixtures:
 *   JIRA_RECORD_MODE=true JIRA_BASE_URL=https://your-instance.atlassian.net \
 *   JIRA_API_TOKEN=your-token JIRA_USER_EMAIL=your@email.com yarn test
 *
 * The recorded fixtures will be written to __tests__/fixtures/recorded/
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import nock from 'nock';

const FIXTURES_DIR = path.join(__dirname, '../fixtures/recorded');
const RECORD_MODE = process.env.JIRA_RECORD_MODE === 'true';

/**
 * Default mocks when no recorded fixtures are available
 * These provide basic responses for common Jira API endpoints
 */
function setupDefaultMocks(baseUrl: string): void {
  nock(baseUrl)
    // GET /rest/api/2/issue/{issueIdOrKey} with query params
    .get(/\/rest\/api\/2\/issue\/[\w-]+/)
    .query(true)
    .reply(200, function getIssueReply(uri) {
      const match = uri.match(/\/rest\/api\/2\/issue\/([\w-]+)/);
      const issueKey = match ? match[1] : 'UNKNOWN-1';
      const projectKey = issueKey.split('-')[0];
      return {
        id: '123456',
        self: `${baseUrl}/rest/api/2/issue/123456`,
        key: issueKey,
        fields: {
          fixVersions: [],
          project: { key: projectKey },
        },
      };
    })

    // GET /rest/api/2/project/{projectIdOrKey}
    .get(/\/rest\/api\/2\/project\/[\w-]+$/)
    .query(true)
    .reply(200, function getProjectReply(uri) {
      const match = uri.match(/\/rest\/api\/2\/project\/([\w-]+)/);
      const projectKey = match ? match[1] : 'UNKNOWN';
      return {
        id: '10000',
        key: projectKey,
        name: `${projectKey} Project`,
      };
    })

    // GET /rest/api/2/project/{projectIdOrKey}/version (paginated)
    .get(/\/rest\/api\/2\/project\/[\w-]+\/version/)
    .query(true)
    .reply(200, {
      maxResults: 50,
      startAt: 0,
      total: 0,
      isLast: true,
      values: [],
    })

    // POST /rest/api/2/version (create version)
    .post('/rest/api/2/version')
    .reply(201, function createVersionReply(_uri, requestBody: Record<string, unknown>) {
      return {
        id: '10001',
        self: `${baseUrl}/rest/api/2/version/10001`,
        name: requestBody.name,
        description: requestBody.description,
        archived: false,
        released: false,
        projectId: requestBody.projectId,
      };
    })

    // PUT /rest/api/2/issue/{issueIdOrKey} (edit issue)
    .put(/\/rest\/api\/2\/issue\/[\w-]+/)
    .reply(204)

    // Persist mocks across multiple requests
    .persist();
}

/**
 * Initialize nock for Jira API mocking
 * In record mode, this enables recording of real API calls
 * In playback mode, this loads recorded fixtures
 */
export function setupJiraMock(baseUrl: string): void {
  // Clean up any previous mocks
  nock.cleanAll();

  if (RECORD_MODE) {
    console.log('[nock] Recording mode enabled - making real API calls');
    nock.recorder.rec({
      output_objects: true,
      dont_print: true,
    });
    // Allow real network requests in record mode
    nock.enableNetConnect();
  } else {
    // Load recorded fixtures if they exist
    const fixturesFile = path.join(FIXTURES_DIR, 'jira-api.json');
    if (fs.existsSync(fixturesFile)) {
      try {
        const fixtures = JSON.parse(fs.readFileSync(fixturesFile, 'utf8'));
        nock.define(fixtures);
        console.log(`[nock] Loaded ${fixtures.length} recorded API fixtures`);
      } catch {
        console.log('[nock] Error loading fixtures, using default mocks');
        setupDefaultMocks(baseUrl);
      }
    } else {
      console.log('[nock] No recorded fixtures found, using default mocks');
      setupDefaultMocks(baseUrl);
    }

    // Disable real HTTP requests in playback mode
    nock.disableNetConnect();
    // But allow localhost for other test infrastructure
    nock.enableNetConnect('127.0.0.1');
  }
}

/**
 * Clean up nock after tests
 * In record mode, saves recorded fixtures to file
 */
export function teardownJiraMock(): void {
  if (RECORD_MODE) {
    const recordings = nock.recorder.play() as nock.Definition[];
    if (recordings.length > 0) {
      // Ensure fixtures directory exists
      if (!fs.existsSync(FIXTURES_DIR)) {
        fs.mkdirSync(FIXTURES_DIR, { recursive: true });
      }

      const fixturesFile = path.join(FIXTURES_DIR, 'jira-api.json');
      fs.writeFileSync(fixturesFile, JSON.stringify(recordings, null, 2));
      console.log(`[nock] Saved ${recordings.length} API recordings to ${fixturesFile}`);
    }
    nock.recorder.clear();
  }

  nock.cleanAll();
  nock.enableNetConnect();
}

/**
 * Check if we're in record mode
 */
export function isRecordMode(): boolean {
  return RECORD_MODE;
}
