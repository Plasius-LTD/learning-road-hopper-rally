import {
  getQuickJS,
  shouldInterruptAfterDeadline,
  type QuickJSContext,
  type QuickJSRuntime,
} from "quickjs-emscripten";
import { ROAD_HOPPER_RUNTIME_LIMITS_V1 } from "./constants.js";
import type {
  RoadHopperEvaluatorOptionsV1,
  RoadHopperEvaluatorV1,
  RoadHopperFrameV1,
  RoadHopperInputCommandV1,
  RoadHopperProgramSessionV1,
  RoadHopperProjectV1,
} from "./types.js";
import {
  parseRoadHopperFrame,
  parseRoadHopperInputCommand,
  parseRoadHopperProject,
} from "./validation.js";

const callableNamePattern = /^[a-zA-Z_$][a-zA-Z0-9_$]{0,79}$/u;

/** Sanitized evaluator failure with no learner source or runtime stack. */
export class RoadHopperEvaluationError extends Error {
  readonly code: string;
  readonly outcome: "error" | "timeout";

  constructor(code: string, outcome: "error" | "timeout") {
    super(code);
    this.name = "RoadHopperEvaluationError";
    this.code = code;
    this.outcome = outcome;
  }
}

export function isRoadHopperEvaluationTimeout(
  value: unknown,
): value is RoadHopperEvaluationError {
  return value instanceof RoadHopperEvaluationError && value.outcome === "timeout";
}

interface ResolvedOptions {
  readonly operationTimeoutMs: number;
  readonly callbackDeadlineMs: number;
  readonly memoryLimitBytes: number;
  readonly stackLimitBytes: number;
  readonly maximumSessionMs: number;
}

function boundedOption(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RoadHopperEvaluationError("ROAD_HOPPER_EVALUATOR_INVALID_OPTIONS", "error");
  }
  return value;
}

function resolveOptions(options: RoadHopperEvaluatorOptionsV1): ResolvedOptions {
  return {
    operationTimeoutMs: boundedOption(
      options.operationTimeoutMs,
      ROAD_HOPPER_RUNTIME_LIMITS_V1.operationTimeoutMs,
      1,
      ROAD_HOPPER_RUNTIME_LIMITS_V1.operationTimeoutMs,
    ),
    callbackDeadlineMs: boundedOption(
      options.callbackDeadlineMs,
      ROAD_HOPPER_RUNTIME_LIMITS_V1.callbackDeadlineMs,
      1,
      ROAD_HOPPER_RUNTIME_LIMITS_V1.operationTimeoutMs,
    ),
    memoryLimitBytes: boundedOption(
      options.memoryLimitBytes,
      ROAD_HOPPER_RUNTIME_LIMITS_V1.memoryLimitBytes,
      4 * 1024 * 1024,
      ROAD_HOPPER_RUNTIME_LIMITS_V1.memoryLimitBytes,
    ),
    stackLimitBytes: boundedOption(
      options.stackLimitBytes,
      ROAD_HOPPER_RUNTIME_LIMITS_V1.stackLimitBytes,
      128 * 1024,
      ROAD_HOPPER_RUNTIME_LIMITS_V1.stackLimitBytes,
    ),
    maximumSessionMs: boundedOption(
      options.maximumSessionMs,
      ROAD_HOPPER_RUNTIME_LIMITS_V1.maximumSessionMs,
      1,
      ROAD_HOPPER_RUNTIME_LIMITS_V1.maximumSessionMs,
    ),
  };
}

function errorMessage(context: QuickJSContext, value: unknown): string {
  if (typeof value !== "object" || value === null) return "";
  try {
    const dumped = context.dump(value as never);
    if (typeof dumped === "string") return dumped;
    if (typeof dumped === "object" && dumped !== null) {
      const message = (dumped as Record<string, unknown>).message;
      return typeof message === "string" ? message : "";
    }
  } catch {
    return "";
  }
  return "";
}

function evaluationFailure(context: QuickJSContext, errorHandle: unknown): RoadHopperEvaluationError {
  const message = errorMessage(context, errorHandle);
  if (/interrupt|timeout|deadline/iu.test(message)) {
    return new RoadHopperEvaluationError("ROAD_HOPPER_EVALUATION_TIMEOUT", "timeout");
  }
  return new RoadHopperEvaluationError("ROAD_HOPPER_EVALUATION_FAILED", "error");
}

class QuickJsRoadHopperEvaluator implements RoadHopperEvaluatorV1 {
  readonly #runtime: QuickJSRuntime;
  readonly #context: QuickJSContext;
  readonly #options: ResolvedOptions;
  readonly #startedAt = Date.now();
  #disposed = false;

  constructor(
    runtime: QuickJSRuntime,
    context: QuickJSContext,
    options: ResolvedOptions,
  ) {
    this.#runtime = runtime;
    this.#context = context;
    this.#options = options;
  }

