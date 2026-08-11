import { describe, expect, it, vi } from "vitest";
import {
  createRoadHopperWorkerMessageHandler,
  installRoadHopperBrowserWorker,
  type RoadHopperWorkerResponseV1,
} from "../src/browser-worker.js";
import { ROAD_HOPPER_RALLY_STARTER_PROJECT_V1 } from "../src/index.js";

describe("browser worker protocol", () => {
  it("serializes compile, frame, restart and disposal", async () => {
    const responses: RoadHopperWorkerResponseV1[] = [];
    const dispose = vi.fn();
    const frame = {
      tick: 1,
      drawCommands: [],
      audioCues: [],
      semanticState: {
        statusText: "Ready",
        score: 0,
        lives: 3,
        level: 1,
        currentPlayer: 1 as const,
        paused: false,
        gameOver: false,
        timerTicksRemaining: 1800,
      },
    };
    const handler = createRoadHopperWorkerMessageHandler(
      (response) => responses.push(response),
      async () => ({
        step: async () => frame,
        restart: async () => ({ ...frame, tick: 0 }),
        dispose,
      }),
    );

    await handler({ data: { id: "c", type: "compile", project: ROAD_HOPPER_RALLY_STARTER_PROJECT_V1 } } as MessageEvent);
    await handler({ data: { id: "s", type: "step" } } as MessageEvent);
    await handler({ data: { id: "r", type: "restart", seed: 2 } } as MessageEvent);
    await handler({ data: { id: "d", type: "dispose" } } as MessageEvent);
    await handler({ data: { id: "x", type: "step" } } as MessageEvent);

    expect(responses.map((response) => response.outcome)).toEqual([
      "ready",
      "frame",
      "frame",
      "disposed",
      "error",
    ]);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("fails closed and drops malformed envelopes", async () => {
    const responses: RoadHopperWorkerResponseV1[] = [];
    const handler = createRoadHopperWorkerMessageHandler(
      (response) => responses.push(response),
      async () => {
        throw new Error("synthetic-person@example.test");
      },
    );
    await handler({ data: { id: "", type: "compile" } } as MessageEvent);
    await handler({ data: { id: "safe", type: "compile", project: ROAD_HOPPER_RALLY_STARTER_PROJECT_V1 } } as MessageEvent);
    expect(responses).toEqual([
      { id: "safe", outcome: "error", errorCode: "ROAD_HOPPER_WORKER_FAILED" },
    ]);
    expect(JSON.stringify(responses)).not.toContain("synthetic-person");
  });

  it("installs only when a browser host explicitly supplies its worker scope", () => {
    const scope = { onmessage: null, postMessage: vi.fn() };
    installRoadHopperBrowserWorker(scope);
    expect(scope.onmessage).toBeTypeOf("function");
  });
});
