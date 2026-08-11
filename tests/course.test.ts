import { describe, expect, it } from "vitest";
import {
  ROAD_HOPPER_RALLY_AUDIO_SEQUENCE_V1,
  ROAD_HOPPER_FILE_IDS,
  ROAD_HOPPER_MISSION_STAGE_ORDER_V2,
  ROAD_HOPPER_RALLY_COURSE_V2,
  ROAD_HOPPER_RALLY_STARTER_PROJECT_V1,
  createRoadHopperLearnerProjection,
  parseRoadHopperProject,
  validateRoadHopperCourseManifest,
} from "../src/index.js";

describe("Road Hopper Rally course", () => {
  it("publishes six 75-minute missions and exactly 54 canonical stages", () => {
    const course = ROAD_HOPPER_RALLY_COURSE_V2;

    expect(course.moduleVersion).toBe("2.0.0");
    expect(course.estimatedMinutes).toBe(450);
    expect(course.missions).toHaveLength(6);
    expect(course.missions.flatMap((mission) => mission.stages)).toHaveLength(54);
    for (const mission of course.missions) {
      expect(mission.estimatedMinutes).toBe(75);
      expect(mission.stages.map((stage) => stage.kind)).toEqual(
        ROAD_HOPPER_MISSION_STAGE_ORDER_V2,
      );
    }
    expect(validateRoadHopperCourseManifest(course)).toEqual([]);
  });

  it("keeps facilitator answers and protected scenarios out of learner data", () => {
    const learner = createRoadHopperLearnerProjection(
      ROAD_HOPPER_RALLY_COURSE_V2,
    );
    const serialized = JSON.stringify(learner);

    expect(serialized).not.toContain("facilitator");
    expect(serialized).not.toContain("protectedScenarioIds");
    expect(serialized).not.toContain("answerKey");
    expect(learner.missions).toHaveLength(6);
  });

  it("binds every required file and original asset to bounded metadata", () => {
    expect(Object.keys(ROAD_HOPPER_RALLY_STARTER_PROJECT_V1.files)).toEqual(
      ROAD_HOPPER_FILE_IDS,
    );
    expect(ROAD_HOPPER_RALLY_COURSE_V2.assets.length).toBeGreaterThanOrEqual(2);
    for (const asset of ROAD_HOPPER_RALLY_COURSE_V2.assets) {
      expect(asset.sha256).toMatch(/^[0-9a-f]{64}$/u);
      expect(asset.licence).toBe("Apache-2.0");
      expect(asset.originalWork).toBe(true);
    }
  });

  it("exports the original captioned audio sequence for renderer hosts", () => {
    expect(ROAD_HOPPER_RALLY_AUDIO_SEQUENCE_V1.cues.home).toEqual({
      waveform: "triangle",
      frequencyHz: 880,
      durationMs: 240,
      caption: "Home reached",
    });
    expect(Object.isFrozen(ROAD_HOPPER_RALLY_AUDIO_SEQUENCE_V1.cues)).toBe(true);
  });
});

describe("Road Hopper project validation", () => {
  it("accepts the immutable six-file starter project", () => {
    expect(parseRoadHopperProject(ROAD_HOPPER_RALLY_STARTER_PROJECT_V1)).toEqual(
      ROAD_HOPPER_RALLY_STARTER_PROJECT_V1,
    );
  });

  it("rejects missing, unknown, and oversized source without reflecting it", () => {
    const missing = {
      ...ROAD_HOPPER_RALLY_STARTER_PROJECT_V1,
      files: { ...ROAD_HOPPER_RALLY_STARTER_PROJECT_V1.files },
    };
    delete (missing.files as Record<string, string>)["board.js"];
    expect(() => parseRoadHopperProject(missing)).toThrow(
      "ROAD_HOPPER_PROJECT_INVALID_FILES",
    );

    const unknown = {
      ...ROAD_HOPPER_RALLY_STARTER_PROJECT_V1,
      files: {
        ...ROAD_HOPPER_RALLY_STARTER_PROJECT_V1.files,
        "secret.js": "synthetic-person@example.test",
      },
    };
    expect(() => parseRoadHopperProject(unknown)).toThrow(
      "ROAD_HOPPER_PROJECT_INVALID_FILES",
    );

    const oversized = {
      ...ROAD_HOPPER_RALLY_STARTER_PROJECT_V1,
      files: {
        ...ROAD_HOPPER_RALLY_STARTER_PROJECT_V1.files,
        "board.js": "x".repeat(16 * 1024 + 1),
      },
    };
    expect(() => parseRoadHopperProject(oversized)).toThrow(
      "ROAD_HOPPER_PROJECT_FILE_TOO_LARGE",
    );
  });
});
