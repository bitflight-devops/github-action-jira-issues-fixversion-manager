import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';

const baseUrl = process.env.E2E_JIRA_BASE_URL;
assert.ok(baseUrl, 'The disposable Jira fixture must be prepared first');
async function api(endpoint, method = 'GET', body) {
  const response = await fetch(`${baseUrl}/rest/api/2${endpoint}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from('admin:admin').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  assert.ok(response.ok, `${method} ${endpoint}: ${response.status} ${text}`);
  return text ? JSON.parse(text) : undefined;
}
if (process.argv[2] === 'arrange') {
  const unique = randomUUID();
  const preserved = await api('/version', 'POST', { project: 'E2E', name: `native-${unique}-preserved` });
  const target = await api('/version', 'POST', { project: 'E2E', name: `native-${unique}-target` });
  const issue = await api('/issue', 'POST', {
    fields: {
      project: { key: 'E2E' },
      issuetype: { name: 'Task' },
      summary: 'Native action manifest smoke test',
      fixVersions: [{ id: preserved.id }],
    },
  });
  assert.match(issue.key, /^E2E-\d+$/);
  const before = await api(`/issue/${issue.key}?fields=fixVersions`);
  assert.deepEqual(
    before.fields.fixVersions.map((version) => version.id),
    [preserved.id],
  );
  for (const [key, value] of Object.entries({
    issue_key: issue.key,
    target_name: target.name,
    target_id: target.id,
    preserved_id: preserved.id,
  })) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
} else if (process.argv[2] === 'verify') {
  const key = process.env.ISSUE_KEY;
  assert.match(key, /^E2E-\d+$/);
  const issue = await api(`/issue/${key}?fields=fixVersions`);
  assert.deepEqual(
    issue.fields.fixVersions.map((version) => version.id).sort(),
    [process.env.TARGET_ID, process.env.PRESERVED_ID].sort(),
  );
  const versions = await api('/project/E2E/versions');
  const matching = versions.filter((version) => version.name === process.env.TARGET_NAME);
  assert.equal(matching.length, 1);
  assert.equal(matching[0].id, process.env.TARGET_ID);
  console.log(
    `Verified native uses: ./ added the existing version to ${key}, preserved its prior version, and created no duplicate`,
  );
} else throw new Error('Expected arrange or verify');
