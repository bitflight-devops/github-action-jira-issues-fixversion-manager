# Source Code Directory

This directory contains the core TypeScript source code for the GitHub Action that manages JIRA issue fix versions.

## Architecture Overview

```
src/
├── index.ts           # Entry point - initializes and executes the action
├── action.ts          # Action class - main orchestration logic
├── Jira.ts            # Jira API client wrapper using jira.js
├── Issue.ts           # Issue management and fix version operations
├── EventManager.ts    # GitHub event handling and issue extraction
├── input-helper.ts    # GitHub Action input parsing and validation
├── fs-helper.ts       # File system utility functions
├── utils.ts           # Shared utility functions
├── @types/            # TypeScript type definitions
│   └── index.d.ts     # Custom type declarations
└── queries/           # GraphQL queries for GitHub API
    └── *.graphql      # Query definitions
```

## File Descriptions

### index.ts

**Purpose**: Entry point for the GitHub Action.

**Exports**: None (executes immediately)

**Dependencies**:

- `@actions/core` - GitHub Actions core functionality
- `@actions/github` - GitHub context access
- `./action` - Action class
- `./input-helper` - Input parsing

**Behavior**: Creates an `Action` instance with the GitHub context and parsed inputs, then calls `execute()`. Catches any errors and marks the action as failed.

### action.ts

**Purpose**: Main Action class that orchestrates the fix version update process.

**Exports**:

- `Action` (class) - Main action orchestration class

**Key Methods**:

- `constructor(context: Context, argv: Args)` - Initializes Jira client and EventManager
- `execute(): Promise<boolean>` - Executes the action, returns true on success

**Dependencies**:

- `@actions/core`
- `@actions/github/lib/context`
- `./@types` - Type definitions
- `./EventManager` - Event handling
- `./Jira` - Jira API client
- `./utils` - Utility functions

### Jira.ts

**Purpose**: Jira API client wrapper using the `jira.js` library.

**Exports**:

- `Jira` (default class) - Jira API client

**Key Methods**:

- `getIssue(issueId, query?)` - Fetch a Jira issue by ID/key
- `getIssueMetaData(issueId)` - Get issue edit metadata
- `projectHasFixVersionsFromList(projectIdOrKey, fixVersions)` - Check if versions exist
- `getProjectByKey(key)` - Get project ID from key
- `createFixVersion(projectId, fixVersion)` - Create a new fix version
- `getFixVersions(projectIdOrKey)` - List all fix versions for a project
- `updateIssueFixVersions(issueIdOrKey, fixVersions)` - Add fix versions to an issue

**Dependencies**:

- `@actions/core`
- `jira.js` - Jira API client library
- `./@types` - Type definitions
- `./utils` - formatDate utility

### Issue.ts

**Purpose**: Represents a Jira issue and handles fix version operations.

**Exports**:

- `Issue` (default class) - Issue management class
- `IssueOutput` (interface) - Output data structure
- `Issues` (type) - Array of Issue instances

**Key Methods**:

- `build()` - Initializes issue by fetching from Jira
- `apply()` - Applies fix versions to the issue
- `getOutputs()` - Returns action output data
- `getIssueFixVersions(fresh?)` - Gets current fix versions

**Dependencies**:

- `@actions/core`
- `axios` - HTTP client (for error handling)
- `jira.js/out/version2/models`
- `./@types`
- `./Jira`
- `./utils`

### EventManager.ts

**Purpose**: Handles GitHub events and extracts Jira issue keys from input.

**Exports**:

- `EventManager` (default class) - Event management class
- `ProjectFilter` (interface) - Project filtering configuration
- `token` (const) - GitHub token

**Key Methods**:

- `isProjectOfIssueSelected(issueKey)` - Checks if issue passes project filters
- `getIssueSetFromString(str, _set?)` - Extracts issue keys from string
- `updateJiraFixVersion()` - Main method to update fix versions on issues

**Dependencies**:

- `@actions/core`
- `@actions/github/lib/context`
- `./@types`
- `./Issue`
- `./Jira`
- `./utils`

### input-helper.ts

**Purpose**: Parses and validates GitHub Action inputs.

**Exports**:

- `getInputs(): Args` - Parses all action inputs and returns Args object

**Required Inputs**:

- `JIRA_BASE_URL` or `jira_base_url` - Jira instance URL
- `JIRA_API_TOKEN` or `jira_api_token` - Jira API token
- `JIRA_USER_EMAIL` or `jira_user_email` - Jira user email
- `GITHUB_WORKSPACE` - GitHub workspace path

**Dependencies**:

- `node:path`
- `@actions/core`
- `./@types`
- `./fs-helper`

### fs-helper.ts

**Purpose**: File system utility functions for path validation.

**Exports**:

- `existsSync(path)` - Check if path exists
- `directoryExistsSync(path, required?)` - Check if directory exists
- `fileExistsSync(path)` - Check if file exists
- `loadFileSync(path)` - Load file contents as string

**Dependencies**:

- `node:fs`

### utils.ts

**Purpose**: Shared utility functions used across the codebase.

**Exports**:

- `issueIdRegEx` - Regex pattern for Jira issue keys (e.g., `PROJECT-123`)
- `isError(error)` - Type guard for Error objects
- `toCommaDelimitedString(strSet?)` - Convert iterable to comma-separated string
- `nullIfEmpty(str?)` - Return null if array is empty
- `formatDate(date)` - Format date as YYYY-MM-DD string

**Dependencies**:

- None (pure utility functions)

## Data Flow

```
index.ts
    │
    ├─► getInputs() [input-helper.ts]
    │       │
    │       └─► Validates environment variables and action inputs
    │
    └─► Action.execute() [action.ts]
            │
            └─► EventManager.updateJiraFixVersion() [EventManager.ts]
                    │
                    ├─► getIssueSetFromString() - Extract issue keys
                    │
                    └─► For each issue:
                            │
                            ├─► Issue.build() [Issue.ts]
                            │       └─► Jira.getIssue() [Jira.ts]
                            │
                            └─► Issue.apply() [Issue.ts]
                                    │
                                    ├─► Jira.projectHasFixVersionsFromList()
                                    ├─► Jira.createFixVersion() (if needed)
                                    └─► Jira.updateIssueFixVersions()
```

## Testing

Tests are located in `__tests__/`. Run tests with:

```bash
npm test
# or
yarn test
```

## Building

The TypeScript source is compiled to JavaScript in the `dist/` directory:

```bash
npm run build
# or
yarn build
```

## Related Documentation

- [Root README](/README.md) - Action usage documentation
- [Type Definitions](/@types/README.md) - TypeScript type declarations
- [GraphQL Queries](/queries/README.md) - GitHub API queries
