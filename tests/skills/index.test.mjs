// Synthetic: every plugin and skill here is made up for the test, and written to a temporary folder, except the last
// test, which checks the real plugin's index.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { headings, indexProblems, INDEX_PATH, parseIndex } from '../../scripts/skills/index-check.mjs';

const skill = name => `---\nname: ${name}\ndescription: d\nversion: 1.0.0\nlibrary-compat: 1\n---\n\n# ${name}\n\n## Start here\n`;

const entry = (name, reads) => `## p:${name}\n\n- **Use when:** u\n- **Read first:**\n${reads.map(r => `  - ${r}`).join('\n')}\n`;

function plugin(index, extra = {}) {
  const root = mkdtempSync(join(tmpdir(), 'index-'));
  const files = {
    '.claude-plugin/plugin.json': JSON.stringify({ name: 'p', version: '1.0.0', description: 'd' }),
    'skills/alpha/SKILL.md': skill('alpha'),
    'skills/project-scaffold/SKILL.md': skill('project-scaffold'),
    [INDEX_PATH]: index,
    ...extra,
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const good = `# Index\n\n${entry('alpha', ['`alpha/SKILL.md` › Start here'])}\n${entry('project-scaffold', ['`project-scaffold/SKILL.md`'])}`;

test('a complete index with real files and sections has no problems', () => {
  assert.deepEqual(indexProblems(plugin(good)), []);
});

test('a skill with no entry is reported', () => {
  const index = `# Index\n\n${entry('project-scaffold', ['`project-scaffold/SKILL.md`'])}`;
  assert.match(indexProblems(plugin(index)).join('\n'), /skills\/alpha has no entry/);
});

test('an entry for a skill that does not exist is reported', () => {
  const index = `${good}\n${entry('ghost', ['`alpha/SKILL.md`'])}`;
  assert.match(indexProblems(plugin(index)).join('\n'), /no skills\/ghost folder/);
});

test('a Read first file that does not exist is reported', () => {
  const index = good.replace('`alpha/SKILL.md` › Start here', '`alpha/references/gone.md`');
  assert.match(indexProblems(plugin(index)).join('\n'), /alpha\/references\/gone\.md, which doesn't exist/);
});

test('a Read first section that is not a heading in the file is reported', () => {
  const index = good.replace('› Start here', '› Renamed section');
  assert.match(indexProblems(plugin(index)).join('\n'), /no heading with that text/);
});

test('an entry with no Read first lines is reported', () => {
  const index = `${good.replace(/## p:alpha[\s\S]*?(?=## p:project-scaffold)/, '## p:alpha\n\n- **Use when:** u\n\n')}`;
  assert.match(indexProblems(plugin(index)).join('\n'), /p:alpha has no Read first lines/);
});

test('a path outside the skills folder is refused', () => {
  const index = good.replace('`alpha/SKILL.md` › Start here', '`../.claude-plugin/plugin.json`');
  assert.match(indexProblems(plugin(index)).join('\n'), /outside the plugin's skills folder/);
});

test('an entry naming another plugin, or listed twice, is reported', () => {
  const index = `${good}\n${entry('alpha', ['`alpha/SKILL.md`'])}`.replace('## p:project-scaffold', '## q:project-scaffold');
  const problems = indexProblems(plugin(index)).join('\n');
  assert.match(problems, /names another plugin/);
  assert.match(problems, /lists p:alpha twice/);
});

test('a missing index is reported', () => {
  const root = plugin(good);
  writeFileSync(join(root, INDEX_PATH), '');
  assert.match(indexProblems(root).join('\n'), /no entry/);
});

test('headings inside fenced code are ignored, and parseIndex reads paths and sections', () => {
  assert.deepEqual([...headings('# A\n```\n# Not one\n```\n## B ##\n')], ['A', 'B']);
  assert.deepEqual(parseIndex(good)[0], { plugin: 'p', skill: 'alpha', reads: [{ path: 'alpha/SKILL.md', section: 'Start here' }] });
});

test('the real playbook plugin\'s index matches its skills', () => {
  assert.deepEqual(indexProblems(join(import.meta.dirname, '../../plugins/playbook')), []);
});
