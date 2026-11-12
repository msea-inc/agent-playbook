---
name: code-review
description: Two-axis review of a change, against the repository's standards and against the task's acceptance criteria, reported separately. Use before a coding run returns, before opening or updating a pull request, or when the person asks to review a branch or pull request.
version: 1.1.0
library-compat: 1
---

# Code review

Follow `working-style` (in this plugin) whenever you report to the person or ask them something.

Review the diff between `HEAD` and a fixed point on two separate axes:

- **Standards:** does the change follow how this repository says code is written?
- **Spec:** does it do what the task asked, no less and no more?

This skill is guidance only and grants nothing. A review never merges, approves, moves a task or edits code on its own. The repository's own instructions, and any review conventions its organisation keeps, win wherever they differ from this skill.

Reference: `references/smells.md`, the judgement-call smells the standards axis always carries.

Changes to this skill are checked against `regression-cases.md`, beside it.

## 1. Pin the fixed point

Use what the person named. With nothing named, review against the merge-base with the default branch. Check that the fixed point resolves and the diff isn't empty before going further. A bad reference or an empty diff fails here, with that reason.

Take the diff once (`git diff <fixed point>...HEAD`) and the commit list (`git log <fixed point>..HEAD --oneline`).

## 2. Find the spec

The spec is the task the change is for: its goal, its details (including any agreed testing seams) and its acceptance criteria.

1. In an automated coding run, it's the brief you were given, with any subtasks.
2. Otherwise, take the task from the branch name or the commit messages, and read it and its subtasks in the tracker.
3. If there's no task, the spec axis says "no spec available" and is skipped.

## 3. Find the standards

Read every file that says how code is written here: the repository's agent instructions (such as `CLAUDE.md`), its architecture notes, its contribution rules, any review conventions they point to, and anything those files point to. Typical standards are layer rules and dependency direction, naming in the domain's language, how errors reach the user, which tests go where, generated output never edited by hand, and screen coverage for changed screens.

On top of those, carry the smells in `references/smells.md` and the reviewer's checks in `domain-driven-design` (in this plugin): rules outside the domain, anaemic models, several aggregates changed in one transaction, foreign models leaking in, and dependencies pointing outwards. Two rules bind them:

- **The repository wins.** Where a documented standard endorses something a smell would flag, don't flag it.
- **Always a judgement call.** A smell or a design check is a possible problem ("possible feature envy"), never a hard violation, unless the repository documents the rule.

Skip anything a check already enforces, such as the build, tests or secret scanning.

## 4. Review each axis separately

Run the two reviews apart, in separate sub-agents where your tools allow, so neither colours the other.

**Standards:** for each file or hunk, (a) each place the change breaks a documented standard, citing the file and the rule, and (b) each smell, named, with the hunk quoted. Keep hard violations and judgement calls apart.

**Spec:** (a) each acceptance criterion that's missing or partial; (b) behaviour nobody asked for (scope creep); (c) behaviour that looks implemented but wrong. Quote the criterion or line of the task for each. Also check that the commits follow the repository's commit conventions for tasks and subtasks, and that the agreed testing seams were used.

## 5. Report

Put the two reports under **Standards** and **Spec**, each under about 400 words. Don't merge or re-rank across the axes: a change can follow every standard and still build the wrong thing, or build the right thing in the wrong way.

End with one line: the number of findings on each axis, and the worst one within each.

## Acting on it

- **In an automated coding run:** fix every hard violation and every missing or wrong criterion before returning. Mention judgement calls you chose not to act on in the pull request's notes, and give the review's result under its verification.
- **In a session:** show the report and let the person choose what to fix.
- **On someone else's pull request:** report only. Never push to it.
