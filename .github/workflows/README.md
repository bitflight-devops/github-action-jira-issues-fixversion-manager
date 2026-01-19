# GitHub Workflows

This directory contains GitHub Actions workflow definitions for CI/CD automation.

## Workflows Overview

| Workflow                                     | Trigger                    | Purpose                              |
| -------------------------------------------- | -------------------------- | ------------------------------------ |
| `create_tag.yml`                             | Push to `main`             | Version bump and tag creation        |
| `publish_action.yml`                         | Tag push                   | Publish action to GitHub Marketplace |
| `pull_request_cleanup_tags_and_releases.yml` | PR closed / branch deleted | Clean up test tags and releases      |
| `push_code_linting.yml`                      | Pull request               | ESLint code review                   |

## Workflow Details

### create_tag.yml

**Name**: Update Package Version and Create Tag

**Trigger**: Push to `main` branch (ignores tag pushes)

**Purpose**: Automatically versions and tags releases when code is merged to main.

**Steps**:

1. Checkout repository with full history
2. Set up Node.js 16.x with Yarn cache
3. Calculate next version using `mathieudutour/github-tag-action@v6`
4. Install dependencies and build the project
5. Commit built `dist/` folder
6. Bump version using Yarn with changelog in commit message

**Environment**:

- Runner: `Ubuntu-20.04`
- Node: `16.x`
- Package Manager: Yarn

**Outputs**: Creates a new git tag with format `vX.Y.Z`

### publish_action.yml

**Name**: publish-action

**Trigger**: Any tag push (`**`)

**Purpose**: Publishes the GitHub Action for use in other workflows.

**Steps**:

1. Uses `technote-space/release-github-actions@v7.0.5` to:
   - Create/update major version tags (e.g., `v1` points to latest `v1.x.x`)
   - Package action for GitHub Marketplace

**Environment**:

- Runner: `ubuntu-latest`

### pull_request_cleanup_tags_and_releases.yml

**Name**: Pull Request - Cleanup Tags and Releases

**Triggers**:

- Branch deletion (`delete` event)
- Pull request closed
- Manual dispatch with optional inputs

**Purpose**: Removes test/preview tags and releases created during PR development.

**Inputs** (manual dispatch):
| Input | Required | Description |
|-------|----------|-------------|
| `regex` | No | Regex pattern to match tags for deletion |
| `pr_number` | No | PR number to find associated tags |

**Steps**:

1. Uses `Broadshield/github-action-cleanup-releases-and-tags@main`
2. Removes tags/releases matching the pattern or PR number

**Environment**:

- Runner: `ubuntu-latest`
- Token: `github.token` (automatic)

### push_code_linting.yml

**Name**: Code Linting

**Trigger**: Pull requests

**Purpose**: Runs ESLint and reports issues as PR review comments.

**Steps**:

1. Checkout code
2. Run ESLint via `reviewdog/action-eslint@v1`
3. Report findings as GitHub PR review comments

**Configuration**:

- Reporter: `github-pr-review` (inline comments on PR)
- ESLint config: Uses project's `.eslintrc.cjs`

## Workflow Dependencies

```
Developer pushes to PR branch
         │
         ├─► push_code_linting.yml (lint check)
         │
         └─► PR merged to main
                   │
                   └─► create_tag.yml
                             │
                             └─► Creates tag vX.Y.Z
                                       │
                                       └─► publish_action.yml
                                                 │
                                                 └─► Updates v1 tag
                                                     Publishes to Marketplace
```

## Required Secrets

| Secret         | Used By       | Purpose                               |
| -------------- | ------------- | ------------------------------------- |
| `GITHUB_TOKEN` | All workflows | Automatic token for GitHub API access |

No additional secrets are required beyond the automatic `GITHUB_TOKEN`.

## Adding New Workflows

When adding new workflows:

1. Create `.yml` file in this directory
2. Define appropriate triggers (`on:`)
3. Use consistent naming conventions
4. Document the workflow in this README
5. Test on a feature branch before merging

## Related Files

- `action.yml` - Action definition file
- `package.json` - Contains version and scripts
- `.eslintrc.cjs` - ESLint configuration
