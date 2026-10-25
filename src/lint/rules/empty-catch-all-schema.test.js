import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import emptyCatchAllSchema from "./empty-catch-all-schema.js";

const draft07 = "http://json-schema.org/draft-07/schema#";
const draft201909 = "https://json-schema.org/draft/2019-09/schema";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

describe("empty-catch-all-schema", () => {
  test("additionalProperties: true", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "additionalProperties": true }`);
    expect(file.messages.map((message) => message.reason)).to.eql([reason("additionalProperties")]);
    expect(file.messages[0].ruleId).to.equal("empty-catch-all-schema");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 62, offset: 61 },
      end: { line: 1, column: 90, offset: 89 }
    });
  });

  test("a schema with no effect", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "additionalProperties": {} }`)).to.eql([reason("additionalProperties")]);
    expect(await reasons(`{ "$schema": "${draft202012}", "additionalProperties": { "minLength": 0 } }`)).to.eql([reason("additionalProperties")]);
  });

  test("a schema with an effect", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "additionalProperties": { "type": "string" } }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft202012}", "additionalProperties": false }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft202012}", "additionalProperties": { "title": "a" } }`)).to.eql([]);
  });

  // It marks properties as evaluated, but nobody writes it for that
  test("additionalProperties: true under unevaluatedProperties", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "allOf": [{ "additionalProperties": true }],
      "unevaluatedProperties": false
    }`)).to.eql([reason("additionalProperties")]);
  });

  test("items and unevaluated keywords", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "prefixItems": [{ "type": "string" }],
      "items": true,
      "unevaluatedItems": {},
      "unevaluatedProperties": true
    }`)).to.eql([reason("items"), reason("unevaluatedItems"), reason("unevaluatedProperties")]);
  });

  test("items and additionalItems in 2019-09", async () => {
    expect(await reasons(`{ "$schema": "${draft201909}", "items": [{ "type": "string" }], "additionalItems": true }`)).to.eql([reason("additionalItems")]);
    expect(await reasons(`{ "$schema": "${draft201909}", "items": {} }`)).to.eql([reason("items")]);
  });

  test("items: {} in draft-07", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "items": {} }`)).to.eql([reason("items")]);
  });

  test("a reference to a schema with no effect", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "additionalProperties": { "$ref": "#/$defs/a" }, "$defs": { "a": {} } }`)).to.eql([reason("additionalProperties")]);
    expect(await reasons(`{ "$schema": "${draft202012}", "additionalProperties": { "$ref": "#/$defs/a" }, "$defs": { "a": { "type": "string" } } }`)).to.eql([]);
  });

  test("a pattern or a named property isn't every property", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "patternProperties": { "^a": true }, "properties": { "b": {} } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(emptyCatchAllSchema)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

/** @type (name: string) => string */
const reason = (name) => `'${name}' has a schema that allows everything, which is the same as leaving it out`;
