import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import requiredPropertyNotAllowed from "./required-property-not-allowed.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

describe("required-property-not-allowed", () => {
  test("additionalProperties false", async () => {
    const json = `{ "$schema": "${draft2020}", "properties": { "a": true }, "additionalProperties": false, "required": ["a", "b"] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'b' is required, but 'additionalProperties' doesn't allow it, so no object is valid"
    ]);
    expect(file.messages[0].ruleId).to.equal("required-property-not-allowed");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.indexOf(`"b"`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 4, offset: offset + 3 }
    });
  });

  test("a pattern allows it", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "patternProperties": { "^b": true }, "additionalProperties": false, "required": ["b"] }`)).to.eql([]);
  });

  test("false in properties", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": false }, "required": ["a"] }`)).to.eql([
      "'a' is required, but 'properties' doesn't allow it, so no object is valid"
    ]);
  });

  test("false in a matching pattern", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": true }, "patternProperties": { "^a$": false }, "required": ["a"] }`)).to.eql([
      "'a' is required, but 'patternProperties' doesn't allow it, so no object is valid"
    ]);
  });

  test("allowed", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": {} }, "additionalProperties": { "type": "string" }, "required": ["a", "b"] }`)).to.eql([]);
  });

  test("unevaluatedProperties false isn't considered", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "unevaluatedProperties": false, "required": ["a"] }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "additionalProperties": false, "required": ["a"] } }`)).to.have.length(1);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "required": false, "additionalProperties": true } }`)).to.eql([]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "additionalProperties": false, "required": ["a"] }`)).to.have.length(1);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(requiredPropertyNotAllowed)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
