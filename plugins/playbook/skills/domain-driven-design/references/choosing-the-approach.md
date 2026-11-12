# Choosing the approach

Domain-driven design is a way of thinking that always applies, and a set of tactical patterns that pay only where the domain logic is complex enough to need them. Applying the patterns to simple problems because "we do DDD here" is **cargo-cult DDD**: more code, more indirection and slower change, for no business return.

For the choice itself, follow the thesis of Martin Fowler's *Patterns of Enterprise Application Architecture* (PoEAA): **the right way to organise domain logic depends on how complex that logic is.** A rich domain model has a higher starting cost, but its cost grows slowly as the rules multiply. Simpler patterns are cheaper to start, and become expensive once the rules interact. Pick the pattern for the complexity the part has, and expect to change it when that changes.

## What always applies

Whatever the pattern, keep these. They cost almost nothing:

- the domain's words in names, tests and messages, from the glossary;
- one bounded context per model, with explicit translation at its edges;
- dependencies pointing inwards, with providers behind an interface and translated at the edge;
- tests that check behaviour through a public interface.

## When the full DDD toolkit pays

Most of these should be true:

- It's the **core domain**, or close to it: where the business competes, and where getting the rules right is worth the effort.
- The rules are **many, interacting and changing**: invariants, states and policies, not just required fields.
- Experts use a **rich language** that the code should mirror, and words mean different things in different parts.
- **Consistency matters** in ways that need boundaries: concurrent users, rules spanning several things, processes over time.
- The system will **live and grow** long enough to repay the modelling.

## When a simpler, data-centric design is right

Several of these are true:

- The part mainly **creates, reads, updates and deletes** records, with validation that a field or a form can express.
- It's a **supporting or generic subdomain**: admin screens, settings, reference data, reporting, simple integrations.
- The behaviour is mostly **moving data** between a screen, a store and an API, with little or no decision-making.
- It's **short-lived**: a prototype, a spike or a one-off migration.
- An off-the-shelf product or library already does it.

Then a CRUD or data-centric design is the professional choice, not a shortcut.

## Fowler's domain-logic patterns

| Pattern | What it is | Fits | Starts to hurt when |
|---|---|---|---|
| **Transaction script** | One procedure per request or use case, doing the work step by step against the data. | Simple logic; few rules; mostly CRUD with some validation. | The same rules are repeated across scripts, or conditions start to tangle. |
| **Table module** | One object per table or record set, holding the logic for all its rows. | Logic organised around tables, with tools built around record sets. | Rules concern individual objects and their relationships more than tables. |
| **Domain model** | An object model of the domain, where behaviour and data live together. In DDD, built from entities, value objects and aggregates. | Complex, interacting, changing rules: the core domain. | Used where there's little logic: the mapping and indirection cost more than they return. |
| **Service layer** | A thin layer that defines the application's operations and coordinates them, with transactions and security. In DDD, the application services. | Any of the above, when several interfaces call the same operations. | It starts holding the rules itself: then it's transaction scripts in disguise, and the model is anaemic. |

## Fowler's data-source patterns

The domain-logic choice usually decides the data-source pattern:

| Pattern | What it is | Pairs with |
|---|---|---|
| **Table data gateway** | One object that handles all the SQL for a table. | Transaction script, table module. |
| **Row data gateway** | One object per row, with that row's persistence and no domain logic. | Transaction script. |
| **Active record** | One object per row that carries both the data and simple domain logic, and saves itself. | Simple domain models that mirror the tables closely. The usual CRUD choice in many frameworks. |
| **Data mapper** | A separate layer that moves data between objects and the database, so neither knows the other. | A rich domain model whose shape differs from the tables. DDD's repositories sit on top of one. |

Related patterns worth knowing by name: **unit of work** (tracks what changed in a business transaction and writes it out together), **identity map** (loads each record once per transaction), **lazy load**, **optimistic offline lock** (a version check so a stale edit fails), **data transfer object** and **remote facade** (coarse-grained calls across a process boundary). PoEAA's advice on distribution also stands: don't split a system across processes unless you must, because every remote call is slower and can fail.

## Signs of cargo-cult DDD

- Aggregates that are only data, with no invariant to protect.
- A repository, a factory, an application service and a domain event for a field update nobody reacts to.
- Several layers that only pass a record through and map it to an identical shape.
- Value objects for every primitive, when nothing validates or computes with them.
- A bounded context, a message channel, CQRS or event sourcing introduced with no difference in language, ownership, consistency or scale to justify it.
- More mapping code than behaviour.

When you see these in a design or a review, say so, with the simpler pattern that would do the same job.

## Mixing approaches

Different parts of one system can use different patterns, and should. The core domain uses a domain model; the admin screens beside it can use active record. Keep the boundary between them explicit, as you would between bounded contexts, so the simple part's data shapes don't leak into the core model.

## Moving up when a part grows

A simple part can become complex. Watch for: the same rule copied into several scripts, conditions about state spreading across handlers, bugs from rules that interact, and experts starting to use richer words for it.

When that happens, propose refactoring as its own piece of work, not a rewrite inside a feature:

1. Name the rules and the language that have emerged, and add them to the glossary.
2. Pull the repeated rules into value objects and entities that own them, behind the existing interface.
3. Introduce aggregates where there are true invariants, and a data mapper or repository when the object shape and the table shape diverge.
4. Keep the tests at the public interface, so they prove nothing changed for callers.

Moving down is fine too: if a richly modelled part turns out to have little logic, simplifying it is a valid refactor.

## Questions

- How much real domain logic is there, and how fast is it changing?
- Is this core, supporting or generic?
- Which PoEAA pattern fits today, and what would make it change?
- Is any of the planned machinery there only because "we do DDD"?
