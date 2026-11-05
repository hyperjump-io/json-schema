import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import contradictoryLimits from "./contradictory-limits.js";

const v1 = "https://json-schema.org/v1";
const draft04 = "http://json-schema.org/draft-04/schema#";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft2020 = "https://json-schema.org/draft/2020-12/schema";

describe("contradictory-limits", () => {
  test("minimum greater than maximum", async () => {
    const json = `{ "$schema": "${v1}", "minimum": 10, "maximum": 5 }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["'minimum' is greater than 'maximum', so no number is valid"]);
    expect(file.messages[0].ruleId).to.equal("contradictory-limits");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.indexOf(`"maximum"`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 13, offset: offset + 12 }
    });
  });

  test("the message is on whichever comes second", async () => {
    const json = `{ "$schema": "${v1}", "maximum": 5, "minimum": 10 }`;
    const file = await lint(json);
    expect(/** @type any */ (file.messages[0].place).start.offset).to.equal(json.indexOf(`"minimum"`));
  });

  test("equal inclusive limits allow one number", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "minimum": 5, "maximum": 5 }`)).to.eql([]);
  });

  test("equal limits where one is exclusive", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "exclusiveMinimum": 5, "maximum": 5 }`))
      .to.eql(["'exclusiveMinimum' is equal to 'maximum', so no number is valid"]);
    expect(await reasons(`{ "$schema": "${v1}", "exclusiveMinimum": 5, "exclusiveMaximum": 5 }`))
      .to.eql(["'exclusiveMinimum' is equal to 'exclusiveMaximum', so no number is valid"]);
  });

  test("exclusive limits", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "exclusiveMinimum": 100, "exclusiveMaximum": 50 }`))
      .to.eql(["'exclusiveMinimum' is greater than 'exclusiveMaximum', so no number is valid"]);
  });

  test("the tightest limits are compared", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "minimum": 1, "exclusiveMinimum": 8, "maximum": 6, "exclusiveMaximum": 10 }`))
      .to.eql(["'exclusiveMinimum' is greater than 'maximum', so no number is valid"]);
    expect(await reasons(`{ "$schema": "${v1}", "minimum": 5, "exclusiveMinimum": 5, "maximum": 5 }`))
      .to.eql(["'exclusiveMinimum' is equal to 'maximum', so no number is valid"]);
    expect(await reasons(`{ "$schema": "${v1}", "minimum": 1, "exclusiveMinimum": 0, "maximum": 6 }`)).to.eql([]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "minimum": 10, "maximum": 5 }`))
      .to.eql(["'minimum' is greater than 'maximum', so no number is valid"]);
    expect(await reasons(`{ "$schema": "${draft04}", "minimum": 5, "exclusiveMinimum": true, "maximum": 5 }`))
      .to.eql(["'minimum' with 'exclusiveMinimum' is equal to 'maximum', so no number is valid"]);
    expect(await reasons(`{ "$schema": "${draft04}", "minimum": 5, "exclusiveMinimum": false, "maximum": 5 }`)).to.eql([]);
  });

  test("counts", async () => {
    expect(await reasons(`{
      "$schema": "${v1}",
      "minLength": 3, "maxLength": 2,
      "minItems": 3, "maxItems": 2,
      "minProperties": 3, "maxProperties": 2,
      "contains": {}, "minContains": 3, "maxContains": 2
    }`)).to.eql([
      "'minLength' is greater than 'maxLength', so no string is valid",
      "'minItems' is greater than 'maxItems', so no array is valid",
      "'minProperties' is greater than 'maxProperties', so no object is valid",
      "'minContains' is greater than 'maxContains', so no array is valid"
    ]);
  });

  test("contains limits in any order", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "maxContains": 2, "contains": {}, "minContains": 3 }`))
      .to.eql(["'minContains' is greater than 'maxContains', so no array is valid"]);
  });

  test("maxContains less than what contains requires without minContains", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "contains": {}, "maxContains": 0 }`))
      .to.eql(["'maxContains' is 0, but 'contains' requires at least 1 matching item, so no array is valid"]);
    expect(await reasons(`{ "$schema": "${v1}", "contains": {}, "minContains": 1, "maxContains": 0 }`))
      .to.eql(["'maxContains' is 0, but 'contains' requires at least 1 matching item, so no array is valid"]);
    expect(await reasons(`{ "$schema": "${v1}", "contains": {}, "minContains": 0, "maxContains": 0 }`)).to.eql([]);
  });

  test("equal counts", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "minLength": 2, "maxLength": 2 }`)).to.eql([]);
  });

  test("more required properties than maxProperties allows", async () => {
    const json = `{ "$schema": "${v1}", "maxProperties": 1, "required": ["a", "b"] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "2 properties are required, but 'maxProperties' allows at most 1, so no object is valid",
      "'required' requires 2 properties, but 'maxProperties' allows at most 1, so no object is valid"
    ]);
    expect(file.messages[0].column).to.equal(json.indexOf(`"maxProperties"`) + 1);
    expect(file.messages[1].column).to.equal(json.indexOf(`"required"`) + 1);
  });

  test("as many required properties as maxProperties allows", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "required": ["a", "b"], "maxProperties": 2 }`)).to.eql([]);
  });

  test("required and maxProperties in draft-04", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "required": ["a", "b"], "maxProperties": 1 }`)).to.eql([
      "'required' requires 2 properties, but 'maxProperties' allows at most 1, so no object is valid",
      "2 properties are required, but 'maxProperties' allows at most 1, so no object is valid"
    ]);
  });

  test("any keyword that requires properties", async () => {
    const json = `{ "$schema": "${v1}", "properties": { "a": {}, "b": {} }, "requireAllExcept": [], "maxProperties": 1 }`;
    expect(await reasons(json)).to.eql([
      "'requireAllExcept' requires 2 properties, but 'maxProperties' allows at most 1, so no object is valid",
      "2 properties are required, but 'maxProperties' allows at most 1, so no object is valid"
    ]);
  });

  test("every keyword that requires some of the properties names the others", async () => {
    const json = `{ "$schema": "${v1}", "properties": { "a": {}, "b": {} }, "required": ["a", "c"], "requireAllExcept": [], "maxProperties": 2 }`;
    expect(await reasons(json)).to.eql([
      "'required' and 'requireAllExcept' require 3 properties, but 'maxProperties' allows at most 2, so no object is valid",
      "'requireAllExcept' and 'required' require 3 properties, but 'maxProperties' allows at most 2, so no object is valid",
      "3 properties are required, but 'maxProperties' allows at most 2, so no object is valid"
    ]);
  });

  test("dependencies on required properties", async () => {
    const json = `{ "$schema": "${v1}", "required": ["a"], "dependentRequired": { "a": ["b"], "b": ["c"], "x": ["y", "z"] }, "maxProperties": 2 }`;
    expect(await reasons(json)).to.eql([
      "'required' and 'dependentRequired' require 3 properties, but 'maxProperties' allows at most 2, so no object is valid",
      "'dependentRequired' and 'required' require 3 properties, but 'maxProperties' allows at most 2, so no object is valid",
      "3 properties are required, but 'maxProperties' allows at most 2, so no object is valid"
    ]);
  });

  test("a dependency on a property that isn't required", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "dependentRequired": { "a": ["b", "c"] }, "maxProperties": 2 }`)).to.eql([]);
  });

  test("schemas applied to the same object", async () => {
    const json = `{
      "$schema": "${draft2020}",
      "required": ["a"],
      "allOf": [{ "$ref": "#/$defs/b" }],
      "dependentSchemas": { "a": { "required": ["d"] } },
      "$defs": { "b": { "required": ["b", "c"], "$ref": "#" } },
      "maxProperties": 3
    }`;
    expect(await reasons(json)).to.eql([
      "'required', 'allOf', and 'dependentSchemas' require 4 properties, but 'maxProperties' allows at most 3, so no object is valid",
      "'allOf', 'required', and 'dependentSchemas' require 4 properties, but 'maxProperties' allows at most 3, so no object is valid",
      "'dependentSchemas', 'required', and 'allOf' require 4 properties, but 'maxProperties' allows at most 3, so no object is valid",
      "4 properties are required, but 'maxProperties' allows at most 3, so no object is valid"
    ]);
  });

  test("a dependency that's a schema", async () => {
    const json = `{ "$schema": "${draft07}", "required": ["a"], "dependencies": { "a": ["b"], "b": { "required": ["c"] } }, "maxProperties": 2 }`;
    expect(await reasons(json)).to.have.length(3);
  });

  test("schemas that don't all have to pass", async () => {
    // Whichever passes adds a property
    expect(await reasons(`{ "$schema": "${draft2020}", "required": ["a"], "anyOf": [{ "required": ["b"] }, { "required": ["c"] }], "maxProperties": 1 }`)).to.eql([
      "'required' and 'anyOf' require at least 2 properties, but 'maxProperties' allows at most 1, so no object is valid",
      "'anyOf' and 'required' require at least 2 properties, but 'maxProperties' allows at most 1, so no object is valid",
      "at least 2 properties are required, but 'maxProperties' allows at most 1, so no object is valid"
    ]);
    expect(await reasons(`{ "$schema": "${draft2020}", "required": ["a"], "anyOf": [{ "required": ["b"] }, true], "maxProperties": 1 }`)).to.eql([]);
  });

  test("if, then, and else", async () => {
    const json = `{ "$schema": "${draft2020}", "if": { "required": ["a"] }, "then": { "required": ["b"] }, "else": { "required": ["c", "d"] }, "maxProperties": 1 }`;
    expect(await reasons(json)).to.eql([
      "'if', 'then', and 'else' require at least 2 properties, but 'maxProperties' allows at most 1, so no object is valid",
      "'then', 'if', and 'else' require at least 2 properties, but 'maxProperties' allows at most 1, so no object is valid",
      "'else', 'if', and 'then' require at least 2 properties, but 'maxProperties' allows at most 1, so no object is valid",
      "at least 2 properties are required, but 'maxProperties' allows at most 1, so no object is valid"
    ]);
  });

  test("a value that doesn't fit its keyword isn't a limit", async () => {
    // The resolver reports the values
    /** @type (json: string) => Promise<string[]> */
    const ruleReasons = async (json) => (await lint(json)).messages
      .filter((message) => message.ruleId === "contradictory-limits")
      .map((message) => message.reason);
    expect(await ruleReasons(`{ "$schema": "${v1}", "minimum": "x", "maximum": 1 }`)).to.eql([]);
    expect(await ruleReasons(`{ "$schema": "${v1}", "minimum": 5, "maximum": 1, "properties": [1, 2], "required": "a" }`))
      .to.eql(["'minimum' is greater than 'maximum', so no number is valid"]);
  });

  test("minContains and maxContains without contains", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "minContains": 3, "maxContains": 2 }`)).to.eql([]);
  });

  test("limits in different schemas", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "minimum": 10, "properties": { "foo": { "maximum": 5 } } }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "properties": { "foo": { "minimum": 10, "maximum": 5 } } }`)).to.have.length(1);
  });

  test("a limit in allOf", async () => {
    const json = `{ "$schema": "${v1}", "minimum": 5, "allOf": [{ "maximum": 3 }] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["'minimum' is greater than 'maximum' in 'allOf', so no number is valid"]);
    expect(/** @type any */ (file.messages[0].place).start.offset).to.equal(json.indexOf(`"allOf"`));
  });

  test("a limit behind $ref", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "minimum": 5, "$ref": "#/$defs/max", "$defs": { "max": { "maximum": 3 } } }`))
      .to.eql(["'minimum' is greater than 'maximum' in '$ref', so no number is valid"]);
  });

  test("limits in different schemas in allOf", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "allOf": [{ "minLength": 5 }, { "maxLength": 3 }] }`))
      .to.eql(["'minLength' in 'allOf' is greater than 'maxLength' in 'allOf', so no string is valid"]);
  });

  test("a schema applied in allOf through another", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "minimum": 5, "allOf": [{ "$ref": "#/$defs/max" }], "$defs": { "max": { "maximum": 3 } } }`))
      .to.eql(["'minimum' is greater than 'maximum' in 'allOf', so no number is valid"]);
  });

  test("limits in the same applied schema are reported there", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "allOf": [{ "minimum": 5, "maximum": 3 }] }`))
      .to.eql(["'minimum' is greater than 'maximum', so no number is valid"]);
    expect(await reasons(`{ "$schema": "${v1}", "allOf": [{ "minimum": 5, "allOf": [{ "maximum": 3 }] }] }`))
      .to.eql(["'minimum' is greater than 'maximum' in 'allOf', so no number is valid"]);
  });

  test("schemas that don't have to pass aren't limits", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "minimum": 5, "anyOf": [{ "maximum": 3 }, { "type": "string" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${v1}", "minimum": 5, "not": { "maximum": 3 } }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${v1}", "minimum": 5, "if": { "type": "integer" }, "then": { "maximum": 3 } }`)).to.eql([]);
  });

  test("a schema that applies itself", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "minimum": 5, "allOf": [{ "$ref": "#" }] }`)).to.eql([]);
  });

  test("maxProperties in an applied schema is only compared there", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "allOf": [{ "maxProperties": 1, "required": ["a", "b"] }] }`)).to.have.length(2);
  });

  test("properties named like limits aren't keywords", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "properties": { "minimum": { "const": 10 }, "maximum": { "const": 5 } } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(contradictoryLimits)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
