/* eslint-disable @typescript-eslint/prefer-for-of */
import * as core from '@actions/core';
import type { Context } from '@actions/github/lib/context';

import type { Args } from './@types';
import Issue from './Issue';
import type Jira from './Jira';
import { issueIdRegEx, nullIfEmpty } from './utils';

/**
 * GitHub token used for API authentication.
 *
 * @remarks
 * Resolution order: GitHub Actions input 'token' > GITHUB_TOKEN environment
 * variable > fallback string 'NO_TOKEN'.
 */
export const token = core.getInput('token') || process.env.GITHUB_TOKEN || 'NO_TOKEN';

/**
 * Configuration for filtering Jira projects during issue processing.
 *
 * @remarks
 * When both `projectsIncluded` and `projectsExcluded` are specified,
 * exclusions take precedence over inclusions.
 */
export interface ProjectFilter {
  /**
   * List of project keys to include. If null or empty, all projects
   * are included by default.
   */
  projectsIncluded?: string[] | null;
  /**
   * List of project keys to exclude. These take precedence over inclusions.
   */
  projectsExcluded?: string[] | null;
}

/**
 * Manages the processing of GitHub events and coordinates Jira fixVersion updates.
 *
 * @remarks
 * This class is responsible for:
 * - Parsing issue keys from input strings
 * - Filtering issues based on project inclusion/exclusion rules
 * - Orchestrating parallel fixVersion updates across multiple issues
 *
 * The EventManager acts as the primary coordinator between the Action entry
 * point and individual Issue objects, handling the bulk processing logic.
 *
 * @example
 * ```typescript
 * import EventManager from './EventManager';
 * import Jira from './Jira';
 * import { context } from '@actions/github';
 *
 * const jira = new Jira({ baseUrl, token, email });
 * const argv: Args = {
 *   token: 'github-token',
 *   issues: 'PROJ-123,PROJ-456,OTHER-789',
 *   fixVersions: ['1.0.0'],
 *   projects: 'PROJ',  // Only process PROJ issues
 *   failOnError: false,
 *   includeMergeMessages: true,
 *   config: { baseUrl, token, email },
 * };
 *
 * const manager = new EventManager(context, jira, argv);
 * await manager.updateJiraFixVersion();
 * // Only PROJ-123 and PROJ-456 are updated; OTHER-789 is filtered out
 * ```
 */
export default class EventManager {
  /**
   * The GitHub Actions context containing event and repository information.
   */
  context: Context;

  /**
   * Project filter configuration for including/excluding specific Jira projects.
   */
  filter: ProjectFilter;

  /**
   * The Jira client instance used for API interactions.
   */
  jira: Jira;

  /**
   * The parsed command-line arguments and configuration options.
   */
  argv: Args;

  /**
   * Array of fixVersion names to apply to issues.
   */
  fixVersions: string[];

  /**
   * Whether to throw errors or continue processing on failure.
   * @defaultValue false
   */
  failOnError = false;

  /**
   * List of GitHub event types to listen for.
   * @remarks Currently unused but reserved for future event filtering.
   */
  listenForEvents: string[] = [];

  /**
   * Creates a new EventManager instance.
   *
   * @param context - The GitHub Actions context providing event and repository metadata.
   * @param jira - The initialized Jira client for API interactions.
   * @param argv - The parsed arguments containing issue keys, fixVersions,
   *               and project filter settings.
   *
   * @remarks
   * The constructor initializes project filters by parsing comma-separated
   * project keys from `argv.projects` (include list) and `argv.projectsIgnore`
   * (exclude list). All project keys are normalized to uppercase for
   * case-insensitive matching.
   */
  constructor(context: Context, jira: Jira, argv: Args) {
    this.jira = jira;
    this.context = context;
    this.failOnError = argv.failOnError;
    this.fixVersions = argv.fixVersions;
    this.argv = argv;
    this.filter = {
      projectsIncluded: nullIfEmpty(argv.projects?.split(',').map((i) => i.trim().toUpperCase())),
      projectsExcluded: nullIfEmpty(argv.projectsIgnore?.split(',').map((i) => i.trim().toUpperCase())),
    };
  }

