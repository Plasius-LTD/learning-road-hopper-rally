import type { RoadHopperProjectV1 } from "./types.js";

const boardSource = `// Mission 1: describe the Rally board.
function createBoard() {
  return {
    columns: 14,
    rows: 15,
    homeBays: [1, 4, 7, 10, 13],
    roadLanes: [10, 11, 12], // TODO: add rows 8 and 9
    riverLanes: [4, 5, 6],  // TODO: add rows 2 and 3
  };
}`;

const hopperSource = `// Mission 2: move one tile for every pressed direction.
function moveHopper(hopper, action) {
  const next = { column: hopper.column, row: hopper.row };
  if (action === "up") next.row -= 1;
  // TODO: add down, left and right.
  next.column = Math.max(0, Math.min(13, next.column));
  next.row = Math.max(0, Math.min(14, next.row));
  return next;
}`;

const trafficSource = `// Mission 3: update traffic and detect collisions.
function updateTraffic(vehicles, tick, level) {
  return vehicles; // TODO: move, speed up and wrap every vehicle.
}
function hitsVehicle(hopper, vehicles) {
  return false; // TODO: test the hopper against its traffic lane.
}`;

const riverSource = `// Mission 4: carry the hopper on safe river platforms.
function updateRiver(platforms, tick, level) {
  return platforms; // TODO: move, wrap and submerge platforms.
}
function findRiverSupport(hopper, platforms) {
  return null; // TODO: return the safe platform beneath the hopper.
}`;

const rulesSource = `// Mission 5: scoring, homes, lives, bonuses and levels.
function applyRoadHopperRules(state, event) {
  return { ...state }; // TODO: apply every rule event.
}
function canEnterHome(homeIndex, occupiedHomes) {
  return false; // TODO: allow one safe landing in each of five homes.
}
function nextPlayer(currentPlayer) {
  return 1; // TODO: alternate players after a lost life.
}`;

const gameSource = `// Mission 6: assemble the complete game.
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
  return { ...state, tick: state.tick + 1 }; // TODO: update every system.
}
function renderRoadHopperGame(state) {
  return {
    tick: state.tick,
    drawCommands: [], // TODO: draw the board, entities and hopper.
    audioCues: [],
    semanticState: {
      statusText: "Road Hopper Rally project started",
      score: state.score, lives: state.lives, level: state.level,
      currentPlayer: state.currentPlayer, paused: false,
      gameOver: state.gameOver,
      timerTicksRemaining: state.timerTicksRemaining,
    },
  };
}`;

/** Immutable starter project reset and new-attempt adapters must copy. */
export const ROAD_HOPPER_RALLY_STARTER_PROJECT_V1: RoadHopperProjectV1 =
  Object.freeze({
    schemaVersion: "1",
    starterRevision: "road-hopper-rally-v2.0.0-starter.1",
    files: Object.freeze({
      "board.js": boardSource,
      "hopper.js": hopperSource,
      "traffic.js": trafficSource,
      "river.js": riverSource,
      "rules.js": rulesSource,
      "game.js": gameSource,
    }),
  });

/** Immutable diagnostic baseline for the additive evidence-led 2.1 course. */
export const ROAD_HOPPER_RALLY_STARTER_PROJECT_V2: RoadHopperProjectV1 =
  Object.freeze({
    schemaVersion: "1",
    starterRevision: "road-hopper-rally-v2.1.0-starter.1",
    files: ROAD_HOPPER_RALLY_STARTER_PROJECT_V1.files,
  });
