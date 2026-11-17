# Setting up the release route in a new repository

Do this as the repository's first deploy pull request, under its own task, and follow the repository's own rules for tasks, branches and pull requests. Ask before creating anything the person has to live with, and never ask for a secret's value: tell them where to enter it.

## 1. In the pull request

- **The two workflows,** `{Project} staging` and `{Project} live`, following `workflow-blueprint.md`: Check, Deploy to staging, Draft the release (the playbook's release-draft script at the pinned playbook commit), Release to live, the run names, one staging run at a time per pull request, the manual fallback, the live **Roll back** option, the `live` environment on the live job. Roll back isn't optional: every project that deploys gets it from the start. Staging doesn't get one.
- **The scripts** each step runs (resolve, gates, package, deploy, smoke checks), each with tests that use synthetic data and run in the Check job. Scripts take their environment as an argument, so a test never writes to a real run summary. The next version and notes come from the shared release-draft script, not a copy of it.
- **A version stamp.** The package build writes the release's version into what's deployed, where the project normally carries one: a theme or plugin header, `package.json`, an app's about screen, a `version.txt` or a response header. Staging shows the commit's short SHA, so the person can always tell which release is live and what's on staging. Don't commit the version into the source; it comes from the tag at build time. For an immutable build such as a container image, which is built once per commit before any version exists, bake in the commit at build time and pass the version in at deploy time, for example as a setting the app reads and shows.
- **The README's Deploying section:** the route in plain words, every setting and secret by name and where it goes, how to publish, how to use Roll back and then fix forward, and how to do a dry run.
- **Development files kept out of the package,** for example with `export-ignore` in `.gitattributes`, with a test that fails when a new top-level development file isn't excluded.

## 2. Labels

Create the three labels if they don't exist, so pull requests can use them from the first day. Give each one the colour below, the same in every repository, so a label looks the same wherever the person sees it:

| Label | Meaning | Colour |
|---|---|---|
| `major` | The next release is a major one. | `#DC2626` |
| `minor` | The next release is a minor one. | `#F97316` |
| `staging` | Put this open pull request on staging for a preview. | `#00B40F` |

If a label already exists with another colour, change its colour to match rather than leaving it.

They can be created and recoloured through the GitHub API, which takes the colour without the `#`. If you can't, list them as a manual step, with each label's colour.

## 3. Manual steps for the person

Give these as numbered steps with the exact page, names and values, and how they'll know each worked. Typical ones:

1. Create the `live` environment (and `staging`, if staging's secrets live there), and restrict `live` to the default branch and `v*` tags.
2. Add each setting as a repository or environment variable, and each secret as a secret, by name, including the task tracker's token for the release comments. Never in the repository or a chat.
3. Protect `v*` tags so only releases create them, and protect the default branch so changes arrive by pull request.
4. Run the manual fallback as a dry run against staging, then live, and Roll back as a live dry run, and check each summary says what would change.
5. Merge a first small pull request, check staging, and publish the `v1.0.0` draft from the releases page.

## 4. Afterwards

From the first merged pull request on, every pull request you open carries its version label and the reason, and the person releases by publishing the one draft release. When they move to a plan with required reviewers for private repositories, follow "Later: an approve button" in `workflow-blueprint.md`.
