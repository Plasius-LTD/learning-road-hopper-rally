import type {
  RoadHopperAudioCueV1,
  RoadHopperDrawCommandV1,
  RoadHopperEntityV1,
  RoadHopperFrameV1,
  RoadHopperInputCommandV1,
  RoadHopperStateV1,
} from "./types.js";

const BOARD_COLUMNS = 14;
const BOARD_ROWS = 15;
const TILE_SIZE = 32;
const START_COLUMN = 7;
const START_ROW = 14;
const ROUND_TIMER_TICKS = 1_800;
const HOME_COLUMNS = [1, 4, 7, 10, 13] as const;
const ROAD_ROWS = [8, 9, 10, 11, 12] as const;
const RIVER_ROWS = [2, 3, 4, 5, 6] as const;

function nextRandom(seed: number): number {
  return (Math.imul(seed >>> 0, 1_664_525) + 1_013_904_223) >>> 0;
}

function wrap(value: number, maximum: number): number {
  return ((value % maximum) + maximum) % maximum;
}

function initialEntities(seed: number): readonly RoadHopperEntityV1[] {
  const entities: RoadHopperEntityV1[] = [];
  let random = seed >>> 0;
  for (const [laneIndex, row] of ROAD_ROWS.entries()) {
    for (let item = 0; item < 3; item += 1) {
      random = nextRandom(random);
      entities.push({
        id: `vehicle-${laneIndex}-${item}`,
        kind: "vehicle",
        row,
        x: wrap((random % 1_400) / 100 + item * 4, BOARD_COLUMNS),
        width: item === 2 ? 1.7 : 1.25,
        speed: (laneIndex % 2 === 0 ? 1 : -1) * (0.025 + laneIndex * 0.004),
      });
    }
  }
  for (const [laneIndex, row] of RIVER_ROWS.entries()) {
    for (let item = 0; item < 2; item += 1) {
      random = nextRandom(random);
      const kind = laneIndex === 4 && item === 1
        ? "gator"
        : laneIndex % 2 === 0
          ? "log"
          : "turtle";
      entities.push({
        id: `${kind}-${laneIndex}-${item}`,
        kind,
        row,
        x: wrap((random % 1_400) / 100 + item * 7, BOARD_COLUMNS),
        width: kind === "log" ? 3.25 : kind === "gator" ? 2.5 : 2.25,
        speed: (laneIndex % 2 === 0 ? -1 : 1) * (0.018 + laneIndex * 0.003),
        ...(kind === "turtle" ? { submerged: false } : {}),
      });
    }
  }
  return entities;
}

export interface CreateRoadHopperStateOptionsV1 {
  readonly seed: number;
  readonly practiceMode: boolean;
}

/** Create a complete deterministic classic-mechanics state. */
export function createInitialRoadHopperState(
  options: CreateRoadHopperStateOptionsV1,
): RoadHopperStateV1 {
  const seed = Number.isInteger(options.seed) ? options.seed >>> 0 : 0;
  return {
    schemaVersion: "1",
    seed,
    practiceMode: options.practiceMode,
    tick: 0,
    paused: false,
    score: 0,
    lives: 3,
    level: 1,
    currentPlayer: 1,
    gameOver: false,
    timerTicksRemaining: ROUND_TIMER_TICKS,
    hopper: { column: START_COLUMN, row: START_ROW },
    occupiedHomes: [false, false, false, false, false],
    entities: initialEntities(seed),
    pendingAudioCues: [],
    lastInputSequence: -1,
  };
}

function cue(assetId: string, caption: string, category: RoadHopperAudioCueV1["category"] = "sfx"): RoadHopperAudioCueV1 {
  return {
    cueId: `${assetId}-${caption.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`.slice(0, 80),
    assetId,
    category,
    caption,
  };
}

function distanceOnWrappedBoard(left: number, right: number): number {
  const direct = Math.abs(left - right);
  return Math.min(direct, BOARD_COLUMNS - direct);
}

function resetHopper(state: RoadHopperStateV1, reason: string): RoadHopperStateV1 {
  const lives = Math.max(0, state.lives - 1);
  return {
    ...state,
    lives,
    currentPlayer: state.currentPlayer === 1 ? 2 : 1,
    gameOver: lives === 0,
    timerTicksRemaining: ROUND_TIMER_TICKS,
    hopper: { column: START_COLUMN, row: START_ROW },
    pendingAudioCues: [cue("danger", reason)],
  };
}

