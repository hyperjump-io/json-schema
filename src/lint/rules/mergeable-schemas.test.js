import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse, Hyperjump } from "@hyperjump/browser";
import { linter } from "../test-linter.js";
import { jsonSchemaConfig, extendDialect } from "../../json-schema.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { draft202012Dialect } from "../../dialects/draft-2020-12/index.js";
import mergeableSchemas from "./mergeable-schemas.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";
const draft07 = "http://json-schema.org/draft-07/schema#";

const mergeable = "This schema's keywords can be moved into the schema 'allOf' is in";

describe("mergeable-schemas", () => {
  test("a schema that can be moved", async () => {
    const json = `{ "$schema": "${draft2020}", "allOf": [{ "type": "string", "minLength": 5 }] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([mergeable]);
    expect(file.messages[0].ruleId).to.equal("mergeable-schemas");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const branch = `{ "type": "string", "minLength": 5 }`;
    const offset = json.indexOf(branch);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + branch.length + 1, offset: offset + branch.length }
    });
  });

  test("$ref is a keyword, from 2019-09", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "$defs": { "a": {} }, "allOf": [{ "$ref": "#/$defs/a" }] }`)).to.eql([mergeable]);
    expect(await reasons(`{ "$schema": "${draft2020}", "$defs": { "a": {} }, "allOf": [{ "$ref": "#/$defs/a" }, { "required": ["b"] }] }`))
      .to.eql([mergeable, mergeable]);
    expect(await reasons(`{ "$schema": "${draft2020}", "$defs": { "a": {}, "b": {} }, "$ref": "#/$defs/a", "allOf": [{ "$ref": "#/$defs/b" }] }`)).to.eql([]);
  });

  test("what a $ref refers to doesn't matter", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "$defs": { "a": { "allOf": [{ "$anchor": "x" }] } },
      "properties": { "foo": { "$ref": "#/$defs/a" } }
    }`)).to.eql([]);
  });

  test("properties with different names are combined", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "properties": { "name": {} }, "allOf": [{ "properties": { "age": {} } }] }`))
      .to.eql([mergeable]);
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {} }, "allOf": [{ "properties": { "b": {} } }, { "properties": { "b": {} } }] }`))
      .to.eql([mergeable]);
  });

  test("properties with a name in common", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": { "type": "string" } }, "allOf": [{ "properties": { "a": { "minLength": 1 } } }] }`))
      .to.eql([]);
  });

  test("required is combined", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "required": ["a"], "allOf": [{ "properties": { "b": {} } }, { "required": ["a", "b"] }] }`))
      .to.eql([mergeable, mergeable]);
  });

  test("properties next to patternProperties", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "patternProperties": { "^x-": {} }, "allOf": [{ "properties": { "b": {} } }] }`)).to.eql([mergeable]);
  });

  test("properties next to additionalProperties", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "additionalProperties": false, "allOf": [{ "properties": { "b": {} } }] }`)).to.eql([]);
  });

  test("a keyword that's already there", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "allOf": [{ "type": "array", "required": ["a"] }] }`)).to.eql([]);
  });

  test("a keyword that's already there with the same value", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "allOf": [{ "type": "object", "required": ["a"] }] }`)).to.eql([mergeable]);
    expect(await reasons(`{ "$schema": "${draft2020}", "$defs": { "a": {} }, "$ref": "#/$defs/a", "allOf": [{ "$ref": "#/$defs/a" }] }`)).to.eql([mergeable]);
  });

  test("v1's propertyDependencies are combined", async () => {
    expect(await reasons(`{
      "$schema": "https://json-schema.org/v1",
      "propertyDependencies": { "a": { "x": { "required": ["b"] } } },
      "allOf": [{ "propertyDependencies": { "c": { "y": { "required": ["d"] } } } }]
    }`)).to.eql([mergeable]);
  });

  test("keywords that apply schemas together aren't combined", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "anyOf": [{ "type": "string" }, { "type": "null" }],
      "allOf": [{ "anyOf": [{ "type": "number" }, { "type": "null" }] }]
    }`)).to.eql([]);
  });

  test("anyOf or oneOf with one schema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "type": "string" }] }`)).to.eql([
      "This schema's keywords can be moved into the schema 'anyOf' is in"
    ]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "string" }] }`)).to.eql([
      "This schema's keywords can be moved into the schema 'oneOf' is in"
    ]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "string" }, { "type": "number" }] }`)).to.eql([]);
  });

  test("a keyword from a schema before it", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "type": "number" }, { "maximum": 100 }, { "type": "integer" }] }`)).to.eql([mergeable, mergeable]);
  });

  test("keywords that depend on each other", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {} }, "allOf": [{ "additionalProperties": false }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "if": true, "allOf": [{ "then": false }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "contains": true }, { "minContains": 2 }] }`)).to.eql([mergeable]);
    expect(await reasons(`{ "$schema": "${draft2020}", "prefixItems": [{}], "allOf": [{ "items": false }] }`)).to.eql([]);
  });

  test("identifiers, definitions, and unevaluated keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "$anchor": "a", "type": "string" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "$defs": { "a": {} }, "type": "string" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "unevaluatedProperties": false }] }`)).to.eql([]);
  });

  test("booleans aren't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [true, false] }`)).to.eql([]);
  });

  test("a draft-07 $ref that's the only thing in the schema", async () => {
    expect(await reasons(`{
      "$schema": "${draft07}",
      "definitions": { "a": {} },
      "properties": { "foo": { "allOf": [{ "$ref": "#/definitions/a" }] } }
    }`)).to.eql(["This schema can replace the schema 'allOf' is in"]);
  });

  test("a draft-07 $ref with something next to allOf", async () => {
    expect(await reasons(`{
      "$schema": "${draft07}",
      "definitions": { "a": {} },
      "properties": { "foo": { "description": "a foo", "allOf": [{ "$ref": "#/definitions/a" }] } }
    }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft07}", "definitions": { "a": {} }, "allOf": [{ "$ref": "#/definitions/a" }] }`)).to.eql([]);
  });

  test("a draft-07 $ref that isn't the only schema in allOf", async () => {
    expect(await reasons(`{
      "$schema": "${draft07}",
      "definitions": { "a": {} },
      "properties": { "foo": { "allOf": [{ "$ref": "#/definitions/a" }, { "$ref": "#/definitions/a" }] } }
    }`)).to.eql([]);
  });

  test("a draft-07 $ref with other keywords", async () => {
    expect(await reasons(`{
      "$schema": "${draft07}",
      "definitions": { "a": {} },
      "properties": { "foo": { "type": "object", "allOf": [{ "$ref": "#/definitions/a" }, { "required": ["b"] }] } }
    }`)).to.eql([mergeable]);
  });

  test("a custom keyword that reads a sibling", async () => {
    const scaleKeyword = { uri: "https://example.com/keyword/scale", shape: /** @type const */ ("data"), siblings: { maximum: "https://json-schema.org/keyword/maximum" } };
    const jsonSchema = jsonSchemaConfig({
      dialects: [extendDialect(draft202012Dialect, { keywords: { scale: scaleKeyword } })]
    });

    /** @type (json: string) => Promise<string[]> */
    const customReasons = async (json) => {
      const file = new VFile({ path: "/schemas/a.schema.json", value: json });
      const processor = unified()
        .use(rejsonParse)
        .use(jsonSchemaResolve, { session: new Hyperjump(jsonSchema) })
        .use(mergeableSchemas);
      await processor.run(processor.parse(file), file);
      return file.messages.map((message) => message.reason);
    };

    expect(await customReasons(`{ "$schema": "${draft2020}", "maximum": 10, "allOf": [{ "scale": 2 }] }`)).to.eql([]);
    expect(await customReasons(`{ "$schema": "${draft2020}", "minimum": 10, "allOf": [{ "scale": 2 }] }`)).to.eql([mergeable]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "allOf": [{ "type": "string" }] } }`)).to.have.length(1);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "allOf": { "type": "array" } } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(mergeableSchemas)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
