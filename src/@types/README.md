# Type Definitions

This directory contains TypeScript type declarations used throughout the GitHub Action.

## File: index.d.ts

### Interfaces

#### JiraConfig

Configuration object for Jira API connection with optional fields for issue operations.

```typescript
interface JiraConfig {
  baseUrl: string; // Jira instance URL (e.g., 'https://company.atlassian.net')
  token: string; // Jira API token
  email: string; // Jira user email
  transitionId?: string; // Optional: ID for status transitions
  project?: string; // Optional: Default project key
  issuetype?: string; // Optional: Default issue type
  summary?: string; // Optional: Issue summary
  description?: string; // Optional: Issue description
  issue?: string; // Optional: Issue key
}
```

**Used by**: `Jira.ts` constructor

#### JiraAuthConfig

Minimal authentication configuration for Jira API.

```typescript
interface JiraAuthConfig {
  baseUrl: string; // Jira instance URL
  token: string; // Jira API token
  email: string; // Jira user email
}
```

**Used by**: `input-helper.ts`, `action.ts`

#### Args

Action input arguments parsed from GitHub Action inputs.

```typescript
interface Args {
  token: string; // GitHub token
  issues: string; // Comma-separated Jira issue keys
  fixVersions: string[]; // Array of fix version names
  projects?: string; // Optional: Projects to include
  projectsIgnore?: string; // Optional: Projects to exclude
  includeMergeMessages: boolean; // Include merge commit messages
  failOnError: boolean; // Fail action on error
  config: JiraAuthConfig; // Jira authentication config
}
```

**Used by**: `action.ts`, `EventManager.ts`, `Issue.ts`, `input-helper.ts`

#### FixVersionObject

Represents a Jira fix version object returned from the API.

```typescript
interface FixVersionObject {
  self?: string; // API URL for the version
  id?: string | number; // Version ID
  description?: string; // Version description
  name?: string; // Version name
  archived?: boolean; // Is version archived
  released?: boolean; // Is version released
  releaseDate?: string; // Release date
}
```

**Used by**: `Issue.ts` for parsing fix versions

#### FixVersion

Represents an update operation for a fix version.

```typescript
interface FixVersion {
  add: FixVersionObject; // Fix version to add
}
```

**Used by**: `Jira.ts` for update operations

### Type Aliases

#### FixVersions

Array of FixVersion objects for batch updates.

```typescript
type FixVersions = FixVersion[];
```

**Used by**: `Jira.ts` in `updateIssueFixVersions()`

## Usage Example

```typescript
import { Args, JiraConfig, FixVersionObject } from './@types';

// Create configuration
const config: JiraConfig = {
  baseUrl: 'https://company.atlassian.net',
  token: 'your-api-token',
  email: 'user@company.com',
};

// Parse action arguments
const args: Args = {
  token: process.env.GITHUB_TOKEN || '',
  issues: 'PROJECT-123,PROJECT-456',
  fixVersions: ['v1.0.0', 'v1.1.0'],
  includeMergeMessages: false,
  failOnError: false,
  config,
};
```

## Cross-References

- **Imported by**:
  - `src/action.ts` - Uses `Args`, `JiraConfig`
  - `src/Jira.ts` - Uses `FixVersions`, `JiraConfig`
  - `src/Issue.ts` - Uses `Args`, `FixVersionObject`
  - `src/EventManager.ts` - Uses `Args`
  - `src/input-helper.ts` - Uses `Args`, `JiraAuthConfig`
