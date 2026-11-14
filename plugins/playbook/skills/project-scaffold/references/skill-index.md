# Skill index

Every skill in this plugin, in one place. Find the job you're doing, then read the file and section under **Read first** before anything else. Paths are relative to the plugin's `skills/` folder, and a section is the heading's exact text after the `›`.

The index check (`scripts/skills/index-check.mjs`) fails when a skill has no entry here, or a **Read first** line points at a file or section that doesn't exist. Add or fix the entry in the same pull request as the change.

Organisations may keep more skills of their own in a private config repository. Read that repository's own list for them; they're never copied here.

## playbook:working-style

- **Use when:** you ask the person anything, offer options, report a result, or are about to create something for them.
- **Scaffold takes:** asking for a yes before creating the repository, settings or secrets, and giving manual steps they can follow.
- **Read first:**
  - `working-style/SKILL.md` › Nothing is created without a yes
  - `working-style/SKILL.md` › Report results plainly

## playbook:code-review

- **Use when:** before a coding run returns, before opening or updating a pull request, or when asked to review a branch or pull request.
- **Scaffold takes:** reviewing the scaffold's own pull request against the repository's new standards and the task.
- **Read first:**
  - `code-review/SKILL.md` › 3. Find the standards
  - `code-review/SKILL.md` › 5. Report

## playbook:domain-driven-design

- **Use when:** designing, planning, writing, refactoring or reviewing code, or shaping a solution as architect or engineer.
- **Scaffold takes:** the domain note: the project's words, its contexts, and where each kind of code lives.
- **Read first:**
  - `domain-driven-design/SKILL.md` › Choosing a starting point
  - `domain-driven-design/references/strategic-design.md` › Bounded contexts

## playbook:release-manager

- **Use when:** opening or updating a pull request (labels), after a merge, preparing or explaining a release, an urgent fix or a roll back, or setting up a release route.
- **Scaffold takes:** the whole release route, the labels, the version stamp, the live Roll back, the task comments, and the manual steps for environments and secrets.
- **Read first:**
  - `release-manager/references/new-project-setup.md` › 1. In the pull request
  - `release-manager/references/workflow-blueprint.md` › Jobs
  - `release-manager/SKILL.md` › Labels: every pull request you open

## playbook:project-scaffold

- **Use when:** creating a new repository or project, adding the standard files to one that lacks them, or finding which skill covers something.
- **Scaffold takes:** this is the scaffold.
- **Read first:**
  - `project-scaffold/SKILL.md` › The base
  - `project-scaffold/references/base-files.md` › Agent instructions
