# The deploy workflow, as a blueprint

One workflow, three stages: **Check**, **Deploy to staging**, **Release to live**. This describes the method; each repository writes its own workflow and scripts for its host and stack, and follows the playbook's general rules for workflows (actions pinned to full commit SHAs, least permissions, secrets only where needed).

## Triggers

| Event | What runs |
|---|---|
| Pull request into the default branch (`opened`, `synchronize`, `reopened`, `labeled`) | Check only. With the `staging` label, also staging. Adding any other label checks and deploys nothing. |
| Push to the default branch (a merge) | Check, then Deploy to staging, then the next-version step. Never live. |
| Release `published` | Check, then Release to live for the release's commit. |
| Run workflow (manual) | The fallback: target live releases the head of the default branch with the same gates, with a dry run option; target staging deploys a chosen branch; **Roll back** puts the previous live version back. |

## Jobs

1. **Resolve:** turns the event into one exact commit SHA (and its tree), the target (`none`, `staging` or `live`), whether to run checks, and the version for a release. Every later job uses that SHA, never a branch name. It refuses a pre-release, a manual live run that isn't on the default branch, and anything that isn't a plain branch name or SHA. It writes a short "This run" summary: what was asked for, the commit, and which stages will run.
2. **Check:** the repository's own tests and lints, with no deploy settings or secrets.
3. **Deploy to staging:** only staging's settings and secrets. One staging deploy at a time (`concurrency` with `cancel-in-progress: false`). Steps:
   - a gate that skips a merge overtaken by a newer merge (only the head of the default branch is deployed);
   - a guard that the destination is staging and not live;
   - build the package from the resolved commit, deploy it, smoke-check it;
   - mark the commit with a commit status such as `Staging: deployed`;
   - on a merge only, run the next-version step and write the notes and link into the summary.
4. **Release to live:** only live's settings and secrets, in a `live` environment. One live release at a time. Gates, all before anything is copied:
   - the tag is a plain `vX.Y.Z` and higher than every other release;
   - the commit carries the staging status;
   - it's still the head of the default branch, checked again just before copying, so a slow or re-run job can't overwrite a newer release;
   - a guard that the destination is live and not staging.

   Then back up, deploy, smoke-check. On failure, the summary says how to restore the backup, and what to do with the published release that didn't reach live.

5. **Roll back** (Run workflow only, in the `live` environment, sharing live's concurrency group): restores the newest backup taken before the current live release, runs the smoke checks, and records it on the releases page: the current release's notes get a "Rolled back" line saying when, by which run, and which version is live again, and that release stops being marked as latest. It never deletes a release or tag, and a dry run lists what would be restored. If there's no backup to restore, it stops and says so. The next normal release replaces the rolled-back state.

Each job's `name` is fixed text, because GitHub shows a skipped job's name exactly as written.

## Run names

`run-name` makes the Actions list say what each run is for. An empty result keeps GitHub's default (the pull request title or commit message):

```yaml
run-name: >-
  ${{
    github.event_name == 'release'
      && format('Release to live · {0}', github.event.release.name || github.event.release.tag_name)
    || github.event_name == 'pull_request'
      && contains(github.event.pull_request.labels.*.name, 'staging')
      && (github.event.action != 'labeled' || github.event.label.name == 'staging')
      && format('Staging · {0} (#{1})', github.event.pull_request.title, github.event.pull_request.number)
    || github.event_name == 'pull_request' && github.event.action == 'labeled'
      && format('Label {0} · {1} (#{2})', github.event.label.name, github.event.pull_request.title, github.event.pull_request.number)
    || github.event_name == 'workflow_dispatch' && inputs.target == 'roll back'
      && 'Roll back live (Run workflow)'
    || github.event_name == 'workflow_dispatch' && inputs.target == 'live'
      && 'Release to live · default branch (Run workflow)'
    || github.event_name == 'workflow_dispatch'
      && format('Staging · {0} (Run workflow)', inputs.ref || github.ref_name)
    || ''
  }}
```

## The next-version step

Runs after a merge reaches staging. It reads only the GitHub API.

1. **Last release:** the highest `vX.Y.Z` tag among the releases (`sort -V`), or none before the first.
2. **What's in it:** the commits from the last release's tag to this commit (the compare API), or just this commit before the first release.
3. **Each commit's pull request:** the merged pull request into the default branch whose merge commit is that commit. From it: number, labels, title, and the first line under `## What this does` and under `## How to test`. Commits that didn't come from a pull request are listed by their SHA.
4. **The bump:** `major` if any has the `major` label, else `minor` if any has `minor`, else `patch`. The naming pull request is the one with the biggest bump, the newest if several tie.
5. **The version:** `v1.0.0` for the first release, otherwise the last version with the bump applied (a major resets minor and patch, a minor resets patch).
6. **The title:** `vX.Y.Z · {naming title without its type(TaskID): prefix} (#N)`, plus ` and K more` when there are others.
7. **The notes:** "What's in vX.Y.Z", the count and since which version, then the Breaking, New, and Fixes and changes groups (empty groups left out), then "Check on staging" with the How to test steps, then a link back to the staging run.
8. **Output:** the notes go into the run summary, followed by a heading link to GitHub's New release page with `tag`, `target` (the exact SHA), `title` and `body` filled in, each URL-encoded. The person can still edit the tag before publishing, for example to make it a major.

Keep this in one script with tests, using synthetic pull request data.

## Today: Publish release

On plans without required reviewers for private repositories, the person's approval is publishing the release from the link. Nothing else reaches live except the manual fallback, which they start themselves.

## Later: an approve button

GitHub's required reviewers on an environment pause a job until a named person approves it. They're available on public repositories on every plan, and on private repositories with GitHub Enterprise ([docs.github.com: environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/managing-environments-for-deployment)).

Build for it from the start, so switching is a settings change and a small workflow change:

- **The live job already uses a `live` environment,** with live's secrets as environment secrets and its deployment restricted to the default branch and `v*` tags.
- **The next-version script can either build the link or create the release.** Give it a mode (`link` or `create`).

To switch:

1. Add the person as a required reviewer on the `live` environment.
2. Add a live job to the merge run, after staging, in the `live` environment. GitHub pauses it with an **Approve and deploy** button and the summary already shows the notes.
3. On approval, that job runs the next-version script in `create` mode (it creates the tag and release at the exact SHA with the same title and notes), then the same live gates and deploy.
4. Remove the link from the summary. Keep the `release: published` trigger for releases made by hand, the manual fallback and Roll back.

Batching still works: approving the newest merge's waiting run releases everything merged so far, and older waiting runs fail the "still the head" gate harmlessly. Reject or leave them, and set the environment's wait to expire them.

## Alternative: libraries released by changelog

A library that others pin by commit can release by merging instead: a pull request adds a `## X.Y.Z (date)` section to `CHANGELOG.md`, and a workflow creates the tag and release at the merge commit with that section as its notes, never moving an existing tag. The version rules and the notes' groups are the same.
