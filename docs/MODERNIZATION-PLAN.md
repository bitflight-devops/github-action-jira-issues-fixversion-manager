# Modernization Plan

## github-action-jira-issues-fixversion-manager

**Generated**: 2026-01-19
**Phase**: 4 - Modernization Planning with Validation

---

## Executive Summary

This modernization plan addresses critical updates needed for the `github-action-jira-issues-fixversion-manager` GitHub Action. The primary focus areas are:

1. **Critical**: Upgrade from deprecated `node16` runtime to `node20`
2. **High Priority**: Update TypeScript and major dependencies
3. **Medium Priority**: Improve test coverage and CI/CD workflows
4. **Low Priority**: Code quality improvements and documentation

The current codebase is functional but uses deprecated runtimes and outdated dependencies from late 2022. Without modernization, the action will fail when GitHub deprecates node16 support entirely.

---

## Current State Analysis

### Technology Stack

| Component       | Current Version | Target Version   | Risk Level |
| --------------- | --------------- | ---------------- | ---------- |
| Node.js Runtime | node16          | node20           | CRITICAL   |
| Node.js Engine  | >=16.10.0       | >=20.0.0         | High       |
| TypeScript      | ^4.8.4          | ^5.3.x           | Medium     |
| @actions/core   | ^1.10.0         | ^1.10.x (latest) | Low        |
| @actions/github | ^5.1.1          | ^6.x             | Medium     |
| ESLint          | ^8.26.0         | ^9.x             | Medium     |
| Prettier        | ^2.7.1          | ^3.x             | Low        |
| Jest            | ^29.2.2         | ^29.x (latest)   | Low        |

### Architecture Overview

```
src/
├── index.ts          # Entry point - Action execution
├── action.ts         # Action class - Orchestrates execution
├── EventManager.ts   # Event handling and issue processing
├── Jira.ts          # JIRA API client wrapper (4 dependents)
├── Issue.ts         # Issue model and operations (2 dependents)
├── input-helper.ts  # Input parsing from GitHub Action inputs
├── fs-helper.ts     # Filesystem utilities
├── utils.ts         # General utilities
└── @types/          # TypeScript type definitions
```

### Dependency Graph

```
index.ts
    └── action.ts
        ├── EventManager.ts
        │   ├── Issue.ts
        │   │   ├── Jira.ts
        │   │   └── utils.ts
        │   ├── Jira.ts
        │   └── utils.ts
        └── Jira.ts
            └── utils.ts
```

### Test Coverage

- **Current Test Files**: 1 (`__tests__/index.test.ts`)
- **Coverage Estimate**: ~20-30% (integration test only)
- **Missing Tests**: Unit tests for Jira.ts, Issue.ts, EventManager.ts, utils.ts

---

## Task List with Dependencies

### Task Dependency Diagram

```
[Task 1: Audit Dependencies] ──────┐
                                   │
[Task 2: Update Minor Deps] ◄──────┤
                                   │
[Task 3: Upgrade TypeScript] ◄─────┤
                                   │
[Task 4: Upgrade Node Runtime] ◄───┤
                                   │
[Task 5: Update CI Workflows] ◄────┘
                                   │
[Task 6: Add Unit Tests] ──────────┤ (parallel-safe)
                                   │
[Task 7: Update ESLint Config] ◄───┤
                                   │
[Task 8: Update Documentation] ◄───┘
```

---

## Detailed Task Breakdown

### Task 1: Audit Dependencies for Compatibility

**ID**: 1
**Priority**: CRITICAL
**Dependencies**: None (starting task)
**Risk Level**: Low
**Risk Evidence**: Audit-only task, no code changes
**Parallel Safe**: Yes

**Description**:
Audit all dependencies for Node 20 compatibility and identify breaking changes.

**Acceptance Criteria**:

- [ ] Run `npm outdated` or `yarn outdated` to list outdated packages
- [ ] Check each major dependency for Node 20 compatibility
- [ ] Document any breaking changes in major version upgrades
- [ ] Create list of dependencies that need version pinning

