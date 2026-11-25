import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import coveredOneOfSchemas from "./covered-one-of-schemas.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

describe("covered-one-of-schemas", () => {
  test("a schema that allows nothing another doesn't", async () => {
    const json = `{ "$schema": "${draft2020}", "oneOf": [{ "type": "integer" }, { "type": "number" }] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["A value this schema matches always fails 'oneOf', because 'oneOf/1' matches it too"]);
    expect(file.messages[0].ruleId).to.equal("covered-one-of-schemas");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.indexOf(`{ "type": "integer" }`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 22, offset: offset + 21 }
    });
  });

  test("known values next to their type", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "string" }, { "enum": ["a", "b"] }] }`)).to.eql([
      "A value this schema matches always fails 'oneOf', because 'oneOf/0' matches it too"
    ]);
  });

  test("schemas that allow the same are both reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "string" }, { "type": ["string"] }] }`)).to.eql([
      "A value this schema matches always fails 'oneOf', because 'oneOf/1' matches it too",
      "A value this schema matches always fails 'oneOf', because 'oneOf/0' matches it too"
    ]);
  });

  test("a schema that annotates is reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "title": "Small", "maximum": 3 }, { "maximum": 4 }] }`)).to.have.length(1);
  });

  test("a schema that allows nothing isn't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [false, { "type": "string" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "allOf": [false] }, { "type": "string" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "string", "maxLength": 1, "minLength": 5 }, { "type": "string" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "not": {} }, true] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "string", "const": 1 }, { "type": "string" }] }`)).to.eql([]);
  });

  test("schemas that each allow something the other doesn't aren't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "type": "string" }, { "type": "number" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "maximum": 3 }, { "minimum": 2 }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "required": ["a"] }, { "required": ["b"] }] }`)).to.eql([]);
  });

  test("what isn't known isn't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "pattern": "^a$" }, { "pattern": "^a" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [{ "$ref": "https://example.com/other" }, { "type": "string" }] }`)).to.eql([]);
  });

  test("references in the document are followed", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "oneOf": [{ "$ref": "#/$defs/small" }, { "$ref": "#/$defs/number" }],
      "$defs": {
        "small": { "type": "number", "maximum": 3 },
        "number": { "type": "number" }
      }
    }`)).to.have.length(1);
  });

  test("a schema that applies itself in anyOf", async () => {
    const itself = `"$defs": { "s": { "anyOf": [{ "$ref": "#/$defs/s" }, { "type": "string" }] } }`;
    expect(await reasons(`{ "$schema": "${draft2020}", ${itself}, "oneOf": [{ "$ref": "#/$defs/s" }, { "not": { "$ref": "#/$defs/s" } }] }`)).to.eql([]);
  });

  test("allOf and anyOf aren't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "type": "integer" }, { "type": "number" }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "type": "integer" }, { "type": "number" }] }`)).to.eql([]);
  });

  test("properties named like the keyword", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "oneOf": { "enum": [[true, {}]] } } }`)).to.eql([]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "oneOf": [{ "type": "integer" }, { "type": "number" }] }`)).to.have.length(1);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(coveredOneOfSchemas)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
