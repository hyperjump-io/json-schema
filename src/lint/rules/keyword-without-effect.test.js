import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import keywordWithoutEffect from "./keyword-without-effect.js";

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(keywordWithoutEffect)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

describe("keyword-without-effect", () => {
  test("properties: {}", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "properties": {} }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'properties' has no effect"]);
    expect(file.messages[0].ruleId).to.equal("keyword-without-effect");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 62, offset: 61 },
      end: { line: 1, column: 78, offset: 77 }
    });
  });

  test("empty objects and arrays", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "properties": {},
      "patternProperties": {},
      "dependentRequired": {},
      "dependentSchemas": {},
      "required": [],
      "allOf": [{}]
    }`)).to.eql([
      "'properties' has no effect",
      "'patternProperties' has no effect",
      "'dependentRequired' has no effect",
      "'dependentSchemas' has no effect",
      "'required' has no effect",
      "'allOf' has no effect"
    ]);
  });

  test("empty dependencies", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "dependencies": {} }`)).to.eql(["'dependencies' has no effect"]);
    expect(await reasons(`{ "$schema": "${draft04}", "dependencies": {} }`)).to.eql(["'dependencies' has no effect"]);
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
      "'minLength' has no effect",
      "'minItems' has no effect",
      "'minProperties' has no effect",
      "'minContains' has no effect"
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
      "'uniqueItems' has no effect",
      "'readOnly' has no effect",
      "'writeOnly' has no effect",
      "'deprecated' has no effect"
    ]);
    expect(await reasons(`{ "$schema": "${draft04}", "maximum": 5, "exclusiveMaximum": false, "minimum": 1, "exclusiveMinimum": false }`)).to.eql([
      "'exclusiveMaximum' has no effect",
      "'exclusiveMinimum' has no effect"
    ]);
  });

  test("a schema with no effect", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "propertyNames": {}, "anyOf": [{ "$comment": "a" }], "not": {} }`)).to.eql([
      "'propertyNames' has no effect",
      "'anyOf' has no effect"
    ]);
  });

  test("dependentSchemas whose schemas have no effect", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "dependentSchemas": { "a": true } }`)).to.eql(["'dependentSchemas' has no effect"]);
  });

  test("a sibling that's read is used", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": {}, "additionalProperties": false }`)).to.eql([
      "'properties' has no effect"
    ]);
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "a": true }, "additionalProperties": false }`)).to.eql([]);
  });

  test("marks nothing reads in a group that isn't open", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "properties": {
        "foo": { "properties": { "a": true }, "patternProperties": { "^b": {} }, "prefixItems": [true] }
      }
    }`)).to.eql([
      "'properties' has no effect",
      "'patternProperties' has no effect",
      "'prefixItems' has no effect"
    ]);
  });

  test("marks something in the group reads", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "properties": {
        "foo": { "allOf": [{ "properties": { "a": true } }], "unevaluatedProperties": false }
      }
    }`)).to.eql([]);
  });

  test("marks in an open group", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "a": true } }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft202012}", "$defs": { "foo": { "properties": { "a": true } } } }`)).to.eql([]);
  });

  test("marks every property is empty-catch-all-schema's", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "foo": { "additionalProperties": true } } }`)).to.eql([]);
  });

  test("a keyword without effect because of its siblings", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "if": { "type": "string" },
      "contentSchema": { "type": "string" },
      "contains": { "type": "string" },
      "minContains": 0
    }`)).to.eql([]);
  });

  test("an unknown keyword", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "foo": 1 }`)).to.eql([]);
  });

  test("a reference to a schema with no effect", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "$ref": "#/$defs/a", "$defs": { "a": {} } }`)).to.eql(["'$ref' has no effect"]);
    expect(await reasons(`{ "$schema": "${draft202012}", "allOf": [{ "$ref": "#/$defs/a" }], "$defs": { "a": true } }`)).to.eql([
      "'allOf' has no effect",
      "'$ref' has no effect"
    ]);
    expect(await reasons(`{ "$schema": "${draft07}", "allOf": [{ "$ref": "#/definitions/a" }], "definitions": { "a": {} } }`)).to.eql(["'allOf' has no effect"]);
  });

  test("a reference to a schema with an effect", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "$ref": "#/$defs/a", "$defs": { "a": { "type": "string" } } }`)).to.eql([]);
  });

  test("a reference that can't be followed", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "$ref": "https://example.com/unknown" }`)).to.eql([]);
  });

  test("a reference that applies itself", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "$defs": { "a": { "allOf": [{ "$ref": "#/$defs/a" }] } } }`)).to.eql([]);
  });

  test("an annotation in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "allOf": [{ "title": "a" }] }`)).to.eql([]);
  });

  test("an empty required in draft-04 is a schema error", async () => {
    const file = await lint(`{ "$schema": "${draft04}", "required": [] }`);
    expect(file.messages.filter((message) => message.ruleId === "keyword-without-effect")).to.eql([]);
  });

  test("values with an effect", async () => {
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
      "'minItems' has no effect"
    ]);
  });

  test("a property named like the keyword", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "properties": {}, "minLength": { "type": "number" } } }`)).to.eql([]);
  });
});
