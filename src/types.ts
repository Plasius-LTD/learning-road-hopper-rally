import type { MissionStageKindV1 } from "@plasius/learning";

/** The six and only editable files in a Road Hopper Rally project. */
export const ROAD_HOPPER_FILE_IDS = Object.freeze([
  "board.js",
  "hopper.js",
  "traffic.js",
  "river.js",
  "rules.js",
  "game.js",
] as const);

export type RoadHopperFileIdV1 = (typeof ROAD_HOPPER_FILE_IDS)[number];

/** A complete, transport-neutral learner project. */
export interface RoadHopperProjectV1 {
  readonly schemaVersion: "1";
  readonly starterRevision: string;
  readonly files: Readonly<Record<RoadHopperFileIdV1, string>>;
}

export interface RoadHopperStageV2 {
  readonly id: string;
  readonly kind: MissionStageKindV1;
  readonly title: string;
  readonly instruction: string;
  readonly editableFileId: RoadHopperFileIdV1;
  readonly artifactIds: readonly string[];
}

export interface RoadHopperVisibleGoalV2 {
  readonly id: string;
  readonly statement: string;
  readonly evidence: "code" | "explanation" | "deterministic-assessment";
}

export interface RoadHopperProtectedGoalV2 {
  readonly id: string;
  readonly statement: string;
  readonly mandatory: boolean;
}

export interface RoadHopperMissionV2 {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly estimatedMinutes: 75;
  readonly concepts: readonly string[];
  readonly editableFileId: RoadHopperFileIdV1;
  readonly stages: readonly RoadHopperStageV2[];
  readonly learner: {
    readonly readinessPrompt: string;
    readonly goals: readonly RoadHopperVisibleGoalV2[];
    readonly accessibilityAlternatives: readonly string[];
    readonly artifactIds: readonly string[];
  };
  readonly facilitator: {
    readonly protectedGoals: readonly RoadHopperProtectedGoalV2[];
    readonly protectedScenarioIds: readonly string[];
    readonly answerKeyArtifactId: string;
  };
}

export interface RoadHopperRuntimeLimitsV1 {
  readonly tickRateHz: 30;
  readonly maximumFileBytes: 16_384;
  readonly maximumProjectBytes: 98_304;
  readonly memoryLimitBytes: 33_554_432;
  readonly stackLimitBytes: 524_288;
  readonly maximumQueuedInputs: 64;
  readonly maximumEntities: 256;
  readonly maximumDrawCommands: 512;
  readonly maximumAudioCuesPerTick: 16;
  readonly callbackDeadlineMs: 16;
  readonly maximumConsecutiveOverruns: 3;
  readonly operationTimeoutMs: 5_000;
  readonly hardWorkerTimeoutMs: 5_000;
  readonly maximumSessionMs: 1_800_000;
}

export interface RoadHopperAssetV1 {
  readonly id: string;
  readonly kind: "sprite-atlas" | "audio-sequence";
  readonly packagePath: string;
  readonly mediaType: string;
  readonly sha256: string;
  readonly licence: "Apache-2.0";
  readonly originalWork: true;
}

export interface RoadHopperCourseManifestV2 {
  readonly schemaVersion: "2";
  readonly moduleId: "junior-coder.road-hopper-rally";
  readonly moduleVersion: "2.0.0";
  readonly contentRevision: string;
  readonly title: "Road Hopper Rally";
  readonly estimatedMinutes: 450;
  readonly navigation: "open";
  readonly completionAuthority: "server-final-assessment";
  readonly fullscreenUnlock: "historical-completion";
  readonly missions: readonly RoadHopperMissionV2[];
  readonly starterProject: RoadHopperProjectV1;
  readonly runtimeLimits: RoadHopperRuntimeLimitsV1;
  readonly assets: readonly RoadHopperAssetV1[];
}

/** Facilitator-free mission contract safe to publish to a learner client. */
export interface RoadHopperLearnerMissionV2 {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly estimatedMinutes: 75;
  readonly concepts: readonly string[];
  readonly editableFileId: RoadHopperFileIdV1;
  readonly stages: readonly RoadHopperStageV2[];
  readonly learner: {
    readonly readinessPrompt: string;
    readonly goals: readonly RoadHopperVisibleGoalV2[];
    readonly accessibilityAlternatives: readonly string[];
    readonly artifactIds: readonly string[];
  };
}

/** Complete learner projection without a type dependency on trusted fields. */
export interface RoadHopperLearnerCourseProjectionV2 {
  readonly schemaVersion: "2";
  readonly moduleId: "junior-coder.road-hopper-rally";
  readonly moduleVersion: "2.0.0";
  readonly contentRevision: string;
  readonly title: "Road Hopper Rally";
  readonly estimatedMinutes: 450;
  readonly navigation: "open";
  readonly completionAuthority: "server-final-assessment";
  readonly fullscreenUnlock: "historical-completion";
  readonly missions: readonly RoadHopperLearnerMissionV2[];
  readonly starterProject: RoadHopperProjectV1;
  readonly runtimeLimits: RoadHopperRuntimeLimitsV1;
  readonly assets: readonly RoadHopperAssetV1[];
}

