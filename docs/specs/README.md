# Specifications

Specs define user-visible repository behavior in concrete terms.

## When a Spec Is Required

Create or update a spec when changing:

- advertised LSP capabilities,
- diagnostics behavior,
- rename or symbol behavior,
- or any other client-visible contract exposed by this package.

## Minimum Spec Contents

- description
- inputs
- outputs
- behavior
- constraints
- edge cases
- acceptance criteria
- evolution phase
- completeness level
- known gaps
- deferred complexity
- technical debt items

Start from [TEMPLATE.md](TEMPLATE.md).
