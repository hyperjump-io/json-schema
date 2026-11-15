import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser";
import { jsonSchemaMediaTypes } from "../../json-schema.js";
import { JsonSchemaHyperjump } from "../../session.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { draft04Dialect } from "../../dialects/draft-04/index.js";
import { draft202012Dialect } from "../../dialects/draft-2020-12/index.js";
import { linter } from "../test-linter.js";
import invalidDefaultOrExample from "./invalid-default-or-example.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";
const uri = "https://example.com/schemas/a.schema.json";

const invalidDefault = "The 'default' value isn't valid against the schema it's in";
const invalidExample = "This example isn't valid against the schema it's in";

describe("invalid-default-or-example", () => {
  test("an invalid default", async () => {
    const json = `{ "$schema": "${draft2020}", "type": "integer", "default": "not-an-integer" }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([invalidDefault]);
    expect(file.messages[0].ruleId).to.equal("invalid-default-or-example");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const value = `"not-an-integer"`;
    const offset = json.indexOf(value);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + value.length + 1, offset: offset + value.length }
    });
  });

  test("a valid default", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "default": 1 }`)).to.eql([]);
  });

  test("each invalid example", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "examples": [42, "a", 1.5] }`)).to.eql([invalidExample, invalidExample]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "type": "object",
      "properties": { "flag": { "type": "boolean", "default": "maybe" } },
      "default": { "flag": "maybe" }
    }`)).to.eql([invalidDefault, invalidDefault]);
  });

  test("what the schema references counts", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "$defs": { "a": { "minimum": 10 } }, "$ref": "#/$defs/a", "default": 5 }`)).to.eql([invalidDefault]);
  });

  test("a default that a schema applying it with allOf rejects", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "type": "integer",
      "maximum": 10,
      "allOf": [{ "minimum": 0, "default": 20 }]
    }`)).to.eql([
      "The 'default' value is valid against the schema it's in, but not against the schema that applies it with 'allOf'"
    ]);
  });

  test("a default that a schema referencing it rejects", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "properties": {
        "count": { "$ref": "#/$defs/count", "maximum": 10 }
      },
      "$defs": {
        "count": { "type": "integer", "default": 20 }
      }
    }`)).to.eql([
      "The 'default' value is valid against the schema it's in, but not against the schema that applies it with '$ref'"
    ]);
  });

  test("an example that the outermost schema rejects", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "type": "object",
      "required": ["a"],
      "anyOf": [{ "allOf": [{ "examples": [{ "a": 1 }, { "b": 1 }] }] }]
    }`)).to.eql([
      "This example is valid against the schema it's in, but not against the schema that applies it with 'anyOf'"
    ]);
  });

  test("a default the schemas applying it allow", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "allOf": [{ "minimum": 0, "default": 5 }] }`)).to.eql([]);
  });

  test("a default in not or if isn't checked against the schema around it", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "type": "integer",
      "not": { "type": "integer", "default": 5 },
      "if": { "minimum": 0, "default": "a" },
      "then": { "maximum": 10 }
    }`)).to.eql([]);
  });

  test("an invalid default is only reported against its own schema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "allOf": [{ "minimum": 0, "default": -1 }] }`)).to.eql([invalidDefault]);
  });

  test("a value that might be valid isn't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "$ref": "https://example.com/nope", "default": 5 }`)).to.eql([]);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "default": { "type": "string" }, "examples": { "type": "string" } } }`)).to.eql([]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "type": "string", "default": 1 }`)).to.eql([invalidDefault]);
  });

  test("draft-04 doesn't have examples", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "type": "string", "examples": [1] }`)).to.eql([]);
  });

  test("unevaluatedItems", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "prefixItems": [{ "type": "integer" }],
      "unevaluatedItems": { "type": "string" },
      "examples": [[1, "a"], [1, 2]]
    }`)).to.eql([invalidExample]);
  });

  test("without the schema in a registry", async () => {
    const file = new VFile({ path: "/schemas/a.schema.json", value: `{ "$schema": "${draft2020}", "type": "integer", "default": "a" }` });
    await linter()
      .use(invalidDefaultOrExample)
      .process(file);
    expect(file.messages.map((message) => message.reason)).to.eql([invalidDefault]);
  });
});

/**
 * Lint with the schema in the session's registry, as the CLI has every
 * schema in the working directory
 *
 * @type (json: string) => Promise<VFile>
 */
const lint = async (json) => {
  const jsonSchema = { mediaTypes: jsonSchemaMediaTypes({ dialects: [draft04Dialect, draft202012Dialect] }) };
  const session = new JsonSchemaHyperjump({ ...jsonSchema, registry: new SchemaRegistry([{ schema: json, retrievalUri: uri }]) });

  const file = new VFile(json);
  const processor = unified()
    .use(rejsonParse, { url: uri })
    .use(jsonSchemaResolve, { session })
    .use(invalidDefaultOrExample);
  await processor.run(processor.parse(file), file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
