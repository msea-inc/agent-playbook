# Choosing the version

The question is always the same: **what changes for the people who use this?** The examples below are made up, to show the rule for each kind of project.

## The test, in order

1. **Will anyone have to change what they do, or lose something they relied on?** Major.
2. **Is there something new they can use, with everything else still working?** Minor.
3. **Otherwise** (they'd notice a fix or a polish at most): patch.

Ask about the people who use it, not the code: a removed internal function nobody outside calls is a patch; a renamed public address is major.

## By kind of project

| Kind | Major | Minor | Patch |
|---|---|---|---|
| **Website or theme** | A page or address removed or moved without a redirect; editors lose a block, field or layout they used; a required plugin or server version goes up. | A new page, layout, section or setting editors can use. | Fixed layout, wording, styles, speed, accessibility fixes, internal tidy-ups. |
| **App (web, mobile or desktop)** | Users must sign in again, re-enter data or relearn a main flow; a feature is removed; stored data needs migrating by hand. | A new screen, feature or option. | Bug fixes, visual polish, performance, copy. |
| **Library or package** | A public function, type, option or default changes or goes away; a supported runtime is dropped. | A new public function, option or type, with old calls unchanged. | Fixes and internal changes with the same public behaviour. |
| **API or service** | A field, endpoint or error shape removed or renamed; stricter validation that rejects what used to work. | A new endpoint, optional field or capability. | Fixes, logging, performance, infrastructure that callers can't see. |
| **Workflow, tooling or infrastructure** | Callers must add, rename or remove configuration, secrets or permissions. | A new optional input or capability. | Fixes and internal changes, with callers changing nothing. |

## Cases that trip people up

- **A big refactor with no visible change** is a patch.
- **A one-line change to a default** that people rely on is major.
- **A dependency update** is a patch, unless it changes what users see or what they must install (then minor or major by the same test).
- **A redesign** is minor when everything still works where it was, and major when pages, addresses or content editors relied on go away.
- **Removing something nobody can use yet** (unreleased, or behind a flag that was never on) is a patch.
- **A fix that changes behaviour people built around** is major if they have to adapt, even though it's a fix.
- **Content entered in the product** (posts, pages, articles typed into a CMS) isn't released through this route and gets no version.

## Before v1.0.0

The first release is `v1.0.0`, so `0.x` versions aren't used for deployed projects. A library that wants a public `0.x` stage says so in its own instructions, and then a breaking change in `0.x` bumps the minor.

## When you can't tell

Pick the one that matches what a user would say on seeing it ("they took that away" is major, "oh, that's new" is minor, "I didn't notice" is patch), write the reason in the pull request, and ask the person. Never pick a bump to make a release look bigger or smaller.
