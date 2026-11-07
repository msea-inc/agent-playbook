# Smells

A fixed baseline of code smells from Martin Fowler's *Refactoring*, chapter 3. Each is a judgement call, and a documented repository standard always overrides it. Each reads: what it is, then how to fix it.

| Smell | What it is | Fix |
|---|---|---|
| Mysterious name | A name that doesn't say what it does or holds | Rename it in the domain's words; if no honest name comes, the design is murky |
| Duplicated code | The same logic shape in more than one hunk or file | Extract it and call it from both |
| Feature envy | A method that uses another object's data more than its own | Move it onto the data it envies |
| Data clumps | The same few values always travelling together | Bundle them into one type |
| Primitive obsession | A string or number standing in for a domain concept | Give the concept its own value object |
| Repeated switches | The same switch on the same type in several places | One map both places share, or polymorphism |
| Shotgun surgery | One logical change needing edits in many files | Gather what changes together into one module |
| Divergent change | One file changed for several unrelated reasons | Split it so each part changes for one reason |
| Speculative generality | Abstraction or options for needs the task doesn't have | Delete it until a real need appears |
| Message chains | Long `a.B().C().D()` navigation a caller depends on | Hide the walk behind one method |
| Middle man | A class that mostly passes calls on | Call the real target directly |
| Refused bequest | A subclass that ignores most of what it inherits | Use composition instead |

In a domain-driven repository, primitive obsession and feature envy are often a sign that a rule belongs in a domain type; check the repository's layer rules before recommending a move.
