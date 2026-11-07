// The load report: provenance.json for one run. It joins what verify.mjs checked on disk with what the runtime said
// it loaded and used. Each runtime field carries its source, and is null when the runtime didn't report it; a
// missing field never fails the run.
//
//   node scripts/skills/load-report.mjs   reads VERIFIED_FILE and EXECUTION_FILE (Claude Code's JSON transcript),
//                                         plus ACTION_SHA (the pinned action), and writes PROVENANCE_FILE
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const field = (value, source) => ({ value: value ?? null, source: value === undefined || value === null ? null : source });

export function loadReport({ verified, messages, runtime = {} }) {
  const init = messages.find(m => m.type === 'system' && m.subtype === 'init');
  const listed = Array.isArray(init?.skills) ? init.skills : null;
  const used = init ? new Set(messages.flatMap(m => m.message?.content ?? [])
    .filter(c => c.type === 'tool_use' && c.name === 'Skill').map(c => c.input?.skill)) : null;
  const plugin = (init?.plugins ?? []).find(p => p.name === verified.plugin?.name);
  return {
    library: verified.library,
    runtime: {
      action: field(runtime.action, 'workflow pin'),
      claude_code_version: field(init?.claude_code_version, 'init message'),
    },
    plugin: {
      name: verified.plugin?.name ?? null,
      version: field(plugin?.version, 'init message'),
      path: field(plugin?.path, 'init message'),
      source: field(plugin?.source, 'init message'),
    },
    skills: verified.skills.map(skill => ({
      ...skill,
      listed: field(listed ? listed.includes(skill.id) : null, 'init message'),
      used: field(used ? used.has(skill.id) : null, 'transcript'),
    })),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const env = process.env;
  const verified = JSON.parse(readFileSync(env.VERIFIED_FILE, 'utf8'));
  const messages = env.EXECUTION_FILE && existsSync(env.EXECUTION_FILE) ? JSON.parse(readFileSync(env.EXECUTION_FILE, 'utf8')) : [];
  const report = loadReport({ verified, messages, runtime: { action: env.ACTION_SHA || null } });
  writeFileSync(env.PROVENANCE_FILE, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${env.PROVENANCE_FILE}.`);
}
