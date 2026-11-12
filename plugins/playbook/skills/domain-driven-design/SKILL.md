---
name: domain-driven-design
description: The shared design policy - domain-led design everywhere, with rich domain-driven design modelling only where the domain's complexity earns it. Uses Vaughn Vernon's Implementing Domain-Driven Design for strategic and tactical DDD, and Martin Fowler's Patterns of Enterprise Application Architecture for choosing simpler patterns such as transaction scripts and CRUD. Use whenever you design, plan, write, refactor or review code, and whenever an architect or engineer role shapes a solution.
version: 1.0.0
library-compat: 1
---

# Domain-driven design

This is the one design policy that the architect, engineer, coding and review skills all follow. The aim isn't for all code to look like DDD. The aim is to understand the domain, choose the least costly design that protects its important rules, and make that choice the same way in architecture, engineering, coding and review.

Two references, used at different levels. They complement each other:

- **Vaughn Vernon, *Implementing Domain-Driven Design* (IDDD):** the primary reference for strategic and tactical DDD. That means bounded contexts, context maps and the ubiquitous language, and then the modelling patterns.
- **Martin Fowler, *Patterns of Enterprise Application Architecture* (PoEAA):** the reference for choosing how application logic and persistence are organised. That includes the simpler patterns, such as a transaction script, which is a deliberate architectural choice, not failed DDD.

This skill is written in our own words; read the books for the full argument. It's guidance only and grants nothing. Follow `working-style` (in this plugin) whenever you report or ask.

References:

- `references/strategic-design.md`: subdomains, bounded contexts, the ubiquitous language and context mapping.
- `references/tactical-design.md`: entities, value objects, aggregates and Vernon's aggregate guidance, domain events, repositories, domain services, factories and modules.
- `references/architecture.md`: layering and hexagonal architecture as compatible choices, application services, integrating contexts, consistency across boundaries, CQRS and event sourcing.
- `references/choosing-the-approach.md`: Fowler's domain-logic and data-source patterns, how to choose between them, signs of over-engineering and under-modelling, and revisiting a choice.

Changes to this skill are checked against `regression-cases.md`, beside it.

## The policy

Apply domain-led design in proportion to the problem.

1. **Begin with the domain, not a template.** Start from the domain's language, outcomes, rules and constraints, not from a fixed set of layers or patterns.
2. **Use rich modelling only where it's justified.** Use it where interacting business rules, invariants or lifecycle complexity justify the cost. Prefer simpler CRUD-oriented designs and transaction scripts when they meet the requirements more clearly and cheaply.
3. **Don't build for a template.** Never add aggregates, repositories, domain events, CQRS, event sourcing or microservices just to make the design look like DDD.
4. **Record each consequential choice.** Write down the evidence, the trade-offs and what would make you reconsider. Over-engineering and leaving business rules unprotected are both design defects.
5. **Preserve what works.** Keep existing supported behaviour and the repository's constraints. Propose broader restructuring as its own piece of work, unless the approved change needs it.

## Always: domain understanding

These cost almost nothing and apply to every change, CRUD included:

- Understand the user's goal and the business rules before choosing a design.
- Use consistent, meaningful language: the domain's words, from the repository's glossary, in names, tests and messages.
- Know who owns each decision and each piece of state. Each business invariant has exactly one clear owner. It is never duplicated, slightly differently, in a script and a domain object.
- Make important constraints explicit.
- Keep unrelated concepts from becoming entangled. When the same word means different things in different areas, those are different bounded contexts, and translation between them is explicit.
- Choose a design proportional to the problem.

## Selectively: tactical DDD

Entities, value objects, aggregates, repositories and domain events are there to solve an identified problem, not because a template expects them. Some things to keep in mind:

- Four projects called Domain, Application, Infrastructure and API don't, by themselves, make good DDD.
- A bounded context isn't automatically a microservice, a project or a folder.
- A small CRUD feature doesn't automatically need an aggregate, a repository interface and an event pipeline.
- A complex state transition doesn't become simple because its endpoint is called CRUD.
- Complexity in technical integration, such as many providers, retries or formats, isn't domain complexity. It calls for good adapters, not necessarily a rich domain model.
- Hexagonal architecture (ports and adapters) is a compatible choice that often helps. It isn't the definition of DDD.

