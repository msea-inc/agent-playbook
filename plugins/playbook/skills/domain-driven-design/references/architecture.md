# Architecture

IDDD describes architectures that keep a domain model at the centre and free of technology. They're compatible choices that often help, not the definition of DDD. Use the one the repository already has. Choose hexagonal architecture where a rich model needs protecting from its outside dependencies. Treat CQRS, event sourcing and distribution as things a context's needs must earn. Project names don't make a design domain-driven: four projects called Domain, Application, Infrastructure and API can still hide every rule in a controller.

## Layers, and which way dependencies point

Whatever the folders are called, there are four roles:

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

Every adapter translates between the outside representation and the domain's types. Swapping an adapter, such as a real provider for a fake in tests, never touches the inside. A port earns its place when it protects a meaningful dependency, an ownership boundary or a real testing need. Having a production adapter and a test fake isn't proof enough on its own. A cross-provider integration with many formats and retries is technical complexity: give it a good adapter, and don't build a rich domain model for it unless the domain needs one. Test the inside through its driving ports with in-memory driven adapters, and test each driven adapter against the real thing it wraps.

## Application services

An **application service** carries out one use case. It's the client of the domain model.

A typical shape:

1. Check what the caller may do, and translate the input into domain types.
2. Load the aggregate through its repository.
3. Call a domain method on it, or a domain service.
4. Save the aggregate; in the same transaction, store the events it raised.
5. Return a simple result or nothing; publish the events after commit.

Rules:

- Keep it thin. If it holds an `if` about the business, move that rule into the domain.
- One transaction, one aggregate changed.
- Inputs are simple values or command objects; outputs are simple data, not domain objects leaked to the interface layer.

## Integrating bounded contexts

Choose the style per edge of the context map:

- **Messaging with domain events** is the default between contexts. It keeps them decoupled in time: the upstream context publishes, and downstream contexts subscribe and update their own models in their own transactions. Publish through a stored outbox or event store so nothing is lost or invented.
- **A remote call (REST, RPC)** against an open host service, when the downstream context needs an answer now. Wrap the call in an anti-corruption layer adapter, and design for it failing: time-outs, retries with idempotency, and a clear result when it's unavailable.
- **Shared databases between contexts** are a hidden shared kernel. Avoid them.

Whatever the transport, the downstream context translates into its own language at the edge. A foreign model never travels into the domain.

## Eventual consistency, sagas and process managers

When a business process spans aggregates or contexts, first check how strictly each rule must hold. If a rule must be true immediately, that's a reason to put it inside one boundary, not a step to make eventually consistent. Where the steps may settle over time, model the process as a sequence of local transactions joined by events:

- Agree with the experts how long each step may take to become true, and what a user sees meanwhile.
- When the steps need coordinating, use a **process manager** (also called a saga or long-running process): it reacts to events, sends the next command, tracks where the process is, and handles time-outs and compensating actions.
- Give the process its own state, often as an aggregate, so it survives restarts.

## CQRS and query models

**Command-query responsibility segregation (CQRS)** separates the model that changes state from the model that answers reads.

- Use it when the screens need shapes that would distort the aggregates, when reads and writes scale very differently, or when many contexts' data must be shown together.
- The command side is the aggregates. The query side is a read model, updated from domain events, shaped for the screen, and allowed to be denormalised.
- It isn't required. For simple reads, a use-case query that maps to a data shape, outside the repository, is often enough.

## Event sourcing

**Event sourcing** stores an aggregate as the sequence of its domain events and rebuilds its state by replaying them.

- Earn it: it fits when the history itself is valuable (audit, temporal questions, regulatory needs) or when the events are already central.
- It costs: versioning event schemas, snapshots for long streams, and a learning curve. Don't choose it for a supporting or generic subdomain by default.

## Architecture questions

- Does anything in the domain import a framework, a database or a provider?
- What are this context's ports, and which adapters fill each one?
- Is the integration on this edge messaging, a remote call through an ACL, or none? Why?
- Which steps are eventually consistent, and how long may each take?
- Do the reads need their own model, or is a simple query enough?
