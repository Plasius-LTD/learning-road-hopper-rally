import type { MissionStageKindV1 } from "@plasius/learning";
import {
  ROAD_HOPPER_MISSION_STAGE_ORDER_V2,
  ROAD_HOPPER_RUNTIME_LIMITS_V1,
} from "./constants.js";
import { ROAD_HOPPER_RALLY_COURSE_V2 } from "./course.js";
import { ROAD_HOPPER_RALLY_STARTER_PROJECT_V2 } from "./starter.js";
import type {
  RoadHopperChoiceCheckV1,
  RoadHopperCourseManifestV3,
  RoadHopperFileIdV1,
  RoadHopperLearnerCourseProjectionV3,
  RoadHopperMissionV3,
  RoadHopperStageActivityV1,
} from "./types.js";

interface EvidenceSeed {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly fileId: RoadHopperFileIdV1;
  readonly concepts: readonly string[];
  readonly readinessPrompt: string;
  readonly goal: string;
  readonly protectedGoal: string;
  readonly lesson: readonly string[];
  readonly learnCheck: RoadHopperChoiceCheckV1;
  readonly predictionScenario: string;
  readonly predictionCheck: RoadHopperChoiceCheckV1;
  readonly callbacks: readonly string[];
  readonly buildTask: string;
  readonly successCriteria: readonly string[];
  readonly runTask: string;
  readonly runObservations: readonly string[];
  readonly assessmentGoalId: string;
  readonly inspectTask: string;
  readonly inspectCheck: RoadHopperChoiceCheckV1;
  readonly fixTask: string;
  readonly fixHint: string;
  readonly explainPrompt: string;
  readonly explanationPoints: readonly string[];
  readonly rewardMessage: string;
}

function choices(
  prompt: string,
  correct: readonly [string, string, string],
  ...incorrect: readonly (readonly [string, string, string])[]
): RoadHopperChoiceCheckV1 {
  return {
    prompt,
    options: [
      { id: correct[0], label: correct[1], feedback: correct[2], correct: true },
      ...incorrect.map(([id, label, feedback]) => ({ id, label, feedback, correct: false })),
    ],
  };
}

