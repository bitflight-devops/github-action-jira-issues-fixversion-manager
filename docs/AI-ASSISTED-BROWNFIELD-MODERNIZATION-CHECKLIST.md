# AI-Assisted Brownfield Modernization Checklist

> A comprehensive guide for systematic, validated AI-assisted modernization of brownfield projects incorporating advanced prompt engineering techniques including Chain-of-Verification (CoVe), self-correction loops, and validation harnesses.

## Overview

This checklist enables systematic AI-assisted modernization where the AI developer self-corrects through continuous validation, produces accurate architectural understanding, generates comprehensive modernization plans, and creates navigable documentation that eliminates ambiguity for human development teams.

### Key Techniques Used

- **Chain-of-Verification (CoVe)**: AI generates initial response, then generates verification questions, answers them, and produces final verified output
- **Self-correction loops**: AI validates its own outputs against ground truth (test results, type checks, linting)
- **Prompt harnesses**: Structured frameworks that enforce validation steps before accepting AI outputs
- **Iterative validation cycles**: Continuous questioning and validation to eliminate hallucinations

---

## Phase 1: Repository Analysis & Baseline Establishment

### 1.1 Initial Codebase Inventory with Verification Loop

**Best Practice:** Use AST parsing to catalog all code entities, then verify completeness through cross-referencing

**Example:**

```
Step 1 (Analysis): Parse repository with tree-sitter/AST tools
- Generate inventory: 247 functions, 89 classes, 34 modules

Step 2 (Verification Questions):
- Are there any dynamic imports not captured by static AST?
- Do file counts match directory traversal results?
- Are generated/build files excluded from analysis?

Step 3 (Verification Execution):
- Run: find . -name "*.py" | wc -l → Compare with AST file count
- Check import statements for exec() or __import__() patterns
- Validate .gitignore exclusions applied

Step 4 (Corrected Output):
- Actual inventory: 247 functions, 89 classes, 34 modules, 12 dynamic imports flagged for manual review
```

### 1.2 Dependency Graph Construction with CodeQL Validation

**Best Practice:** Build dependency graph, then validate against CodeQL queries for hidden dependencies

**Example:**

```
Step 1 (Initial Graph): Create dependency map using import analysis
Module A → Module B → Module C

Step 2 (CodeQL Verification):
codeql query run --database=./codeql-db \
  --query="import python \
           from Import i \
           select i.getEnclosingModule(), i.getImportedModule()"

Step 3 (Self-Correction):
- CodeQL reveals: Module A also has runtime dependency on Module D via getattr()
- Updated graph: Module A → [Module B, Module D*] → Module C
- Flag D* as runtime dependency requiring integration testing
```

### 1.3 Security & Quality Baseline with Fact-Checking

**Best Practice:** Run CodeQL security queries, verify findings against false-positive database

**Example:**

```
Step 1 (Scan): codeql analyze --format=sarif-latest
- Result: 23 SQL injection vulnerabilities detected

Step 2 (Verification Loop):
- For each finding, check if parameterized queries exist
- Cross-reference with ORM usage patterns
- Test: Run actual SQL injection attempt in isolated environment

Step 3 (Validated Output):
- 23 findings → 8 true positives, 15 false positives (ORM-protected)
- Document: "8 SQL injection points require parameterization in auth.py:45, users.py:123..."
```

---

## Phase 2: Validation Harness Setup

### 2.1 Type Checking Infrastructure with Self-Correction

**Best Practice:** Implement strict type checking, use failures as ground truth for AI corrections

**Example:**

```
Step 1 (Setup): Add mypy with strict configuration
[mypy]
strict = true
warn_return_any = true
disallow_untyped_defs = true

Step 2 (AI Adds Types): AI suggests type annotations
def process_data(data):  # Before
def process_data(data: List[Dict[str, Any]]) -> pd.DataFrame:  # After

Step 3 (Validation Loop):
- Run: mypy src/
- Error: "Argument 1 has incompatible type List[Dict[str, str]]"
- AI Self-Correction: Analyze actual data flow
- Corrected: def process_data(data: List[Dict[str, Union[str, int]]]) -> pd.DataFrame:

Step 4 (Verify): mypy passes → Accept change
```