export interface RoadHopperCourseValidationIssueV1 {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export type RoadHopperInputActionV1 =
  | "up"
  | "down"
  | "left"
  | "right"
  | "pause"
  | "restart";

/** One ordered command shared by touch, keyboard, and assessment adapters. */
export interface RoadHopperInputCommandV1 {
  readonly sequence: number;
  readonly action: RoadHopperInputActionV1;
  readonly phase: "pressed" | "released";
  readonly source: "keyboard" | "touch" | "assessment";
  readonly atTick: number;
}

export type RoadHopperDrawCommandV1 =
  | {
      readonly kind: "rect";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly colour: string;
    }
  | {
      readonly kind: "sprite";
      readonly spriteId: string;
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly kind: "text";
      readonly text: string;
      readonly x: number;
      readonly y: number;
      readonly colour: string;
    };

export interface RoadHopperAudioCueV1 {
  readonly cueId: string;
  readonly assetId: string;
  readonly category: "music" | "sfx" | "ui";
  readonly caption: string;
}

export interface RoadHopperSemanticStateV1 {
  readonly statusText: string;
  readonly score: number;
  readonly lives: number;
  readonly level: number;
  readonly currentPlayer: 1 | 2;
  readonly paused: boolean;
  readonly gameOver: boolean;
  readonly timerTicksRemaining: number;
}

/** A renderer-neutral, accessibility-bearing preview frame. */
export interface RoadHopperFrameV1 {
  readonly tick: number;
  readonly drawCommands: readonly RoadHopperDrawCommandV1[];
  readonly audioCues: readonly RoadHopperAudioCueV1[];
  readonly semanticState: RoadHopperSemanticStateV1;
}

export interface RoadHopperEntityV1 {
  readonly id: string;
  readonly kind: "vehicle" | "log" | "turtle" | "gator" | "snake" | "otter";
  readonly row: number;
  readonly x: number;
  readonly width: number;
  readonly speed: number;
  readonly submerged?: boolean;
}

export interface RoadHopperStateV1 {
  readonly schemaVersion: "1";
  readonly seed: number;
  readonly practiceMode: boolean;
  readonly tick: number;
  readonly paused: boolean;
  readonly score: number;
  readonly lives: number;
  readonly level: number;
  readonly currentPlayer: 1 | 2;
  readonly gameOver: boolean;
  readonly timerTicksRemaining: number;
  readonly hopper: { readonly column: number; readonly row: number };
  readonly occupiedHomes: readonly boolean[];
  readonly entities: readonly RoadHopperEntityV1[];
  readonly pendingAudioCues: readonly RoadHopperAudioCueV1[];
  readonly lastInputSequence: number;
}

export interface RoadHopperProgressV1 {
  readonly schemaVersion: "1";
  readonly attemptId: string;
  readonly revision: number;
  readonly etag: string;
  readonly project: RoadHopperProjectV1;
  readonly currentStageId: string;
  readonly completedStageIds: readonly string[];
  readonly completedAt?: string;
  readonly fullscreenUnlocked: boolean;
  readonly savedAt: string;
}

export interface RoadHopperSavedVersionV1 {
  readonly schemaVersion: "1";
  readonly versionId: string;
  readonly number: number;
  readonly attemptId: string;
  readonly projectRevision: number;
  readonly project: RoadHopperProjectV1;
  readonly createdAt: string;
}

export type RoadHopperAssessmentScopeV1 =
  | { readonly kind: "mission"; readonly missionId: string }
  | { readonly kind: "final" };

export interface RoadHopperAssessmentRequestV1 {
  readonly schemaVersion: "1";
  readonly attemptId: string;
  readonly projectRevision: number;
  readonly scope: RoadHopperAssessmentScopeV1;
}

export interface RoadHopperAssessmentResultV1 {
  readonly schemaVersion: "1";
  readonly outcome: "completed" | "error" | "timeout";
  readonly score: number;
  readonly completed: boolean;
  readonly passedGoalIds: readonly string[];
  readonly failedGoalIds: readonly string[];
  readonly errorCode?: string;
}

export interface RoadHopperEvaluatorOptionsV1 {
  readonly operationTimeoutMs?: number;
  readonly callbackDeadlineMs?: number;
  readonly memoryLimitBytes?: number;
  readonly stackLimitBytes?: number;
  readonly maximumSessionMs?: number;
}

export interface RoadHopperProgramSessionV1 {
  step(input?: RoadHopperInputCommandV1): Promise<RoadHopperFrameV1>;
  restart(seed?: number): Promise<RoadHopperFrameV1>;
  dispose(): void;
}

/** Low-level JSON-only evaluator used by trusted preview and assessment adapters. */
export interface RoadHopperEvaluatorV1 {
  call(functionName: string, args?: readonly unknown[], deadlineMs?: number): unknown;
  dispose(): void;
}