const evidenceSeeds: readonly EvidenceSeed[] = [
  {
    id: "road-hopper-board",
    title: "Map the Rally Route",
    summary: "Build the coordinate grid, safe strips, five homes, road and river.",
    fileId: "board.js",
    concepts: ["coordinates", "arrays", "data modelling", "functions"],
    readinessPrompt: "Which coordinate changes when the hopper moves upward?",
    goal: "Create fourteen columns, fifteen rows, five road lanes, five river lanes and five homes.",
    protectedGoal: "The board structure remains complete and bounded for every protected seed.",
    lesson: [
      "The board uses columns 0–13 and rows 0–14, so every location has one unambiguous coordinate.",
      "The road occupies rows 8–12, the river occupies rows 2–6, and the remaining strips separate hazards.",
      "Five unique home-bay columns finish a crossing; arrays keep those repeated locations testable.",
    ],
    learnCheck: choices(
      "Which array describes every road lane without including a safe strip?",
      ["road-five", "[8, 9, 10, 11, 12]", "Correct: those are the five consecutive road rows."],
      ["road-three", "[10, 11, 12]", "That leaves two required traffic lanes out."],
      ["road-safe", "[7, 8, 9, 10, 11]", "Row 7 is the median, not a road lane."],
    ),
    predictionScenario: "The hopper is at column 7, row 14 and moves upward once.",
    predictionCheck: choices(
      "What coordinate should the next state contain?",
      ["board-up", "column 7, row 13", "Correct: moving up decreases the row by one."],
      ["board-column", "column 6, row 14", "That predicts a left move."],
      ["board-wrap", "column 7, row 0", "Movement is one tile; it does not wrap between board edges."],
    ),
    callbacks: ["createBoard"],
    buildTask: "Complete createBoard so it returns the exact board dimensions, five unique home bays, five road rows, and five river rows.",
    successCriteria: ["14 columns and 15 rows", "road rows 8–12", "river rows 2–6", "five unique in-bounds home bays"],
    runTask: "Run the project after changing board.js and compare the board bands with your prediction.",
    runObservations: ["The preview starts without an evaluator error.", "The semantic status remains readable even before later systems are complete."],
    assessmentGoalId: "road-hopper-board-complete",
    inspectTask: "Use the failed goal and returned board data to locate the first structural mismatch.",
    inspectCheck: choices(
      "createBoard returns only three road rows. What is the smallest responsible fix?",
      ["board-array", "Add rows 8 and 9 to roadLanes", "Correct: the missing data belongs in the road-lane array."],
      ["board-rows", "Change rows from 15 to 17", "The board already has the required height."],
      ["board-render", "Add a draw command in game.js", "Rendering cannot repair incorrect board state."],
    ),
    fixTask: "Correct only the first board mismatch, rerun, then recheck the mission until the protected board goal passes.",
    fixHint: "Count the entries and check each value against the row ranges before changing dimensions.",
    explainPrompt: "Explain why board dimensions and lane arrays are state, while drawing those lanes is presentation.",
    explanationPoints: ["coordinates identify state", "arrays model repeated lanes", "rendering reads rather than owns board rules"],
    rewardMessage: "Route Mapper milestone: your board data now defines every safe and hazardous band.",
  },
  {
    id: "road-hopper-movement",
    title: "Move the Hopper",
    summary: "Connect touch and keyboard commands to bounded tile movement.",
    fileId: "hopper.js",
    concepts: ["events", "state", "conditions", "bounds"],
    readinessPrompt: "What should happen when a pressed direction would leave the board?",
    goal: "Move exactly one tile in four directions without leaving the board.",
    protectedGoal: "Movement is deterministic, source-independent and safe at every edge.",
    lesson: [
      "An input action describes intent; moveHopper converts that intent into a new coordinate.",
      "Keyboard and touch both use the same up, down, left, and right action names.",
      "Clamping after the move keeps columns in 0–13 and rows in 0–14 without mutating the old state.",
    ],
    learnCheck: choices(
      "Why should moveHopper return a new object?",
      ["move-copy", "So the previous state stays available for deterministic comparison", "Correct: immutable inputs make updates easier to test and inspect."],
      ["move-dom", "So the DOM can own the hopper", "Learner code has no DOM and movement belongs in game state."],
      ["move-audio", "So each key creates a sound object", "Audio is a separate output, not movement state."],
    ),
    predictionScenario: "The hopper is at column 0, row 0 and receives left.",
    predictionCheck: choices(
      "What should the bounded result be?",
      ["move-edge", "column 0, row 0", "Correct: the attempted move is clamped at the edge."],
      ["move-negative", "column -1, row 0", "That leaves the valid board."],
      ["move-wrap", "column 13, row 0", "The hopper does not wrap across the board."],
    ),
    callbacks: ["moveHopper"],
    buildTask: "Implement down, left, and right alongside up, then clamp both axes and leave the input object unchanged.",
    successCriteria: ["exactly one tile per known action", "all four directions", "bounds on both axes", "unknown actions do not move", "input state is not mutated"],
    runTask: "Run the edited project and use both a D-pad button and a matching keyboard key.",
    runObservations: ["Touch and keyboard produce the same action.", "Repeated edge input never moves the hopper outside the board."],
    assessmentGoalId: "road-hopper-movement-complete",
    inspectTask: "Compare the original and returned coordinate for the direction named by the failed evidence.",
    inspectCheck: choices(
      "Up works, but right leaves column unchanged. Which branch is missing?",
      ["move-right", "Increment next.column when action is right", "Correct: right changes the column, not the row."],
      ["move-row", "Increment next.row when action is right", "That implements down, not right."],
      ["move-start", "Change the starting column", "The callback must work from any valid start."],
    ),
    fixTask: "Repair the direction or bound named by the evidence, then rerun touch and keyboard input and recheck the mission.",
    fixHint: "First decide which axis changes; then decide whether it increases or decreases.",
    explainPrompt: "Explain how one shared action contract keeps keyboard and touch movement equivalent and bounded.",
    explanationPoints: ["input source is separate from action", "one tile changes one axis", "clamping protects board bounds"],
    rewardMessage: "Trail Mover milestone: every input source now moves by the same safe rule.",
  },
  {
    id: "road-hopper-traffic",
    title: "Build the Traffic Rally",
    summary: "Spawn, move, wrap and collide with vehicles across five lanes.",
    fileId: "traffic.js",
    concepts: ["entities", "velocity", "wrapping", "collision"],
    readinessPrompt: "Why should a wrapped vehicle keep its lane and speed?",
    goal: "Update five traffic lanes and detect a vehicle collision.",
    protectedGoal: "Traffic scales with level without unbounded entity or coordinate growth.",
    lesson: [
      "Each vehicle owns a lane row, horizontal position, signed speed, and width.",
      "An update maps every entity to a new position; wrapping returns positions to the 0–14 track without changing identity or lane.",
      "A collision needs both the same row and overlapping horizontal intervals.",
    ],
    learnCheck: choices(
      "Which facts are required before a vehicle can hit the hopper?",
      ["traffic-overlap", "Same row and overlapping horizontal space", "Correct: both lane and horizontal overlap are required."],
      ["traffic-row", "Same row only", "Two objects can share a lane while remaining far apart."],
      ["traffic-x", "Same column only", "Objects in different rows cannot collide."],
    ),
    predictionScenario: "A vehicle at x 13.9 moves right by 0.4 on a 14-column track.",
    predictionCheck: choices(
      "Where should its wrapped x position be?",
      ["traffic-wrap", "Near 0.3", "Correct: the overflow wraps back to the start of the track."],
      ["traffic-stop", "Exactly 14", "The vehicle must continue moving rather than stop at the edge."],
      ["traffic-unbounded", "14.3", "That grows beyond the bounded track."],
    ),
    callbacks: ["updateTraffic", "hitsVehicle"],
    buildTask: "Map every vehicle to a level-scaled wrapped x position and detect same-lane width overlap without mutating the input array.",
    successCriteria: ["all entities update", "signed speeds wrap in both directions", "lane and identity stay stable", "level increases movement", "near misses remain safe"],
    runTask: "Run the preview and watch at least one vehicle cross an edge before checking a collision.",
    runObservations: ["Entity count stays constant while positions change.", "A wrapped vehicle reappears in the same lane."],
    assessmentGoalId: "road-hopper-traffic-complete",
    inspectTask: "Inspect row, x, width, and speed separately before changing the collision or wrap rule.",
    inspectCheck: choices(
      "A vehicle at x 13.9 becomes 14.3. Which rule is missing?",
      ["traffic-modulo", "Bounded modulo wrapping", "Correct: wrapping converts track overflow into an in-range position."],
      ["traffic-collision", "A collision check", "Collision detection does not change entity positions."],
      ["traffic-lane", "A different row", "Changing the lane would hide the position bug."],
    ),
    fixTask: "Repair the first wrapping or overlap mismatch, preserve entity identity, then rerun and recheck all traffic scenarios.",
    fixHint: "A modulo expression for negative values needs an added track width before the final modulo.",
    explainPrompt: "Explain why traffic update and collision are separate operations even though both read vehicle positions.",
    explanationPoints: ["update changes position", "collision observes overlap", "separation keeps each rule deterministic"],
    rewardMessage: "Traffic Tamer milestone: five moving lanes now stay bounded and collision-aware.",
  },
  {
    id: "road-hopper-river",
    title: "Ride the Rescue River",
    summary: "Create moving supports, diving turtles and original river hazards.",
    fileId: "river.js",
    concepts: ["relative movement", "platform support", "timers", "hazards"],
    readinessPrompt: "What must move with a platform when the hopper is standing on it?",
    goal: "Carry the hopper on safe supports and detect water or submerged-platform danger.",
    protectedGoal: "River support handles edges, diving cycles and original hazards deterministically.",
    lesson: [
      "River entities move and wrap like traffic, but a safe platform can support the hopper.",
      "Support requires the same row, horizontal overlap, and a platform that is not submerged.",
      "Diving is a tick-driven state, so the same tick and seed always produce the same hazard.",
    ],
    learnCheck: choices(
      "When is a diving platform unsafe?",
      ["river-submerged", "When its deterministic cycle marks it submerged", "Correct: a submerged support behaves like water."],
      ["river-fast", "Whenever its speed is positive", "Moving platforms can still be safe supports."],
      ["river-wide", "Whenever its width is greater than one", "Width affects overlap, not whether the platform is safe."],
    ),
    predictionScenario: "The hopper overlaps a platform in the same row, but submerged is true.",
    predictionCheck: choices(
      "What should findRiverSupport return?",
      ["river-none", "null", "Correct: submerged platforms cannot support the hopper."],
      ["river-platform", "the platform", "That would treat a water hazard as safe."],
      ["river-hopper", "the hopper", "The callback returns a supporting platform or null."],
    ),
    callbacks: ["updateRiver", "findRiverSupport"],
    buildTask: "Update and wrap every platform, derive diving state from tick, and return only a visible overlapping support in the hopper's row.",
    successCriteria: ["signed movement wraps", "diving follows tick", "same-row width overlap", "submerged supports return null", "inputs remain unchanged"],
    runTask: "Run long enough to observe a diving-state change, then test the same position before and during submersion.",
    runObservations: ["The platform position remains bounded.", "Semantic state explains a lost support without relying on animation or sound."],
    assessmentGoalId: "road-hopper-river-complete",
    inspectTask: "Separate movement, overlap, and submerged state when locating a river failure.",
    inspectCheck: choices(
      "A submerged platform is still returned as support. Which condition belongs in the finder?",
      ["river-visible", "Reject platform.submerged === true", "Correct: safety is part of the support predicate."],
      ["river-speed-zero", "Require speed to be zero", "Safe supports may move."],
      ["river-row-change", "Move the platform to another row", "That avoids rather than fixes the unsafe support rule."],
    ),
    fixTask: "Repair the movement, dive, or support predicate named by evidence, then rerun the same ticks and recheck the mission.",
    fixHint: "Build the support predicate from three independent questions: same row, overlap, and visible.",
    explainPrompt: "Explain how relative movement and a deterministic dive timer decide whether the hopper is carried or falls in water.",
    explanationPoints: ["support shares platform movement", "submerged means no support", "ticks make the hazard reproducible"],
    rewardMessage: "River Rider milestone: moving and diving supports now behave predictably.",
  },
  {
    id: "road-hopper-rules",
    title: "Score the Rescue",
    summary: "Add homes, timer, lives, bonuses, hazards, levels and alternating players.",
    fileId: "rules.js",
    concepts: ["state machines", "scoring", "timers", "difficulty"],
    readinessPrompt: "Which facts must survive when the hopper respawns?",
    goal: "Apply scoring, home occupancy, bonuses, lives, game-over, level and two-player rules.",
    protectedGoal: "Every terminal and level transition preserves score and attempt integrity.",
    lesson: [
      "Rule events produce the next game state: forward progress, home, bonus, death, timeout, and level complete each change a bounded subset.",
      "Home occupancy prevents scoring the same bay twice, while score and level survive a hopper respawn.",
      "A lost life can alternate the active player; game over begins only when no lives remain.",
    ],
    learnCheck: choices(
      "What should a death event change when one life remains?",
      ["rules-game-over", "Lives become zero and gameOver becomes true", "Correct: the terminal state follows the updated life count."],
      ["rules-score-zero", "Score becomes zero", "Score is retained across a lost life."],
      ["rules-level-zero", "Level becomes zero", "Difficulty progress is not erased by a death."],
    ),
    predictionScenario: "A player with score 0 reaches a home with a time bonus of 30.",
    predictionCheck: choices(
      "What score should the reference rules produce?",
      ["rules-home", "80", "Correct: the home award is 50 plus the 30-point time bonus."],
      ["rules-thirty", "30", "That omits the home award."],
      ["rules-fifty", "50", "That omits the remaining-time bonus."],
    ),
    callbacks: ["applyRoadHopperRules", "canEnterHome", "nextPlayer"],
    buildTask: "Implement rule events without mutating input, enforce five unique homes, derive game over from lives, increase difficulty by level, and alternate players 1↔2.",
    successCriteria: ["forward/home/bonus scoring", "death and timeout consume a life", "occupied homes are blocked", "level and difficulty increase", "players alternate", "score survives transitions"],
    runTask: "Run a sequence containing a home, a repeated home attempt, a death, and a level completion.",
    runObservations: ["Only the intended fields change for each event.", "Game-over and current-player state are present in text status."],
    assessmentGoalId: "road-hopper-rules-complete",
    inspectTask: "Compare state before and after one event; do not debug several transitions at once.",
    inspectCheck: choices(
      "A death reduces lives from 3 to 2 but sets gameOver true. What should determine gameOver?",
      ["rules-lives", "Whether updated lives are less than or equal to zero", "Correct: game over follows the post-event life count."],
      ["rules-event", "Every death event", "Players can lose a life and continue."],
      ["rules-score", "Whether score is zero", "Score does not decide remaining attempts."],
    ),
    fixTask: "Repair one state transition while preserving unrelated fields, then rerun that event and the surrounding sequence before rechecking.",
    fixHint: "Copy state first, update the event fields, then derive terminal flags from the updated values.",
    explainPrompt: "Explain why scoring, lives, homes, levels, and alternating players form a state machine rather than independent screen effects.",
    explanationPoints: ["events cause transitions", "state persists between frames", "derived flags use updated state"],
    rewardMessage: "Rule Keeper milestone: scoring and attempt state now survive every transition.",
  },
  {
    id: "road-hopper-game",
    title: "Road Hopper Rally Challenge",
    summary: "Assemble, render, test and explain the complete accessible game.",
    fileId: "game.js",
    concepts: ["game loop", "render model", "audio cues", "testing", "accessibility"],
    readinessPrompt: "Why does update logic stay separate from drawing and sound?",
    goal: "Assemble a deterministic full game with bounded frames and semantic status.",
    protectedGoal: "The final project passes all mechanics and mandatory sandbox safety scenarios.",
    lesson: [
      "A fixed-step loop calls update with state and input, then renders the resulting state without changing it.",
      "Draw commands, audio cues, and semantic text are parallel outputs; gameplay must not depend on audio or animation.",
      "Pause, restart, timer, player, score, lives, level, and game-over must remain observable and deterministic.",
    ],
    learnCheck: choices(
      "Why must renderRoadHopperGame avoid changing state?",
      ["game-pure-render", "The same state must always produce the same frame", "Correct: pure rendering keeps tests and accessibility output reproducible."],
      ["game-more-audio", "So it can play more simultaneous sounds", "Audio capacity is unrelated to state mutation."],
      ["game-dom", "So React can run inside learner code", "Learner code has no React or DOM access."],
    ),
    predictionScenario: "A pressed up command is applied at tick 1 while the game is not paused.",
    predictionCheck: choices(
      "Which order produces the frame?",
      ["game-order", "Update to tick 1 and new hopper state, then render that state", "Correct: update owns change and render observes the result."],
      ["game-render-first", "Render the old state, then update invisibly", "That introduces a one-frame mismatch."],
      ["game-audio-first", "Play audio, then let sound choose movement", "Audio is optional output and cannot decide rules."],
    ),
    callbacks: ["createRoadHopperGame", "updateRoadHopperGame", "renderRoadHopperGame"],
    buildTask: "Assemble the five earlier systems, apply pause/restart and ordered input, decrement the timer, and render bounded visual, audio-caption, and semantic outputs.",
    successCriteria: ["fixed-step tick", "input updates state once", "pause and restart", "bounded draw/audio commands", "complete semantic state", "no rule depends on presentation"],
    runTask: "Run the complete preview, use touch and keyboard, pause and restart, mute audio, and compare semantic text with the visible frame.",
    runObservations: ["Equivalent inputs create equivalent state.", "Mute or audio failure never changes score, lives, timing, or completion."],
    assessmentGoalId: "road-hopper-game-complete",
    inspectTask: "Inspect update state, draw commands, audio captions, and semantic state as separate outputs at the same tick.",
    inspectCheck: choices(
      "The hopper moves in state but the frame has no hopper sprite. Where is the first mismatch?",
      ["game-render", "renderRoadHopperGame is not representing hopper state", "Correct: update worked, so inspect the projection into draw commands."],
      ["game-input", "The keyboard mapping", "The hopper state proves the input already reached update."],
      ["game-score", "The scoring rule", "Score does not decide whether the hopper is drawn."],
    ),
    fixTask: "Repair the smallest update/render/semantic mismatch, rerun the identical input sequence, and pass both the mission and final protected checks.",
    fixHint: "At one tick, compare the state field with the corresponding draw command and semantic field.",
    explainPrompt: "Explain how fixed-step update, renderer-neutral output, semantic status, optional audio, and deterministic tests make the finished game reliable and accessible.",
    explanationPoints: ["update is authoritative", "render and audio are bounded outputs", "semantic state is equivalent information", "tests replay the same inputs"],
    rewardMessage: "Road Hopper Rally Builder badge: all six systems work together under protected deterministic tests.",
  },
] as const;

