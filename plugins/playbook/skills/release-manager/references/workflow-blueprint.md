# The deploy workflows, as a blueprint

Two workflows, so every project's Actions list looks the same:

- **`{Project} staging`:** Check, Deploy to staging and, on a merge, **Draft the release**.
- **`{Project} live`:** Check and Release to live when a release is published, plus the manual fallback and Roll back.

Keeping live in its own workflow means a merge's run never shows a skipped release job, and a release's run shows nothing about staging. This describes the method; each repository writes its own workflows and deploy scripts for its host and stack, and follows the playbook's general rules for workflows (actions pinned to full commit SHAs, least permissions, secrets only where needed). The draft release step is shared: every project runs the playbook's `scripts/release/release-draft.mjs`.

## Triggers

| Workflow | Event | What runs |
|---|---|---|
| staging | Pull request into the default branch (`opened`, `synchronize`, `reopened`, `labeled`) | Check only. With the `staging` label, also staging. Adding any other label checks and deploys nothing. |
| staging | Push to the default branch (a merge) | Check, then Deploy to staging, then Draft the release. Never live. |
| staging | Run workflow (manual) | Stage a chosen branch, or the default branch. |
| live | Release `published` | Check, then Release to live for the release's commit. |
| live | Run workflow (manual) | The fallback, with a dry run option: target live releases the newest release again with the same gates; target **rollback** puts the previous live version back. |

