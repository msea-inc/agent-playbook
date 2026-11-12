---
name: domain-driven-design
description: Domain-driven design as the default way to design, build and review code, following the strategic and tactical practice in Vaughn Vernon's Implementing Domain-Driven Design - bounded contexts, context maps, aggregate rules, domain events, repositories, application services and hexagonal architecture. Use whenever you design, plan, write, refactor or review code, and whenever an architect or engineer role shapes a solution.
version: 1.0.0
library-compat: 1
---

# Domain-driven design

Every piece of code you design, write or review starts from the domain: the problem the business is solving, in the words its experts use. Domain-driven design (DDD) is the default, not an option to reach for on big projects. This skill follows the practice Vaughn Vernon set out in *Implementing Domain-Driven Design* (IDDD): strategic design first, then a small set of tactical patterns, held together by a hexagonal architecture. It's written in our own words; read the book for the full argument.

This skill is guidance only and grants nothing. The repository's own instructions, layer rules, glossary and decision records win wherever they differ: they are that project's settled model, and this skill is how to work within it and improve it. Follow `working-style` (in this plugin) whenever you report or ask.

References:

- `references/strategic-design.md`: subdomains, bounded contexts, the ubiquitous language and context mapping.
- `references/tactical-design.md`: entities, value objects, aggregates and Vernon's four rules, domain events, repositories, domain services, factories and modules.
- `references/architecture.md`: hexagonal architecture, application services, integrating contexts with events, eventual consistency and CQRS.

Changes to this skill are checked against `regression-cases.md`, beside it.

## The stance

1. **Language before code.** Use the domain's words in names, tests, messages and docs, exactly as the repository's glossary has them. If a word is missing or fuzzy, settle it before you name a class after it.
2. **Find the context before the class.** Every model lives inside one bounded context, and a word means one thing inside it. Say which context a change belongs to before you design anything. If a change spans contexts, say how they're mapped and which one owns each piece of state.
3. **Spend the effort where the business competes.** Rich modelling is for the core domain. Supporting and generic subdomains get the simplest design that works, or something bought or reused. Saying "this part is CRUD, and that's fine" is a DDD decision, not an escape from it.
4. **Small aggregates, protecting true invariants.** An aggregate is a consistency boundary, not a way to group related data. Change one aggregate per transaction; reach others by identity, and bring them into line with domain events.
5. **Rules live in the domain.** Behaviour and invariants sit in entities, value objects and domain services, named in the language. Application services coordinate and hold no business rules. Adapters translate and hold none either.
6. **Dependencies point inwards.** The domain depends on nothing outside it. Persistence, messaging, user interfaces and outside providers are adapters behind ports the inner layers own.
7. **Make what happened explicit.** When something the experts care about occurs, model it as a domain event named in the past tense, and let other aggregates and contexts react to it.

## By role

### Architect

- Start from the subdomains and the outcome. Name the core domain the change touches, and which parts are supporting or generic.
- Draw or describe the context map that applies: the bounded contexts involved, the relationship between each pair (see `references/strategic-design.md`), and which side is upstream.
- Place each consequential decision in a context, and say where the consistency boundaries are: what must be true immediately, inside one aggregate, and what may become true shortly after, through events.
- Prefer the smallest design that respects those boundaries. A new bounded context, a new message channel or event sourcing must be earned by a real difference in language, ownership or consistency, not by elegance.
- Turn "it must stay consistent" into a scenario that says which invariant, at what moment, and what the user sees while it settles.

### Engineer or builder

- Before planning, find the contexts and layers the repository already has, and its glossary. Label what you observed and what you inferred.
- Put new behaviour where its rule belongs: on the aggregate root or value object that owns the invariant, or in a domain service when it spans aggregates and belongs to none.
- Keep application services thin: load aggregates through repositories, call domain behaviour, save, and publish the events. One use case, one transaction, one aggregate changed.
- Model values as immutable value objects that validate themselves, instead of passing strings and numbers about. Give entities identity and behaviour, not setters.
- Keep providers behind ports with adapters; translate their models at the edge with an anti-corruption layer so their words don't leak into the domain.
- Test the domain without infrastructure: aggregates and value objects through their behaviour, application services with in-memory adapters, adapters against the real thing where it matters.

### Reviewer

Alongside the repository's own standards, look for:

- a rule in a controller, handler, application service or adapter that belongs in the domain;
- an anaemic model: entities that are only getters and setters, with the logic elsewhere;
- primitive obsession where a value object would carry the rule;
- one transaction that changes several aggregates, or an aggregate holding direct references to others instead of their identities;
- a large aggregate grown to keep data together rather than to protect an invariant;
- a provider's or another context's terms appearing inside the domain;
- an inner layer depending on an outer one;
- names that don't match the glossary.

Report each as a finding with the rule it breaks and where the behaviour belongs, not as a rewrite.

## When the repository isn't built this way

Don't impose a new architecture on a change. Work within the existing structure, model the new behaviour well inside it, and keep the domain words consistent. If the structure keeps getting in the way, say so with evidence and propose the change as its own piece of work, for the person to decide.

## Questions to ask before you write code

- Which bounded context is this in, and what does each key word mean here?
- Is this the core domain, or a supporting or generic part?
- Which invariant does this protect, and which aggregate owns it?
- What happened, in the experts' words, and who else needs to know?
- What crosses a port, and does anything outside leak in through it?