## Choosing a starting point

| Situation | Start with |
|---|---|
| Simple record maintenance with straightforward validation | CRUD with a thin application or use-case layer; consider a transaction script |
| Independent operations with limited business logic | Transaction scripts, extracting only genuinely shared behaviour |
| Interacting rules, meaningful state transitions and invariants | A rich domain model, using the tactical patterns where justified |
| The same terms mean different things in different areas | Explicit bounded contexts, with translation between their models |
| Existing code already expresses the rules well | Keep it, unless the change brings a concrete improvement |

CRUD describes operations, not a complete architecture. So don't ask "DDD or CRUD?". Ask which domain-logic pattern and which persistence pattern fit (`references/choosing-the-approach.md`). One system can use different approaches in different areas.

## By role

Each role needs this policy at its own step. Leaving it to the coding step is too late, because by then the plan may already have committed to unnecessary aggregates, layers and abstractions.

### Architect: choose the modelling investment

Identify:

- the domain language and the context boundaries that matter;
- the significant business rules and invariants;
- whether the area is core, supporting or generic;
- whether the complexity is in the business domain or only in technical integration;
- the simplest credible approach, and its trade-offs;
- what evidence would justify richer modelling later.

Record a short decision for each area, with its reason and what would make you reconsider. For example:

> Use a transaction script for this settings feature: validation is local and there are no interacting lifecycle rules. Reconsider a domain model if several operations must preserve shared invariants.

> Use an aggregate for the booking lifecycle, because duplicate starts and invalid transitions must be prevented across several operations.

Where the consistency of a rule matters, say which invariant it is, when it must hold and what the user sees in the meantime. Don't assume eventual consistency or strict consistency without asking (`references/architecture.md`). The architect doesn't invent findings about the code. It works from the engineer's evidence-backed packet of constraints.

### Senior engineer: check the choice against the code

- Find where each rule is owned today, and where the transactions begin and end.
- Check the real lifecycle and concurrency requirements, not assumed ones.
- Challenge abstractions that add no useful responsibility.
- Find where a simpler implementation would duplicate an important rule.
- Propose an incremental change, not a speculative rewrite.
- Map each invariant and failure scenario to a test.

You should be able to say either "this needs richer modelling" or "this doesn't earn the proposed abstraction", with evidence for it.

### Coding: implement the decision

- Follow the approach the plan recorded. If the code contradicts it, for example a "simple" area turns out to have interacting rules, raise it. Don't silently change the approach.
- Put each rule where the recorded approach puts it: on the aggregate or value object that owns it in a domain model, or in one clearly named script or function in a transaction-script area. Never put it in a controller or adapter.
- Keep the domain's words, and translate outside providers' models at the edge.
- Test behaviour through the interface the approach gives you. In a domain model, test aggregates and value objects directly, and use cases with in-memory adapters. In a script, test the script.

### Review: catch both kinds of defect

Alongside the repository's own standards, look for:

- **Over-engineering:**
  - wrappers that add nothing;
  - a repository for everything;
  - events that nothing consumes;
  - layers that only pass data through;
  - aggregates with no invariant to protect;
  - distribution nobody needs.
- **Under-modelling:**
  - critical rules scattered across controllers and handlers;
  - state changed arbitrarily, without the rules that govern it;
  - the same invariant implemented more than once;
  - another context's or a provider's model leaking in;
  - names that don't match the glossary.
- **Departures from the recorded approach**, without the contradiction having been raised.

Report each finding with what's wrong, where the rule or responsibility should sit, and the simpler or richer alternative. Don't write the fix as a rewrite.

## Precedence

The repository's own instructions, layering, glossary and decision records win wherever they differ from this skill. A shared skill update never overrides them. Project-specific rules stay in the project. This skill is the generic method that works within them. If a project's rule seems to work against proportion, say so with evidence and propose the change separately, for the person to decide.

## Questions before you write code

- What are the goal, the rules and the words here, and which context are they in?
- Is this core, supporting or generic? Is the complexity in the domain or only in the integration?
- Which invariants matter, who owns each, and when must each hold?
- What's the least costly design that protects them? Which PoEAA pattern is that?
- What would make us change that choice later?
