# Changelog

Each release says what changed, whether it's compatible, any configuration a caller has to add or change, and how to roll back. Callers pin a release's full commit SHA; see `docs/versioning-and-rollback.md`.

## Unreleased

- **Added:** the `domain-driven-design` skill, which makes domain-driven design the default for designing, building and reviewing code. It follows the practice in Vaughn Vernon's *Implementing Domain-Driven Design*: strategic design (subdomains, bounded contexts, the ubiquitous language, context maps), tactical design (entities, value objects, the four aggregate rules, domain events, repositories, domain services, factories) and hexagonal architecture with application services, event-driven integration, eventual consistency and CQRS. It also says when not to use the tactical patterns: where the overhead outweighs the return, it chooses a CRUD or data-centric design from Martin Fowler's *Patterns of Enterprise Application Architecture*, and it names the signs of cargo-cult DDD. It says how the architect, engineer and reviewer roles use it, and the repository's own rules still win.
- **Changed:** `code-review` 1.1.0 carries the domain-driven-design reviewer checks on the standards axis, as judgement calls unless the repository documents the rule.
- **Added:** `release.yml` creates each release when the pull request that adds its `CHANGELOG.md` section merges, at the merge commit, with that section as its notes. It never moves or replaces an existing tag.

## 0.2.0 (2026-11-07)

Compatible: callers of `finish-task-on-merge.yml` change nothing.

- **Added:** the `playbook` Claude Code plugin and a marketplace at the repository root, with two skills: `working-style` (how agents work with the person) and `code-review` (the general two-axis review method). Load it with `--plugin-dir` from a checkout at a pinned commit; see `docs/onboarding.md`.
- **Added:** `manifest/skills.json` (every skill's version and file hashes), `scripts/skills/verify.mjs` (checks the skills on disk at the pinned commit, and fails as `skill_unavailable`) and `scripts/skills/load-report.mjs` (writes `provenance.json`).
- **Added:** CI audits that a plugin grants nothing (no hooks, servers, commands, tool grants or unsafe scripts), and that the manifest matches the files.

- **Fixed:** `finish-task-on-merge.yml` checks the caller's settings before it reads anything. An empty or malformed `config-repository`, or an empty `CLICKUP_TOKEN`, now stops the run with what to set, instead of checking out the caller's own repository as the config. The message also says that organisation variables and secrets don't reach private repositories on some GitHub plans.

**Configuration:** to load the skills, a caller checks out the playbook at this release's SHA, runs `verify.mjs`, starts Claude Code with `--plugin-dir`, names skills by their full ID, and runs `load-report.mjs` afterwards. See `docs/onboarding.md`.

**Rollback:** revert the caller's pin pull request. A caller that still has its own copy of a moved skill keeps working on `0.1.0`, which has no skills.

## 0.1.0 (2026-11-07)

First release. Compatible: nothing to upgrade from.

- **Added:** `bootstrap-proof.yml`, the inline identity check every playbook workflow starts with.
- **Added:** `finish-task-on-merge.yml`. Moves the task a merged PR's title names to done, once, only when the config repository links its list to the caller's own repository (Owner/Name, confirmed by repository ID). Callers pass `config-repository` and `CLICKUP_TOKEN`, plus `CONFIG_TOKEN` for a private config repository. Every write carries a Finish key, so a re-run adds nothing.
- **Added:** CI with the public-content, action-pin and merge-call checks.

**Configuration:** a caller of `finish-task-on-merge.yml` grants `id-token: write` and `contents: read`, passes `config-repository`, the `CLICKUP_TOKEN` secret and, for a private config repository, `CONFIG_TOKEN`. Its config repository links the list to the caller's repository. See `docs/caller-examples/`.

**Rollback:** revert the caller's pin pull request and restore its previous workflow. This release writes ClickUp comments and statuses only; a Finish key in a comment stays readable by later releases.
