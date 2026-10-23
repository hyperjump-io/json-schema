import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import keywordWithDefaultValue from "./keyword-with-default-value.js";

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft201909 = "https://json-schema.org/draft/2019-09/schema";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(keywordWithDefaultValue)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

describe("keyword-with-default-value", () => {
  test("additionalProperties: true", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "additionalProperties": true }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'additionalProperties' is true, which is the same as leaving it out"
    ]);
    expect(file.messages[0].ruleId).to.equal("keyword-with-default-value");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 62, offset: 61 },
      end: { line: 1, column: 90, offset: 89 }
    });
  });

  test("additionalProperties: {}", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "additionalProperties": {} }`)).to.eql([
      "'additionalProperties' is {}, which is the same as leaving it out"
    ]);
  });

  test("additionalProperties that isn't empty", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "additionalProperties": { "type": "string" } }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft202012}", "additionalProperties": false }`)).to.eql([]);
  });

  // It marks properties as evaluated, but nobody writes it for that
  test("additionalProperties: true under unevaluatedProperties", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "allOf": [{ "additionalProperties": true }],
      "unevaluatedProperties": false
    }`)).to.eql([
      "'additionalProperties' is true, which is the same as leaving it out"
    ]);
  });

  test("schemas", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "prefixItems": [{ "type": "string" }],
      "items": true,
      "unevaluatedItems": {},
      "unevaluatedProperties": true,
      "propertyNames": {},
      "contentMediaType": "application/json",
      "contentSchema": true
    }`)).to.eql([
      "'items' is true, which is the same as leaving it out",
      "'unevaluatedItems' is {}, which is the same as leaving it out",
      "'unevaluatedProperties' is true, which is the same as leaving it out",
      "'propertyNames' is {}, which is the same as leaving it out",
      "'contentSchema' is true, which is the same as leaving it out"
    ]);
  });

  test("items and additionalItems in 2019-09", async () => {
    expect(await reasons(`{ "$schema": "${draft201909}", "items": [{ "type": "string" }], "additionalItems": true }`)).to.eql([
      "'additionalItems' is true, which is the same as leaving it out"
    ]);
    expect(await reasons(`{ "$schema": "${draft201909}", "items": {} }`)).to.eql([
      "'items' is {}, which is the same as leaving it out"
    ]);
  });

  test("items: {} in draft-07", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "items": {} }`)).to.eql([
      "'items' is {}, which is the same as leaving it out"
    ]);
  });

  test("empty objects and arrays", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "properties": {},
      "patternProperties": {},
      "dependentRequired": {},
      "dependentSchemas": {},
      "required": []
    }`)).to.eql([
      "'properties' is {}, which is the same as leaving it out",
      "'patternProperties' is {}, which is the same as leaving it out",
      "'dependentRequired' is {}, which is the same as leaving it out",
      "'dependentSchemas' is {}, which is the same as leaving it out",
      "'required' is [], which is the same as leaving it out"
    ]);
  });

  test("empty dependencies", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "dependencies": {} }`)).to.eql([
      "'dependencies' is {}, which is the same as leaving it out"
    ]);
    expect(await reasons(`{ "$schema": "${draft04}", "dependencies": {} }`)).to.eql([
      "'dependencies' is {}, which is the same as leaving it out"
    ]);
  });

  test("lower limits", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "minLength": 0,
      "minItems": 0,
      "minProperties": 0,
      "contains": { "type": "string" },
      "minContains": 1
    }`)).to.eql([
      "'minLength' is 0, which is the same as leaving it out",
      "'minItems' is 0, which is the same as leaving it out",
      "'minProperties' is 0, which is the same as leaving it out",
      "'minContains' is 1, which is the same as leaving it out"
    ]);
  });

  test("false flags", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "uniqueItems": false,
      "readOnly": false,
      "writeOnly": false,
      "deprecated": false
    }`)).to.eql([
      "'uniqueItems' is false, which is the same as leaving it out",
      "'readOnly' is false, which is the same as leaving it out",
      "'writeOnly' is false, which is the same as leaving it out",
      "'deprecated' is false, which is the same as leaving it out"
    ]);
    expect(await reasons(`{ "$schema": "${draft04}", "maximum": 5, "exclusiveMaximum": false, "minimum": 1, "exclusiveMinimum": false }`)).to.eql([
      "'exclusiveMaximum' is false, which is the same as leaving it out",
      "'exclusiveMinimum' is false, which is the same as leaving it out"
    ]);
  });

  test("an empty required in draft-04 is a schema error", async () => {
    const file = await lint(`{ "$schema": "${draft04}", "required": [] }`);
    expect(file.messages.filter((message) => message.ruleId === "keyword-with-default-value")).to.eql([]);
  });

  test("values that aren't defaults", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "properties": { "foo": true },
      "required": ["foo"],
      "minLength": 1,
      "uniqueItems": true,
      "readOnly": true,
      "exclusiveMaximum": 0,
      "multipleOf": 1
    }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "foo": { "minItems": 0 } } }`)).to.eql([
      "'minItems' is 0, which is the same as leaving it out"
    ]);
  });

  test("a property named like the keyword", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "properties": {}, "minLength": { "type": "number" } } }`)).to.eql([]);
  });

  test("a keyword the dialect doesn't have", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "propertyNames": {}, "dependentRequired": {} }`)).to.eql([]);
  });
});
