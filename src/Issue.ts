/* eslint-disable security/detect-unsafe-regex */
import * as core from '@actions/core'
import {IssueBean} from 'jira.js/out/version2/models'

import {Args, FixVersionObject} from './@types'
import Jira from './Jira'

export interface IssueOutput {
  issue: string
  availableFixVersions: string | undefined
  currentFixVersions: string | undefined
  beforeFixVersions: string | undefined
}
export default class Issue {
  issue: string
  projectName: string
  transitionNames: string[] = []
  transitionIds: string[] = []
  beforeVersions: string[] | undefined = undefined
  afterVersions: string[] | undefined = undefined
  jira: Jira
  issueObject: IssueBean | null = null
  fixVersions: string[]
  argv: Args

  constructor(issue: string, jira: Jira, argv: Args) {
    this.issue = issue
    const pMatch = issue.match(/(?<projectName>[a-zA-Z]{2,})-[0-9]{2,}/)
    this.projectName = pMatch?.groups?.projectName.toUpperCase() ?? ''
    this.jira = jira
    this.argv = argv
    this.fixVersions = argv.fixVersions
  }
  async build(): Promise<Issue> {
    await this.getJiraIssueObject()
    this.beforeVersions = await this.getIssueFixVersions()
    return this
  }

  async apply(): Promise<void> {
    if (this.fixVersions.length > 0) {
      core.info(
        `${this.beforeVersions ? 'Adding' : 'Updating'} FixVersions ${this.fixVersions.join(', ')} to Jira Issue Key ${
          this.issue
        }`
      )
      try {
        const currentIssueFixVersions = await this.getIssueFixVersions()
        const currentFixVersions = this.fixVersions?.filter(fV => {
          return !currentIssueFixVersions.includes(fV)
        })
        if (currentFixVersions.length === 0) {
          core.info(`${this.issue} already has the supplied fix versions of: ${currentIssueFixVersions.join(', ')}`)
          return
        }
        await this.jira.updateIssueFixVersions(this.issue, this.fixVersions)
        this.afterVersions = await this.getIssueFixVersions(true)
        core.info(
          `Changed ${this.issue} FixVersions from ${JSON.stringify(this.beforeVersions || [])} to ${JSON.stringify(
            this.afterVersions || []
          )}.`
        )
      } catch (error) {
        core.error(`Failed applying FixVersions for ${this.issue}`)
        if (this.argv.failOnError) {
          throw error
        } else {
          if (error?.response?.status) {
            core.error(`Response: ${error.response.status} ${error.response.statusText}`)
          } else {
            core.error(`Error keys: ${error.keys()}`)
            core.error(error.response || error.message || error)
          }
        }
      }
    } else {
      try {
        this.afterVersions = await this.getIssueFixVersions(true)
      } catch (error) {
        core.error(`Failed getting FixVersions for ${this.issue}`)
        if (this.argv.failOnError) {
          throw error
        } else {
          core.error(error)
        }
      }
    }
  }

  async getOutputs(): Promise<IssueOutput> {
    return {
      issue: this.issue,
      availableFixVersions: Array.from((await this.jira.getFixVersions(this.projectName)).keys()).join(','),
      currentFixVersions: this.afterVersions?.join(',') || (await this.getIssueFixVersions(true))?.join(','),
      beforeFixVersions: this.beforeVersions?.join(',')
    }
  }

  async getIssueFixVersions(fresh = false): Promise<string[]> {
    if (fresh || !this.issueObject) {
      await this.getJiraIssueObject()
    }
    if (!this.issueObject) {
      core.error(`Issue object can't be queried from Jira`)
      return [] as string[]
    }
    return (this.issueObject?.fields?.fixVersions as FixVersionObject[])?.map(v => {
      return v.name as string
    })
  }

  setIssue(issue: string): void {
    this.issue = issue
  }

  async getJiraIssueObject(): Promise<IssueBean> {
    // const issueObjectMeta = await this.jira.getIssueMetaData(this.issue)
    // core.debug(`Issue meta: ${JSON.stringify(issueObjectMeta)}`)

    this.issueObject = await this.jira.getIssue(this.issue, {fields: ['fixVersions']})
    return this.issueObject
  }
}

export type Issues = Issue[]
