import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { parse } from 'yaml';

import type { E2EConfig } from '../scripts/e2e-config';

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

/** Execute the shipped entry point with the same input and file conventions as a GitHub Actions runner. */
export async function runAction(config: E2EConfig, issues: string[], fixVersions: string[]) {
  const manifest = parse(await readFile(join(repositoryRoot, 'action.yml'), 'utf8')) as {
    runs?: { main?: string };
  };
  if (!manifest.runs?.main) {
    throw new Error('action.yml must declare the packaged action entry point');
  }
  const entryPoint = resolve(repositoryRoot, manifest.runs.main);
  const runnerDirectory = await mkdtemp(join(tmpdir(), 'fixversion-action-e2e-'));

  try {
    const workspace = join(runnerDirectory, 'workspace');
    await mkdir(workspace);
    const files = {
      GITHUB_OUTPUT: join(runnerDirectory, 'output'),
      GITHUB_ENV: join(runnerDirectory, 'env'),
      GITHUB_PATH: join(runnerDirectory, 'path'),
      GITHUB_STATE: join(runnerDirectory, 'state'),
      GITHUB_STEP_SUMMARY: join(runnerDirectory, 'summary'),
    };
    await Promise.all(Object.values(files).map((file) => writeFile(file, '')));

    const sha = 'a'.repeat(40);
    const repository = 'e2e/fixversion-manager';
    const eventPath = join(runnerDirectory, 'event.json');
    await writeFile(
      eventPath,
      JSON.stringify({
        ref: 'refs/heads/e2e',
        before: '0'.repeat(40),
        after: sha,
        repository: {
          name: 'fixversion-manager',
          full_name: repository,
          default_branch: 'main',
          owner: { login: 'e2e', name: 'e2e' },
          html_url: `https://github.com/${repository}`,
        },
        sender: { login: 'e2e-runner' },
        pusher: { name: 'e2e-runner', email: 'e2e@example.test' },
        head_commit: { id: sha, message: `Release ${issues.join(', ')}` },
      }),
    );

    // Avoid inheriting the enclosing workflow's inputs, credentials, or a TypeScript loader.
    const inheritedEnvironment = Object.fromEntries(
      Object.entries(process.env).filter(
        ([name]) => !/^(INPUT_|GITHUB_|JIRA_|ACTIONS_|RUNNER_|NODE_OPTIONS$)/.test(name),
      ),
    );
    const { stdout, stderr } = await execFileAsync(process.execPath, [entryPoint], {
      cwd: workspace,
      timeout: config.timeouts.apiCall,
      maxBuffer: 1024 * 1024,
      env: {
        ...inheritedEnvironment,
        ...files,
        NODE_ENV: 'production',
        GITHUB_ACTIONS: 'true',
        GITHUB_ACTION: 'fixversion-e2e',
        GITHUB_ACTION_PATH: repositoryRoot,
        GITHUB_ACTOR: 'e2e-runner',
        GITHUB_EVENT_NAME: 'push',
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_REPOSITORY: repository,
        GITHUB_REPOSITORY_OWNER: 'e2e',
        GITHUB_WORKSPACE: workspace,
        GITHUB_SHA: sha,
        GITHUB_REF: 'refs/heads/e2e',
        GITHUB_RUN_ID: '1',
        GITHUB_RUN_NUMBER: '1',
        GITHUB_RUN_ATTEMPT: '1',
        GITHUB_SERVER_URL: 'https://github.com',
        GITHUB_API_URL: 'https://api.github.com',
        GITHUB_GRAPHQL_URL: 'https://api.github.com/graphql',
        RUNNER_TEMP: runnerDirectory,
        INPUT_TOKEN: 'e2e-github-token',
        INPUT_ISSUES: issues.join(','),
        INPUT_FIX_VERSIONS: fixVersions.join(','),
        INPUT_PROJECTS: config.test.projectKey,
        INPUT_PROJECTS_IGNORE: '',
        INPUT_INCLUDE_MERGE_MESSAGES: 'false',
        INPUT_FAIL_ON_ERROR: 'true',
        INPUT_JIRA_BASE_URL: config.jira.baseUrl,
        INPUT_JIRA_USER_EMAIL: config.jira.auth.email || config.jira.auth.username || '',
        INPUT_JIRA_API_TOKEN: config.jira.auth.apiToken || config.jira.auth.password || '',
      },
    }).catch((error: Error & { code?: string | number; stdout?: string; stderr?: string }) => {
      throw new Error(
        `Packaged action failed (exit code ${error.code ?? 'unknown'}):\n${error.stdout || ''}\n${error.stderr || ''}`,
        { cause: error },
      );
    });

    return { stdout, stderr, output: await readFile(files.GITHUB_OUTPUT, 'utf8') };
  } finally {
    await rm(runnerDirectory, { recursive: true, force: true });
  }
}
