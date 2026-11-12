# Strategic design

Strategic design decides where the model's boundaries are and how the pieces relate, before any class is written. In IDDD it comes first because most of the damage in a large system comes from one model trying to serve everyone.

## Domain and subdomains

The **domain** is the whole problem the organisation works on. It splits into **subdomains**, each a distinct part of the business:

| Kind | What it is | How much design it gets |
|---|---|---|
| **Core domain** | What makes this business different and worth choosing. | The best people and the richest model. This is where the tactical patterns pay for themselves. |
| **Supporting subdomain** | Needed, specific to the business, but not where it competes. | A sensible model, often simpler. Build it, but don't gold-plate it. |
| **Generic subdomain** | A problem many businesses share, such as identity, billing or notifications. | Buy, reuse or keep it plain. Don't model it as if it were the core. |

Subdomains are in the **problem space**: they exist whether or not there is software. Bounded contexts are in the **solution space**: they're how the software is cut. Ideally each bounded context aligns with one subdomain. When an older system mixes several, say so, and don't spread the mixing further.

## Bounded contexts

A **bounded context** is an explicit boundary inside which one model applies and every term has exactly one meaning. The same word can mean different things in different contexts, and that's healthy: a "customer" in sales and a "customer" in support may share an identity and little else.

- A context is a boundary of **language and model**, usually owned by one team, often deployed as one unit. It isn't a layer, a folder or a microservice by definition, though it may map onto one.
- Inside a context, the model is consistent. Across contexts, translation is explicit.
- Signs that a context is too big: the same word needs a qualifier to be understood ("billing account" versus "login account"), different experts disagree about what a term means, or changes for one purpose keep breaking another.
- Signs that contexts are too small: two contexts must always change together, or translation between them is all the code does.
- Name the context in the code: a module, namespace or project per context, with the context's name.

## The ubiquitous language

Each bounded context has its own **ubiquitous language**: the shared vocabulary of the experts and the developers, used the same way in conversation, tests, code and documentation.

- Take words from the experts, not from frameworks or databases. A method called `confirmBooking` beats `updateStatus(2)`.
- When the language changes, the code changes with it. A renamed concept is a refactor, not a cosmetic tweak.
- Write the language down where the repository keeps it, usually a glossary grouped by context. Use the glossary's words, or add the missing one.
- Scenarios and acceptance tests written in the language are the cheapest way to check the model with the experts.

## Context mapping

A **context map** shows the bounded contexts that touch a change and the relationship between each pair. The relationship is as much about teams and power as about code, so name it honestly.

In each pair, the **upstream** context's changes affect the **downstream** one, and not the other way round.

| Relationship | What it means | When to choose it |
|---|---|---|
| **Partnership** | Two teams succeed or fail together and plan their changes jointly. | Two contexts that genuinely co-evolve, with teams willing to coordinate. |
| **Shared kernel** | A small, explicitly shared part of the model, changed only by agreement. | Rarely, and kept tiny. It couples both sides. |
| **Customer-supplier** | Downstream's needs feed upstream's planning. | Upstream is willing to serve downstream, and they can negotiate. |
| **Conformist** | Downstream adopts upstream's model as it is. | Upstream won't adapt and the model is good enough. Cheap, but it lets their language in. |
| **Anti-corruption layer (ACL)** | Downstream translates upstream's model into its own at the boundary. | Upstream's model is poor, foreign or likely to change, and downstream's model matters. The default for outside providers and legacy systems that touch the core. |
| **Open host service** | Upstream offers a well-defined protocol or API for many consumers. | Many downstream contexts need the same access. |
| **Published language** | A documented exchange format, often used by an open host service, such as a versioned event or message schema. | Contexts or organisations need a stable contract to integrate on. |
| **Separate ways** | No integration at all. | The cost of integrating is higher than the value. |
| **Big ball of mud** | A part with no clear model. | Never a choice; mark it on the map, and protect new work from it with an ACL. |

How to use it:

1. Draw the map as it is today, including the awkward parts, before drawing the map you want.
2. For a change, list the contexts it touches and the relationship on each edge it crosses.
3. On every edge into the core domain, prefer an ACL or a published language over conforming.
4. Keep the map with the architecture documentation so the next change starts from it.

## Strategic questions

- What is the core domain here, and does this change touch it?
- Which bounded context owns this concept, and what does the word mean in it?
- Which contexts does this change cross, and what is each relationship?
- Whose model wins on each edge, and where does the translation happen?
