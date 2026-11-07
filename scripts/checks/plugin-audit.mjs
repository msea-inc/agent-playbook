// Plugin audit: a skill is guidance, never permission. The runtime that runs a skill decides what it may do, so
// nothing in a plugin may grant tools, add hooks, start servers or run code on its own.
//
// - plugin.json declares only name, version, description, author, repository, skills and agents.
// - No file Claude Code would load as hooks, MCP or LSP servers, commands or settings.
// - Skill frontmatter holds only name, description, version, library-compat and disable-model-invocation. The name
//   matches the skill's folder.
// - Agents may only remove tools (disallowedTools).
// - Bundled scripts import Node built-ins only, and never use the network, child processes or file writes.
//
// Usage: node scripts/checks/plugin-audit.mjs [repository root]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PLUGIN_KEYS = ['name', 'version', 'description', 'author', 'repository', 'skills', 'agents'];
export const SKILL_KEYS = ['name', 'description', 'version', 'library-compat', 'disable-model-invocation'];
export const AGENT_KEYS = ['name', 'description', 'disallowedTools'];
/** Files Claude Code loads from a plugin folder by convention, whatever plugin.json says. */
const REFUSED_FILES = ['hooks', '.mcp.json', '.lsp.json', 'commands', 'settings.json', 'output-styles', 'monitors', 'bin'];
const SCRIPT = /\.(?:mjs|cjs|js|ts)$/;
const IMPORT = /\b(?:import\s*(?:[^'"]*?\sfrom\s*)?|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
const FORBIDDEN_CODE = [
  [/\bfetch\s*\(/, 'calls fetch'],
  [/child_process/, 'uses child_process'],
  [/\b(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|rm|rmSync|unlink|unlinkSync|rename|renameSync|mkdir|mkdirSync|copyFile|copyFileSync|cp|cpSync)\s*\(/, 'writes files'],
  [/\bfs\.write/, 'writes files'],
  [/\bnode:(?:net|http|https|http2|dgram|tls|worker_threads|cluster)\b/, 'uses the network or other processes'],
];

/** The top-level keys and the body of a Markdown file's YAML frontmatter, or null when it has none. */
export function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const key = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (key) fields[key[1]] = key[2].trim();
  }
  return fields;
}

function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

function readJson(path, problems, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    problems.push(`${label} isn't valid JSON: ${error.message}`);
    return null;
  }
}

function auditPlugin(root, dir, problems) {
  const rel = path => relative(root, path).split(sep).join('/');
  const manifestPath = join(dir, '.claude-plugin', 'plugin.json');
  if (!existsSync(manifestPath)) {
    problems.push(`${rel(dir)} has no .claude-plugin/plugin.json`);
    return;
  }
  const manifest = readJson(manifestPath, problems, rel(manifestPath));
  for (const key of Object.keys(manifest ?? {})) {
    if (!PLUGIN_KEYS.includes(key)) problems.push(`${rel(manifestPath)} declares '${key}', which a plugin here may not. Allowed: ${PLUGIN_KEYS.join(', ')}.`);
  }
  for (const name of REFUSED_FILES) {
    const path = join(dir, name);
    if (!existsSync(path)) continue;
    const what = name.replace(/^\./, '').replace(/\.json$/, '');
    for (const file of statSync(path).isDirectory() ? files(path) : [path]) {
      problems.push(`${rel(file)} would be loaded by Claude Code as ${what}, which a plugin here may not have.`);
    }
  }

  const skills = join(dir, 'skills');
  for (const name of existsSync(skills) ? readdirSync(skills) : []) {
    const skillDir = join(skills, name);
    if (!statSync(skillDir).isDirectory()) continue;
    const skillFile = join(skillDir, 'SKILL.md');
    if (!existsSync(skillFile)) {
      problems.push(`${rel(skillDir)} has no SKILL.md`);
      continue;
    }
    const fields = frontmatter(readFileSync(skillFile, 'utf8'));
    if (!fields) {
      problems.push(`${rel(skillFile)} has no frontmatter`);
      continue;
    }
    for (const key of Object.keys(fields)) {
      if (!SKILL_KEYS.includes(key)) problems.push(`${rel(skillFile)} has '${key}' in its frontmatter, which a skill may not. Allowed: ${SKILL_KEYS.join(', ')}.`);
    }
    if (fields.name !== name) problems.push(`${rel(skillFile)} is named '${fields.name ?? ''}', but its folder is '${name}'. They must match.`);
    if (!fields.description) problems.push(`${rel(skillFile)} has no description`);
  }

  const agents = join(dir, 'agents');
  for (const path of files(agents).filter(path => path.endsWith('.md'))) {
    const fields = frontmatter(readFileSync(path, 'utf8')) ?? {};
    for (const key of Object.keys(fields)) {
      if (!AGENT_KEYS.includes(key)) problems.push(`${rel(path)} has '${key}' in its frontmatter. An agent may only remove tools; allowed: ${AGENT_KEYS.join(', ')}.`);
    }
  }

  for (const path of files(dir).filter(path => SCRIPT.test(path))) {
    const code = readFileSync(path, 'utf8');
    for (const [, specifier] of code.matchAll(IMPORT)) {
      if (!specifier.startsWith('node:') && !specifier.startsWith('./') && !specifier.startsWith('../')) {
        problems.push(`${rel(path)} imports '${specifier}'. Bundled scripts may import Node built-ins (node:…) and their own files only.`);
      }
    }
    for (const [pattern, what] of FORBIDDEN_CODE) {
      if (pattern.test(code)) problems.push(`${rel(path)} ${what}. Bundled scripts read the paths passed to them and print a result, nothing else.`);
    }
  }
}

/** Every problem with the marketplace and the plugins it lists, as sentences that say what to change. */
export function auditRepository(root) {
  const problems = [];
  const marketplacePath = join(root, '.claude-plugin', 'marketplace.json');
  if (!existsSync(marketplacePath)) return problems;
  const marketplace = readJson(marketplacePath, problems, '.claude-plugin/marketplace.json') ?? {};
  for (const entry of marketplace.plugins ?? []) {
    const source = typeof entry.source === 'string' ? entry.source : '';
    const dir = resolve(root, source);
    if (!/^\.\/plugins\/[\w-]+$/.test(source) || !dir.startsWith(resolve(root, 'plugins') + sep)) {
      problems.push(`The marketplace's '${entry.name}' plugin must come from this repository, as ./plugins/<name>.`);
      continue;
    }
    auditPlugin(root, dir, problems);
  }
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const problems = auditRepository(resolve(process.argv[2] ?? '.'));
  for (const problem of problems) console.error(`::error::${problem}`);
  if (problems.length) process.exit(1);
  console.log('No problems found.');
}
