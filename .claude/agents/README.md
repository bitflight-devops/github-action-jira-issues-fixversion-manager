# Specialized Agents

This directory contains agent definitions for the multi-agent brownfield modernization system. Each agent specializes in a specific aspect of codebase analysis and modernization.

## Agent Overview

| Agent                        | Phase | Purpose                                    |
| ---------------------------- | ----- | ------------------------------------------ |
| `architecture-analyzer.md`   | 1     | Codebase structure and dependency analysis |
| `validation-runner.md`       | 2     | Validation harness setup and execution     |
| `documentation-generator.md` | 7     | Documentation creation and validation      |
| `modernization-planner.md`   | 4     | Modernization planning and risk assessment |

## Agent Definitions

### architecture-analyzer.md

**Purpose**: Analyzes codebase structure and dependencies using AST patterns and import analysis.

**Allowed Tools**: Read, Grep, Glob, Bash

**Responsibilities**:

- Initial codebase inventory with verification loop
- Dependency graph construction
- Security and quality baseline establishment

**Output**: Updates `architecture-analysis` phase in checkpoint file with findings including:

- Total files and source file list
- Export catalog
- Internal and external dependencies
- Security concerns and dynamic imports

### validation-runner.md

**Purpose**: Sets up and runs validation harness including type checking, linting, and test suite execution.

**Allowed Tools**: Read, Write, Bash, Glob, Grep

**Responsibilities**:

- Type checking infrastructure setup
- Linting rules configuration
- Test harness as ground truth
- Self-correction loop protocol

**Output**: Updates `validation-harness` phase with gate results:

- Type check status (tsc)
- Linting status (eslint)
- Test status (jest) with coverage

### documentation-generator.md

**Purpose**: Generates and validates comprehensive documentation including per-directory READMEs and file-level documentation.

**Allowed Tools**: Read, Write, Grep, Bash, Glob

**Responsibilities**:

- Per-directory README generation with validation
- File-level purpose documentation with cross-validation
- Navigation-optimized structure
- Documentation accuracy validation

**Output**: Updates `documentation` phase with:

- List of documented files
- Validation results (files documented, cross-references verified, discrepancies found/corrected)

### modernization-planner.md

**Purpose**: Generates verified modernization plans with task breakdown, dependency validation, and risk assessment.

**Allowed Tools**: Read, Grep, Glob, Bash

**Responsibilities**:

- Task breakdown with dependency validation
- Risk assessment with historical validation
- Rollback procedure creation
- Verification protocol execution

**Output**: Updates `modernization-plan` phase with:

- Task list with dependencies and acceptance criteria
- Risk assessment with evidence
- Mitigation strategies

## Chain-of-Verification Protocol

All agents follow the CoVe protocol:

```
1. Generate initial output/analysis
2. Create verification questions
3. Answer questions against actual code (using tools)
4. Self-correct any discrepancies
5. Only accept output after verification passes
```

## Usage

Agents are invoked by the orchestration command (`/modernize-brownfield`) or can be referenced directly:

```
"Use the architecture-analyzer agent to analyze the codebase"
"Use the validation-runner agent to set up validation gates"
"Use the documentation-generator agent to create documentation"
"Use the modernization-planner agent to create the modernization plan"
```

## Related Files

- `../.claude/commands/modernize-brownfield.md` - Main orchestration command
- `../.claude/hooks/` - Checkpoint management scripts
- `../.claude/checkpoints/modernization-progress.json` - Progress tracking
- `../../docs/AI-ASSISTED-BROWNFIELD-MODERNIZATION-CHECKLIST.md` - Reference documentation
