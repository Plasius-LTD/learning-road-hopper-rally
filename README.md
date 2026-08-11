# @plasius/learning-road-hopper-rally

Immutable curriculum, deterministic game contracts, original assets, and bounded JavaScript evaluation for the Junior Coder **Road Hopper Rally** reference module.

The package owns content and portable runtime behavior. React, HTTP, authentication, persistence, entitlement evaluation, and cloud infrastructure remain adapter responsibilities.

## Public entry points

- `@plasius/learning-road-hopper-rally`: trusted authoring manifest (including facilitator metadata), starter project, validators, deterministic engine, renderer/input/audio contracts, and evaluator factory.
- `@plasius/learning-road-hopper-rally/browser`: learner-bundle-safe contracts, runtime limits, starter project, assets, transport validators, and evaluator factory; it contains no facilitator or protected assessment content.
- `@plasius/learning-road-hopper-rally/browser-worker`: bounded worker request handler for preview adapters.
- `@plasius/learning-road-hopper-rally/server`: deterministic mission and final assessment. Never bundle this entry point into a learner client.

## Course shape

Road Hopper Rally 2.0 contains six 75-minute missions. Every mission follows Learn, Predict, Build, Run, Assess, Inspect, Fix, Explain, and Reward, for exactly 54 stages. The editable project always contains `board.js`, `hopper.js`, `traffic.js`, `river.js`, `rules.js`, and `game.js`.

## Runtime boundary

Learner code runs in a fresh QuickJS realm with no DOM, network, cookies, storage, dynamic imports, or Plasius account APIs. Source, memory, stack, input, entity, draw-command, audio-cue, callback, and session limits are exported in the immutable course manifest.

```ts
import {
  ROAD_HOPPER_RALLY_COURSE_V2,
  ROAD_HOPPER_RALLY_STARTER_PROJECT_V1,
  createRoadHopperProgramSession,
} from "@plasius/learning-road-hopper-rally";

const session = await createRoadHopperProgramSession(
  ROAD_HOPPER_RALLY_STARTER_PROJECT_V1,
);
const frame = await session.step({
  sequence: 1,
  action: "up",
  phase: "pressed",
  source: "keyboard",
  atTick: 1,
});
session.dispose();

console.log(ROAD_HOPPER_RALLY_COURSE_V2.missions.length, frame.semanticState);
```

Browser adapters must import their runtime and transport contracts from the
`/browser` entry point and obtain the learner course projection from their
authenticated server API. The package verifier scans both browser artifacts
and the worker artifacts for protected-content markers before publication.

## Development

Use Node.js 24 and npm.

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run build
npm run pack:check
```

Task: [Plasius-LTD/learning-road-hopper-rally#1](https://github.com/Plasius-LTD/learning-road-hopper-rally/issues/1).