### 2.2 Linting Rules as Validation Gates

**Best Practice:** Configure linters as automatic hallucination detectors

**Example:**

```
Step 1 (Configure): .pylintrc with project-specific rules
[MESSAGES CONTROL]
enable=all
disable=locally-disabled

Step 2 (AI Refactors Code):
# AI suggests:
def calculate_total(items):
    sum = 0  # Shadows built-in
    for item in items:
        sum += item.price
    return sum

Step 3 (Linting Catches Error):
pylint src/calculator.py
→ W0622: Redefining built-in 'sum'

Step 4 (AI Self-Correction):
def calculate_total(items):
    total = 0
    for item in items:
        total += item.price
    return total
```

### 2.3 Test Harness as Ground Truth

**Best Practice:** Existing tests must pass; new code requires tests before acceptance

**Example:**

```
Step 1 (Baseline): Run existing test suite
pytest tests/ --cov=src
→ 156 passed, 12 failed, 67% coverage

Step 2 (AI Refactors Module):
# AI modernizes authentication.py

Step 3 (Validation Gate):
pytest tests/test_authentication.py
→ 8 passed, 4 failed

Step 4 (Self-Correction Loop):
- AI analyzes failures: "Expected bcrypt, code uses argon2"
- AI checks git history: "Migration to argon2 in commit abc123"
- AI corrects refactoring to preserve argon2
- Rerun: 12 passed, 0 failed → Accept change

Step 5 (New Test Requirement):
- AI adds new feature: rate limiting
- Validation gate: "No tests found for rate_limiter.py"
- AI generates tests before feature accepted
```

---

## Phase 3: Architecture Documentation with Verification

### 3.1 System Architecture Mapping with Cross-Validation

**Best Practice:** Generate architecture diagrams, validate against actual runtime behavior

**Example:**

```
Step 1 (Static Analysis): AI analyzes imports and class relationships
Generated architecture:
[Web Layer] → [Service Layer] → [Data Layer]

Step 2 (Verification Questions):
- Does runtime behavior match static structure?
- Are there circular dependencies?
- Do deployment boundaries align with logical boundaries?

Step 3 (Runtime Validation):
- Add logging to trace actual call paths
- Run integration tests with call graph profiling
- Result: Service Layer directly calls Database in 3 locations (bypasses Data Layer)

Step 4 (Corrected Architecture):
[Web Layer] → [Service Layer] ⇄ [Data Layer]
                ↓ (3 legacy paths - marked for refactoring)
            [Database]
```

### 3.2 Component Relationship Documentation with Fact-Checking

**Best Practice:** Document each component's purpose, validate against actual usage

**Example:**

```
Step 1 (AI Documentation):
"UserService: Handles user authentication and profile management"

Step 2 (Verification):
- Grep codebase: grep -r "UserService" --include="*.py"
- Find actual usage: Also handles email notifications, password resets, session management

Step 3 (Self-Correction):
"UserService: Manages user lifecycle including authentication, profile management,
session handling, password resets, and user-related email notifications.
Note: Email functionality should be extracted to NotificationService (see issue #234)"

Step 4 (Cross-Reference):
- Check issue tracker: Issue #234 exists and confirms planned refactoring
- Validate: Documentation now matches reality + planned improvements
```

---

## Phase 4: Modernization Planning with Validation

### 4.1 Task Breakdown with Dependency Validation

**Best Practice:** Generate task list, validate dependencies through build simulation

**Example:**

```
Step 1 (AI Task Generation):
Task 1: Upgrade Python 3.7 → 3.11
Task 2: Migrate unittest → pytest
Task 3: Add type hints
Task 4: Update dependencies

Step 2 (Dependency Verification):
- Question: Can we upgrade Python before updating dependencies?
- Simulate: Create test branch, attempt Python upgrade
- Result: 12 dependencies incompatible with Python 3.11

Step 3 (Corrected Task Order):
Task 1: Audit dependencies for Python 3.11 compatibility
Task 2: Update/replace incompatible dependencies
Task 3: Upgrade Python 3.7 → 3.11
Task 4: Migrate unittest → pytest (benefits from Python 3.11 features)
Task 5: Add type hints (use Python 3.11 syntax)

Step 4 (Validation):
- Each task includes rollback plan
- Each task has acceptance criteria with automated tests
```

