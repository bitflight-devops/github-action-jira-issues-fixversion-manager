import * as core from '@actions/core';
import type { Version2Models } from 'jira.js';

import type { Args, FixVersionObject } from './@types';
import type Jira from './Jira';
import { isError, toCommaDelimitedString } from './utils';

/**
 * Output structure for issue operations.
 *
 * @remarks
 * This interface defines the shape of data returned by `Issue.getOutputs()`,
 * containing the issue key and various fixVersion states.
 */
export interface IssueOutput {
  /**
   * The Jira issue key (e.g., "PROJ-123").
   */
  issue: string;

  /**
   * Comma-separated list of all available fixVersions in the project.
   */
  availableFixVersions?: string;

  /**
   * Comma-separated list of fixVersions currently on the issue (after any updates).
   */
  currentFixVersions?: string;

  /**
   * Comma-separated list of fixVersions on the issue before any updates.
   */
  beforeFixVersions?: string;
}

/**
 * Represents a Jira issue and manages fixVersion operations on it.
 *
 * @remarks
 * This class encapsulates the state and operations for a single Jira issue.
 * It follows a builder pattern where `build()` must be called after construction
 * to fetch the issue data, and `apply()` is called to execute fixVersion updates.
 *
 * The class tracks both the "before" and "after" states of fixVersions to enable
 * reporting on what changed during the operation.
 *
 * @example
 * ```typescript
 * const jira = new Jira(config);
 * const issue = new Issue('PROJ-123', jira, args);
 *
 * // Build fetches the issue and captures initial state
 * await issue.build();
 *
 * // Apply updates the fixVersions on the issue
 * await issue.apply();
 *
 * // Get the output for reporting
 * const output = await issue.getOutputs();
 * console.log(output.currentFixVersions);
 * ```
 */
export default class Issue {
  /**
   * The Jira issue key (e.g., "PROJ-123").
   */
  issue: string;

  /**
   * The project key extracted from the issue key (e.g., "PROJ" from "PROJ-123").
   */
  projectName: string;

  /**
   * Names of available transitions (currently unused in fixVersion operations).
   */
  transitionNames: string[] = [];

  /**
   * IDs of available transitions (currently unused in fixVersion operations).
   */
  transitionIds: string[] = [];

  /**
   * The fixVersions on the issue before any updates were applied.
   */
  beforeVersions: string[] | undefined = undefined;

  /**
   * The fixVersions on the issue after updates were applied.
   */
  afterVersions: string[] | undefined = undefined;

  /**
   * Reference to the Jira client used for API operations.
   */
  jira: Jira;

  /**
   * The raw Jira issue object from the API.
   */
  issueObject: Version2Models.Issue | null = null;

  /**
   * The fixVersions to add to this issue.
   */
  fixVersions: string[];

  /**
   * The action arguments containing configuration and options.
   */
  argv: Args;

  /**
   * Creates a new Issue instance.
   *
   * @remarks
   * The constructor extracts the project key from the issue key using a regex pattern.
   * The pattern expects at least 2 letters followed by a hyphen and at least 2 digits.
   *
   * @param issue - The Jira issue key (e.g., "PROJ-123").
   * @param jira - The Jira client instance for API operations.
   * @param argv - The action arguments containing fixVersions and options.
   *
   * @example
   * ```typescript
   * const issue = new Issue('PROJ-123', jiraClient, {
   *   fixVersions: ['v1.0.0'],
   *   failOnError: true,
   *   // ... other args
   * });
   * ```
   */
  constructor(issue: string, jira: Jira, argv: Args) {
    this.issue = issue;
    const pMatch = issue.match(/(?<projectName>[A-Za-z]{2,})-\d{2,}/);
    this.projectName = pMatch?.groups?.projectName.toUpperCase() ?? '';
    this.jira = jira;
    this.argv = argv;
    this.fixVersions = argv.fixVersions;
  }

  /**
   * Initializes the issue by fetching data from Jira and capturing initial state.
   *
   * @remarks
   * This method must be called after construction and before `apply()`.
   * It fetches the issue object from Jira and records the current fixVersions
   * as `beforeVersions` for later comparison.
   *
   * @returns A promise that resolves to this Issue instance for method chaining.
   * @throws {Error} If the Jira API call fails.
   *
   * @example
   * ```typescript
   * const issue = new Issue('PROJ-123', jira, args);
   * await issue.build();
   * console.log(issue.beforeVersions); // Current fixVersions
   * ```
   */
  async build(): Promise<Issue> {
    await this.getJiraIssueObject();
    this.beforeVersions = await this.getIssueFixVersions();
    return this;
  }

