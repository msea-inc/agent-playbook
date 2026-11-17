// Synthetic: every release, pull request, task ID, link and commit here is made up for the test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nextRelease, pullFacts, run, stagedSentence, stagingChecks, taskIdsFromNotes, versions } from '../../scripts/release/release-draft.mjs';

const pull = (number, title, { labels = [], what = 'Does a thing.', how = ['1. Open staging and check the thing.'], task = true } = {}) => ({
  number,
  title,
  html_url: `https://github.com/example/app/pull/${number}`,
  labels: labels.map(name => ({ name })),
  merged_at: '2026-01-01T00:00:00Z',
  base: { ref: 'main' },
  body: [
    '## What this does', '', what, '',
    ...(task ? [`ClickUp: [ABC-${number}](https://tracker.example.com/t/abc${number})`, ''] : []),
    '## How to test', '', ...how, '',
    '## Notes', '', 'Nothing.',
  ].join('\n'),
});
const commit = (sha, p) => ({ sha, pull: p });
const released = (tag, extra = {}) => ({ tag_name: tag, draft: false, prerelease: false, ...extra });

test('the version counts on from the highest tag, and the notes start from the live one', () => {
  const releases = [released('v1.2.0'), released('v1.3.0', { prerelease: true }), { tag_name: 'v9.9.9', draft: true }, released('nightly')];
  assert.deepEqual(versions(releases), { highest: [1, 3, 0], liveTag: 'v1.2.0' });
  assert.deepEqual(versions([]), { highest: null, liveTag: null });
});

test('the biggest label sets the bump, and the newest pull request with it names the release', () => {
  const release = nextRelease({
    releases: [released('v1.3.0')],
    commits: [commit('a1', pull(11, 'fix(ABC-11): Fix the form')), commit('b2', pull(12, 'feat(ABC-12): Add the booking page', { labels: ['minor'] })), commit('c3', pull(13, 'fix(ABC-13): Fix a typo'))],
  });
  assert.equal(release.version, 'v1.4.0');
  assert.equal(release.bump, 'minor');
  assert.equal(release.title, 'v1.4.0 · Add the booking page (#12) and 2 more');
  assert.equal(nextRelease({ releases: [released('v1.3.0')], commits: [commit('a1', pull(11, 'feat(ABC-11): Break it', { labels: ['major'] }))] }).version, 'v2.0.0');
  assert.equal(nextRelease({ releases: [released('v1.3.0')], commits: [commit('a1', pull(11, 'fix(ABC-11): Fix it'))] }).title, 'v1.3.1 · Fix it (#11)');
});

