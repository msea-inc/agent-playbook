---
name: release-manager
description: How to version, label, name and release work from merge to live - semantic versions chosen by what changes for the people who use it, a version label on every pull request, staging on merge with one draft release kept up to date for everything merged since live, and live only when the person publishes that draft. Use when opening or updating a pull request, after a merge, when preparing or explaining a release, when something on live needs an urgent fix or a rollback, and when setting up the release route for a new repository.
version: 1.1.0
library-compat: 1
---

# Release manager

Every project that ships something, whether a website, an app, a library or a service, follows the same route from a merged pull request to live. You do the bookkeeping: the version label on each pull request, the next version, the release title and the release notes. The person makes the one decision that matters: when it goes live.

This skill is guidance only and grants nothing. It never publishes a release, merges, or deploys to live by itself. The repository's own instructions win wherever they differ from it. Follow `working-style` (in this plugin) whenever you report to the person or ask them something.

References:

- `references/versioning.md`: how to choose major, minor or patch for each kind of project, with examples.
- `references/workflow-blueprint.md`: the staging and live workflows, their gates and run names, the draft release step, and the switch to an approve button later.
- `references/new-project-setup.md`: setting up the route in a new repository, step by step.

Changes to this skill are checked against `regression-cases.md`, beside it.

## The route

1. **Pull request:** checks run. With the `staging` label, it's also put on staging for a preview.
2. **Merge to the default branch:** checks run again, then the commit goes to staging by itself and is marked as deployed there. Then the **Draft the release** job brings the repository's one draft release up to date: the next version, notes for everything merged since live, and this staged commit as its target. The run's summary is one sentence with the draft's link.
3. **Publish the draft:** the person checks staging, opens the draft on the releases page and presses **Publish release**. That alone sends the release's commit to live.

Live is never reached any other way, except the workflow's manual fallback, which the person starts themselves and which runs the same gates.

## Versions

