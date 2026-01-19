# Documentation

This directory contains supplementary documentation for the GitHub Action.

## Contents

| File                                                | Description                                                |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `AI-ASSISTED-BROWNFIELD-MODERNIZATION-CHECKLIST.md` | Comprehensive guide for AI-assisted codebase modernization |

## AI-Assisted Brownfield Modernization Checklist

The modernization checklist provides an 8-phase systematic approach to modernizing legacy codebases with AI assistance. It incorporates advanced techniques including:

- **Chain-of-Verification (CoVe)**: AI generates output, then verifies against ground truth
- **Self-correction loops**: Automated validation against tests, types, and linting
- **Prompt harnesses**: Structured frameworks enforcing validation steps

### Phases Overview

1. **Repository Analysis**: Codebase inventory, dependency graphs, security baseline
2. **Validation Harness Setup**: Type checking, linting, test infrastructure
3. **Architecture Documentation**: System mapping, component relationships
4. **Modernization Planning**: Task breakdown, risk assessment
5. **CI/CD Pipeline Development**: Pipeline design, Docker optimization
6. **Review Cycles**: Code review protocols, hallucination detection
7. **Documentation Generation**: Per-directory READMEs, file-level docs
8. **Continuous Validation**: Pre-commit hooks, documentation drift detection

### Usage with Claude Code

The checklist is designed for use with Claude Code and the `.claude/` configuration:

```bash
# Start modernization process
/modernize-brownfield

# Check progress
.claude/hooks/checkpoint-read.sh --summary
```

See `.claude/README.md` for detailed usage instructions.

## Main Documentation

The primary documentation for using this GitHub Action is in the root `README.md`, which includes:

- Action usage examples
- Input parameters reference
- Configuration options

## Contributing Documentation

When adding documentation:

1. Use Markdown format (`.md` extension)
2. Include a table of contents for longer documents
3. Provide code examples where applicable
4. Keep line lengths reasonable for readability
5. Update this README with new file descriptions

## Related Files

- `/README.md` - Main action documentation
- `/.claude/README.md` - Claude Code configuration guide
- `/src/README.md` - Source code documentation
