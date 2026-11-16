# Good and bad tests

Synthetic: these examples are made up. They describe no real project, task or person.

Short examples in C# and JavaScript. The point is the shape, not the names.

## Through the interface, not past it

```csharp
// Bad: reaches past the interface to check how it stored it.
[Fact]
public async Task SaveWritesARow()
{
    await notes.SaveAsync(owner, NoteText.Parse("Prefers tea"));
    var rows = connection.Query("SELECT * FROM notes");
    Assert.Single(rows);
}

// Good: checks what a caller can observe.
[Fact]
public async Task ASavedNoteCanBeRecalled()
{
    await notes.SaveAsync(owner, NoteText.Parse("Prefers tea"));
    var recalled = await notes.RecallAsync(owner);
    Assert.Contains(recalled, n => n.Text.Value == "Prefers tea");
}
```

## Independent expected values

```javascript
// Bad: recomputes the answer the way the code does.
test('total of line items', () => {
  const items = [{ price: 10 }, { price: 5 }];
  expect(total(items)).toBe(items.reduce((sum, i) => sum + i.price, 0));
});

// Good: a known literal.
test('total of line items', () => {
  expect(total([{ price: 10 }, { price: 5 }])).toBe(15);
});
```

## One cycle, start to finish

```javascript
// Red: one behaviour from the test list, watched failing ("total is not defined").
test('an empty basket costs nothing', () => {
  expect(total([])).toBe(0);
});

// Green: the simplest thing that passes.
const total = () => 0;

// Red again: the next item forces real logic out of the fake.
test('total of line items', () => {
  expect(total([{ price: 10 }, { price: 5 }])).toBe(15);
});

// Green: the general rule replaces the fake.
const total = (items) => items.reduce((sum, i) => sum + i.price, 0);

// Refactor, still green: a domain name for the rule, and the two tests
// share a small builder instead of repeating literals.
```

## Names say what, not how

| Instead of | Name it |
|---|---|
| `CallsTrackerCreate` | `ANewOrderStartsAsDraft` |
| `ParseThrows` | `NoteTitlesAreOneShortLine` |
| `test('calls fetch twice')` | `test('a failed sync retries once')` |

## Red flags

- The test mocks a class in the same repository.
- It asserts how many times something was called.
- Its name describes a method, not a behaviour.
- It breaks when you rename a private method.
- It passed the first time it ran.
