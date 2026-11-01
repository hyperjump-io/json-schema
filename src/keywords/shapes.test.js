import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { jsonPointerGet, rejsonParse } from "@hyperjump/browser";
import { JsonSchema } from "../json-schema.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { draft04Dialect, draft04DialectUri } from "../dialects/draft-04/index.js";
import { draft06Dialect, draft06DialectUri } from "../dialects/draft-06/index.js";
import { draft07Dialect, draft07DialectUri } from "../dialects/draft-07/index.js";
import { draft201909Dialect, draft201909DialectUri } from "../dialects/draft-2019-09/index.js";
import { draft202012Dialect, draft202012DialectUri } from "../dialects/draft-2020-12/index.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Shape } from "../keyword.d.ts"
 */

/**
 * A value with something that doesn't fit the shape at `pointer`, and who
 * should report it:
 * - `"schema"`: the resolver, because a schema goes there
 * - `"shape"`: the resolver, because it isn't any of the shape's alternatives,
 *   or it's a map or array of the wrong type
 * - `"keyword"`: the keyword's check, because a `"data"` alternative left it
 *   to the keyword
 *
 * @typedef {{ value: Json; pointer: string; reportedBy: "schema" | "shape" | "keyword" }} Case
 */

const jsonSchema = new JsonSchema({ dialects: [v1Dialect, draft04Dialect, draft06Dialect, draft07Dialect, draft201909Dialect, draft202012Dialect] });

/** @type Map<string, { name: string; dialectUri: string; shape: Shape }> */
const keywords = new Map();
for (const dialectUri of [v1DialectUri, draft202012DialectUri, draft201909DialectUri, draft07DialectUri, draft06DialectUri, draft04DialectUri]) {
  for (const [name, keywordUri] of Object.entries(jsonSchema.getDialect(dialectUri).keywords)) {
    if (!keywords.has(keywordUri)) {
      keywords.set(keywordUri, { name, dialectUri, shape: jsonSchema.getKeyword(keywordUri).shape });
    }
  }
}

describe("A keyword's value that doesn't fit its shape is reported once", () => {
  for (const [keywordUri, { name, dialectUri, shape }] of keywords) {
    for (const { value, pointer, reportedBy } of misfits(shape)) {
      test(`${name} (${keywordUri}): ${JSON.stringify(value)}`, async () => {
        const file = new VFile(JSON.stringify({ $schema: dialectUri, [name]: value }));
        const processor = unified()
          .use(rejsonParse)
          .use(jsonSchemaResolve, { session: jsonSchema.session(), uri: "https://example.com/schema" });
        const document = await processor.run(processor.parse(file), file);

        const root = /** @type any */ (document.children[0]);
        const misfit = jsonPointerGet(`/${name}${pointer}`, root).position;
        const ruleId = reportedBy === "schema" ? "invalid-schema" : keywordUri;
        expect(file.messages.map((message) => [message.ruleId, message.place])).to.eql([[ruleId, misfit]]);
      });
    }
  }
});

/**
 * `1` is never a schema, a map, or an array, so it doesn't fit anywhere a
 * shape describes. Shapes can refer to themselves (`itemPattern`), so this
 * only goes a few levels deep.
 *
 * @type (shape: Shape, depth?: number) => Case[]
 */
const misfits = (shape, depth = 0) => {
  if (depth > 3 || shape === "data") {
    return [];
  } else if (shape === "schema" || shape === "unappliedSchema") {
    return [{ value: 1, pointer: "", reportedBy: "schema" }];
  } else if (shape === "reference") {
    // A string that isn't a URI reference doesn't fit either
    return [{ value: 1, pointer: "", reportedBy: "shape" }, { value: "a b", pointer: "", reportedBy: "shape" }];
  } else if (Array.isArray(shape)) {
    /** @type Case[] */
    const cases = [{ value: 1, pointer: "", reportedBy: shape.includes("data") ? "keyword" : "shape" }];

    // `1` doesn't choose any alternative, so only what's inside a map or
    // array alternative is a different case
    for (const alternative of shape) {
      if (typeof alternative === "object") {
        cases.push(...misfits(alternative, depth + 1).filter(({ pointer }) => pointer !== ""));
      }
    }

    return cases;
  } else if ("array" in shape) {
    return [
      { value: 1, pointer: "", reportedBy: "shape" },
      ...misfits(shape.array, depth + 1)
        .map(({ value, pointer, reportedBy }) => ({ value: [value], pointer: `/0${pointer}`, reportedBy }))
    ];
  } else {
    return [
      { value: 1, pointer: "", reportedBy: "shape" },
      ...misfits(shape.map, depth + 1)
        .map(({ value, pointer, reportedBy }) => ({ value: { a: value }, pointer: `/a${pointer}`, reportedBy }))
    ];
  }
};
