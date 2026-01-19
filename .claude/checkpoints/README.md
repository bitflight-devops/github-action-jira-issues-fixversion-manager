# Checkpoints Directory

This directory stores progress tracking files for the brownfield modernization process. Checkpoints enable session resumption and cross-agent state sharing.

## Files

| File                          | Purpose                                     |
| ----------------------------- | ------------------------------------------- |
| `modernization-progress.json` | Active checkpoint tracking current progress |
| `checkpoint-template.json`    | Template showing checkpoint structure       |

## Checkpoint System

The checkpoint system provides:

- **Progress Tracking**: Records completion status of all 8 modernization phases
- **Session Resumption**: Enables picking up where previous sessions left off
- **Cross-Agent State**: Shared state between specialized agents
- **Audit Trail**: Logs verification results and agent invocations

## modernization-progress.json

The active checkpoint file contains:

### Phases Section

Tracks 8 modernization phases from the checklist:

1. `architecture-analysis` - Codebase inventory and dependency mapping
2. `validation-harness` - Type checking, linting, and test setup
3. `architecture-documentation` - System architecture documentation
4. `modernization-plan` - Task breakdown and risk assessment
5. `cicd-pipeline` - CI/CD pipeline configuration
6. `review-cycles` - Code review and hallucination detection
7. `documentation` - Per-directory and file-level documentation
8. `continuous-validation` - Pre-commit hooks and drift detection

Each phase has:

- `status`: `pending`, `in_progress`, or `completed`
- `startedAt` / `completedAt`: Timestamps
- `findings` / specific data: Phase-specific results
- `verificationPassed`: Whether CoVe verification succeeded

### Agents Section

Tracks 4 specialized agents:

1. `architecture-analyzer` - Phase 1 analysis
2. `validation-runner` - Phase 2 validation setup
3. `documentation-generator` - Phase 7 documentation
4. `modernization-planner` - Phase 4 planning

Each agent tracks:

- `invocations`: How many times the agent has run
- `lastRun`: Last execution timestamp
- `status`: `ready` or `running`
- `lastError`: Any error from previous run

### Resume Info Section

Contains:

- `lastIncompletePhase`: Which phase to resume
- `blockers`: Any issues preventing progress
- `notes`: Additional context for resumption

## checkpoint-template.json

A template file showing the expected structure for checkpoints. Useful for:

- Understanding the data format
- Creating new checkpoints programmatically
- Documentation reference

## Managing Checkpoints

### Initialize New Checkpoint

```bash
.claude/hooks/checkpoint-init.sh
```

### Check Current Progress

```bash
.claude/hooks/checkpoint-read.sh --summary
```

### Update After Agent Work

```bash
.claude/hooks/checkpoint-update.sh <agent-name> <phase> <status>
```

### View Raw Checkpoint

```bash
.claude/hooks/checkpoint-read.sh --json
```

## Related Files

- `../hooks/checkpoint-init.sh` - Initialization script
- `../hooks/checkpoint-read.sh` - Status reading script
- `../hooks/checkpoint-update.sh` - Update script
- `../commands/modernize-brownfield.md` - Uses checkpoint system
- `../../docs/AI-ASSISTED-BROWNFIELD-MODERNIZATION-CHECKLIST.md` - Phase definitions
