export interface JiraConfig {
  baseUrl: string
  token: string
  email: string
  transitionId?: string
  project?: string
  issuetype?: string
  summary?: string
  description?: string
  issue?: string
}
export interface Args {
  token: string
  issues: string
  fixVersions: string[]
  projects?: string
  projectsIgnore?: string
  includeMergeMessages: boolean
  failOnError: boolean
  config: JiraAuthConfig
}

export interface JiraAuthConfig {
  baseUrl: string
  token: string
  email: string
}

export interface FixVersionObject {
  self?: string
  id?: string | number
  description?: string
  name?: string
  archived?: boolean
  released?: boolean
  releaseDate?: string
}
export interface FixVersion {
  add: FixVersionObject
}
export type FixVersions = FixVersion[]
