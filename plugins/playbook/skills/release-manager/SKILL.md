---
name: release-manager
description: How to version, label, name and release work from merge to live - semantic versions chosen by what changes for the people who use it, a version label on every pull request, several merges batched into one release with grouped release notes, staging on merge and live only when the person publishes. Use when opening or updating a pull request, after a merge, when preparing or explaining a release, when something on live needs an urgent fix or a rollback, and when setting up the release route for a new repository.
version: 1.0.0
library-compat: 1
---

# Release manager

Every project that ships something, whether a website, an app, a library or a service, follows the same route from a merged pull request to live. You do the bookkeeping: the version label on each pull request, the next version, the release title and the release notes. The person makes the one decision that matters: when it goes live.

This skill is guidance only and grants nothing. It never publishes a release, merges, or deploys to live by itself. The repository's own instructions win wherever they differ from it. Follow `working-style` (in this plugin) whenever you report to the person or ask them something.

References:

- `references/versioning.md`: how to choose major, minor or patch for each kind of project, with examples.
- `references/workflow-blueprint.md`: the deploy workflow's stages and gates, the run names, the next-version and release-notes method, and the switch to an approve button later.
- `references/new-project-setup.md`: setting up the route in a new repository, step by step.

Changes to this skill are checked against `regression-cases.md`, beside it.

## The route

1. **Pull request:** checks run. With the `staging` label, it's also put on staging for a preview.
2. **Merge to the default branch:** checks run again, then the commit goes to staging by itself and is marked as deployed there. The run's summary shows the next version, what's in it, and a link to publish it.
3. **Publish release:** the person checks staging, opens the link and presses **Publish release**. That alone sends the release's commit to live.

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

Everything merged since the last release goes out in the next one. Each merge's run offers a release with everything merged so far, so the newest merge's link is the one to use; older links are simply not used.

- **The bump is the biggest among them.** One `major` makes the release major, otherwise one `minor` makes it minor, otherwise it's a patch.
- **The title** is the version, then the pull request with the biggest bump (the newest if several tie), then how many more go with it: `v1.4.0 · Add the booking page (#N) and 2 more`. The pull request's `type(TaskID):` prefix is left out.
- **The release notes** say how many pull requests are in it and since which version, then group them:
  - **Breaking (major):** with a line that says to check these on staging first;
  - **New (minor);**
  - **Fixes and changes (patch).**

  Each line has the pull request's title, its number, its task ID from the prefix, and the first sentence under its "What this does".
- **Check on staging:** after the groups, list each pull request's first "How to test" step, so the person knows what to look at before pressing Publish.
- **The same notes appear in the merge's run summary**, above the link, so the person knows what's going out before opening it.

When the person asks what's waiting to go live, answer from the same method: the last release, the pull requests merged since, the next version and why.

## Naming

| Item | Name |
|---|---|
| Tag | `vX.Y.Z`, created by publishing the release, never by hand |
| Release title | `vX.Y.Z · {title} (#N)`, plus `and K more` when batched |
| Run names | `Release to live · {release title}`, `Staging · {pull request title} (#N)`, `Label {label} · {pull request title} (#N)`. A pull request's checks and a merge keep GitHub's default name. |
| Staging status | A commit status such as `Staging: deployed`, which the live gate looks for |

## Urgent fixes and rollbacks

- **Keep the default branch releasable.** If something on live needs fixing while unchecked work is waiting on staging, don't release around it. Offer to revert the unready pull requests (each as its own revert pull request), merge the fix, release it as a patch, then bring the work back in a new pull request.
- **Roll back button first, if live is broken now.** Every release workflow has a **Roll back** option: the person runs it, it puts the previous live version back from the backup taken before the last release, runs the smoke checks, and records it on the releases page (the bad release is marked as rolled back, with which version is live again). Point the person to it; never restore by hand over a server login.
- **Then fix forward with a new patch.** Versions never go backwards, so the lasting undo is reverting the bad release's pull requests and releasing the result as the next patch, which replaces the rolled-back state on live.
- **A release that failed to reach live** is still listed on the releases page. If the cause is fixed, re-run its run. Otherwise the person deletes that release and its tag, and publishes again from the latest merge's link.

## Setting up a new project

Every new repository that deploys anything gets this route from its first pull request, following `references/new-project-setup.md`. Build it so that the person's future upgrade to GitHub's approve button (required reviewers on a protected environment) is a settings change, not a rewrite: give the live job its own `live` environment from day one, include the Roll back option, and keep the version and notes in one script that can either build the link or create the release. `references/workflow-blueprint.md` explains both modes.

## Never

- Publish, edit or delete a release, or create, move or delete a tag, unless the person asks for that exact action.
- Release a version that's lower than or equal to an existing release, or a pre-release, to live.
- Deploy to live, or roll it back, outside the workflow, or copy files to a server by hand.
- Add `staging` or a version label to a pull request you didn't open without being asked.
- Choose a bump by the size of the change, or to make a release look bigger or smaller.
