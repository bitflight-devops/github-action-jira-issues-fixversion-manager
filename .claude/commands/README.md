# Slash Commands

This directory contains slash command definitions for Claude Code that enable complex automated workflows.

## Available Commands

### modernize-brownfield.md

**Command**: `/modernize-brownfield`

**Description**: Orchestrates multi-agent brownfield modernization using Chain-of-Verification techniques with checkpoint-based resumption.

**Allowed Tools**: Read, Write, Bash, Glob, Grep, Task, TodoWrite

**Purpose**: Coordinates the 8-phase modernization process defined in `docs/AI-ASSISTED-BROWNFIELD-MODERNIZATION-CHECKLIST.md`.

## How It Works

When you run `/modernize-brownfield`, the orchestrator:

1. **Initializes Checkpoint System**

   - Creates `.claude/checkpoints/modernization-progress.json` if needed
   - Reads existing progress to determine resume point

2. **Identifies Resume Point**

   - Checks phase statuses: `pending`, `in_progress`, `completed`
   - Determines which phases need work

3. **Launches Specialized Agents**

   - Architecture Analyzer (Phase 1)
   - Validation Runner (Phase 2)
   - Documentation Generator (Phase 7)
   - Modernization Planner (Phase 4)

4. **Monitors and Coordinates**

   - Waits for agent completion
   - Verifies successful completion
   - Re-launches with corrections if needed

5. **Final Verification**
   - Runs hallucination detection checklist
   - Validates documentation cross-references
   - Updates checkpoint with final status

## Checkpoint-Based Resumption

If a session is interrupted:

1. Run `/modernize-brownfield` again
2. The orchestrator reads the existing checkpoint
3. Work resumes from the last incomplete phase

## Success Criteria

The modernization is complete when:

- All 8 phases have status "completed"
- All verification checks passed
- Hallucination detection found no issues
- Documentation is navigable and accurate
- Modernization plan is actionable with correct dependencies

## Creating New Commands

To add a new slash command:

1. Create a new `.md` file in this directory
2. Add YAML frontmatter with:
   ```yaml
   ---
   description: Brief description of the command
   allowed-tools: Comma-separated list of tools
   ---
   ```
3. Document the command behavior in Markdown
4. Test the command in Claude Code

## Related Files

- `../agents/` - Specialized agent definitions
- `../hooks/` - Checkpoint management scripts
- `../checkpoints/` - Progress tracking files
- `../../docs/AI-ASSISTED-BROWNFIELD-MODERNIZATION-CHECKLIST.md` - Reference