test('each line links the pull request and its task, then gives the task ID and what it does', () => {
  const { notes } = nextRelease({
    releases: [released('v1.0.0')],
    commits: [commit('a1', pull(21, 'fix(ABC-21): Fix the form', { what: 'Stops the form losing input. It also adds a test.' })), commit('b2', pull(22, 'feat(ABC-22): Add a page', { labels: ['minor'], task: false }))],
  });
  assert.match(notes, /^## What's in v1\.1\.0\n\n2 pull requests since v1\.0\.0\./);
  assert.ok(notes.includes('### New (minor)\n- [#22](https://github.com/example/app/pull/22) · Add a page · ABC-22 · Does a thing.'));
  assert.ok(notes.includes('### Fixes and changes (patch)\n- [#21](https://github.com/example/app/pull/21) · [Fix the form](https://tracker.example.com/t/abc21) · ABC-21 · Stops the form losing input.'));
  assert.ok(notes.indexOf('### New') < notes.indexOf('### Fixes'));
});

test('breaking changes come first and say to check them on staging', () => {
  const { notes } = nextRelease({ releases: [released('v1.0.0')], commits: [commit('a1', pull(31, 'feat(ABC-31): Rename the address', { labels: ['major'] }))] });
  assert.ok(notes.includes('### Breaking (major)\nCheck these on staging first.\n- [#31]'));
});

test('Check on staging keeps only the staging checks, renumbered', () => {
  const how = [
    '1. Merge this pull request.',
    '2. Wait for the staging run to finish.',
    '3. Open staging and sign in.',
    '   - Check the name shows at the top.',
    '4. Run `npm test` locally.',
    '5. Publish the draft release.',
    '6. Check the booking page lists the new times.',
    '7. Open staging and check the page this pull request adds.',
  ];
  assert.deepEqual(stagingChecks(how), ['1. Open staging and sign in.', '   - Check the name shows at the top.', '2. Check the booking page lists the new times.', '3. Open staging and check the page this pull request adds.']);
  assert.deepEqual(stagingChecks(['1. Approve and merge the pull request.', '2. Add the `staging` label.']), []);

  const { notes } = nextRelease({ releases: [released('v1.0.0')], commits: [commit('a1', pull(41, 'fix(ABC-41): Fix it', { how })), commit('b2', pull(42, 'fix(ABC-42): Tidy CI', { how: ['1. Merge this pull request.'] }))] });
  const checks = notes.slice(notes.indexOf('### Check on staging'));
  assert.equal(checks, ['### Check on staging', '- [#41](https://github.com/example/app/pull/41), Fix it:', '  1. Open staging and sign in.', '     - Check the name shows at the top.', '  2. Check the booking page lists the new times.', '  3. Open staging and check the page this pull request adds.'].join('\n'));
});

test('the first release lists everything since the route began, and commits without a pull request by SHA', () => {
  const release = nextRelease({ releases: [], product: 'the app', commits: [commit('a1', pull(51, 'feat(ABC-51): Add sign-in', { labels: ['minor'] })), commit('deadbeefcafe', null)], stagingRunUrl: 'https://github.com/example/app/actions/runs/1' });
  assert.equal(release.version, 'v1.0.0');
  assert.equal(release.title, 'v1.0.0 · The first release of the app');
  assert.match(release.notes, /The first release: everything merged so far\./);
  assert.match(release.notes, /- deadbeef \(a commit without a pull request\)/);
  assert.match(release.notes, /\[The staging run\]\(https:\/\/github\.com\/example\/app\/actions\/runs\/1\)$/);
});

test('a pull request without a task, or marked as having none, shows no task ID', () => {
  assert.equal(pullFacts(pull(61, 'docs(NoCU): Fix a link')).taskId, null);
  assert.equal(pullFacts({ number: 62, title: 'Plain title', body: null }).taskId, null);
});

test('the task IDs come from the grouped lines only, never from Check on staging', () => {
  const { notes } = nextRelease({ releases: [released('v1.0.0')], commits: [commit('a1', pull(71, 'fix(ABC-71): Fix it', { how: ['1. Check ABC-99 still works on staging.'] })), commit('b2', pull(72, 'feat(CU-abc123x): Add it', { labels: ['minor'] }))] });
  assert.deepEqual(taskIdsFromNotes(notes), ['CU-abc123x', 'ABC-71']);
});

test('the run summary is one plain sentence with the version as the link', () => {
  assert.equal(stagedSentence('v1.0.1', 'https://github.com/example/app/releases/tag/untagged-1'),
    'Staged. [Draft release v1.0.1](https://github.com/example/app/releases/tag/untagged-1) is ready to publish once staging checks out.');
});

function fakeGitHub(routes) {
  const calls = [];
  const fetchImpl = async (url, { method, body }) => {
    calls.push({ method, url, body: body ? JSON.parse(body) : undefined });
    const key = `${method} ${url.replace('https://api.github.com/repos/example/app', '')}`;
    const found = Object.entries(routes).find(([route]) => key === route);
    if (!found) return { ok: false, status: 404, json: async () => ({ message: 'Not Found' }) };
    const [status, data] = found[1];
    return { ok: status < 400, status, json: async () => data };
  };
  return { calls, fetchImpl };
}

async function tempEnv(extra = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'release-draft-'));
  return { GITHUB_TOKEN: 'synthetic', GITHUB_REPOSITORY: 'example/app', HEAD_SHA: 'b2', GITHUB_STEP_SUMMARY: join(dir, 'summary.md'), GITHUB_OUTPUT: join(dir, 'output'), ...extra };
}

const mergedRoutes = (releases, extra = {}) => ({
  'GET /releases?per_page=100': [200, releases],
  'GET /compare/v1.0.0...b2': [200, { commits: [{ sha: 'a1' }, { sha: 'b2' }] }],
  'GET /commits/a1': [200, { files: [{ filename: 'src/a.js' }] }],
  'GET /commits/b2': [200, { files: [{ filename: 'docs/b.md' }] }],
  'GET /commits/a1/pulls': [200, [{ ...pull(81, 'fix(ABC-81): Fix it'), merge_commit_sha: 'a1' }]],
  'GET /commits/b2/pulls': [200, [{ ...pull(82, 'feat(ABC-82): Add it', { labels: ['minor'] }), merge_commit_sha: 'b2' }]],
  'POST /issues/82/comments': [201, {}],
  ...extra,
});

