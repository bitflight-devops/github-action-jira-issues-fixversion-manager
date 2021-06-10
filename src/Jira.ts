import * as core from '@actions/core'
import {Version2Client} from 'jira.js'
import {IssueBean, PageBeanVersion} from 'jira.js/out/version2/models'
import {
  CreateVersion,
  EditIssue,
  GetEditIssueMeta,
  GetIssue,
  GetProject,
  GetProjectVersionsPaginated
} from 'jira.js/out/version2/parameters'

import {FixVersion, FixVersions, JiraConfig} from './@types'
import {formatDate} from './utils'

export default class Jira {
  baseUrl: string
  token: string
  email: string
  client: Version2Client
  projectKeyToId: Map<string, number>

  constructor(conf: JiraConfig) {
    this.baseUrl = conf.baseUrl
    this.token = conf.token
    this.email = conf.email
    this.projectKeyToId = new Map<string, number>()
    this.client = new Version2Client({
      host: this.baseUrl,
      telemetry: false,
      authentication: {
        basic: {
          // username: this.email,
          // password: this.token
          email: this.email,
          apiToken: this.token
        }
      }
    })
  }

  async getIssue(
    issueId: string,
    query?: {
      fields?: string[]
      expand?: string
    }
  ): Promise<IssueBean> {
    const params: GetIssue = {
      issueIdOrKey: issueId
    }
    if (query) {
      params.fields = query.fields || []
      params.expand = query.expand || undefined
    }

    return this.client.issues.getIssue(params)
  }

  async getIssueMetaData(issueId: string): Promise<object> {
    const params: GetEditIssueMeta = {
      issueIdOrKey: issueId
    }
    return this.client.issues.getEditIssueMeta(params)
  }

  async hasFixVersion(projectIdOrKey: string, fixVersion: string): Promise<boolean> {
    let params: GetProjectVersionsPaginated = {
      projectIdOrKey: projectIdOrKey,
      status: 'released,unreleased',
      orderBy: 'sequence',
      query: fixVersion,
      startAt: -1,
      maxResults: 100
    }
    core.debug(`Checking if Jira already has version '${fixVersion}'`)

    let getNextPage = true
    let pageBeanVersion: PageBeanVersion
    while (getNextPage === true) {
      pageBeanVersion = await this.client.projectVersions.getProjectVersionsPaginated(params)
      if (
        pageBeanVersion.total != undefined &&
        params.startAt != undefined &&
        pageBeanVersion.maxResults != undefined
      ) {
        params.startAt = params.startAt + Math.min(pageBeanVersion.total, pageBeanVersion.maxResults)
        if (pageBeanVersion.values) {
          for (const version of pageBeanVersion.values) {
            core.debug(`Comparing Jira version '${version.name}' to '${fixVersion}'`)
            if (version.name) {
              if (version.name.toUpperCase() === fixVersion.toUpperCase()) {
                core.debug(`Jira already has version '${version.name}'`)
                return true
              }
            }
          }
        }
      }
      getNextPage = pageBeanVersion && !pageBeanVersion.isLast
    }
    core.debug(`Jira does not have version '${fixVersion}'`)
    return false
  }

  async getProjectByKey(key: string): Promise<number | undefined> {
    if (this.projectKeyToId.has(key)) {
      return this.projectKeyToId.get(key)
    }
    let params: GetProject = {
      projectIdOrKey: key,
      properties: ['id']
    }
    try {
      const result = await this.client.projects.getProject(params)
      if (result.key && result.id) {
        const id = Number.parseInt(result.id)
        this.projectKeyToId.set(result.key, id)
        return id
      } else {
        throw new Error('Project not found')
      }
    } catch (err) {
      core.error('Project ID lookup errored')
      throw err
    }
  }

  async createFixVersion(projectId: number, fixVersion: string): Promise<boolean> {
    let params: CreateVersion = {
      name: fixVersion,
      description: `${fixVersion} (via GitHub)`,
      archived: false,
      released: false,
      startDate: formatDate(Date.now()),
      projectId: projectId
    }
    try {
      core.info(`Creating new FixVersion: ${fixVersion}`)
      const result = await this.client.projectVersions.createVersion(params)
      core.debug(`Result of createVersion: ${JSON.stringify(result)}`)
    } catch (err) {
      core.error(`Failed creating new FixVersion: ${fixVersion}`)
      throw err
    }
    return true
  }

  async getFixVersions(projectIdOrKey: string): Promise<Map<string, string>> {
    let params: GetProjectVersionsPaginated = {
      projectIdOrKey: projectIdOrKey,
      status: 'released,unreleased',
      orderBy: 'sequence',
      startAt: 0,
      maxResults: 100
    }

    const logMsg: string[] = []
    const versionsAvailable = new Map<string, string>()
    let getNextPage = true
    let pageBeanVersion: PageBeanVersion
    while (getNextPage === true) {
      pageBeanVersion = await this.client.projectVersions.getProjectVersionsPaginated(params)
      core.debug(
        `StartAt:${pageBeanVersion.startAt}, Total: ${pageBeanVersion.total}, Max: ${pageBeanVersion.maxResults}`
      )
      if (
        pageBeanVersion.total != undefined &&
        params.startAt != undefined &&
        pageBeanVersion.maxResults != undefined
      ) {
        params.startAt = params.startAt + Math.min(pageBeanVersion.total, pageBeanVersion.maxResults)
        if (pageBeanVersion.values) {
          for (const version of pageBeanVersion.values) {
            logMsg.push(
              `Project ${projectIdOrKey} includes version ${version.name} [Start: ${version.startDate}, Release: ${version.releaseDate}, ID: ${version.id}]`
            )
            if (version.name && version.id) {
              versionsAvailable.set(version.name, version.id)
            }
          }
        }
      } else {
        break
      }
      getNextPage = pageBeanVersion && !pageBeanVersion.isLast
    }
    core.debug(logMsg.join('\n'))
    return versionsAvailable
  }

  async updateIssueFixVersions(issueIdOrKey: string, fixVersions: string[]): Promise<object> {
    const project = issueIdOrKey.split('-')[0].toUpperCase()
    for (const fV of fixVersions) {
      const needsCreation = !(await this.hasFixVersion(project, fV))
      if (needsCreation) {
        const id = await this.getProjectByKey(project)
        if (id) {
          await this.createFixVersion(id, fV)
        }
      }
    }
    let update: FixVersions = []
    for (const fV of fixVersions) {
      const fixedVersion: FixVersion = {
        add: {name: fV}
      }
      update.push(fixedVersion)
    }

    const params: EditIssue = {
      issueIdOrKey: issueIdOrKey,
      update: {
        fixVersions: update
      }
    }
    return this.client.issues.editIssue(params)
  }
}
