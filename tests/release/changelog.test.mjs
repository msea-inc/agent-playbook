// Synthetic: the changelog text here is made up for the test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latestRelease } from '../../scripts/release/changelog.mjs';

const CHANGELOG = `# Changelog

Intro.

## Unreleased

- **Added:** something not released yet.

## 1.4.0 (2026-01-02)

Compatible.

- **Added:** a thing.

**Rollback:** revert the pin.

## 1.3.0 (2026-01-01)

- **Fixed:** an older thing.
`;

test('the newest released version and its notes come from the first dated heading', () => {
  const release = latestRelease(CHANGELOG);
  assert.equal(release.version, '1.4.0');
  assert.equal(release.tag, 'v1.4.0');
  assert.equal(release.notes, 'Compatible.\n\n- **Added:** a thing.\n\n**Rollback:** revert the pin.');
});

test('Unreleased is never released, and a changelog with no released version gives nothing', () => {
  assert.equal(latestRelease('# Changelog\n\n## Unreleased\n\n- **Added:** x.\n'), null);
  assert.equal(latestRelease(''), null);
});

test('a version heading that is not plain X.Y.Z with a date is refused, so nothing odd becomes a tag', () => {
  assert.throws(() => latestRelease('## 1.4 (2026-01-02)\n\nNotes.\n'), /X\.Y\.Z/);
  assert.throws(() => latestRelease('## v1.4.0; rm (2026-01-02)\n\nNotes.\n'), /X\.Y\.Z/);
  assert.throws(() => latestRelease('## 1.4.0\n\nNotes.\n'), /date/);
});

test("the playbook's own changelog has a releasable newest version", async () => {
  const { readFileSync } = await import('node:fs');
  const release = latestRelease(readFileSync('CHANGELOG.md', 'utf8'));
  assert.match(release.tag, /^v\d+\.\d+\.\d+$/);
  assert.ok(release.notes.length > 0);
});
