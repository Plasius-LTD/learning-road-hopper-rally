export type RoadHopperWaveformV1 = "sine" | "square" | "sawtooth" | "triangle";

export interface RoadHopperAudioCueDefinitionV1 {
  readonly waveform: RoadHopperWaveformV1;
  readonly frequencyHz: number;
  readonly durationMs: number;
  readonly caption: string;
}

/** Browser-neutral original audio sequence mirrored by the packaged, digested JSON asset. */
export const ROAD_HOPPER_RALLY_AUDIO_SEQUENCE_V1 = Object.freeze({
  schemaVersion: "1" as const,
  licence: "Apache-2.0" as const,
  originalWork: true as const,
  tempoBpm: 116,
  music: Object.freeze({
    waveform: "triangle" as const,
    notes: Object.freeze(["C5", "E5", "G5", "A5", "G5", "E5", "D5", "G4"]),
    beats: Object.freeze([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]),
  }),
  cues: Object.freeze({
    hop: Object.freeze({ waveform: "square" as const, frequencyHz: 520, durationMs: 55, caption: "Hop" }),
    home: Object.freeze({ waveform: "triangle" as const, frequencyHz: 880, durationMs: 240, caption: "Home reached" }),
    danger: Object.freeze({ waveform: "sawtooth" as const, frequencyHz: 170, durationMs: 180, caption: "Hopper lost" }),
    level: Object.freeze({ waveform: "sine" as const, frequencyHz: 1040, durationMs: 360, caption: "Next rally level" }),
    pause: Object.freeze({ waveform: "sine" as const, frequencyHz: 300, durationMs: 80, caption: "Game paused" }),
  } satisfies Readonly<Record<string, RoadHopperAudioCueDefinitionV1>>),
});
