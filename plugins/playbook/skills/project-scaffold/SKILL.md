---
name: project-scaffold
description: How to start a new repository or project from the shared template - the same agent instructions, README, pull request template, checks, release route, task finishing and labels every time - and where each shared skill keeps the detail, through one index. Use when creating a new repository or project, adding the standard files to a repository that lacks them, or when you need to find which skill covers something.
version: 1.0.0
library-compat: 1
---

# Project scaffold

Every new repository starts the same way, whichever agent or model builds it, so the person always finds the same files, checks, labels and release route. This skill says what that base is, in what order to build it, and where the detail lives. It's guidance only and grants nothing. Where an organisation or repository has stricter rules, follow them. Follow `working-style` (in this plugin) whenever you report or ask.

References:

- `references/skill-index.md`: **the index.** Every skill in this plugin, when to use it, what the scaffold takes from it, and the exact file and section to read first. Read it before opening any other skill, and go straight to the section it names.
- `references/base-files.md`: what each file in the base holds.

Changes to this skill are checked against `regression-cases.md`, beside it.

## Before you start

1. **There's a task for it.** Scaffolding a repository is work like any other: it starts from a task in the person's tracker, with its ID in the branch, commits and pull request title.
2. **Say what you'll create, and wait for a yes.** The repository's name, owner, visibility, what kind of project it is (website, app, library, service or tooling) and where it deploys, if anywhere. Creating a repository is something the person lives with; don't do it on an earlier, vaguer yes.
3. **Read the organisation's own rules.** If the organisation keeps a private config repository (its working rules, its spaces and lists, its own skills), read it first. Its rules win, and its skills apply alongside these. Never copy anything from it into a public repository.
4. **Find the right skill through the index,** not by reading every skill.

## The base

Every repository gets all of this in its first pull request, unless it doesn't apply (a repository that deploys nothing has no release route). `references/base-files.md` has what goes in each.

| What | Why |
|---|---|
| Agent instructions (`CLAUDE.md`, or the file the agent reads) | What the repository is, where the shared rules live, its own conventions, and its **Before pushing** checks |
| `README.md` | What it is, how to run it, how to test it, and how it's deployed |
| `.github/pull_request_template.md` | The same description headings in every repository |
| A **Check** workflow | The Before pushing checks on every pull request, with no secrets |
| The **release route**, if it deploys | From `release-manager`: Check, staging on merge, live on Publish release, the live Roll back, task comments, and the `live` environment ready for an approve button |
| **Finish task on merge** | The playbook's caller, pinned to a release's full commit SHA, so a merge moves its task to done |
| **Labels** | `major`, `minor` and `staging`, from `release-manager` |
| **Deploy exclusions**, if it deploys | Development files kept out of the package, with a test that fails when a new one isn't excluded |
| A **domain** or architecture note | The project's words and where things live, from `domain-driven-design` |

## Order

1. Open the task's branch, add the base files and the Check workflow, and get Check green.
2. Add the release route and Finish task on merge, following `release-manager` and its `new-project-setup` reference.
3. Open the pull request, with the labels added and the description following the template.
4. Give the person the manual steps as numbered steps they can tick off: which settings, variables, secrets, environments and branch and tag protections to add, where, with exact names, and how they'll know each worked. Never ask for a secret's value.
5. After it's merged, the first real change is released as `v1.0.0` from its merge's link.

## Keeping the index right

- **A new skill gets an index entry** in the same pull request. The index check fails when a skill in this plugin has no entry, or an entry points at a file or section that doesn't exist.
- **Renaming a section** in any skill means updating the index in the same pull request.
- An entry says what to read first, not everything. Keep it to the one or two places an agent needs.

## Never

- Create a repository, a setting, a secret or an environment without the person's yes for that exact thing.
- Copy an organisation's private rules, skills, IDs or names into a public repository.
- Leave out Check, the release route or Roll back because the project is small. A repository that deploys anything gets the whole route.
- Write a template file from memory when this plugin's references say what it holds.
