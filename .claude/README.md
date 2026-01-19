# Claude Code Configuration

This directory contains Claude Code configuration for AI-assisted brownfield modernization of this repository.

## Structure

```
.claude/
├── commands/
│   └── modernize-brownfield.md    # Main orchestration slash command
├── agents/
│   ├── architecture-analyzer.md   # Codebase structure analysis
│   ├── validation-runner.md       # Validation harness setup
│   ├── documentation-generator.md # Documentation creation
│   └── modernization-planner.md   # Modernization planning
├── hooks/
│   ├── checkpoint-init.sh         # Initialize checkpoint
│   ├── checkpoint-update.sh       # Update checkpoint after agent work
│   └── checkpoint-read.sh         # Read checkpoint status
├── checkpoints/
│   ├── .gitkeep
│   └── checkpoint-template.json   # Template for checkpoint structure
└── README.md                      # This file
```

## Usage

### Start Modernization Process

Run the main orchestration command:

```
/modernize-brownfield
```

This will:
1. Initialize the checkpoint system
2. Launch specialized agents to analyze the codebase
3. Track progress across sessions
4. Enable checkpoint-based resumption

### Check Progress

```bash
.claude/hooks/checkpoint-read.sh --summary
```

### Resume from Checkpoint

If a session was interrupted, simply run `/modernize-brownfield` again. The orchestrator will:
1. Read the existing checkpoint
2. Identify incomplete phases
3. Resume from where it left off

### Run Individual Agents

You can also run agents individually:

- **Architecture Analysis**: "Use the architecture-analyzer agent to analyze the codebase"
- **Validation Setup**: "Use the validation-runner agent to set up validation gates"
- **Documentation**: "Use the documentation-generator agent to create documentation"
- **Planning**: "Use the modernization-planner agent to create the modernization plan"

## Chain-of-Verification (CoVe)

All agents follow the CoVe protocol:

1. **Generate**: Create initial output/analysis
2. **Question**: Generate verification questions
3. **Verify**: Answer questions against actual code
4. **Correct**: Fix any discrepancies found
5. **Accept**: Only accept verified output

## Checkpoint System

Progress is tracked in `.claude/checkpoints/modernization-progress.json`:

- **Phase Status**: pending, in_progress, completed
- **Agent Invocations**: Track how many times each agent ran
- **Findings**: Store analysis results for cross-agent sharing
- **Verification Log**: Record all verification checks

## Reference Documentation

See `docs/AI-ASSISTED-BROWNFIELD-MODERNIZATION-CHECKLIST.md` for the complete 8-phase modernization process with detailed examples.
