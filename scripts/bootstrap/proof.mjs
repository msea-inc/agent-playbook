// Confirms that the playbook checkout a workflow is about to use is the commit the workflow itself
// came from. Exits non-zero, with the reason, when it isn't.
import { execFileSync } from 'node:child_process';

export function checkoutMatches(expectedSha, actualSha) {
  const expected = String(expectedSha ?? '').trim().toLowerCase();
  const actual = String(actualSha ?? '').trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expected)) return { ok: false, reason: `the expected commit '${expected}' isn't a full SHA` };
  if (actual !== expected) return { ok: false, reason: `the checkout is at ${actual || 'an unknown commit'}, not ${expected}` };
  return { ok: true, reason: `the playbook checkout is at ${expected}` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const directory = process.argv[2] ?? '.';
  const actual = execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const result = checkoutMatches(process.env.EXPECTED_SHA, actual);
  console.log(result.ok ? `Bootstrap proof passed: ${result.reason}.` : `::error::Bootstrap proof failed: ${result.reason}.`);
  process.exit(result.ok ? 0 : 1);
}
