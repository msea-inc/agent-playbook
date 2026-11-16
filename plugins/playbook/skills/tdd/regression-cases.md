# TDD regression cases

Synthetic: these cases are sanitised or made up. They describe no real project, task or person.

Every change to the tdd skill is checked against them. They're judged on whether the build follows red-green-refactor at the agreed seams and keeps tests worth having, never on exact wording. Add a case when a correction reveals a misunderstanding these don't cover.

## RC-T1: An unattended run with seams on the task

- **Situation:** An unattended coding run builds a task whose details list its testing seams.
- **Uncertainty to uncover:** Whether to test at those seams or choose others.
- **Expected behaviour:** Tests at the listed seams, one behaviour at a time, and doesn't stop to ask.
- **Unacceptable behaviour:** Ignores the agreed seams, or returns blocked to ask which seams to use when they're already on the task.

## RC-T2: Tests that mock the repository's own code

- **Situation:** A use case calls two other classes in the same repository and one provider.
- **Uncertainty to uncover:** What the test should replace with a fake.
- **Expected behaviour:** Uses the real classes and the repository's existing fake for the provider's port.
- **Unacceptable behaviour:** Mocks the two classes and asserts they were called, so the test breaks on any refactor.

## RC-T3: The happy path only

- **Situation:** A change adds a call to an outside service.
- **Uncertainty to uncover:** Whether a provider failure reaches the caller with its reason.
- **Expected behaviour:** Includes a test that feeds a real-shaped provider error through the adapter and checks the reason comes out.
- **Unacceptable behaviour:** Tests only the success case, leaving the error path untested.

## RC-T4: Writing every test before any code

- **Situation:** A slice has four behaviours to build.
- **Uncertainty to uncover:** Whether to write all four tests up front.
- **Expected behaviour:** Writes the four behaviours on a test list, then one failing test, makes it pass, refactors, and moves to the next.
- **Unacceptable behaviour:** Writes all four tests first, then all the code.

## RC-T5: The code contradicts the recorded approach

- **Situation:** The plan recorded a transaction script for an area. While writing the first tests, it turns out two operations must share an invariant.
- **Uncertainty to uncover:** Whether to change the approach silently.
- **Expected behaviour:** Stops and raises the contradiction with the failing case as evidence and a proposed adjustment, then follows the answer.
- **Unacceptable behaviour:** Quietly introduces a domain model, or copies the invariant into both scripts.

## RC-T6: Green, with a mess behind it

- **Situation:** The second test passes after the green step added a duplicated conditional and a hard-coded value.
- **Uncertainty to uncover:** Whether to move on to the next test or tidy first.
- **Expected behaviour:** Refactors now, while green, removing the duplication in code and tests, running the tests after each step, then picks the next item.
- **Unacceptable behaviour:** Moves to the next test and leaves the tidy-up for review, or refactors while a test is red.

## RC-T7: A refactor that changes behaviour

- **Situation:** During the refactor step, a cleaner structure would also change what an edge case returns.
- **Uncertainty to uncover:** Whether that belongs in the refactor.
- **Expected behaviour:** Keeps the refactor to structure only, and adds the new edge-case behaviour to the test list for its own red step.
- **Unacceptable behaviour:** Changes the behaviour and edits the existing test to match, inside the refactor.

## RC-T8: A test that never went red

- **Situation:** A new test passes the first time it runs.
- **Uncertainty to uncover:** Whether it proves anything.
- **Expected behaviour:** Checks why: the behaviour already exists, or the test isn't reaching it. Either drops the test as a duplicate or fixes it until it fails for the expected reason.
- **Unacceptable behaviour:** Keeps it and moves on.

## RC-T9: A bug report

- **Situation:** The person reports that a discount is applied twice.
- **Uncertainty to uncover:** Where the fix starts.
- **Expected behaviour:** Writes a test through a seam that reproduces the double discount and watches it fail, then fixes, refactors and keeps the test.
- **Unacceptable behaviour:** Changes the code first and adds a test afterwards, or doesn't add one.
