import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser/json";
import { hyperjump } from "../../cli/hyperjump.js";
import { JsonSchema } from "../../json-schema.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { addDraft202012 } from "../../dialects/draft-2020-12/index.js";
import mergeableAllOfSchema from "./mergeable-all-of-schema.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";
const draft07 = "http://json-schema.org/draft-07/schema#";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await hyperjump()
    .use(mergeableAllOfSchema)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

const mergeable = "This schema's keywords can be moved into the schema 'allOf' is in";

describe("mergeable-all-of-schema", () => {
  test("a schema that can be moved", async () => {
    const json = `{ "$schema": "${draft2020}", "allOf": [{ "type": "string", "minLength": 5 }] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([mergeable]);
    expect(file.messages[0].ruleId).to.equal("mergeable-all-of-schema");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
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
    expect(await reasons(`{ "$schema": "${draft2020}", "$defs": { "a": {} }, "$ref": "#/$defs/a", "allOf": [{ "$ref": "#/$defs/a" }] }`)).to.eql([]);
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
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "allOf": [{ "type": "object", "required": ["a"] }] }`)).to.eql([]);
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
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "$defs": {}, "type": "string" }] }`)).to.eql([]);
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
    const jsonSchema = new JsonSchema();
    addDraft202012(jsonSchema);
    jsonSchema.addKeyword({ uri: "https://example.com/keyword/scale", shape: "data", siblings: ["https://json-schema.org/keyword/maximum"] });
    jsonSchema.extendDialect(draft2020, { keywords: { scale: "https://example.com/keyword/scale" } });

    /** @type (json: string) => Promise<string[]> */
    const customReasons = async (json) => {
      const file = new VFile({ path: "/schemas/a.schema.json", value: json });
      const processor = unified()
        .use(rejsonParse)
        .use(jsonSchemaResolve, { session: jsonSchema.session() })
        .use(mergeableAllOfSchema);
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
