# GitHub Configuration

This directory contains GitHub-specific configuration files for repository automation, dependency management, and CI/CD workflows.

## Directory Structure

```
.github/
├── workflows/                              # GitHub Actions workflow definitions
│   ├── README.md                           # Workflow documentation
│   ├── create_tag.yml                      # Version bump and tag creation
│   ├── publish_action.yml                  # Publish to GitHub Marketplace
│   ├── pull_request_cleanup_tags_and_releases.yml  # Cleanup test releases
│   └── push_code_linting.yml               # ESLint PR reviews
├── dependabot.yml                          # Dependency update automation
├── github_event_jira_transitions.yml       # Jira state transition mapping
└── github_event_jira_transitions.example.yml  # Example configuration
```

## Configuration Files

### dependabot.yml

**Purpose**: Automated dependency updates via GitHub Dependabot.

**Configured Package Ecosystems**:

| Ecosystem        | Directory | Schedule | Labels                           |
| ---------------- | --------- | -------- | -------------------------------- |
| `github-actions` | `/`       | Weekly   | `github-actions`, `dependencies` |
| `docker`         | `/`       | Weekly   | `docker`, `dependencies`         |
| `npm`            | `/`       | Weekly   | `npm`, `dependencies`            |

All updates are assigned to `jamie-bitflight` for review.

### github_event_jira_transitions.yml

**Purpose**: Maps GitHub events to Jira issue state transitions. This configuration file is used by workflows that automate Jira ticket management.

**Structure**:

```yaml
projects:
  PROJECT_KEY:
    ignored_states: # States that won't be auto-transitioned
      - 'done'
    to_state:
      'target state': # Jira state to transition to
        - eventName: github_event_name
          action: 'event_action' # Optional
          payload: # Optional payload matching
            key: value
```

**Configured Projects**:

- `UNICORN` - Maps create, pull_request, and pull_request_review events
- `DVPS` - Similar mapping with different state names

**GitHub Events Mapped**:

- `create` - Branch/tag creation
- `pull_request` (opened, synchronized, closed+merged)
- `pull_request_review` (APPROVED)

### github_event_jira_transitions.example.yml

**Purpose**: Template configuration for teams to customize Jira transition mappings.

## Workflows

See [`workflows/README.md`](./workflows/README.md) for detailed documentation on:

- `create_tag.yml` - Automatic version bumping and tag creation
- `publish_action.yml` - GitHub Marketplace publication
- `pull_request_cleanup_tags_and_releases.yml` - Test artifact cleanup
- `push_code_linting.yml` - ESLint integration with PR reviews

## CI/CD Pipeline Flow

```
PR Opened/Updated
       │
       ├─► push_code_linting.yml (ESLint review)
       │
       └─► PR Merged to main
                 │
                 └─► create_tag.yml (version bump + tag)
                           │
                           └─► publish_action.yml (marketplace release)

PR Closed / Branch Deleted
       │
       └─► pull_request_cleanup_tags_and_releases.yml (cleanup)
```

## Adding New Configurations

### New Workflow

1. Create `.yml` file in `workflows/`
2. Define triggers (`on:`)
3. Add jobs and steps
4. Update `workflows/README.md`
5. Test on feature branch

### New Dependabot Ecosystem

Add to `dependabot.yml`:

```yaml
- package-ecosystem: 'ecosystem-name'
  directory: '/path'
  schedule:
    interval: 'weekly'
  labels:
    - 'ecosystem-name'
    - 'dependencies'
```

## Related Files

- `/action.yml` - GitHub Action definition
- `/package.json` - NPM package configuration
- `/.eslintrc.cjs` - ESLint configuration (used by linting workflow)
