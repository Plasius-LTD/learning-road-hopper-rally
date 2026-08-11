import type { MissionStageKindV1 } from "@plasius/learning";
import { ROAD_HOPPER_RALLY_STARTER_PROJECT_V1 } from "./starter.js";
import type {
  RoadHopperCourseManifestV2,
  RoadHopperFileIdV1,
  RoadHopperLearnerCourseProjectionV2,
  RoadHopperMissionV2,
  RoadHopperRuntimeLimitsV1,
} from "./types.js";

export const ROAD_HOPPER_MISSION_STAGE_ORDER_V2 = Object.freeze([
  "learn",
  "predict",
  "build",
  "run",
  "assess",
  "inspect",
  "fix",
  "explain",
  "reward",
] as const satisfies readonly MissionStageKindV1[]);

export const ROAD_HOPPER_RUNTIME_LIMITS_V1: RoadHopperRuntimeLimitsV1 =
  Object.freeze({
    tickRateHz: 30,
    maximumFileBytes: 16_384,
    maximumProjectBytes: 98_304,
    memoryLimitBytes: 33_554_432,
    stackLimitBytes: 524_288,
    maximumQueuedInputs: 64,
    maximumEntities: 256,
    maximumDrawCommands: 512,
    maximumAudioCuesPerTick: 16,
    callbackDeadlineMs: 16,
    maximumConsecutiveOverruns: 3,
    operationTimeoutMs: 5_000,
    hardWorkerTimeoutMs: 5_000,
    maximumSessionMs: 1_800_000,
  });

interface MissionSeed {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly fileId: RoadHopperFileIdV1;
  readonly concepts: readonly string[];
  readonly readinessPrompt: string;
  readonly goal: string;
  readonly protectedGoal: string;
}

const missionSeeds: readonly MissionSeed[] = [
  {
    id: "road-hopper-board",
    title: "Map the Rally Route",
    summary: "Build the coordinate grid, safe strips, five homes, road and river.",
    fileId: "board.js",
    concepts: ["coordinates", "arrays", "data modelling", "functions"],
    readinessPrompt: "Which coordinate changes when the hopper moves upward?",
    goal: "Create fourteen columns, fifteen rows, five road lanes, five river lanes and five homes.",
    protectedGoal: "The board structure remains complete and bounded for every protected seed.",
  },
  {
    id: "road-hopper-movement",
    title: "Move the Hopper",
    summary: "Connect touch and keyboard commands to bounded tile movement.",
    fileId: "hopper.js",
    concepts: ["events", "state", "conditions", "bounds"],
    readinessPrompt: "What should happen when a pressed direction would leave the board?",
    goal: "Move exactly one tile in four directions without leaving the board.",
    protectedGoal: "Movement is deterministic, source-independent and safe at every edge.",
  },
  {
    id: "road-hopper-traffic",
    title: "Build the Traffic Rally",
    summary: "Spawn, move, wrap and collide with vehicles across five lanes.",
    fileId: "traffic.js",
    concepts: ["entities", "velocity", "wrapping", "collision"],
    readinessPrompt: "Why should a wrapped vehicle keep its lane and speed?",
    goal: "Update five traffic lanes and detect a vehicle collision.",
    protectedGoal: "Traffic scales with level without unbounded entity or coordinate growth.",
  },
  {
    id: "road-hopper-river",
    title: "Ride the Rescue River",
    summary: "Create moving supports, diving turtles and original river hazards.",
    fileId: "river.js",
    concepts: ["relative movement", "platform support", "timers", "hazards"],
    readinessPrompt: "What must move with a platform when the hopper is standing on it?",
    goal: "Carry the hopper on safe supports and detect water or submerged-platform danger.",
    protectedGoal: "River support handles edges, diving cycles and original hazards deterministically.",
  },
  {
    id: "road-hopper-rules",
    title: "Score the Rescue",
    summary: "Add homes, timer, lives, bonuses, hazards, levels and alternating players.",
    fileId: "rules.js",
    concepts: ["state machines", "scoring", "timers", "difficulty"],
    readinessPrompt: "Which facts must survive when the hopper respawns?",
    goal: "Apply scoring, home occupancy, bonuses, lives, game-over, level and two-player rules.",
    protectedGoal: "Every terminal and level transition preserves score and attempt integrity.",
  },
  {
    id: "road-hopper-game",
    title: "Road Hopper Rally Challenge",
    summary: "Assemble, render, test and explain the complete accessible game.",
    fileId: "game.js",
    concepts: ["game loop", "render model", "audio cues", "testing", "accessibility"],
    readinessPrompt: "Why does update logic stay separate from drawing and sound?",
    goal: "Assemble a deterministic full game with bounded frames and semantic status.",
    protectedGoal: "The final project passes all mechanics and mandatory sandbox safety scenarios.",
  },
] as const;

