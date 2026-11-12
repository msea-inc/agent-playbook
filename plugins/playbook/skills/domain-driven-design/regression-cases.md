# Domain-driven design regression cases

Synthetic: these cases are sanitised or made up. They describe no real project, task or person.

Every change to the domain-driven-design skill is checked against them. They're judged on whether the design follows domain-driven design within the repository's own rules, never on exact wording. Add a case when a correction reveals a misunderstanding these don't cover.

## RC-DDD1: One transaction across aggregates

- **Situation:** A use case confirms an order and must also reserve stock, and both are aggregates.
- **Uncertainty to uncover:** Whether stock must be reserved in the same instant, or shortly after.
- **Expected behaviour:** Changes the order in one transaction, raises an event, and reserves stock in its own transaction from that event, after checking how soon the business needs it and what happens if it fails.
- **Unacceptable behaviour:** Loads and saves both aggregates in one application-service transaction because it's simpler.

## RC-DDD2: An aggregate grown to keep data together

- **Situation:** A design puts a project, all its tasks and their comments into one aggregate, because the screen shows them together.
- **Uncertainty to uncover:** Which invariants really need them consistent at once.
- **Expected behaviour:** Names the true invariants, keeps aggregates small, references others by identity, and serves the screen from a query.
- **Unacceptable behaviour:** Keeps the large aggregate, or justifies it by the screen's layout.

## RC-DDD3: A business rule in the application service

- **Situation:** A new rule says a discount can't exceed a limit, and the quickest place to add it is the application service.
- **Uncertainty to uncover:** Which domain object owns the rule.
- **Expected behaviour:** Puts the rule on the value object or aggregate that owns it, so every use case gets it, and keeps the service coordinating.
- **Unacceptable behaviour:** Adds the check to the application service or controller.

## RC-DDD4: A provider's model leaking in

- **Situation:** An outside provider's response object would be easy to pass straight into the domain.
- **Uncertainty to uncover:** Whether the provider's words and shapes belong in this context.
- **Expected behaviour:** Translates at an adapter acting as an anti-corruption layer, into the context's own types and words.
- **Unacceptable behaviour:** Uses the provider's types or field names inside the domain.

## RC-DDD5: Rich modelling for a generic part

- **Situation:** A task adds a plain settings screen in a generic part of the system, and the plan introduces aggregates, events and a new context.
- **Uncertainty to uncover:** Whether this part is core, supporting or generic.
- **Expected behaviour:** Calls it generic or supporting and recommends the simplest design that fits the repository's structure, saving the richer patterns for the core.
- **Unacceptable behaviour:** Applies every tactical pattern because the skill is the default.

## RC-DDD6: The repository's rules differ

- **Situation:** The repository's documented layering puts repository interfaces in the application layer, where this skill would put them in the domain.
- **Uncertainty to uncover:** Whether the documented rule or the skill wins.
- **Expected behaviour:** Follows the repository's rule, and keeps the rest of the design in line with domain-driven design.
- **Unacceptable behaviour:** Moves the interfaces to match the skill, or reports the documented rule as a defect.

## RC-DDD7: A word with two meanings

- **Situation:** A change uses one word for two different things owned by two contexts.
- **Uncertainty to uncover:** Which context each meaning belongs to.
- **Expected behaviour:** Names the context for each, keeps one meaning per context, and uses or adds the glossary's word.
- **Unacceptable behaviour:** Builds one shared class to serve both meanings.

## RC-DDD8: Cargo-cult machinery on a simple form

- **Situation:** A change adds a contact-preferences form that stores three fields, and the plan wraps it in an aggregate, a repository, a domain event nobody subscribes to and a mapping layer.
- **Uncertainty to uncover:** Whether there's any domain logic that needs the machinery.
- **Expected behaviour:** Says it's a data-centric part, recommends the simpler pattern the repository already uses for such parts (such as active record or a transaction script), names what it would take to need more, and keeps the domain's words.
- **Unacceptable behaviour:** Builds the full tactical structure because domain-driven design is the default.

## RC-DDD9: A simple part that has grown

- **Situation:** Several transaction scripts now repeat the same eligibility rule with small differences, and bugs come from them disagreeing.
- **Uncertainty to uncover:** Whether the part has outgrown its simple pattern.
- **Expected behaviour:** Names the repeated rule and the emerging language, and proposes moving it into a domain object behind the existing interface as its own refactoring task, for the person to decide.
- **Unacceptable behaviour:** Adds another copy of the rule to one more script, or rewrites the whole part inside an unrelated feature.
