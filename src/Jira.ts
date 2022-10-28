import * as core from '@actions/core';
import { Version2Client } from 'jira.js';
import { Issue as JiraIssue, PageVersion } from 'jira.js/out/version2/models';
import {
  CreateVersion,
  GetEditIssueMeta,
  GetIssue,
  GetProject,
  GetProjectVersions,
} from 'jira.js/out/version2/parameters';

import { FixVersions, JiraConfig } from './@types';
import { formatDate } from './utils';

export default class Jira {
  baseUrl: string;

  token: string;

  email: string;

  client: Version2Client;

  projectKeyToId: Map<string, number>;

  constructor(conf: JiraConfig) {
    this.baseUrl = conf.baseUrl;
    this.token = conf.token;
    this.email = conf.email;
    this.projectKeyToId = new Map<string, number>();
    this.client = new Version2Client({
      host: this.baseUrl,
      telemetry: false,
      authentication: {
        basic: {
          // username: this.email,
          // password: this.token
          email: this.email,
          apiToken: this.token,
        },
      },
    });
  }

  async getIssue(
    issueId: string,
    query?: {
      fields?: string[];
      expand?: string;
    },
  ): Promise<JiraIssue> {
    const params: GetIssue = {
      issueIdOrKey: issueId,
    };
    if (query) {
      params.fields = query.fields || [];
      params.expand = query.expand || undefined;
    }

    return this.client.issues.getIssue(params);
  }

  async getIssueMetaData(issueId: string): Promise<object> {
    const params: GetEditIssueMeta = {
      issueIdOrKey: issueId,
    };
    return this.client.issues.getEditIssueMeta(params);
  }

  async projectHasFixVersionsFromList(projectIdOrKey: string, fixVersions: string | string[]): Promise<string[]> {
    const params: GetProjectVersions = {
      projectIdOrKey,
    };
    const fixVersionsArray = Array.isArray(fixVersions) ? fixVersions : fixVersions.toUpperCase().split(',');
    const fixVersionsExisting: string[] = [];
    core.debug(`Checking if Jira already has versions '${fixVersions}'`);

    const pageVersion: PageVersion = await this.client.projectVersions.getProjectVersions(params);

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

  async getProjectByKey(key: string): Promise<number | undefined> {
    if (this.projectKeyToId.has(key)) {
      return this.projectKeyToId.get(key);
    }
    const params: GetProject = {
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

  async createFixVersion(projectId: number, fixVersion: string): Promise<boolean> {
    const params: CreateVersion = {
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

  async getFixVersions(projectIdOrKey: string): Promise<Map<string, string>> {
    const params: GetProjectVersions = {
      projectIdOrKey,
    };

    const logMsg: string[] = [];
    const versionsAvailable = new Map<string, string>();
    const pageVersion: PageVersion = await this.client.projectVersions.getProjectVersions(params);

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
