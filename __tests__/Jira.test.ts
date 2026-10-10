import type { Version2Models } from 'jira.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Jira from '../src/Jira';

vi.mock('@actions/core', () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

describe('Jira version management', () => {
  let jira: Jira;

  beforeEach(() => {
    jira = new Jira({ baseUrl: 'https://jira.example.test', email: 'admin', token: 'test-password' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { requestedVersions: ['v1.0.0', 'v2.0.0'] },
    { requestedVersions: 'v1.0.0,v2.0.0' },
  ])('finds existing versions in the non-paginated SDK response for $requestedVersions', async ({
    requestedVersions,
  }) => {
    const versions: Version2Models.Version[] = [
      { id: '10001', name: 'V1.0.0', projectId: 10000 },
      { id: '10002', name: 'another-release', projectId: 10000 },
    ];
    const getVersions = vi.spyOn(jira.client.projectVersions, 'getProjectVersions').mockResolvedValue(versions);

    await expect(jira.projectHasFixVersionsFromList('TEST', requestedVersions)).resolves.toEqual(['V1.0.0']);
    expect(getVersions).toHaveBeenCalledWith({ projectIdOrKey: 'TEST' });
  });

  it('returns version names and IDs from the non-paginated SDK response', async () => {
    const versions: Version2Models.Version[] = [
      { id: '10001', name: 'v1.0.0', projectId: 10000 },
      { id: '10002', name: 'v2.0.0', projectId: 10000 },
      { id: '10003', projectId: 10000 },
    ];
    vi.spyOn(jira.client.projectVersions, 'getProjectVersions').mockResolvedValue(versions);

    await expect(jira.getFixVersions('TEST')).resolves.toEqual(
      new Map([
        ['v1.0.0', '10001'],
        ['v2.0.0', '10002'],
      ]),
    );
  });

  it('reuses an existing project version instead of attempting to create it again', async () => {
    vi.spyOn(jira.client.projectVersions, 'getProjectVersions').mockResolvedValue([{ id: '10001', name: 'v1.0.0' }]);
    vi.spyOn(jira.client.projects, 'getProject').mockResolvedValue({ id: '10000', key: 'TEST' });
    const createVersion = vi.spyOn(jira.client.projectVersions, 'createVersion').mockResolvedValue({});
    const editIssue = vi.spyOn(jira.client.issues, 'editIssue').mockResolvedValue(undefined);

    await jira.updateIssueFixVersions('TEST-123', ['v1.0.0']);

    expect(createVersion).not.toHaveBeenCalled();
    expect(editIssue).toHaveBeenCalledExactlyOnceWith({
      issueIdOrKey: 'TEST-123',
      update: { fixVersions: [{ add: { name: 'v1.0.0' } }] },
    });
  });

  it('creates only missing versions and adds versions without replacing other issue versions', async () => {
    vi.spyOn(jira.client.projectVersions, 'getProjectVersions').mockResolvedValue([{ id: '10001', name: 'v1.0.0' }]);
    vi.spyOn(jira.client.projects, 'getProject').mockResolvedValue({ id: '10000', key: 'TEST' });
    const createVersion = vi.spyOn(jira.client.projectVersions, 'createVersion').mockResolvedValue({
      id: '10002',
      name: 'v2.0.0',
    });
    const editIssue = vi.spyOn(jira.client.issues, 'editIssue').mockResolvedValue(undefined);

    await jira.updateIssueFixVersions('TEST-123', ['v1.0.0', 'v2.0.0']);

    expect(createVersion).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: 'v2.0.0', projectId: 10000, archived: false, released: false }),
    );
    expect(editIssue).toHaveBeenCalledExactlyOnceWith({
      issueIdOrKey: 'TEST-123',
      update: { fixVersions: [{ add: { name: 'v1.0.0' } }, { add: { name: 'v2.0.0' } }] },
    });
  });

  it('creates a shared missing version once when multiple issues are updated concurrently', async () => {
    vi.spyOn(jira.client.projectVersions, 'getProjectVersions').mockResolvedValue([]);
    vi.spyOn(jira.client.projects, 'getProject').mockResolvedValue({ id: '10000', key: 'TEST' });
    const createVersion = vi.spyOn(jira.client.projectVersions, 'createVersion').mockResolvedValue({
      id: '10001',
      name: 'v2.0.0',
    });
    const editIssue = vi.spyOn(jira.client.issues, 'editIssue').mockResolvedValue(undefined);

    await Promise.all([
      jira.updateIssueFixVersions('TEST-123', ['v2.0.0']),
      jira.updateIssueFixVersions('TEST-456', ['v2.0.0']),
    ]);

    expect(createVersion).toHaveBeenCalledTimes(1);
    expect(editIssue).toHaveBeenCalledTimes(2);
    expect(editIssue.mock.calls.map(([parameters]) => parameters.issueIdOrKey).sort()).toEqual([
      'TEST-123',
      'TEST-456',
    ]);
  });

  it('allows a failed version creation to be retried without updating the issue prematurely', async () => {
    vi.spyOn(jira.client.projectVersions, 'getProjectVersions').mockResolvedValue([]);
    vi.spyOn(jira.client.projects, 'getProject').mockResolvedValue({ id: '10000', key: 'TEST' });
    const createVersion = vi
      .spyOn(jira.client.projectVersions, 'createVersion')
      .mockRejectedValueOnce(new Error('Jira is temporarily unavailable'))
      .mockResolvedValueOnce({ id: '10001', name: 'v2.0.0' });
    const editIssue = vi.spyOn(jira.client.issues, 'editIssue').mockResolvedValue(undefined);

    await expect(jira.updateIssueFixVersions('TEST-123', ['v2.0.0'])).rejects.toThrow('temporarily unavailable');
    expect(editIssue).not.toHaveBeenCalled();

    await jira.updateIssueFixVersions('TEST-123', ['v2.0.0']);

    expect(createVersion).toHaveBeenCalledTimes(2);
    expect(editIssue).toHaveBeenCalledTimes(1);
  });
});