### 4.2 Risk Assessment with Historical Validation

**Best Practice:** Identify high-risk changes, validate risk level against similar past changes

**Example:**

```
Step 1 (AI Risk Assessment):
"Refactoring authentication system: Medium Risk"

Step 2 (Verification Questions):
- What was the impact of previous auth changes?
- How many systems depend on current auth implementation?
- What is test coverage for auth module?

Step 3 (Historical Analysis):
- Git log: Last auth change (2 years ago) caused 3-day outage
- Dependency scan: 47 modules import authentication
- Coverage: 34% (below project average of 67%)

Step 4 (Corrected Risk Assessment):
"Refactoring authentication system: HIGH RISK
- Previous auth changes caused production outages
- 47 dependent modules require regression testing
- Test coverage must increase to 90% before refactoring
- Requires feature flag for gradual rollout
- Plan: 6-week timeline with 2-week parallel run period"
```

---

## Phase 5: CI/CD Pipeline Development with Validation

### 5.1 Pipeline Design with Failure Simulation

**Best Practice:** Design pipeline stages, validate by simulating failure scenarios

**Example:**

```
Step 1 (AI Pipeline Design):
stages:
  - lint
  - test
  - build
  - deploy

Step 2 (Verification Questions):
- What happens if linting fails but tests pass?
- Can we deploy if build succeeds but tests are skipped?
- How do we handle flaky tests?

Step 3 (Failure Simulation):
- Introduce intentional lint error → Pipeline should stop
- Skip test stage → Pipeline should fail
- Test: 1 flaky test fails → Entire deployment blocked

Step 4 (Corrected Pipeline):
stages:
  - lint (blocking)
  - security-scan (blocking)
  - unit-tests (blocking, retry flaky tests 3x)
  - integration-tests (blocking)
  - build (blocking)
  - smoke-tests (blocking)
  - deploy-staging (manual approval)
  - deploy-production (manual approval + 4-eyes)

validation:
  - All stages must explicitly pass (no skips allowed)
  - Flaky tests isolated and tracked in separate job
```

### 5.2 Docker Build Optimization with Validation

**Best Practice:** Create Docker images, validate build reproducibility and layer caching

**Example:**

```
Step 1 (AI Dockerfile):
FROM python:3.11
COPY . /app
RUN pip install -r requirements.txt

Step 2 (Verification):
- Build twice: Compare image hashes
- Result: Different hashes (non-reproducible)
- Check: pip installs latest versions, not pinned

Step 3 (Self-Correction):
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY . /app
WORKDIR /app

Step 4 (Validation):
- Build twice: Hashes match ✓
- Test layer caching: Change source code, only final layer rebuilds ✓
- Verify: docker history shows optimized layers ✓
```

---

## Phase 6: Review Cycles & Hallucination Detection

### 6.1 Code Review with Fact-Checking Protocol

**Best Practice:** AI-generated code must pass multi-stage verification before human review

**Example:**

```
Step 1 (AI Generates Code):
def fetch_user_data(user_id: int) -> Dict:
    """Fetches user data from database."""
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query).fetchone()

Step 2 (Automated Verification Gates):
Gate 1 - Linting: ✓ Passes
Gate 2 - Type Checking: ✓ Passes
Gate 3 - Security Scan (CodeQL): ✗ FAILS
  → SQL injection vulnerability detected

Step 3 (AI Self-Correction):
def fetch_user_data(user_id: int) -> Optional[Dict[str, Any]]:
    """Fetches user data from database using parameterized query."""
    query = "SELECT * FROM users WHERE id = ?"
    result = db.execute(query, (user_id,)).fetchone()
    return dict(result) if result else None

Step 4 (Re-verification):
Gate 1 - Linting: ✓ Passes
Gate 2 - Type Checking: ✓ Passes
Gate 3 - Security Scan: ✓ Passes
Gate 4 - Unit Tests: ✓ New tests pass
→ Now ready for human review
```

### 6.2 Documentation Accuracy Validation

**Best Practice:** Cross-reference documentation claims against actual code behavior

