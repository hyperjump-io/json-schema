import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeEach, beforeAll, afterAll, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser";
import { JsonSchema, extendDialect } from "../json-schema.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { draft04Dialect, draft04DialectUri } from "../dialects/draft-04/index.js";
import { draft07Dialect, draft07DialectUri } from "../dialects/draft-07/index.js";
import { draft201909Dialect, draft201909DialectUri } from "../dialects/draft-2019-09/index.js";
import { draft202012Dialect, draft202012DialectUri } from "../dialects/draft-2020-12/index.js";
import { compile } from "../operations/compile.js";

/**
 * @import { JsonParseStatus } from "@hyperjump/browser"
 * @import { Keyword } from "../keyword.d.ts"
 */

const baseUri = "https://example.com/schema";

/** @type (extension: Record<string, Keyword<any, any, any>>, keywords?: Keyword<any, any, any>[]) => JsonSchema */
const withV1Keywords = (extension, keywords) => new JsonSchema({
  dialects: [extendDialect(v1Dialect, { keywords: extension })],
  keywords
});

describe("keyword checks", () => {
  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = new JsonSchema({ dialects: [v1Dialect, draft04Dialect, draft07Dialect, draft201909Dialect, draft202012Dialect] });
  });

  test("valid keyword values", async () => {
    const messages = await check(jsonSchema, `{
      "$schema": "${v1DialectUri}",
      "type": ["object", "null"],
      "required": ["foo"],
      "properties": { "foo": { "minLength": 1, "pattern": "^a" } },
      "itemPattern": [{}, "*", [{}, "|", {}], "?"]
    }`);

    expect(messages).to.eql([]);
  });

  test("a problem is placed on the value, with the keyword's URI", async () => {
    const messages = await check(jsonSchema, `{
      "$schema": "${v1DialectUri}",
      "properties": { "foo": { "minLength": -1 } }
    }`);

    expect(messages).to.eql([
      { reason: "Expected a non-negative integer", ruleId: "https://json-schema.org/keyword/minLength", at: "-1" }
    ]);
  });

  test("a problem inside a value is placed on it", async () => {
    const messages = await check(jsonSchema, `{ "$schema": "${v1DialectUri}", "required": ["a", 1, "a"] }`);

    expect(messages).to.eql([
      { reason: "Expected a string", ruleId: "https://json-schema.org/keyword/required", at: "1" },
      { reason: "'a' is a duplicate", ruleId: "https://json-schema.org/keyword/required", at: `"a"` }
    ]);
  });

  test("type", async () => {
    const messages = await check(jsonSchema, `{
      "$schema": "${v1DialectUri}",
      "properties": {
        "a": { "type": "nope" },
        "b": { "type": [] },
        "c": { "type": ["string", "nope", "string"] }
      }
    }`);

    expect(messages.map(({ reason, at }) => [reason, at])).to.eql([
      ["Expected one of 'null', 'boolean', 'object', 'array', 'number', 'string', 'integer', or an array of them", `"nope"`],
      ["Expected at least one type", "[]"],
      ["Expected one of 'null', 'boolean', 'object', 'array', 'number', 'string', 'integer'", `"nope"`],
      ["'string' is a duplicate", `"string"`]
    ]);
  });

  test("itemPattern's operators", async () => {
    const messages = await check(jsonSchema, `{ "$schema": "${v1DialectUri}", "itemPattern": [{}, "*", 2, ["x"]] }`);

    expect(messages.map(({ reason, at }) => [reason, at])).to.eql([
      ["Expected a schema, an array, or one of '*', '+', '?', '|'", "2"],
      ["Expected a schema, an array, or one of '*', '+', '?', '|'", `"x"`]
    ]);
  });

  test("patternProperties' names are regular expressions", async () => {
    const messages = await check(jsonSchema, `{ "$schema": "${v1DialectUri}", "patternProperties": { "^a": {}, "(": {} } }`);

    expect(messages.map(({ reason, at }) => [reason, at])).to.eql([["Expected a regular expression", `"("`]]);
  });

  test("checks of keywords from other dialects", async () => {
    expect(await check(jsonSchema, `{ "$schema": "${draft07DialectUri}", "dependencies": { "a": ["b", 1, "b"], "c": {}, "d": [] } }`)).to.eql([
      { reason: "Expected a string", ruleId: "https://json-schema.org/keyword/draft-07/dependencies", at: "1" },
      { reason: "'b' is a duplicate", ruleId: "https://json-schema.org/keyword/draft-07/dependencies", at: `"b"` }
    ]);
    expect((await check(jsonSchema, `{ "$schema": "${draft201909DialectUri}", "$anchor": "_a" }`)).map(({ ruleId, at }) => [ruleId, at]))
      .to.eql([["https://json-schema.org/keyword/draft-2019-09/anchor", `"_a"`]]);
    expect(await check(jsonSchema, `{ "$schema": "${draft202012DialectUri}", "$vocabulary": { "https://json-schema.org/draft/2020-12/vocab/core": "yes" } }`))
      .to.eql([{ reason: "Expected a boolean", ruleId: "https://json-schema.org/keyword/vocabulary", at: `"yes"` }]);
  });

  test("draft-04's exclusiveMaximum and exclusiveMinimum require maximum and minimum", async () => {
    expect(await check(jsonSchema, `{ "$schema": "${draft04DialectUri}#", "exclusiveMaximum": true, "minimum": 1, "exclusiveMinimum": false }`)).to.eql([
      { reason: "'exclusiveMaximum' requires 'maximum'", ruleId: "https://json-schema.org/keyword/draft-04/exclusiveMaximum", at: "true" }
    ]);
    expect(await check(jsonSchema, `{ "$schema": "${draft04DialectUri}#", "exclusiveMinimum": true, "maximum": 1, "exclusiveMaximum": true }`)).to.eql([
      { reason: "'exclusiveMinimum' requires 'minimum'", ruleId: "https://json-schema.org/keyword/draft-04/exclusiveMinimum", at: "true" }
    ]);
  });

  test("draft-04's enum, required, and dependencies can't be empty or have duplicates", async () => {
    const messages = await check(jsonSchema, `{
      "$schema": "${draft04DialectUri}#",
      "properties": {
        "a": { "enum": [] },
        "b": { "enum": [1, { "x": [1], "y": 2 }, 1.0, { "y": 2, "x": [1] }, "1", [1]] },
        "c": { "required": [] },
        "d": { "required": ["x", "x"] },
        "e": { "dependencies": { "x": [], "y": ["z", "z"], "z": {} } }
      }
    }`);

    expect(messages.map(({ reason, ruleId, at }) => [reason, ruleId, at])).to.eql([
      ["Expected at least one item", "https://json-schema.org/keyword/draft-04/enum", "[]"],
      ["This value is a duplicate", "https://json-schema.org/keyword/draft-04/enum", "1.0"],
      ["This value is a duplicate", "https://json-schema.org/keyword/draft-04/enum", `{ "y": 2, "x": [1] }`],
      ["Expected at least one item", "https://json-schema.org/keyword/draft-04/required", "[]"],
      ["'x' is a duplicate", "https://json-schema.org/keyword/draft-04/required", `"x"`],
      ["Expected at least one item", "https://json-schema.org/keyword/draft-04/dependencies", "[]"],
      ["'z' is a duplicate", "https://json-schema.org/keyword/draft-04/dependencies", `"z"`]
    ]);
  });

  test("type can only be empty before v1", async () => {
    expect(await check(jsonSchema, `{ "$schema": "${draft04DialectUri}#", "type": [] }`)).to.eql([]);
    expect(await check(jsonSchema, `{ "$schema": "${draft202012DialectUri}", "type": [] }`)).to.eql([]);
    expect(await check(jsonSchema, `{ "$schema": "${draft202012DialectUri}", "type": ["nope", "null", "null"] }`)).to.eql([
      { reason: "Expected one of 'null', 'boolean', 'object', 'array', 'number', 'string', 'integer'", ruleId: "https://json-schema.org/keyword/draft-2020-12/type", at: `"nope"` },
      { reason: "'null' is a duplicate", ruleId: "https://json-schema.org/keyword/draft-2020-12/type", at: `"null"` }
    ]);
    expect(await check(jsonSchema, `{ "$schema": "${v1DialectUri}", "type": [] }`)).to.eql([
      { reason: "Expected at least one type", ruleId: "https://json-schema.org/keyword/type", at: "[]" }
    ]);
  });

  test("enum and required can be empty or have duplicates after draft-04", async () => {
    const messages = await check(jsonSchema, `{ "$schema": "${v1DialectUri}", "enum": [], "properties": { "a": { "enum": [1, 1] }, "b": { "required": [] } } }`);

    expect(messages).to.eql([]);
  });

  test("a check can read a sibling that comes after it", async () => {
    /** @type (string | undefined)[] */
    const siblings = [];
    const jsonSchema = withV1Keywords({
      a: {
        uri: "https://example.com/keyword/a",
        shape: "data",
        siblings: { minLength: "https://json-schema.org/keyword/minLength" },
        check(_valueNode, context) {
          siblings.push(context.siblings.minLength?.type);
        }
      }
    });

    await check(jsonSchema, `{ "$schema": "${v1DialectUri}", "a": true, "minLength": 1 }`);

    expect(siblings).to.eql(["json"]);
  });

  test("a custom keyword's check sees which parts of the value are schemas", async () => {
    /** @type string[] */
    const types = [];
    const jsonSchema = withV1Keywords({
      pairs: {
        uri: "https://example.com/keyword/pairs",
        shape: { array: ["schema", "data"] },
        check(valueNode, context) {
          if (valueNode.jsonType !== "array") {
            return;
          }
          for (const itemNode of valueNode.children) {
            types.push(itemNode.type);
            if (itemNode.type === "json") {
              context.message("Not a schema", itemNode);
            }
          }
          context.message("The whole value");
        }
      }
    });

    const messages = await check(jsonSchema, `{ "$schema": "${v1DialectUri}", "pairs": [{}, 1] }`);

    expect(types).to.eql(["json-schema", "json"]);
    expect(messages).to.eql([
      { reason: "Not a schema", ruleId: "https://example.com/keyword/pairs", at: "1" },
      { reason: "The whole value", ruleId: "https://example.com/keyword/pairs", at: "[{}, 1]" }
    ]);
  });

  test("a value that couldn't be parsed isn't checked", async () => {
    const messages = await check(jsonSchema, `{ "$schema": "${v1DialectUri}", "minLength": NaN, "required": [NaN] }`, "failure");

    // Only the syntax errors
    expect(messages.map(({ ruleId }) => ruleId)).to.eql(["invalid-literal", "invalid-literal"]);
  });

  test("keywords ignored because of $ref aren't checked", async () => {
    const messages = await check(jsonSchema, `{ "$schema": "${draft07DialectUri}", "$ref": "#/definitions/a", "minLength": -1 }`);

    expect(messages).to.eql([]);
  });

  test("a replaced keyword's check is used", async () => {
    const uri = "https://example.com/keyword/even";
    const jsonSchema = withV1Keywords({ even: { uri, shape: "data" } });
    expect(await check(jsonSchema, `{ "$schema": "${v1DialectUri}", "even": "yes" }`)).to.eql([]);

    const replaced = withV1Keywords({ even: { uri, shape: "data" } }, [{
      uri,
      shape: "data",
      check(valueNode, context) {
        if (valueNode.jsonType !== "boolean") {
          context.message("Expected a boolean");
        }
      }
    }]);
    expect(await check(replaced, `{ "$schema": "${v1DialectUri}", "even": "yes" }`)).to.eql([
      { reason: "Expected a boolean", ruleId: uri, at: `"yes"` }
    ]);
  });
});

