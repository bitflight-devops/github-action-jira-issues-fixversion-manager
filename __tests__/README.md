# Tests Directory

This directory contains Jest test suites for the GitHub Action.

## Test Files

### index.test.ts

**Purpose**: Integration tests for the main action functionality.

**Test Suite**: `jira ticket transition`

**Tests**:

1. **`sets defaults`** - Verifies that input parsing correctly retrieves default values and Jira configuration.

2. **`GitHub Event: pull_request`** - Integration test that:
   - Simulates a pull_request event
   - Sets up mock inputs for issues and fix versions
   - Executes the full action flow
   - Verifies successful completion

## Test Configuration

### Prerequisites

The tests require the following environment variables:

| Variable            | Description                       |
| ------------------- | --------------------------------- |
| `JIRA_BASE_URL`     | Jira instance URL                 |
| `JIRA_API_TOKEN`    | Jira API token                    |
| `JIRA_USER_EMAIL`   | Jira user email                   |
| `GITHUB_TOKEN`      | GitHub token                      |
| `GITHUB_REPOSITORY` | Repository in format `owner/repo` |

### Mocked Dependencies

The test suite mocks the following:

- `@actions/core`:

  - `getInput()` - Returns values from test `inputs` object
  - `getBooleanInput()` - Parses boolean inputs
  - `error()`, `warning()`, `info()`, `debug()` - Log to console

- `@actions/github`:

  - `context.repo` - Returns mock owner/repo
  - `context.ref` - Set to test branch
  - `context.sha` - Set to test commit SHA
  - `context.eventName` - Set per test
  - `context.payload` - Set per test

- `fs-helper`:
  - `directoryExistsSync()` - Returns true for test workspace

### Test Workspace

Tests use a mock workspace at `/checkout-tests/workspace`.

## Running Tests

```bash
# Run all tests
npm test
# or
yarn test

# Run with coverage
npm test -- --coverage
# or
yarn test --coverage

# Run specific test file
npm test -- __tests__/index.test.ts
# or
yarn test __tests__/index.test.ts

# Run in watch mode
npm test -- --watch
# or
yarn test --watch
```

## Test Timeout

Tests have a 50-second timeout (`jest.setTimeout(50_000)`) to accommodate API calls to Jira.

## Jest Configuration

Configuration is in `jest.config.ts`:

```typescript
// Relevant settings
{
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
}
```

## Writing New Tests

When adding new tests:

1. **Mock Setup**: Add any new inputs to the `inputs` object in `beforeEach`:

   ```typescript
   beforeEach(() => {
     inputs = {};
     inputs.token = process.env.GITHUB_TOKEN;
     inputs.new_input = 'value';
   });
   ```

2. **GitHub Context**: Set the appropriate event name and payload:

   ```typescript
   github.context.eventName = 'push';
   github.context.payload = {
     /* event payload */
   };
   ```

3. **Assertions**: Verify expected behavior:
   ```typescript
   const settings = inputHelper.getInputs();
   expect(settings.fixVersions).toContain('expected-version');
   ```

## Test Coverage Areas

Current coverage includes:

- Input parsing and validation
- Action execution flow
- Pull request event handling

Recommended additional coverage:

- Unit tests for `Jira.ts` methods
- Unit tests for `Issue.ts` methods
- Unit tests for `EventManager.ts` filtering logic
- Error handling scenarios
- Edge cases (empty inputs, malformed issue keys)

## Related Files

- `jest.config.ts` - Jest configuration
- `src/input-helper.ts` - Input parsing (tested)
- `src/action.ts` - Action class (tested)
- `src/fs-helper.ts` - Mocked in tests
