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

Protected scenario implementations live only in the `server` entry point.
Trusted authoring tools may use the root manifest, which includes facilitator
metadata. Learner clients use the `/browser` and `/browser-worker` entry points;
their built artifacts exclude facilitator metadata, scenario implementations,
protected goal text, and answer-key identifiers.

## Completion

Mission assessment results are formative. Final assessment requires all mechanics and all mandatory safety checks. Completion evidence, saved drafts, immutable versions, reset behavior, and fullscreen unlock are infrastructure concerns and deliberately absent from this package.

## Evidence-led course revision

Road Hopper Rally 2.1 is an additive immutable course revision. The 2.0 export
remains unchanged for rollback and existing consumers. Every 2.1 stage owns a
learner-safe, mission-specific activity instead of a generic instruction:

- Learn, Predict, and Inspect contain an authored choice check with explanatory
  feedback for every option.
- Build names the callback, task, and observable success criteria and requires a
  material edit to the mission file.
- Run identifies what to exercise and requires a successful fresh preview of
  the edited project.
- Assess identifies the server goal and is complete only after a deterministic
  assessment actually runs; error and timeout outcomes fail closed.
- Fix requires the learner to interpret evidence, change the responsible rule,
  rerun, and obtain a passing mission assessment. A learner who passed at the
  first check has already supplied the required working-code evidence.
- Explain requires a bounded reflection, but adapters persist only the stage
  completion marker, never the child's response text.
- Reward requires evidence for the preceding eight stages in that mission.

Open navigation is retained: learners may inspect or work ahead, but an adapter
must not award evidence merely because a stage was opened or a generic button
was pressed. A mission assessment can record only that mission's Assess/Fix
evidence; it can never bulk-complete the other stages.

The starter project is an intentional incomplete diagnostic baseline. Protected
tests assert that it fails every mission goal, while the reference solution must
pass nominal, edge, immutability, wrapping, collision, state-transition,
rendering, and accessibility-bearing semantic scenarios.
