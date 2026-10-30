import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser/json";
import { linter } from "../test-linter.js";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { addDraft202012 } from "../../dialects/draft-2020-12/index.js";
import unevaluatedWithoutEffect from "./unevaluated-without-effect.js";

const v1 = "https://json-schema.org/v1";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft201909 = "https://json-schema.org/draft/2019-09/schema";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

describe("unevaluated-without-effect", () => {
  test("additionalProperties next to unevaluatedProperties", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "additionalProperties": false, "unevaluatedProperties": false }`);
    expect(file.messages.map((message) => message.reason)).to.eql([reason("unevaluatedProperties", "property")]);
    expect(file.messages[0].ruleId).to.equal("unevaluated-without-effect");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 93, offset: 92 },
      end: { line: 1, column: 123, offset: 122 }
    });
  });

  test("additionalProperties with properties and patternProperties", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "properties": { "a": true },
      "patternProperties": { "^b": { "type": "string" } },
      "additionalProperties": { "type": "number" },
      "unevaluatedProperties": { "type": "string" }
    }`)).to.eql([reason("unevaluatedProperties", "property")]);
  });

  test("additionalProperties in allOf or a reference", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "allOf": [{ "additionalProperties": false }],
      "unevaluatedProperties": false
    }`)).to.eql([reason("unevaluatedProperties", "property")]);
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "$ref": "#/$defs/closed",
      "unevaluatedProperties": false,
      "$defs": { "closed": { "additionalProperties": false } }
    }`)).to.eql([reason("unevaluatedProperties", "property")]);
  });

  test("unevaluatedProperties in allOf", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "allOf": [{ "unevaluatedProperties": false }],
      "unevaluatedProperties": false
    }`)).to.eql([reason("unevaluatedProperties", "property")]);
  });

  test("every branch of anyOf or if", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "anyOf": [{ "additionalProperties": false }, { "additionalProperties": { "type": "string" } }],
      "unevaluatedProperties": false
    }`)).to.eql([reason("unevaluatedProperties", "property")]);
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "if": { "additionalProperties": { "type": "string" } },
      "else": { "additionalProperties": false },
      "unevaluatedProperties": false
    }`)).to.eql([reason("unevaluatedProperties", "property")]);
  });

  test("only some branches", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "anyOf": [{ "additionalProperties": false }, { "properties": { "a": true } }],
      "unevaluatedProperties": false
    }`)).to.eql([]);
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "if": { "required": ["a"] },
      "then": { "additionalProperties": false },
      "unevaluatedProperties": false
    }`)).to.eql([]);
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "not": { "additionalProperties": false },
      "unevaluatedProperties": false
    }`)).to.eql([]);
  });

  // Properties in an allOf schema aren't what additionalProperties leaves out
  test("additionalProperties that leaves out properties nothing marks", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "allOf": [{ "properties": { "a": true }, "additionalProperties": false }],
      "unevaluatedProperties": false
    }`)).to.eql([reason("unevaluatedProperties", "property")]);
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "allOf": [{ "properties": { "a": true } }],
      "patternProperties": { "^b": true },
      "unevaluatedProperties": false
    }`)).to.eql([]);
  });

  test("a property that's only marked in a parent's schema", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "additionalProperties": false,
      "allOf": [{ "unevaluatedProperties": false }]
    }`)).to.eql([]);
  });

  test("items next to unevaluatedItems", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "items": false, "unevaluatedItems": false }`)).to.eql([reason("unevaluatedItems", "item")]);
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "prefixItems": [{ "type": "string" }],
      "items": { "type": "number" },
      "unevaluatedItems": false
    }`)).to.eql([reason("unevaluatedItems", "item")]);
    expect(await reasons(`{ "$schema": "${draft202012}", "prefixItems": [{ "type": "string" }], "unevaluatedItems": false }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft202012}", "contains": { "type": "string" }, "unevaluatedItems": false }`)).to.eql([]);
  });

  test("items and additionalItems in 2019-09", async () => {
    expect(await reasons(`{
      "$schema": "${draft201909}",
      "items": [{ "type": "string" }],
      "additionalItems": false,
      "unevaluatedItems": false
    }`)).to.eql([reason("unevaluatedItems", "item")]);
    expect(await reasons(`{ "$schema": "${draft201909}", "items": { "type": "string" }, "unevaluatedItems": false }`)).to.eql([reason("unevaluatedItems", "item")]);
  });

  test("v1", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "additionalProperties": false, "unevaluatedProperties": false }`)).to.eql([reason("unevaluatedProperties", "property")]);
  });

  test("properties and items are separate", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "items": false, "unevaluatedProperties": false }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft202012}", "additionalProperties": false, "unevaluatedItems": false }`)).to.eql([]);
  });

  test("a schema that allows everything", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "additionalProperties": false, "unevaluatedProperties": true }`)).to.eql([reason("unevaluatedProperties", "property")]);
  });

  test("a reference that can't be followed", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "$ref": "https://example.com/unknown",
      "unevaluatedProperties": false
    }`)).to.eql([]);
  });

  test("a reference to another document", async () => {
    expect(await reasonsWithClosed(`{
      "$schema": "${draft202012}",
      "$ref": "https://example.com/closed",
      "unevaluatedProperties": false
    }`)).to.eql([reason("unevaluatedProperties", "property")]);
  });

  test("a recursive reference", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "$defs": { "a": { "allOf": [{ "$ref": "#/$defs/a" }], "unevaluatedProperties": false } },
      "$ref": "#/$defs/a"
    }`)).to.eql([]);
  });

  test("a dialect without the keyword", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "additionalProperties": false, "unevaluatedProperties": false }`)).to.eql([]);
  });

  test("a property with the keyword's name", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "additionalProperties": false,
      "properties": { "unevaluatedProperties": false }
    }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(unevaluatedWithoutEffect)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

/**
 * Lint with another document available in the session
 *
 * @type (json: string) => Promise<string[]>
 */
const reasonsWithClosed = async (json) => {
  const jsonSchema = new JsonSchema();
  addDraft202012(jsonSchema);
  const registry = new SchemaRegistry().with({
    $schema: draft202012,
    $id: "https://example.com/closed",
    additionalProperties: false
  });

  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session: jsonSchema.session({ registry }) })
    .use(unevaluatedWithoutEffect);
  await processor.run(processor.parse(file), file);
  return file.messages.map((message) => message.reason);
};

/** @type (name: string, child: string) => string */
const reason = (name, child) => `'${name}' has no effect, because other keywords evaluate every ${child}`;
