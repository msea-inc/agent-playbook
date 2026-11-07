// Verify the skills a run needs, on disk, at the playbook commit the caller pinned. Fails with the category
// `infrastructure` and the reason `skill_unavailable` when the checkout isn't that commit, a skill is missing, a
// file doesn't match the manifest, or a skill needs a library-compat this playbook doesn't support. Nothing should
// be published after a failure.
//
//   node scripts/skills/verify.mjs   reads its inputs from the environment and writes VERIFIED_FILE (JSON):
//     PLAYBOOK_DIR       the playbook checkout (holds manifest/skills.json)
//     PLUGIN_DIR         the plugin folder Claude Code loads (default: PLAYBOOK_DIR/plugins/playbook)
//     EXPECTED_SHA       the full commit SHA the caller pinned
//     CHECKED_OUT_SHA    the commit the checkout actually holds (git rev-parse HEAD)
//     REQUIRED_SKILLS    comma-separated skill IDs, e.g. playbook:code-review
//     VERIFIED_FILE      where to write the result
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MANIFEST_PATH, hashSkill } from './manifest.mjs';

/** The library-compat majors this playbook's loaders understand. */
export const SUPPORTED_LIBRARY_COMPAT = [1];

/** A path inside the plugin folder, or an error. Scripts and references resolve only through this. */
export function insidePlugin(pluginDir, path) {
  const root = resolve(pluginDir);
  const full = resolve(root, path);
  const rel = relative(root, full);
  if (isAbsolute(path) || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`'${path}' is outside the plugin folder.`);
  return full;
}

export function verifySkills({ playbookDir, pluginDir, expectedSha, checkedOutSha, required }) {
  const library = { sha: expectedSha ?? null, checked_out: checkedOutSha ?? null };
  const fail = problem => ({ ok: false, category: 'infrastructure', reason: 'skill_unavailable', problem, library, skills: [] });
  if (!/^[0-9a-f]{40}$/.test(expectedSha ?? '')) return fail(`The pinned playbook commit '${expectedSha ?? ''}' isn't a full 40-character SHA.`);
  if (checkedOutSha !== expectedSha) {
    return fail(`The playbook checkout holds ${String(checkedOutSha).slice(0, 7)}, but the caller pinned ${expectedSha.slice(0, 7)}. Check out exactly the pinned commit.`);
  }
  const manifestFile = join(playbookDir, MANIFEST_PATH);
  if (!existsSync(manifestFile)) return fail(`${MANIFEST_PATH} is missing from the playbook at ${expectedSha.slice(0, 7)}.`);
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  const skills = [];
  for (const id of required) {
    const entry = manifest.skills.find(skill => skill.id === id);
    if (!entry) return fail(`The skill ${id} isn't in the playbook at ${expectedSha.slice(0, 7)}. Pin a release that has it, or stop asking for it.`);
    if (!SUPPORTED_LIBRARY_COMPAT.includes(entry.library_compat)) {
      return fail(`The skill ${id} needs library-compat ${entry.library_compat}, but this playbook supports ${SUPPORTED_LIBRARY_COMPAT.join(', ')}. Pin a matching release.`);
    }
    const dir = insidePlugin(pluginDir, join('skills', entry.name));
    if (!existsSync(join(dir, 'SKILL.md'))) return fail(`The skill ${id} is in the manifest but not on disk at ${dir}.`);
    const onDisk = hashSkill(dir);
    const changed = [...new Set([...Object.keys(entry.files), ...Object.keys(onDisk.files)])]
      .filter(path => entry.files[path] !== onDisk.files[path]);
    if (changed.length) return fail(`The skill ${id} on disk doesn't match the manifest: ${changed.join(', ')}.`);
    skills.push({ id, version: entry.version, sha256: onDisk.sha256, verified_on_disk: true });
  }
  return { ok: true, library, plugin: { name: manifest.plugin, version: manifest.version }, skills };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const env = process.env;
  const playbookDir = env.PLAYBOOK_DIR || '.playbook';
  const result = verifySkills({
    playbookDir, pluginDir: env.PLUGIN_DIR || join(playbookDir, 'plugins', 'playbook'),
    expectedSha: env.EXPECTED_SHA, checkedOutSha: env.CHECKED_OUT_SHA,
    required: String(env.REQUIRED_SKILLS ?? '').split(',').map(id => id.trim()).filter(Boolean),
  });
  if (env.VERIFIED_FILE) writeFileSync(env.VERIFIED_FILE, `${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) {
    console.error(`::error::${result.problem}`);
    process.exit(1);
  }
  console.log(`Verified ${result.skills.map(s => `${s.id} ${s.version}`).join(', ')} at ${result.library.sha}.`);
}
