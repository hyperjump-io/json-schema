import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { pointerGet, rejsonParse } from "@hyperjump/browser/json";
import { JsonSchema } from "../json-schema.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { jsonSchemaValidateKeywords } from "../schema/validate-keywords.js";
import { v1DialectUri } from "../dialects/v1/index.js";
import { addDraft04, draft04DialectUri } from "../dialects/draft-04/index.js";
import { addDraft06, draft06DialectUri } from "../dialects/draft-06/index.js";
import { addDraft07, draft07DialectUri } from "../dialects/draft-07/index.js";
import { addDraft201909, draft201909DialectUri } from "../dialects/draft-2019-09/index.js";
import { addDraft202012, draft202012DialectUri } from "../dialects/draft-2020-12/index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Shape } from "../keyword.d.ts"
 */

/**
 * A value with something that isn't a schema at `pointer`, and who should
 * report it: the resolver, because the shape says a schema goes there, or the
 * keyword's schema, because the value doesn't match any of the shape's
 * alternatives.
 *
 * @typedef {{ value: Json; pointer: string; reportedBy: "resolver" | "keyword" }} Case
 */

/**
 * Shapes can refer to themselves (`itemPattern`), so this only goes a few
 * levels deep
 *
 * @type (shape: Shape, depth?: number) => Case[]
 */
const notSchemas = (shape, depth = 0) => {
  if (depth > 3 || shape === "data") {
    return [];
  } else if (shape === "schema") {
    return [{ value: 1, pointer: "", reportedBy: "resolver" }];
  } else if (Array.isArray(shape)) {
    /** @type Case[] */
    const cases = shape.includes("data") ? [] : [{ value: 1, pointer: "", reportedBy: "keyword" }];

    // A value that isn't a schema never chooses the "schema" alternative
    for (const alternative of shape) {
      if (typeof alternative === "object") {
        cases.push(...notSchemas(alternative, depth + 1));
      }
    }

    return cases;
  } else if ("array" in shape) {
    return notSchemas(shape.array, depth + 1)
      .map(({ value, pointer, reportedBy }) => ({ value: [value], pointer: `/0${pointer}`, reportedBy }));
  } else {
    return notSchemas(shape.map, depth + 1)
      .map(({ value, pointer, reportedBy }) => ({ value: { a: value }, pointer: `/a${pointer}`, reportedBy }));
  }
};

const jsonSchema = new JsonSchema();
addDraft04(jsonSchema);
addDraft06(jsonSchema);
addDraft07(jsonSchema);
addDraft201909(jsonSchema);
addDraft202012(jsonSchema);

/** @type Map<string, { name: string; dialectUri: string; shape: Shape }> */
const keywords = new Map();
for (const dialectUri of [v1DialectUri, draft202012DialectUri, draft201909DialectUri, draft07DialectUri, draft06DialectUri, draft04DialectUri]) {
  for (const [name, keywordUri] of Object.entries(jsonSchema.getDialect(dialectUri).keywords)) {
    if (!keywords.has(keywordUri)) {
      keywords.set(keywordUri, { name, dialectUri, shape: jsonSchema.getKeyword(keywordUri).shape });
    }
  }
}

describe("A keyword's value that isn't a schema where its shape expects one is reported once", () => {
  for (const [keywordUri, { name, dialectUri, shape }] of keywords) {
    for (const { value, pointer, reportedBy } of notSchemas(shape)) {
      test(`${name} (${keywordUri}): ${JSON.stringify(value)}`, async () => {
        const file = new VFile(JSON.stringify({ $schema: dialectUri, [name]: value }));
        const processor = unified()
          .use(rejsonParse)
          .use(jsonSchemaResolve, { session: jsonSchema.session(), uri: "https://example.com/schema" })
          .use(jsonSchemaValidateKeywords, { jsonSchema });
        const document = await processor.run(processor.parse(file), file);

        // The resolver reports the value that isn't a schema. A keyword's
        // schema reports the keyword's whole value.
        const root = /** @type any */ (document.children[0]);
        const expected = reportedBy === "resolver"
          ? ["invalid-schema", pointerGet(`/${name}${pointer}`, root).position]
          : [keywordUri, pointerGet(`/${name}`, root).position];
        expect(file.messages.map((message) => [message.ruleId, message.place])).to.eql([expected]);
      });
    }
  }
});
