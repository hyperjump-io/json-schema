import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import requiredPropertyNotAllowed from "./required-property-not-allowed.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

describe("required-property-not-allowed", () => {
  test("additionalProperties false", async () => {
    const json = `{ "$schema": "${draft2020}", "properties": { "a": true }, "additionalProperties": false, "required": ["a", "b"] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'b' is required, but 'additionalProperties' doesn't allow it, so no object is valid"
    ]);
    expect(file.messages[0].ruleId).to.equal("required-property-not-allowed");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.indexOf(`"b"`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 4, offset: offset + 3 }
    });
  });

  test("a pattern allows it", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "patternProperties": { "^b": true }, "additionalProperties": false, "required": ["b"] }`)).to.eql([]);
  });

  test("false in properties", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": false }, "required": ["a"] }`)).to.eql([
      "'a' is required, but 'properties' doesn't allow it, so no object is valid"
    ]);
  });

  test("false in a matching pattern", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": true }, "patternProperties": { "^a$": false }, "required": ["a"] }`)).to.eql([
      "'a' is required, but 'patternProperties' doesn't allow it, so no object is valid"
    ]);
  });

  test("allowed", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {} }, "additionalProperties": { "type": "string" }, "required": ["a", "b"] }`)).to.eql([]);
  });

  test("unevaluatedProperties false", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {} }, "unevaluatedProperties": false, "required": ["a", "b"] }`)).to.eql([
      "'b' is required, but 'unevaluatedProperties' doesn't allow it, so no object is valid"
    ]);
  });

  test("unevaluatedProperties false in v1", async () => {
    expect(await reasons(`{ "$schema": "https://json-schema.org/v1", "properties": { "name": {} }, "unevaluatedProperties": false, "required": ["target"] }`)).to.eql([
      "'target' is required, but 'unevaluatedProperties' doesn't allow it, so no object is valid"
    ]);
  });

  test("unevaluatedProperties that allows something", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "unevaluatedProperties": { "type": "string" }, "required": ["a"] }`)).to.eql([]);
  });

  test("unevaluatedProperties false with a property a pattern evaluates", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "patternProperties": { "^a": {} }, "unevaluatedProperties": false, "required": ["ab"] }`)).to.eql([]);
    // A keyword that couldn't be lowered might mark anything
    const notAPattern = `"patternProperties": { "(": {} }`;
    expect(await reasons(`{ "$schema": "${draft2020}", ${notAPattern}, "unevaluatedProperties": false, "required": ["a"] }`)).to.eql(["Expected a regular expression"]);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ ${notAPattern} }], "unevaluatedProperties": false, "required": ["a"] }`)).to.eql(["Expected a regular expression"]);
    expect(await reasons(`{ "$schema": "${draft2020}", ${notAPattern}, "additionalProperties": false, "required": ["a"] }`)).to.eql(["Expected a regular expression"]);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ ${notAPattern}, "additionalProperties": false }], "required": ["a"] }`)).to.eql(["Expected a regular expression"]);
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": 3, "additionalProperties": false, "required": ["a"] }`)).to.eql(["Expected an object"]);
    expect(await reasons(`{ "$schema": "${draft2020}", "then": {}, "minContains": 2, "$defs": {}, "title": "a", "unevaluatedProperties": false, "required": ["a"] }`)).to.have.length(1);
  });

  test("unevaluatedProperties false with additionalProperties", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "additionalProperties": {}, "unevaluatedProperties": false, "required": ["a"] }`)).to.eql([]);
  });

  test("unevaluatedProperties false with a property a schema that might pass evaluates", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "properties": { "a": {} } }, {}], "unevaluatedProperties": false, "required": ["a"] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "properties": { "a": {} } }, {}], "unevaluatedProperties": false, "required": ["a"] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "if": { "properties": { "a": {} } }, "unevaluatedProperties": false, "required": ["a"] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "if": {}, "then": { "properties": { "a": {} } }, "unevaluatedProperties": false, "required": ["a"] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "if": false, "else": { "properties": { "a": {} } }, "unevaluatedProperties": false, "required": ["a"] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "dependentSchemas": { "b": { "properties": { "a": {} } } }, "unevaluatedProperties": false, "required": ["a"] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "anyOf": [{ "$ref": "#/$defs/a" }] }], "unevaluatedProperties": false, "required": ["a"], "$defs": { "a": { "properties": { "a": {} } } } }`)).to.eql([]);
  });

  test("unevaluatedProperties false with a property no schema that might pass evaluates", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "properties": { "a": {} } }, { "$ref": "#/$defs/c" }], "unevaluatedProperties": false, "required": ["b"], "$defs": { "c": { "properties": { "c": {} } } } }`)).to.eql([
      "'b' is required, but 'unevaluatedProperties' doesn't allow it, so no object is valid"
    ]);
  });

  test("unevaluatedProperties false with a schema in not", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "not": { "properties": { "a": {} } }, "unevaluatedProperties": false, "required": ["a"] }`)).to.eql([
      "'a' is required, but 'unevaluatedProperties' doesn't allow it, so no object is valid"
    ]);
  });

  test("unevaluatedProperties false with what isn't known", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "$dynamicRef": "#a", "unevaluatedProperties": false, "required": ["a"], "$defs": { "a": { "$dynamicAnchor": "a" } } }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "$ref": "https://example.com/not-found", "unevaluatedProperties": false, "required": ["a"] }`)).to.eql([]);
  });

  test("unevaluatedProperties false with a schema that applies itself", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "$ref": "#" }, {}], "unevaluatedProperties": false, "required": ["a"] }`)).to.eql([
      "'a' is required, but 'unevaluatedProperties' doesn't allow it, so no object is valid"
    ]);
  });

  test("unevaluatedProperties doesn't see what the schema that applies it evaluates", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {} }, "required": ["a"], "allOf": [{ "unevaluatedProperties": false }] }`)).to.eql([
      "'a' is required, but 'unevaluatedProperties' in 'allOf' doesn't allow it, so no object is valid"
    ]);
  });

  test("unevaluatedProperties sees what the schemas it applies evaluate", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "properties": { "a": {} }, "required": ["a"] }], "unevaluatedProperties": false }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "properties": { "a": {} }, "required": ["b"] }], "unevaluatedProperties": false }`)).to.eql([
      "'b' is required in 'allOf', but 'unevaluatedProperties' doesn't allow it, so no object is valid"
    ]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "additionalProperties": false, "required": ["a"] } }`)).to.have.length(1);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "required": false, "additionalProperties": true } }`)).to.eql([]);
  });

  test("a schema that no value passes", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "required": ["a"], "properties": { "a": { "type": "string", "const": 1 } } }`)).to.eql([
      "'a' is required, but 'properties' doesn't allow it, so no object is valid"
    ]);
  });

  test("v1's requireAllExcept", async () => {
    expect(await reasons(`{
      "$schema": "https://json-schema.org/v1",
      "properties": { "a": false, "b": true },
      "requireAllExcept": ["b"]
    }`)).to.eql([
      "'a' is required, but 'properties' doesn't allow it, so no object is valid"
    ]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "additionalProperties": false, "required": ["a"] }`)).to.have.length(1);
  });

  test("required in allOf", async () => {
    const json = `{ "$schema": "${draft2020}", "properties": { "a": true }, "additionalProperties": false, "allOf": [{ "required": ["b"] }] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'b' is required in 'allOf', but 'additionalProperties' doesn't allow it, so no object is valid"
    ]);
    expect(/** @type any */ (file.messages[0].place).start.offset).to.equal(json.indexOf(`"allOf"`));
  });

  test("required behind $ref", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "additionalProperties": false, "$ref": "#/$defs/b", "$defs": { "b": { "required": ["b"] } } }`)).to.eql([
      "'b' is required in '$ref', but 'additionalProperties' doesn't allow it, so no object is valid"
    ]);
  });

  test("not allowed in allOf", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "required": ["b"], "allOf": [{ "properties": { "a": true }, "additionalProperties": false }] }`)).to.eql([
      "'b' is required, but 'additionalProperties' in 'allOf' doesn't allow it, so no object is valid"
    ]);
  });

  test("required and not allowed in the same applied schema is reported there", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "additionalProperties": false, "required": ["b"] }] }`)).to.eql([
      "'b' is required, but 'additionalProperties' doesn't allow it, so no object is valid"
    ]);
  });

  test("schemas that don't have to pass aren't considered", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "additionalProperties": false, "anyOf": [{ "required": ["b"] }, true] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "additionalProperties": false, "not": { "required": ["b"] } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(requiredPropertyNotAllowed)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
