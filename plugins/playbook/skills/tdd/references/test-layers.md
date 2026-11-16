# Test layers

Synthetic: the worked example is made up. It describes no real project.

Each repository's own instructions say which kinds of test it has and where they go. Put each test at the layer whose interface owns the behaviour. The worked example is a small ordering app with a domain project, use cases, a payment provider adapter, an HTTP API and a browser frontend.

| Layer | What it tests | Example |
|---|---|---|
| Domain | A value object or entity's own rules: what it accepts and refuses | `OrderNote` refuses a second line |
| Use case | One use case against fake ports, never a real provider | `PlaceOrder` with a fake `IPaymentGateway` |
| Adapter | Mapping provider responses to domain types, and provider errors to readable reasons | `CardPaymentGateway` against a stubbed HTTP handler, including a real-shaped decline |
| Endpoint | A request through the API to its result or error response | An in-memory test server posting an order |
| Frontend logic | Small, pure modules | A basket-total function with its unit tests |
| Screen | A user-visible state in a real browser | A browser scenario named after the behaviour, such as `checkout-shows-declined-card` |

## Choosing the layer

- A rule that holds wherever the value is used: domain.
- A sequence of steps, or a decision between ports: use case.
- Anything provider-shaped: adapter, and only there.
- What the user sees: a browser scenario, only when that state isn't already covered by one.

Higher is usually better when it reaches the behaviour without extra setup: one use-case test can cover what three domain tests would, and it survives a refactor of the domain types. Go lower when the rule is the domain's own and many callers depend on it.

## Fakes

Use the repository's existing fakes before writing a new one. A port with a real adapter and a test fake has two adapters, which is what makes it a real seam.
