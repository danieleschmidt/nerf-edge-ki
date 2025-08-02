# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the nerf-edge-kit project.

## ADR Template

Use the following template for new ADRs:

```markdown
# ADR-XXXX: [Title]

**Status**: [Proposed | Accepted | Deprecated | Superseded]
**Date**: [YYYY-MM-DD]
**Authors**: [Name(s)]
**Reviewers**: [Name(s)]

## Context

[Describe the architectural context and forces at play]

## Decision

[State the architectural decision]

## Consequences

### Positive
- [List positive consequences]

### Negative
- [List negative consequences]

### Neutral
- [List neutral consequences]

## Implementation

[How will this decision be implemented]

## Related Decisions

[List related ADRs]
```

## Current ADRs

- [ADR-0001: Real-time NeRF Rendering Architecture](0001-realtime-nerf-architecture.md)
- [ADR-0002: Multi-platform Rendering Backend Strategy](0002-multiplatform-backends.md)
- [ADR-0003: Foveated Rendering Implementation](0003-foveated-rendering.md)

## Creating New ADRs

1. Copy the template above
2. Number sequentially (ADR-XXXX)
3. Fill in all sections
4. Get review from at least one architect
5. Update this index