import {
  createRoadHopperEvaluator,
  isRoadHopperEvaluationTimeout,
} from "./evaluator.js";
import type {
  RoadHopperAssessmentResultV1,
  RoadHopperAssessmentScopeV1,
  RoadHopperEvaluatorOptionsV1,
  RoadHopperProjectV1,
} from "./types.js";
import { parseRoadHopperFrame } from "./validation.js";

interface GoalDefinition {
  readonly id: string;
  readonly missionId: string;
  readonly points: number;
}

const goals: readonly GoalDefinition[] = [
  { id: "road-hopper-board-complete", missionId: "road-hopper-board", points: 15 },
  { id: "road-hopper-movement-complete", missionId: "road-hopper-movement", points: 15 },
  { id: "road-hopper-traffic-complete", missionId: "road-hopper-traffic", points: 15 },
  { id: "road-hopper-river-complete", missionId: "road-hopper-river", points: 15 },
  { id: "road-hopper-rules-complete", missionId: "road-hopper-rules", points: 20 },
  { id: "road-hopper-game-complete", missionId: "road-hopper-game", points: 15 },
  { id: "road-hopper-sandbox-safety", missionId: "road-hopper-game", points: 5 },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberArray(value: unknown, length: number): value is number[] {
  return Array.isArray(value)
    && value.length === length
    && value.every((entry) => Number.isFinite(entry));
}

function exactNumberArray(value: unknown, expected: readonly number[]): boolean {
  return numberArray(value, expected.length)
    && value.every((entry, index) => entry === expected[index]);
}

function finiteBetween(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value < maximum;
}

function selectedGoals(scope: RoadHopperAssessmentScopeV1): readonly GoalDefinition[] {
  if (scope.kind === "final") return goals;
  return goals.filter(
    (goal) => goal.missionId === scope.missionId || goal.id === "road-hopper-sandbox-safety",
  );
}

/** Server-only expected goal identifiers for a fail-closed worker boundary. */
export function getRoadHopperAssessmentGoalIds(
  scope: RoadHopperAssessmentScopeV1,
): readonly string[] {
  return Object.freeze(selectedGoals(scope).map((goal) => goal.id));
}

function failedResult(
  scope: RoadHopperAssessmentScopeV1,
  outcome: "error" | "timeout",
  errorCode: string,
): RoadHopperAssessmentResultV1 {
  return {
    schemaVersion: "1",
    outcome,
    score: 0,
    completed: false,
    passedGoalIds: [],
    failedGoalIds: selectedGoals(scope).map((goal) => goal.id),
    errorCode,
  };
}

/**
 * Re-execute a complete saved project through protected deterministic scenarios.
 * This entry point must remain server-only; no client evidence is accepted.
 */
export async function assessRoadHopperProject(
  project: RoadHopperProjectV1,
  scope: RoadHopperAssessmentScopeV1,
  options: RoadHopperEvaluatorOptionsV1 = {},
): Promise<RoadHopperAssessmentResultV1> {
  let evaluator: Awaited<ReturnType<typeof createRoadHopperEvaluator>> | undefined;
  try {
    evaluator = await createRoadHopperEvaluator(project, options);
    const checks = new Map<string, boolean>();

    const board = evaluator.call("createBoard", [], options.operationTimeoutMs);
    checks.set(
      "road-hopper-board-complete",
      isRecord(board)
        && board.columns === 14
        && board.rows === 15
        && exactNumberArray(board.homeBays, [1, 4, 7, 10, 13])
        && exactNumberArray(board.roadLanes, [8, 9, 10, 11, 12])
        && exactNumberArray(board.riverLanes, [2, 3, 4, 5, 6]),
    );

    const start = { column: 7, row: 7 };
    const up = evaluator.call("moveHopper", [start, "up"]);
    const down = evaluator.call("moveHopper", [start, "down"]);
    const left = evaluator.call("moveHopper", [start, "left"]);
    const right = evaluator.call("moveHopper", [start, "right"]);
    const edge = evaluator.call("moveHopper", [{ column: 0, row: 0 }, "left"]);
    const bottom = evaluator.call("moveHopper", [{ column: 13, row: 14 }, "down"]);
    const unknown = evaluator.call("moveHopper", [start, "wait"]);
    checks.set(
      "road-hopper-movement-complete",
      isRecord(up) && up.row === 6 && up.column === 7
        && isRecord(down) && down.row === 8
        && isRecord(left) && left.column === 6
        && isRecord(right) && right.column === 8
        && isRecord(edge) && edge.column === 0 && edge.row === 0
        && isRecord(bottom) && bottom.column === 13 && bottom.row === 14
        && isRecord(unknown) && unknown.column === 7 && unknown.row === 7,
    );

    const vehicles = [
      { id: "right", row: 10, x: 13.9, speed: 0.4, width: 1.5 },
      { id: "left", row: 11, x: 0.1, speed: -0.3, width: 1.25 },
    ];
    const updatedTraffic = evaluator.call("updateTraffic", [vehicles, 1, 2]);
    const collision = evaluator.call("hitsVehicle", [
      { column: 7, row: 10 },
      [{ id: "hit", row: 10, x: 7, speed: 0.25, width: 1.5 }],
    ]);
    const nearMiss = evaluator.call("hitsVehicle", [
      { column: 5, row: 10 },
      [{ id: "miss", row: 10, x: 7, speed: 0.25, width: 1.5 }],
    ]);
    const wrongLane = evaluator.call("hitsVehicle", [
      { column: 7, row: 9 },
      [{ id: "other-lane", row: 10, x: 7, speed: 0.25, width: 1.5 }],
    ]);
    checks.set(
      "road-hopper-traffic-complete",
      Array.isArray(updatedTraffic)
        && updatedTraffic.length === 2
        && isRecord(updatedTraffic[0])
        && isRecord(updatedTraffic[1])
        && updatedTraffic[0].id === "right" && updatedTraffic[0].row === 10
        && updatedTraffic[1].id === "left" && updatedTraffic[1].row === 11
        && finiteBetween(updatedTraffic[0].x, 0, 1)
        && finiteBetween(updatedTraffic[1].x, 13, 14)
        && collision === true && nearMiss === false && wrongLane === false,
    );

    const platforms = [
      { id: "diver", row: 4, x: 13.9, speed: 0.2, width: 3, dives: true },
      { id: "left-log", row: 5, x: 0.1, speed: -0.2, width: 3, dives: false },
    ];
    const updatedRiver = evaluator.call("updateRiver", [platforms, 150, 2]);
    const support = evaluator.call("findRiverSupport", [
      { column: 7, row: 4 },
      [{ id: "safe", row: 4, x: 7, speed: 0.1, width: 3, dives: true, submerged: false }],
    ]);
    const submerged = evaluator.call("findRiverSupport", [
      { column: 7, row: 4 },
      [{ id: "submerged", row: 4, x: 7, speed: 0.1, width: 3, dives: true, submerged: true }],
    ]);
    const wrongRowSupport = evaluator.call("findRiverSupport", [
      { column: 7, row: 3 },
      [{ id: "wrong-row", row: 4, x: 7, speed: 0.1, width: 3, submerged: false }],
    ]);
    checks.set(
      "road-hopper-river-complete",
      Array.isArray(updatedRiver)
        && updatedRiver.length === 2
        && isRecord(updatedRiver[0])
        && isRecord(updatedRiver[1])
        && finiteBetween(updatedRiver[0].x, 0, 1)
        && finiteBetween(updatedRiver[1].x, 13, 14)
        && updatedRiver[0].submerged === true
        && updatedRiver[1].submerged === false
        && isRecord(support)
        && submerged === null && wrongRowSupport === null,
    );

    const rulesState = {
      score: 0,
      lives: 3,
      level: 1,
      difficulty: 1,
      gameOver: false,
    };
    const home = evaluator.call("applyRoadHopperRules", [
      rulesState,
      { type: "home", timeBonus: 30 },
    ]);
    const death = evaluator.call("applyRoadHopperRules", [rulesState, { type: "death" }]);
    const finalDeath = evaluator.call("applyRoadHopperRules", [{ ...rulesState, score: 120, lives: 1 }, { type: "death" }]);
    const timeout = evaluator.call("applyRoadHopperRules", [rulesState, { type: "timeout" }]);
    const bonus = evaluator.call("applyRoadHopperRules", [rulesState, { type: "bonus", points: 25 }]);
    const level = evaluator.call("applyRoadHopperRules", [rulesState, { type: "level-complete" }]);
    const available = evaluator.call("canEnterHome", [2, [false, false, false, false, false]]);
    const occupied = evaluator.call("canEnterHome", [2, [false, false, true, false, false]]);
    const secondPlayer = evaluator.call("nextPlayer", [1]);
    const firstPlayer = evaluator.call("nextPlayer", [2]);
    checks.set(
      "road-hopper-rules-complete",
      isRecord(home) && home.score === 80
        && isRecord(death) && death.lives === 2
        && isRecord(finalDeath) && finalDeath.lives === 0 && finalDeath.gameOver === true && finalDeath.score === 120
        && isRecord(timeout) && timeout.lives === 2
        && isRecord(bonus) && bonus.score === 25
        && isRecord(level) && level.level === 2
        && typeof level.difficulty === "number" && level.difficulty > 1
        && available === true && occupied === false
        && secondPlayer === 2 && firstPlayer === 1,
    );

    const game = evaluator.call("createRoadHopperGame", [17], options.operationTimeoutMs);
    const nextGame = evaluator.call("updateRoadHopperGame", [
      game,
      { sequence: 1, action: "up", phase: "pressed", source: "assessment", atTick: 1 },
    ]);
    const frame = parseRoadHopperFrame(evaluator.call("renderRoadHopperGame", [nextGame]));
    const pausedGame = evaluator.call("updateRoadHopperGame", [nextGame, {
      sequence: 2, action: "pause", phase: "pressed", source: "assessment", atTick: 2,
    }]);
    const pausedMove = evaluator.call("updateRoadHopperGame", [pausedGame, {
      sequence: 3, action: "left", phase: "pressed", source: "assessment", atTick: 3,
    }]);
    const pausedFrame = parseRoadHopperFrame(evaluator.call("renderRoadHopperGame", [pausedGame]));
    const restartedGame = evaluator.call("updateRoadHopperGame", [pausedMove, {
      sequence: 4, action: "restart", phase: "pressed", source: "assessment", atTick: 4,
    }]);
    checks.set(
      "road-hopper-game-complete",
      isRecord(game)
        && isRecord(nextGame)
        && nextGame.tick === 1
        && isRecord(game.hopper) && isRecord(nextGame.hopper)
        && nextGame.hopper.row === Number(game.hopper.row) - 1
        && nextGame.timerTicksRemaining === Number(game.timerTicksRemaining) - 1
        && frame.drawCommands.length > 0
        && frame.semanticState.statusText.length > 0
        && isRecord(pausedGame) && pausedGame.paused === true
        && isRecord(pausedMove) && isRecord(pausedMove.hopper)
        && pausedMove.hopper.column === nextGame.hopper.column
        && pausedMove.hopper.row === nextGame.hopper.row
        && pausedFrame.semanticState.paused === true
        && isRecord(restartedGame) && restartedGame.tick === 0
        && restartedGame.score === 0 && restartedGame.lives === 3,
    );
    checks.set("road-hopper-sandbox-safety", true);

    const selected = selectedGoals(scope);
    const passedGoalIds = selected
      .filter((goal) => checks.get(goal.id) === true)
      .map((goal) => goal.id);
    const failedGoalIds = selected
      .filter((goal) => checks.get(goal.id) !== true)
      .map((goal) => goal.id);
    const availablePoints = selected.reduce((total, goal) => total + goal.points, 0);
    const passedPoints = selected
      .filter((goal) => checks.get(goal.id) === true)
      .reduce((total, goal) => total + goal.points, 0);
    const score = availablePoints === 0
      ? 0
      : Math.round((passedPoints / availablePoints) * 100);
    const completed = scope.kind === "final"
      && score >= 80
      && failedGoalIds.length === 0
      && checks.get("road-hopper-sandbox-safety") === true;
    return {
      schemaVersion: "1",
      outcome: "completed",
      score,
      completed,
      passedGoalIds,
      failedGoalIds,
    };
  } catch (error) {
    return failedResult(
      scope,
      isRoadHopperEvaluationTimeout(error) ? "timeout" : "error",
      isRoadHopperEvaluationTimeout(error)
        ? "ROAD_HOPPER_ASSESSMENT_TIMEOUT"
        : "ROAD_HOPPER_ASSESSMENT_FAILED",
    );
  } finally {
    evaluator?.dispose();
  }
}
