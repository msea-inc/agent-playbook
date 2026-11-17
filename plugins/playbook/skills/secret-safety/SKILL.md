---
name: secret-safety
description: Keep secrets, and anything a secret scan would flag, out of every commit and push - check the repository's secret hooks are installed before the first commit, scan every commit and push, write docs and tests that never look like credentials, and fix a false positive in the scan's rule with tests instead of working around it. Use before every git commit and every git push, in any repository, when writing setup steps, examples or test fixtures that handle a credential, when a secret scan flags something, and when setting up a new repository.
version: 1.0.0
library-compat: 1
---

# Secret safety

A secret that reaches a remote has to be revoked, and even a harmless line that the scan flags can only be cleared by rewriting pushed history. Both are far cheaper to catch before the commit than after the push. This applies to every agent, in every repository, on every commit, however small. It's guidance only and grants nothing. Where a repository's own rules are stricter, follow them.

Changes to this skill are checked against `regression-cases.md`, beside it.

## Before the first commit

Do this once per session or clone, before you commit anything:

1. **Find the repository's secret protection.** Read its agent instructions and security notes for a hook installer, a scan script or a CI secret scan.
2. **Check the hooks are installed in this clone.** Cloning or pulling never installs git hooks. Look at `git config --get core.hooksPath` and the hooks it points to, or run the repository's own check.
3. **If they aren't, install them** with the repository's installer, and say so. If the installer fails, fix that before committing, or tell the person what's blocking it. Never carry on committing without them.
4. **Make the clone able to scan history.** A push scan usually needs full history, so deepen a shallow clone (`git fetch --unshallow`) before the first push.
5. **If the repository has no secret protection,** scan your staged changes with the best scanner you have, read the staged diff yourself for anything credential-shaped, and suggest adding protection to the repository through its tracker.

## Every commit and every push

- **Before each commit,** let the hooks scan the staged snapshot and the message. If you committed with hooks bypassed for any reason, scan before pushing.
- **Before each push,** run the repository's history scan over what you're about to push. A secret removed in a later commit is still in the history.
- **Never bypass a scan:** no `--no-verify`, no inline allow comments, no ignore files, no path or file allowlists, no turning a CI job off, and no disabling hooks to get a commit through.

## Writing things that never look like secrets

Most flags come from text that only looks like a credential. Write it so it never does:

- **Setup steps** that ask for a secret use a small helper script that reads the value hidden and stores it with the right owner and mode, rather than an inline shell prompt whose label ends in a word like token or password followed by a quote.
- **Examples and placeholders** use the forms the repository's scan already accepts, such as `YOUR_TOKEN` or `example`, never a realistic-looking value.
- **Test fixtures** build fake credentials from parts at run time, so no complete credential-shaped string is ever in a file, and they say they're synthetic.
- **Never write a real secret** in code, docs, a commit message, a pull request, a task or a chat, even briefly or in a branch you mean to delete.

## When the scan flags something

1. **Stop.** Don't push, and don't paste the flagged value anywhere, including your report.
2. **If it could be a real secret,** tell the person at once, plainly, and that it must be revoked and replaced wherever it's used. Remove it from the commit before anything else.
3. **If it's a false positive,** fix the scan's rule, not the text around it:
   - make the narrowest change that tells this kind of text apart from a credential, matched on the captured value, never a path, a file or a whole line;
   - add two tests to the scan's own tests in the same change: the harmless text is allowed, and real credentials of the same shape are still caught;
   - say in the pull request what was flagged, why it was harmless and what the rule now does.
4. **If it's already pushed,** only rewriting history clears it. That's the person's decision: explain what would be rewritten and why, and wait for their yes for that exact branch. Record the decision where the repository keeps its audit trail.
5. **Then find why it wasn't caught before the push,** usually hooks that weren't installed, and fix that too.

## Setting up a new repository

Every repository gets secret protection in its first pull request:

- a **hook installer** for pre-commit (the staged snapshot), commit-msg and pre-push (all history being pushed), which fails closed when the scanner is missing;
- a **CI secret scan** of full history and commit messages on every push and pull request, plus the hooks' own tests;
- the scanner pinned to a version and verified by checksum;
- the agent instructions telling every agent to install the hooks before their first commit, and, where the agent supports it, a session-start hook that installs them automatically and says loudly when it can't;
- a short security note on what's blocked, how to install, and how to fix a false positive.

## Never

- Commit or push without the secret hooks installed, or with them bypassed.
- Work around a flag by rewording, moving or hiding the text while leaving the rule unfixed and untested.
- Rewrite pushed history without the person's yes for that exact branch.
- Ask anyone to paste a secret into a chat, a task or a file.
