// The skills manifest: every skill in a plugin, its version and library-compat, and the sha256 of each of its files.
// It's committed at manifest/skills.json, and CI fails when it no longer matches the files, so the manifest at a
// commit always describes exactly the skills at that commit.
//
//   node scripts/skills/manifest.mjs write [plugin folder]   regenerate manifest/skills.json
//   node scripts/skills/manifest.mjs check [plugin folder]   fail if it's out of date
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { frontmatter } from '../checks/plugin-audit.mjs';

export const MANIFEST_PATH = 'manifest/skills.json';
export const DEFAULT_PLUGIN = 'plugins/playbook';

const sha256 = data => createHash('sha256').update(data).digest('hex');

function files(dir) {
  return readdirSync(dir).sort().flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

/** One skill folder's files and their hashes, and one hash over all of them. */
export function hashSkill(skillDir) {
  const hashes = {};
  for (const path of files(skillDir)) hashes[relative(skillDir, path).split(sep).join('/')] = sha256(readFileSync(path));
  const combined = sha256(Object.entries(hashes).map(([path, hash]) => `${hash}  ${path}\n`).join(''));
  return { files: hashes, sha256: combined };
}

export function buildManifest(pluginDir) {
  const plugin = JSON.parse(readFileSync(join(pluginDir, '.claude-plugin', 'plugin.json'), 'utf8'));
  const skillsDir = join(pluginDir, 'skills');
  const skills = (existsSync(skillsDir) ? readdirSync(skillsDir).sort() : [])
    .filter(name => existsSync(join(skillsDir, name, 'SKILL.md')))
    .map(name => {
      const fields = frontmatter(readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8')) ?? {};
      const compat = Number.parseInt(fields['library-compat'] ?? '', 10);
      return { id: `${plugin.name}:${name}`, name, version: fields.version ?? null,
        library_compat: Number.isNaN(compat) ? null : compat, ...hashSkill(join(skillsDir, name)) };
    });
  return { plugin: plugin.name, version: plugin.version ?? null, skills };
}

/** What differs between the committed manifest and the files, as sentences. Empty when they match. */
export function manifestDrift(root, pluginDir) {
  const path = join(root, MANIFEST_PATH);
  if (!existsSync(path)) return [`${MANIFEST_PATH} is missing. Run node scripts/skills/manifest.mjs write.`];
  const committed = JSON.parse(readFileSync(path, 'utf8'));
  const actual = buildManifest(pluginDir);
  const problems = [];
  if (committed.plugin !== actual.plugin || committed.version !== actual.version) problems.push('the plugin name or version changed');
  const ids = new Set([...committed.skills, ...actual.skills].map(skill => skill.id));
  for (const id of ids) {
    const a = committed.skills.find(skill => skill.id === id);
    const b = actual.skills.find(skill => skill.id === id);
    if (JSON.stringify(a) !== JSON.stringify(b)) problems.push(`${id} ${!a ? 'is new' : !b ? 'was removed' : 'changed'}`);
  }
  return problems.length ? [`${MANIFEST_PATH} is out of date: ${problems.join('; ')}. Run node scripts/skills/manifest.mjs write and commit it.`] : [];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [mode, pluginDir = DEFAULT_PLUGIN] = process.argv.slice(2);
  if (mode === 'write') {
    mkdirSync('manifest', { recursive: true });
    writeFileSync(MANIFEST_PATH, `${JSON.stringify(buildManifest(pluginDir), null, 2)}\n`);
    console.log(`Wrote ${MANIFEST_PATH}.`);
  } else if (mode === 'check') {
    const problems = manifestDrift('.', pluginDir);
    for (const problem of problems) console.error(`::error::${problem}`);
    if (problems.length) process.exit(1);
    console.log('The skills manifest matches the files.');
  } else {
    console.error('Usage: node scripts/skills/manifest.mjs write|check [plugin folder]');
    process.exit(2);
  }
}
