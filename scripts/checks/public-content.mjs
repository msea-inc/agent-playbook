// The playbook is public. These checks keep its files, fixtures, PR descriptions and commit messages
// generic. They reduce risk; they can't prove that prose isn't confidential, and the PR-text check
// runs after GitHub already shows the text. A person reading each PR is the real safeguard.
//
// Usage:
//   node scripts/checks/public-content.mjs files            every tracked file
//   node scripts/checks/public-content.mjs pins             every `uses:` in workflows and actions
//   node scripts/checks/public-content.mjs merges           no merge or auto-merge calls in code
//   node scripts/checks/public-content.mjs pr-text <base>   the PR body and every commit since <base>
//
// CONTENT_DENY (a repository variable, comma-separated) names projects, organisations or customers
// that must never appear. It's kept out of the repository so the list itself isn't published.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const TASK_ID = /\b(?:[A-Z][A-Z0-9]{1,9}-\d{1,6}|CU-[0-9a-z]{6,12})\b/;
const ISSUE_NUMBER = /(?:^|[\s(])#\d+\b/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const ALLOWED_EMAIL = /^(?:noreply@anthropic\.com|[^@]+@users\.noreply\.github\.com)$/i;
const LINK = /https?:\/\/([^/\s)>"'`]+)[^\s)>"'`]*/g;
const LONG_NUMBER = /\b\d{9,}\b/g;
const SECRET_SHAPES = [
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/, 'a GitHub token'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}/, 'a GitHub token'],
  [/\bpk_\d+_[A-Z0-9]{16,}/, 'a ClickUp token'],
  [/\bsk-[A-Za-z0-9_-]{20,}/, 'an API key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'an AWS key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
  [/\b(?:password|secret|token|api[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9+/_-]{16,}/i, 'a credential assignment'],
];

/** Hosts a playbook file may link to: public documentation only. */
export const FILE_LINK_HOSTS = ['github.com', 'docs.github.com', 'code.claude.com', 'docs.anthropic.com', 'agentskills.io', 'semver.org', 'keepachangelog.com'];
/** Hosts a PR description or commit message may link to. */
export const TEXT_LINK_HOSTS = ['github.com', 'app.clickup.com', 'claude.ai', 'claude.com'];

/** Placeholder hosts used in examples. */
const EXAMPLE_HOSTS = /(?:^|\.)(?:example\.(?:com|org|net|invalid)|localhost)$/i;

export function denyList(value) {
  return String(value ?? '').split(',').map(name => name.trim()).filter(Boolean);
}

function hostAllowed(host, allowed) {
  const name = host.toLowerCase().replace(/:\d+$/, '');
  return EXAMPLE_HOSTS.test(name) || allowed.some(item => name === item || name.endsWith(`.${item}`));
}

function common(line, deny) {
  const problems = [];
  for (const [pattern, what] of SECRET_SHAPES) if (pattern.test(line)) problems.push(`looks like ${what}`);
  for (const email of line.match(EMAIL) ?? []) if (!ALLOWED_EMAIL.test(email)) problems.push(`has an email address (${email})`);
  for (const name of deny) if (line.toLowerCase().includes(name.toLowerCase())) problems.push('names something on the content deny list');
  return problems;
}

/** Problems in one line of a playbook file. Task IDs, issue numbers, outside links and real-looking IDs are all refused. */
export function fileLineProblems(line, deny = []) {
  const problems = common(line, deny);
  if (TASK_ID.test(line)) problems.push(`has a task ID (${line.match(TASK_ID)[0]})`);
  if (ISSUE_NUMBER.test(line)) problems.push('has an issue or PR number');
  for (const [, host] of line.matchAll(LINK)) if (!hostAllowed(host, FILE_LINK_HOSTS)) problems.push(`links outside public documentation (${host})`);
  for (const number of line.match(LONG_NUMBER) ?? []) if (!/^(\d)\1+$/.test(number)) problems.push(`has a real-looking ID (${number})`);
  return problems;
}

/**
 * Problems in one line of a PR description or commit body. A task ID is allowed only as the text of
 * a ClickUp link, e.g. [ODEN-1](https://app.clickup.com/t/abc), so a reader with access can follow it.
 */
export function textLineProblems(line, deny = []) {
  const problems = common(line, deny);
  const withoutTaskLinks = line.replace(/\[[A-Z][A-Z0-9]{1,9}-\d{1,6}\]\(https:\/\/app\.clickup\.com\/t\/[0-9a-z]+\)/g, '');
  if (TASK_ID.test(withoutTaskLinks)) problems.push(`has a task ID outside a ClickUp link (${withoutTaskLinks.match(TASK_ID)[0]})`);
  for (const [, host] of line.matchAll(LINK)) if (!hostAllowed(host, TEXT_LINK_HOSTS)) problems.push(`links outside GitHub, ClickUp and the Claude attribution (${host})`);
  return problems;
}

/** A commit subject may carry the task ID in the standard prefix and suffix: type(ID): Summary (ID). */
export function subjectProblems(subject, deny = []) {
  const stripped = subject
    .replace(/^[a-z]+\([A-Z][A-Z0-9]{1,9}-\d{1,6}\):\s*/, '')
    .replace(/\s*\([A-Z][A-Z0-9]{1,9}-\d{1,6}\)\s*$/, '')
    .replace(/^Merge branch '[^']+' into [\w./-]+$/, '');
  return textLineProblems(stripped, deny);
}

/** Fixtures say they're synthetic in their first lines, so nobody mistakes them for real records. */
export function fixtureProblems(path, text) {
  if (!/(^|\/)fixtures\//.test(path)) return [];
  const head = text.split('\n').slice(0, 3).join('\n');
  return /synthetic/i.test(head) ? [] : ['is a fixture that doesn\'t say "synthetic" in its first lines'];
}

/** A `uses:` reference must be a local path or pinned to a full commit SHA. */
export function pinProblems(line) {
  const match = line.match(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/);
  if (!match) return [];
  const target = match[1];
  if (target.startsWith('./') || target.startsWith('docker://')) return [];
  const ref = target.split('@')[1] ?? '';
  return /^[0-9a-f]{40}$/.test(ref) ? [] : [`uses ${target}, which isn't pinned to a full commit SHA`];
}

const MERGE_CALL = /\/pulls\/[^\s'"`]*\/merge\b|\bmerge_pull_request\b|\bmergePullRequest\b|\bgh\s+pr\s+merge\b|\bauto[_-]?merge\b|\benablePullRequestAutoMerge\b/i;

/** The playbook never merges anything: merges stay with a person. */
export function mergeProblems(line) {
  return MERGE_CALL.test(line) ? ['calls a merge or auto-merge API'] : [];
}

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
}

function report(findings) {
  for (const { where, problem } of findings) console.log(`::error::${where} ${problem}.`);
  if (findings.length) {
    console.log(`${findings.length} problem(s). The playbook is public: keep it generic, and link private detail as a ClickUp task.`);
    process.exit(1);
  }
  console.log('No problems found.');
}

function scan(files, check) {
  const findings = [];
  for (const path of files) {
    let text;
    try { text = readFileSync(path, 'utf8'); } catch { continue; }
    text.split('\n').forEach((line, index) => {
      for (const problem of check(line, path)) findings.push({ where: `${path}:${index + 1}`, problem });
    });
    for (const problem of fixtureProblems(path, text)) findings.push({ where: path, problem });
  }
  return findings;
}

const SELF = 'scripts/checks/public-content.mjs';
const OWN_TESTS = /^tests\/checks\/|^\.github\/pull_request_template\.md$/;

if (import.meta.url === `file://${process.argv[1]}`) {
  const [mode, base] = process.argv.slice(2);
  const deny = denyList(process.env.CONTENT_DENY);
  const files = trackedFiles();
  if (mode === 'files') {
    report(scan(files.filter(path => path !== SELF && !OWN_TESTS.test(path)), line => fileLineProblems(line, deny)));
  } else if (mode === 'pins') {
    report(scan(files.filter(path => /^\.github\/workflows\/.*\.ya?ml$|(^|\/)action\.ya?ml$/.test(path)), line => pinProblems(line)));
  } else if (mode === 'merges') {
    report(scan(files.filter(path => /^(scripts|\.github)\//.test(path) && path !== SELF), line => mergeProblems(line)));
  } else if (mode === 'pr-text') {
    const findings = [];
    if (process.env.GITHUB_EVENT_PATH) {
      const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      String(event.pull_request?.body ?? '').split('\n').forEach((line, index) => {
        for (const problem of textLineProblems(line, deny)) findings.push({ where: `PR description line ${index + 1}`, problem });
      });
    }
    const log = execFileSync('git', ['log', '--no-merges', '--format=%H%x00%B%x01', `${base}..HEAD`], { encoding: 'utf8' });
    for (const entry of log.split('\x01').map(item => item.trim()).filter(Boolean)) {
      const [sha, message] = entry.split('\0');
      const [subject, ...body] = message.split('\n');
      for (const problem of subjectProblems(subject, deny)) findings.push({ where: `commit ${sha.slice(0, 7)} subject`, problem });
      for (const line of body) for (const problem of textLineProblems(line, deny)) findings.push({ where: `commit ${sha.slice(0, 7)} message`, problem });
    }
    report(findings);
  } else {
    console.log('Usage: public-content.mjs files | pins | merges | pr-text <base>');
    process.exit(2);
  }
}
