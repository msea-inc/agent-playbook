# Domain-driven design regression cases

Synthetic: these cases are sanitised or made up. They describe no real project, task or person.

Every change to the domain-driven-design skill is checked against them. They're judged on whether the design is proportionate, protects the rules that matter and stays within the repository's own rules, never on exact wording. Add a case when a correction reveals a misunderstanding these don't cover.

## RC-DDD1: A simple preferences editor

- **Situation:** A change adds a form that stores three contact preferences with field-level validation. The plan wraps it in an aggregate, a repository interface, a domain event nobody subscribes to and a mapping layer.
- **Uncertainty to uncover:** Whether there's any domain logic that needs the machinery.
- **Expected behaviour:** Records a CRUD or transaction-script approach, using the pattern the repository already has for such parts. It keeps the domain's words and says what would make richer modelling worth it.
- **Unacceptable behaviour:** Builds or approves the aggregate and event architecture because domain-driven design is the default.

## RC-DDD2: A lifecycle with invalid transitions

- **Situation:** A record moves through several states. Some transitions must never happen, and two operations can race to start it. Today each endpoint sets the status field directly.
- **Uncertainty to uncover:** Who owns the transition rules, and what happens under concurrency.
- **Expected behaviour:** Gives the lifecycle one owner, such as an aggregate with intention-revealing methods and an optimistic version check. It names the tests for each invalid transition and for the race.
- **Unacceptable behaviour:** Keeps the status as a field any endpoint can set, because the endpoints are "just CRUD".

## RC-DDD3: A cross-provider adapter

- **Situation:** A change integrates three outside providers with different formats, retries and error codes. The business rule on top is simple.
- **Uncertainty to uncover:** Whether the complexity is in the domain or only in the integration.
- **Expected behaviour:** Calls it technical complexity. It designs good adapters that translate into the context's own types, and keeps the domain side as simple as its rules are.
- **Unacceptable behaviour:** Builds a rich domain model around the providers' concepts, or lets their formats leak into the domain.

## RC-DDD4: The same term with different meanings

- **Situation:** A change uses one word for two different things owned by two areas.
- **Uncertainty to uncover:** Whether these are separate contexts.
- **Expected behaviour:** Names the context for each meaning, keeps one meaning per context, and uses or adds the glossary's word. It translates where the two meet.
- **Unacceptable behaviour:** Builds one shared class to serve both meanings.

## RC-DDD5: A CRUD feature whose rules have grown

- **Situation:** Several transaction scripts now repeat the same eligibility rule with small differences, and bugs come from them disagreeing.
- **Uncertainty to uncover:** Whether the part has outgrown its simple pattern.
- **Expected behaviour:** Names the repeated rule and the emerging language. It proposes incremental enrichment as its own task, for the person to decide: one owner for the rule, behind the existing interface, with the tests kept at that interface.
- **Unacceptable behaviour:** Adds one more copy of the rule, or rewrites the whole area inside an unrelated feature.

## RC-DDD6: An existing well-tested implementation

- **Situation:** A part is written as clear, well-tested transaction scripts that express its rules well. A change needs a small addition.
- **Uncertainty to uncover:** Whether restructuring brings a concrete improvement.
- **Expected behaviour:** Makes the addition in the existing style, and suggests restructuring only with a concrete benefit, as separate work.
- **Unacceptable behaviour:** Rewrites it into aggregates and repositories so it matches the skill's terminology.

## RC-DDD7: A genuine cross-record invariant

- **Situation:** A rule says a total across several records must never exceed a limit, and the plan splits the records into separate aggregates.
- **Uncertainty to uncover:** How strictly and how soon the rule must hold, and what happens if it's briefly broken.
- **Expected behaviour:** Investigates the consistency requirement with the person or the evidence first. If it must hold at once, the boundary moves so one owner enforces it. If it may settle, it uses events with a stated delay and what the user sees meanwhile.
- **Unacceptable behaviour:** Prescribes eventual consistency automatically, or one large transaction automatically, without checking the requirement.

## RC-DDD8: A business rule in the application service

- **Situation:** In a domain-model area, a new rule says a discount can't exceed a limit. The quickest place to add it is the application service.
- **Uncertainty to uncover:** Which domain object owns the rule.
- **Expected behaviour:** Puts the rule on the value object or aggregate that owns it, so every use case gets it, and keeps the service coordinating.
- **Unacceptable behaviour:** Adds the check to the application service or controller.

## RC-DDD9: The repository's rules differ

- **Situation:** The repository's documented layering puts repository interfaces in the application layer. This skill would put them in the domain.
- **Uncertainty to uncover:** Whether the documented rule or the skill wins.
- **Expected behaviour:** Follows the repository's rule, and keeps the rest of the design proportionate.
- **Unacceptable behaviour:** Moves the interfaces to match the skill, or reports the documented rule as a defect.

## RC-DDD10: Coding contradicts the recorded approach

- **Situation:** The plan recorded a transaction script for an area. During coding it turns out two operations must share an invariant.
- **Uncertainty to uncover:** Whether to change the approach silently.
- **Expected behaviour:** Raises the contradiction with the evidence and a proposed adjustment, and follows the person's answer.
- **Unacceptable behaviour:** Quietly introduces a domain model, or duplicates the invariant in both scripts.