const stageTitles: Readonly<Record<MissionStageKindV1, string>> = Object.freeze({
  learn: "Learn the system",
  predict: "Predict the next frame",
  build: "Build the callback",
  run: "Run the project",
  assess: "Check the evidence",
  inspect: "Inspect state and output",
  fix: "Fix one cause",
  explain: "Explain the rule",
  reward: "Record the rally milestone",
});

const stageInstructions: Readonly<Record<MissionStageKindV1, string>> =
  Object.freeze({
    learn: "Read the visual model and identify the state this system owns.",
    predict: "Write down the expected state before running the next input.",
    build: "Implement the named callback in the mission's editable file.",
    run: "Run in a fresh sandbox and compare the preview with the prediction.",
    assess: "Run the deterministic mission checks; this checkpoint is formative.",
    inspect: "Use bounded state and semantic output to find the first mismatch.",
    fix: "Change the smallest responsible rule and run the same scenario again.",
    explain: "Explain how update, state and visible behavior connect.",
    reward: "Record the milestone, then continue or jump anywhere in the course map.",
  });

function missionFromSeed(seed: MissionSeed, index: number): RoadHopperMissionV2 {
  const missionNumber = index + 1;
  const artifactBase = `${seed.id}-artifact`;
  return {
    id: seed.id,
    title: seed.title,
    summary: seed.summary,
    estimatedMinutes: 75,
    concepts: seed.concepts,
    editableFileId: seed.fileId,
    stages: ROAD_HOPPER_MISSION_STAGE_ORDER_V2.map((kind, stageIndex) => ({
      id: `${seed.id}-${String(stageIndex + 1).padStart(2, "0")}-${kind}`,
      kind,
      title: stageTitles[kind],
      instruction: `${stageInstructions[kind]} Mission ${missionNumber} works in ${seed.fileId}.`,
      editableFileId: seed.fileId,
      artifactIds: [`${artifactBase}-${kind}`],
    })),
    learner: {
      readinessPrompt: seed.readinessPrompt,
      goals: [
        {
          id: `${seed.id}-visible-goal`,
          statement: seed.goal,
          evidence: "deterministic-assessment",
        },
      ],
      accessibilityAlternatives: [
        "Keyboard and touch commands use the same input action.",
        "Semantic status and printable state tables replace colour, motion and audio cues.",
        "Practice speed changes timing only; assessment uses scripted inputs.",
      ],
      artifactIds: ROAD_HOPPER_MISSION_STAGE_ORDER_V2.map(
        (kind) => `${artifactBase}-${kind}`,
      ),
    },
    facilitator: {
      protectedGoals: [
        {
          id: `${seed.id}-protected-goal`,
          statement: seed.protectedGoal,
          mandatory: true,
        },
      ],
      protectedScenarioIds: [
        `${seed.id}-nominal`,
        `${seed.id}-edge`,
        `${seed.id}-bounded`,
      ],
      answerKeyArtifactId: `${seed.id}-answer-key`,
    },
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return value;
}

/** The immutable package-owned Road Hopper Rally 2.0 content contract. */
export const ROAD_HOPPER_RALLY_COURSE_V2: RoadHopperCourseManifestV2 =
  deepFreeze({
    schemaVersion: "2",
    moduleId: "junior-coder.road-hopper-rally",
    moduleVersion: "2.0.0",
    contentRevision: "2026-08-11.1",
    title: "Road Hopper Rally",
    estimatedMinutes: 450,
    navigation: "open",
    completionAuthority: "server-final-assessment",
    fullscreenUnlock: "historical-completion",
    missions: missionSeeds.map(missionFromSeed),
    starterProject: ROAD_HOPPER_RALLY_STARTER_PROJECT_V1,
    runtimeLimits: ROAD_HOPPER_RUNTIME_LIMITS_V1,
    assets: [
      {
        id: "road-hopper-original-sprite-atlas-v1",
        kind: "sprite-atlas",
        packagePath: "assets/sprites/road-hopper-atlas.svg",
        mediaType: "image/svg+xml",
        sha256: "08f6f7d59b217ad896c201ca0d6ee43142c6d693a7f39d74e25dc94607f21a45",
        licence: "Apache-2.0",
        originalWork: true,
      },
      {
        id: "road-hopper-original-audio-sequence-v1",
        kind: "audio-sequence",
        packagePath: "assets/audio/road-hopper-audio.json",
        mediaType: "application/json",
        sha256: "136fb4794e54064b0e8e36749daa18a977c4b62a8914911b40bce38e0d206d0c",
        licence: "Apache-2.0",
        originalWork: true,
      },
    ],
  });

/** Create a deep-frozen learner-safe projection with no protected content. */
export function createRoadHopperLearnerProjection(
  course: RoadHopperCourseManifestV2,
): RoadHopperLearnerCourseProjectionV2 {
  return deepFreeze({
    ...course,
    missions: course.missions.map(({ facilitator: _facilitator, ...mission }) =>
      mission),
  });
}
