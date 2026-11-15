# The deploy workflow, as a blueprint

One workflow, three stages: **Check**, **Deploy to staging**, **Release to live**. This describes the method; each repository writes its own workflow and scripts for its host and stack, and follows the playbook's general rules for workflows (actions pinned to full commit SHAs, least permissions, secrets only where needed).

## Triggers

| Event | What runs |
|---|---|
| Pull request into the default branch (`opened`, `synchronize`, `reopened`, `labeled`) | Check only. With the `staging` label, also staging. Adding any other label checks and deploys nothing. |
| Push to the default branch (a merge) | Check, then Deploy to staging, then the next-version step. Never live. |
| Release `published` | Check, then Release to live for the release's commit. |
| Run workflow (manual) | The fallback: target live releases the head of the default branch with the same gates, with a dry run option; target staging deploys a chosen branch; target **rollback** puts the previous live version back. |

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

   Then back up, deploy, smoke-check, and tell the tasks (below). On failure, the summary says how to restore the backup, and what to do with the published release that didn't reach live.

5. **Roll back** (Run workflow with target `rollback`, live only): uses live's settings and secrets only, in the `live` environment, and joins live's concurrency group so it never runs alongside a release. It takes an optional backup name; empty means the newest, which is the backup the last release took of the version before it. It:
   - restores that backup on the server so the folder matches it exactly (for example `rsync --delete --checksum` from the backup), then flushes any cache;
   - runs the smoke checks against the restored version;
   - records it on the releases page: the replaced release is renamed `Rolled back · {its title}`, marked as a pre-release, and given a note saying when, by which run, and which version is live again; the release that's live again is marked Latest.

   After the smoke checks, it tells the tasks in the replaced release that it was rolled back.

   It never deletes a release or a tag, so versions never go backwards. If there's no backup, it stops and says so. A dry run lists what would be restored and changes nothing; that's how it's tested. The next normal release replaces the rolled-back state.

   Staging gets no roll back and keeps no backups: redeploying the default branch puts staging right.

A pull request opened with the `staging` label already on it starts both an `opened` and a `labeled` run. The staging concurrency group runs them one after the other, and the second finds the same commit already deployed, so this is harmless.

Each job's `name` is fixed text, because GitHub shows a skipped job's name exactly as written.

## Telling the tasks

A step at the end of Release to live (and of Roll back), after the smoke checks pass:

1. **Find the tasks:** the task IDs in the `type(TaskID):` prefixes of the release's pull request titles, from the same list the next-version step builds. Nothing else is read.
2. **Comment once on each:** `Released to live in vX.Y.Z` with the release's link, or `Rolled back from live: vX.Y.Z` for a roll back. Each comment ends with a hidden or plain marker such as `release-key: vX.Y.Z live`; before writing, read the task's comments and skip it if the marker is already there.
3. **Never change a status,** and never fail the job: the step continues on error, and the summary lists each task as commented, already commented or failed, with the reason.

The tracker's token is a secret passed only to this step. Without it, the step says so in the summary and does nothing.

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
    || github.event_name == 'workflow_dispatch' && inputs.target == 'rollback'
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

1. **Last release:** two of them. The highest `vX.Y.Z` tag among all releases (`sort -V`), rolled-back ones included, is what the version counts on from, so a rolled-back version is never reused. The highest that isn't a pre-release (so not rolled back) is what's actually live, and the notes start from it. Neither exists before the first release.
2. **What's in it:** the commits from the live release's tag to this commit (the compare API), or just this commit before the first release. After a roll back, that brings the rolled-back pull requests back into the notes, because they're not live.
3. **Each commit's pull request:** the merged pull request into the default branch whose merge commit is that commit. From it: number, labels, title, and the first line under `## What this does` and under `## How to test`. Commits that didn't come from a pull request are listed by their SHA.
4. **The bump:** `major` if any has the `major` label, else `minor` if any has `minor`, else `patch`. The naming pull request is the one with the biggest bump, the newest if several tie.
5. **The version:** `v1.0.0` for the first release, otherwise the highest version with the bump applied (a major resets minor and patch, a minor resets patch).
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
4. Remove the link from the summary. Keep the `release: published` trigger for releases made by hand, the manual fallback and the live Roll back.

Batching still works: approving the newest merge's waiting run releases everything merged so far, and older waiting runs fail the "still the head" gate harmlessly. Reject or leave them, and set the environment's wait to expire them.

## Alternative: libraries released by changelog

A library that others pin by commit can release by merging instead: a pull request adds a `## X.Y.Z (date)` section to `CHANGELOG.md`, and a workflow creates the tag and release at the merge commit with that section as its notes, never moving an existing tag. The version rules and the notes' groups are the same.
