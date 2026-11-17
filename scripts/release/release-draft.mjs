// The one draft release, the release-manager way. After a merge reaches staging, this works out the next release
// (everything merged since the live release, the bump set by the biggest label, a title naming the biggest change,
// grouped notes) and creates or updates the repository's one draft release with it, targeting the staged commit.
// Publishing that draft is what releases to live.
//
//   node scripts/release/release-draft.mjs
//
// Environment:
//   GITHUB_TOKEN, GITHUB_REPOSITORY, HEAD_SHA   the token (contents: write, pull-requests: write), owner/name, the staged commit
//   GITHUB_STEP_SUMMARY, GITHUB_OUTPUT          the run's files; the summary is required, so a run never writes elsewhere
//   STAGING_RUN_URL                             optional: linked at the end of the notes
//   DEFAULT_BRANCH                              optional: defaults to main
//   RELEASED_PATHS                              optional, comma-separated: only commits touching these paths are released
//   FIRST_RELEASE_BASE                          optional: before the first release, the notes start after this commit
//   PRODUCT_NAME                                optional: names the first release, "vX.Y.Z · The first release of {name}"
//   RELEASE_MODE                                optional: draft (default), or create to publish it (the approve-button route)
//
// Node built-ins only. Tests pass synthetic data, their own fetch and temporary files.
import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const VERSION = /^v(\d+)\.(\d+)\.(\d+)$/;
const PREFIX = /^\w+!?\(([A-Z][A-Z\d]*-\d+|CU-[a-z\d]+|NoCU)\)!?:\s*/;
const TASK_ID = /^(?:[A-Z][A-Z\d]*-\d+|CU-[a-z\d]+)$/;
// The task link a pull request description carries, as the template writes it: "ClickUp: [ID](link)".
const TASK_LINK = /^\s*(?:ClickUp|Task):\s*\[[^\]]+\]\((https:\/\/[^)\s]+)\)/im;
const API = 'https://api.github.com';
const ORDER = { patch: 0, minor: 1, major: 2 };
// How to test steps that are about the pull request's own route, not a check on staging.
const NOT_A_STAGING_CHECK = [
  /^(?:approve|merge|publish|review|label|wait|re-?run|open the (?:pull request|draft|release))\b/i,
  /^add the `?[\w-]+`? label\b/i,
  /^run `[^`]+`(?: locally)?\.?$/i,
];

const parse = tag => (VERSION.exec(tag ?? '') ?? []).slice(1).map(Number);
const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** The highest version ever released (rolled-back ones included, so a version is never reused), and the live one. */
export function versions(releases) {
  const tagged = releases.filter(release => !release.draft && VERSION.test(release.tag_name ?? ''));
  const byVersion = (a, b) => compare(parse(a.tag_name), parse(b.tag_name));
  const highest = tagged.sort(byVersion).at(-1);
  const live = tagged.filter(release => !release.prerelease).at(-1);
  return { highest: highest ? parse(highest.tag_name) : null, liveTag: live?.tag_name ?? null };
}

function sectionLines(body, heading) {
  const lines = String(body ?? '').split(/\r?\n/);
  const start = lines.findIndex(line => line.trim().toLowerCase() === `## ${heading}`);
  if (start < 0) return [];
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines.slice(start + 1, end < 0 ? undefined : end).filter(line => line.trim() && !line.trim().startsWith('<!--'));
}

const marker = /^(\s*)(\d+\.|[-*])\s+/;

/**
 * The steps of a How to test that check something on staging. Steps about the route itself (merge, label, approve,
 * review, publish, wait for a run, run a local command) are left out with their sub-steps; numbered steps are renumbered.
 */
export function stagingChecks(lines) {
  const kept = [];
  let skipping = false;
  let number = 0;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const [, indent = '', mark] = marker.exec(line) ?? [];
    const text = line.replace(marker, '').replace(/\*\*/g, '').trim();
    if (!indent && mark) {
      skipping = NOT_A_STAGING_CHECK.some(pattern => pattern.test(text));
      if (skipping) continue;
      kept.push(/\d/.test(mark) ? `${++number}. ${line.replace(marker, '')}` : line);
    } else if (!skipping) kept.push(line);
  }
  return kept;
}

