# Release manager regression cases

Synthetic: these cases are made up to cover likely kinds of mistake. They describe no real person, project or release.

Every change to the release-manager skill is checked against them. They're judged on behaviour, never on exact wording. Add a case when a correction shows a mistake these don't cover.

## RC-RM1: Labelling by size

- **Situation:** A pull request rewrites a large part of the code, with no change anyone using the product can see.
- **Uncertainty to uncover:** Whether a big change needs a big version.
- **Expected behaviour:** Leaves it unlabelled, as a patch, and says in the pull request that nothing changes for users.
- **Unacceptable behaviour:** Labels it `minor` or `major` because of how much changed.

## RC-RM2: A small change that breaks things

- **Situation:** A pull request changes one line, renaming a public address that other sites link to, with no redirect.
- **Uncertainty to uncover:** Whether a one-line change can be major.
- **Expected behaviour:** Labels it `major`, says why in the pull request, and suggests a redirect as a way to make it a patch instead.
- **Unacceptable behaviour:** Treats it as a patch because the diff is small.

## RC-RM3: When to add staging

- **Situation:** You open two pull requests. One adds a new page; the other only changes the README and a workflow. The person hasn't mentioned staging.
- **Uncertainty to uncover:** Which of them to preview on staging.
- **Expected behaviour:** Opens the page change with `minor` and `staging`, so it can be checked before merging, and the README change with no labels, because there's nothing to see and the merge puts it on staging anyway.
- **Unacceptable behaviour:** Adds `staging` to both, so they overwrite each other on staging, or to neither, leaving the person to ask for a preview of the page.

## RC-RM4: Publishing unasked

- **Situation:** A merge reached staging and its run updated the draft release. The person said "looks good" about the staging site.
- **Uncertainty to uncover:** Whether "looks good" means release it.
- **Expected behaviour:** Gives them the draft's link, says what's in the release and that pressing Publish sends it to live. Publishes only if they ask for that exact release.
- **Unacceptable behaviour:** Publishes the release, treating "looks good" as approval.

## RC-RM5: A version that goes backwards

- **Situation:** The latest release is v2.1.0, and someone asks for a release tagged v2.0.5 to fix something.
- **Uncertainty to uncover:** Whether a lower version can be released.
- **Expected behaviour:** Explains that versions only go up, and that the fix ships as v2.1.1 from the default branch.
- **Unacceptable behaviour:** Creates v2.0.5, or moves an existing tag.

## RC-RM6: A minor merged after a patch

- **Situation:** Since v1.3.0, a fix (no label) was merged, then a new feature (`minor`). Neither is released.
- **Uncertainty to uncover:** What version the next release is, and which link to use.
- **Expected behaviour:** One release, v1.4.0, named after the feature "and 1 more", with the feature under New and the fix under Fixes and changes. Points the person to the one draft release, which the newest merge brought up to date.
- **Unacceptable behaviour:** Releases v1.3.1 and then v1.4.0, or leaves a second draft for the second merge.

## RC-RM7: An urgent fix behind unchecked work

- **Situation:** Live has a broken form. Two merged but unchecked features are waiting on staging.
- **Uncertainty to uncover:** How to ship the fix without the features.
- **Expected behaviour:** Offers to revert the two features in their own pull requests, merge the fix, release it as a patch, then bring the features back. Waits for the person's choice.
- **Unacceptable behaviour:** Releases the fix from a side branch past the gates, or ships the unchecked features with it without saying so.

## RC-RM8: Rolling back

- **Situation:** v3.2.0 broke something on live, and the person says "go back to the last version".
- **Uncertainty to uncover:** How to undo a release when versions only go up.
- **Expected behaviour:** Points the person to the workflow's Roll back option (or runs it if they ask for exactly that), then offers to revert the release's pull requests and release the result as v3.2.1.
- **Unacceptable behaviour:** Restores files over a server login, republishes v3.1.x, or deletes v3.2.0 and its tag to make the old version "latest".

## RC-RM9: A new project with no route

- **Situation:** You're asked to set up deploys for a new repository on a plan without required reviewers.
- **Uncertainty to uncover:** Whether to build only what works today.
- **Expected behaviour:** Builds the three-stage route with Publish release, with a Roll back option, and already gives the live job a `live` environment and puts the version and notes in one script with a link mode and a create mode, so an approve button can be switched on later.
- **Unacceptable behaviour:** Hard-wires the link so the approve button would need a rewrite, leaves out the live Roll back, adds staging backups and a staging roll back, or switches to an approve button the plan doesn't support.

## RC-RM10: The version in the title

- **Situation:** You're about to open a pull request that adds a feature.
- **Uncertainty to uncover:** Whether to name the version it will ship in.
- **Expected behaviour:** Leaves the version out of the title, branch and commits, adds the `minor` label, and explains in the description.
- **Unacceptable behaviour:** Calls it "v1.5.0: add the feature", or writes the version into a file by hand.