function moveEntities(state: RoadHopperStateV1, tick: number): readonly RoadHopperEntityV1[] {
  const difficulty = 1 + (state.level - 1) * 0.1;
  return state.entities.map((entity) => ({
    ...entity,
    x: wrap(entity.x + entity.speed * difficulty, BOARD_COLUMNS),
    ...(entity.kind === "turtle"
      ? { submerged: tick % 180 >= 145 }
      : {}),
  }));
}

function resolveWorld(state: RoadHopperStateV1): RoadHopperStateV1 {
  const { hopper } = state;
  if (ROAD_ROWS.includes(hopper.row as (typeof ROAD_ROWS)[number])) {
    const collision = state.entities.some(
      (entity) => entity.kind === "vehicle"
        && entity.row === hopper.row
        && distanceOnWrappedBoard(entity.x, hopper.column) <= entity.width / 2,
    );
    if (collision) return resetHopper(state, "Traffic collision");
  }

  if (RIVER_ROWS.includes(hopper.row as (typeof RIVER_ROWS)[number])) {
    const support = state.entities.find(
      (entity) => entity.row === hopper.row
        && entity.kind !== "vehicle"
        && !entity.submerged
        && distanceOnWrappedBoard(entity.x, hopper.column) <= entity.width / 2,
    );
    if (!support) return resetHopper(state, "Water hazard");
    const carriedColumn = hopper.column + support.speed * (1 + (state.level - 1) * 0.1);
    if (carriedColumn < -0.5 || carriedColumn > BOARD_COLUMNS - 0.5) {
      return resetHopper(state, "River edge");
    }
    return { ...state, hopper: { ...hopper, column: carriedColumn } };
  }

  if (hopper.row === 0) {
    const homeIndex = HOME_COLUMNS.findIndex(
      (column) => Math.abs(column - hopper.column) <= 0.75,
    );
    if (homeIndex < 0 || state.occupiedHomes[homeIndex]) {
      return resetHopper(state, "Blocked home");
    }
    const homes = [...state.occupiedHomes];
    homes[homeIndex] = true;
    const completedLevel = homes.every(Boolean);
    const timeBonus = Math.floor(state.timerTicksRemaining / 30) * 10;
    return {
      ...state,
      score: state.score + 50 + timeBonus,
      level: completedLevel ? state.level + 1 : state.level,
      occupiedHomes: completedLevel ? [false, false, false, false, false] : homes,
      hopper: { column: START_COLUMN, row: START_ROW },
      timerTicksRemaining: ROUND_TIMER_TICKS,
      pendingAudioCues: [
        cue(completedLevel ? "level" : "home", completedLevel ? "Next rally level" : "Home reached"),
      ],
    };
  }
  return state;
}

function applyDirectionalInput(
  state: RoadHopperStateV1,
  input: RoadHopperInputCommandV1,
): RoadHopperStateV1 {
  if (input.phase !== "pressed" || state.gameOver) return state;
  if (input.action === "pause") {
    return {
      ...state,
      paused: !state.paused,
      pendingAudioCues: [cue("pause", state.paused ? "Game resumed" : "Game paused", "ui")],
    };
  }
  if (input.action === "restart") {
    return createInitialRoadHopperState({ seed: state.seed, practiceMode: state.practiceMode });
  }
  if (state.paused) return state;
  const previousRow = state.hopper.row;
  const next = { ...state.hopper };
  if (input.action === "up") next.row -= 1;
  if (input.action === "down") next.row += 1;
  if (input.action === "left") next.column -= 1;
  if (input.action === "right") next.column += 1;
  next.column = Math.max(0, Math.min(BOARD_COLUMNS - 1, next.column));
  next.row = Math.max(0, Math.min(BOARD_ROWS - 1, next.row));
  return {
    ...state,
    hopper: next,
    score: state.score + (next.row < previousRow ? 10 : 0),
    pendingAudioCues: [cue("hop", "Hop")],
  };
}

