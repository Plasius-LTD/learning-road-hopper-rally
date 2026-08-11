import { ROAD_HOPPER_MISSION_STAGE_ORDER_V2 } from "./constants.js";
import {
  ROAD_HOPPER_FILE_IDS,
  type RoadHopperAudioCueV1,
  type RoadHopperCourseManifestV2,
  type RoadHopperCourseValidationIssueV1,
  type RoadHopperDrawCommandV1,
  type RoadHopperFrameV1,
  type RoadHopperInputCommandV1,
  type RoadHopperProjectV1,
  type RoadHopperSemanticStateV1,
} from "./types.js";

const encoder = new TextEncoder();
const fileIdSet = new Set<string>(ROAD_HOPPER_FILE_IDS);
const inputActions = new Set([
  "up",
  "down",
  "left",
  "right",
  "pause",
  "restart",
]);
const inputSources = new Set(["keyboard", "touch", "assessment"]);
const colourPattern = /^#[0-9a-f]{6}$/iu;
const identifierPattern = /^[a-z0-9][a-z0-9.-]{0,79}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteInteger(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === "number"
    && Number.isInteger(value)
    && value >= minimum
    && value <= maximum
  );
}

function finiteNumber(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === "number"
    && Number.isFinite(value)
    && value >= minimum
    && value <= maximum
  );
}

function issue(
  code: string,
  path: string,
  message: string,
): RoadHopperCourseValidationIssueV1 {
  return { code, path, message };
}

/** Validate all publish-time invariants without throwing on the first issue. */
export function validateRoadHopperCourseManifest(
  course: RoadHopperCourseManifestV2,
): RoadHopperCourseValidationIssueV1[] {
  const issues: RoadHopperCourseValidationIssueV1[] = [];
  if (
    course.schemaVersion !== "2"
    || course.moduleId !== "junior-coder.road-hopper-rally"
    || course.moduleVersion !== "2.0.0"
    || course.estimatedMinutes !== 450
  ) {
    issues.push(issue("invalid-course-identity", "course", "The immutable course identity is invalid."));
  }
  if (course.missions.length !== 6) {
    issues.push(issue("invalid-mission-count", "missions", "Road Hopper Rally requires exactly six missions."));
  }
  const missionIds = new Set<string>();
  const stageIds = new Set<string>();
  const editableFiles = new Set<string>();
  let stageCount = 0;
  for (const [missionIndex, mission] of course.missions.entries()) {
    if (missionIds.has(mission.id)) {
      issues.push(issue("duplicate-mission-id", `missions[${missionIndex}].id`, "Mission IDs must be unique."));
    }
    missionIds.add(mission.id);
    editableFiles.add(mission.editableFileId);
    if (mission.estimatedMinutes !== 75) {
      issues.push(issue("invalid-mission-duration", `missions[${missionIndex}].estimatedMinutes`, "Each mission lasts 75 minutes."));
    }
    if (mission.stages.length !== ROAD_HOPPER_MISSION_STAGE_ORDER_V2.length) {
      issues.push(issue("invalid-stage-count", `missions[${missionIndex}].stages`, "Each mission requires exactly nine stages."));
    }
    stageCount += mission.stages.length;
    for (const [stageIndex, stage] of mission.stages.entries()) {
      if (stage.kind !== ROAD_HOPPER_MISSION_STAGE_ORDER_V2[stageIndex]) {
        issues.push(issue("invalid-stage-order", `missions[${missionIndex}].stages[${stageIndex}]`, "Stages must follow the canonical learner journey."));
      }
      if (stage.editableFileId !== mission.editableFileId) {
        issues.push(issue("stage-file-mismatch", `missions[${missionIndex}].stages[${stageIndex}].editableFileId`, "A stage must edit its mission file."));
      }
      if (stageIds.has(stage.id)) {
        issues.push(issue("duplicate-stage-id", `missions[${missionIndex}].stages[${stageIndex}].id`, "Stage IDs must be unique."));
      }
      stageIds.add(stage.id);
    }
    if (mission.learner.goals.length === 0 || mission.facilitator.protectedGoals.length === 0) {
      issues.push(issue("missing-goal", `missions[${missionIndex}]`, "Visible and protected goals are required."));
    }
  }
  if (stageCount !== 54) {
    issues.push(issue("invalid-total-stage-count", "missions", "Road Hopper Rally requires exactly 54 stages."));
  }
  if (
    editableFiles.size !== ROAD_HOPPER_FILE_IDS.length
    || ROAD_HOPPER_FILE_IDS.some((fileId) => !editableFiles.has(fileId))
  ) {
    issues.push(issue("invalid-editable-files", "missions", "The six missions must map one-to-one to the six project files."));
  }
  if (course.assets.length < 2 || course.assets.some((asset) => !/^[0-9a-f]{64}$/u.test(asset.sha256))) {
    issues.push(issue("invalid-assets", "assets", "Original sprite and audio assets require SHA-256 bindings."));
  }
  return issues;
}