const titles: Readonly<Record<MissionStageKindV1, string>> = Object.freeze({
  learn: "Learn the rule",
  predict: "Commit to a prediction",
  build: "Implement the system",
  run: "Exercise your code",
  assess: "Check this mission",
  inspect: "Read the evidence",
  fix: "Repair and prove it",
  explain: "Teach the rule back",
  reward: "Claim the milestone",
});

function activity(seed: EvidenceSeed, kind: MissionStageKindV1): RoadHopperStageActivityV1 {
  switch (kind) {
    case "learn": return { kind, lesson: seed.lesson, check: seed.learnCheck };
    case "predict": return { kind, scenario: seed.predictionScenario, check: seed.predictionCheck };
    case "build": return { kind, task: seed.buildTask, callbackNames: seed.callbacks, successCriteria: seed.successCriteria, editRequired: true };
    case "run": return { kind, task: seed.runTask, observe: seed.runObservations, requiresFreshRun: true };
    case "assess": return { kind, task: `Run protected checks for ${seed.goal}`, goalId: seed.assessmentGoalId, passingScore: 100, errorOutcome: "fail-closed" };
    case "inspect": return { kind, task: seed.inspectTask, check: seed.inspectCheck };
    case "fix": return { kind, task: seed.fixTask, hint: seed.fixHint, requiresSourceChangeAfterCheck: true, requiresPassingAssessment: true };
    case "explain": return { kind, prompt: seed.explainPrompt, minimumCharacters: 40, pointsToInclude: seed.explanationPoints, persistResponse: false };
    case "reward": return { kind, message: seed.rewardMessage, requiredStageKinds: ROAD_HOPPER_MISSION_STAGE_ORDER_V2.slice(0, 8) };
  }
}

