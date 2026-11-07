# Changelog

Each release says what changed, whether it's compatible, any configuration a caller has to add or change, and how to roll back. Callers pin a release's full commit SHA; see `docs/versioning-and-rollback.md`.

## Unreleased

## 0.1.0 (2026-11-07)

First release. Compatible: nothing to upgrade from.

- **Added:** `bootstrap-proof.yml`, the inline identity check every playbook workflow starts with.
- **Added:** `finish-task-on-merge.yml`. Moves the task a merged PR's title names to done, once, only when the config repository links its list to the caller's own repository (Owner/Name, confirmed by repository ID). Callers pass `config-repository` and `CLICKUP_TOKEN`, plus `CONFIG_TOKEN` for a private config repository. Every write carries a Finish key, so a re-run adds nothing.
- **Added:** CI with the public-content, action-pin and merge-call checks.

**Configuration:** a caller of `finish-task-on-merge.yml` grants `id-token: write` and `contents: read`, passes `config-repository`, the `CLICKUP_TOKEN` secret and, for a private config repository, `CONFIG_TOKEN`. Its config repository links the list to the caller's repository. See `docs/caller-examples/`.

**Rollback:** revert the caller's pin pull request and restore its previous workflow. This release writes ClickUp comments and statuses only; a Finish key in a comment stays readable by later releases.
