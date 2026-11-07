# Using the playbook

## Calling a workflow

1. Pick a release from `CHANGELOG.md` and find its tag's full commit SHA.
2. Copy the caller from `docs/caller-examples/` into your repository's `.github/workflows/`.
3. Pin `uses:` to that full SHA, with the release in a comment. A branch, a tag or a short SHA is refused when the workflow starts.
4. Grant the calling job `id-token: write` (and `contents: read`). The workflow uses its OIDC token only to read its own identity.
5. Pass each secret it needs by name. Never use `secrets: inherit`.
6. Add any organisation variables the release lists, then open the caller as a pull request and check the first run.

## Loading the skills

The `playbook` plugin holds the shared skills. Load it from a checkout at a pinned commit, never from the marketplace's git URL, which follows the default branch.

1. Check out `msea-inc/agent-playbook` at the release's full commit SHA, for example into `.playbook/`.
2. Verify it before the agent starts: run `node .playbook/scripts/skills/verify.mjs` with `PLAYBOOK_DIR=.playbook`, `EXPECTED_SHA` (the pin), `CHECKED_OUT_SHA` (`git -C .playbook rev-parse HEAD`), `REQUIRED_SKILLS` (for example `playbook:code-review`) and `VERIFIED_FILE`. If it fails, stop: the run's result is `skill_unavailable`, and nothing is published.
3. Start Claude Code with `--plugin-dir .playbook/plugins/playbook`. Name skills by their full ID (`playbook:code-review`): the runtime may have a built-in skill with the same short name.
4. Afterwards, run `node .playbook/scripts/skills/load-report.mjs` with `VERIFIED_FILE`, `EXECUTION_FILE` (Claude Code's JSON transcript), `ACTION_SHA` and `PROVENANCE_FILE`. Keep `provenance.json` as a private run artifact.

For interactive sessions, add the marketplace in the repository's `.claude/settings.json` and enable `playbook@agent-playbook`.

## What the playbook needs from you

Each workflow's header comment lists its inputs, secrets and variables. The playbook itself needs no token to be checked out, because it's public.

## Upgrading

Follow `docs/versioning-and-rollback.md`: upgrade one pilot repository by pull request first, then the others.
