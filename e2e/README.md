# Packaged FixVersion action E2E tests

CI prepares a real Jira Data Center instance through the shared fixture action in `bitflight-devops/github-action-jira-transition-manager/e2e/jira`, pinned to a reviewed commit in `.github/workflows/e2e-jira.yml`. That action owns official images, PostgreSQL, setup, baseline seeding, validated database/home snapshots, fresh-volume restore, and caching. See [its fixture documentation](https://github.com/bitflight-devops/github-action-jira-transition-manager/tree/main/e2e/jira).

## Behavior gates

The suite runs the built `dist/index.js` in a separate Node process with real GitHub input, event, workspace, and output files. It verifies:

- Existing versions are reused by exact Jira ID.
- Versions already assigned to an issue are preserved.
- One missing version is created for multiple concurrent issue updates.
- Duplicate input keys and a rerun in a fresh process do not create duplicate versions or assignments.
- A real Jira error produces a failing process when `fail_on_error` is enabled.

The API helper arranges unique issues/versions and reads resulting state; it does not perform the update being tested. A separate native `uses: ./` invocation must also add an existing version while preserving a prior version. Assertions fail the job, and test failure never triggers environment rebuilding.

## Run against a prepared fixture

Use Node 24.19+, Yarn 1.22.22, Docker Compose, and the shared fixture revision pinned by the workflow. The fixture documentation has setup commands for a local checkout. Once it is running:

```bash
yarn install --frozen-lockfile
yarn build
E2E_JIRA_BASE_URL=http://127.0.0.1:8080 yarn e2e:test
```

The default test account is `admin` / `admin`, project `E2E`, issue type `Task`. The project must permit editing Fix Version/s. The fixture creates this configuration before saving its baseline. Tests use synthetic data; CI removes the containers and writable volumes after completion. Follow the shared fixture's cleanup command after local tests.

The lane verifies Jira Data Center REST v2 integration. Jira Cloud behavior needs a real Cloud test site.
