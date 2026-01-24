"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = void 0;
exports.getE2EConfig = getE2EConfig;
/**
 * Default configuration for local Jira Data Center E2E testing.
 *
 * Uses environment variables when available, falling back to sensible defaults
 * for local Docker-based testing.
 *
 * Environment variables:
 * - `E2E_JIRA_BASE_URL` - Jira base URL (default: 'http://localhost:8080')
 * - `E2E_JIRA_USERNAME` - Basic auth username (default: 'admin')
 * - `E2E_JIRA_PASSWORD` - Basic auth password (default: 'admin')
 *
 * @type {E2EConfig}
 */
exports.defaultConfig = {
    jira: {
        baseUrl: process.env.E2E_JIRA_BASE_URL || 'http://localhost:8080',
        auth: {
            type: 'basic',
            username: process.env.E2E_JIRA_USERNAME || 'admin',
            password: process.env.E2E_JIRA_PASSWORD || 'admin',
        },
    },
    test: {
        projectKey: 'E2E',
        projectName: 'E2E Project',
        initialVersion: '1.0.0',
        issueType: 'Task',
    },
    timeouts: {
        jiraReady: 600000, // 10 minutes for Jira to be ready (DC takes longer on first run)
        apiCall: 30000, // 30 seconds for individual API calls
        testTimeout: 60000, // 1 minute for individual tests
    },
};
/**
 * Get configuration for E2E tests.
 *
 * Returns a Jira Cloud configuration if `E2E_JIRA_EMAIL` and `E2E_JIRA_API_TOKEN`
 * environment variables are set; otherwise returns the default Data Center
 * configuration with basic authentication.
 *
 * @returns The E2E configuration object appropriate for the detected environment
 *
 * @example
 * // For Jira Data Center (default)
 * const config = getE2EConfig();
 * // config.jira.auth.type === 'basic'
 *
 * @example
 * // For Jira Cloud (set env vars first)
 * // E2E_JIRA_EMAIL=user@example.com
 * // E2E_JIRA_API_TOKEN=your-api-token
 * const config = getE2EConfig();
 * // config.jira.auth.type === 'cloud'
 */
function getE2EConfig() {
    // For future Cloud testing, check for Cloud-specific env vars
    if (process.env.E2E_JIRA_EMAIL && process.env.E2E_JIRA_API_TOKEN) {
        return {
            ...exports.defaultConfig,
            jira: {
                baseUrl: process.env.E2E_JIRA_BASE_URL || exports.defaultConfig.jira.baseUrl,
                auth: {
                    type: 'cloud',
                    email: process.env.E2E_JIRA_EMAIL,
                    apiToken: process.env.E2E_JIRA_API_TOKEN,
                },
            },
        };
    }
    return exports.defaultConfig;
}
