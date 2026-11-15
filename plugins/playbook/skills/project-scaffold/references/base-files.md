# The base files

What each file in a new repository holds. Write them for the project in front of you, in plain words, and keep anything private out of a public repository. The headings are the same everywhere so the person and every agent know where to look.

## Agent instructions

The file the agent reads at the start of every session (`CLAUDE.md` for Claude Code; other agents have their own name, and a repository used by several can keep one and point the others at it). It holds:

1. **What this is,** in two sentences, and who it's for.
2. **Where the shared rules live:** the organisation's config repository and which of its files apply (statuses, tasks, branches, commits, pull requests), and that they win over this file. This file never restates them.
3. **The tracker:** which list or board the work comes from, and that there's no work without a task.
4. **Branches, commits and pull request titles,** with one example of each from the shared rules.
5. **How the code is organised,** pointing to the domain note.
6. **The repository's own rules:** formatting, generated files that are never edited by hand, where tests go, how it deploys.
7. **Before pushing:** the exact commands the Check workflow runs, so the agent runs them first, and what to put under Not verified when something can't run in the agent's environment.

## README

- What it is, and the live and staging addresses if it has them.
- How to run it locally, and how to test it.
- **Deploying:** the route in plain words (pull request, merge to staging, Publish release to live, Roll back), every setting and secret by name and where it goes, how to do a dry run, and how to restore. From `release-manager`'s new-project setup.

## Pull request template

`.github/pull_request_template.md`, with these headings in this order: **What this does**, a task link line, **Changes**, **How it works**, **Verification** (each Before pushing check with its real result, then **Not verified**), **How to test**, **Notes** (compatibility, migration, rollback). A public repository adds a first-line comment saying to keep it generic.

## Check workflow

- Runs on every pull request into the default branch and on every push to it.
- `permissions: contents: read` and nothing else; no secrets.
- Every `uses:` pinned to a full commit SHA with the version in a comment.
- One step per Before pushing command, each named for what it proves.
- In a repository that deploys, this is the Check stage of the release workflow rather than a separate file.

## Release route

Only for a repository that deploys something. Follow `release-manager/references/new-project-setup.md` and `release-manager/references/workflow-blueprint.md`; don't restate them here.

## Finish task on merge

Copy the playbook's caller example (`docs/caller-examples/finish-task-on-merge.yml` in the playbook repository) to `.github/workflows/`, pin it to a playbook release's full commit SHA, and list its variables and secrets in the manual steps. The config repository must link the task list to this repository for it to act.

## Deploy exclusions

For a repository that deploys a package, mark every development folder and file at the top level as excluded from the package (for example `export-ignore` in `.gitattributes`), and add a test that lists the top level and fails when something new is neither shipped nor excluded.

## Domain note

A short `docs/domain.md` (or the project's equivalent): the project's main words and what they mean, its areas and where each one's code lives, and the rules for adding new work. Follow `domain-driven-design`: keep it in proportion, and a small project's note can be a page.
