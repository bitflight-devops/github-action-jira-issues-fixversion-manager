/**
 * Test setup file for Vitest
 * This file runs before each test file
 */

// Set default environment variables for tests
process.env.JIRA_BASE_URL = process.env.JIRA_BASE_URL || 'https://mock.atlassian.net';
process.env.JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || 'mock-token';
process.env.JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL || 'mock@example.com';
