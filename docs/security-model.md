# Security model

The playbook is guidance and generic code. Authority stays in each caller's workflow settings and secrets, never in anything an agent reads.

## What the playbook guarantees

- **It runs only the code it came from.** Every reusable workflow starts with an inline step that reads `job_workflow_ref` and `job_workflow_sha` from the job's OIDC token. GitHub sets those claims, not the caller. The step refuses another repository, a branch, a tag, a short SHA, or a ref that disagrees with the commit, and only then checks out that exact commit.
- **Every action is pinned** to a full commit SHA, and CI fails on one that isn't.
- **No job gets more than it needs.** Workflows start from `permissions: {}`. A secret reaches a job only when the caller passes it by name.
- **Nothing merges.** No workflow or script calls a merge or auto-merge API, and CI checks for one.
- **Its own CI holds no secrets.** Pull requests from forks run read-only, and outside contributors' runs need approval.

## Public content

Everything here is public: files, history, PR descriptions, review comments and CI logs.

- **Prevention:** push protection blocks known secret formats before they land.
- **Detection:** the content check refuses task IDs, issue numbers, outside links, emails, real-looking IDs, secret shapes and names on a private deny list in files and fixtures. The PR-text check does the same for descriptions and commit messages, but it runs after GitHub already shows them.
- **The real safeguard** is a person reading each pull request before merging. No pattern can prove that prose isn't confidential.
- A secret that slips through is revoked at once. Removing it from history doesn't undo the exposure.

## What stays private

Project code, the organisation's configuration and policy, task content, run logs and artifacts (callers' workflows run and log in the caller's repository), and every credential.