**Rollback Procedure**:
N/A - No changes made, audit only.

**Estimated Effort**: 1-2 hours

---

### Task 2: Update Minor and Patch Dependencies

**ID**: 2
**Priority**: High
**Dependencies**: [1]
**Risk Level**: Low
**Risk Evidence**: Minor/patch updates typically maintain backward compatibility
**Parallel Safe**: No (modifies package.json/yarn.lock)

**Description**:
Update all minor and patch version dependencies that don't have breaking changes.

**Acceptance Criteria**:

- [ ] Update dependencies within current major versions
- [ ] Run `yarn install` successfully
- [ ] All existing tests pass
- [ ] Build completes without errors: `yarn build`
- [ ] Linting passes: `yarn lint`

**Rollback Procedure**:

```bash
git checkout HEAD -- package.json yarn.lock
yarn install
```

**Estimated Effort**: 1-2 hours

---

### Task 3: Upgrade TypeScript to v5.x

**ID**: 3
**Priority**: High
**Dependencies**: [2]
**Risk Level**: Medium
**Risk Evidence**:

- TypeScript 5.x has some breaking changes in strict mode
- tsconfig extends node16 config which may need updating
- 8 source files use TypeScript (moderate scope)

**Verification**:

```bash
# Check files affected
find src/ -name "*.ts" | wc -l  # Result: 8 files
```

**Description**:
Upgrade TypeScript from 4.8.x to 5.3.x and update related configurations.

**Sub-tasks**:

1. Update `typescript` dependency to ^5.3.x
2. Update `@tsconfig/node16` to `@tsconfig/node20`
3. Update tsconfig.json settings for TypeScript 5
4. Update @typescript-eslint/\* packages to v6.x (TS5 compatible)
5. Fix any new type errors

**Acceptance Criteria**:

- [ ] TypeScript compiles without errors: `tsc --noEmit`
- [ ] All tests pass: `yarn test`
- [ ] Build succeeds: `yarn build`
- [ ] No new TypeScript errors in IDE

**Rollback Procedure**:

```bash
git checkout HEAD -- package.json yarn.lock tsconfig.json
yarn install
```

**Estimated Effort**: 2-4 hours

---

### Task 4: Upgrade Node Runtime to node20

**ID**: 4
**Priority**: CRITICAL
**Dependencies**: [3]
**Risk Level**: HIGH
**Risk Evidence**:

- GitHub Actions node16 runtime is deprecated (September 2024)
- Breaking change for action consumers
- All source files affected by runtime change
- Requires thorough integration testing

**Historical Context**:

- Commit f4ed270: "upgrade to handle node16" - Previous successful runtime upgrade

**Description**:
Update the GitHub Action runtime from node16 to node20.

**Sub-tasks**:

1. Update `action.yml`: Change `using: 'node16'` to `using: 'node20'`
2. Update `package.json` engines: `"node": ">=20.0.0"`
3. Update tsconfig.json to extend `@tsconfig/node20`
4. Update all workflow files to use `node-version: 20.x`
5. Update keywords in package.json (remove "node12" reference)
6. Test action in real GitHub Actions environment

**Acceptance Criteria**:

- [ ] action.yml uses `node20` runtime
- [ ] package.json engines require Node 20+
- [ ] All tests pass with Node 20
- [ ] Build succeeds with Node 20
- [ ] Action runs successfully in GitHub Actions workflow

**Rollback Procedure**:

```bash
git revert <commit-hash>  # Revert the upgrade commit
# OR manually restore:
git checkout HEAD -- action.yml package.json tsconfig.json
yarn install
```

**Estimated Effort**: 2-3 hours

---

### Task 5: Update CI/CD Workflows

**ID**: 5
**Priority**: Medium
**Dependencies**: [4]
**Risk Level**: Medium
**Risk Evidence**:

- 4 workflow files need updating
- Ubuntu-20.04 runner is deprecated
- actions/checkout@v3 and actions/setup-node@v3 have v4 available

**Verification**:

