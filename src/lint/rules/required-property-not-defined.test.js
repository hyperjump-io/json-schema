import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser/json";
import { linter } from "../test-linter.js";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { addDraft202012 } from "../../dialects/draft-2020-12/index.js";
import requiredPropertyNotDefined from "./required-property-not-defined.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

describe("required-property-not-defined", () => {
  test("not in properties", async () => {
    const json = `{ "$schema": "${draft2020}", "properties": { "name": true }, "required": ["nmae"] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([message("nmae")]);
    expect(file.messages[0].ruleId).to.equal("required-property-not-defined");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.indexOf(`"nmae"`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 7, offset: offset + 6 }
    });
  });

  test("patternProperties, with the u flag", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "patternProperties": { "^\\\\p{L}$": {} }, "required": ["é", "ab"] }`)).to.eql([message("ab")]);
  });

  test("additionalProperties or unevaluatedProperties defines the rest", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {} }, "additionalProperties": { "type": "string" }, "required": ["b"] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {} }, "unevaluatedProperties": false, "required": ["b"] }`)).to.eql([]);
  });

  test("required in anyOf is defined by the schema the anyOf is in", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {}, "b": {} }, "anyOf": [{ "required": ["a"] }, { "required": ["b"] }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {} }, "anyOf": [{ "required": ["a"] }, { "required": ["c"] }] }`)).to.eql([message("c")]);
  });

  test("properties defined in a sibling applicator", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "properties": { "id": {} } }], "required": ["id"] }`)).to.eql([]);
  });

  test("if and then", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {} }, "if": { "required": ["a"] }, "then": { "required": ["b"] } }`)).to.eql([message("b")]);
  });

  test("required without properties where it applies is known", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "foo": { "required": ["a"] } } }`)).to.eql([message("a")]);
  });

  test("required that could be combined with properties in another document", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "required": ["id"] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "$defs": { "hasId": { "required": ["id"] } } }`)).to.eql([]);
  });

  test("a reference to a schema that defines it", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "$defs": { "base": { "properties": { "id": {} } } }, "$ref": "#/$defs/base", "required": ["id", "nope"] }`))
      .to.eql([message("nope")]);
  });

  test("a schema that's referenced from one that defines it", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "properties": { "id": {} },
      "allOf": [{ "$ref": "#/$defs/needsId" }],
      "$defs": { "needsId": { "required": ["id"] } }
    }`)).to.eql([]);
  });

  test("a reference to another document", async () => {
    expect(await reasonsWithBase(`{ "$schema": "${draft2020}", "$ref": "https://example.com/base", "required": ["id", "name", "nope"] }`))
      .to.eql([message("nope")]);
  });

  test("a reference to a schema in another document", async () => {
    expect(await reasonsWithBase(`{ "$schema": "${draft2020}", "properties": { "foo": { "$ref": "https://example.com/base#/$defs/named", "required": ["name", "id"] } } }`))
      .to.eql([message("id")]);
  });

  test("a reference to another document that can't be retrieved", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {} }, "$ref": "https://example.com/base", "required": ["id"] }`)).to.eql([]);
  });

  test("a dynamic reference", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "$dynamicAnchor": "node", "properties": { "a": {} }, "$dynamicRef": "#node", "required": ["id"] }`)).to.eql([]);
  });

  test("required in not", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {} }, "not": { "required": ["b"] } }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {} }, "not": { "not": { "required": ["b"] } } }`)).to.eql([message("b")]);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "required": { "type": "array" } } }`)).to.eql([]);
  });

  test("draft-07 references", async () => {
    expect(await reasons(`{
      "$schema": "http://json-schema.org/draft-07/schema#",
      "definitions": { "base": { "properties": { "id": {} } } },
      "allOf": [{ "$ref": "#/definitions/base" }],
      "required": ["id", "nope"]
    }`)).to.eql([message("nope")]);
  });

  test("properties next to a draft-07 reference are ignored", async () => {
    expect(await reasons(`{
      "$schema": "http://json-schema.org/draft-07/schema#",
      "definitions": { "base": { "properties": { "a": {} } } },
      "properties": { "foo": { "allOf": [{ "$ref": "#/definitions/base", "properties": { "b": {} } }], "required": ["b"] } }
    }`)).to.eql([message("b")]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "properties": { "a": {} }, "required": ["b"] }`)).to.eql([message("b")]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(requiredPropertyNotDefined)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

/**
 * Lint with another document available in the session, as the CLI makes
 * every schema in the working directory available
 *
 * @type (json: string) => Promise<string[]>
 */
const reasonsWithBase = async (json) => {
  const jsonSchema = new JsonSchema();
  addDraft202012(jsonSchema);
  const registry = new SchemaRegistry().with({
    $schema: draft2020,
    $id: "https://example.com/base",
    properties: { id: {} },
    allOf: [{ $ref: "#/$defs/named" }],
    $defs: {
      named: { properties: { name: {} } }
    }
  });

  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session: jsonSchema.session({ registries: [registry] }) })
    .use(requiredPropertyNotDefined);
  await processor.run(processor.parse(file), file);
  return file.messages.map((message) => message.reason);
};

const message = (/** @type string */ name) => `'${name}' is required, but no 'properties' or 'patternProperties' defines it, so any value is allowed`;
