/* eslint-disable @typescript-eslint/prefer-for-of */
import * as core from '@actions/core';
import { Context } from '@actions/github/lib/context';

import { Args } from './@types';
import Issue from './Issue';
import Jira from './Jira';
import { issueIdRegEx, nullIfEmpty } from './utils';

export const token = core.getInput('token') || process.env.GITHUB_TOKEN || 'NO_TOKEN';

export interface ProjectFilter {
  projectsIncluded?: string[] | null;
  projectsExcluded?: string[] | null;
}

export default class EventManager {
  context: Context;

  filter: ProjectFilter;

  jira: Jira;

  argv: Args;

  fixVersions: string[];

  failOnError = false;

  listenForEvents: string[] = [];

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

  isProjectOfIssueSelected(issueKey: string): boolean {
    const project = issueKey.split('-')[0];
    if (!project || project.length === 0) return false;
    if (this.filter.projectsExcluded && this.filter.projectsExcluded.includes(project.toUpperCase())) {
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

  async updateJiraFixVersion(): Promise<void[]> {
    const issues = this.getIssueSetFromString(this.argv.issues);
    const applyIssueList: Promise<void>[] = [];
    for (const issueKey of issues) {
      applyIssueList.push(new Issue(issueKey, this.jira, this.argv).build().then(async (issueObj) => issueObj.apply()));
    }
    return Promise.all(applyIssueList);
  }
}
