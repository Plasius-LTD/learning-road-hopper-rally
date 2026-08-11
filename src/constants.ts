import type { MissionStageKindV1 } from "@plasius/learning";
import type { RoadHopperRuntimeLimitsV1 } from "./types.js";

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