/** Parse, copy and freeze learner source without reflecting rejected content. */
export function parseRoadHopperProject(value: unknown): RoadHopperProjectV1 {
  if (
    !isRecord(value)
    || value.schemaVersion !== "1"
    || typeof value.starterRevision !== "string"
    || value.starterRevision.length < 1
    || value.starterRevision.length > 120
    || !isRecord(value.files)
  ) {
    throw new Error("ROAD_HOPPER_PROJECT_INVALID");
  }
  const files = value.files;
  const keys = Object.keys(files);
  if (
    keys.length !== ROAD_HOPPER_FILE_IDS.length
    || keys.some((key) => !fileIdSet.has(key))
    || ROAD_HOPPER_FILE_IDS.some((fileId) => !Object.hasOwn(files, fileId))
  ) {
    throw new Error("ROAD_HOPPER_PROJECT_INVALID_FILES");
  }
  const parsedFiles = {} as Record<(typeof ROAD_HOPPER_FILE_IDS)[number], string>;
  let projectBytes = 0;
  for (const fileId of ROAD_HOPPER_FILE_IDS) {
    const source = files[fileId];
    if (typeof source !== "string") {
      throw new Error("ROAD_HOPPER_PROJECT_INVALID_SOURCE");
    }
    const bytes = encoder.encode(source).byteLength;
    if (bytes > 16_384) {
      throw new Error("ROAD_HOPPER_PROJECT_FILE_TOO_LARGE");
    }
    projectBytes += bytes;
    parsedFiles[fileId] = source;
  }
  if (projectBytes > 98_304) {
    throw new Error("ROAD_HOPPER_PROJECT_TOO_LARGE");
  }
  return Object.freeze({
    schemaVersion: "1",
    starterRevision: value.starterRevision,
    files: Object.freeze(parsedFiles),
  });
}

/** Parse a bounded input before it enters either trusted or learner code. */
export function parseRoadHopperInputCommand(value: unknown): RoadHopperInputCommandV1 {
  if (
    !isRecord(value)
    || !finiteInteger(value.sequence, 0, Number.MAX_SAFE_INTEGER)
    || typeof value.action !== "string"
    || !inputActions.has(value.action)
    || (value.phase !== "pressed" && value.phase !== "released")
    || typeof value.source !== "string"
    || !inputSources.has(value.source)
    || !finiteInteger(value.atTick, 0, Number.MAX_SAFE_INTEGER)
  ) {
    throw new Error("ROAD_HOPPER_INPUT_INVALID");
  }
  return Object.freeze({
    sequence: value.sequence,
    action: value.action as RoadHopperInputCommandV1["action"],
    phase: value.phase,
    source: value.source as RoadHopperInputCommandV1["source"],
    atTick: value.atTick,
  });
}

