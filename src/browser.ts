/** Browser-safe public surface: no facilitator content or protected assessment scenarios. */
export { ROAD_HOPPER_FILE_IDS } from "./types.js";
export type {
  RoadHopperAssetV1,
  RoadHopperAssessmentRequestV1,
  RoadHopperAssessmentResultV1,
  RoadHopperAssessmentScopeV1,
  RoadHopperAudioCueV1,
  RoadHopperDrawCommandV1,
  RoadHopperEntityV1,
  RoadHopperEvaluatorOptionsV1,
  RoadHopperEvaluatorV1,
  RoadHopperFileIdV1,
  RoadHopperFrameV1,
  RoadHopperInputActionV1,
  RoadHopperInputCommandV1,
  RoadHopperLearnerCourseProjectionV2,
  RoadHopperLearnerCourseProjectionV3,
  RoadHopperLearnerMissionV2,
  RoadHopperLearnerMissionV3,
  RoadHopperProgramSessionV1,
  RoadHopperProgressV1,
  RoadHopperProjectV1,
  RoadHopperRuntimeLimitsV1,
  RoadHopperSavedVersionV1,
  RoadHopperSemanticStateV1,
  RoadHopperStageV2,
  RoadHopperStageV3,
  RoadHopperStageActivityV1,
  RoadHopperChoiceCheckV1,
  RoadHopperChoiceOptionV1,
  RoadHopperStateV1,
  RoadHopperVisibleGoalV2,
} from "./types.js";
export * from "./constants.js";
export * from "./starter.js";
export * from "./assets.js";
export {
  parseRoadHopperFrame,
  parseRoadHopperAssessmentRequest,
  parseRoadHopperAssessmentResult,
  parseRoadHopperInputCommand,
  parseRoadHopperProgress,
  parseRoadHopperProject,
  parseRoadHopperSavedVersion,
} from "./validation.js";
export {
  RoadHopperEvaluationError,
  createRoadHopperEvaluator,
  createRoadHopperProgramSession,
  isRoadHopperEvaluationTimeout,
} from "./evaluator.js";
