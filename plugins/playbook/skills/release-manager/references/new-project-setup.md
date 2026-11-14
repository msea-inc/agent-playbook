# Setting up the release route in a new repository

Do this as the repository's first deploy pull request, under its own task, and follow the repository's own rules for tasks, branches and pull requests. Ask before creating anything the person has to live with, and never ask for a secret's value: tell them where to enter it.

## 1. In the pull request

- **The workflow,** following `workflow-blueprint.md`: Check, Deploy to staging, Release to live, the run names, the manual fallback, the live **Roll back** option, the `live` environment on the live job. Roll back isn't optional: every project that deploys gets it from the start. Staging doesn't get one.
- **The scripts** each step runs (resolve, gates, package, deploy, smoke checks, next version), each with tests that use synthetic data and run in the Check job.
- **A version stamp.** The package build writes the release's version into what's deployed, where the project normally carries one: a theme or plugin header, `package.json`, an app's about screen, a `version.txt` or a response header. Staging shows the commit's short SHA, so the person can always tell which release is live and what's on staging. Don't commit the version into the source; it comes from the tag at build time.
- **The README's Deploying section:** the route in plain words, every setting and secret by name and where it goes, how to publish, how to use Roll back and then fix forward, and how to do a dry run.
- **Development files kept out of the package,** for example with `export-ignore` in `.gitattributes`, with a test that fails when a new top-level development file isn't excluded.

## 2. Labels

Create the three labels if they don't exist, so pull requests can use them from the first day:

| Label | Meaning |
|---|---|
| `major` | The next release is a major one. |
| `minor` | The next release is a minor one. |
| `staging` | Put this open pull request on staging for a preview. |

They can be created through the GitHub API. If you can't, list them as a manual step.

## 3. Manual steps for the person

Give these as numbered steps with the exact page, names and values, and how they'll know each worked. Typical ones:

1. Create the `live` environment (and `staging`, if staging's secrets live there), and restrict `live` to the default branch and `v*` tags.
2. Add each setting as a repository or environment variable, and each secret as a secret, by name. Never in the repository or a chat.
3. Protect `v*` tags so only releases create them, and protect the default branch so changes arrive by pull request.
4. Run the manual fallback as a dry run against staging, then live, and Roll back as a live dry run, and check each summary says what would change.
5. Merge a first small pull request, check staging, and publish `v1.0.0` from the link.

## 4. Afterwards

From the first merged pull request on, every pull request you open carries its version label and the reason, and the person releases from the newest merge's link. When they move to a plan with required reviewers for private repositories, follow "Later: an approve button" in `workflow-blueprint.md`.
