import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import redundantAllOfAnyOfSchemas from "./redundant-all-of-any-of-schemas.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

describe("redundant-all-of-any-of-schemas", () => {
  test("a schema in anyOf that allows nothing another doesn't", async () => {
    const json = `{ "$schema": "${draft2020}", "minimum": 5, "anyOf": [{ "maximum": 3 }, { "maximum": 4 }] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["This schema has no effect, because 'anyOf/1' allows everything it allows"]);
    expect(file.messages[0].ruleId).to.equal("redundant-all-of-any-of-schemas");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.indexOf(`{ "maximum": 3 }`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 17, offset: offset + 16 }
    });
  });

  test("a schema in allOf that allows everything another does", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "maximum": 3 }, { "maximum": 4 }] }`)).to.eql([
      "This schema has no effect, because it allows everything 'allOf/0' allows"
    ]);
  });

  test("every schema another makes redundant is reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "type": "integer" }, { "type": "number" }, { "const": 1.5 }] }`)).to.eql([
      "This schema has no effect, because 'anyOf/1' allows everything it allows",
      "This schema has no effect, because 'anyOf/1' allows everything it allows"
    ]);
  });

  test("of schemas that allow the same, the later one is reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "type": "string" }, { "type": ["string"] }, { "type": "string" }] }`)).to.eql([
      "This schema has no effect, because 'anyOf/0' allows everything it allows",
      "This schema has no effect, because 'anyOf/0' allows everything it allows"
    ]);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [true, {}] }`)).to.eql([
      "This schema has no effect, because it allows everything 'allOf/0' allows"
    ]);
  });

  test("types, limits, values, and required properties are compared", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "type": "string", "maxLength": 3 }, { "type": "string" }] }`)).to.have.length(1);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "type": "string", "maxLength": 3 }, { "maxLength": 4 }] }`)).to.have.length(1);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "type": "string" }, { "type": ["number", "null"], "minimum": 0 }, { "minimum": 0 }] }`)).to.have.length(2);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "enum": ["a", "b"] }, { "type": "string" }] }`)).to.have.length(1);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "const": 3 }, { "minimum": 0, "maximum": 5 }] }`)).to.have.length(1);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "required": ["a", "b"] }, { "required": ["a"] }] }`)).to.have.length(1);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "minimum": 1, "maximum": 5 }, { "minimum": 0 }] }`)).to.have.length(1);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [false, { "type": "string" }] }`)).to.have.length(1);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [true, { "type": "string" }] }`)).to.have.length(1);
  });

  test("schemas that allow different values aren't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "type": "string" }, { "type": "number" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "maximum": 3 }, { "minimum": 5 }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "maxLength": 3 }, { "maximum": 4 }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "minimum": 1 }, { "maximum": 5 }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "enum": ["a", 1] }, { "type": "string" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "required": ["a"] }, { "required": ["b"] }] }`)).to.eql([]);
  });

  test("what isn't known isn't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "pattern": "^a$" }, { "pattern": "^a" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "multipleOf": 4 }, { "multipleOf": 2 }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "$ref": "https://example.com/other" }, { "type": "string" }] }`)).to.eql([]);
  });

  test("subschemas are compared", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "items": {
        "anyOf": [{ "type": "array", "items": { "type": "integer" } }, { "type": "array", "items": { "type": "number" } }]
      }
    }`)).to.have.length(1);
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "items": {
        "anyOf": [{ "type": "array", "items": { "type": "string" } }, { "type": "array", "items": { "type": "number" } }]
      }
    }`)).to.eql([]);
  });

  test("references in the document are followed", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "anyOf": [{ "$ref": "#/$defs/small" }, { "$ref": "#/$defs/number" }],
      "$defs": {
        "small": { "allOf": [{ "$ref": "#/$defs/number" }], "maximum": 3 },
        "number": { "type": "number" }
      }
    }`)).to.eql(["This schema has no effect, because 'anyOf/1' allows everything it allows"]);
  });

  test("schemas that refer to themselves", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "anyOf": [{ "$ref": "#/$defs/a" }, { "$ref": "#/$defs/b" }],
      "$defs": {
        "a": { "type": "array", "items": { "$ref": "#/$defs/a" }, "maxItems": 3 },
        "b": { "type": "array", "items": { "$ref": "#/$defs/b" } }
      }
    }`)).to.eql([]);
  });

  test("a schema that annotates isn't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "title": "Small", "maximum": 3 }, { "maximum": 4 }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "type": "string", "format": "email", "maxLength": 3 }, { "type": "string" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "maximum": 3 }, { "title": "Large", "maximum": 4 }] }`)).to.have.length(1);
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "anyOf": [{ "items": { "title": "a" }, "maxItems": 3 }, { "maxItems": 4 }] } }`)).to.eql([]);
  });

  test("a schema that allows the same as one that annotates is reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "type": "string", "format": "email" }, { "type": "string" }] }`)).to.eql([
      "This schema has no effect, because 'anyOf/0' allows everything it allows"
    ]);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "type": "string" }, { "type": "string", "title": "a" }] }`)).to.eql([
      "This schema has no effect, because it allows everything 'allOf/1' allows"
    ]);
  });

  test("a schema that evaluates properties or items is reported if nothing reads what's evaluated", async () => {
    const schemas = `[{ "type": "object", "properties": { "a": { "type": "string" } } }, { "type": "object" }]`;
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "anyOf": ${schemas} } }`)).to.have.length(1);
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "anyOf": ${schemas}, "unevaluatedProperties": false } }`)).to.eql([]);
    // Another document could apply the root with `unevaluatedProperties`
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": ${schemas} }`)).to.eql([]);
  });

  test("a schema that applies itself in oneOf", async () => {
    const itself = `"$defs": { "s": { "oneOf": [{ "$ref": "#/$defs/s" }, { "type": "string" }] } }`;
    expect(await reasons(`{ "$schema": "${draft2020}", ${itself}, "anyOf": [{ "$ref": "#/$defs/s" }, { "not": { "$ref": "#/$defs/s" } }] }`)).to.eql([]);
  });

  test("oneOf isn't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "integer" }, { "type": "number" }] }`)).to.eql([]);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "allOf": { "enum": [[true, {}]] }, "anyOf": { "const": [false, {}] } } }`)).to.eql([]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "anyOf": [{ "maximum": 3, "exclusiveMaximum": true }, { "maximum": 3 }] }`)).to.have.length(1);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(redundantAllOfAnyOfSchemas)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