Versions are `vMAJOR.MINOR.PATCH` (semantic versioning, [semver.org](https://semver.org)). The first release is `v1.0.0`. Versions only ever go up.

Choose the bump by **what changes for the people who use it**, never by the size of the diff:

| Bump | When | Label |
|---|---|---|
| **Major** | Something people rely on stops working, or works differently enough that they have to adapt: a removed page or address, a changed sign-in, a breaking API or configuration change, data they must migrate. | `major` |
| **Minor** | Something new they can use, and everything that worked still works: a new page, feature, option or endpoint. | `minor` |
| **Patch** | Nothing new to learn: fixes, wording, styling, performance, refactors, dependency updates, tests, build and CI changes. | none |

A one-line change can be major, and a thousand-line refactor can be a patch. `references/versioning.md` has examples for each kind of project. When you genuinely can't tell between two, pick one, say why in the pull request, and ask the person.

## Labels: every pull request you open

- **Add the version label yourself** when you open the pull request: `major`, `minor`, or nothing for a patch. Say which in the description's Notes, with the reason in one sentence, for example "Release: minor, because it adds a new page."
- **Look again when the scope changes.** If later commits change what the pull request does for users, change the label and the sentence.
- **Add `staging` yourself when there's something to look at.** It puts the open pull request on staging, so the person can check it before merging. Add it when opening the pull request if the change shows up on the site or in the product, such as a page, section, screen or email. Leave it off for changes with nothing to see, such as documentation, tests, workflows or internal refactors: the merge puts them on staging anyway. Add it, or take it off, if the person asks.
- **Staging holds one pull request at a time.** Each labelled pull request is deployed when it's labelled and on each new commit, so two labelled pull requests take turns overwriting staging. When another labelled pull request is open, say so in the description, so the person knows what staging is showing.
- **Labels need the right token.** Labels you add through your GitHub App or a person's token start the labelled run; labels added with a workflow's own `GITHUB_TOKEN` don't, because GitHub doesn't start runs from that token's events. Add labels when you create the pull request, or straight after.
- **Never put a version in a title, branch or commit.** The version is worked out at release time from the labels, because several pull requests may go out together.

## Several merges, one release

Everything merged since the live release goes out in the next one. There's only ever one draft release: each merge to staging updates it, so it always holds everything merged so far, targets the newest staged commit, and is the one to publish. A merge never makes a second draft.

- **The bump is the biggest among them.** One `major` makes the release major, otherwise one `minor` makes it minor, otherwise it's a patch.
- **The title** is the version, then the pull request with the biggest bump (the newest if several tie), then how many more go with it: `v1.4.0 · Add the booking page (#N) and 2 more`. The pull request's `type(TaskID):` prefix is left out.
- **The release notes** say how many pull requests are in it and since which version, then group them, newest first:
  - **Breaking (major):** with a line that says to check these on staging first;
  - **New (minor);**
  - **Fixes and changes (patch).**

  Each line reads `#N · Title · TaskID · what it does`: the number links to the pull request, the title (without its `type(TaskID):` prefix) links to the pull request's task, then the task ID, then the first sentence under its "What this does".
- **Check on staging:** after the groups, each pull request's staging checks from its "How to test", renumbered, so the person knows what to look at before pressing Publish. Steps about the pull request's own route are left out: merging, labelling, approving, reviewing, publishing, waiting for a run, or running a command locally. Write "How to test" so its checks can be done on staging.
- **The run summary is one plain sentence,** with the version as the link: "Staged. Draft release vX.Y.Z is ready to publish once staging checks out." No headings or notes in it; the notes are in the draft. The same sentence goes on the merged pull request as a comment, because GitHub's mobile app doesn't show run summaries, and the link is printed in the job's log.
- **The same script everywhere.** The playbook's `scripts/release/release-draft.mjs` works out the version, title and notes and updates the draft, so every project's drafts look the same. Run it from the playbook at the release the project pins; don't copy it.

When the person asks what's waiting to go live, answer from the draft and the same method: the live release, the pull requests merged since, the next version and why.

## Telling the tasks

Once a release is live and its smoke checks pass, the workflow adds a comment to every task in it: `Released to live in vX.Y.Z`, with a link to the release. The tasks are the IDs in its pull requests' `type(TaskID):` prefixes, the same ones the release notes list. It changes no status. A roll back comments `Rolled back from live: vX.Y.Z` on the same tasks. So anyone opening a task can see whether it's live, and in which version.

- **It never holds up live.** If the tracker can't be reached, the release still counts as done, and the run summary says which comments failed.
- **It never repeats itself.** Each comment carries a marker for its version, so a re-run adds nothing.
- **It needs the tracker's token** as a secret, given only to that step. Tell the person where to add it; never ask for its value.

## Naming

| Item | Name |
|---|---|
| Tag | `vX.Y.Z`, created by publishing the release, never by hand |
| Release title | `vX.Y.Z · {title} (#N)`, plus `and K more` when batched |
| Workflows | `{Project} staging` for previews, merges and the draft release, and `{Project} live` for the published release, the manual fallback and Roll back, so a merge never shows a skipped release job |
| Run names | Staging: `Stage PR #N · {title}`, `PR #N · label {label}, nothing to do`, `PR #N · not staged (no staging label)`, `Stage {branch}`. A merge keeps GitHub's default, the merge commit's title, which ends in `(#N)`. Live: `Release vX.Y.Z to live`, `Roll back live`, with ` (dry run)` when it is one. |
| Jobs | `Draft the release` on a merge, after staging, with its step named `Update the draft release (its link is in this step's log)` |
| Staging status | A commit status such as `Staging: deployed`, which the live gate looks for |

## Urgent fixes and rollbacks

- **Keep the default branch releasable.** If something on live needs fixing while unchecked work is waiting on staging, don't release around it. Offer to revert the unready pull requests (each as its own revert pull request), merge the fix, release it as a patch, then bring the work back in a new pull request.
- **Roll back button first, if live is broken now.** Every release workflow has a **Roll back** option, for live only: the person runs it, it puts back the backup the last release took (the version before it), runs the smoke checks, and records it on the releases page. The replaced release is renamed "Rolled back · …" and marked as a pre-release with a note, and the release that's live again is marked Latest. Its tag stays, so versions never go backwards. Point the person to it; never restore by hand over a server login.
- **Roll back puts back the application, not the data.** Where the project keeps data that outlives a release, such as a database, roll back starts the previous version on today's data, and refuses when that version can't read it, for example after a schema change. Data is restored only through the project's documented recovery procedure, which the person starts with its own confirmation and which keeps the replaced data aside. Never restore data as part of a roll back.
- **Staging has no roll back.** Redeploying the default branch fixes staging, so it keeps no backups.
- **Then fix forward with a new patch.** Versions never go backwards, so the lasting undo is reverting the bad release's pull requests and releasing the result as the next patch, which replaces the rolled-back state on live.
- **A release that failed to reach live** is still listed on the releases page. If the cause is fixed, re-run its run. Otherwise the person deletes that release and its tag, and publishes the draft again, which the next merge brings up to date.

## Setting up a new project

Every new repository that deploys anything gets this route from its first pull request, following `references/new-project-setup.md`, as part of the base that `project-scaffold` (in this plugin) sets up. Build it so that the person's future upgrade to GitHub's approve button (required reviewers on a protected environment) is a settings change, not a rewrite: give the live job its own `live` environment from day one, include the live Roll back option, and use the shared release-draft script, which can either update the draft or create the release. `references/workflow-blueprint.md` explains both modes.

When the project ships an immutable build, such as a container image, build it once per commit and send that exact build, by its digest, to staging and then to live. Never rebuild it for live. The version can be stamped when it's built or when it's deployed, whichever suits it: an image exists before its version does, so it carries its commit from the build and is given its version when it goes live.

## Never

- Publish, edit or delete a release, or create, move or delete a tag, unless the person asks for that exact action. The workflow's Draft the release job keeping the one draft up to date is the only exception, and it never publishes.
- Leave a second draft release, or a run summary with the notes or big headings in it.
- Let a test write to a real run summary: scripts take their environment as an argument, and tests hand them temporary files.
- Release a version that's lower than or equal to an existing release, or a pre-release, to live.
- Deploy to live, or roll it back, outside the workflow, or copy files to a server by hand.
- Add `staging` or a version label to a pull request you didn't open without being asked.
- Choose a bump by the size of the change, or to make a release look bigger or smaller.
