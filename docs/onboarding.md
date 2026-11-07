# Using the playbook

## Calling a workflow

1. Pick a release from `CHANGELOG.md` and find its tag's full commit SHA.
2. Copy the caller from `docs/caller-examples/` into your repository's `.github/workflows/`.
3. Pin `uses:` to that full SHA, with the release in a comment. A branch, a tag or a short SHA is refused when the workflow starts.
4. Grant the calling job `id-token: write` (and `contents: read`). The workflow uses its OIDC token only to read its own identity.
5. Pass each secret it needs by name. Never use `secrets: inherit`.
6. Add any organisation variables the release lists, then open the caller as a pull request and check the first run.

## What the playbook needs from you

Each workflow's header comment lists its inputs, secrets and variables. The playbook itself needs no token to be checked out, because it's public.

## Upgrading

Follow `docs/versioning-and-rollback.md`: upgrade one pilot repository by pull request first, then the others.
