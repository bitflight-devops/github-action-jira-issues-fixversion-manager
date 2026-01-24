import * as core from '@actions/core';
import type { Context } from '@actions/github/lib/context';

import type { Args, JiraConfig } from './@types';
import EventManager from './EventManager';
import Jira from './Jira';
import { isError } from './utils';

/**
 * Entry point for the GitHub Action that manages Jira issue fixVersions.
 *
 * @remarks
 * This class coordinates the fixVersion update workflow by initializing the Jira
 * client, parsing configuration, and delegating to the EventManager for issue
 * processing. It serves as the main orchestrator for the action's execution.
 *
 * @example
 * ```typescript
 * import { Action } from './action';
 * import { context } from '@actions/github';
 *
 * const argv: Args = {
 *   token: 'github-token',
 *   issues: 'PROJ-123,PROJ-456',
 *   fixVersions: ['1.0.0', '1.1.0'],
 *   failOnError: false,
 *   includeMergeMessages: true,
 *   config: {
 *     baseUrl: 'https://company.atlassian.net',
 *     token: 'jira-api-token',
 *     email: 'user@example.com',
 *   },
 * };
 *
 * const action = new Action(context, argv);
 * await action.execute();
 * ```
 */
export class Action {
  /**
   * The Jira client instance used for API interactions.
   */
  jira: Jira;

  /**
   * The Jira authentication configuration.
   */
  config: JiraConfig;

  /**
   * The parsed command-line arguments and configuration options.
   */
  argv: Args;

  /**
   * The GitHub Actions context containing event and repository information.
   */
  context: Context;

  /**
   * The event manager responsible for processing issues and applying fixVersions.
   */
  eventManager: EventManager;

  /**
   * Creates a new Action instance.
   *
   * @param context - The GitHub Actions context providing event and repository metadata.
   * @param argv - The parsed arguments containing Jira configuration, issue keys,
   *               and fixVersion settings.
   *
   * @remarks
   * The constructor initializes the Jira client with authentication credentials
   * from the provided arguments and creates an EventManager for processing issues.
   */
  constructor(context: Context, argv: Args) {
    this.jira = new Jira({
      baseUrl: argv.config.baseUrl,
      token: argv.config.token,
      email: argv.config.email,
    });

    this.config = argv.config;
    this.argv = argv;
    this.context = context;
    this.eventManager = new EventManager(context, this.jira, argv);
  }

  /**
   * Executes the GitHub Action workflow.
   *
   * @returns A promise that resolves to `true` when all issues have been
   *          successfully updated with the specified fixVersions.
   *
   * @throws {Error} Re-throws any error encountered during execution after
   *                 logging it via `core.error`. This includes Jira API errors,
   *                 authentication failures, and issue update failures.
   *
   * @remarks
   * This method delegates the actual work to {@link EventManager.updateJiraFixVersion}.
   * Debug messages are logged at the start and completion of execution.
   * If an error occurs, it is logged and re-thrown to allow the GitHub Action
   * to fail with the appropriate exit code.
   */
  async execute(): Promise<boolean> {
    try {
      core.debug('Executing action: started');
      await this.eventManager.updateJiraFixVersion();
      core.debug('Executing action: complete');
      return true;
    } catch (error) {
      if (isError(error)) {
        core.error(error);
      }
      throw error;
    }
  }
}
