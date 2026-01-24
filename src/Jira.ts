import * as core from '@actions/core';
import { Version2Client, type Version2Models, type Version2Parameters } from 'jira.js';

import type { FixVersions, JiraConfig } from './@types';
import { formatDate } from './utils';

/**
 * Jira API client wrapper for managing fixVersion operations.
 *
 * @remarks
 * This class wraps the `jira.js` Version2Client and provides simplified methods
 * for common fixVersion operations in Jira Cloud. It handles authentication,
 * caches project key-to-ID mappings, and provides high-level methods for
 * version management.
 *
 * @example
 * ```typescript
 * const jira = new Jira({
 *   baseUrl: 'https://company.atlassian.net',
 *   email: 'user@company.com',
 *   token: 'api-token'
 * });
 *
 * // Get an issue
 * const issue = await jira.getIssue('PROJ-123');
 *
 * // Update fixVersions on an issue
 * await jira.updateIssueFixVersions('PROJ-123', ['v1.0.0', 'v1.1.0']);
 * ```
 */
export default class Jira {
  /**
   * The base URL of the Jira instance.
   *
   * @example 'https://company.atlassian.net'
   */
  baseUrl: string;

  /**
   * The API token used for authentication.
   */
  token: string;

  /**
   * The email address associated with the API token for basic authentication.
   */
  email: string;

  /**
   * The underlying jira.js Version2Client instance.
   */
  client: Version2Client;

  /**
   * Cache mapping project keys to their numeric IDs to reduce API calls.
   */
  projectKeyToId: Map<string, number>;

  /**
   * Creates a new Jira client instance.
   *
   * @param conf - Configuration object containing Jira connection details.
   * @param conf.baseUrl - The base URL of the Jira instance (e.g., 'https://company.atlassian.net').
   * @param conf.email - The email address for basic authentication.
   * @param conf.token - The API token for basic authentication.
   *
   * @example
   * ```typescript
   * const jira = new Jira({
   *   baseUrl: 'https://company.atlassian.net',
   *   email: 'user@company.com',
   *   token: 'your-api-token'
   * });
   * ```
   */
  constructor(conf: JiraConfig) {
    this.baseUrl = conf.baseUrl;
    this.token = conf.token;
    this.email = conf.email;
    this.projectKeyToId = new Map<string, number>();
    this.client = new Version2Client({
      host: this.baseUrl,
      authentication: {
        basic: {
          email: this.email,
          apiToken: this.token,
        },
      },
    });
  }

  /**
   * Retrieves a Jira issue by its ID or key.
   *
   * @param issueId - The issue ID or key (e.g., "PROJ-123" or "10001").
   * @param query - Optional query parameters to customize the response.
   * @param query.fields - Array of field names to include in the response.
   * @param query.expand - Comma-separated list of entities to expand.
   * @returns A promise that resolves to the Issue object from the Jira API.
   * @throws {Error} If the issue does not exist or the API call fails.
   *
   * @example
   * ```typescript
   * // Get issue with specific fields
   * const issue = await jira.getIssue('PROJ-123', {
   *   fields: ['fixVersions', 'summary', 'status']
   * });
   *
   * // Get issue with expanded data
   * const issue = await jira.getIssue('PROJ-123', {
   *   expand: 'changelog,renderedFields'
   * });
   * ```
   */
  async getIssue(
    issueId: string,
    query?: {
      fields?: string[];
      expand?: string;
    },
  ): Promise<Version2Models.Issue> {
    const params: Version2Parameters.GetIssue = {
      issueIdOrKey: issueId,
    };
    if (query) {
      params.fields = query.fields || [];
      params.expand = query.expand || undefined;
    }

    return this.client.issues.getIssue(params);
  }

  /**
   * Retrieves the edit metadata for a Jira issue.
   *
   * @remarks
   * The edit metadata describes which fields can be edited on the issue
   * and what values are allowed for those fields.
   *
   * @param issueId - The issue ID or key (e.g., "PROJ-123").
   * @returns A promise that resolves to the edit metadata object.
   * @throws {Error} If the issue does not exist or the API call fails.
   *
   * @example
   * ```typescript
   * const metadata = await jira.getIssueMetaData('PROJ-123');
   * console.log(metadata.fields); // Available editable fields
   * ```
   */
  async getIssueMetaData(issueId: string): Promise<object> {
    const params: Version2Parameters.GetEditIssueMeta = {
      issueIdOrKey: issueId,
    };
    return this.client.issues.getEditIssueMeta(params);
  }

