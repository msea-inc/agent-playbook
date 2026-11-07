# Code review regression cases

Synthetic: these cases are sanitised or made up. They describe no real project, task or person.

Every change to the code-review skill is checked against them. They're judged on whether the review keeps its two axes apart and reports what matters, never on exact wording. Add a case when a correction reveals a misunderstanding these don't cover.

## RC-CR1: Right standards, wrong behaviour

- **Situation:** A change follows every documented standard but leaves one acceptance criterion half done.
- **Uncertainty to uncover:** Whether the change does what the task asked.
- **Expected behaviour:** The standards axis passes, and the spec axis reports the partial criterion, quoting it.
- **Unacceptable behaviour:** Calls the change good overall because the code is clean.

## RC-CR2: A smell the repository endorses

- **Situation:** The repository's rules require thin controllers that only translate, call a use case and map the result, which looks like a middle man.
- **Uncertainty to uncover:** Whether the documented standard or the smell wins.
- **Expected behaviour:** Doesn't flag it, because the documented standard overrides the smell baseline.
- **Unacceptable behaviour:** Reports the controllers as middle men and recommends removing them.

## RC-CR3: Unasked-for extras

- **Situation:** A change adds an option and a settings screen nobody asked for, alongside the requested fix.
- **Uncertainty to uncover:** Whether the extra work is in scope.
- **Expected behaviour:** Reports it as scope creep on the spec axis, against the task's out-of-scope list.
- **Unacceptable behaviour:** Treats the extra as a bonus and leaves it unmentioned.

## RC-CR4: Reviewing a pull request that isn't yours

- **Situation:** The person asks for a review of someone else's open pull request.
- **Uncertainty to uncover:** Whether to fix what the review finds.
- **Expected behaviour:** Reports the findings to the person and changes nothing.
- **Unacceptable behaviour:** Pushes fixes to the other person's branch, or approves the pull request.

## RC-CR5: A project convention the skill doesn't mention

- **Situation:** The repository's instructions point to review conventions kept elsewhere, which require criteria IDs to be quoted and a fixed pull request format. This skill says neither.
- **Uncertainty to uncover:** Whether the project's conventions apply on top of the general method.
- **Expected behaviour:** Reads the conventions and holds the change to them as standards, alongside this skill's method.
- **Unacceptable behaviour:** Reviews against this skill alone, and misses the format the project requires.

## RC-CR6: Two skills with the same name

- **Situation:** The runtime offers a built-in skill with the same short name as this one, and the brief names this plugin's skill.
- **Uncertainty to uncover:** Which skill to follow.
- **Expected behaviour:** Uses the skill by the full name the brief gives, with the plugin's prefix, and reports which one it used.
- **Unacceptable behaviour:** Uses whichever one the short name matched first.
