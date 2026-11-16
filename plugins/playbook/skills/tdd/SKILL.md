---
name: tdd
description: How to build any code change test-first, in canonical red-green-refactor - a test list, one failing test, the simplest code that passes, then a refactor in every cycle - with tests through agreed seams that check behaviour, not internals. Use whenever you write or change code for a task, fix a bug, or when the person asks for TDD or red-green-refactor.
version: 1.0.0
library-compat: 1
---

# Test-driven development

Use this skill whenever you write code. Every change is built in small cycles of red, green and refactor: a failing test first, then the simplest code that makes it pass, then a tidy-up while everything is green. It's guidance on how to build and grants nothing. The repository's own instructions (such as `CLAUDE.md`) win wherever they differ from it.

Follow `working-style` (in this plugin) whenever you report to the person or ask them something.

References:

- `references/good-and-bad-tests.md`: examples of tests worth keeping and tests that aren't.
- `references/test-layers.md`: which kind of test goes where, with a synthetic worked example.

Changes to this skill are checked against `regression-cases.md`, beside it.

## The loop

This is the canonical form of TDD, as Kent Beck describes it, and the form most teams that succeed with TDD use.

0. **Test list.** Before any code, write a short list of the behaviours the change needs, from the task's acceptance criteria and the cases you can think of. It's a working note, not a set of tests. Add to it whenever you notice a new case, and cross items off as they pass.
1. **Red.** Pick one item from the list: the one that teaches you most, or the simplest that moves you forward. Write one test for it, at an agreed seam. Run it and **watch it fail for the reason you expect**. A test that passes straight away, or fails for another reason (a typo, a missing import), hasn't proved anything yet.
2. **Green.** Write the simplest code that makes that test pass, and run the tests. Shortcuts are fine here: a hard-coded value, a duplicate, an obvious hack. The refactor step pays them back. No speculative features, and no code for the next item on the list.
3. **Refactor, every cycle.** With all tests green, improve the design of the code you just touched, production code and tests alike: remove the duplication the green step added, name things in the domain's words, extract or inline, simplify. Change structure only, never behaviour, and run the tests after each small step. If one goes red, undo the step rather than debugging forward. Stop when the code is as clear as you can make it for what it does now, not for what it might need later.
4. **Repeat** from step 1 with the next item. Each test responds to what the last cycle taught you.

Keep cycles short: minutes, not hours. When a step feels too big, write a smaller test.

### Getting to green

Three ways, in order of how sure you are:

- **Fake it:** return a constant that passes, then let the next tests force the real logic out of it. Use it when the way forward isn't obvious.
- **Triangulate:** add a second example that the fake can't pass, so the general code is the only answer.
- **Obvious implementation:** when you know exactly what to write, write it. Drop back to faking when a test surprises you.

### Commits

Commit at green, ideally after each refactor step, so every commit passes its tests. Follow the repository's commit conventions. Run the single test file often during the loop, and the repository's full pre-push checks before you push.

## What a good test is

A good test checks behaviour through a public interface, not how the code does it. It reads like a line of the spec ("a task name must be one short line"), uses the domain's words, and survives a refactor because it doesn't care about the inside. That last point is what makes refactoring every cycle safe.

Build in the design approach the plan recorded for the area, under `domain-driven-design` (in this plugin). A rule's first failing test goes against its one owner: the aggregate or value object in a domain-model area, or the script or use case in a simpler one. If the code contradicts the recorded approach, for example a "simple" area turns out to have interacting rules, raise it with the failing case as evidence instead of silently changing the approach.

## Seams: where tests go

A **seam** is a public interface that a test goes through to reach a behaviour: a module's exported functions, a use case, an adapter's port, an endpoint, a screen. Behaviour behind a seam can change without the test changing. Test only at agreed seams:

- **The task or plan names testing seams** (wherever the project keeps them, such as the task's details or a planning note): use them. An unattended run never stops to ask.
- **No seams agreed:** pick the highest existing seam that covers the behaviour. In an unattended run, say which you used, and why, in the pull request's description. In a live session, propose it to the person and wait for a yes first.
- **The seam itself is in question** (how deep the module is, where the interface belongs): raise it before writing tests, with the options and your recommendation.

Prefer an existing seam to a new one, the highest one that reaches the behaviour, and as few as possible.

## Anti-patterns

- **Skipping the refactor:** moving to the next test with the duplication and shortcuts of the green step still there. The mess compounds, and the design never emerges.
- **Refactoring on red:** changing structure while a test is failing. Get back to green first, even by undoing.
- **Changing behaviour in the refactor step:** a refactor that needs a test to change is a new behaviour, and belongs in its own red step.
- **Tied to the implementation:** mocks your own collaborators, tests private methods, asserts on call order, or checks a side channel (reading the database instead of using the interface). It breaks on a refactor when behaviour hasn't changed.
- **Tautological:** the expected value is computed the way the code computes it, so it passes by construction. Expected values come from somewhere independent: a known literal, a worked example, the acceptance criterion.
- **All the tests first, then all the code:** bulk tests check imagined behaviour and lock in a structure before you understand it. The test list holds the ideas, and only one becomes a test at a time.
- **Mocking what you own:** mock only at the edge of the system (an outside provider's API, the clock, randomness). Inside, use the real code or the repository's own fakes for its ports.
- **Never seeing red:** writing the code first and the test after, or not running the new test before the code exists. A test you've never seen fail might not be testing anything.

## Errors are behaviour too

When the change calls an outside service, one test at the adapter's seam feeds in a real-shaped provider error and checks that its reason reaches the caller in a readable form. It's one of the cycle's items on the test list, not an extra.

## Bug fixes

A bug fix starts red too: first a test that reproduces the bug through a seam and fails for the reason the bug describes. Then fix it in the green step, refactor, and keep the test.
