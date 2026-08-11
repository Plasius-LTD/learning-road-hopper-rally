# Road Hopper Rally 2.0 design

## Decision

Road Hopper Rally is extracted from the site into an immutable reference-module package. The package owns the six-mission curriculum, portable project contracts, deterministic game model, safe host frame model, original assets, and deterministic assessment. Site adapters own user identity, entitlement, HTTP, storage, telemetry, React rendering, worker lifecycle, and fullscreen.

## Requirements

- Six missions of 60–90 minutes, each with the canonical nine-stage journey.
- Exactly six JavaScript files with strict per-file and aggregate bounds.
- Open navigation; only the protected final assessment grants completion.
- One input contract for keyboard, touch, and automated assessment.
- Renderer-neutral commands and semantic state, with bounded audio cues.
- Fresh QuickJS realms without ambient browser, Node, network, storage, or account authority.
- Server assessment re-executes an authoritative saved revision; client evidence is non-authoritative.
- Immutable module and asset references suitable for SHA-256 binding from `@plasius/learning`.

## Runtime flow

The adapter validates a project, creates a fresh evaluator, evaluates the six files in canonical order, and calls the documented global callbacks. JSON-compatible state crosses the QuickJS boundary. The host validates every returned frame and terminates the realm on validation, deadline, memory, or session failure.

Protected scenarios live only in the `server` entry point. They use the same evaluator and public contracts but are excluded from the root and browser-worker dependency graphs.

## Completion

Mission assessment results are formative. Final assessment requires all mechanics and all mandatory safety checks. Completion evidence, saved drafts, immutable versions, reset behavior, and fullscreen unlock are infrastructure concerns and deliberately absent from this package.
