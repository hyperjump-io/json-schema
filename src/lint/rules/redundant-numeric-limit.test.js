import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import redundantNumericLimit from "./redundant-numeric-limit.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(redundantNumericLimit)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

describe("redundant-numeric-limit", () => {
  test("a maximum above exclusiveMaximum", async () => {
    const json = `{ "$schema": "${draft2020}", "type": "number", "exclusiveMaximum": 5, "maximum": 6 }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["'maximum' has no effect, because 'exclusiveMaximum' is lower"]);
    expect(file.messages[0].ruleId).to.equal("redundant-numeric-limit");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const keyword = `"maximum": 6`;
    const offset = json.indexOf(keyword);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + keyword.length + 1, offset: offset + keyword.length }
    });
  });

  test("an exclusiveMaximum above maximum", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "maximum": 5, "exclusiveMaximum": 6 }`)).to.eql([
      "'exclusiveMaximum' has no effect, because 'maximum' is lower"
    ]);
  });

  test("equal upper limits", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "maximum": 5, "exclusiveMaximum": 5 }`)).to.eql([
      "'maximum' has no effect, because 'exclusiveMaximum' excludes the same value"
    ]);
  });

  test("lower limits", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "exclusiveMinimum": 10, "minimum": 8 }`)).to.eql([
      "'minimum' has no effect, because 'exclusiveMinimum' is higher"
    ]);
    expect(await reasons(`{ "$schema": "${draft2020}", "exclusiveMinimum": 8, "minimum": 10 }`)).to.eql([
      "'exclusiveMinimum' has no effect, because 'minimum' is higher"
    ]);
    expect(await reasons(`{ "$schema": "${draft2020}", "exclusiveMinimum": 8, "minimum": 8 }`)).to.eql([
      "'minimum' has no effect, because 'exclusiveMinimum' excludes the same value"
    ]);
  });

  test("only one of each", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "minimum": 0, "exclusiveMaximum": 10 }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "maximum": 5, "exclusiveMaximum": 5 } }`)).to.have.length(1);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "maximum": { "exclusiveMaximum": 1 }, "exclusiveMaximum": { "maximum": 2 } } }`)).to.eql([]);
  });

  test("draft-06", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-06/schema#", "maximum": 5, "exclusiveMaximum": 4 }`)).to.have.length(1);
  });

  test("draft-04's exclusiveMaximum changes maximum", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "maximum": 5, "exclusiveMaximum": true }`)).to.eql([]);
  });
});