  /**
   * Checks which fixVersions from a list already exist in a project.
   *
   * @remarks
   * Performs case-insensitive comparison of version names. Version names
   * are converted to uppercase for comparison.
   *
   * @param projectIdOrKey - The project ID or key (e.g., "PROJ" or "10001").
   * @param fixVersions - A comma-separated string or array of version names to check.
   * @returns A promise that resolves to an array of version names that exist
   *          in the project (in uppercase).
   * @throws {Error} If the project does not exist or the API call fails.
   *
   * @example
   * ```typescript
   * // Check with array
   * const existing = await jira.projectHasFixVersionsFromList('PROJ', ['v1.0.0', 'v2.0.0']);
   * // Returns: ['V1.0.0'] if only v1.0.0 exists
   *
   * // Check with comma-separated string
   * const existing = await jira.projectHasFixVersionsFromList('PROJ', 'v1.0.0,v2.0.0');
   * ```
   */
  async projectHasFixVersionsFromList(projectIdOrKey: string, fixVersions: string | string[]): Promise<string[]> {
    const params: Version2Parameters.GetProjectVersions = {
      projectIdOrKey,
    };
    const fixVersionsArray = Array.isArray(fixVersions) ? fixVersions : fixVersions.toUpperCase().split(',');
    const fixVersionsExisting: string[] = [];
    core.debug(`Checking if Jira already has versions '${fixVersions}'`);

    const pageVersion: Version2Models.PageVersion = await this.client.projectVersions.getProjectVersions(params);

    if (pageVersion?.values && pageVersion.values.length > 0) {
      for (const versionData of pageVersion.values) {
        if (versionData.name) {
          const versionNameUppercase: string = (versionData.name || '').toUpperCase();
          core.debug(`Comparing Jira version '${versionData.name}' to '${fixVersionsArray.join(',')}'`);
          if (fixVersionsArray.some((e) => e.toUpperCase() === versionNameUppercase)) {
            core.debug(`Jira already has versionData '${versionNameUppercase}'`);
            fixVersionsExisting.push(versionNameUppercase);
          }
        }
      }
    }
    if (fixVersionsExisting.length > 0) {
      core.debug(`Jira already has versions '${fixVersionsExisting.join(',')}'`);
    } else {
      core.debug(`Jira does not have version '${fixVersionsArray.join(',')}'`);
    }
    return fixVersionsExisting;
  }

  /**
   * Retrieves the numeric project ID for a given project key.
   *
   * @remarks
   * Results are cached in the `projectKeyToId` map to minimize API calls.
   * Subsequent calls with the same key will return the cached value.
   *
   * @param key - The project key (e.g., "PROJ").
   * @returns A promise that resolves to the numeric project ID, or undefined
   *          if the project cannot be found.
   * @throws {Error} If the API call fails or the project cannot be retrieved.
   *
   * @example
   * ```typescript
   * const projectId = await jira.getProjectByKey('PROJ');
   * console.log(projectId); // 10001
   * ```
   */
  async getProjectByKey(key: string): Promise<number | undefined> {
    if (this.projectKeyToId.has(key)) {
      return this.projectKeyToId.get(key);
    }
    const params: Version2Parameters.GetProject = {
      projectIdOrKey: key,
      properties: ['id'],
    };
    try {
      const result = await this.client.projects.getProject(params);
      if (result.key && result.id) {
        const id = Number.parseInt(result.id, 10);
        this.projectKeyToId.set(result.key, id);
        return id;
      }
      throw new Error('Project not found');
    } catch (error) {
      core.error('Project ID lookup errored');
      throw error;
    }
  }