**Example:**

```
Step 1 (AI Documentation):
"The caching layer uses Redis with a 1-hour TTL for all user queries."

Step 2 (Verification Protocol):
- Grep for Redis config: grep -r "REDIS" config/
- Check TTL settings: grep -r "ttl\|expire" src/cache/
- Find actual values: TTL varies by query type (5min to 24hrs)

Step 3 (Self-Correction):
"The caching layer uses Redis with variable TTL based on data type:
- User profile queries: 1 hour (3600s)
- User preferences: 24 hours (86400s)
- Session data: 5 minutes (300s)
Configuration: config/cache_settings.py:15-23"

Step 4 (Validation):
- Code reference check: File and line numbers correct ✓
- Value verification: TTL values match code ✓
```

### 6.3 Hallucination Detection Checklist

**Best Practice:** Apply systematic checks for common AI hallucination patterns

**Example:**

```
Hallucination Detection Protocol:

1. Dependency Claims:
   ✗ AI: "This project uses FastAPI"
   ✓ Verify: grep -r "fastapi" requirements.txt
   → Not found → Hallucination detected

2. Version Claims:
   ✗ AI: "Upgraded to PostgreSQL 14"
   ✓ Verify: docker-compose.yml shows postgres:12
   → Hallucination detected

3. Feature Claims:
   ✗ AI: "Authentication supports OAuth2"
   ✓ Verify: grep -r "oauth" src/
   → No OAuth implementation found → Hallucination detected

4. Performance Claims:
   ✗ AI: "Optimized query reduces load time by 50%"
   ✓ Verify: Run benchmark tests before/after
   → Actual improvement: 12% → Hallucination detected

5. Test Coverage Claims:
   ✗ AI: "Added tests bring coverage to 85%"
   ✓ Verify: pytest --cov=src
   → Actual coverage: 72% → Hallucination detected

Validation Rule: Any claim must be verifiable through:
- Code inspection
- Test execution
- Benchmark measurement
- Documentation cross-reference
```

---

## Phase 7: Comprehensive Documentation Generation

### 7.1 Per-Directory README with Validation

**Best Practice:** Generate contextual README for each directory, validate against actual directory contents

**Example:**

````
Step 1 (AI Generates): src/services/README.md
"# Services Layer
Contains business logic services.

## Files:
- user_service.py: User management
- auth_service.py: Authentication"

Step 2 (Verification):
- List actual files: ls src/services/
  → user_service.py, auth_service.py, email_service.py, payment_service.py

Step 3 (Self-Correction):
"# Services Layer
Contains business logic services that orchestrate data access
and implement core application functionality.

## Architecture
Services follow the dependency injection pattern and are registered in `__init__.py`.

## Files

### user_service.py
**Purpose**: User lifecycle management including registration, profile updates,
and account deletion.
**Key Classes**: `UserService`
**Dependencies**: `UserRepository`, `EmailService`
**Usage Example**:
```python
from services import UserService
user_service = UserService(db_session)
user = user_service.create_user(email="test@example.com")
````

### auth_service.py

**Purpose**: Authentication and authorization using JWT tokens.
**Key Classes**: `AuthService`, `TokenManager`
**Dependencies**: `UserRepository`, `Redis` (for token blacklisting)

### email_service.py

**Purpose**: Email notification delivery via SendGrid API.
**Key Classes**: `EmailService`
**Dependencies**: `SendGrid` (external), `TemplateEngine`
**Configuration**: Requires SENDGRID_API_KEY in environment

### payment_service.py

**Purpose**: Payment processing integration with Stripe.
**Key Classes**: `PaymentService`, `StripeAdapter`
**Dependencies**: `stripe` library, `PaymentRepository`
**Security Note**: PCI compliance requirements documented in docs/security/pci-compliance.md

## Testing

Run service tests: `pytest tests/services/ -v`
Coverage requirement: >80% for all services

## Adding New Services

1. Inherit from `BaseService` class
2. Implement required interface methods
3. Add dependency injection in `__init__.py`
4. Create corresponding test file in `tests/services/`
5. Update this README"

Step 4 (Validation):

- File count matches: ✓
- Import statements verified: ✓
- Test command works: ✓
- Cross-references valid: ✓

```

