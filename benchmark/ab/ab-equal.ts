import { readFileSync } from "node:fs";
import { loadCorpora } from "./corpus.ts";
import { load, noOpPlugin } from "./subject.ts";

import type { Corpus } from "./corpus.ts";
import type { Subject } from "./subject.ts";

/**
 * Compares the copies of src/ that ab-setup.sh made in AB_DIR, A and B, on
 * the corpora (or CORPORA): validating a value, JSON text, and a value with
 * a plugin have to agree, and every BASIC error B reports has to be one A
 * reports. Prints what differs and, per corpus, how many BASIC errors each
 * reports.
 *
 * MUTANTS=n also compares n mutants of each instance (seeded): a string
 * swapped for another string in the instance (like a tag), a property
 * removed, or a value replaced, and JSON text with a property's value that
 * can't be parsed, by the root schema's result. B may pass JSON text with a
 * value that couldn't be parsed where A doesn't, which UNPARSED_PASSES=1
 * counts instead of reporting.
 */

type BasicOutput = { valid: boolean; errors: { absoluteKeywordLocation: string; instanceLocation: string }[] };

// The root schema's result, which validating JSON text doesn't give when it
// has syntax errors
let rootValid: boolean | undefined;
const root = {
  afterSchema: (_schema: unknown, _at: unknown, valid: boolean, _state: unknown, parent: unknown) => {
    if (parent === undefined) {
      rootValid = valid;
    }
  }
};

/** The evaluators the comparisons use, made once per corpus */
const evaluatorsFor = ({ api }: Subject, compiled: unknown) => ({
  validate: api.validatorFor(compiled) as (value: unknown) => boolean,
  json: api.validatorFor(compiled, { input: "json" }) as (json: string) => boolean,
  hooks: api.validatorFor(compiled, { plugins: [noOpPlugin] }) as (value: unknown) => boolean,
  rootJson: api.validatorFor(compiled, { input: "json", plugins: [root] }) as (json: string) => boolean,
  basic: api.validatorFor(compiled, { output: api.BASIC }) as (value: unknown) => BasicOutput,
  basicJson: api.validatorFor(compiled, { output: api.BASIC, input: "json" }) as (json: string) => BasicOutput
});
type Evaluators = ReturnType<typeof evaluatorsFor>;

const rootOf = (evaluators: Evaluators, json: string) => {
  rootValid = undefined;
  evaluators.rootJson(json);
  return rootValid;
};

let seed = 1;
const random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];

type Place = { parent: any; key: string | number };

/** Every value in `value`, by its parent and key */
const places = (value: any, found: Place[] = []) => {
  if (value !== null && typeof value === "object") {
    for (const key of Array.isArray(value) ? value.keys() : Object.keys(value)) {
      found.push({ parent: value, key });
      places(value[key], found);
    }
  }
  return found;
};

const unparsed = "__UNPARSED__";
const mutants = (instance: unknown, count: number) => {
  const result: { value: unknown; json: string }[] = [];
  for (let i = 0; i < count; i++) {
    const value = structuredClone(instance);
    const all = places(value);
    if (all.length === 0) {
      break;
    }

    const strings = all.filter(({ parent, key }) => typeof parent[key] === "string");
    const kind = random();
    if (kind < 0.4 && strings.length > 1) {
      const target = pick(strings);
      const source = pick(strings);
      target.parent[target.key] = source.parent[source.key];
    } else if (kind < 0.7) {
      const target = pick(all.filter(({ parent }) => !Array.isArray(parent)));
      if (target) {
        delete target.parent[target.key];
      }
    } else {
      const target = pick(all);
      target.parent[target.key] = pick([1, "x", null, true, {}, []]);
    }

    const blank = structuredClone(instance);
    const properties = places(blank).filter(({ parent }) => !Array.isArray(parent));
    let json = JSON.stringify(blank);
    if (properties.length > 0) {
      const target = pick(properties);
      target.parent[target.key] = unparsed;
      json = JSON.stringify(blank).replace(`"${unparsed}"`, "");
    }
    result.push({ value, json });
  }
  return result;
};

const subjects = [await load("a"), await load("b")];
const corpora: Corpus[] = process.env.CORPORA ? JSON.parse(readFileSync(process.env.CORPORA, "utf8")) : loadCorpora();

const errorKey = (error: BasicOutput["errors"][number]) => `${error.absoluteKeywordLocation} ${error.instanceLocation}`;
let differences = 0;
let unparsedPasses = 0;
const counts = [0, 0];

const compareResults = (label: string, a: unknown[], b: unknown[], detail = "") => {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    differences++;
    console.log(`${label}: A ${JSON.stringify(a)}, B ${JSON.stringify(b)}${detail}`);
  }
};

const compareBasic = (label: string, a: BasicOutput, b: BasicOutput) => {
  counts[0] += a.errors.length;
  counts[1] += b.errors.length;
  const fromA = new Set(a.errors.map(errorKey));
  const extra = b.errors.filter((error) => !fromA.has(errorKey(error)));
  if (a.valid !== b.valid || extra.length > 0) {
    differences++;
    const examples = extra.slice(0, 3).map(errorKey);
    console.log(`${label} BASIC: ${extra.length} errors only in B, like ${examples.join(", ")}`);
  }
};

const mutantCount = Number(process.env.MUTANTS ?? 0);
for (const corpus of corpora) {
  const [a, b] = await Promise.all(subjects.map(async (subject) => evaluatorsFor(subject, await subject.compile(corpus))));
  counts[0] = 0;
  counts[1] = 0;
  let mutated = 0;

  corpus.instances.forEach((instance, index) => {
    const label = `${corpus.name} #${index}`;
    const json = JSON.stringify(instance);
    const [resultsA, resultsB] = [a, b].map((v) => [v.validate(instance), v.json(json), v.hooks(instance)]);
    compareResults(label, resultsA, resultsB);
    compareBasic(label, a.basic(instance), b.basic(instance));

    for (const mutant of mutants(instance, mutantCount)) {
      mutated++;
      const [mutantA, mutantB] = [a, b].map((v) => [v.validate(mutant.value), v.hooks(mutant.value), rootOf(v, mutant.json)]);
      if (process.env.UNPARSED_PASSES && mutantA[2] === false && mutantB[2] === true) {
        unparsedPasses++;
        mutantB[2] = false;
      }
      compareResults(`${label} mutant`, mutantA, mutantB, `\n  ${mutant.json.slice(0, 300)}`);
      compareBasic(`${label} mutant`, a.basic(mutant.value), b.basic(mutant.value));
      compareBasic(`${label} mutant JSON`, a.basicJson(mutant.json), b.basicJson(mutant.json));
    }
  });

  console.log(`${corpus.name}: ${corpus.instances.length} instances, ${mutated} mutants, BASIC errors A ${counts[0]}, B ${counts[1]}`);
}
console.log(`${differences} differences, ${unparsedPasses} mutants with a value that couldn't be parsed that only B passes`);