```bash
# Count workflow files
ls -la .github/workflows/*.yml  # 4 files found
```

**Description**:
Update all GitHub Actions workflows to use latest action versions and runners.

**Sub-tasks**:

1. Update `actions/checkout@v3` to `actions/checkout@v4`
2. Update `actions/setup-node@v3` to `actions/setup-node@v4`
3. Update `runs-on: Ubuntu-20.04` to `runs-on: ubuntu-latest`
4. Update `node-version: 16.x` to `node-version: 20.x`
5. Update any deprecated action versions

**Files to Update**:

- `.github/workflows/publish_action.yml`
- `.github/workflows/push_code_linting.yml`
- `.github/workflows/pull_request_cleanup_tags_and_releases.yml`
- `.github/workflows/create_tag.yml`

**Acceptance Criteria**:

- [ ] All workflows use actions/checkout@v4
- [ ] All workflows use actions/setup-node@v4
- [ ] All workflows use ubuntu-latest or ubuntu-22.04+
- [ ] All workflows specify node-version: 20.x
- [ ] CI/CD pipelines pass on next push

**Rollback Procedure**:

```bash
git checkout HEAD -- .github/workflows/
```

**Estimated Effort**: 1-2 hours

---

### Task 6: Add Unit Tests for Core Modules

**ID**: 6
**Priority**: Medium
**Dependencies**: [4] (can start after runtime stable)
**Risk Level**: Low
**Risk Evidence**: Adding tests doesn't modify production code
**Parallel Safe**: Yes (can run alongside Tasks 5, 7)

**Description**:
Increase test coverage by adding unit tests for untested modules.

**Current State**:

- 1 test file exists with integration-style tests
- Jira.ts has 4 dependents (highest risk)
- Issue.ts has 2 dependents
- utils.ts used across codebase

**Sub-tasks**:

1. Create `__tests__/utils.test.ts` - Test utility functions
2. Create `__tests__/Jira.test.ts` - Test JIRA API wrapper (with mocks)
3. Create `__tests__/Issue.test.ts` - Test Issue class
4. Create `__tests__/EventManager.test.ts` - Test event handling
5. Update Jest configuration for coverage reporting

**Acceptance Criteria**:

- [ ] Test coverage >= 60% for src/ directory
- [ ] All new tests pass: `yarn test`
- [ ] No mocking of @actions/core breaks existing tests
- [ ] Jest coverage report generated

**Rollback Procedure**:

```bash
git checkout HEAD -- __tests__/  # If tests cause issues
```

**Estimated Effort**: 4-6 hours

---

### Task 7: Update ESLint Configuration

**ID**: 7
**Priority**: Low
**Dependencies**: [3]
**Risk Level**: Medium
**Risk Evidence**:

- ESLint 9.x uses new flat config format
- 23+ ESLint plugins currently configured
- May require significant config rewrite

**Description**:
Update ESLint to v9.x and migrate to flat config format.

**Sub-tasks**:

1. Update eslint to ^9.x
2. Migrate .eslintrc.cjs to eslint.config.js (flat config)
3. Update all eslint-plugin-\* packages to ESLint 9 compatible versions
4. Fix any new linting errors
5. Remove deprecated plugins if necessary

**Alternative (Lower Risk)**:
Stay on ESLint 8.x if ESLint 9 migration is too complex. ESLint 8 is still maintained.

**Acceptance Criteria**:

- [ ] ESLint runs without configuration errors
- [ ] All source files pass linting: `yarn lint`
- [ ] No new linting rules break CI

**Rollback Procedure**:

```bash
git checkout HEAD -- .eslintrc.cjs eslint.config.js package.json yarn.lock
yarn install
```

**Estimated Effort**: 3-5 hours (or 1 hour if staying on v8)

---

### Task 8: Update Documentation

**ID**: 8
**Priority**: Low
**Dependencies**: [4, 5, 6]
**Risk Level**: Low
**Risk Evidence**: Documentation changes don't affect functionality
**Parallel Safe**: Yes

**Description**:
Update README and documentation to reflect modernization changes.