test('a merge updates the one draft release, and says so in the summary, the log, and the merged pull request', async () => {
  const draft = { id: 7, draft: true, tag_name: 'v1.0.1', html_url: 'https://github.com/example/app/releases/tag/untagged-7' };
  const { calls, fetchImpl } = fakeGitHub(mergedRoutes([released('v1.0.0'), draft], { 'PATCH /releases/7': [200, draft] }));
  const env = await tempEnv({ STAGING_RUN_URL: 'https://github.com/example/app/actions/runs/2' });
  const logs = [];
  const release = await run(env, fetchImpl, line => logs.push(line));

  assert.equal(release.version, 'v1.1.0');
  const patch = calls.find(call => call.method === 'PATCH');
  assert.deepEqual({ ...patch.body, body: undefined }, { tag_name: 'v1.1.0', target_commitish: 'b2', name: 'v1.1.0 · Add it (#82) and 1 more', body: undefined, draft: true });
  assert.ok(!calls.some(call => call.method === 'POST' && call.url.endsWith('/releases')), 'no second draft');
  const sentence = 'Staged. [Draft release v1.1.0](https://github.com/example/app/releases/tag/untagged-7) is ready to publish once staging checks out.';
  assert.equal(await readFile(env.GITHUB_STEP_SUMMARY, 'utf8'), `${sentence}\n`);
  assert.deepEqual(logs, ['Draft release v1.1.0: https://github.com/example/app/releases/tag/untagged-7']);
  assert.deepEqual(calls.find(call => call.url.endsWith('/issues/82/comments')).body, { body: sentence });
  assert.match(await readFile(env.GITHUB_OUTPUT, 'utf8'), /^version=v1\.1\.0\ntitle=v1\.1\.0 · Add it \(#82\) and 1 more\n$/);
});

test('without a draft it creates one, and released paths leave other work out', async () => {
  const created = { id: 8, draft: true, html_url: 'https://github.com/example/app/releases/tag/untagged-8' };
  const { calls, fetchImpl } = fakeGitHub(mergedRoutes([released('v1.0.0')], { 'POST /releases': [201, created] }));
  const release = await run(await tempEnv({ RELEASED_PATHS: 'src/' }), fetchImpl, () => {});
  assert.equal(release.title, 'v1.0.1 · Fix it (#81)');
  assert.equal(calls.find(call => call.method === 'POST' && call.url.endsWith('/releases')).body.draft, true);
  assert.ok(!calls.some(call => call.url.endsWith('/issues/82/comments')), 'the merge left out is not told it is staged');
});

test('before the first release, the notes start from the first release base', async () => {
  const created = { id: 9, draft: true, html_url: 'https://github.com/example/app/releases/tag/untagged-9' };
  const { calls, fetchImpl } = fakeGitHub({ ...mergedRoutes([], { 'POST /releases': [201, created] }), 'GET /compare/base0...b2': [200, { commits: [{ sha: 'a1' }, { sha: 'b2' }] }] });
  const release = await run(await tempEnv({ FIRST_RELEASE_BASE: 'base0' }), fetchImpl, () => {});
  assert.equal(release.version, 'v1.0.0');
  assert.ok(calls.some(call => call.url.endsWith('/compare/base0...b2')));
});

test("GitHub's own error message reaches the log", async () => {
  const { fetchImpl } = fakeGitHub({ 'GET /releases?per_page=100': [403, { message: 'Resource not accessible by integration' }] });
  await assert.rejects(run(await tempEnv(), fetchImpl, () => {}), /GitHub answered 403 for GET \/releases\?per_page=100: Resource not accessible by integration/);
});

test('it never writes to a run summary it was not handed', async () => {
  await assert.rejects(run(undefined, async () => assert.fail('no request')), /needs its environment/);
  await assert.rejects(run({ GITHUB_TOKEN: 'synthetic', GITHUB_REPOSITORY: 'example/app', HEAD_SHA: 'b2' }, async () => assert.fail('no request')), /GITHUB_STEP_SUMMARY/);
});
