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

function selectedGoals(scope: RoadHopperAssessmentScopeV1): readonly GoalDefinition[] {
  if (scope.kind === "final") return goals;
  return goals.filter(
    (goal) => goal.missionId === scope.missionId || goal.id === "road-hopper-sandbox-safety",
  );
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
        && numberArray(board.homeBays, 5)
        && numberArray(board.roadLanes, 5)
        && numberArray(board.riverLanes, 5)
        && new Set(board.homeBays).size === 5,
    );

    const start = { column: 7, row: 7 };
    const up = evaluator.call("moveHopper", [start, "up"]);
    const down = evaluator.call("moveHopper", [start, "down"]);
    const left = evaluator.call("moveHopper", [start, "left"]);
    const right = evaluator.call("moveHopper", [start, "right"]);
    const edge = evaluator.call("moveHopper", [{ column: 0, row: 0 }, "left"]);
    checks.set(
      "road-hopper-movement-complete",
      isRecord(up) && up.row === 6 && up.column === 7
        && isRecord(down) && down.row === 8
        && isRecord(left) && left.column === 6
        && isRecord(right) && right.column === 8
        && isRecord(edge) && edge.column === 0 && edge.row === 0,
    );

    const vehicles = [{ id: "v", row: 10, x: 7, speed: 0.25, width: 1.5 }];
    const updatedTraffic = evaluator.call("updateTraffic", [vehicles, 1, 2]);
    const collision = evaluator.call("hitsVehicle", [{ column: 7, row: 10 }, vehicles]);
    checks.set(
      "road-hopper-traffic-complete",
      Array.isArray(updatedTraffic)
        && updatedTraffic.length === 1
        && isRecord(updatedTraffic[0])
        && typeof updatedTraffic[0].x === "number"
        && updatedTraffic[0].x !== vehicles[0]?.x
        && collision === true,
    );

    const platforms = [{ id: "p", row: 4, x: 7, speed: 0.1, width: 3, dives: true }];
    const updatedRiver = evaluator.call("updateRiver", [platforms, 1, 2]);
    const support = evaluator.call("findRiverSupport", [
      { column: 7, row: 4 },
      [{ ...platforms[0], submerged: false }],
    ]);
    const submerged = evaluator.call("findRiverSupport", [
      { column: 7, row: 4 },
      [{ ...platforms[0], submerged: true }],
    ]);
    checks.set(
      "road-hopper-river-complete",
      Array.isArray(updatedRiver)
        && updatedRiver.length === 1
        && isRecord(updatedRiver[0])
        && updatedRiver[0].x !== platforms[0]?.x
        && isRecord(support)
        && submerged === null,
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
    const level = evaluator.call("applyRoadHopperRules", [rulesState, { type: "level-complete" }]);
    const available = evaluator.call("canEnterHome", [2, [false, false, false, false, false]]);
    const occupied = evaluator.call("canEnterHome", [2, [false, false, true, false, false]]);
    const secondPlayer = evaluator.call("nextPlayer", [1]);
    checks.set(
      "road-hopper-rules-complete",
      isRecord(home) && home.score === 80
        && isRecord(death) && death.lives === 2
        && isRecord(level) && level.level === 2
        && typeof level.difficulty === "number" && level.difficulty > 1
        && available === true && occupied === false && secondPlayer === 2,
    );

    const game = evaluator.call("createRoadHopperGame", [17], options.operationTimeoutMs);
    const nextGame = evaluator.call("updateRoadHopperGame", [
      game,
      { sequence: 1, action: "up", phase: "pressed", source: "assessment", atTick: 1 },
    ]);
    const frame = parseRoadHopperFrame(evaluator.call("renderRoadHopperGame", [nextGame]));
    checks.set(
      "road-hopper-game-complete",
      isRecord(game)
        && isRecord(nextGame)
        && nextGame.tick === 1
        && frame.drawCommands.length > 0
        && frame.semanticState.statusText.length > 0,
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
