#!/bin/bash
# Read and display checkpoint status
# Provides a summary of modernization progress
#
# Usage: .claude/hooks/checkpoint-read.sh [--json|--summary|--phases|--agents]
#
# Options:
#   --json     Output raw JSON
#   --summary  Output brief summary (default)
#   --phases   Show phase statuses
#   --agents   Show agent statuses

set -e

CHECKPOINT_FILE=".claude/checkpoints/modernization-progress.json"
OUTPUT_MODE="${1:---summary}"

# Check if checkpoint file exists
if [ ! -f "$CHECKPOINT_FILE" ]; then
    echo "No checkpoint found. Run /modernize-brownfield to initialize."
    exit 0
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "jq not available, showing raw file:"
    cat "$CHECKPOINT_FILE"
    exit 0
fi

case "$OUTPUT_MODE" in
    --json)
        cat "$CHECKPOINT_FILE" | jq '.'
        ;;
    --phases)
        echo "=== Phase Status ==="
        cat "$CHECKPOINT_FILE" | jq -r '
            .phases | to_entries[] |
            "\(.key): \(.value.status)" +
            if .value.completedAt then " (completed: \(.value.completedAt))" else "" end
        '
        ;;
    --agents)
        echo "=== Agent Status ==="
        cat "$CHECKPOINT_FILE" | jq -r '
            .agents | to_entries[] |
            "\(.key): \(.value.status) (invocations: \(.value.invocations))" +
            if .value.lastRun then " [last: \(.value.lastRun)]" else "" end
        '
        ;;
    --summary|*)
        echo "=== Brownfield Modernization Progress ==="
        echo ""
        echo "Last Updated: $(cat "$CHECKPOINT_FILE" | jq -r '.lastUpdated')"
        echo ""

        # Count phases by status
        COMPLETED=$(cat "$CHECKPOINT_FILE" | jq '[.phases[] | select(.status == "completed")] | length')
        IN_PROGRESS=$(cat "$CHECKPOINT_FILE" | jq '[.phases[] | select(.status == "in_progress")] | length')
        PENDING=$(cat "$CHECKPOINT_FILE" | jq '[.phases[] | select(.status == "pending")] | length')
        TOTAL=$(cat "$CHECKPOINT_FILE" | jq '.phases | length')

        echo "Phases: $COMPLETED/$TOTAL completed, $IN_PROGRESS in progress, $PENDING pending"
        echo ""

        # Show incomplete phases
        echo "Incomplete Phases:"
        cat "$CHECKPOINT_FILE" | jq -r '
            .phases | to_entries[] |
            select(.value.status != "completed") |
            "  - \(.key): \(.value.status)"
        '
        echo ""

        # Show resume info
        NEXT_PHASE=$(cat "$CHECKPOINT_FILE" | jq -r '.resumeInfo.lastIncompletePhase')
        echo "Next Phase: $NEXT_PHASE"

        # Show any blockers
        BLOCKERS=$(cat "$CHECKPOINT_FILE" | jq '.resumeInfo.blockers | length')
        if [ "$BLOCKERS" -gt 0 ]; then
            echo ""
            echo "Blockers:"
            cat "$CHECKPOINT_FILE" | jq -r '.resumeInfo.blockers[] | "  - \(.)"'
        fi
        ;;
esac

exit 0
