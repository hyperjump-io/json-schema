import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import impossibleProperty from "./impossible-property.js";

const v1 = "https://json-schema.org/v1";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft2020 = "https://json-schema.org/draft/2020-12/schema";

describe("impossible-property", () => {
  test("a dependency that needs too many properties", async () => {
    const json = `{ "$schema": "${v1}", "dependentRequired": { "a": ["b", "c"] }, "maxProperties": 2 }`;
    const file = await lint(json);
    const reason = "An object with 'a' needs 3 properties, but 'maxProperties' allows at most 2, so no valid object has 'a'";
    expect(file.messages.map((message) => message.reason)).to.eql([reason, reason]);
    expect(file.messages[0].ruleId).to.equal("impossible-property");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].column).to.equal(json.indexOf(`"maxProperties"`) + 1);
    expect(file.messages[1].column).to.equal(json.indexOf(`"a"`) + 1);
  });

  test("a dependency that fits", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "dependentRequired": { "a": ["b"] }, "maxProperties": 2 }`)).to.eql([]);
  });

  test("a property when the required properties use up maxProperties", async () => {
    const json = `{ "$schema": "${v1}", "properties": { "a": {}, "b": {}, "c": {} }, "required": ["b", "c"], "maxProperties": 2 }`;
    const reason = "An object with 'a' needs 3 properties, but 'maxProperties' allows at most 2, so no valid object has 'a'";
    expect(await reasons(json)).to.eql([reason, reason]);
  });

  test("each keyword that names the property", async () => {
    const json = `{ "$schema": "${draft07}", "properties": { "a": {} }, "dependencies": { "a": ["b", "c"] }, "maxProperties": 2 }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.column)).to.eql([
      json.indexOf(`"maxProperties"`) + 1,
      json.indexOf(`"a"`) + 1,
      json.lastIndexOf(`"a"`) + 1
    ]);
  });

  test("a dependency through a schema", async () => {
    const json = `{ "$schema": "${draft2020}", "dependentSchemas": { "a": { "$ref": "#/$defs/b" } }, "$defs": { "b": { "required": ["b", "c"] } }, "maxProperties": 2 }`;
    expect(await reasons(json)).to.eql([
      "An object with 'a' needs 3 properties, but 'maxProperties' allows at most 2, so no valid object has 'a'",
      "An object with 'a' needs 3 properties, but 'maxProperties' allows at most 2, so no valid object has 'a'"
    ]);
  });

  test("alternatives", async () => {
    const json = `{ "$schema": "${draft2020}", "dependentSchemas": { "a": { "anyOf": [{ "required": ["b"] }, { "required": ["c"] }] } }, "maxProperties": 1 }`;
    expect(await reasons(json)).to.eql([
      "An object with 'a' needs at least 2 properties, but 'maxProperties' allows at most 1, so no valid object has 'a'",
      "An object with 'a' needs at least 2 properties, but 'maxProperties' allows at most 1, so no valid object has 'a'"
    ]);
  });

  test("a required property isn't reported here", async () => {
    // `contradictory-limits` reports it if it's too many
    expect(await reasons(`{ "$schema": "${v1}", "required": ["a"], "dependentRequired": { "a": ["b"] }, "maxProperties": 2 }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${v1}", "required": ["a"], "dependentRequired": { "a": ["b", "c"] }, "maxProperties": 2 }`)).to.eql([]);
  });

  test("without maxProperties", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "dependentRequired": { "a": ["b", "c"] } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(impossibleProperty)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
