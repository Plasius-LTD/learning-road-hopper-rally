#!/usr/bin/env node
const { execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const cache = path.join(root, ".npm-cache-packcheck");
const packed = JSON.parse(
  execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts", "--cache", cache],
    { cwd: root, encoding: "utf8" },
  ),
);
const paths = (packed[0]?.files ?? []).map((entry) => entry.path);
const required = [
  "dist/index.js",
  "dist/index.cjs",
  "dist/index.d.ts",
  "dist/browser-worker.js",
  "dist/browser-worker.cjs",
  "dist/browser-worker.d.ts",
  "dist/server.js",
  "dist/server.cjs",
  "dist/server.d.ts",
  "assets/sprites/road-hopper-atlas.svg",
  "assets/audio/road-hopper-audio.json",
  "README.md",
  "CHANGELOG.md",
  "THIRD_PARTY_NOTICES.md",
];
const missing = required.filter((entry) => !paths.includes(entry));
if (missing.length > 0) {
  throw new Error(`Public package is missing: ${missing.join(", ")}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const exportName of [".", "./browser-worker", "./server"]) {
  if (!packageJson.exports?.[exportName]) {
    throw new Error(`Missing package export ${exportName}`);
  }
}

const rootCjs = require(path.join(root, "dist/index.cjs"));
const browserCjs = require(path.join(root, "dist/browser-worker.cjs"));
const serverCjs = require(path.join(root, "dist/server.cjs"));
if (typeof rootCjs.createRoadHopperProgramSession !== "function") {
  throw new Error("Root CommonJS evaluator export is unavailable");
}
if (Object.hasOwn(rootCjs, "assessRoadHopperProject")) {
  throw new Error("Server assessment leaked into the root export");
}
if (typeof browserCjs.createRoadHopperWorkerMessageHandler !== "function") {
  throw new Error("Browser worker CommonJS export is unavailable");
}
if (typeof serverCjs.assessRoadHopperProject !== "function") {
  throw new Error("Server CommonJS assessment export is unavailable");
}

for (const asset of rootCjs.ROAD_HOPPER_RALLY_COURSE_V2.assets) {
  const bytes = fs.readFileSync(path.join(root, asset.packagePath));
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  if (digest !== asset.sha256) {
    throw new Error(`Asset digest mismatch for ${asset.id}`);
  }
}

const forbidden = paths.filter((entry) =>
  /(?:^|\/)(?:node_modules|coverage|frontend|backend|infra|local\.settings\.json)(?:\/|$)/iu.test(entry),
);
if (forbidden.length > 0) {
  throw new Error(`Forbidden public paths: ${forbidden.join(", ")}`);
}
