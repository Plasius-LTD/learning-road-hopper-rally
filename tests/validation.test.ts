import { describe, expect, it } from "vitest";
import {
  ROAD_HOPPER_RALLY_COURSE_V2,
  ROAD_HOPPER_RALLY_STARTER_PROJECT_V1,
  createRoadHopperEvaluator,
  createRoadHopperProgramSession,
  parseRoadHopperAssessmentRequest,
  parseRoadHopperAssessmentResult,
  parseRoadHopperFrame,
  parseRoadHopperInputCommand,
  parseRoadHopperProgress,
  parseRoadHopperSavedVersion,
  validateRoadHopperCourseManifest,
  type RoadHopperCourseManifestV2,
} from "../src/index.js";

describe("course publish validation", () => {
  it("reports identity, mission, stage, file, goal and asset drift together", () => {
    const invalid = structuredClone(ROAD_HOPPER_RALLY_COURSE_V2) as unknown as {
      schemaVersion: string;
      estimatedMinutes: number;
      missions: Array<Record<string, unknown>>;
      assets: Array<Record<string, unknown>>;
    };
    invalid.schemaVersion = "3";
    invalid.estimatedMinutes = 1;
    const first = invalid.missions[0] as {
      id: string;
      estimatedMinutes: number;
      editableFileId: string;
      stages: Array<{ id: string; kind: string; editableFileId: string }>;
      learner: { goals: unknown[] };
      facilitator: { protectedGoals: unknown[] };
    };
    const second = invalid.missions[1] as typeof first;
    first.estimatedMinutes = 20;
    first.editableFileId = "game.js";
    first.stages[0]!.kind = "reward";
    first.stages[0]!.editableFileId = "board.js";
    second.id = first.id;
    second.stages[0]!.id = first.stages[0]!.id;
    first.learner.goals = [];
    first.facilitator.protectedGoals = [];
    invalid.assets[0]!.sha256 = "bad";

    const issues = validateRoadHopperCourseManifest(
      invalid as unknown as RoadHopperCourseManifestV2,
    );
    expect(new Set(issues.map((entry) => entry.code))).toEqual(
      expect.objectContaining(
        new Set([
          "invalid-course-identity",
          "duplicate-mission-id",
          "invalid-mission-duration",
          "invalid-stage-order",
          "stage-file-mismatch",
          "duplicate-stage-id",
          "missing-goal",
          "invalid-editable-files",
          "invalid-assets",
        ]),
      ),
    );
  });
});

describe("input and frame validation", () => {
  it("parses valid commands and frames", () => {
    expect(
      parseRoadHopperInputCommand({
        sequence: 1,
        action: "up",
        phase: "pressed",
        source: "touch",
        atTick: 2,
      }),
    ).toMatchObject({ action: "up", source: "touch" });
    expect(
      parseRoadHopperFrame({
        tick: 1,
        drawCommands: [
          { kind: "rect", x: 0, y: 0, width: 10, height: 10, colour: "#AABBCC" },
          { kind: "sprite", spriteId: "hopper", x: 1, y: 2, width: 32, height: 32 },
          { kind: "text", text: "Ready", x: 1, y: 2, colour: "#ffffff" },
        ],
        audioCues: [
          { cueId: "hop-1", assetId: "hop", category: "sfx", caption: "Hop" },
        ],
        semanticState: {
          statusText: "Ready",
          score: 0,
          lives: 3,
          level: 1,
          currentPlayer: 1,
          paused: false,
          gameOver: false,
          timerTicksRemaining: 1800,
        },
      }).drawCommands[0],
    ).toMatchObject({ colour: "#aabbcc" });
  });

  it("rejects invalid input and every untrusted frame boundary", () => {
    expect(() => parseRoadHopperInputCommand({ action: "teleport" })).toThrow(
      "ROAD_HOPPER_INPUT_INVALID",
    );
    const base = {
      tick: 1,
      drawCommands: [],
      audioCues: [],
      semanticState: {
        statusText: "Ready",
        score: 0,
        lives: 3,
        level: 1,
        currentPlayer: 1,
        paused: false,
        gameOver: false,
        timerTicksRemaining: 1800,
      },
    };
    expect(() => parseRoadHopperFrame({ ...base, tick: -1 })).toThrow();
    expect(() => parseRoadHopperFrame({ ...base, drawCommands: [{ kind: "circle" }] })).toThrow();
    expect(() => parseRoadHopperFrame({ ...base, drawCommands: [{ kind: "rect", x: Infinity, y: 0, width: 1, height: 1, colour: "#ffffff" }] })).toThrow();
    expect(() => parseRoadHopperFrame({ ...base, audioCues: [{ cueId: "!", assetId: "x", category: "sfx", caption: "x" }] })).toThrow();
    expect(() => parseRoadHopperFrame({ ...base, semanticState: { ...base.semanticState, lives: -1 } })).toThrow();
  });
});

