// The newest released version in CHANGELOG.md, for the release workflow. A released version is a heading
// "## X.Y.Z (YYYY-MM-DD)"; "## Unreleased" never is. Its notes are everything up to the next "## " heading.
//
//   node scripts/release/changelog.mjs   writes tag=vX.Y.Z to GITHUB_OUTPUT (nothing when there's no released
//                                        version) and the notes to NOTES_FILE
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const RELEASED = /^(\d+)\.(\d+)\.(\d+) \((\d{4}-\d{2}-\d{2})\)$/;

/** The newest released version, its tag and notes, or null when the changelog has none. Throws on a malformed heading. */
export function latestRelease(changelog) {
  const lines = String(changelog ?? '').split(/\r?\n/);
  const start = lines.findIndex(line => line.startsWith('## ') && line.slice(3).trim() !== 'Unreleased');
  if (start === -1) return null;
  const heading = lines[start].slice(3).trim();
  const match = RELEASED.exec(heading);
  if (!match) {
    if (/^\d+\.\d+\.\d+$/.test(heading)) throw new Error(`The changelog heading '${heading}' has no date. Write it as '## X.Y.Z (YYYY-MM-DD)'.`);
    throw new Error(`The changelog heading '${heading}' isn't a version. Write it as '## X.Y.Z (YYYY-MM-DD)'.`);
  }
  const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  const notes = lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();
  const version = `${match[1]}.${match[2]}.${match[3]}`;
  return { version, tag: `v${version}`, date: match[4], notes };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const release = latestRelease(readFileSync('CHANGELOG.md', 'utf8'));
    if (!release) {
      console.log('CHANGELOG.md has no released version yet.');
      process.exit(0);
    }
    writeFileSync(process.env.NOTES_FILE, `${release.notes}\n`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `tag=${release.tag}\n`);
    console.log(`Newest released version: ${release.tag} (${release.date}).`);
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}