  /**
   * Applies fixVersion updates to the Jira issue.
   *
   * @remarks
   * This method performs the following:
   * 1. Checks if there are fixVersions to add.
   * 2. Filters out versions already present on the issue.
   * 3. Updates the issue with new versions via the Jira API.
   * 4. Fetches the updated issue to capture the "after" state.
   *
   * Error handling behavior is controlled by `argv.failOnError`:
   * - If `true`, errors are thrown and propagate to the caller.
   * - If `false`, errors are logged but do not stop execution.
   *
   * @throws {Error} If the API call fails and `failOnError` is true.
   *
   * @example
   * ```typescript
   * const issue = await new Issue('PROJ-123', jira, args).build();
   * await issue.apply();
   * console.log(`Updated from ${issue.beforeVersions} to ${issue.afterVersions}`);
   * ```
   */
  async apply(): Promise<void> {
    if (this.fixVersions.length > 0) {
      core.info(
        `${this.beforeVersions ? 'Adding' : 'Updating'} FixVersions ${this.fixVersions.join(', ')} to Jira Issue Key ${
          this.issue
        }`,
      );
      try {
        const currentIssueFixVersions = await this.getIssueFixVersions();
        const currentFixVersions = this.fixVersions?.filter((fV) => {
          return !currentIssueFixVersions.includes(fV);
        });
        if (currentFixVersions.length === 0) {
          core.info(`${this.issue} already has the supplied fix versions of: ${currentIssueFixVersions.join(', ')}`);
          return;
        }
        await this.jira.updateIssueFixVersions(this.issue, this.fixVersions);
        this.afterVersions = await this.getIssueFixVersions(true);
        core.info(
          `Changed ${this.issue} FixVersions from ${JSON.stringify(
            this.beforeVersions || [],
          )} to ${JSON.stringify(this.afterVersions || [])}.`,
        );
      } catch (error) {
        core.error(`Failed applying FixVersions for ${this.issue}`);
        if (this.argv.failOnError) {
          throw error;
        } else if (isError(error)) {
          core.error(error);
        }
      }
    } else {
      try {
        this.afterVersions = await this.getIssueFixVersions(true);
      } catch (error) {
        core.error(`Failed getting FixVersions for ${this.issue}`);
        if (this.argv.failOnError) {
          throw error;
        } else if (isError(error)) {
          core.error(error);
        }
      }
    }
  }

  /**
   * Generates the output object for this issue operation.
   *
   * @remarks
   * The output includes:
   * - `issue`: The issue key.
   * - `availableFixVersions`: All versions available in the project.
   * - `currentFixVersions`: Versions on the issue after updates.
   * - `beforeFixVersions`: Versions on the issue before updates.
   *
   * @returns A promise that resolves to the IssueOutput object.
   * @throws {Error} If fetching project versions fails.
   *
   * @example
   * ```typescript
   * const issue = await new Issue('PROJ-123', jira, args).build();
   * await issue.apply();
   * const output = await issue.getOutputs();
   * console.log(JSON.stringify(output, null, 2));
   * // {
   * //   "issue": "PROJ-123",
   * //   "availableFixVersions": "v1.0.0,v1.1.0,v2.0.0",
   * //   "currentFixVersions": "v1.0.0,v1.1.0",
   * //   "beforeFixVersions": "v1.0.0"
   * // }
   * ```
   */
  async getOutputs(): Promise<IssueOutput> {
    const fixVersionsList = await this.jira
      .getFixVersions(this.projectName)
      .then((fixVersionsMap) => fixVersionsMap.keys());
    const currentFixVersions = toCommaDelimitedString(this.afterVersions ?? (await this.getIssueFixVersions(true)));

    return {
      issue: this.issue,
      availableFixVersions: toCommaDelimitedString(fixVersionsList),
      currentFixVersions,
      beforeFixVersions: toCommaDelimitedString(this.beforeVersions),
    };
  }

  /**
   * Retrieves the fixVersions currently assigned to this issue.
   *
   * @param fresh - If `true`, fetches fresh data from the API. If `false`,
   *                uses cached `issueObject` if available. Defaults to `false`.
   * @returns A promise that resolves to an array of version names.
   *
   * @example
   * ```typescript
   * // Use cached data
   * const versions = await issue.getIssueFixVersions();
   *
   * // Force fresh fetch from API
   * const freshVersions = await issue.getIssueFixVersions(true);
   * ```
   */
  async getIssueFixVersions(fresh = false): Promise<string[]> {
    if (fresh || !this.issueObject) {
      await this.getJiraIssueObject();
    }
    if (!this.issueObject) {
      core.error(`Issue object can't be queried from Jira`);
      return [] as string[];
    }
    return (this.issueObject?.fields?.fixVersions as FixVersionObject[])?.map((v) => {
      return v.name as string;
    });
  }

  /**
   * Updates the issue key for this instance.
   *
   * @remarks
   * Note: This method only updates the `issue` property. It does not update
   * `projectName` or refetch the issue data. Call `build()` again if you need
   * to reinitialize with the new issue.
   *
   * @param issue - The new Jira issue key (e.g., "PROJ-456").
   *
   * @example
   * ```typescript
   * issue.setIssue('PROJ-456');
   * await issue.build(); // Refetch with new issue key
   * ```
   */
  setIssue(issue: string): void {
    this.issue = issue;
  }

  /**
   * Fetches the Jira issue object from the API and caches it.
   *
   * @remarks
   * This method requests only the `fixVersions` field to minimize API response size.
   * The result is cached in `issueObject` for subsequent access.
   *
   * @returns A promise that resolves to the Jira issue object.
   * @throws {Error} If the issue does not exist or the API call fails.
   *
   * @example
   * ```typescript
   * const issueData = await issue.getJiraIssueObject();
   * console.log(issueData.fields.fixVersions);
   * ```
   */
  async getJiraIssueObject(): Promise<Version2Models.Issue> {
    // const issueObjectMeta = await this.jira.getIssueMetaData(this.issue)
    // core.debug(`Issue meta: ${JSON.stringify(issueObjectMeta)}`)

    this.issueObject = await this.jira.getIssue(this.issue, {
      fields: ['fixVersions'],
    });
    return this.issueObject;
  }
}

/**
 * Type alias for an array of Issue instances.
 *
 * @remarks
 * Used when processing multiple issues in batch operations.
 */
export type Issues = Issue[];
