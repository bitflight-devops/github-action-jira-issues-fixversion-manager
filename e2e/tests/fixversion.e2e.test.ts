/** E2E tests run the built GitHub Action; the API client only arranges fixtures and reads the resulting Jira state. */
import { randomUUID } from 'node:crypto';

import { getE2EConfig } from '../scripts/e2e-config';
import { JiraE2EClient, type JiraVersion } from '../scripts/jira-client';
import { runAction } from './run-action';

describe('Packaged FixVersion action against Jira', () => {
  const config = getE2EConfig();
  const client = new JiraE2EClient(config);
  const projectKey = config.test.projectKey;
  const runId = randomUUID();
  let preservedVersion: JiraVersion;

  beforeAll(async () => {
    const serverInfo = await client.getServerInfo();
    console.log(`Testing the packaged action against Jira ${serverInfo.version}`);
    preservedVersion = await client.createVersion(projectKey, `action-${runId}-preserved`);
    expect(preservedVersion.id).toBeTruthy();
  }, config.timeouts.testTimeout);

  async function expectIssueVersions(issueKey: string, expected: JiraVersion[]) {
    const issue = await client.getIssue(issueKey, ['fixVersions']);
    const references = (versions: JiraVersion[]) =>
      versions.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    expect(references(issue.fields.fixVersions || [])).toEqual(references(expected));
  }

  it(
    'adds a missing assignment when multiple requested versions include one already on the issue',
    async () => {
      const existingVersion = await client.createVersion(projectKey, `action-${runId}-existing`);
      expect(existingVersion.id).toBeTruthy();
      const issue = await client.createIssue(
        projectKey,
        `Packaged action existing version ${runId}`,
        config.test.issueType,
        [preservedVersion.name],
      );
      await expectIssueVersions(issue.key, [preservedVersion]);

      await runAction(config, [issue.key], [preservedVersion.name, existingVersion.name]);

      await expectIssueVersions(issue.key, [preservedVersion, existingVersion]);
      const matchingVersions = (await client.listProjectVersions(projectKey)).filter(
        (version) => version.name === existingVersion.name,
      );
      expect(matchingVersions).toHaveLength(1);
      expect(matchingVersions[0].id).toBe(existingVersion.id);
    },
    config.timeouts.testTimeout,
  );

  it(
    'creates one new version for multiple issues and can rerun without duplicating or replacing versions',
    async () => {
      const newVersionName = `action-${runId}-v2.0.0-beta.1+ci`;
      expect((await client.listProjectVersions(projectKey)).some((version) => version.name === newVersionName)).toBe(
        false,
      );
      const firstIssue = await client.createIssue(
        projectKey,
        `Packaged action first new version ${runId}`,
        config.test.issueType,
        [preservedVersion.name],
      );
      const secondIssue = await client.createIssue(
        projectKey,
        `Packaged action second new version ${runId}`,
        config.test.issueType,
      );
      await expectIssueVersions(firstIssue.key, [preservedVersion]);
      await expectIssueVersions(secondIssue.key, []);

      // Include a duplicate issue key to exercise the action's input deduplication as well.
      const issues = [firstIssue.key, secondIssue.key, firstIssue.key];
      await runAction(config, issues, [newVersionName]);

      const matchingVersions = (await client.listProjectVersions(projectKey)).filter(
        (version) => version.name === newVersionName,
      );
      expect(matchingVersions).toHaveLength(1);
      const createdVersion = matchingVersions[0];
      expect(createdVersion.id).toBeTruthy();
      expect(createdVersion).toMatchObject({ archived: false, released: false });
      await expectIssueVersions(firstIssue.key, [preservedVersion, createdVersion]);
      await expectIssueVersions(secondIssue.key, [createdVersion]);

      // A new subprocess means no in-memory cache survives the rerun.
      await runAction(config, issues, [newVersionName]);

      const versionsAfterRerun = (await client.listProjectVersions(projectKey)).filter(
        (version) => version.name === newVersionName,
      );
      expect(versionsAfterRerun).toHaveLength(1);
      expect(versionsAfterRerun[0].id).toBe(createdVersion.id);
      await expectIssueVersions(firstIssue.key, [preservedVersion, createdVersion]);
      await expectIssueVersions(secondIssue.key, [createdVersion]);
    },
    config.timeouts.testTimeout * 2,
  );

  it(
    'fails the action process when Jira rejects an issue and fail_on_error is enabled',
    async () => {
      await expect(runAction(config, [`${projectKey}-999999999`], [preservedVersion.name])).rejects.toThrow(
        'Packaged action failed (exit code 1)',
      );
    },
    config.timeouts.testTimeout,
  );
});