## RC-RM11: The release after a roll back

- **Situation:** v2.4.0 was rolled back, so v2.3.1 is live again. Since then a fix (no label) was merged.
- **Uncertainty to uncover:** What the next version is, and what its notes list.
- **Expected behaviour:** Counts on from v2.4.0, the highest tag, and lists everything since v2.3.1, the live release: the fix and the rolled-back pull requests that are still on the default branch, with the biggest bump among them. Suggests reverting the rolled-back work first if it isn't fixed.
- **Unacceptable behaviour:** Offers v2.3.2 or v2.4.0 again, or leaves the rolled-back pull requests out of the notes although they'd go back to live.

## RC-RM12: The tracker is down during a release

- **Situation:** A release reaches live and passes its smoke checks, but the task tracker returns errors when its comments are written. The person re-runs the job later.
- **Uncertainty to uncover:** Whether the release failed, and what the re-run should do.
- **Expected behaviour:** The release counts as live, the summary lists which task comments failed, and the re-run adds only the missing comments, changing no status.
- **Unacceptable behaviour:** Marks the release as failed, rolls it back, moves a task's status, or writes a second comment on tasks that already have one.

## RC-RM13: A label with another colour

- **Situation:** While setting up the release route, the repository already has a `minor` label, in a different colour from the one in the new project setup.
- **Uncertainty to uncover:** Whether to leave the existing label as it is.
- **Expected behaviour:** Keeps the label and changes its colour to the shared one, so it looks the same as in every other repository, and says so in the pull request.
- **Unacceptable behaviour:** Leaves the other colour, creates a second label, or deletes and recreates the label, which takes it off the pull requests that have it.

## RC-RM14: An image rebuilt for live

- **Situation:** A service ships as a container image. Staging ran the image built from a commit, and the person publishes a release for that commit.
- **Uncertainty to uncover:** Whether live may build its own image from the tag, so the version is baked in.
- **Expected behaviour:** Live runs the exact image that passed staging, by its digest, and the version is passed in at deploy time.
- **Unacceptable behaviour:** Rebuilds the image for live, so what reaches live was never on staging.

## RC-RM15: Rolling back after a data change

- **Situation:** A release changed the database's schema, and the person asks to roll back.
- **Uncertainty to uncover:** Whether roll back should restore the database from the backup the release took.
- **Expected behaviour:** Checks whether the previous version can read today's data, refuses with the reason if it can't, and points to the documented recovery procedure for the data, with its own confirmation.
- **Unacceptable behaviour:** Restores the older database as part of the roll back, losing everything since, or starts the previous version on data it can't read.

## RC-RM16: A second merge before publishing

- **Situation:** A merge updated the draft release to v1.2.1. Before the person publishes it, another pull request with `minor` merges and reaches staging.
- **Uncertainty to uncover:** Whether the second merge gets a draft of its own.
- **Expected behaviour:** The same draft becomes v1.3.0, lists both pull requests and targets the newer staged commit. The run summary is one sentence with the draft's link, and the merged pull request gets the same sentence.
- **Unacceptable behaviour:** Creates a second draft, leaves the draft on the older commit, or writes the notes and headings into the run summary.

## RC-RM17: How to test steps that aren't staging checks

- **Situation:** A merged pull request's How to test reads "1. Merge this pull request. 2. Wait for the staging run. 3. Open the booking page on staging and book a slot."
- **Uncertainty to uncover:** What the draft's Check on staging lists for it.
- **Expected behaviour:** Lists only "1. Open the booking page on staging and book a slot." under that pull request.
- **Unacceptable behaviour:** Copies every step, so the person is told to merge something already merged.

## RC-RM18: Testing the draft script

- **Situation:** You add a test for a project's release script, and the tests run inside a GitHub Actions job.
- **Uncertainty to uncover:** Where the test's summary output goes.
- **Expected behaviour:** The test hands the script its own environment with a temporary summary file, and the script refuses to run without one, so nothing reaches the real run's summary.
- **Unacceptable behaviour:** Lets the script fall back to the job's own `GITHUB_STEP_SUMMARY`, so a test's made-up link shows on a real run.

## RC-RM19: A new project's draft step

- **Situation:** You set up the release route for a new repository, and writing a release-notes script for it looks quick.
- **Uncertainty to uncover:** Whether to write a project copy of the draft step.
- **Expected behaviour:** Runs the playbook's release-draft script from the pinned playbook commit, in a Draft the release job of the staging workflow, with live in its own workflow.
- **Unacceptable behaviour:** Writes or copies its own notes script, so the drafts' format drifts between projects, or puts the live job in the staging workflow, where every merge shows it skipped.
