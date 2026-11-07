# Changelog

Each release says what changed, whether it's compatible, any configuration a caller has to add or change, and how to roll back. Callers pin a release's full commit SHA; see `docs/versioning-and-rollback.md`.

## Unreleased

- **Added:** `bootstrap-proof.yml`, the inline identity check every playbook workflow starts with.
- **Added:** `finish-task-on-merge.yml`. Moves the task a merged PR's title names to done, once, only when the config repository links its list to the caller's own repository (Owner/Name, confirmed by repository ID). Callers pass `config-repository` and `CLICKUP_TOKEN`, plus `CONFIG_TOKEN` for a private config repository. Every write carries a Finish key, so a re-run adds nothing.
- **Added:** CI with the public-content, action-pin and merge-call checks.