/** What a pull request brings to the notes. */
export function pullFacts(pull) {
  const labels = (pull.labels ?? []).map(label => label.name);
  const what = sectionLines(pull.body, 'what this does')[0]?.trim().replace(marker, '') ?? '';
  const id = PREFIX.exec(pull.title)?.[1];
  return {
    number: pull.number,
    title: pull.title.replace(PREFIX, ''),
    taskId: id && TASK_ID.test(id) ? id : null,
    url: pull.html_url ?? null,
    taskUrl: TASK_LINK.exec(pull.body ?? '')?.[1] ?? null,
    bump: labels.includes('major') ? 'major' : labels.includes('minor') ? 'minor' : 'patch',
    what: what ? (what.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? what) : '',
    checks: stagingChecks(sectionLines(pull.body, 'how to test')),
  };
}

/** The next release from the releases so far and the commits since the live one, oldest first. */
export function nextRelease({ releases, commits, stagingRunUrl = '', product = '' }) {
  const { highest, liveTag } = versions(releases);
  const pulls = commits.filter(commit => commit.pull).map(commit => pullFacts(commit.pull));
  const others = commits.filter(commit => !commit.pull);
  const bump = pulls.reduce((biggest, pull) => (ORDER[pull.bump] > ORDER[biggest] ? pull.bump : biggest), 'patch');

  let version;
  if (!highest) version = [1, 0, 0];
  else if (bump === 'major') version = [highest[0] + 1, 0, 0];
  else if (bump === 'minor') version = [highest[0], highest[1] + 1, 0];
  else version = [highest[0], highest[1], highest[2] + 1];
  const tag = `v${version.join('.')}`;

  const newestFirst = [...pulls].reverse();
  const naming = newestFirst.find(pull => pull.bump === bump);
  const more = commits.length - (naming ? 1 : 0);
  const title = !highest ? `${tag} · The first release${product ? ` of ${product}` : ''}`
    : naming ? `${tag} · ${naming.title} (#${naming.number})${more ? ` and ${more} more` : ''}`
    : `${tag} · ${plural(commits.length, 'change')}`;

  const pullLink = pull => (pull.url ? `[#${pull.number}](${pull.url})` : `#${pull.number}`);
  const taskLink = pull => (pull.taskUrl ? `[${pull.title}](${pull.taskUrl})` : pull.title);
  const line = pull => [`- ${pullLink(pull)}`, taskLink(pull), pull.taskId, pull.what].filter(Boolean).join(' · ');

  const count = [plural(pulls.length, 'pull request'), others.length ? plural(others.length, 'other commit') : ''].filter(Boolean).join(' and ');
  const notes = [`## What's in ${tag}`, '', highest ? `${count} since ${liveTag ?? 'the last release'}.` : 'The first release: everything merged so far.', ''];
  const groups = [
    ['major', '### Breaking (major)', ['Check these on staging first.']],
    ['minor', '### New (minor)', []],
    ['patch', '### Fixes and changes (patch)', []],
  ];
  for (const [kind, heading, intro] of groups) {
    const lines = newestFirst.filter(pull => pull.bump === kind).map(line);
    if (kind === 'patch') lines.push(...others.map(commit => `- ${commit.sha.slice(0, 8)} (a commit without a pull request)`));
    if (lines.length) notes.push(heading, ...intro, ...lines, '');
  }
  const checks = newestFirst.filter(pull => pull.checks.length)
    .flatMap(pull => [`- ${pullLink(pull)}, ${pull.title}:`, ...pull.checks.map(check => `  ${check}`)]);
  if (checks.length) notes.push('### Check on staging', ...checks, '');
  if (stagingRunUrl) notes.push(`[The staging run](${stagingRunUrl})`);
  while (notes.at(-1) === '') notes.pop();

  return { version: tag, bump, title, notes: notes.join('\n'), liveTag };
}

/** The tasks a release's notes list, from its grouped lines only, for the "Released to live" comments. */
export function taskIdsFromNotes(notes) {
  const ids = [];
  let inGroups = false;
  for (const line of String(notes ?? '').split('\n')) {
    if (line.startsWith('### ')) inGroups = !line.startsWith('### Check on staging');
    else if (inGroups && line.startsWith('- ')) {
      const found = line.split(' · ').slice(1).find(part => TASK_ID.test(part.trim()))?.trim();
      if (found && !ids.includes(found)) ids.push(found);
    }
  }
  return ids;
}

/** The one sentence the run summary and the merged pull request get. */
export const stagedSentence = (version, url) => `Staged. [Draft release ${version}](${url}) is ready to publish once staging checks out.`;