describe("persistence and assessment transport validation", () => {
  const progress = {
    schemaVersion: "1",
    attemptId: "attempt-1",
    revision: 2,
    etag: '"revision-2"',
    project: ROAD_HOPPER_RALLY_STARTER_PROJECT_V1,
    currentStageId: ROAD_HOPPER_RALLY_COURSE_V2.missions[0]!.stages[0]!.id,
    completedStageIds: [],
    fullscreenUnlocked: false,
    savedAt: "2026-08-11T12:00:00.000Z",
  } as const;

  it("parses progress, saved versions and bounded assessment results", () => {
    expect(parseRoadHopperProgress(progress)).toMatchObject({ revision: 2 });
    expect(parseRoadHopperSavedVersion({
      schemaVersion: "1",
      versionId: "version-1",
      number: 1,
      attemptId: progress.attemptId,
      projectRevision: progress.revision,
      project: progress.project,
      createdAt: progress.savedAt,
    })).toMatchObject({ number: 1 });
    expect(parseRoadHopperAssessmentResult({
      schemaVersion: "1",
      outcome: "completed",
      score: 100,
      completed: true,
      passedGoalIds: ["road-hopper-game-complete"],
      failedGoalIds: [],
    })).toMatchObject({ completed: true });
  });

  it("accepts exact mission/final requests and rejects client-supplied authority", () => {
    expect(parseRoadHopperAssessmentRequest({
      schemaVersion: "1",
      attemptId: progress.attemptId,
      projectRevision: progress.revision,
      scope: { kind: "mission", missionId: ROAD_HOPPER_RALLY_COURSE_V2.missions[0]!.id },
    }).scope).toMatchObject({ kind: "mission" });
    expect(parseRoadHopperAssessmentRequest({
      schemaVersion: "1",
      attemptId: progress.attemptId,
      projectRevision: progress.revision,
      scope: { kind: "final" },
    }).scope).toEqual({ kind: "final" });
    expect(() => parseRoadHopperAssessmentRequest({
      schemaVersion: "1",
      attemptId: progress.attemptId,
      projectRevision: progress.revision,
      scope: { kind: "final" },
      score: 100,
      source: progress.project,
    })).toThrow("ROAD_HOPPER_ASSESSMENT_REQUEST_INVALID");
  });

  it("rejects malformed persisted and assessment transport records", () => {
    expect(() => parseRoadHopperProgress({ ...progress, etag: '"revision-9"' })).toThrow();
    expect(() => parseRoadHopperSavedVersion({ schemaVersion: "1" })).toThrow();
    expect(() => parseRoadHopperAssessmentResult({
      schemaVersion: "1",
      outcome: "completed",
      score: 101,
      completed: true,
      passedGoalIds: [],
      failedGoalIds: [],
    })).toThrow();
  });
});

describe("QuickJS evaluator lifecycle", () => {
  it("runs and restarts the starter preview through validated JSON", async () => {
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
    expect(frame.tick).toBe(1);
    expect((await session.restart(9)).tick).toBe(0);
    session.dispose();
    await expect(session.step()).rejects.toThrow("ROAD_HOPPER_EVALUATOR_DISPOSED");
  });

  it("rejects invalid options, syntax, callback names and non-JSON arguments", async () => {
    await expect(
      createRoadHopperEvaluator(ROAD_HOPPER_RALLY_STARTER_PROJECT_V1, {
        memoryLimitBytes: 1,
      }),
    ).rejects.toThrow("ROAD_HOPPER_EVALUATOR_INVALID_OPTIONS");

    await expect(
      createRoadHopperEvaluator({
        ...ROAD_HOPPER_RALLY_STARTER_PROJECT_V1,
        files: {
          ...ROAD_HOPPER_RALLY_STARTER_PROJECT_V1.files,
          "board.js": "function broken( {",
        },
      }),
    ).rejects.toThrow("ROAD_HOPPER_EVALUATION_FAILED");

    const evaluator = await createRoadHopperEvaluator(
      ROAD_HOPPER_RALLY_STARTER_PROJECT_V1,
    );
    expect(() => evaluator.call("not-valid!", [])).toThrow(
      "ROAD_HOPPER_EVALUATOR_INVALID_CALL",
    );
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => evaluator.call("createBoard", [cyclic])).toThrow(
      "ROAD_HOPPER_EVALUATOR_INVALID_ARGUMENT",
    );
    evaluator.dispose();
  });
});
