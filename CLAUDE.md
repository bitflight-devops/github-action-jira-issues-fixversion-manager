# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Action Does

A GitHub Action that manages Jira issue FixVersions. Given a list of issue keys (e.g., `PROJ-123,PROJ-456`) and FixVersion names, it adds those versions to the specified issues. If a FixVersion doesn't exist in the project, it will be created automatically.

Usage example in a workflow:

```yaml
- uses: bitflight-devops/github-action-jira-issues-fixversion-manager@v1
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    fix_versions: "v1.2.0,v1.3.0"
    issues: "PROJ-123,PROJ-456"
    jira_base_url: ${{ secrets.JIRA_BASE_URL }}
    jira_user_email: ${{ secrets.JIRA_USER_EMAIL }}
    jira_api_token: ${{ secrets.JIRA_API_TOKEN }}
```

## Architecture

### Core Classes (src/)

- **`Jira`** - Wrapper around `jira.js` Version2Client. Handles all Jira API calls including fetching/creating versions and updating issue fixVersions.
- **`Issue`** - Represents a single Jira issue. Fetches current fixVersions, applies new versions, and tracks before/after state for reporting.
- **`EventManager`** - Parses issue keys from input, applies project filters (include/exclude), and orchestrates the fixVersion update process.
- **`Action`** - Entry point. Creates Jira client and EventManager, executes the update workflow.

### Key Dependency: jira.js

This project uses `jira.js` v5 for all Jira API interactions. When adding Jira functionality, use the existing `Version2Client` patterns in `src/Jira.ts` rather than raw HTTP calls. The library provides typed methods for issues, projects, versions, etc.

```typescript
import { Version2Client } from 'jira.js';

const client = new Version2Client({
  host: 'https://company.atlassian.net',
  authentication: { basic: { email, apiToken } },
});

// Use client.issues, client.projects, client.projectVersions, etc.
```

**Data Center Limitation**: jira.js is designed for Jira Cloud. For project creation on Data Center, it only maps `leadAccountId` (Cloud account ID), not `lead` (username string). The E2E client (`e2e/scripts/jira-client.ts`) works around this by using raw HTTP requests for Data Center project creation. See `createProjectDirect()` method.

## Commands

```bash
# Build (compiles to dist/index.js via Rollup in ESM format)
yarn build

# Lint and format (uses Biome)
yarn lint       # Check linting and formatting
yarn lint:fix   # Auto-fix linting and formatting issues
yarn format     # Format files only

# Markdown linting
yarn lint:markdown      # Check markdown syntax
yarn lint:markdown:fix  # Auto-fix markdown issues

# Unit tests (Vitest, mocked Jira)
yarn test
yarn test:watch
yarn test -- --testNamePattern="pattern" # Run specific test

# E2E tests (requires Docker and Playwright)
yarn e2e:up           # Start Jira + MySQL containers
yarn e2e:setup        # Run Playwright setup wizard automation
yarn e2e:wait         # Wait for Jira API ready
yarn e2e:seed         # Create test project/issues
yarn e2e:test         # Run E2E test suite
yarn e2e:logs         # Show Docker container logs
yarn e2e:down         # Stop containers
yarn e2e:all          # Full E2E sequence (up -> setup -> wait -> seed -> test)
yarn e2e:fast         # Fast E2E (restore from snapshots if valid, else full setup)

# E2E snapshots (Docker volume caching for faster CI)
yarn e2e:snapshot:check   # Check if snapshots are valid
yarn e2e:snapshot:restore # Restore from cached snapshots
yarn e2e:snapshot:save    # Save current Docker volumes as snapshots
```

## Testing

### Unit Tests

Located in `__tests__/`. Uses Vitest with mocked Jira client via `vi.mock('../src/Jira')`. Mock data is inline in test files due to Vitest hoisting. Test fixtures are in `__tests__/fixtures/`.

### E2E Tests

Located in `e2e/`. Uses a Dockerized Jira Data Center instance (`haxqer/jira:9.17.5`).

**E2E Scripts** (`e2e/scripts/`):

- `setup-jira-playwright.ts` - Automates Jira setup wizard via headless Chromium (handles XSRF)
- `jira-client.ts` - E2E test client using jira.js (same library as main action)
- `seed-jira.ts` - Creates test project, versions, and issues
- `wait-for-jira.ts` - Polls until Jira API is ready
- `snapshot-*.ts` - Docker volume snapshot management for CI caching

**E2E Test Files** (`e2e/tests/`):

- `fixversion.e2e.test.ts` - Tests fixVersion creation and assignment via the Jira API

## Build and TypeScript Configuration

- **Build System**: Rollup with TypeScript plugin (see `rollup.config.ts`)
- **Output Format**: ESM (`dist/index.js`)
- **tsconfig.json**: Main action code configured for ESM (`module: ESNext`, `moduleResolution: Bundler`)
- **e2e/tsconfig.json**: E2E scripts (separate TypeScript compilation to `e2e/dist/`)

## Notes

- The action requires Node 22+
- Pre-commit hooks run lint-staged, build, and doc generation
- Commits use conventional commit format (commitlint enforced)
- Future TODO: Add `operation` input for `add`, `set`, or `remove` modes (currently only `add` is supported)
