import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import exclusiveOneOfSchemas from "./exclusive-one-of-schemas.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

const message = "No value matches more than one schema in 'oneOf', so 'anyOf' means the same";

describe("exclusive-one-of-schemas", () => {
  test("schemas with different types", async () => {
    const json = `{ "$schema": "${draft2020}", "oneOf": [{ "type": "string" }, { "type": "number" }] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([message]);
    expect(file.messages[0].ruleId).to.equal("exclusive-one-of-schemas");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const keyword = `"oneOf": [{ "type": "string" }, { "type": "number" }]`;
    const offset = json.indexOf(keyword);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + keyword.length + 1, offset: offset + keyword.length }
    });
  });

  test("values, limits, and not", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "const": "a" }, { "enum": ["b", "c"] }, { "type": "number" }] }`)).to.eql([message]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "number", "maximum": 3 }, { "type": "number", "minimum": 5 }] }`)).to.eql([message]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "string" }, { "not": { "type": "string" } }] }`)).to.eql([message]);
  });

  test("a required property with different values", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "oneOf": [
        { "type": "object", "required": ["kind"], "properties": { "kind": { "const": "a" } } },
        { "type": "object", "required": ["kind"], "properties": { "kind": { "const": "b" } } }
      ]
    }`)).to.eql([message]);
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "oneOf": [
        { "type": "object", "properties": { "kind": { "const": "a" } } },
        { "type": "object", "properties": { "kind": { "const": "b" } } }
      ]
    }`)).to.eql([]);
  });

  test("references in the document are followed", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "oneOf": [{ "$ref": "#/$defs/a" }, { "$ref": "#/$defs/b" }],
      "$defs": { "a": { "type": "string" }, "b": { "type": "null" } }
    }`)).to.eql([message]);
  });

  test("schemas that could match the same value aren't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "integer" }, { "type": "number" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "string" }, { "type": "number" }, { "enum": ["a", null] }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "maximum": 3 }, { "minimum": 5 }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "required": ["a"] }, { "required": ["b"] }] }`)).to.eql([]);
  });

  test("what isn't known isn't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "string", "pattern": "^a" }, { "type": "string", "pattern": "^b" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "$ref": "https://example.com/other" }, { "type": "string" }] }`)).to.eql([]);
  });

  test("a schema that applies itself in anyOf", async () => {
    const itself = `"$defs": { "s": { "anyOf": [{ "$ref": "#/$defs/s" }, { "type": "string" }] } }`;
    expect(await reasons(`{ "$schema": "${draft2020}", ${itself}, "oneOf": [{ "$ref": "#/$defs/s" }, { "type": "number" }] }`)).to.eql([]);
  });

  test("one schema isn't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "string" }] }`)).to.eql([]);
  });

  test("anyOf and allOf aren't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "type": "string" }, { "type": "number" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "type": "string" }, { "type": "number" }] }`)).to.eql([]);
  });

  test("properties named like the keyword", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "oneOf": { "enum": [[true, false]] } } }`)).to.eql([]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "oneOf": [{ "type": "string" }, { "type": "number" }] }`)).to.eql([message]);
  });

  test("it isn't in the recommended preset", async () => {
    const { default: recommended } = await import("../recommended.js");
    expect(recommended.plugins?.some((plugin) => Array.isArray(plugin) && plugin[0] === exclusiveOneOfSchemas)).to.equal(false);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(exclusiveOneOfSchemas)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
