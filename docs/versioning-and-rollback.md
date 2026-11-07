# Versions, upgrades and rollback

## Versions

- Releases are tagged `vMAJOR.MINOR.PATCH` on protected tags. The tag is a label; callers pin the commit SHA it points at.
- Nothing follows `main`. There's no automatic upgrade.
- A release only ever adds: markers and records written by an older release still read correctly, so moving back is safe.

## Upgrading

1. Read the release's `CHANGELOG.md` entry: what changed, whether it's compatible, and any configuration to add.
2. Upgrade one pilot repository by pull request, and run one real event or task.
3. Then raise pin pull requests in the other repositories.

## Rolling back

Reverting the pin pull request is the first step, but not always the whole of it. Through each release's rollback window:

- the previous release's configuration stays in place;
- anything a release moves (a skill, a file location) keeps a deprecated copy at the old location until every consumer has moved;
- a consumer that reads a versioned format accepts both the old and the new version.

Each release's changelog entry says what its rollback needs.
