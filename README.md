<!-- start title -->

# GitHub Action: Add or update Jira Issues with a FixVersion

<!-- end title -->
<!-- start description -->

This action will add the supplied list of FixVersions to the list of Jira Issue Keys

<!-- end description -->

## Action Usage

<!-- start usage -->

```yaml
- uses: bitflight-devops/github-action-jira-issues-fixversion-manager@v1.0.3
  with:
    # The github token used for authenticating to GitHub
    token: ""

    # A comma-separated list of FixVersions, if the FixVersion doesn't exist it will
    # be created
    fix_versions: ""

    # A comma-separated list of Jira issue keys
    issues: ""

    # A comma separated list of project names to include in the results by, i.e.
    # DEVOPS,PROJECT1
    projects: ""

    # A comma separated list of project names to exclude from the results by, i.e.
    # INTERNAL,PROJECT2
    projects_ignore: ""

    # When parsing commit messages, include merge and pull messages. This is disabled
    # by default, to exclude tickets that may be included or fixed in other branches
    # or pull requests.
    # Default: false
    include_merge_messages: ""

    # The Jira Cloud or Data Center base URL including protocol, e.g.
    # 'https://company.atlassian.net' or use environment variable JIRA_BASE_URL
    jira_base_url: ""

    # The Jira Cloud user email address or Data Center username for Basic
    # authentication or use environment variable JIRA_USER_EMAIL
    jira_user_email: ""

    # The Jira Cloud API token or Data Center user password for Basic authentication
    # or use environment variable JIRA_API_TOKEN
    jira_api_token: ""

    # If there is an error applying fixVersions, the action will fail.
    # Default: false
    fail_on_error: ""
```

<!-- end usage -->

## GitHub Action Inputs

<!-- start inputs -->

| **Input**                    | **Description**                                                                                                                                                                  | **Default** | **Required** |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------ |
| **`token`**                  | The github token used for authenticating to GitHub                                                                                                                               |             | **true**     |
| **`fix_versions`**           | A comma-separated list of FixVersions, if the FixVersion doesn't exist it will be created                                                                                        |             | **true**     |
| **`issues`**                 | A comma-separated list of Jira issue keys                                                                                                                                        |             | **true**     |
| **`projects`**               | A comma separated list of project names to include in the results by, i.e. DEVOPS,PROJECT1                                                                                       |             | **false**    |
| **`projects_ignore`**        | A comma separated list of project names to exclude from the results by, i.e. INTERNAL,PROJECT2                                                                                   |             | **false**    |
| **`include_merge_messages`** | When parsing commit messages, include merge and pull messages. This is disabled by default, to exclude tickets that may be included or fixed in other branches or pull requests. | `false`     | **false**    |
| **`jira_base_url`**          | The Jira Cloud or Data Center base URL including protocol, e.g. 'https://company.atlassian.net' or use environment variable JIRA_BASE_URL                                        |             | **false**    |
| **`jira_user_email`**        | The Jira Cloud user email address or Data Center username for Basic authentication or use environment variable JIRA_USER_EMAIL                                                   |             | **false**    |
| **`jira_api_token`**         | The Jira Cloud API token or Data Center user password for Basic authentication or use environment variable JIRA_API_TOKEN                                                        |             | **false**    |
| **`fail_on_error`**          | If there is an error applying fixVersions, the action will fail.                                                                                                                 | `false`     | **false**    |

<!-- end inputs -->

TODO:

- [ ] Add a `operation` input that can take an `add`, `set`, or `remove` modifier for the list of fixversions, for how to treat the list of FixVersions supplied. Append would add any new fixversions to the issues fixversions list, replace removes existing fix versions first, and remove would remove any fix versions from the issue that are supplied from the input list of fix_versions

## Development and Testing

### Prerequisites

- Node.js **24.19.0** and **Yarn 1.22.22**, matching CI
- Docker with Docker Compose for local Jira E2E tests

The GitHub Action itself uses the **Node 24** runtime.

### Available Scripts

```bash
yarn install --frozen-lockfile  # Install the locked dependencies
yarn build                      # Build dist/index.js with Rollup
yarn test                       # Run unit tests with Vitest
yarn lint                       # Check linting and formatting with Biome
yarn lint:fix                   # Apply Biome fixes
yarn format                     # Format code with Biome
yarn e2e:test                   # Test the built action against a prepared Jira fixture
```

### Jira E2E Tests

For local tests, prepare the shared Jira Data Center fixture, build the action, and run `yarn e2e:test`. The [E2E setup and testing guide](e2e/README.md) explains fixture setup, `E2E_JIRA_BASE_URL`, the test account, and cleanup.

In CI, the [Jira E2E workflow](.github/workflows/e2e-jira.yml) uses a pinned shared fixture action to prepare Jira and cache its verified database and home directory. It runs the packaged-action tests and a native `uses: ./` invocation, verifies the resulting Jira changes, and removes the containers and writable volumes afterward.

### Tooling

- **Biome** for linting and formatting
- **Vitest** for unit and E2E tests
- **Rollup** for bundling the action as ESM
