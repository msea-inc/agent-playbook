// Synthetic: every plugin, skill and agent here is made up for the test, and written to a temporary folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { auditRepository } from '../../scripts/checks/plugin-audit.mjs';

function repository(files) {
  const root = mkdtempSync(join(tmpdir(), 'plugin-audit-'));
  const all = {
    '.claude-plugin/marketplace.json': JSON.stringify({ name: 'm', owner: { name: 'o' }, plugins: [{ name: 'p', source: './plugins/p' }] }),
    'plugins/p/.claude-plugin/plugin.json': JSON.stringify({ name: 'p', version: '1.0.0', description: 'd' }),
    'plugins/p/skills/good/SKILL.md': '---\nname: good\ndescription: A synthetic skill.\nversion: 1.0.0\n---\n\nBody.\n',
    ...files,
  };
  for (const [path, content] of Object.entries(all)) {
    if (content === null) continue;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const problems = files => auditRepository(repository(files));

test('a plugin with allowed keys, a well-formed skill and a built-ins-only script passes', () => {
  assert.deepEqual(problems({
    'plugins/p/skills/good/scripts/sum.mjs': "import { readFileSync } from 'node:fs';\nexport const sum = (a, b) => a + b;\n",
    'plugins/p/agents/reader.md': '---\nname: reader\ndescription: Reads.\ndisallowedTools: Write, Edit\n---\n',
  }), []);
});

test('plugin.json may declare only the allowed keys', () => {
  for (const key of ['hooks', 'mcpServers', 'commands', 'lspServers', 'outputStyles']) {
    const found = problems({ 'plugins/p/.claude-plugin/plugin.json': JSON.stringify({ name: 'p', version: '1.0.0', [key]: './x' }) });
    assert.ok(found.some(p => p.includes(`'${key}'`)), `${key}: ${found}`);
  }
});

test('files that Claude Code would pick up as hooks, MCP servers, commands or settings are refused', () => {
  for (const path of ['plugins/p/hooks/hooks.json', 'plugins/p/.mcp.json', 'plugins/p/.lsp.json', 'plugins/p/commands/run.md', 'plugins/p/settings.json']) {
    const found = problems({ [path]: '{}' });
    assert.ok(found.some(p => p.includes(path)), `${path}: ${found}`);
  }
});

test('skill frontmatter may hold only the allowed keys, and allowed-tools is refused', () => {
  const found = problems({ 'plugins/p/skills/bad/SKILL.md': '---\nname: bad\ndescription: d\nallowed-tools: Bash\n---\n' });
  assert.ok(found.some(p => p.includes("'allowed-tools'")), String(found));
  assert.ok(problems({ 'plugins/p/skills/bad/SKILL.md': '---\nname: bad\ndescription: d\nmodel: big\n---\n' }).some(p => p.includes("'model'")));
});

test('a skill needs a name matching its folder and a description', () => {
  assert.ok(problems({ 'plugins/p/skills/bad/SKILL.md': '---\nname: other\ndescription: d\n---\n' }).some(p => p.includes('folder')));
  assert.ok(problems({ 'plugins/p/skills/bad/SKILL.md': '---\nname: bad\n---\n' }).some(p => p.includes('description')));
  assert.ok(problems({ 'plugins/p/skills/bad/SKILL.md': 'No frontmatter.\n' }).some(p => p.includes('frontmatter')));
});

test('an agent may only remove tools', () => {
  for (const key of ['tools', 'permissionMode', 'mcpServers', 'hooks']) {
    const found = problems({ 'plugins/p/agents/a.md': `---\nname: a\ndescription: d\n${key}: x\n---\n` });
    assert.ok(found.some(p => p.includes(`'${key}'`)), `${key}: ${found}`);
  }
});

test('bundled scripts may import only Node built-ins, and never use the network, processes or file writes', () => {
  const cases = {
    "import x from 'left-pad';": 'imports',
    "const r = await fetch('x');": 'fetch',
    "import { spawn } from 'node:child_process';": 'child_process',
    "import { writeFileSync } from 'node:fs'; writeFileSync('a', 'b');": 'writes',
    "import fs from 'node:fs'; fs.appendFileSync('a', 'b');": 'writes',
    "const m = await import('https://x.example.com/m.js');": 'imports',
    "const cp = require('child_process');": 'child_process',
  };
  for (const [code, word] of Object.entries(cases)) {
    const found = problems({ 'plugins/p/skills/good/scripts/s.mjs': code });
    assert.ok(found.some(p => p.includes(word)), `${code}: ${found}`);
  }
});

test('a marketplace entry must point inside plugins/, and every listed plugin must exist', () => {
  assert.ok(problems({ '.claude-plugin/marketplace.json': JSON.stringify({ name: 'm', owner: { name: 'o' }, plugins: [{ name: 'p', source: '../elsewhere' }] }) }).some(p => p.includes('plugins/')));
  assert.ok(problems({ '.claude-plugin/marketplace.json': JSON.stringify({ name: 'm', owner: { name: 'o' }, plugins: [{ name: 'q', source: './plugins/q' }] }) }).some(p => p.includes('plugin.json')));
  assert.ok(problems({ '.claude-plugin/marketplace.json': JSON.stringify({ name: 'm', owner: { name: 'o' }, plugins: [{ name: 'p', source: { source: 'github', repo: 'a/b' } }] }) }).some(p => p.includes('plugins/')));
});