### 7.2 File-Level Purpose Documentation with Cross-Validation

**Best Practice:** Document each file's purpose, validate against imports and usage

**Example:**

```

Step 1 (AI Documents): src/utils/validators.py
"Purpose: Input validation utilities"

Step 2 (Deep Verification):

- Analyze imports: What does this file import?
  → re, typing, email_validator
- Analyze exports: What do other files import from this?
  → validate_email, validate_phone, validate_password, sanitize_input
- Check usage: grep -r "from utils.validators import" src/
  → Used in: forms.py, api/endpoints.py, services/user_service.py

Step 3 (Comprehensive Documentation):
"# validators.py

## Purpose

Provides input validation and sanitization utilities used across the application
to ensure data integrity and security.

## Key Functions

### validate_email(email: str) -> bool

Validates email format using RFC 5322 standards via email-validator library.
**Used by**: User registration (forms.py:45), API endpoints (api/endpoints.py:123)
**Returns**: True if valid, raises ValidationError if invalid

### validate_phone(phone: str, country_code: str = 'US') -> str

Validates and normalizes phone numbers to E.164 format.
**Used by**: User profile updates (services/user_service.py:234)
**Returns**: Normalized phone string or raises ValidationError

### validate_password(password: str) -> Tuple[bool, List[str]]

Enforces password policy: min 12 chars, uppercase, lowercase, number, special char.
**Used by**: Registration and password reset flows
**Returns**: (is_valid, list_of_violations)

### sanitize_input(text: str, allow_html: bool = False) -> str

Removes potentially dangerous characters and optionally strips HTML.
**Used by**: All user-generated content processing
**Security**: Prevents XSS attacks - see docs/security/input-sanitization.md

## Dependencies

- email-validator: ^2.0.0 (external)
- re: standard library
- typing: standard library

## Testing

Tests located in: tests/utils/test_validators.py
Run: `pytest tests/utils/test_validators.py -v`
Coverage: 94%

## Security Considerations

This module is security-critical. All changes require security review.
See: docs/security/validation-requirements.md"

Step 4 (Validation):

- All function signatures verified against actual code: ✓
- Import statements confirmed: ✓
- Usage locations checked: ✓
- Test file exists and runs: ✓
- Coverage percentage verified: ✓

```

### 7.3 Navigation-Optimized Documentation Structure

**Best Practice:** Ensure every directory in GitHub has README visible when browsing

**Example:**

```

Step 1 (Directory Structure Audit):
src/
├── api/
│ ├── endpoints/
│ │ └── (no README) ✗
│ └── README.md ✓
├── services/
│ └── README.md ✓
├── models/
│ └── (no README) ✗
└── utils/
└── README.md ✓

Step 2 (AI Generates Missing READMEs):
For src/api/endpoints/ (contains: users.py, auth.py, payments.py):

"# API Endpoints

This directory contains FastAPI route handlers organized by domain.

## Structure

Each file defines routes for a specific domain:

- `users.py`: User management endpoints (/api/users/\*)
- `auth.py`: Authentication endpoints (/api/auth/\*)
- `payments.py`: Payment processing endpoints (/api/payments/\*)

## Route Registration

All endpoints are automatically registered in `src/api/__init__.py` via:

```python
from api.endpoints import users, auth, payments
app.include_router(users.router, prefix="/api/users")
```

## Endpoint Documentation

- Interactive API docs: http://localhost:8000/docs (Swagger UI)
- OpenAPI spec: http://localhost:8000/openapi.json

## Adding New Endpoints

1. Create new file: `src/api/endpoints/domain.py`
2. Define router: `router = APIRouter(tags=["domain"])`
3. Add endpoints with proper decorators and type hints
4. Register in `src/api/__init__.py`
5. Add tests in `tests/api/endpoints/test_domain.py`

## Authentication

Most endpoints require JWT authentication. See `auth.py:get_current_user()` dependency.

## Testing

````bash
pytest tests/api/endpoints/ -v
```"

Step 3 (Validation):
- Navigate GitHub UI: Every directory now shows README ✓
- Links work: All cross-references valid ✓
- Commands tested: All example commands execute successfully ✓
- No ambiguity: Purpose of each file clearly stated ✓
````