  /**
   * Creates a new fixVersion in a project.
   *
   * @remarks
   * The version is created with a description indicating it was created via GitHub,
   * with the current date as the start date. The version is created as unreleased
   * and unarchived.
   *
   * @param projectId - The numeric project ID.
   * @param fixVersion - The name of the version to create.
   * @returns A promise that resolves to `true` if the version was created successfully.
   * @throws {Error} If the version creation fails.
   *
   * @example
   * ```typescript
   * const projectId = await jira.getProjectByKey('PROJ');
   * await jira.createFixVersion(projectId, 'v1.2.0');
   * ```
   */
  async createFixVersion(projectId: number, fixVersion: string): Promise<boolean> {
    const params: Version2Parameters.CreateVersion = {
      name: fixVersion,
      description: `${fixVersion} (via GitHub)`,
      archived: false,
      released: false,
      startDate: formatDate(Date.now()),
      projectId,
    };
    try {
      core.info(`Creating new FixVersion: ${fixVersion}`);
      const result = await this.client.projectVersions.createVersion(params);
      core.debug(`Result of createVersion: ${JSON.stringify(result)}`);
    } catch (error) {
      core.error(`Failed creating new FixVersion: ${fixVersion}`);
      throw error;
    }
    return true;
  }

  /**
   * Retrieves all fixVersions for a project.
   *
   * @param projectIdOrKey - The project ID or key (e.g., "PROJ" or "10001").
   * @returns A promise that resolves to a Map of version names to version IDs.
   * @throws {Error} If the project does not exist or the API call fails.
   *
   * @example
   * ```typescript
   * const versions = await jira.getFixVersions('PROJ');
   * // Returns: Map { 'v1.0.0' => '10001', 'v1.1.0' => '10002' }
   *
   * for (const [name, id] of versions) {
   *   console.log(`Version: ${name}, ID: ${id}`);
   * }
   * ```
   */
  async getFixVersions(projectIdOrKey: string): Promise<Map<string, string>> {
    const params: Version2Parameters.GetProjectVersions = {
      projectIdOrKey,
    };

    const logMsg: string[] = [];
    const versionsAvailable = new Map<string, string>();
    const pageVersion: Version2Models.PageVersion = await this.client.projectVersions.getProjectVersions(params);

    if (pageVersion.values && pageVersion.values.length > 0) {
      for (const version of pageVersion.values) {
        logMsg.push(
          `Project ${projectIdOrKey} includes version ${version.name} [Start: ${version.startDate}, Release: ${version.releaseDate}, ID: ${version.id}]`,
        );
        if (version.name && version.id) {
          versionsAvailable.set(version.name, version.id);
        }
      }
    }

    core.debug(logMsg.join('\n'));
    return versionsAvailable;
  }

  /**
   * Updates the fixVersions on a Jira issue.
   *
   * @remarks
   * This method performs the following operations:
   * 1. Extracts the project key from the issue key.
   * 2. Checks which versions already exist in the project.
   * 3. Creates any missing versions in parallel.
   * 4. Adds all specified versions to the issue.
   *
   * Note: This method adds versions to the issue; it does not replace existing versions.
   *
   * @param issueIdOrKey - The issue ID or key (e.g., "PROJ-123").
   * @param fixVersions - Array of version names to add to the issue.
   * @returns A promise that resolves to the API response object.
   * @throws {Error} If the project is not found or the API call fails.
   *
   * @example
   * ```typescript
   * // Add multiple fixVersions to an issue
   * await jira.updateIssueFixVersions('PROJ-123', ['v1.0.0', 'v1.1.0']);
   *
   * // The versions will be created if they don't exist
   * await jira.updateIssueFixVersions('PROJ-456', ['v2.0.0-beta']);
   * ```
   */
  async updateIssueFixVersions(issueIdOrKey: string, fixVersions: string[]): Promise<object> {
    const project = issueIdOrKey.split('-')[0].toUpperCase();
    const existingVersions = await this.projectHasFixVersionsFromList(project, fixVersions);
    const versionsToCreate = fixVersions.filter((e) => !existingVersions.includes(e.toUpperCase()));
    const id = await this.getProjectByKey(project);
    if (!id) {
      throw new Error(`Project ${project} not found`);
    }
    if (versionsToCreate.length > 0 && id) {
      const promArray: Promise<boolean>[] = versionsToCreate.map(async (fV) => this.createFixVersion(id, fV));
      await Promise.all(promArray);
    }

    const update: FixVersions = fixVersions.map((fV) => {
      return { add: { name: fV } };
    });

    return this.client.issues.editIssue({
      issueIdOrKey,
      update: {
        fixVersions: update,
      },
    });
  }
}
