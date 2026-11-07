// Synthetic: every plugin, skill, commit and run here is made up for the test, and written to a temporary folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { buildManifest, manifestDrift } from '../../scripts/skills/manifest.mjs';
import { verifySkills, insidePlugin } from '../../scripts/skills/verify.mjs';
import { loadReport } from '../../scripts/skills/load-report.mjs';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

function playbook(extra = {}) {
  const root = mkdtempSync(join(tmpdir(), 'skills-'));
  const files = {
    'plugins/p/.claude-plugin/plugin.json': JSON.stringify({ name: 'p', version: '2.0.0', description: 'd' }),
    'plugins/p/skills/review/SKILL.md': '---\nname: review\ndescription: d\nversion: 1.2.0\nlibrary-compat: 1\n---\nBody.\n',
    'plugins/p/skills/review/references/notes.md': 'Notes.\n',
    'plugins/p/skills/style/SKILL.md': '---\nname: style\ndescription: d\nversion: 1.0.0\nlibrary-compat: 1\n---\nBody.\n',
    ...extra,
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  const manifest = buildManifest(join(root, 'plugins/p'));
  mkdirSync(join(root, 'manifest'), { recursive: true });
  writeFileSync(join(root, 'manifest/skills.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return root;
}

const request = (root, overrides = {}) => ({
  playbookDir: root, pluginDir: join(root, 'plugins/p'), expectedSha: SHA_A, checkedOutSha: SHA_A, required: ['p:review'], ...overrides,
});

test('the manifest lists every skill with its version and the sha256 of each of its files', () => {
  const root = playbook();
  const manifest = JSON.parse(readFileSync(join(root, 'manifest/skills.json'), 'utf8'));
  assert.equal(manifest.plugin, 'p');
  assert.equal(manifest.version, '2.0.0');
  const review = manifest.skills.find(skill => skill.id === 'p:review');
  assert.equal(review.version, '1.2.0');
  assert.equal(review.library_compat, 1);
  assert.deepEqual(Object.keys(review.files), ['SKILL.md', 'references/notes.md']);
  assert.match(review.sha256, /^[0-9a-f]{64}$/);
});

test('a manifest that no longer matches the files is reported, so CI fails until it is regenerated', () => {
  const root = playbook();
  assert.deepEqual(manifestDrift(root, join(root, 'plugins/p')), []);
  writeFileSync(join(root, 'plugins/p/skills/style/SKILL.md'), '---\nname: style\ndescription: changed\nversion: 1.0.0\nlibrary-compat: 1\n---\n');
  assert.match(manifestDrift(root, join(root, 'plugins/p')).join(' '), /p:style/);
});

test('5: skills are verified on disk at the requested revision', () => {
  const result = verifySkills(request(playbook()));
  assert.equal(result.ok, true);
  assert.equal(result.library.sha, SHA_A);
  const review = result.skills.find(skill => skill.id === 'p:review');
  assert.equal(review.verified_on_disk, true);
  assert.match(review.sha256, /^[0-9a-f]{64}$/);
});

test('5: pinning revision A while the checkout holds revision B fails', () => {
  const result = verifySkills(request(playbook(), { checkedOutSha: SHA_B }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'skill_unavailable');
  assert.match(result.problem, /bbbbbbb.*aaaaaaa|aaaaaaa.*bbbbbbb/);
});

test('7: a missing skill, a changed file or an unsupported library-compat fails clearly', () => {
  const missing = verifySkills(request(playbook(), { required: ['p:review', 'p:absent'] }));
  assert.equal(missing.ok, false);
  assert.equal(missing.category, 'infrastructure');
  assert.equal(missing.reason, 'skill_unavailable');
  assert.match(missing.problem, /p:absent/);

  const root = playbook();
  writeFileSync(join(root, 'plugins/p/skills/review/references/notes.md'), 'Changed after the manifest.\n');
  const changed = verifySkills(request(root));
  assert.equal(changed.ok, false);
  assert.match(changed.problem, /references\/notes\.md/);

  const future = verifySkills(request(playbook({
    'plugins/p/skills/review/SKILL.md': '---\nname: review\ndescription: d\nversion: 9.0.0\nlibrary-compat: 99\n---\n',
  })));
  assert.equal(future.ok, false);
  assert.match(future.problem, /library-compat 99/);
});

test('6: the same plugin verifies from a plugin cache path and from a checkout, and nothing outside it is read', () => {
  const root = playbook();
  const cache = mkdtempSync(join(tmpdir(), 'plugin-cache-'));
  cpSync(join(root, 'plugins/p'), join(cache, 'p', '2.0.0'), { recursive: true });
  const fromCache = verifySkills(request(root, { pluginDir: join(cache, 'p', '2.0.0') }));
  const fromCheckout = verifySkills(request(root));
  assert.equal(fromCache.ok, true);
  assert.deepEqual(fromCache.skills.map(s => s.sha256), fromCheckout.skills.map(s => s.sha256));

  const plugin = join(root, 'plugins/p');
  assert.equal(insidePlugin(plugin, 'skills/review/references/notes.md'), join(plugin, 'skills/review/references/notes.md'));
  assert.throws(() => insidePlugin(plugin, '../../manifest/skills.json'), /outside the plugin/);
  assert.throws(() => insidePlugin(plugin, '/etc/passwd'), /outside the plugin/);
});

test('the load report records what the runtime said, with its source, and null for what it did not report', () => {
  const verified = verifySkills(request(playbook(), { required: ['p:review', 'p:style'] }));
  const messages = [
    { type: 'system', subtype: 'init', claude_code_version: '9.9.9',
      plugins: [{ name: 'p', path: '/work/.playbook/plugins/p', source: 'p@inline', version: '2.0.0' }],
      skills: ['review', 'p:review', 'p:style'] },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'p:review' } }] } },
    { type: 'result', subtype: 'success' },
  ];
  const report = loadReport({ verified, messages, runtime: { action: SHA_B } });
  assert.equal(report.runtime.claude_code_version.value, '9.9.9');
  assert.equal(report.runtime.claude_code_version.source, 'init message');
  assert.equal(report.runtime.action.value, SHA_B);
  assert.equal(report.plugin.version.value, '2.0.0');
  const review = report.skills.find(skill => skill.id === 'p:review');
  assert.equal(review.verified_on_disk, true);
  assert.equal(review.listed.value, true);
  assert.equal(review.used.value, true);
  assert.equal(report.skills.find(skill => skill.id === 'p:style').used.value, false);

  const quiet = loadReport({ verified, messages: [{ type: 'result', subtype: 'success' }], runtime: {} });
  assert.equal(quiet.runtime.claude_code_version.value, null);
  assert.equal(quiet.plugin.version.value, null);
  assert.equal(quiet.skills[0].listed.value, null);
  assert.equal(quiet.skills[0].used.value, null);
});