/** Apply at most one tick of ordered input and world simulation. */
export function stepRoadHopperState(
  current: RoadHopperStateV1,
  inputs: readonly RoadHopperInputCommandV1[],
): RoadHopperStateV1 {
  const ordered = [...inputs]
    .filter((input) => input.sequence > current.lastInputSequence)
    .sort((left, right) => left.sequence - right.sequence)
    .slice(0, 64);
  let state: RoadHopperStateV1 = { ...current, pendingAudioCues: [] };
  for (const input of ordered) {
    state = applyDirectionalInput(state, input);
    state = { ...state, lastInputSequence: input.sequence };
    if (input.action === "restart" && input.phase === "pressed") return state;
  }
  if (state.paused || state.gameOver) return state;

  const tick = state.tick + 1;
  const timerDelta = state.practiceMode ? (tick % 2 === 0 ? 1 : 0) : 1;
  state = {
    ...state,
    tick,
    timerTicksRemaining: Math.max(0, state.timerTicksRemaining - timerDelta),
    entities: moveEntities(state, tick),
  };
  if (state.timerTicksRemaining === 0) return resetHopper(state, "Timer expired");
  return resolveWorld(state);
}

function laneCommands(): RoadHopperDrawCommandV1[] {
  const commands: RoadHopperDrawCommandV1[] = [
    { kind: "rect", x: 0, y: 0, width: 448, height: 480, colour: "#0f172a" },
    { kind: "rect", x: 0, y: 224, width: 448, height: 32, colour: "#65a30d" },
    { kind: "rect", x: 0, y: 416, width: 448, height: 64, colour: "#166534" },
  ];
  for (const row of ROAD_ROWS) {
    commands.push({ kind: "rect", x: 0, y: row * TILE_SIZE, width: 448, height: 32, colour: row % 2 === 0 ? "#334155" : "#475569" });
  }
  for (const row of RIVER_ROWS) {
    commands.push({ kind: "rect", x: 0, y: row * TILE_SIZE, width: 448, height: 32, colour: row % 2 === 0 ? "#075985" : "#0369a1" });
  }
  return commands;
}

/** Render trusted state without exposing a canvas or DOM object. */
export function renderRoadHopperFrame(state: RoadHopperStateV1): RoadHopperFrameV1 {
  const drawCommands = laneCommands();
  for (const [index, column] of HOME_COLUMNS.entries()) {
    drawCommands.push({
      kind: "sprite",
      spriteId: state.occupiedHomes[index] ? "hopper" : "home",
      x: column * TILE_SIZE,
      y: 0,
      width: TILE_SIZE,
      height: TILE_SIZE,
    });
  }
  for (const entity of state.entities) {
    if (entity.submerged) continue;
    drawCommands.push({
      kind: "sprite",
      spriteId: entity.kind,
      x: entity.x * TILE_SIZE,
      y: entity.row * TILE_SIZE,
      width: Math.min(128, entity.width * TILE_SIZE),
      height: TILE_SIZE,
    });
  }
  drawCommands.push({
    kind: "sprite",
    spriteId: "hopper",
    x: state.hopper.column * TILE_SIZE,
    y: state.hopper.row * TILE_SIZE,
    width: TILE_SIZE,
    height: TILE_SIZE,
  });
  drawCommands.push({
    kind: "text",
    text: `P${state.currentPlayer} Score ${state.score} Lives ${state.lives} Level ${state.level}`,
    x: 8,
    y: 472,
    colour: "#f8fafc",
  });
  const statusText = state.gameOver
    ? `Game over. Player ${state.currentPlayer}, score ${state.score}.`
    : state.paused
      ? `Paused. Player ${state.currentPlayer}, score ${state.score}, ${state.lives} lives.`
      : `Player ${state.currentPlayer}, score ${state.score}, ${state.lives} lives, level ${state.level}, timer ${state.timerTicksRemaining}.`;
  return {
    tick: state.tick,
    drawCommands: drawCommands.slice(0, 512),
    audioCues: state.pendingAudioCues.slice(0, 16),
    semanticState: {
      statusText,
      score: state.score,
      lives: state.lives,
      level: state.level,
      currentPlayer: state.currentPlayer,
      paused: state.paused,
      gameOver: state.gameOver,
      timerTicksRemaining: state.timerTicksRemaining,
    },
  };
}
