# GitHub Workflows

This directory contains GitHub Actions workflow definitions for CI/CD automation.

## Workflows Overview

| Workflow                                     | Trigger                    | Purpose                              |
| -------------------------------------------- | -------------------------- | ------------------------------------ |
| `create_tag.yml` | Successful main-push Jira E2E | Publish tested commit/tag and dispatch release checks |
| `publish_action.yml` | Stable tag push / manual | Verify published tag, version and action |
| `pull_request_cleanup_tags_and_releases.yml` | PR closed / branch deleted | Clean up test tags and releases      |
| `push_code_linting.yml` | Pull request / manual | Strict Biome checks |

## Workflow Details

### create_tag.yml

A successful same-repository main-push Jira E2E run starts release preparation. The workflow checks out the tested SHA and rejects stale main, installs the frozen Yarn 1.22.22 lockfile on Node 24.19.0, checks types/lint/build parity, and selects the next unused stable patch version. Yarn's version lifecycle runs tests and generates versioned documentation. The new commit must retain the tested source, bundle, action metadata and lockfile.

Publication atomically pushes the release metadata commit and its exact `vX.Y.Z` tag without force. A separate job creates the GitHub release with generated notes or resumes an existing draft. Retry failed jobs to resume release creation without repeating the successful version/tag job.

After publication, explicit workflow dispatch starts CI, standalone unit tests, lint, Jira E2E and release verification against the immutable tag. These checks belong to the published commit. This is necessary because GITHUB_TOKEN pushes do not trigger push workflows. Dispatch-triggered E2E cannot publish another release: the publisher requires a main push event.

### publish_action.yml

This read-only workflow verifies a stable version tag's commit, package version, packaged entry point and published release notes. It runs for stable version tag pushes or manual dispatch with an immutable tag selected. `create_tag.yml` owns publication; this workflow does not rebuild or move major/minor aliases. Consumers should select a reviewed immutable version or full commit SHA.

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

Pull requests and manual dispatch run a frozen install and Biome checks on Node 24.19.0. CI also performs type checking, unit tests and committed-bundle parity. The Jira workflow uses the shared official Jira/PostgreSQL fixture to exercise the packaged action and independently read back its effects.

## Release sequence

Main push → successful Jira E2E → validated metadata commit and exact tag → GitHub release → explicit checks on the published tag. Publication jobs have `contents: write`; the dispatch job has `actions: write`. Verification workflows retain read access, with any additional permissions declared by their own jobs.

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
- `biome.json` - Lint and formatting configuration
