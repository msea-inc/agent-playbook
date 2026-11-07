# agent-playbook

Shared methods for the agents I run: reusable GitHub Actions workflows, the scripts they run, and (from a later release) shared skills. Any agentic tool can follow them, and any repository in any organisation can call them.

It's public, so it holds only generic methods. Project code, configuration, credentials and run evidence stay in each project's own private repositories.

- **Using it:** `docs/onboarding.md`, with caller examples in `docs/caller-examples/`.
- **How it stays safe:** `docs/security-model.md`.
- **Versions, upgrades and rollback:** `docs/versioning-and-rollback.md` and `CHANGELOG.md`.
- **Working on it:** `CLAUDE.md`.
