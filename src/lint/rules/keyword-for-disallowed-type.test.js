import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser/json";
import { linter } from "../test-linter.js";
import { JsonSchema } from "../../json-schema.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { addDraft202012 } from "../../dialects/draft-2020-12/index.js";
import keywordForDisallowedType from "./keyword-for-disallowed-type.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

describe("keyword-for-disallowed-type", () => {
  test("a number keyword with a string type", async () => {
    const json = `{ "$schema": "${draft2020}", "type": "string", "minimum": 1 }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["'minimum' applies only to numbers, which 'type' doesn't allow"]);
    expect(file.messages[0].ruleId).to.equal("keyword-for-disallowed-type");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const keyword = `"minimum": 1`;
    const offset = json.indexOf(keyword);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + keyword.length + 1, offset: offset + keyword.length }
    });
  });

  test("each type", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "type": "boolean",
      "maxLength": 1,
      "items": true,
      "required": ["a"],
      "multipleOf": 2,
      "enum": [true]
    }`)).to.eql([
      "'maxLength' applies only to strings, which 'type' doesn't allow",
      "'items' applies only to arrays, which 'type' doesn't allow",
      "'required' applies only to objects, which 'type' doesn't allow",
      "'multipleOf' applies only to numbers, which 'type' doesn't allow"
    ]);
  });

  test("a type array that allows the keyword", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": ["integer", "string"], "exclusiveMaximum": 10, "maxLength": 5 }`)).to.eql([]);
  });

  test("a type array that doesn't", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": ["string", "null"], "maxItems": 5 }`)).to.eql([
      "'maxItems' applies only to arrays, which 'type' doesn't allow"
    ]);
  });

  test("integer allows number keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "minimum": 0, "multipleOf": 2 }`)).to.eql([]);
  });

  test("without type", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "minimum": 0, "maxLength": 2 }`)).to.eql([]);
  });

  test("an empty type is left to empty-type", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": [], "minimum": 0 }`)).to.eql([]);
  });

  test("a known format", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "format": "date" }`)).to.eql([
      "The 'date' format applies only to strings, which 'type' doesn't allow"
    ]);
  });

  test("a known format with a type that allows it", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": ["string", "null"], "format": "date-time" }`)).to.eql([]);
  });

  test("an unknown format isn't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "format": "int32" }`)).to.eql([]);
  });

  test("a format the dialect doesn't support isn't reported", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "type": "integer", "format": "uuid" }`)).to.eql([]);
  });

  test("a custom format", async () => {
    expect(await reasonsWithCustomFormat(`{ "$schema": "${draft2020}", "type": "string", "format": "custom" }`, ["number"])).to.eql([
      "The 'custom' format applies only to numbers, which 'type' doesn't allow"
    ]);
  });

  test("a format with more than one type", async () => {
    expect(await reasonsWithCustomFormat(`{ "$schema": "${draft2020}", "type": "boolean", "format": "custom" }`, ["number", "string"])).to.eql([
      "The 'custom' format applies only to numbers or strings, which 'type' doesn't allow"
    ]);
    expect(await reasonsWithCustomFormat(`{ "$schema": "${draft2020}", "type": "integer", "format": "custom" }`, ["number", "string"])).to.eql([]);
  });

  test("a format without types isn't reported", async () => {
    expect(await reasonsWithCustomFormat(`{ "$schema": "${draft2020}", "type": "boolean", "format": "custom" }`)).to.eql([]);
  });

  test("a format in draft-07", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "format": "ipv4" }`)).to.eql([
      "The 'ipv4' format applies only to strings, which 'type' doesn't allow"
    ]);
  });

  test("a format that needs Unicode data", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-07/schema#", "type": "number", "format": "hostname" }`)).to.eql([
      "The 'hostname' format applies only to strings, which 'type' doesn't allow"
    ]);
  });

  test("messages are in document order", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "boolean", "minimum": 0, "format": "email", "maxItems": 1 }`)).to.eql([
      "'minimum' applies only to numbers, which 'type' doesn't allow",
      "The 'email' format applies only to strings, which 'type' doesn't allow",
      "'maxItems' applies only to arrays, which 'type' doesn't allow"
    ]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "foo": { "type": "object", "pattern": "^a" } } }`)).to.eql([
      "'pattern' applies only to strings, which 'type' doesn't allow"
    ]);
  });

  test("properties named like keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "properties": { "minimum": true, "type": true } }`)).to.eql([]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "type": "string", "maximum": 5, "exclusiveMaximum": true }`)).to.eql([
      "'maximum' applies only to numbers, which 'type' doesn't allow",
      "'exclusiveMaximum' applies only to numbers, which 'type' doesn't allow"
    ]);
  });

  test("draft-07", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-07/schema#", "type": "number", "dependencies": { "a": ["b"] }, "items": [{ "type": "string" }], "additionalItems": false }`)).to.eql([
      "'dependencies' applies only to objects, which 'type' doesn't allow",
      "'items' applies only to arrays, which 'type' doesn't allow",
      "'additionalItems' applies only to arrays, which 'type' doesn't allow"
    ]);
  });

  test("a keyword with no effect isn't reported", async () => {
    // `additional-items-without-items-array` reports it
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-07/schema#", "type": "number", "additionalItems": false }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(keywordForDisallowedType)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

/**
 * Lint with a custom format. The CLI's formats can't be changed, so the
 * schema is resolved in a session of a `JsonSchema` that has it.
 *
 * @type (json: string, types?: import("@hyperjump/browser/json").JsonType[]) => Promise<string[]>
 */
const reasonsWithCustomFormat = async (json, types) => {
  const jsonSchema = new JsonSchema();
  addDraft202012(jsonSchema);
  jsonSchema.addFormat({ uri: "https://example.com/format/custom", types, validate: () => true });
  jsonSchema.extendDialect(draft2020, { formats: { custom: "https://example.com/format/custom" } });

  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session: jsonSchema.session() })
    .use(keywordForDisallowedType);
  await processor.run(processor.parse(file), file);
  return file.messages.map((message) => message.reason);
};