  evaluateFile(source: string, fileId: string): void {
    this.#assertActive();
    this.#setDeadline(this.#options.operationTimeoutMs);
    const evaluation = this.#context.evalCode(source, fileId, {
      type: "global",
      strict: true,
    });
    if (evaluation.error) {
      const failure = evaluationFailure(this.#context, evaluation.error);
      evaluation.error.dispose();
      throw failure;
    }
    evaluation.value.dispose();
  }

  call(functionName: string, args: readonly unknown[] = [], deadlineMs?: number): unknown {
    this.#assertActive();
    if (!callableNamePattern.test(functionName) || args.length > 16) {
      throw new RoadHopperEvaluationError("ROAD_HOPPER_EVALUATOR_INVALID_CALL", "error");
    }
    let serializedArgs: string;
    try {
      serializedArgs = JSON.stringify(args);
    } catch {
      throw new RoadHopperEvaluationError("ROAD_HOPPER_EVALUATOR_INVALID_ARGUMENT", "error");
    }
    if (serializedArgs.length > 256 * 1024) {
      throw new RoadHopperEvaluationError("ROAD_HOPPER_EVALUATOR_ARGUMENT_TOO_LARGE", "error");
    }
    this.#setDeadline(deadlineMs ?? this.#options.callbackDeadlineMs);
    const source = `(() => {
      const candidate = globalThis[${JSON.stringify(functionName)}];
      if (typeof candidate !== "function") throw new Error("MISSING_CALLBACK");
      const args = ${serializedArgs};
      const result = candidate(...args);
      const json = JSON.stringify(result);
      if (json === undefined) throw new Error("NON_JSON_RESULT");
      return json;
    })()`;
    const evaluation = this.#context.evalCode(source, "road-hopper-host-call.js", {
      type: "global",
      strict: true,
    });
    if (evaluation.error) {
      const failure = evaluationFailure(this.#context, evaluation.error);
      evaluation.error.dispose();
      throw failure;
    }
    const json = this.#context.dump(evaluation.value);
    evaluation.value.dispose();
    if (typeof json !== "string" || json.length > 512 * 1024) {
      throw new RoadHopperEvaluationError("ROAD_HOPPER_EVALUATOR_INVALID_RESULT", "error");
    }
    try {
      return JSON.parse(json) as unknown;
    } catch {
      throw new RoadHopperEvaluationError("ROAD_HOPPER_EVALUATOR_INVALID_RESULT", "error");
    }
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#context.dispose();
    this.#runtime.dispose();
  }

  #assertActive(): void {
    if (this.#disposed) {
      throw new RoadHopperEvaluationError("ROAD_HOPPER_EVALUATOR_DISPOSED", "error");
    }
    if (Date.now() - this.#startedAt > this.#options.maximumSessionMs) {
      throw new RoadHopperEvaluationError("ROAD_HOPPER_SESSION_TIMEOUT", "timeout");
    }
  }

  #setDeadline(deadlineMs: number): void {
    this.#runtime.setInterruptHandler(
      shouldInterruptAfterDeadline(Date.now() + deadlineMs),
    );
  }
}

/** Compile all six files into a fresh, JSON-only QuickJS evaluator. */
export async function createRoadHopperEvaluator(
  projectValue: RoadHopperProjectV1,
  options: RoadHopperEvaluatorOptionsV1 = {},
): Promise<RoadHopperEvaluatorV1> {
  const project = parseRoadHopperProject(projectValue);
  const resolved = resolveOptions(options);
  const quickJs = await getQuickJS();
  const runtime = quickJs.newRuntime();
  runtime.setMemoryLimit(resolved.memoryLimitBytes);
  runtime.setMaxStackSize(resolved.stackLimitBytes);
  const context = runtime.newContext();
  const evaluator = new QuickJsRoadHopperEvaluator(runtime, context, resolved);
  try {
    for (const [fileId, source] of Object.entries(project.files)) {
      evaluator.evaluateFile(source, fileId);
    }
    return evaluator;
  } catch (error) {
    evaluator.dispose();
    throw error;
  }
}

class RoadHopperProgramSession implements RoadHopperProgramSessionV1 {
  readonly #evaluator: RoadHopperEvaluatorV1;
  #state: unknown;

  constructor(evaluator: RoadHopperEvaluatorV1, state: unknown) {
    this.#evaluator = evaluator;
    this.#state = state;
  }

  async step(input?: RoadHopperInputCommandV1): Promise<RoadHopperFrameV1> {
    const parsedInput = input === undefined ? null : parseRoadHopperInputCommand(input);
    this.#state = this.#evaluator.call("updateRoadHopperGame", [this.#state, parsedInput]);
    return parseRoadHopperFrame(
      this.#evaluator.call("renderRoadHopperGame", [this.#state]),
    );
  }

  async restart(seed = 1): Promise<RoadHopperFrameV1> {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
      throw new RoadHopperEvaluationError("ROAD_HOPPER_INVALID_SEED", "error");
    }
    this.#state = this.#evaluator.call("createRoadHopperGame", [seed]);
    return parseRoadHopperFrame(
      this.#evaluator.call("renderRoadHopperGame", [this.#state]),
    );
  }

  dispose(): void {
    this.#evaluator.dispose();
  }
}

/** Create a preview session whose only output is a validated frame model. */
export async function createRoadHopperProgramSession(
  project: RoadHopperProjectV1,
  options: RoadHopperEvaluatorOptionsV1 = {},
): Promise<RoadHopperProgramSessionV1> {
  const evaluator = await createRoadHopperEvaluator(project, options);
  try {
    const state = evaluator.call("createRoadHopperGame", [1], options.operationTimeoutMs);
    return new RoadHopperProgramSession(evaluator, state);
  } catch (error) {
    evaluator.dispose();
    throw error;
  }
}