function mission(seed: EvidenceSeed): RoadHopperMissionV3 {
  const artifactBase = `${seed.id}-v21-artifact`;
  return {
    id: seed.id,
    title: seed.title,
    summary: seed.summary,
    estimatedMinutes: 75,
    concepts: seed.concepts,
    editableFileId: seed.fileId,
    stages: ROAD_HOPPER_MISSION_STAGE_ORDER_V2.map((kind, index) => ({
      id: `${seed.id}-${String(index + 1).padStart(2, "0")}-${kind}`,
      kind,
      title: titles[kind],
      instruction: `${activity(seed, kind).kind === "build" ? seed.buildTask : titles[kind]} Work in ${seed.fileId}.`,
      editableFileId: seed.fileId,
      artifactIds: [`${artifactBase}-${kind}`],
      activity: activity(seed, kind),
    })),
    learner: {
      readinessPrompt: seed.readinessPrompt,
      goals: [{ id: `${seed.id}-visible-goal`, statement: seed.goal, evidence: "deterministic-assessment" }],
      accessibilityAlternatives: [
        "Keyboard and touch commands use the same input action.",
        "Semantic status and printable state replace colour, motion, and audio cues.",
        "Practice speed changes timing only; assessment uses scripted inputs.",
      ],
      artifactIds: ROAD_HOPPER_MISSION_STAGE_ORDER_V2.map((kind) => `${artifactBase}-${kind}`),
    },
    facilitator: {
      protectedGoals: [{ id: `${seed.id}-protected-goal`, statement: seed.protectedGoal, mandatory: true }],
      protectedScenarioIds: [`${seed.id}-nominal-v2`, `${seed.id}-edge-v2`, `${seed.id}-bounded-v2`],
      answerKeyArtifactId: `${seed.id}-answer-key-v2`,
    },
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  return value;
}

/** Additive immutable Road Hopper Rally 2.1 evidence-led course. */
export const ROAD_HOPPER_RALLY_COURSE_V3: RoadHopperCourseManifestV3 = deepFreeze({
  schemaVersion: "3",
  moduleId: "junior-coder.road-hopper-rally",
  moduleVersion: "2.1.0",
  contentRevision: "2026-08-24.1",
  title: "Road Hopper Rally",
  estimatedMinutes: 450,
  navigation: "open",
  completionAuthority: "server-final-assessment",
  fullscreenUnlock: "historical-completion",
  missions: evidenceSeeds.map(mission),
  starterProject: ROAD_HOPPER_RALLY_STARTER_PROJECT_V2,
  runtimeLimits: ROAD_HOPPER_RUNTIME_LIMITS_V1,
  assets: ROAD_HOPPER_RALLY_COURSE_V2.assets,
});

/** Create a frozen learner projection without facilitator or protected content. */
export function createRoadHopperLearnerProjectionV3(
  course: RoadHopperCourseManifestV3,
): RoadHopperLearnerCourseProjectionV3 {
  return deepFreeze({
    ...course,
    missions: course.missions.map(({ facilitator: _facilitator, ...learnerMission }) => learnerMission),
  });
}