**One staging run at a time for each pull request.** Opening a pull request with the `staging` label already on it starts both an `opened` and a `labeled` run. Give the staging workflow a `concurrency` group per pull request for runs that stage, with `cancel-in-progress: true`, so the newer run replaces the older one; runs that stage nothing, and merges, get a group of their own (for example the run's ID), so they never cancel a staging run:

```yaml
concurrency:
  group: >-
    ${{
      github.event_name == 'pull_request'
        && contains(github.event.pull_request.labels.*.name, 'staging')
        && (github.event.action != 'labeled' || github.event.label.name == 'staging')
        && format('staging-pr-{0}', github.event.pull_request.number)
      || format('staging-run-{0}', github.run_id)
    }}
  cancel-in-progress: true
```

## Jobs

1. **Resolve** (both workflows): turns the event into one exact commit SHA (and its tree), the target (`none`, `staging` or `live`), whether to run checks, and the version for a release. Every later job uses that SHA, never a branch name. It refuses a pre-release, a manual live run that isn't on the default branch, and anything that isn't a plain branch name or SHA. It writes a short "This run" summary: what was asked for, the commit, and which stages will run.
2. **Check** (both workflows): the repository's own tests and lints, with no deploy settings or secrets.
3. **Deploy to staging:** only staging's settings and secrets. One staging deploy at a time (`concurrency` with `cancel-in-progress: false`). Steps:
   - a gate that skips a merge overtaken by a newer merge (only the head of the default branch is deployed);
   - a guard that the destination is staging and not live;
   - build the package from the resolved commit, deploy it, smoke-check it;
   - mark the commit with a commit status such as `Staging: deployed`, and output `staged=true` for the next job.
4. **Draft the release** (staging workflow, on a merge only, after staging succeeds): runs the shared release-draft script (below) with `contents: write` for the draft and `pull-requests: write` to tell the merged pull request. Nothing else. Its step is named `Update the draft release (its link is in this step's log)`.
5. **Release to live** (live workflow): only live's settings and secrets, in a `live` environment. One live release at a time. Gates, all before anything is copied:
   - the tag is a plain `vX.Y.Z` and higher than every other release;
   - the commit carries the staging status;
   - it's still the head of the default branch, checked again just before copying, so a slow or re-run job can't overwrite a newer release;
   - a guard that the destination is live and not staging.

   Where the package is an immutable build, such as a container image, live gets the exact build that passed staging, by its digest, and the gates check that digest against the one staging recorded. It's never rebuilt for live, and the version is passed in at deploy time.

   Then back up, deploy, smoke-check, and tell the tasks (below). On failure, the summary says how to restore the backup, and what to do with the published release that didn't reach live.

6. **Roll back** (live workflow, Run workflow with target `rollback`, live only): uses live's settings and secrets only, in the `live` environment, and joins live's concurrency group so it never runs alongside a release. It takes an optional backup name; empty means the newest, which is the backup the last release took of the version before it. It:
   - restores that backup on the server so the folder matches it exactly (for example `rsync --delete --checksum` from the backup), then flushes any cache;
   - runs the smoke checks against the restored version;
   - records it on the releases page: the replaced release is renamed `Rolled back · {its title}`, marked as a pre-release, and given a note saying when, by which run, and which version is live again; the release that's live again is marked Latest.

   After the smoke checks, it tells the tasks in the replaced release that it was rolled back.

   For a project whose data outlives a release, such as a database, the backup it restores is the previous version of the application, not the data. It first checks that version can read today's data, for example that it knows the data's schema, and refuses with the reason if it can't. A data restore is a separate, documented recovery option with its own typed confirmation, which keeps the replaced data aside.

   It never deletes a release or a tag, so versions never go backwards. If there's no backup, it stops and says so. A dry run lists what would be restored and changes nothing; that's how it's tested. The next normal release replaces the rolled-back state.

   Staging gets no roll back and keeps no backups: redeploying the default branch puts staging right.

Each job's `name` is fixed text, because GitHub shows a skipped job's name exactly as written.

## Telling the tasks

A step at the end of Release to live (and of Roll back), after the smoke checks pass:

1. **Find the tasks:** the task IDs in the `type(TaskID):` prefixes of the release's pull request titles, the same ones the release's notes list (`taskIdsFromNotes` in the release-draft script). Nothing else is read.
2. **Comment once on each:** `Released to live in vX.Y.Z` with the release's link, or `Rolled back from live: vX.Y.Z` for a roll back. Each comment ends with a hidden or plain marker such as `release-key: vX.Y.Z live`; before writing, read the task's comments and skip it if the marker is already there.
3. **Never change a status,** and never fail the job: the step continues on error, and the summary lists each task as commented, already commented or failed, with the reason.

The tracker's token is a secret passed only to this step. Without it, the step says so in the summary and does nothing.

## Run names

`run-name` makes the Actions list say what each run is for. An empty result keeps GitHub's default, which for a merge is the merge commit's title, ending in `(#N)`. The staging workflow:

```yaml
run-name: >-
  ${{
    github.event_name == 'pull_request'
      && contains(github.event.pull_request.labels.*.name, 'staging')
      && (github.event.action != 'labeled' || github.event.label.name == 'staging')
      && format('Stage PR #{0} · {1}', github.event.pull_request.number, github.event.pull_request.title)
    || github.event_name == 'pull_request' && github.event.action == 'labeled'
      && format('PR #{0} · label {1}, nothing to do', github.event.pull_request.number, github.event.label.name)
    || github.event_name == 'pull_request'
      && format('PR #{0} · not staged (no staging label)', github.event.pull_request.number)
    || github.event_name == 'workflow_dispatch'
      && format('Stage {0}', inputs.ref || github.ref_name)
    || ''
  }}
```

The live workflow:

```yaml
run-name: >-
  ${{
    github.event_name == 'release'
      && format('Release {0} to live', github.event.release.tag_name)
    || inputs.target == 'rollback' && (inputs.dry_run && 'Roll back live (dry run)' || 'Roll back live')
    || inputs.dry_run && 'Release the newest release to live again (dry run)'
    || 'Release the newest release to live again'
  }}
```

A run's name is set when it starts, before the version is worked out, so the version shows in the draft, the summary and the log, not in the name.

## The draft release step

Runs after a merge reaches staging, as its own job. It reads and writes only the GitHub API. Every project runs the playbook's `scripts/release/release-draft.mjs`, checked out from the playbook at the commit the project pins, so the drafts look the same everywhere:

```yaml
  draft:
    name: Draft the release
    needs: [resolve, staging]
    if: github.event_name == 'push' && needs.staging.outputs.staged == 'true' # false when a newer merge overtook it
    runs-on: ubuntu-latest
    permissions:
      contents: write # the draft release
      pull-requests: write # tells the merged pull request it's staged
    steps:
      - uses: actions/checkout@<full SHA> # vX.Y.Z
        with:
          repository: <owner>/agent-playbook
          ref: <the pinned playbook commit>
          sparse-checkout: scripts/release
          persist-credentials: false
      - name: Update the draft release (its link is in this step's log)
        env:
          GITHUB_TOKEN: ${{ github.token }}
          HEAD_SHA: ${{ needs.resolve.outputs.sha }}
          STAGING_RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        run: node scripts/release/release-draft.mjs
```

Optional settings, as environment variables: `RELEASED_PATHS` (comma-separated, for a repository that releases only part of itself), `FIRST_RELEASE_BASE` (before the first release, the notes start after this commit, for example the one before the release route was added), `PRODUCT_NAME` (names the first release) and `DEFAULT_BRANCH`.

What it does:

1. **Last release:** two of them. The highest `vX.Y.Z` tag among all published releases, rolled-back ones included, is what the version counts on from, so a rolled-back version is never reused. The highest that isn't a pre-release (so not rolled back) is what's actually live, and the notes start from it. Neither exists before the first release.
2. **What's in it:** the commits from the live release's tag to the staged commit (the compare API). Before the first release, from `FIRST_RELEASE_BASE`, or just the staged commit. After a roll back, that brings the rolled-back pull requests back into the notes, because they're not live.
3. **Each commit's pull request:** the merged pull request into the default branch whose merge commit is that commit. From it: number, link, labels, title, the task link under `## What this does` (`ClickUp: [ID](link)`, as the pull request template writes it), its first sentence, and the steps under `## How to test`. Commits that didn't come from a pull request are listed by their SHA.
4. **The bump:** `major` if any has the `major` label, else `minor` if any has `minor`, else `patch`. The naming pull request is the newest one with the biggest bump.
5. **The version:** `v1.0.0` for the first release, otherwise the highest version with the bump applied (a major resets minor and patch, a minor resets patch).
6. **The title:** `vX.Y.Z · {naming title without its type(TaskID): prefix} (#N)`, plus ` and K more` when there are others.
7. **The notes:** "What's in vX.Y.Z", the count and since which version, then the Breaking, New, and Fixes and changes groups (empty groups left out, newest first), each line `[#N](pull request) · [Title](task) · TaskID · what it does`. Then "Check on staging" with each pull request's staging checks, renumbered, leaving out steps to merge, label, approve, review, publish, wait for a run or run a local command. Then a link back to the staging run.
8. **The one draft:** it updates the repository's draft release, or creates one if there's none, with the version as its tag, the staged commit as its target, the title and the notes. The tag isn't created until the person publishes. The person can still edit the draft before publishing, for example to make it a major.
9. **Telling the person:** the run summary gets one sentence, "Staged. [Draft release vX.Y.Z](link) is ready to publish once staging checks out.", the merged pull request gets the same sentence as a comment, and the job's log prints `Draft release vX.Y.Z: link`.

The script takes its environment as an argument and refuses to run without a summary file it was handed, so its tests, which pass synthetic data, a fake `fetch` and temporary files, can never write into a real run's summary. A project's own scripts follow the same rule.

## Today: Publish release

On plans without required reviewers for private repositories, the person's approval is publishing the draft release. Nothing else reaches live except the manual fallback, which they start themselves.

## Later: an approve button

GitHub's required reviewers on an environment pause a job until a named person approves it. They're available on public repositories on every plan, and on private repositories with GitHub Enterprise ([docs.github.com: environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/managing-environments-for-deployment)).

Build for it from the start, so switching is a settings change and a small workflow change:

- **The live job already uses a `live` environment,** with live's secrets as environment secrets and its deployment restricted to the default branch and `v*` tags.
- **The release-draft script can either update the draft or create the release.** `RELEASE_MODE=draft` is the default; `create` publishes it instead.

To switch:

1. Add the person as a required reviewer on the `live` environment.
2. Add a live job to the merge run, after staging, in the `live` environment. GitHub pauses it with an **Approve and deploy** button and the summary already shows the notes.
3. On approval, that job runs the release-draft script with `RELEASE_MODE=create` (it publishes the draft at the exact SHA with the same title and notes, which creates the tag), then the same live gates and deploy.
4. Drop the Draft the release job. Keep the `release: published` trigger for releases made by hand, the manual fallback and the live Roll back.

Batching still works: approving the newest merge's waiting run releases everything merged so far, and older waiting runs fail the "still the head" gate harmlessly. Reject or leave them, and set the environment's wait to expire them.

## Alternative: libraries released by changelog

A library that others pin by commit can release by merging instead: a pull request adds a `## X.Y.Z (date)` section to `CHANGELOG.md`, and a workflow creates the tag and release at the merge commit with that section as its notes, never moving an existing tag. The version rules and the notes' groups are the same.