function parseDrawCommand(value: unknown): RoadHopperDrawCommandV1 {
  if (!isRecord(value) || typeof value.kind !== "string") {
    throw new Error("ROAD_HOPPER_FRAME_INVALID_DRAW_COMMAND");
  }
  const { x, y } = value;
  if (!finiteNumber(x, -1024, 2048) || !finiteNumber(y, -1024, 2048)) {
    throw new Error("ROAD_HOPPER_FRAME_INVALID_POSITION");
  }
  if (value.kind === "rect") {
    if (
      !finiteNumber(value.width, 0, 1024)
      || !finiteNumber(value.height, 0, 1024)
      || typeof value.colour !== "string"
      || !colourPattern.test(value.colour)
    ) throw new Error("ROAD_HOPPER_FRAME_INVALID_RECT");
    return { kind: "rect", x, y, width: value.width, height: value.height, colour: value.colour.toLowerCase() };
  }
  if (value.kind === "sprite") {
    if (
      typeof value.spriteId !== "string"
      || !identifierPattern.test(value.spriteId)
      || !finiteNumber(value.width, 0, 256)
      || !finiteNumber(value.height, 0, 256)
    ) throw new Error("ROAD_HOPPER_FRAME_INVALID_SPRITE");
    return { kind: "sprite", spriteId: value.spriteId, x, y, width: value.width, height: value.height };
  }
  if (value.kind === "text") {
    if (
      typeof value.text !== "string"
      || value.text.length > 240
      || typeof value.colour !== "string"
      || !colourPattern.test(value.colour)
    ) throw new Error("ROAD_HOPPER_FRAME_INVALID_TEXT");
    return { kind: "text", text: value.text, x, y, colour: value.colour.toLowerCase() };
  }
  throw new Error("ROAD_HOPPER_FRAME_UNSUPPORTED_DRAW_COMMAND");
}

function parseAudioCue(value: unknown): RoadHopperAudioCueV1 {
  if (
    !isRecord(value)
    || typeof value.cueId !== "string"
    || !identifierPattern.test(value.cueId)
    || typeof value.assetId !== "string"
    || !identifierPattern.test(value.assetId)
    || (value.category !== "music" && value.category !== "sfx" && value.category !== "ui")
    || typeof value.caption !== "string"
    || value.caption.length > 120
  ) throw new Error("ROAD_HOPPER_FRAME_INVALID_AUDIO_CUE");
  return { cueId: value.cueId, assetId: value.assetId, category: value.category, caption: value.caption };
}

function parseSemanticState(value: unknown): RoadHopperSemanticStateV1 {
  if (
    !isRecord(value)
    || typeof value.statusText !== "string"
    || value.statusText.length > 240
    || !finiteInteger(value.score, 0, 10_000_000)
    || !finiteInteger(value.lives, 0, 99)
    || !finiteInteger(value.level, 1, 999)
    || (value.currentPlayer !== 1 && value.currentPlayer !== 2)
    || typeof value.paused !== "boolean"
    || typeof value.gameOver !== "boolean"
    || !finiteInteger(value.timerTicksRemaining, 0, 1_000_000)
  ) throw new Error("ROAD_HOPPER_FRAME_INVALID_SEMANTIC_STATE");
  return {
    statusText: value.statusText,
    score: value.score,
    lives: value.lives,
    level: value.level,
    currentPlayer: value.currentPlayer,
    paused: value.paused,
    gameOver: value.gameOver,
    timerTicksRemaining: value.timerTicksRemaining,
  };
}

/** Parse all learner-produced preview output before an adapter renders it. */
export function parseRoadHopperFrame(value: unknown): RoadHopperFrameV1 {
  if (
    !isRecord(value)
    || !finiteInteger(value.tick, 0, Number.MAX_SAFE_INTEGER)
    || !Array.isArray(value.drawCommands)
    || value.drawCommands.length > 512
    || !Array.isArray(value.audioCues)
    || value.audioCues.length > 16
  ) throw new Error("ROAD_HOPPER_FRAME_INVALID");
  return Object.freeze({
    tick: value.tick,
    drawCommands: Object.freeze(value.drawCommands.map(parseDrawCommand)),
    audioCues: Object.freeze(value.audioCues.map(parseAudioCue)),
    semanticState: Object.freeze(parseSemanticState(value.semanticState)),
  });
}
