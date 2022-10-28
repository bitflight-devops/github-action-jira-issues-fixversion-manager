import * as core from '@actions/core';
import { Context } from '@actions/github/lib/context';

import { Args, JiraConfig } from './@types';
import EventManager from './EventManager';
import Jira from './Jira';
import { isError } from './utils';

export class Action {
  jira: Jira;

  config: JiraConfig;

  argv: Args;

  context: Context;

  eventManager: EventManager;

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