/** A small client for GitHub's REST API. Errors carry GitHub's own message, never the rest of its response. */
export function gitHub({ token, repository, fetchImpl }) {
  return async function api(path, { method = 'GET', body } = {}) {
    const response = await fetchImpl(API + path.replace('{repo}', `repos/${repository}`), {
      method,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (response.status === 404 && method === 'GET') return null;
    if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${method} ${path.replace('/{repo}', '')}: ${data?.message ?? 'no reason given'}`);
    return data;
  };
}

/** The releases, and the commits from the live release (or the first-release base) to the staged commit. */
export async function collect(api, { head, branch = 'main', releasedPaths = [], firstReleaseBase = '' }) {
  const releases = (await api('/{repo}/releases?per_page=100')) ?? [];
  const { liveTag } = versions(releases);
  const base = liveTag ? encodeURIComponent(liveTag) : firstReleaseBase;
  const shas = base ? ((await api(`/{repo}/compare/${base}...${head}`))?.commits ?? []).map(commit => commit.sha) : [head];
  const commits = [];
  for (const sha of shas) {
    if (releasedPaths.length) {
      const files = (await api(`/{repo}/commits/${sha}`))?.files ?? [];
      if (!files.some(file => releasedPaths.some(path => file.filename.startsWith(path)))) continue;
    }
    const pulls = (await api(`/{repo}/commits/${sha}/pulls`)) ?? [];
    const merged = pulls.find(pull => pull.merged_at && pull.base?.ref === branch && pull.merge_commit_sha === sha);
    if (merged) commits.push({ sha, pull: merged });
    else if (!pulls.some(pull => pull.merged_at)) commits.push({ sha, pull: null });
    // otherwise it's a commit inside a merged pull request's branch, counted with that pull request
  }
  return { releases, commits };
}

/** Creates or updates the one draft release for the staged commit. The environment is always passed in. */
export async function run(env, fetchImpl = fetch, log = console.log) {
  if (!env) throw new Error('release-draft needs its environment passed in, so a test never writes to a real run summary.');
  for (const name of ['GITHUB_TOKEN', 'GITHUB_REPOSITORY', 'HEAD_SHA', 'GITHUB_STEP_SUMMARY']) {
    if (!env[name]) throw new Error(`release-draft needs ${name}.`);
  }
  const mode = env.RELEASE_MODE || 'draft';
  if (!['draft', 'create'].includes(mode)) throw new Error(`RELEASE_MODE is '${mode}': use draft or create.`);
  const api = gitHub({ token: env.GITHUB_TOKEN, repository: env.GITHUB_REPOSITORY, fetchImpl });
  const { releases, commits } = await collect(api, {
    head: env.HEAD_SHA,
    branch: env.DEFAULT_BRANCH || 'main',
    releasedPaths: String(env.RELEASED_PATHS ?? '').split(',').map(path => path.trim()).filter(Boolean),
    firstReleaseBase: env.FIRST_RELEASE_BASE || '',
  });
  const release = nextRelease({ releases, commits, stagingRunUrl: env.STAGING_RUN_URL, product: env.PRODUCT_NAME });

  // One draft release, always for the newest staged merge. Publishing it is what sends it to live.
  const fields = { tag_name: release.version, target_commitish: env.HEAD_SHA, name: release.title, body: release.notes, draft: mode === 'draft' };
  const existing = releases.filter(item => item.draft).sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
  const saved = existing
    ? await api(`/{repo}/releases/${existing.id}`, { method: 'PATCH', body: fields })
    : await api('/{repo}/releases', { method: 'POST', body: fields });

  const sentence = mode === 'draft' ? stagedSentence(release.version, saved.html_url) : `Staged and released as [${release.version}](${saved.html_url}).`;
  await appendFile(env.GITHUB_STEP_SUMMARY, `${sentence}\n`);
  // The job's log is what GitHub's mobile app shows, so the link is printed there too.
  log(`${mode === 'draft' ? 'Draft release' : 'Release'} ${release.version}: ${saved.html_url}`);
  // GitHub's mobile app doesn't show run summaries, so the merged pull request is told too, which also notifies.
  const merged = commits.find(commit => commit.sha === env.HEAD_SHA)?.pull;
  if (merged) await api(`/{repo}/issues/${merged.number}/comments`, { method: 'POST', body: { body: sentence } });
  if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, `version=${release.version}\ntitle=${release.title}\n`);
  return release;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  run(process.env).catch(error => {
    console.error(`::error::${error.message}`);
    process.exit(1);
  });
}