**Sub-tasks**:

1. Update README.md with Node 20 requirements
2. Update action.yml description if needed
3. Add CHANGELOG.md entry for breaking changes
4. Update package.json keywords
5. Generate updated documentation with `yarn generate-docs`

**Acceptance Criteria**:

- [ ] README reflects current Node version requirements
- [ ] CHANGELOG documents breaking changes
- [ ] All example workflows use node20

**Rollback Procedure**:

```bash
git checkout HEAD -- README.md CHANGELOG.md
```

**Estimated Effort**: 1-2 hours

---

## Risk Assessment

### Overall Risk: MEDIUM

The modernization involves a critical runtime upgrade (node16 to node20) which is a breaking change, but the codebase is small (8 source files, ~400 lines) and well-structured.

### High-Risk Tasks

| Task                         | Risk Level | Mitigation Strategy                                                                                   |
| ---------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| Task 4: Node Runtime Upgrade | HIGH       | Test thoroughly in staging environment; prepare rollback branch; communicate breaking change to users |
| Task 3: TypeScript Upgrade   | MEDIUM     | Run full type-check after upgrade; review all type errors carefully                                   |
| Task 7: ESLint Migration     | MEDIUM     | Consider staying on v8 if v9 migration is complex                                                     |

### Mitigation Strategies

1. **Branch Strategy**: Create feature branch for each task; use PRs with reviews
2. **Testing**: Run full test suite after each task completion
3. **Rollback Ready**: Each task has documented rollback procedure
4. **Staged Rollout**: Test action in non-production workflow first
5. **Version Bump**: Use semver major version bump (v2.0.0) for breaking changes

---

## Recommended Execution Order

### Phase 1: Foundation (Week 1)

1. Task 1: Audit Dependencies (Day 1)
2. Task 2: Update Minor Dependencies (Day 1-2)
3. Task 3: Upgrade TypeScript (Day 2-3)

### Phase 2: Critical Upgrade (Week 1-2)

4. Task 4: Upgrade Node Runtime (Day 3-4)
5. Task 5: Update CI/CD Workflows (Day 4-5)

### Phase 3: Quality Improvements (Week 2) - Parallel Safe

6. Task 6: Add Unit Tests (Day 5-7)
7. Task 7: Update ESLint Config (Day 6-7) [Optional if staying on v8]

### Phase 4: Documentation (Week 2)

8. Task 8: Update Documentation (Day 7)

### Parallel Execution Map

```
Day 1: [Task 1] ──► [Task 2] ──────────────────────────┐
Day 2:              [Task 2] ──► [Task 3] ─────────────┤
Day 3:                           [Task 3] ──► [Task 4] ┤
Day 4:                                        [Task 4] ┼─► [Task 5]
Day 5:                                        [Task 5] ┼─► [Task 6 START]
Day 6:                                                 ├── [Task 6] + [Task 7]
Day 7:                                                 └── [Task 6] + [Task 8]
```

---

## Success Criteria

### Technical Success

- [ ] Action runs successfully with `node20` runtime
- [ ] All tests pass with Node 20
- [ ] TypeScript compiles without errors
- [ ] CI/CD pipelines all green
- [ ] No security vulnerabilities in dependencies (npm audit clean)

### Quality Success

- [ ] Test coverage >= 60%
- [ ] All linting rules pass
- [ ] Documentation updated

### Process Success

- [ ] Each task has verified rollback procedure
- [ ] Breaking changes communicated to users
- [ ] Semantic version properly bumped (v2.0.0)

---

## Appendix: Verification Commands

```bash
# Verify Node version
node --version  # Should be v20.x

# Verify TypeScript
yarn tsc --version  # Should be 5.x

# Run full test suite
yarn test

# Build project
yarn build

# Run linting
yarn lint

# Check for vulnerabilities
yarn audit

# Verify action.yml
grep "using:" action.yml  # Should show "node20"
```

---

_Document generated by Modernization Planner Agent_
_Phase 4 of AI-Assisted Brownfield Modernization Checklist_
