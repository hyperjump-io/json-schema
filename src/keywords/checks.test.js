import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeEach, beforeAll, afterAll, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser/json";
import { JsonSchema } from "../json-schema.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { v1DialectUri } from "../dialects/v1/index.js";
import { addDraft07, draft07DialectUri } from "../dialects/draft-07/index.js";
import { addDraft201909, draft201909DialectUri } from "../dialects/draft-2019-09/index.js";
import { addDraft202012, draft202012DialectUri } from "../dialects/draft-2020-12/index.js";

/**
 * @import { JsonParseStatus } from "@hyperjump/browser/json"
 * @import { VFileMessage } from "vfile-message"
 */

const baseUri = "https://example.com/schema";

/**
 * Each message's reason, rule, and the text it's placed on
 *
 * @type (jsonSchema: JsonSchema, json: string, accept?: JsonParseStatus) => Promise<{ reason: string; ruleId?: string; at: string }[]>
 */
const check = async (jsonSchema, json, accept) => {
  const file = new VFile(json);
  const processor = unified()
    .use(rejsonParse, { accept })
    .use(jsonSchemaResolve, { session: jsonSchema.session(), uri: baseUri });
  await processor.run(processor.parse(file), file);

  return file.messages.map(({ reason, ruleId, place }) => {
    const { start, end } = /** @type any */ (place);
    return { reason, ruleId, at: json.slice(start.offset, end.offset) };
  });
};

describe("keyword checks", () => {
  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = new JsonSchema();
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
    addDraft07(jsonSchema);
    addDraft201909(jsonSchema);
    addDraft202012(jsonSchema);

    expect(await check(jsonSchema, `{ "$schema": "${draft07DialectUri}", "dependencies": { "a": ["b", 1], "c": {} } }`))
      .to.eql([{ reason: "Expected a string", ruleId: "https://json-schema.org/keyword/draft-04/dependencies", at: "1" }]);
    expect((await check(jsonSchema, `{ "$schema": "${draft201909DialectUri}", "$anchor": "_a" }`)).map(({ ruleId, at }) => [ruleId, at]))
      .to.eql([["https://json-schema.org/keyword/draft-2019-09/anchor", `"_a"`]]);
    expect(await check(jsonSchema, `{ "$schema": "${draft202012DialectUri}", "$vocabulary": { "https://json-schema.org/draft/2020-12/vocab/core": "yes" } }`))
      .to.eql([{ reason: "Expected a boolean", ruleId: "https://json-schema.org/keyword/vocabulary", at: `"yes"` }]);
  });

  test("a custom keyword's check sees which parts of the value are schemas", async () => {
    /** @type string[] */
    const types = [];
    jsonSchema.addKeyword({
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
    });
    jsonSchema.extendDialect(v1DialectUri, { keywords: { pairs: "https://example.com/keyword/pairs" } });

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
    addDraft07(jsonSchema);
    const messages = await check(jsonSchema, `{ "$schema": "${draft07DialectUri}", "$ref": "#/definitions/a", "minLength": -1 }`);

    expect(messages).to.eql([]);
  });

  test("a replaced keyword's check is used", async () => {
    const uri = "https://example.com/keyword/even";
    jsonSchema.addKeyword({ uri, shape: "data" });
    jsonSchema.extendDialect(v1DialectUri, { keywords: { even: uri } });
    expect(await check(jsonSchema, `{ "$schema": "${v1DialectUri}", "even": "yes" }`)).to.eql([]);

    jsonSchema.addKeyword({
      uri,
      shape: "data",
      check(valueNode, context) {
        if (valueNode.jsonType !== "boolean") {
          context.message("Expected a boolean");
        }
      }
    });
    expect(await check(jsonSchema, `{ "$schema": "${v1DialectUri}", "even": "yes" }`)).to.eql([
      { reason: "Expected a boolean", ruleId: uri, at: `"yes"` }
    ]);
  });
});

describe("a schema with an invalid keyword value", () => {
  /** @type string */
  let directory;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "json-schema-next-"));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true });
  });

  test("can't be compiled", async () => {
    const path = join(directory, "invalid.schema.json");
    await writeFile(path, `{ "$schema": "${v1DialectUri}", "minLength": -1 }`);

    await expect(new JsonSchema().compile(pathToFileURL(path).toString())).rejects.toSatisfy((/** @type Error */ error) => {
      return /** @type VFileMessage */ (error.cause).ruleId === "https://json-schema.org/keyword/minLength";
    });
  });
});
