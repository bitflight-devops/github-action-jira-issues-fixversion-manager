# Checkpoint Management Hooks

This directory contains shell scripts for managing the modernization checkpoint system. These hooks enable progress tracking and session resumption.

## Scripts Overview

| Script                 | Purpose                                |
| ---------------------- | -------------------------------------- |
| `checkpoint-init.sh`   | Initialize or validate checkpoint file |
| `checkpoint-read.sh`   | Read and display checkpoint status     |
| `checkpoint-update.sh` | Update checkpoint after agent work     |

## Script Details

### checkpoint-init.sh

**Purpose**: Creates or validates the modernization progress tracking file.

**Usage**:

```bash
.claude/hooks/checkpoint-init.sh
```

**Behavior**:

- Creates `.claude/checkpoints/` directory if missing
- Creates `modernization-progress.json` if it doesn't exist
- If checkpoint exists, updates the `lastUpdated` timestamp (requires `jq`)
- Initializes all 8 phases with `pending` status
- Initializes all 4 agents with `ready` status

**Exit Codes**:

- `0` - Success

### checkpoint-read.sh

**Purpose**: Reads and displays checkpoint status in various formats.

**Usage**:

```bash
.claude/hooks/checkpoint-read.sh [--json|--summary|--phases|--agents]
```

**Options**:
| Option | Description |
| ------ | ----------- |
| `--json` | Output raw JSON |
| `--summary` | Output brief summary (default) |
| `--phases` | Show phase statuses |
| `--agents` | Show agent statuses |

**Example Output** (`--summary`):

```
=== Brownfield Modernization Progress ===

Last Updated: 2026-01-19T18:43:22Z

Phases: 2/8 completed, 1 in progress, 5 pending

Incomplete Phases:
  - architecture-documentation: pending
  - modernization-plan: in_progress
  ...

Next Phase: modernization-plan
```

**Dependencies**: Requires `jq` for formatted output (falls back to raw JSON without it)

### checkpoint-update.sh

**Purpose**: Updates the checkpoint after an agent completes work.

**Usage**:

```bash
.claude/hooks/checkpoint-update.sh <agent-name> [phase-name] [status]
```

**Arguments**:
| Argument | Required | Description |
| -------- | -------- | ----------- |
| `agent-name` | Yes | Name of the agent (e.g., `architecture-analyzer`) |
| `phase-name` | No | Name of the phase to update |
| `status` | No | New status (`pending`, `in_progress`, `completed`) |

**Examples**:

```bash
# Update agent invocation count
.claude/hooks/checkpoint-update.sh architecture-analyzer

# Update phase status
.claude/hooks/checkpoint-update.sh validation-runner validation-harness completed
```

**Behavior**:

- Increments agent invocation count
- Updates agent `lastRun` timestamp
- Sets agent status to `running`
- If phase and status provided, updates phase status
- Sets `startedAt` when status is `in_progress`
- Sets `completedAt` when status is `completed`

**Dependencies**: Requires `jq` for JSON manipulation (falls back to log file without it)

## Checkpoint File Structure

The checkpoint file (`.claude/checkpoints/modernization-progress.json`) contains:

```json
{
  "version": "1.0.0",
  "projectName": "...",
  "initDate": "ISO-timestamp",
  "lastUpdated": "ISO-timestamp",
  "phases": {
    "phase-name": {
      "status": "pending|in_progress|completed",
      "startedAt": "ISO-timestamp|null",
      "completedAt": "ISO-timestamp|null",
      "findings": {},
      "verificationPassed": false
    }
  },
  "agents": {
    "agent-name": {
      "invocations": 0,
      "lastRun": "ISO-timestamp|null",
      "status": "ready|running",
      "lastError": null
    }
  },
  "resumeInfo": {
    "lastIncompletePhase": "phase-name",
    "blockers": [],
    "notes": ""
  },
  "verificationLog": []
}
```

## Related Files

- `../checkpoints/modernization-progress.json` - Active checkpoint file
- `../checkpoints/checkpoint-template.json` - Checkpoint structure template
- `../commands/modernize-brownfield.md` - Main orchestration command
- `../agents/` - Agent definitions that update checkpoints
