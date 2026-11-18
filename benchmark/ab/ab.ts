import { readFileSync } from "node:fs";
import { fromJson } from "@hyperjump/browser";
import { loadCorpora } from "./corpus.ts";
import { load, noOpPlugin } from "./subject.ts";

import type { Corpus } from "./corpus.ts";

/**
 * A/B timing of the two copies of src/ that ab-setup.sh made in AB_DIR, A
 * (usually HEAD) and B (the change), in one process, alternating round by
 * round so drift affects both. Prints B's time as a fraction of A's (below 1
 * is faster), the median of ROUNDS rounds of MS ms each, with the
 * interquartile range.
 *
 * - METHOD: flag (the default), basic, json, annotate, hooks (a plugin with
 *   every hook), locations (every hook reads `instanceLocation`), and on
 *   parsed ASTs, node, nodeHooks, and annotateNode
 * - GROUP: only the corpora whose names include it
 * - CORPORA: another corpora file, in the format of data/corpus/corpora.json
 */

const method = process.env.METHOD ?? "flag";

// The worst case for building locations lazily: every hook reads one
let sink = 0;
const readLocation = (_info: unknown, at: { instanceLocation: string }) => {
  sink += at.instanceLocation.length;
};
const readsLocations = { beforeSchema: readLocation, beforeKeyword: readLocation };
process.on("exit", () => sink < 0 && console.log(sink));
const rounds = Number(process.env.ROUNDS ?? 21);
const ms = Number(process.env.MS ?? 150);

const clearAnnotations = (node: { data?: { annotations?: unknown }; children?: unknown[] }) => {
  // Not `delete`, which puts `data` in dictionary mode and made attaching
  // about twice as slow
  if (node.data !== undefined) {
    node.data.annotations = undefined;
  }
  for (const child of node.children ?? []) {
    clearAnnotations(child as never);
  }
};

/** A run of `evaluate` on every input */
const runOf = <T>(evaluate: (input: T) => unknown, inputs: T[], before?: (input: T) => void) => () => {
  for (const input of inputs) {
    before?.(input);
    evaluate(input);
  }
};

/** The mean time of a run, running it for `ms` */
const time = (run: () => void) => {
  let count = 0;
  const start = performance.now();
  while (performance.now() - start < ms) {
    run();
    count++;
  }
  return (performance.now() - start) / count;
};

const median = (xs: number[]) => xs.toSorted((a, b) => a - b)[xs.length >> 1];

const subjects = [await load("a"), await load("b")];
const corpora: Corpus[] = process.env.CORPORA ? JSON.parse(readFileSync(process.env.CORPORA, "utf8")) : loadCorpora();
for (const corpus of corpora) {
  if (process.env.GROUP && !corpus.name.includes(process.env.GROUP)) {
    continue;
  }

  const values = corpus.instances;
  const jsons = values.map((value) => JSON.stringify(value));
  const nodes = jsons.map((json) => fromJson(json, "urn:hyperjump:none").document.children[0]);
  const runs = await Promise.all(subjects.map(async ({ api, compile }) => {
    const compiled = await compile(corpus);
    const validator = (options = {}) => api.validatorFor(compiled, options);
    const annotator = (options = {}) => api.annotatorFor(compiled, options);
    switch (method) {
      case "hooks":
        return runOf(validator({ plugins: [noOpPlugin] }), values);
      case "locations":
        return runOf(validator({ plugins: [readsLocations] }), values);
      case "annotate":
        return runOf(annotator(), values);
      case "node":
        return runOf(validator({ input: "node" }), nodes);
      case "nodeHooks":
        return runOf(validator({ input: "node", plugins: [noOpPlugin] }), nodes);
      case "annotateNode":
        // Annotating a node again adds to its annotations, so they're cleared
        // first (the same walk for A and B)
        return runOf(annotator({ input: "node" }), nodes, (node) => clearAnnotations(node as never));
      case "json":
        return runOf(validator({ input: "json" }), jsons);
      case "basic":
        return runOf(validator({ output: api.BASIC }), values);
      default:
        return runOf(validator(), values);
    }
  }));

  for (let warmup = 0; warmup < 3; warmup++) {
    runs.forEach(time);
  }

  const ratios: number[] = [];
  const times: [number[], number[]] = [[], []];
  for (let round = 0; round < rounds; round++) {
    const order = round % 2 === 0 ? [0, 1] : [1, 0];
    const roundTimes = [0, 0];
    for (const index of order) {
      roundTimes[index] = time(runs[index]);
    }
    times[0].push(roundTimes[0]);
    times[1].push(roundTimes[1]);
    ratios.push(roundTimes[1] / roundTimes[0]);
  }

  ratios.sort((a, b) => a - b);
  const range = `${ratios[rounds >> 2].toFixed(3)}–${ratios[(3 * rounds) >> 2].toFixed(3)}`;
  console.log(`${corpus.name}, ${method}: B/A ${median(ratios).toFixed(3)} (${range}), A ${median(times[0]).toFixed(3)} ms, B ${median(times[1]).toFixed(3)} ms`);
}
