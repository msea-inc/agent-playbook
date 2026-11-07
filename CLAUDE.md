# Working on agent-playbook

This repository is **public**. It holds generic methods that agents use in any project: reusable GitHub Actions workflows, the scripts they run, and (from a later release) shared skills. Read `README.md` and `docs/security-model.md` first.

## What may go here

- **Only generic methods.** No project code, project names, customer details, task text, run evidence, repository findings, list or space IDs, or secrets. Projects keep their own conventions in their own repositories, and the organisation's configuration stays in its private config repository.
- **Fixtures and examples are synthetic**, and say so in their first lines.
- **Never put a secret anywhere**, including tests. Push protection and the content check are there to catch mistakes, not to make them safe: a secret that lands here is revoked at once.

## Pull requests, commits and branches

- Every change starts from a task in the user's tracker. Branches are `claude/{type}/{TaskID}_{Description}`, and commits and PR titles are `{type}({TaskID}): {Summary}`, as in every linked repository.
- **Task IDs are allowed only** in PR titles, branch names, the commit subject's prefix and subtask suffix, and as the text of a ClickUp task link in the PR description, as the template shows. Nowhere else.
- **Descriptions and commit bodies describe the method or code change only.** Link private detail as a ClickUp task instead of writing it here. Follow `.github/pull_request_template.md`.
- The PR-text check runs after GitHub already shows the text, so it detects mistakes rather than preventing them. The user reads each description before merging.
- Nobody but the user merges anything, and nothing in this repository calls a merge or auto-merge API.

## Workflows and scripts

- Every reusable workflow starts with the inline bootstrap in `bootstrap-proof.yml`: it checks its own identity from the OIDC token and checks out exactly its own commit before running any playbook code. Callers pin a full SHA.
- Every `uses:` is pinned to a full commit SHA, with the version in a comment.
- Workflows declare `permissions: {}` at the top and grant each job only what it needs. A secret reaches a job only when the caller passes it by name.
- Scripts use Node built-ins only, and each one has tests.

## Before pushing

```sh
node --test 'tests/**/*.test.mjs'
node scripts/checks/public-content.mjs files
node scripts/checks/public-content.mjs pins
node scripts/checks/public-content.mjs merges
node scripts/checks/plugin-audit.mjs
node scripts/skills/manifest.mjs check
```

After changing anything under `plugins/`, regenerate the manifest with `node scripts/skills/manifest.mjs write` and commit it.

CI runs the same checks, plus `pr-text` on the PR's description and commits.
