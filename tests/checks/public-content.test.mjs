// Synthetic: every name, ID, token and address here is made up for the test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  denyList, fileLineProblems, textLineProblems, subjectProblems, fixtureProblems, pinProblems, mergeProblems,
} from '../../scripts/checks/public-content.mjs';

const clean = problems => assert.deepEqual(problems, []);
const flags = (problems, pattern) => assert.ok(problems.some(p => pattern.test(p)), `expected ${pattern} in ${JSON.stringify(problems)}`);

test('generic method text passes', () => {
  clean(fileLineProblems('The task tracker records one comment per merge, keyed by repository ID and merge SHA.'));
  clean(fileLineProblems('See https://docs.github.com/en/actions for reusable workflows.'));
  clean(fileLineProblems('uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1'));
  clean(fileLineProblems('A placeholder repository ID such as 111111111 is fine.'));
});

test('a file with a task ID, an issue number or a real-looking ID is refused', () => {
  flags(fileLineProblems('Fixed in ACME-42 last week.'), /task ID/);
  flags(fileLineProblems('Raised as CU-86abc12de.'), /task ID/);
  flags(fileLineProblems('See #123 for the history.'), /issue or PR number/);
  flags(fileLineProblems('The list is 901223352047.'), /real-looking ID/);
});

test('a file with an outside link or an email is refused', () => {
  flags(fileLineProblems('Details at https://intranet.acme.test/wiki'), /links outside/);
  flags(fileLineProblems('Ask jo@acme.test'), /email/);
  clean(fileLineProblems('A link like https://example.com/x is a placeholder.'));
});

test('secret-shaped strings are refused everywhere', () => {
  for (const line of [
    'token: ghp_abcdefghijklmnopqrstuvwxyz0123',
    'github_pat_11ABCDEFGHIJKLMNOPQRSTUV_xyz',
    'CLICKUP=pk_1234567_ABCDEFGHIJKLMNOPQRST',
    'key sk-abcdefghijklmnopqrstuvwx',
    'AKIAABCDEFGHIJKLMNOP',
    '-----BEGIN RSA PRIVATE KEY-----',
    'api_key = "Zm9vYmFyYmF6cXV4cXV1eA"',
  ]) {
    flags(fileLineProblems(line), /looks like/);
    flags(textLineProblems(line), /looks like/);
  }
});

test('names on the deny list are refused, case-insensitively', () => {
  const deny = denyList(' Acme Corp , Widgetco ');
  assert.deepEqual(deny, ['Acme Corp', 'Widgetco']);
  flags(fileLineProblems('Built first for acme corp.', deny), /deny list/);
  flags(textLineProblems('Tested on WIDGETCO data.', deny), /deny list/);
  clean(textLineProblems('Tested on synthetic data.', deny));
});

test('a PR description may name a task only as a ClickUp link', () => {
  clean(textLineProblems('ClickUp: [ACME-42](https://app.clickup.com/t/86abc12de)'));
  flags(textLineProblems('This finishes ACME-42 properly.'), /task ID outside a ClickUp link/);
  flags(textLineProblems('Evidence: https://drive.example-corp.test/doc'), /links outside/);
  clean(textLineProblems('https://claude.ai/code/session_abc'));
  clean(textLineProblems('Co-Authored-By: Claude <noreply@anthropic.com>'));
});

test('a commit subject may carry the task ID in its prefix and subtask suffix only', () => {
  clean(subjectProblems('feat(ACME-42): Add the merge workflow (ACME-43)'));
  clean(subjectProblems("Merge branch 'main' into claude/feat/ACME-42_Thing"));
  flags(subjectProblems('feat(ACME-42): Fix what ACME-41 broke'), /task ID/);
});

test('fixtures must say they are synthetic', () => {
  clean(fixtureProblems('tests/fixtures/spaces.json', '{ "_note": "Synthetic fixture" }'));
  flags(fixtureProblems('tests/fixtures/spaces.json', '{ "space": "Web" }'), /synthetic/);
  clean(fixtureProblems('docs/onboarding.md', 'anything'));
});

test('every action is pinned to a full SHA', () => {
  clean(pinProblems('      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1'));
  clean(pinProblems('    uses: ./.github/workflows/local.yml'));
  flags(pinProblems('      - uses: actions/checkout@v7'), /isn't pinned/);
  flags(pinProblems('    uses: someone/repo/.github/workflows/x.yml@main'), /isn't pinned/);
  clean(pinProblems('      run: echo uses: nothing'));
});

test('merge and auto-merge calls are refused', () => {
  flags(mergeProblems("await fetch(`${api}/repos/o/r/pulls/${n}/merge`, { method: 'PUT' })"), /merge/);
  flags(mergeProblems('gh pr merge 12 --squash'), /merge/);
  flags(mergeProblems('enablePullRequestAutoMerge'), /merge/);
  clean(mergeProblems('// Finish task on merge moves the task when a person merges.'));
});