---

## Phase 8: Continuous Validation Loop

### 8.1 Pre-Commit Validation Harness

**Best Practice:** Implement automated validation before any code is committed

**Example:**

```yaml
# .pre-commit-config.yaml

repos:
  - repo: local
    hooks:
      - id: type-check
        name: Type Checking (mypy)
        entry: mypy src/
        language: system
        pass_filenames: false

      - id: lint
        name: Linting (pylint)
        entry: pylint src/
        language: system
        pass_filenames: false

      - id: security-scan
        name: Security Scan (bandit)
        entry: bandit -r src/
        language: system
        pass_filenames: false

      - id: test-affected
        name: Run Affected Tests
        entry: pytest tests/ --co -q | xargs pytest
        language: system
        pass_filenames: false
```

**Validation Flow:**

1. Developer commits code
2. Pre-commit hook triggers all checks
3. Any failure blocks commit
4. Developer sees specific error
5. Developer fixes issue
6. Retry commit → Success only when all checks pass

This creates automatic self-correction loop before code enters repository.

### 8.2 Documentation Drift Detection

**Best Practice:** Automatically detect when code changes make documentation inaccurate

**Example:**

```python
# scripts/detect_doc_drift.py

def check_function_signatures():
    """Verify documented function signatures match actual code."""
    for readme in find_all_readmes():
        documented_functions = extract_function_docs(readme)
        for func_name, doc_signature in documented_functions:
            actual_signature = inspect_source_code(func_name)
            if doc_signature != actual_signature:
                report_drift(func_name, doc_signature, actual_signature)
```

**CI Integration:**

```yaml
# .github/workflows/doc-validation.yml
- name: Check Documentation Drift
  run: python scripts/detect_doc_drift.py
```

**Example Detection:**

```
Drift Detected:
File: src/services/README.md
Function: UserService.create_user()
Documented: create_user(email: str) -> User
Actual: create_user(email: str, send_welcome: bool = True) -> User
→ Documentation outdated, parameter added
```

**Auto-Correction Trigger:**

1. CI fails with drift report
2. AI regenerates affected documentation section
3. Creates PR with documentation updates
4. Human reviews and approves

---

## Quick Reference: Validation Commands

| Phase         | Tool       | Command                                | Purpose                    |
| ------------- | ---------- | -------------------------------------- | -------------------------- |
| Analysis      | AST        | `tree-sitter parse src/`               | Code structure inventory   |
| Analysis      | CodeQL     | `codeql analyze --format=sarif-latest` | Security baseline          |
| Validation    | Type Check | `mypy src/ --strict`                   | Type safety validation     |
| Validation    | Lint       | `pylint src/` or `eslint src/`         | Code quality gates         |
| Validation    | Test       | `pytest tests/ --cov=src`              | Ground truth verification  |
| CI/CD         | Docker     | `docker build --no-cache .`            | Build reproducibility      |
| Documentation | Grep       | `grep -r "pattern" src/`               | Cross-reference validation |

---

## Summary: The Self-Correction Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI SELF-CORRECTION CYCLE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌──────────┐     ┌──────────┐     ┌──────────┐              │
│    │ Generate │ ──▶ │ Verify   │ ──▶ │ Correct  │              │
│    │ Output   │     │ Against  │     │ Based on │              │
│    │          │     │ Ground   │     │ Evidence │              │
│    └──────────┘     │ Truth    │     └────┬─────┘              │
│         ▲           └──────────┘          │                     │
│         │                                 │                     │
│         └─────────── Loop ◀───────────────┘                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Ground Truth Sources:                                           │
│  • Test suite results (pytest, jest)                            │
│  • Type checker output (mypy, tsc)                              │
│  • Linter findings (pylint, eslint)                             │
│  • Security scans (CodeQL, bandit)                              │
│  • Actual file contents (grep, AST)                             │
│  • Runtime behavior (integration tests)                          │
│  • Git history (version verification)                            │
└─────────────────────────────────────────────────────────────────┘
```

This systematic approach ensures AI-assisted modernization produces accurate, validated outputs that human developers can trust and build upon.
