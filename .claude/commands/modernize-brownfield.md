---
description: Orchestrate multi-agent brownfield modernization using Chain-of-Verification techniques with checkpoint-based resumption
allowed-tools: Read, Write, Bash, Glob, Grep, Task, TodoWrite
---

# AI-Assisted Brownfield Modernization Orchestrator

You are an orchestration agent responsible for coordinating a multi-agent brownfield modernization process. Your role is to:

1. Initialize and manage the checkpoint system
2. Spawn specialized agents to work concurrently on different phases
3. Monitor progress and handle failures
4. Ensure Chain-of-Verification (CoVe) is applied throughout

## Reference Documentation

The complete modernization checklist is located at: `docs/AI-ASSISTED-BROWNFIELD-MODERNIZATION-CHECKLIST.md`

Read this file first to understand the 8-phase modernization process.

## Checkpoint System

All agent work is tracked in `.claude/checkpoints/modernization-progress.json`. This enables:
- Progress tracking across sessions
- Checkpoint-based resumption if agents fail
- Shared state between agents
- Audit trail of completed work

## Execution Instructions

### Step 1: Initialize Checkpoint

First, check if a checkpoint exists and create one if needed:

```bash
if [ ! -f .claude/checkpoints/modernization-progress.json ]; then
  .claude/hooks/checkpoint-init.sh
fi
```

Then read the current progress:

```bash
cat .claude/checkpoints/modernization-progress.json
```

### Step 2: Determine Resume Point

Based on the checkpoint, identify which phases are incomplete:
- `pending` - Not started
- `in_progress` - Started but not completed (needs resumption)
- `completed` - Finished and verified

### Step 3: Launch Concurrent Agents

Use the Task tool to spawn multiple agents in parallel. Each agent should:

1. **Architecture Analyzer Agent** (Phase 1)
   - Prompt: "Analyze the repository structure following the brownfield modernization checklist Phase 1. Read docs/AI-ASSISTED-BROWNFIELD-MODERNIZATION-CHECKLIST.md for guidance. Update .claude/checkpoints/modernization-progress.json with your findings. Use Chain-of-Verification: generate initial analysis, create verification questions, answer them against actual code, and self-correct."
   - subagent_type: Explore

2. **Validation Runner Agent** (Phase 2)
   - Prompt: "Set up the validation harness following brownfield modernization checklist Phase 2. Read docs/AI-ASSISTED-BROWNFIELD-MODERNIZATION-CHECKLIST.md. Configure type checking, linting, and test infrastructure. Record validation gate results in .claude/checkpoints/modernization-progress.json."
   - subagent_type: general-purpose

3. **Documentation Generator Agent** (Phase 7)
   - Prompt: "Generate comprehensive documentation following brownfield modernization checklist Phase 7. Read docs/AI-ASSISTED-BROWNFIELD-MODERNIZATION-CHECKLIST.md. Create per-directory READMEs with validation against actual code. Update checkpoint when complete."
   - subagent_type: general-purpose

4. **Modernization Planner Agent** (Phase 4)
   - Prompt: "Create a modernization plan following brownfield modernization checklist Phase 4. Read docs/AI-ASSISTED-BROWNFIELD-MODERNIZATION-CHECKLIST.md. Generate task breakdown with dependency validation and risk assessment. Record plan in checkpoint."
   - subagent_type: Plan

### Step 4: Monitor and Coordinate

After launching agents:
1. Wait for agent completion
2. Read updated checkpoint file
3. Verify each phase was completed successfully
4. If any agent failed, analyze the failure and re-launch with corrected instructions

### Step 5: Final Verification

When all phases complete:
1. Run the hallucination detection checklist (Phase 6.3)
2. Verify all documentation cross-references are valid
3. Ensure modernization plan dependencies are correctly ordered
4. Update checkpoint with final status

## Chain-of-Verification Protocol

For every output, ensure this loop is followed:

```
1. Generate initial output/analysis
2. Create verification questions:
   - Does this claim match actual code?
   - Are file paths and line numbers correct?
   - Do statistics match actual counts?
3. Answer verification questions using tools (grep, read, test runs)
4. Self-correct any discrepancies found
5. Only accept output after verification passes
```

## Checkpoint Update Format

When updating the checkpoint, use this structure:

```json
{
  "phases": {
    "phase-name": {
      "status": "completed",
      "startedAt": "ISO-timestamp",
      "completedAt": "ISO-timestamp",
      "findings": {
        "key": "value"
      },
      "verificationPassed": true
    }
  }
}
```

## Error Recovery

If an agent fails:
1. Record the failure in checkpoint with error details
2. Analyze what caused the failure
3. Create a more specific prompt addressing the issue
4. Re-launch the agent from the last successful checkpoint

## Success Criteria

The modernization is complete when:
- [ ] All 8 phases have status "completed"
- [ ] All verification checks passed
- [ ] Hallucination detection found no issues
- [ ] Documentation is navigable and accurate
- [ ] Modernization plan is actionable with correct dependencies

Begin by reading the checkpoint and modernization checklist, then orchestrate the agents accordingly.
