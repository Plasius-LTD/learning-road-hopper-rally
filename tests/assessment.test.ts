import { describe, expect, it } from "vitest";
import {
  ROAD_HOPPER_RALLY_COURSE_V3,
  ROAD_HOPPER_RALLY_STARTER_PROJECT_V2,
  type RoadHopperProjectV1,
} from "../src/index.js";
import {
  assessRoadHopperProject,
  getRoadHopperAssessmentGoalIds,
} from "../src/server.js";

const referenceProject: RoadHopperProjectV1 = {
  schemaVersion: "1",
  starterRevision: "road-hopper-rally-v2.0.0-starter.1",
  files: {
    "board.js": `
function createBoard() {
  return {
    columns: 14,
    rows: 15,
    homeBays: [1, 4, 7, 10, 13],
    roadLanes: [8, 9, 10, 11, 12],
    riverLanes: [2, 3, 4, 5, 6]
  };
}`,
    "hopper.js": `
function moveHopper(hopper, action) {
  const next = { column: hopper.column, row: hopper.row };
  if (action === "up") next.row -= 1;
  if (action === "down") next.row += 1;
  if (action === "left") next.column -= 1;
  if (action === "right") next.column += 1;
  next.column = Math.max(0, Math.min(13, next.column));
  next.row = Math.max(0, Math.min(14, next.row));
  return next;
}`,
    "traffic.js": `
function updateTraffic(vehicles, tick, level) {
  return vehicles.map((vehicle) => ({
    ...vehicle,
    x: ((vehicle.x + vehicle.speed * (1 + level * 0.1)) % 14 + 14) % 14,
  }));
}
function hitsVehicle(hopper, vehicles) {
  return vehicles.some((vehicle) => vehicle.row === hopper.row && Math.abs(vehicle.x - hopper.column) < 0.75);
}`,
    "river.js": `
function updateRiver(platforms, tick, level) {
  return platforms.map((platform) => ({
    ...platform,
    x: (platform.x + platform.speed * (1 + level * 0.08) + 14) % 14,
    submerged: platform.dives === true && tick % 180 >= 145,
  }));
}
function findRiverSupport(hopper, platforms) {
  return platforms.find((platform) => !platform.submerged && platform.row === hopper.row && Math.abs(platform.x - hopper.column) <= platform.width / 2) || null;
}`,
    "rules.js": `
function applyRoadHopperRules(state, event) {
  const next = { ...state };
  if (event.type === "forward") next.score += 10;
  if (event.type === "home") next.score += 50 + event.timeBonus;
  if (event.type === "bonus") next.score += event.points;
  if (event.type === "death") next.lives -= 1;
  if (event.type === "timeout") next.lives -= 1;
  if (event.type === "level-complete") {
    next.level += 1;
    next.difficulty = 1 + next.level * 0.1;
  }
  next.gameOver = next.lives <= 0;
  return next;
}
function canEnterHome(homeIndex, occupiedHomes) {
  return homeIndex >= 0 && homeIndex < 5 && occupiedHomes[homeIndex] !== true;
}
function nextPlayer(currentPlayer) { return currentPlayer === 1 ? 2 : 1; }`,
    "game.js": `
function createRoadHopperGame(seed) {
  return {
    seed, tick: 0, score: 0, lives: 3, level: 1, difficulty: 1,
    currentPlayer: 1, gameOver: false,
    hopper: { column: 7, row: 14 },
    occupiedHomes: [false, false, false, false, false],
    timerTicksRemaining: 1800,
  };
}
function updateRoadHopperGame(state, input) {
  if (input && input.phase === "pressed" && input.action === "restart") {
    return createRoadHopperGame(state.seed);
  }
  if (input && input.phase === "pressed" && input.action === "pause") {
    return { ...state, paused: !state.paused };
  }
  if (state.paused) return { ...state };
  const next = { ...state, tick: state.tick + 1, timerTicksRemaining: state.timerTicksRemaining - 1 };
  if (input && input.phase === "pressed" && ["up", "down", "left", "right"].includes(input.action)) {
    next.hopper = moveHopper(state.hopper, input.action);
  }
  return next;
}
function renderRoadHopperGame(state) {
  return {
    tick: state.tick,
    drawCommands: [
      { kind: "rect", x: 0, y: 0, width: 448, height: 480, colour: "#0f172a" },
      { kind: "sprite", spriteId: "hopper", x: state.hopper.column * 32, y: state.hopper.row * 32, width: 32, height: 32 }
    ],
    audioCues: [],
    semanticState: {
      statusText: "Player " + state.currentPlayer + ", score " + state.score,
      score: state.score, lives: state.lives, level: state.level,
      currentPlayer: state.currentPlayer, paused: state.paused === true, gameOver: state.gameOver,
      timerTicksRemaining: state.timerTicksRemaining
    }
  };
}`,
  },
};

describe("server-only deterministic assessment", () => {
  it("requires learner work before any starter mission can pass", async () => {
    for (const mission of ROAD_HOPPER_RALLY_COURSE_V3.missions) {
      const scope = { kind: "mission" as const, missionId: mission.id };
      const result = await assessRoadHopperProject(
        ROAD_HOPPER_RALLY_STARTER_PROJECT_V2,
        scope,
      );

      expect(result.outcome).toBe("completed");
      expect(result.score).toBeLessThan(100);
      expect(result.completed).toBe(false);
      expect(result.failedGoalIds).toEqual(expect.arrayContaining(
        getRoadHopperAssessmentGoalIds(scope).filter(
          (goalId) => goalId !== "road-hopper-sandbox-safety",
        ),
      ));
    }
  });

  it("passes a complete mechanics-equivalent project", async () => {
    const result = await assessRoadHopperProject(referenceProject, {
      kind: "final",
    });

    expect(result.outcome).toBe("completed");
    expect(result.completed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.failedGoalIds).toEqual([]);
  });

  it("rejects shape-only board code that does not map the actual route", async () => {
    const project: RoadHopperProjectV1 = {
      ...referenceProject,
      files: {
        ...referenceProject.files,
        "board.js": `
function createBoard() {
  return {
    columns: 14,
    rows: 15,
    homeBays: [0, 1, 2, 3, 4],
    roadLanes: [0, 1, 2, 3, 4],
    riverLanes: [5, 6, 7, 8, 9]
  };
}`,
      },
    };

    const result = await assessRoadHopperProject(project, {
      kind: "mission",
      missionId: "road-hopper-board",
    });

    expect(result.failedGoalIds).toContain("road-hopper-board-complete");
    expect(result.score).toBeLessThan(100);
  });

  it("fails closed when learner code exceeds its execution deadline", async () => {
    const project: RoadHopperProjectV1 = {
      ...referenceProject,
      files: {
        ...referenceProject.files,
        "board.js": "function createBoard() { while (true) {} }",
      },
    };

    const result = await assessRoadHopperProject(project, { kind: "final" }, {
      operationTimeoutMs: 25,
    });

    expect(result.outcome).toBe("timeout");
    expect(result.completed).toBe(false);
    expect(result.score).toBeLessThan(80);
    expect(JSON.stringify(result)).not.toContain("while (true)");
  });
});
