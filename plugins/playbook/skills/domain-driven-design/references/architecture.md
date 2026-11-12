# Architecture

IDDD describes architectures that keep a domain model at the centre and free of technology. They're compatible choices that often help, not the definition of DDD. Use the one the repository already has. Put a port and adapter wherever an outside dependency needs protecting, whatever the approach; use a full hexagonal structure where a rich model needs protecting from all of them. Treat CQRS, event sourcing and distribution as things a context's needs must earn. Project names don't make a design domain-driven: four projects called Domain, Application, Infrastructure and API can still hide every rule in a controller.

## Layers, and which way dependencies point

This section describes the layering for a **domain-model area**. A transaction-script or CRUD area doesn't need a separate domain layer or four layers: its use-case procedure holds the request's validations and calculations, with genuinely shared rules extracted where that's justified (`choosing-the-approach.md`). What applies to both is that each business rule has one owner and that outside dependencies don't leak in.

In a domain-model area, whatever the folders are called, there are four roles:

| Layer | Holds | Depends on |
|---|---|---|
| **Domain** | Entities, value objects, aggregates, domain events, domain services, repository interfaces. The rules. | Nothing outside the domain. No framework, database or provider types. |
| **Application** | Application services (use cases), ports to the outside, transaction control, security checks, event publishing. No business rules. | The domain. |
| **Infrastructure** | Adapters: persistence, messaging, provider clients, implementations of the ports and repositories. | The application and domain interfaces it implements. |
| **Interface** | Controllers, handlers, user interface, API endpoints. Translate the request, call an application service, map the result. | The application layer. |

The **dependency inversion principle** makes this work: the inner layers own the interfaces, and the outer layers implement them. If the domain needs to import a framework or a provider to compile, the dependency is pointing the wrong way.

## Hexagonal architecture (ports and adapters)

Picture the application and domain as the inside, with a **port** for each way the world talks to it, or it talks to the world:

- **Driving (primary) adapters** call in: a web controller, a message consumer, a scheduled job or a test.
- **Driven (secondary) adapters** are called out to: a database, a message broker, an email service, an outside provider's API.

Every adapter translates between the outside representation and the domain's types. Swapping an adapter, such as a real provider for a fake in tests, never touches the inside. A port earns its place when it protects a meaningful dependency, an ownership boundary or a real testing need. Having a production adapter and a test fake isn't proof enough on its own. A cross-provider integration with many formats and retries is technical complexity: give it a good adapter, and don't build a rich domain model for it unless the domain needs one. Test the inside through its driving ports, with in-memory driven adapters where the use-case tests need them, and test each driven adapter against the real thing it wraps, or a controlled instance of it such as a sandbox.

## Application services

An **application service** carries out one use case. In a domain-model area it's the client of the domain model, and this section applies. In a transaction-script area, the use-case procedure itself holds the business logic. Fowler's service layer doesn't forbid that either.

A typical shape:

1. Check what the caller may do, and translate the input into domain types.
2. Load the aggregate through its repository.
3. Call a domain method on it, or a domain service.
4. Save the aggregate; in the same transaction, store any events it raised.
5. Return a simple result or nothing; publish the events after commit.

Rules, in a domain-model area:

- Keep it thin. Domain objects own the business rules, and the service coordinates. If it holds an `if` about the business, that rule probably belongs to an aggregate or value object.
- By default, one transaction changes one aggregate. Exceptions need a stated reason (`tactical-design.md`).
- Inputs are simple values or command objects; outputs are simple data, not domain objects leaked to the interface layer.

## Integrating bounded contexts

Choose the integration style for each edge of the context map as an explicit decision. Base it on how tightly the contexts may be coupled, whether the caller needs an answer now, how failure should behave and what it costs to run. No style is the default. One option is always a poor choice: **sharing database tables between contexts**, which is a hidden shared kernel.

- **An in-process synchronous interface.** Two contexts in one deployable, such as a modular monolith, can call each other through a well-defined interface owned by the upstream context. It's often the simplest choice: there's no broker, outbox or background consumer. Translate at the edge as you would for any other style.
- **A remote request and response (REST, RPC)** against an open host service, when the contexts are deployed apart and the caller needs an answer now. Wrap the call in an anti-corruption layer adapter, and design for it failing: time-outs, retries that are safe to repeat, and a clear result when it's unavailable.
- **Asynchronous messaging**, when the contexts should be decoupled in time, a slow or failed downstream mustn't block the upstream, or several downstreams react to the same fact. Publish through a stored outbox or event store, so nothing is lost or invented. It brings a broker, consumers, monitoring and eventual consistency, and those must be worth it.

Keep three things apart:

- **Internal domain events** are part of one context's model. They may change whenever that model does.
- **Published integration events or messages** are a contract with other contexts: a published language, versioned and kept stable. Map internal events to them deliberately. Don't simply expose an internal event as a stable external contract.
- **Synchronous calls**, whether in process or remote, are a contract too: the upstream context's interface, not its internal model.

Whatever the transport, the downstream context translates into its own language at the edge. A foreign model never travels into the domain.

## Eventual consistency, sagas and process managers

When a business process spans aggregates or contexts, first check how strictly each rule must hold. If a rule must be true immediately, don't make it a step that settles later. Investigate how to enforce it: one boundary that owns it, a justified transaction across the records, a database constraint, or a concurrency mechanism such as a version check or a lock. Choose by evidence and cost. Where the steps may settle over time, model the process as a sequence of local transactions joined by events:

- Agree with the experts how long each step may take to become true, and what a user sees meanwhile.
- When the steps need coordinating, use a **process manager** (also called a saga or long-running process): it reacts to events, sends the next command, tracks where the process is, and handles time-outs and compensating actions.
- Give the process its own state, often as an aggregate, so it survives restarts.

## CQRS and query models

**Command-query responsibility segregation (CQRS)** separates the model that changes state from the model that answers reads.

- Use it when the screens need shapes that would distort the write model, when reads and writes scale very differently, or when many contexts' data must be shown together.
- CQRS doesn't inherently need events, separate databases, asynchronous projections, eventual consistency or an aggregate-based write side. The simplest form is two models over **one database**: the write side changes state through its rules, and the read side runs queries or views shaped for the screen, consistent at once.
- Projections updated from events into a separate store are one implementation. They add eventual consistency and operational cost, so they must earn their place.
- It adds complexity even in its simplest form, and it isn't required. For simple reads, a use-case query that maps to a data shape, outside the repository, is often enough. The build can look the same as the simplest CQRS; call it CQRS when the read side is a deliberate, separately maintained model for several screens, not one query.

## Event sourcing

**Event sourcing** stores an aggregate as the sequence of its domain events and rebuilds its state by replaying them.

- Earn it: it fits when the history itself is valuable (audit, temporal questions, regulatory needs) or when the events are already central.
- It costs: versioning event schemas, snapshots for long streams, and a learning curve. Don't choose it for a supporting or generic subdomain by default.

## Architecture questions

- Does anything in the domain import a framework, a database or a provider?
- What are this context's ports, and which adapters fill each one?
- Is the integration on this edge an in-process interface, a remote call through an ACL, messaging, or none? Why, given the coupling, response, failure and cost?
- Which steps are eventually consistent, and how long may each take?
- Do the reads need their own model, or is a simple query enough?