  /**
   * Determines whether an issue should be processed based on project filters.
   *
   * @param issueKey - The Jira issue key (e.g., 'PROJ-123').
   * @returns `true` if the issue's project passes the filter criteria;
   *          `false` if it should be skipped.
   *
   * @remarks
   * Filter evaluation order:
   * 1. If the issue key has no valid project prefix, return `false`
   * 2. If the project is in the exclusion list, return `false`
   * 3. If no inclusion list is defined, return `true` (all projects allowed)
   * 4. If the project is in the inclusion list, return `true`
   * 5. Otherwise, return `false`
   *
   * Debug messages are logged for each filtering decision.
   *
   * @example
   * ```typescript
   * // With filter: { projectsIncluded: ['PROJ'], projectsExcluded: ['TEST'] }
   * manager.isProjectOfIssueSelected('PROJ-123'); // true
   * manager.isProjectOfIssueSelected('TEST-456'); // false (excluded)
   * manager.isProjectOfIssueSelected('OTHER-789'); // false (not in include list)
   * ```
   */
  isProjectOfIssueSelected(issueKey: string): boolean {
    const project = issueKey.split('-')[0];
    if (!project || project.length === 0) return false;
    if (this.filter.projectsExcluded?.includes(project.toUpperCase())) {
      core.debug(`${issueKey} is excluded because of a specific project filter exclusion`);
      return false;
    }
    if (!this.filter.projectsIncluded || this.filter.projectsIncluded.length === 0) {
      core.debug(`${issueKey} is included because there is no specific project filter`);
      return true;
    }
    if (this.filter.projectsIncluded.includes(project.trim().toUpperCase())) {
      core.debug(`${issueKey} is included because there its part of the specific project filter`);
      return true;
    }
    core.debug(`${issueKey} is excluded because it doesn't belong to the included projects`);
    return false;
  }

  /**
   * Extracts Jira issue keys from a string and returns a filtered set.
   *
   * @param str - The input string containing potential issue keys
   *              (e.g., 'PROJ-123, PROJ-456 and TEST-789').
   * @param _set - Optional existing set to add issues to. If not provided,
   *               a new Set is created.
   * @returns A Set of unique issue keys that match the issue key pattern
   *          and pass project filtering.
   *
   * @remarks
   * Issue keys are extracted using the `issueIdRegEx` pattern, which matches
   * strings like 'ABC-123'. Each matched key is then validated against
   * project filters via {@link isProjectOfIssueSelected}.
   *
   * The method is idempotent when called with the same `_set` parameter,
   * as Sets automatically deduplicate entries.
   *
   * @example
   * ```typescript
   * const manager = new EventManager(context, jira, argv);
   *
   * // Extract from comma-separated string
   * const issues = manager.getIssueSetFromString('PROJ-123, PROJ-456');
   * // Returns: Set { 'PROJ-123', 'PROJ-456' }
   *
   * // Extract from natural text
   * const issues2 = manager.getIssueSetFromString('Fixed PROJ-123 and PROJ-456');
   * // Returns: Set { 'PROJ-123', 'PROJ-456' }
   *
   * // Accumulate across multiple strings
   * const set = new Set<string>();
   * manager.getIssueSetFromString('PROJ-123', set);
   * manager.getIssueSetFromString('PROJ-456', set);
   * // set now contains: Set { 'PROJ-123', 'PROJ-456' }
   * ```
   */
  getIssueSetFromString(str: string, _set?: Set<string>): Set<string> {
    const set = _set || new Set<string>();
    if (str) {
      const match = str.match(issueIdRegEx);

      if (match) {
        for (const issueKey of match) {
          if (this.isProjectOfIssueSelected(issueKey)) {
            core.debug(`${issueKey} is added to set`);
            set.add(issueKey);
          }
        }
      }
    }
    return set;
  }

  /**
   * Updates fixVersions for all matched Jira issues in parallel.
   *
   * @returns A promise that resolves to an array of void values when all
   *          issue updates complete.
   *
   * @throws {Error} Propagates errors from individual issue updates only if
   *                 `failOnError` is `true`. Otherwise, errors are logged
   *                 but processing continues for remaining issues.
   *
   * @remarks
   * This method:
   * 1. Parses issue keys from `argv.issues` using {@link getIssueSetFromString}
   * 2. Creates an {@link Issue} object for each matched key
   * 3. Calls `build()` to fetch current issue state from Jira
   * 4. Calls `apply()` to update fixVersions
   * 5. Executes all updates in parallel using `Promise.all()`
   *
   * **Side Effects:**
   * - Modifies Jira issues by adding the specified fixVersions
   * - Logs info/error messages via `@actions/core`
   *
   * @example
   * ```typescript
   * const manager = new EventManager(context, jira, {
   *   issues: 'PROJ-123, PROJ-456',
   *   fixVersions: ['1.0.0', '1.1.0'],
   *   failOnError: false,
   *   // ... other args
   * });
   *
   * // Updates both issues with fixVersions 1.0.0 and 1.1.0
   * await manager.updateJiraFixVersion();
   * ```
   */
  async updateJiraFixVersion(): Promise<void[]> {
    const issues = this.getIssueSetFromString(this.argv.issues);
    const applyIssueList: Promise<void>[] = [];
    for (const issueKey of issues) {
      applyIssueList.push(
        new Issue(issueKey, this.jira, this.argv).build().then(async (issueObj) => {
          await issueObj.apply();
        }),
      );
    }
    return Promise.all(applyIssueList);
  }
}
