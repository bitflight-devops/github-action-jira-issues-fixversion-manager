<!-- start title -->

# GitHub Action: Add or update Jira Issues with a FixVersion

<!-- end title -->
<!-- start description -->

This action will add the supplied list of FixVersions to the list of Jira Issue Keys

<!-- end description -->

## Action Usage

<!-- start usage -->

```yaml
- uses: bitflight-devops/github-action-jira-issues-fixversion-manager@v1.0.0
  with:
    # The github token used for authenticating to GitHub
    token: ''

    # A comma-separated list of FixVersions, if the FixVersion doesn't exist it will
    # be created
    fix_versions: ''

    # A comma-separated list of Jira issue keys
    issues: ''

    # A comma separated list of project names to include in the results by, i.e.
    # DEVOPS,PROJECT1
    projects: ''

    # A comma separated list of project names to exclude from the results by, i.e.
    # INTERNAL,PROJECT2
    projects_ignore: ''

    # When parsing commit messages, include merge and pull messages. This is disabled
    # by default, to exclude tickets that may be included or fixed in other branches
    # or pull requests.
    # Default: false
    include_merge_messages: ''

    # The Jira cloud base url including protocol i.e. 'https://company.atlassian.net'
    # or use environment variable JIRA_BASE_URL
    jira_base_url: ''

    # The Jira cloud user email address or use environment variable JIRA_USER_EMAIL
    jira_user_email: ''

    # The Jira cloud user api token or use environment variable JIRA_API_TOKEN
    jira_api_token: ''

    # If there is an error during transition, the action will error out.
    # Default: false
    fail_on_error: ''
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
| **`jira_base_url`**          | The Jira cloud base url including protocol i.e. 'https://company.atlassian.net' or use environment variable JIRA_BASE_URL                                                        |             | **false**    |
| **`jira_user_email`**        | The Jira cloud user email address or use environment variable JIRA_USER_EMAIL                                                                                                    |             | **false**    |
| **`jira_api_token`**         | The Jira cloud user api token or use environment variable JIRA_API_TOKEN                                                                                                         |             | **false**    |
| **`fail_on_error`**          | If there is an error during transition, the action will error out.                                                                                                               | `false`     | **false**    |

<!-- end inputs -->

TODO:

- [ ] Add a `operation` input that can take an `add`, `set`, or `remove` modifier for the list of fixversions, for how to treat the list of FixVersions supplied. Append would add any new fixversions to the issues fixversions list, replace removes existing fix versions first, and remove would remove any fix versions from the issue that are supplied from the input list of fix_versions
