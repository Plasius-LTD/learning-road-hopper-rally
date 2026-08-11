import { describe, expect, it } from "vitest";
import {
  createInitialRoadHopperState,
  renderRoadHopperFrame,
  stepRoadHopperState,
  type RoadHopperInputCommandV1,
} from "../src/index.js";

const input = (
  sequence: number,
  action: RoadHopperInputCommandV1["action"],
): RoadHopperInputCommandV1 => ({
  sequence,
  action,
  phase: "pressed",
  source: "assessment",
  atTick: sequence,
});

describe("trusted deterministic engine", () => {
  it("produces identical state and frames for the same seed and inputs", () => {
    let left = createInitialRoadHopperState({ seed: 42, practiceMode: true });
    let right = createInitialRoadHopperState({ seed: 42, practiceMode: true });
    const inputs = [input(1, "up"), input(2, "left"), input(3, "right")];

    for (const command of inputs) {
      left = stepRoadHopperState(left, [command]);
      right = stepRoadHopperState(right, [command]);
    }

    expect(left).toEqual(right);
    expect(renderRoadHopperFrame(left)).toEqual(renderRoadHopperFrame(right));
  });

  it("supports four-direction movement, pause, restart and bounded rendering", () => {
    let state = createInitialRoadHopperState({ seed: 7, practiceMode: true });
    const start = state.hopper;
    state = stepRoadHopperState(state, [input(1, "up")]);
    expect(state.hopper.row).toBe(start.row - 1);
    state = stepRoadHopperState(state, [input(2, "left")]);
    expect(state.hopper.column).toBe(start.column - 1);
    state = stepRoadHopperState(state, [input(3, "pause")]);
    expect(state.paused).toBe(true);
    const pausedTick = state.tick;
    state = stepRoadHopperState(state, []);
    expect(state.tick).toBe(pausedTick);
    state = stepRoadHopperState(state, [input(4, "restart")]);
    expect(state.tick).toBe(0);

    const frame = renderRoadHopperFrame(state);
    expect(frame.drawCommands.length).toBeLessThanOrEqual(512);
    expect(frame.audioCues.length).toBeLessThanOrEqual(16);
    expect(frame.semanticState.statusText.length).toBeLessThanOrEqual(240);
  });

  it("reduces time deterministically and applies the practice-speed factor", () => {
    let normal = createInitialRoadHopperState({ seed: 1, practiceMode: false });
    let practice = createInitialRoadHopperState({ seed: 1, practiceMode: true });

    for (let index = 0; index < 30; index += 1) {
      normal = stepRoadHopperState(normal, []);
      practice = stepRoadHopperState(practice, []);
    }

    expect(normal.timerTicksRemaining).toBeLessThan(
      practice.timerTicksRemaining,
    );
  });

  it("resolves traffic, river, timer, home and level transitions", () => {
    const base = createInitialRoadHopperState({ seed: 2, practiceMode: false });
    const vehicleDeath = stepRoadHopperState(
      {
        ...base,
        hopper: { column: 7, row: 8 },
        entities: [
          { id: "vehicle-test", kind: "vehicle", row: 8, x: 7, width: 2, speed: 0 },
        ],
      },
      [],
    );
    expect(vehicleDeath.lives).toBe(2);
    expect(vehicleDeath.currentPlayer).toBe(2);

    const waterDeath = stepRoadHopperState(
      { ...base, hopper: { column: 7, row: 2 }, entities: [] },
      [],
    );
    expect(waterDeath.lives).toBe(2);

    const supported = stepRoadHopperState(
      {
        ...base,
        hopper: { column: 7, row: 2 },
        entities: [
          { id: "log-test", kind: "log", row: 2, x: 7, width: 3, speed: 0.1 },
        ],
      },
      [],
    );
    expect(supported.lives).toBe(3);
    expect(supported.hopper.column).toBeGreaterThan(7);

    const timerDeath = stepRoadHopperState(
      { ...base, timerTicksRemaining: 1 },
      [],
    );
    expect(timerDeath.lives).toBe(2);
    expect(timerDeath.timerTicksRemaining).toBe(1800);

    const nextLevel = stepRoadHopperState(
      {
        ...base,
        hopper: { column: 13, row: 0 },
        occupiedHomes: [true, true, true, true, false],
      },
      [],
    );
    expect(nextLevel.level).toBe(2);
    expect(nextLevel.occupiedHomes).toEqual([false, false, false, false, false]);
    expect(nextLevel.score).toBeGreaterThan(50);
  });

  it("ignores released and stale input and resumes a paused game", () => {
    let state = createInitialRoadHopperState({ seed: 9, practiceMode: true });
    state = stepRoadHopperState(state, [input(10, "pause")]);
    expect(state.paused).toBe(true);
    state = stepRoadHopperState(state, [
      { ...input(9, "left"), phase: "released" },
      input(11, "pause"),
      input(12, "down"),
      input(13, "right"),
    ]);
    expect(state.paused).toBe(false);
    expect(state.hopper.row).toBe(14);
    expect(state.hopper.column).toBe(8);
  });
});