describe("a schema with an invalid keyword value", () => {
  /** @type string */
  let directory;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "json-schema-"));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true });
  });

  test("can't be compiled", async () => {
    const path = join(directory, "invalid.schema.json");
    await writeFile(path, `{ "$schema": "${v1DialectUri}", "minLength": -1 }`);

    const jsonSchema = new JsonSchema({ allowRetrieval: [pathToFileURL(join(tmpdir(), "/")).href], dialects: [v1Dialect] });
    await expect(compile(jsonSchema, pathToFileURL(path).toString())).rejects.toMatchObject({
      messages: [{ ruleId: "https://json-schema.org/keyword/minLength" }]
    });
  });
});

/**
 * Each message's reason, rule, and the text it's placed on
 *
 * @type (jsonSchema: JsonSchema, json: string, accept?: JsonParseStatus) => Promise<{ reason: string; ruleId?: string; at: string }[]>
 */
const check = async (jsonSchema, json, accept) => {
  const file = new VFile(json);
  const processor = unified()
    .use(rejsonParse, { accept, url: baseUri })
    .use(jsonSchemaResolve, { session: jsonSchema.session() });
  await processor.run(processor.parse(file), file);

  return file.messages.map(({ reason, ruleId, place }) => {
    const { start, end } = /** @type any */ (place);
    return { reason, ruleId, at: json.slice(start.offset, end.offset) };
  });
};
