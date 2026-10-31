import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Real schemas with real instances, built by `benchmark/data/build-corpus.mjs`,
 * which isn't committed. `schemas` is keyed by retrieval URI, and `entry` is
 * the one to validate against. Instances don't have to be valid.
 */
export type Corpus = {
  name: string;
  dialect: string;
  entry: string;
  schemas: Record<string, Record<string, unknown>>;
  instances: unknown[];
};

const corporaPath = join(import.meta.dirname, "..", "data", "corpus", "corpora.json");

export const loadCorpora = () => JSON.parse(readFileSync(corporaPath, "utf8")) as Corpus[];
