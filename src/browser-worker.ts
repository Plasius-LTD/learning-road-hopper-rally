import { createRoadHopperProgramSession } from "./evaluator.js";
import type {
  RoadHopperEvaluatorOptionsV1,
  RoadHopperFrameV1,
  RoadHopperInputCommandV1,
  RoadHopperProgramSessionV1,
  RoadHopperProjectV1,
} from "./types.js";

export type RoadHopperWorkerRequestV1 =
  | {
      readonly id: string;
      readonly type: "compile";
      readonly project: RoadHopperProjectV1;
      readonly options?: RoadHopperEvaluatorOptionsV1;
    }
  | {
      readonly id: string;
      readonly type: "step";
      readonly input?: RoadHopperInputCommandV1;
    }
  | {
      readonly id: string;
      readonly type: "restart";
      readonly seed?: number;
    }
  | { readonly id: string; readonly type: "dispose" };

export type RoadHopperWorkerResponseV1 =
  | {
      readonly id: string;
      readonly outcome: "ready" | "frame" | "disposed";
      readonly frame?: RoadHopperFrameV1;
    }
  | {
      readonly id: string;
      readonly outcome: "error" | "timeout";
      readonly errorCode: string;
    };

type SessionFactory = typeof createRoadHopperProgramSession;

function safeFailure(
  id: string,
  value: unknown,
): RoadHopperWorkerResponseV1 {
  if (
    typeof value === "object"
    && value !== null
    && "outcome" in value
    && (value.outcome === "error" || value.outcome === "timeout")
    && "code" in value
    && typeof value.code === "string"
  ) {
    return { id, outcome: value.outcome, errorCode: value.code };
  }
  return { id, outcome: "error", errorCode: "ROAD_HOPPER_WORKER_FAILED" };
}

/** Create a stateful handler for one disposable browser worker. */
export function createRoadHopperWorkerMessageHandler(
  postMessage: (response: RoadHopperWorkerResponseV1) => void,
  createSession: SessionFactory = createRoadHopperProgramSession,
): (event: MessageEvent<RoadHopperWorkerRequestV1>) => Promise<void> {
  let session: RoadHopperProgramSessionV1 | undefined;
  return async (event) => {
    const request = event.data;
    if (
      typeof request !== "object"
      || request === null
      || typeof request.id !== "string"
      || request.id.length < 1
      || request.id.length > 100
    ) return;
    try {
      if (request.type === "compile") {
        session?.dispose();
        session = await createSession(request.project, request.options);
        postMessage({ id: request.id, outcome: "ready" });
        return;
      }
      if (request.type === "dispose") {
        session?.dispose();
        session = undefined;
        postMessage({ id: request.id, outcome: "disposed" });
        return;
      }
      if (!session) {
        postMessage({
          id: request.id,
          outcome: "error",
          errorCode: "ROAD_HOPPER_WORKER_NOT_COMPILED",
        });
        return;
      }
      const frame = request.type === "step"
        ? await session.step(request.input)
        : await session.restart(request.seed);
      postMessage({ id: request.id, outcome: "frame", frame });
    } catch (error) {
      session?.dispose();
      session = undefined;
      postMessage(safeFailure(request.id, error));
    }
  };
}

export interface RoadHopperWorkerScopeV1 {
  onmessage: ((event: MessageEvent<RoadHopperWorkerRequestV1>) => void) | null;
  postMessage(response: RoadHopperWorkerResponseV1): void;
}

/** Install the package handler into an explicit WorkerGlobalScope-like object. */
export function installRoadHopperBrowserWorker(
  scope: RoadHopperWorkerScopeV1,
): void {
  const handler = createRoadHopperWorkerMessageHandler((response) => {
    scope.postMessage(response);
  });
  scope.onmessage = (event) => {
    void handler(event);
  };
}
