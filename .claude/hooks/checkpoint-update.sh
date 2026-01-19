#!/bin/bash
# Update checkpoint after agent completes work
# Records agent invocation, updates phase status, and logs verification results
#
# Usage: .claude/hooks/checkpoint-update.sh <agent-name> [phase-name] [status]
#
# Arguments:
#   agent-name  - Name of the agent (architecture-analyzer, validation-runner, etc.)
#   phase-name  - Optional: Name of the phase to update
#   status      - Optional: New status (pending, in_progress, completed)
#
# Examples:
#   .claude/hooks/checkpoint-update.sh architecture-analyzer
#   .claude/hooks/checkpoint-update.sh validation-runner validation-harness completed

set -e

AGENT_NAME="${1:-unknown}"
PHASE_NAME="${2:-}"
NEW_STATUS="${3:-}"

CHECKPOINT_FILE=".claude/checkpoints/modernization-progress.json"

# Check if checkpoint file exists
if [ ! -f "$CHECKPOINT_FILE" ]; then
    echo "Error: Checkpoint file not found at $CHECKPOINT_FILE" >&2
    echo "Run .claude/hooks/checkpoint-init.sh first" >&2
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "Warning: jq not available, using basic update" >&2
    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "Agent $AGENT_NAME ran at $TIMESTAMP" >> "$CHECKPOINT_FILE.log"
    exit 0
fi

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Update agent invocation count and last run
TEMP_FILE=$(mktemp)
jq --arg agent "$AGENT_NAME" \
   --arg timestamp "$TIMESTAMP" \
   '
   if .agents[$agent] then
     .agents[$agent].invocations += 1 |
     .agents[$agent].lastRun = $timestamp |
     .agents[$agent].status = "running"
   else
     .agents[$agent] = {
       "invocations": 1,
       "lastRun": $timestamp,
       "status": "running",
       "lastError": null
     }
   end |
   .lastUpdated = $timestamp
   ' "$CHECKPOINT_FILE" > "$TEMP_FILE"

# If phase name and status provided, update the phase
if [ -n "$PHASE_NAME" ] && [ -n "$NEW_STATUS" ]; then
    jq --arg phase "$PHASE_NAME" \
       --arg status "$NEW_STATUS" \
       --arg timestamp "$TIMESTAMP" \
       '
       if .phases[$phase] then
         .phases[$phase].status = $status |
         if $status == "in_progress" then
           .phases[$phase].startedAt = $timestamp
         elif $status == "completed" then
           .phases[$phase].completedAt = $timestamp
         else
           .
         end
       else
         .
       end
       ' "$TEMP_FILE" > "$TEMP_FILE.2"
    mv "$TEMP_FILE.2" "$TEMP_FILE"
fi

mv "$TEMP_FILE" "$CHECKPOINT_FILE"

echo "Checkpoint updated:"
echo "  Agent: $AGENT_NAME"
echo "  Time: $TIMESTAMP"
if [ -n "$PHASE_NAME" ]; then
    echo "  Phase: $PHASE_NAME -> $NEW_STATUS"
fi

exit 0
