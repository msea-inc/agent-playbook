// Skill index check: the project-scaffold skill's index must list every skill in the plugin, and every "Read first"
// line must point at a file and a section that exist, so an agent that follows it lands in the right place.
//
// An entry is a "## <plugin>:<skill>" heading. A "Read first" line is a list item like
//   - `release-manager/SKILL.md` › Labels: every pull request you open
// with a path relative to the plugin's skills/ folder and, after the ›, a heading's exact text in that file.
//
// Usage: node scripts/skills/index-check.mjs [plugin folder]   (default: plugins/playbook)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const INDEX_PATH = 'skills/project-scaffold/references/skill-index.md';

const ENTRY = /^##\s+([a-z0-9-]+):([a-z0-9-]+)\s*$/;
const READ_FIRST = /^\s*-\s+`([^`]+)`(?:\s+›\s+(.+?))?\s*$/;
const HEADING = /^#{1,6}\s+(.+?)\s*#*\s*$/;

/** The headings in a Markdown file, as their exact text, outside fenced code blocks. */
export function headings(text) {
  const found = new Set();
  let fenced = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const match = HEADING.exec(line);
    if (match) found.add(match[1]);
  }
  return found;
}

/** Each entry in the index: its skill name and the files and sections under Read first. */
export function parseIndex(text) {
  const entries = [];
  let current = null;
  let reading = false;
  for (const line of text.split(/\r?\n/)) {
    const entry = ENTRY.exec(line);
    if (entry) {
      current = { plugin: entry[1], skill: entry[2], reads: [] };
      entries.push(current);
      reading = false;
      continue;
    }
    if (!current) continue;
    if (/^\s*-\s+\*\*Read first:\*\*/.test(line)) {
      reading = true;
      continue;
    }
    if (/^\s*-\s+\*\*/.test(line) || /^#/.test(line)) reading = false;
    if (!reading) continue;
    const read = READ_FIRST.exec(line);
    if (read) current.reads.push({ path: read[1], section: read[2] ?? null });
  }
  return entries;
}

/** Problems with the index of the plugin in pluginDir, as sentences. Empty when it's right. */
export function indexProblems(pluginDir) {
  const problems = [];
  const plugin = JSON.parse(readFileSync(join(pluginDir, '.claude-plugin/plugin.json'), 'utf8')).name;
  const skillsDir = join(pluginDir, 'skills');
  const skills = readdirSync(skillsDir).filter(name => statSync(join(skillsDir, name)).isDirectory()).sort();
  const indexFile = join(pluginDir, INDEX_PATH);

  if (!existsSync(indexFile)) return [`The skill index ${INDEX_PATH} is missing.`];

  const entries = parseIndex(readFileSync(indexFile, 'utf8'));
  const named = new Map();

  for (const entry of entries) {
    const id = `${entry.plugin}:${entry.skill}`;
    if (entry.plugin !== plugin) problems.push(`The index entry ${id} names another plugin; this one is ${plugin}.`);
    if (named.has(id)) problems.push(`The index lists ${id} twice.`);
    named.set(id, entry);
    if (!skills.includes(entry.skill)) problems.push(`The index lists ${id}, but there's no skills/${entry.skill} folder.`);
    if (!entry.reads.length) problems.push(`The index entry ${id} has no Read first lines.`);

    for (const { path, section } of entry.reads) {
      const base = resolve(skillsDir);
      const file = resolve(base, path);
      if (!file.startsWith(base + sep)) {
        problems.push(`${id} reads ${path}, which is outside the plugin's skills folder.`);
        continue;
      }
      if (!existsSync(file)) {
        problems.push(`${id} reads ${path}, which doesn't exist.`);
        continue;
      }
      if (section && !headings(readFileSync(file, 'utf8')).has(section)) {
        problems.push(`${id} reads ${path} › ${section}, but that file has no heading with that text.`);
      }
    }
  }

  for (const skill of skills) {
    if (!named.has(`${plugin}:${skill}`)) problems.push(`skills/${skill} has no entry in the index (${plugin}:${skill}).`);
  }

  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const problems = indexProblems(resolve(process.argv[2] ?? 'plugins/playbook'));
  for (const problem of problems) console.log(`::error::${problem}`);
  console.log(problems.length ? `${problems.length} problem(s) in the skill index.` : 'The skill index matches the skills.');
  if (problems.length) process.exit(1);
}
