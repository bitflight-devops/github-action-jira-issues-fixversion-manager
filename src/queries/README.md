# GraphQL Queries

This directory contains GraphQL queries for interacting with the GitHub GraphQL API.

## Overview

These queries are designed to retrieve commit information from GitHub repositories and pull requests. They can be used to extract Jira issue keys from commit messages.

**Note**: These queries are currently defined but may not be actively used in the main action flow. The current implementation relies on direct input of issue keys rather than automatic extraction from commits.

## Queries

### getLastCommitMessage.graphql

**Purpose**: Retrieves commit messages from a repository branch within a date range.

**Variables**:
| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `$owner` | String! | Yes | Repository owner |
| `$repo` | String! | Yes | Repository name |
| `$ref` | String! | Yes | Git reference (branch name) |
| `$after` | String | No | Cursor for pagination |
| `$endDate` | GitTimestamp! | Yes | End date for commit range |
| `$startDate` | GitTimestamp! | Yes | Start date for commit range |

**Returns**:

- `totalCount` - Number of commits in range
- `nodes` - Array of commits with `oid` (SHA) and `message`
- `pageInfo` - Pagination info (`startCursor`, `hasNextPage`, `endCursor`)

**Example Usage**:

```graphql
query {
  repository(owner: "bitflight-devops", name: "my-repo") {
    ref(qualifiedName: "refs/heads/main") {
      target {
        ... on Commit {
          history(first: 1, until: "2024-01-01", since: "2023-12-01") {
            totalCount
            nodes {
              oid
              message
            }
          }
        }
      }
    }
  }
}
```

### getStartAndEndPoints.graphql

**Purpose**: Retrieves the latest commit dates from two branches for comparison.

**Variables**:
| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `$owner` | String! | Yes | Repository owner |
| `$repo` | String! | Yes | Repository name |
| `$headRef` | String! | Yes | Head branch reference |
| `$baseRef` | String! | Yes | Base branch reference |

**Returns**:

- `endPoint` - Head branch commit info with `committedDate`
- `startPoint` - Base branch commit info with `committedDate`

**Use Case**: Determine the date range for fetching commits between two branches.

### listCommitMessagesInPullRequest.graphql

**Purpose**: Retrieves all commit messages from a pull request.

**Variables**:
| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `$owner` | String! | Yes | Repository owner |
| `$repo` | String! | Yes | Repository name |
| `$prNumber` | Int! | Yes | Pull request number |
| `$after` | String | No | Cursor for pagination |

**Returns**:

- `baseRef.name` - Base branch name
- `headRef.name` - Head branch name
- `commits.nodes` - Array of commits with `message`
- `pageInfo` - Pagination info for handling >100 commits

**Example Usage**:

```graphql
query {
  repository(owner: "bitflight-devops", name: "my-repo") {
    pullRequest(number: 123) {
      baseRef {
        name
      }
      headRef {
        name
      }
      commits(first: 100) {
        nodes {
          commit {
            message
          }
        }
      }
    }
  }
}
```

## Potential Use Cases

These queries could be used to:

1. **Automatic Issue Detection**: Parse commit messages to find Jira issue keys
2. **Release Notes**: Generate release notes from commit history
3. **PR Validation**: Ensure all commits reference Jira issues

## Issue Key Extraction

The regex pattern in `src/utils.ts` can extract Jira issue keys from commit messages:

```typescript
const issueIdRegEx = /([\dA-Za-z]+-\d+)/g;
```

This matches patterns like `PROJECT-123`, `ABC-1`, `TEAM-9999`.

## Related Files

- `src/utils.ts` - Contains `issueIdRegEx` for parsing issue keys
- `src/EventManager.ts` - Uses `getIssueSetFromString()` for issue extraction
