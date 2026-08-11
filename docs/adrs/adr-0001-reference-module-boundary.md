# ADR-0001: Extract Road Hopper Rally as a reference module

## Status

Accepted

## Context

The original site prototype coupled one short mission, a browser worker, UI drawing, and client-submitted assessment evidence. A complete reusable module needs immutable content and deterministic behavior without importing site infrastructure.

## Decision

Publish curriculum, project/runtime contracts, original assets, QuickJS evaluation, and assessment as `@plasius/learning-road-hopper-rally`. Keep React, HTTP, authentication, persistence, feature evaluation, and cloud services out of the package. `@plasius/learning` references the exact package version and digest instead of importing it, preventing a circular dependency.

## Consequences

- Browser and server adapters share one deterministic implementation.
- Protected tests remain in a server-only export.
- Package versions and learning catalog versions can be released independently and bound immutably.
- Adapters must enforce worker hard timeouts in addition to the evaluator's QuickJS interrupt limits.
