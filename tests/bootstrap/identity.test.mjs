// Synthetic: every claim, SHA and token here is made up for the test.
// Runs the inline bootstrap step from bootstrap-proof.yml exactly as written, with a fake curl
// standing in for GitHub's OIDC endpoint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkoutMatches } from '../../scripts/bootstrap/proof.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workflow = readFileSync(join(root, '.github/workflows/bootstrap-proof.yml'), 'utf8');
const step = workflow.split('# bootstrap:begin')[1].split('# bootstrap:end')[0];

const SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);
const PLAYBOOK = 'msea-inc/agent-playbook/.github/workflows/bootstrap-proof.yml';

function fakeToken(claims) {
  const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'none' })}.${part(claims)}.fake-signature-do-not-log`;
}

function run(claims, { grant = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'bootstrap-'));
  const token = fakeToken(claims);
  writeFileSync(join(dir, 'curl'), `#!/usr/bin/env bash\nprintf '%s' '${JSON.stringify({ value: token })}'\n`);
  chmodSync(join(dir, 'curl'), 0o755);
  const output = join(dir, 'output');
  writeFileSync(output, '');
  const env = { PATH: `${dir}:${process.env.PATH}`, EXPECTED_REPOSITORY: 'msea-inc/agent-playbook', GITHUB_OUTPUT: output };
  if (grant) Object.assign(env, { ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.invalid/token?x=1', ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-token' });
  const result = spawnSync('bash', ['-c', step], { env, encoding: 'utf8' });
  return { status: result.status, log: result.stdout + result.stderr, output: readFileSync(output, 'utf8'), token };
}

test('a caller pinned to a full SHA gets that commit', () => {
  const result = run({ job_workflow_ref: `${PLAYBOOK}@${SHA}`, job_workflow_sha: SHA });
  assert.equal(result.status, 0, result.log);
  assert.match(result.output, new RegExp(`sha=${SHA}`));
  assert.match(result.output, /repository=msea-inc\/agent-playbook/);
});

for (const [name, ref] of [['a branch', 'refs/heads/main'], ['a tag', 'refs/tags/v0.1.0'], ['a short SHA', SHA.slice(0, 7)]]) {
  test(`a caller pinned to ${name} is refused`, () => {
    const result = run({ job_workflow_ref: `${PLAYBOOK}@${ref}`, job_workflow_sha: SHA });
    assert.equal(result.status, 1);
    assert.match(result.log, /Pin it to a full 40-character commit SHA/);
    assert.equal(result.output, '');
  });
}

test("another repository's identity is refused", () => {
  const result = run({ job_workflow_ref: `someone-else/agent-playbook/.github/workflows/bootstrap-proof.yml@${SHA}`, job_workflow_sha: SHA });
  assert.equal(result.status, 1);
  assert.match(result.log, /not msea-inc\/agent-playbook, so it was refused/);
});

test('a ref that disagrees with the commit is refused', () => {
  const result = run({ job_workflow_ref: `${PLAYBOOK}@${SHA}`, job_workflow_sha: OTHER_SHA });
  assert.equal(result.status, 1);
  assert.match(result.log, /disagree/);
});

test('a caller without id-token: write is told how to fix it', () => {
  const result = run({}, { grant: false });
  assert.equal(result.status, 1);
  assert.match(result.log, /id-token: write/);
});

test('the OIDC token never appears in the log, except in the mask command', () => {
  for (const claims of [{ job_workflow_ref: `${PLAYBOOK}@${SHA}`, job_workflow_sha: SHA }, { job_workflow_ref: `${PLAYBOOK}@main`, job_workflow_sha: SHA }]) {
    const result = run(claims);
    const unmasked = result.log.split('\n').filter(line => !line.startsWith('::add-mask::'));
    assert.ok(!unmasked.join('\n').includes(result.token), result.log);
    assert.ok(!result.output.includes(result.token));
  }
});

test('the checkout check accepts only the expected commit', () => {
  assert.equal(checkoutMatches(SHA, `${SHA}\n`).ok, true);
  assert.equal(checkoutMatches(SHA, OTHER_SHA).ok, false);
  assert.equal(checkoutMatches('main', 'main').ok, false);
});

test('every playbook workflow starts with the same bootstrap', async () => {
  const { readdirSync } = await import('node:fs');
  const dir = join(root, '.github/workflows');
  for (const file of readdirSync(dir).filter(name => name !== 'ci.yml')) {
    const text = readFileSync(join(dir, file), 'utf8');
    assert.ok(text.includes('# bootstrap:begin'), `${file} has no bootstrap`);
    assert.equal(text.split('# bootstrap:begin')[1].split('# bootstrap:end')[0], step, `${file}'s bootstrap differs from bootstrap-proof.yml`);
  }
});
